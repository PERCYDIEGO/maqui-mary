package com.factumary.data.repository

import com.factumary.data.db.dao.InvoiceDao
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.remote.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

/**
 * Repositorio para manejar facturas con flujo de aprobación
 * 
 * Flujo:
 * 1. Crear factura → Estado: POR_APROBAR
 * 2. Sincronizar a Supabase → Admin la ve en el CRM
 * 3. Admin aprueba/rechaza en la web
 * 4. Si aprueba → Se envía a SUNAT desde el servidor
 * 5. App sincroniza estado desde Supabase
 */
class InvoiceRepositoryAprobacion(
    private val invoiceDao: InvoiceDao
) {
    
    fun getAll(): Flow<List<InvoiceEntity>> = invoiceDao.getAll()
    
    fun getByStatus(status: String): Flow<List<InvoiceEntity>> = 
        invoiceDao.getByAprobacionStatus(status)
    
    suspend fun getById(id: Long): InvoiceEntity? = invoiceDao.getById(id)
    
    suspend fun getItemsByInvoiceId(invoiceId: Long): List<com.factumary.data.db.entity.InvoiceItemEntity> =
        invoiceDao.getItemsByInvoiceId(invoiceId)
    
    suspend fun getNextNumber(series: String): Long {
        val last = invoiceDao.getLastNumber(series) ?: 0
        return last + 1
    }
    
    /**
     * Crea una factura en estado POR_APROBAR y la sincroniza con Supabase
     */
    suspend fun crearFacturaParaAprobacion(
        invoice: InvoiceEntity,
        items: List<com.factumary.data.db.entity.InvoiceItemEntity>,
        userId: String,
        userName: String
    ): Result<Long> {
        return try {
            // Guardar localmente con estado POR_APROBAR
            val invoiceConEstado = invoice.copy(
                aprobacionStatus = InvoiceEntity.AprobacionStatus.POR_APROBAR,
                createdBy = userId,
                createdByName = userName,
                sunatStatus = InvoiceEntity.SunatStatus.PENDIENTE
            )
            
            val invoiceId = invoiceDao.createInvoiceWithItems(invoiceConEstado, items)
            
            // Intentar sincronizar inmediatamente con Supabase
            val syncResult = sincronizarFacturaAPSupabase(invoiceId)
            
            if (syncResult.isSuccess) {
                Result.success(invoiceId)
            } else {
                // Si falla la sincronización, la factura queda local
                // Se intentará sincronizar más tarde
                Result.success(invoiceId)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Sincroniza una factura específica con Supabase para aprobación
     */
    suspend fun sincronizarFacturaAPSupabase(invoiceId: Long): Result<Unit> {
        return try {
            val invoice = invoiceDao.getById(invoiceId) 
                ?: return Result.failure(Exception("Factura no encontrada"))
            
            if (invoice.supabaseSynced) {
                return Result.success(Unit) // Ya está sincronizada
            }
            
            val items = invoiceDao.getItemsByInvoiceId(invoiceId)
            
            val dto = FacturaParaAprobacionDto(
                id_local = invoiceId,
                series = invoice.series,
                number = invoice.number,
                tipo_comprobante = invoice.tipoComprobante,
                cliente_nombre = invoice.customerName,
                cliente_ruc = invoice.customerRuc,
                cliente_direccion = invoice.customerAddress,
                cliente_tipo_doc = invoice.customerTipoDoc,
                date_millis = invoice.dateMillis,
                subtotal = invoice.subtotal,
                igv = invoice.igv,
                total = invoice.total,
                notes = invoice.notes,
                created_at = invoice.createdAt,
                created_by = invoice.createdBy,
                created_by_name = invoice.createdByName,
                aprobacion_status = invoice.aprobacionStatus,
                items = items.map { item ->
                    FacturaItemDto(
                        producto_id = item.productId,
                        description = item.description,
                        quantity = item.quantity,
                        unit_price = item.unitPrice,
                        total = item.total
                    )
                }
            )
            
            val result = SupabaseClientProvider.enviarFacturaParaAprobacion(dto)
            
            result.fold(
                onSuccess = { supabaseId ->
                    // Marcar como sincronizada y guardar ID de Supabase
                    invoiceDao.updateSupabaseSync(
                        id = invoiceId,
                        synced = true,
                        supabaseId = supabaseId
                    )
                    Result.success(Unit)
                },
                onFailure = { error ->
                    Result.failure(error)
                }
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Sincroniza estados desde Supabase (aprobaciones y respuestas SUNAT)
     */
    suspend fun sincronizarEstadosDesdeSupabase(): Result<SincronizacionResult> {
        return try {
            val facturasPendientes = invoiceDao.getByAprobacionStatusList(
                InvoiceEntity.AprobacionStatus.POR_APROBAR
            )
            
            var actualizadas = 0
            var errores = 0
            
            facturasPendientes.forEach { factura ->
                if (factura.supabaseId.isNotBlank()) {
                    val result = SupabaseClientProvider.consultarEstadoFactura(factura.supabaseId)
                    
                    result.fold(
                        onSuccess = { estadoRemoto ->
                            // Actualizar estado local
                            invoiceDao.updateEstadoDesdeSupabase(
                                id = factura.id,
                                aprobacionStatus = estadoRemoto.aprobacion_status,
                                aprobadoPor = estadoRemoto.aprobado_por ?: "",
                                aprobadoPorName = estadoRemoto.aprobado_por_name ?: "",
                                aprobadoAt = estadoRemoto.aprobado_at ?: 0,
                                rechazoRazon = estadoRemoto.rechazo_razon ?: "",
                                sunatStatus = estadoRemoto.sunat_status,
                                sunatCodigo = estadoRemoto.sunat_codigo ?: "",
                                sunatDescripcion = estadoRemoto.sunat_descripcion ?: "",
                                sunatHash = estadoRemoto.sunat_hash ?: "",
                                sunatXmlUrl = estadoRemoto.sunat_xml_url ?: "",
                                sunatCdrUrl = estadoRemoto.sunat_cdr_url ?: "",
                                sunatError = estadoRemoto.sunat_error ?: "",
                                sunatSentAt = estadoRemoto.sunat_sent_at ?: 0
                            )
                            actualizadas++
                        },
                        onFailure = {
                            errores++
                        }
                    )
                }
            }
            
            Result.success(SincronizacionResult(actualizadas, errores))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Obtiene facturas pendientes de aprobación
     */
    suspend fun getFacturasPendientesAprobacion(): List<InvoiceEntity> {
        return invoiceDao.getByAprobacionStatusList(
            InvoiceEntity.AprobacionStatus.POR_APROBAR
        )
    }
    
    /**
     * Obtiene facturas aprobadas pero no enviadas a SUNAT
     */
    suspend fun getFacturasAprobadasPendientesEnvio(): List<InvoiceEntity> {
        return invoiceDao.getByAprobacionAndSunatStatus(
            aprobacionStatus = InvoiceEntity.AprobacionStatus.APROBADO,
            sunatStatus = InvoiceEntity.SunatStatus.PENDIENTE
        )
    }
    
    suspend fun deleteById(id: Long) = invoiceDao.deleteById(id)
}

/**
 * Resultado de sincronización
 */
data class SincronizacionResult(
    val actualizadas: Int,
    val errores: Int
)

// DTOs para comunicación con Supabase

@kotlinx.serialization.Serializable
data class FacturaParaAprobacionDto(
    val id_local: Long,
    val series: String,
    val number: Long,
    val tipo_comprobante: String,
    val cliente_nombre: String,
    val cliente_ruc: String,
    val cliente_direccion: String,
    val cliente_tipo_doc: String,
    val date_millis: Long,
    val subtotal: Double,
    val igv: Double,
    val total: Double,
    val notes: String,
    val created_at: Long,
    val created_by: String,
    val created_by_name: String,
    val aprobacion_status: String,
    val items: List<FacturaItemDto>
)

@kotlinx.serialization.Serializable
data class FacturaItemDto(
    val producto_id: Long?,
    val description: String,
    val quantity: Int,
    val unit_price: Double,
    val total: Double
)

@kotlinx.serialization.Serializable
data class EstadoFacturaRemoto(
    val aprobacion_status: String,
    val aprobado_por: String?,
    val aprobado_por_name: String?,
    val aprobado_at: Long?,
    val rechazo_razon: String?,
    val sunat_status: String,
    val sunat_codigo: String?,
    val sunat_descripcion: String?,
    val sunat_hash: String?,
    val sunat_xml_url: String?,
    val sunat_cdr_url: String?,
    val sunat_error: String?,
    val sunat_sent_at: Long?
)
