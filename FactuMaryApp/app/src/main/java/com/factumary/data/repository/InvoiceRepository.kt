package com.factumary.data.repository

import com.factumary.data.db.dao.InvoiceDao
import com.factumary.data.db.dao.ProductDao
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.db.entity.InvoiceItemEntity
import com.factumary.data.remote.SupabaseClientProvider
import com.factumary.data.sunat.EmitItem
import com.factumary.data.sunat.EmitRequest
import com.factumary.data.sunat.SunatApiService
import kotlinx.coroutines.flow.Flow

class InvoiceRepository(
    private val dao: InvoiceDao,
    private val productDao: ProductDao? = null,
    private val sunatService: SunatApiService? = null
) {

    fun getAll(): Flow<List<InvoiceEntity>> = dao.getAll()

    suspend fun getById(id: Long): InvoiceEntity? = dao.getById(id)

    suspend fun getItemsByInvoiceId(invoiceId: Long): List<InvoiceItemEntity> =
        dao.getItemsByInvoiceId(invoiceId)

    suspend fun getNextNumber(series: String): Long {
        val last = dao.getLastNumber(series) ?: 0
        return last + 1
    }

    /**
     * Crea la factura localmente, descuenta stock, envía a SUNAT vía web proxy,
     * y sincroniza con Supabase.
     */
    suspend fun createInvoice(
        invoice: InvoiceEntity,
        items: List<InvoiceItemEntity>
    ): Long {
        // 1. Guardar localmente
        val invoiceId = dao.createInvoiceWithItems(invoice, items)

        // 2. Descontar stock de productos
        productDao?.let { pDao ->
            for (item in items) {
                if (item.productId != null && item.productId > 0 && item.quantity > 0) {
                    pDao.decrementStock(item.productId, item.quantity)
                }
            }
        }

        // 3. Enviar a SUNAT vía web proxy
        sunatService?.let { service ->
            try {
                val request = EmitRequest(
                    cliente_id = if (invoice.customerId > 0) invoice.customerId else null,
                    cliente_nombre = invoice.customerName,
                    cliente_ruc = invoice.customerRuc,
                    cliente_tipo_doc = invoice.customerTipoDoc,
                    cliente_direccion = invoice.customerAddress,
                    tipo_comprobante = invoice.tipoComprobante,
                    sin_identificar = invoice.customerTipoDoc == "0",
                    items = items.map { item ->
                        EmitItem(
                            producto_id = item.productId,
                            description = item.description,
                            quantity = item.quantity,
                            unit_price = item.unitPrice
                        )
                    },
                    notes = invoice.notes,
                    origen = "mobile"
                )

                val result = service.emitir(request)

                if (result.isSuccess) {
                    val response = result.getOrThrow()
                    val factura = response.factura
                    dao.updateSunatStatus(
                        id = invoiceId,
                        status = response.estado_sunat,
                        codigo = factura?.cdr_codigo ?: "",
                        descripcion = factura?.cdr_descripcion ?: response.mensaje,
                        hash = factura?.hash ?: "",
                        xmlUrl = factura?.xml_url ?: "",
                        cdrUrl = factura?.pdf_url ?: "",
                        error = response.error_ose ?: "",
                        timestamp = System.currentTimeMillis()
                    )
                    // Marcar como synced porque ya está en Supabase (la web la guardó)
                    dao.markAsSynced(invoiceId)
                } else {
                    val error = result.exceptionOrNull()
                    dao.updateSunatStatus(
                        id = invoiceId,
                        status = "ERROR",
                        error = error?.message ?: "Error al enviar a SUNAT",
                        timestamp = System.currentTimeMillis()
                    )
                }
            } catch (e: Exception) {
                dao.updateSunatStatus(
                    id = invoiceId,
                    status = "ERROR",
                    error = "Excepción: ${e.message}",
                    timestamp = System.currentTimeMillis()
                )
            }
        }

        return invoiceId
    }

    suspend fun deleteById(id: Long) = dao.deleteById(id)

    suspend fun getLastInvoice(): InvoiceEntity? = dao.getLastInvoice()

    // ═══════════════════════════════════════════
    // Sync legacy con Supabase (ya no es necesario porque la web guarda todo,
    // pero mantenemos por si se quiere sync bidireccional en el futuro)
    // ═══════════════════════════════════════════
    suspend fun trySyncInvoice(invoiceId: Long) {
        val invoice = dao.getById(invoiceId) ?: return
        if (invoice.supabaseSynced) return
        val result = SupabaseClientProvider.syncInvoiceToSupabase(invoice)
        if (result.isSuccess) {
            dao.markAsSynced(invoiceId)
        }
    }

    suspend fun syncAllUnsynced() {
        val unsynced = dao.getUnsyncedInvoices()
        for (invoice in unsynced) {
            val result = SupabaseClientProvider.syncInvoiceToSupabase(invoice)
            if (result.isSuccess) {
                dao.markAsSynced(invoice.id)
            }
        }
    }

    suspend fun getUnsyncedCount(): Int = dao.getUnsyncedInvoices().size

    /**
     * Reintenta enviar a SUNAT las facturas que quedaron en PENDIENTE/ERROR/RECHAZADO.
     */
    suspend fun retryPendingSunatInvoices() {
        val service = sunatService ?: return
        val pending = dao.getPendingSunatInvoices()
        for (invoice in pending) {
            val items = dao.getItemsByInvoiceId(invoice.id)
            // Para simplificar, recreamos el request y actualizamos status
            try {
                val request = EmitRequest(
                    cliente_id = if (invoice.customerId > 0) invoice.customerId else null,
                    cliente_nombre = invoice.customerName,
                    cliente_ruc = invoice.customerRuc,
                    cliente_tipo_doc = invoice.customerTipoDoc,
                    cliente_direccion = invoice.customerAddress,
                    tipo_comprobante = invoice.tipoComprobante,
                    sin_identificar = invoice.customerTipoDoc == "0",
                    items = items.map { item ->
                        EmitItem(
                            producto_id = item.productId,
                            description = item.description,
                            quantity = item.quantity,
                            unit_price = item.unitPrice
                        )
                    },
                    notes = invoice.notes,
                    origen = "mobile"
                )

                val result = service.emitir(request)
                if (result.isSuccess) {
                    val response = result.getOrThrow()
                    val factura = response.factura
                    dao.updateSunatStatus(
                        id = invoice.id,
                        status = response.estado_sunat,
                        codigo = factura?.cdr_codigo ?: "",
                        descripcion = factura?.cdr_descripcion ?: response.mensaje,
                        hash = factura?.hash ?: "",
                        xmlUrl = factura?.xml_url ?: "",
                        cdrUrl = factura?.pdf_url ?: "",
                        error = response.error_ose ?: "",
                        timestamp = System.currentTimeMillis()
                    )
                    dao.markAsSynced(invoice.id)
                } else {
                    val error = result.exceptionOrNull()
                    dao.updateSunatStatus(
                        id = invoice.id,
                        status = "ERROR",
                        error = error?.message ?: "Error al reenviar",
                        timestamp = System.currentTimeMillis()
                    )
                }
            } catch (e: Exception) {
                dao.updateSunatStatus(
                    id = invoice.id,
                    status = "ERROR",
                    error = "Excepción: ${e.message}",
                    timestamp = System.currentTimeMillis()
                )
            }
        }
    }
}
