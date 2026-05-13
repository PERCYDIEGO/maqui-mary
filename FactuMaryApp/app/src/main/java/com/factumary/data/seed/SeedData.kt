package com.factumary.data.seed

import com.factumary.data.db.dao.CustomerDao
import com.factumary.data.db.dao.InvoiceDao
import com.factumary.data.db.dao.ProductDao
import com.factumary.data.db.entity.CustomerEntity
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.db.entity.InvoiceItemEntity
import com.factumary.data.db.entity.ProductEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Datos de prueba para Maqui Mary - Esponjas
 * Genera facturas de prueba SOLO en la base de datos local (sin enviar a SUNAT)
 */
object SeedData {

    // ═══════════════════════════════════════════════════════════════════════════
    // PRODUCTOS DE MAQUI MARY
    // ═══════════════════════════════════════════════════════════════════════════
    private val products = listOf(
        // --- Esponjas de colores ---
        ProductEntity(name = "Esponja Multiuso Amarilla", description = "Esponja suave para vajilla y superficies", price = 1.50, category = "Colores", colorInfo = "Amarillo", stock = 500),
        ProductEntity(name = "Esponja Multiuso Verde", description = "Esponja suave para vajilla y superficies", price = 1.50, category = "Colores", colorInfo = "Verde", stock = 500),
        ProductEntity(name = "Esponja Multiuso Roja", description = "Esponja suave para vajilla y superficies", price = 1.50, category = "Colores", colorInfo = "Rojo", stock = 500),
        ProductEntity(name = "Esponja Multiuso Azul", description = "Esponja suave para vajilla y superficies", price = 1.50, category = "Colores", colorInfo = "Azul", stock = 500),
        ProductEntity(name = "Esponja Multiuso Celeste", description = "Esponja suave para vajilla y superficies", price = 1.50, category = "Colores", colorInfo = "Celeste", stock = 300),
        ProductEntity(name = "Esponja Multiuso Naranja", description = "Esponja suave para vajilla y superficies", price = 1.50, category = "Colores", colorInfo = "Naranja", stock = 300),
        ProductEntity(name = "Esponja Multiuso Rosada", description = "Esponja suave para vajilla y superficies", price = 1.50, category = "Colores", colorInfo = "Rosado", stock = 300),
        ProductEntity(name = "Esponja Multiuso Blanca", description = "Esponja suave para vajilla y superficies", price = 1.50, category = "Colores", colorInfo = "Blanco", stock = 200),
        ProductEntity(name = "Esponja Multiuso Morada", description = "Esponja suave para vajilla y superficies", price = 1.50, category = "Colores", colorInfo = "Morado", stock = 200),

        // --- Esponjas de acero ---
        ProductEntity(name = "Esponja de Acero Fino", description = "Fibra de acero para limpieza profunda", price = 2.00, category = "Acero", colorInfo = "Gris", stock = 400),
        ProductEntity(name = "Esponja de Acero Grueso", description = "Fibra de acero resistente para superficies duras", price = 2.50, category = "Acero", colorInfo = "Gris", stock = 400),

        // --- Esponjas doble uso ---
        ProductEntity(name = "Esponja Doble Uso Amarilla", description = "Cara suave + cara abrasiva", price = 2.50, category = "Doble Uso", colorInfo = "Amarillo", stock = 350),
        ProductEntity(name = "Esponja Doble Uso Verde", description = "Cara suave + cara abrasiva", price = 2.50, category = "Doble Uso", colorInfo = "Verde", stock = 350),
        ProductEntity(name = "Esponja Doble Uso Roja", description = "Cara suave + cara abrasiva", price = 2.50, category = "Doble Uso", colorInfo = "Rojo", stock = 350),
        ProductEntity(name = "Esponja Doble Uso Azul", description = "Cara suave + cara abrasiva", price = 2.50, category = "Doble Uso", colorInfo = "Azul", stock = 350),

        // --- Paquetes / Varios ---
        ProductEntity(name = "Mix x10 Esponjas Colores", description = "Paquete variado de 10 esponjas multiuso", price = 12.00, category = "Paquetes", colorInfo = "Variado", stock = 100),
        ProductEntity(name = "Pack x6 Doble Uso", description = "Pack de 6 esponjas doble uso variadas", price = 13.00, category = "Paquetes", colorInfo = "Variado", stock = 100),
        ProductEntity(name = "Pack x12 Esponjas Acero", description = "Pack de 12 esponjas de acero", price = 20.00, category = "Paquetes", colorInfo = "Gris", stock = 80),
    )

    // ═══════════════════════════════════════════════════════════════════════════
    // CLIENTES DE PRUEBA
    // ═══════════════════════════════════════════════════════════════════════════
    private val customers = listOf(
        CustomerEntity(
            name = "Bodega La Económica S.A.C.",
            numDocumento = "20123456789",
            address = "Av. Principal 123, Ate Vitarte",
            phone = "987654321",
            email = "compras@bodegalaeconomica.com",
            tipoDocumento = "6" // RUC
        ),
        CustomerEntity(
            name = "Distribuidora Lima Norte E.I.R.L.",
            numDocumento = "20567890123",
            address = "Jr. Comercio 456, Los Olivos",
            phone = "912345678",
            email = "ventas@dlmnorte.com",
            tipoDocumento = "6" // RUC
        ),
        CustomerEntity(
            name = "Supermercados El Ahorro S.A.",
            numDocumento = "20333444556",
            address = "Av. Javier Prado 789, San Borja",
            phone = "999888777",
            email = "facturacion@elahorro.com.pe",
            tipoDocumento = "6" // RUC
        ),
        CustomerEntity(
            name = "Ferretería El Constructor",
            numDocumento = "10777888901",
            address = "Calle Las Flores 321, Villa El Salvador",
            phone = "955444333",
            email = "",
            tipoDocumento = "1" // DNI
        ),
        CustomerEntity(
            name = "Tienda Doña María",
            numDocumento = "10099887766",
            address = "Mercado Central Puesto 45, Ate",
            phone = "966555444",
            email = "",
            tipoDocumento = "1" // DNI
        )
    )

    /**
     * Inserta los productos si la tabla está vacía
     */
    fun seedProducts(productDao: ProductDao) {
        CoroutineScope(Dispatchers.IO).launch {
            if (productDao.count() == 0) {
                productDao.insertAll(products)
            }
        }
    }

    /**
     * Inserta los clientes de prueba si la tabla está vacía
     */
    suspend fun seedCustomers(customerDao: CustomerDao): List<Long> {
        val existingCount = customerDao.count()
        if (existingCount > 0) {
            // Retornar IDs de clientes existentes
            return customerDao.getAllList().map { it.id }
        }
        
        val insertedIds = mutableListOf<Long>()
        for (customer in customers) {
            val id = customerDao.insert(customer)
            insertedIds.add(id)
        }
        return insertedIds
    }

    /**
     * Genera 5 facturas de prueba y las guarda SOLO en la base de datos local
     * NO envía a SUNAT, NO sincroniza con Supabase
     * 
     * @param invoiceDao DAO de facturas
     * @param customerDao DAO de clientes
     * @param productDao DAO de productos
     * @return Lista de IDs de las facturas creadas
     */
    suspend fun seedTestInvoices(
        invoiceDao: InvoiceDao,
        customerDao: CustomerDao,
        productDao: ProductDao
    ): List<Long> {
        // 1. Asegurar que existen clientes
        val customerIds = seedCustomers(customerDao)
        if (customerIds.isEmpty()) {
            throw IllegalStateException("No se pudieron crear los clientes de prueba")
        }

        // 2. Asegurar que existen productos
        if (productDao.count() == 0) {
            productDao.insertAll(products)
        }
        val availableProducts = productDao.getAll()
        if (availableProducts.isEmpty()) {
            throw IllegalStateException("No hay productos disponibles")
        }

        // 3. Datos de las 5 facturas de prueba
        val facturasPrueba = listOf(
            FacturaPrueba(
                customerIndex = 0,
                items = listOf(
                    ItemPrueba(productIndex = 0, quantity = 50),  // Esponja Amarilla x50
                    ItemPrueba(productIndex = 1, quantity = 30),  // Esponja Verde x30
                    ItemPrueba(productIndex = 10, quantity = 20)  // Esponja Acero Fino x20
                ),
                notes = "Pedido semanal - Entrega martes"
            ),
            FacturaPrueba(
                customerIndex = 1,
                items = listOf(
                    ItemPrueba(productIndex = 2, quantity = 100), // Esponja Roja x100
                    ItemPrueba(productIndex = 3, quantity = 100), // Esponja Azul x100
                    ItemPrueba(productIndex = 4, quantity = 50),  // Esponja Celeste x50
                    ItemPrueba(productIndex = 14, quantity = 10)  // Mix x10 Colores x10
                ),
                notes = "Mayorista - Pago contra entrega"
            ),
            FacturaPrueba(
                customerIndex = 2,
                items = listOf(
                    ItemPrueba(productIndex = 15, quantity = 25), // Pack x6 Doble Uso x25
                    ItemPrueba(productIndex = 16, quantity = 15), // Pack x12 Acero x15
                    ItemPrueba(productIndex = 11, quantity = 40), // Doble Uso Verde x40
                    ItemPrueba(productIndex = 12, quantity = 40)  // Doble Uso Roja x40
                ),
                notes = "Cadena de supermercados - Factura a 30 días"
            ),
            FacturaPrueba(
                customerIndex = 3,
                items = listOf(
                    ItemPrueba(productIndex = 9, quantity = 60),  // Acero Fino x60
                    ItemPrueba(productIndex = 10, quantity = 40), // Acero Grueso x40
                    ItemPrueba(productIndex = 5, quantity = 25)   // Esponja Naranja x25
                ),
                notes = "Ferretería - Cliente frecuente"
            ),
            FacturaPrueba(
                customerIndex = 4,
                items = listOf(
                    ItemPrueba(productIndex = 0, quantity = 20),  // Amarilla x20
                    ItemPrueba(productIndex = 1, quantity = 20),  // Verde x20
                    ItemPrueba(productIndex = 2, quantity = 20),  // Roja x20
                    ItemPrueba(productIndex = 3, quantity = 20),  // Azul x20
                    ItemPrueba(productIndex = 6, quantity = 20),  // Rosada x20
                    ItemPrueba(productIndex = 13, quantity = 30)  // Doble Uso Azul x30
                ),
                notes = "Puesto de mercado - Surtido variado"
            )
        )

        // 4. Crear cada factura
        val createdInvoiceIds = mutableListOf<Long>()
        var currentNumber = 1L

        for ((index, facturaData) in facturasPrueba.withIndex()) {
            val customer = customerDao.getById(customerIds[facturaData.customerIndex]) 
                ?: continue

            // Calcular totales
            var subtotal = 0.0
            val invoiceItems = mutableListOf<InvoiceItemEntity>()

            for (itemData in facturaData.items) {
                val product = availableProducts.getOrNull(itemData.productIndex) ?: continue
                val itemTotal = product.price * itemData.quantity
                subtotal += itemTotal

                invoiceItems.add(
                    InvoiceItemEntity(
                        invoiceId = 0, // Se actualizará después
                        productId = product.id,
                        description = product.name,
                        quantity = itemData.quantity,
                        unitPrice = product.price,
                        total = itemTotal
                    )
                )
            }

            val igv = subtotal * 0.18
            val total = subtotal + igv

            // Crear la factura (sin enviar a SUNAT)
            val invoice = InvoiceEntity(
                series = "F001",
                number = currentNumber++,
                tipoComprobante = "01", // Factura
                customerId = customer.id,
                customerName = customer.name,
                customerRuc = customer.numDocumento,
                customerAddress = customer.address,
                customerTipoDoc = customer.tipoDocumento,
                dateMillis = System.currentTimeMillis() - (index * 86400000), // Días anteriores
                subtotal = subtotal,
                igv = igv,
                total = total,
                notes = facturaData.notes,
                createdAt = System.currentTimeMillis(),
                supabaseSynced = false,
                sunatStatus = "PENDIENTE", // No enviado a SUNAT
                sunatCodigo = "",
                sunatDescripcion = "Factura de prueba - NO ENVIAR A SUNAT",
                sunatHash = "",
                sunatXmlUrl = "",
                sunatCdrUrl = "",
                sunatError = "",
                sunatSentAt = 0,
                oseStatus = "PENDING",
                oseTicket = "",
                oseCdr = "",
                oseErrorMessage = "",
                oseSyncedAt = 0
            )

            // Guardar en la base de datos (solo local)
            val invoiceId = invoiceDao.createInvoiceWithItems(invoice, invoiceItems)
            createdInvoiceIds.add(invoiceId)
        }

        return createdInvoiceIds
    }

    /**
     * Verifica que las facturas se crearon correctamente
     * Retorna un resumen de las facturas en la base de datos
     */
    suspend fun verifyTestInvoices(invoiceDao: InvoiceDao): InvoiceVerificationResult {
        val allInvoices = invoiceDao.getAllSync()
        val pendingCount = allInvoices.count { it.sunatStatus == "PENDIENTE" }
        val syncedCount = allInvoices.count { it.supabaseSynced }
        
        return InvoiceVerificationResult(
            totalInvoices = allInvoices.size,
            pendingSunat = pendingCount,
            syncedToCloud = syncedCount,
            invoices = allInvoices.map { 
                InvoiceSummary(
                    id = it.id,
                    series = it.series,
                    number = it.number,
                    customer = it.customerName,
                    total = it.total,
                    status = it.sunatStatus,
                    date = it.dateMillis
                )
            }
        )
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA CLASSES AUXILIARES
    // ═══════════════════════════════════════════════════════════════════════════
    private data class FacturaPrueba(
        val customerIndex: Int,
        val items: List<ItemPrueba>,
        val notes: String
    )

    private data class ItemPrueba(
        val productIndex: Int,
        val quantity: Int
    )

    data class InvoiceVerificationResult(
        val totalInvoices: Int,
        val pendingSunat: Int,
        val syncedToCloud: Int,
        val invoices: List<InvoiceSummary>
    )

    data class InvoiceSummary(
        val id: Long,
        val series: String,
        val number: Long,
        val customer: String,
        val total: Double,
        val status: String,
        val date: Long
    )
}
