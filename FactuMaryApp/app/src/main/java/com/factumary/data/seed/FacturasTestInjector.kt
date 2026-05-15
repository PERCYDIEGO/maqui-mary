package com.factumary.data.seed

import android.content.Context
import android.widget.Toast
import com.factumary.FactuMaryApp
import com.factumary.data.db.entity.CustomerEntity
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.db.entity.InvoiceItemEntity
import com.factumary.data.db.entity.ProductEntity
import com.factumary.data.remote.SupabaseClientProvider
import com.factumary.data.repository.InvoiceRepositoryAprobacion
import io.github.jan.supabase.gotrue.auth
import com.factumary.pdf.PdfGenerator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Inyección de facturas de prueba para testing del sistema de aprobación
 * 
 * Genera facturas ficticias y las envía al CRM para probar el flujo:
 * 1. Crear factura en app
 * 2. Generar PDF
 * 3. Enviar a CRM (POR_APROBAR)
 * 4. Verificar sincronización
 */
object FacturasTestInjector {
    
    data class TestResult(
        val totalGeneradas: Int,
        val exitosas: Int,
        val fallidas: Int,
        val detalles: List<String>
    )
    
    /**
     * Inyecta facturas de prueba en el sistema
     * 
     * @param context Contexto Android para mostrar toast
     * @param cantidad Cantidad de facturas a generar (1-10)
     * @param onComplete Callback con el resultado
     */
    fun injectarFacturasTest(
        context: Context,
        cantidad: Int = 3,
        onComplete: (TestResult) -> Unit = {}
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            val resultado = generarFacturasTest(context, cantidad)
            
            withContext(Dispatchers.Main) {
                Toast.makeText(
                    context,
                    "${resultado.exitosas}/${resultado.totalGeneradas} facturas inyectadas",
                    Toast.LENGTH_LONG
                ).show()
                onComplete(resultado)
            }
        }
    }
    
    private suspend fun generarFacturasTest(context: Context, cantidad: Int): TestResult {
        val db = FactuMaryApp.instance.database
        val invoiceRepo = InvoiceRepositoryAprobacion(db.invoiceDao())
        val customerDao = db.customerDao()
        val productDao = db.productDao()
        
        val detalles = mutableListOf<String>()
        var exitosas = 0
        var fallidas = 0
        
        // Obtener clientes y productos existentes
        val clientes = customerDao.getAllList()
        val productos = productDao.getAll()
        
        if (clientes.isEmpty()) {
            detalles.add("❌ No hay clientes en la base de datos")
            return TestResult(0, 0, 0, detalles)
        }
        
        if (productos.isEmpty()) {
            detalles.add("❌ No hay productos en la base de datos")
            return TestResult(0, 0, 0, detalles)
        }
        
        // Generar facturas de prueba
        val factCount = minOf(cantidad.coerceIn(1, 10), 10)
        
        repeat(factCount) { index ->
            try {
                val cliente = clientes.random()
                val numProductos = (1..3).random()
                val productosSeleccionados = productos.shuffled().take(numProductos)
                
                // Crear items
                val items = productosSeleccionados.map { producto ->
                    val cant = (1..10).random()
                    InvoiceItemEntity(
                        invoiceId = 0,
                        productId = producto.id,
                        description = producto.name,
                        quantity = cant,
                        unitPrice = producto.price,
                        total = producto.price * cantidad
                    )
                }
                
                val subtotal = items.sumOf { it.total }
                val igv = subtotal * 0.18
                val total = subtotal + igv
                
                // Obtener siguiente número de factura
                val series = "F001"
                val nextNumber = invoiceRepo.getNextNumber(series)
                
                // Crear factura
                val invoice = InvoiceEntity(
                    series = series,
                    number = nextNumber,
                    tipoComprobante = "01", // Factura
                    customerId = cliente.id,
                    customerName = cliente.name,
                    customerRuc = cliente.numDocumento,
                    customerAddress = cliente.address,
                    customerTipoDoc = cliente.tipoDocumento,
                    subtotal = subtotal,
                    igv = igv,
                    total = total,
                    notes = "Factura de prueba #${index + 1} - Generada automáticamente",
                    dateMillis = System.currentTimeMillis() - (index * 86400000) // Días anteriores
                )
                
                // Guardar con flujo de aprobación
                val userId = SupabaseClientProvider.client.auth.currentUserOrNull()?.id ?: "test_user"
                val userName = SupabaseClientProvider.client.auth.currentUserOrNull()?.email ?: "Test User"
                
                val result = invoiceRepo.crearFacturaParaAprobacion(
                    invoice = invoice,
                    items = items,
                    userId = userId,
                    userName = userName
                )
                
                result.fold(
                    onSuccess = { invoiceId ->
                        // Generar PDF preliminar
                        val _pdfFile = PdfGenerator.generate(
                            context = context,
                            invoice = invoice.copy(id = invoiceId),
                            items = items,
                            esPreliminar = true
                        )
                        
                        detalles.add("✅ Factura ${invoice.series}-${invoice.number} creada (ID: $invoiceId) - Total: S/ ${String.format("%.2f", total)}")
                        exitosas++
                    },
                    onFailure = { error ->
                        detalles.add("❌ Factura ${index + 1} falló: ${error.message}")
                        fallidas++
                    }
                )
                
            } catch (e: Exception) {
                detalles.add("❌ Error en factura ${index + 1}: ${e.message}")
                fallidas++
            }
        }
        
        return TestResult(factCount, exitosas, fallidas, detalles)
    }
    
    /**
     * Genera un reporte de prueba detallado
     */
    fun generarReporte(resultado: TestResult): String {
        val sb = StringBuilder()
        sb.appendLine("=== REPORTE DE INYECCIÓN DE FACTURAS ===")
        sb.appendLine()
        sb.appendLine("Total generadas: ${resultado.totalGeneradas}")
        sb.appendLine("Exitosas: ${resultado.exitosas}")
        sb.appendLine("Fallidas: ${resultado.fallidas}")
        sb.appendLine()
        sb.appendLine("Detalles:")
        resultado.detalles.forEach { detalle ->
            sb.appendLine("  $detalle")
        }
        return sb.toString()
    }
}

/**
 * Extensión para uso desde cualquier pantalla
 */
fun injectarFacturasTestDesdePantalla(
    context: Context,
    cantidad: Int = 3,
    onResult: (String) -> Unit = {}
) {
    FacturasTestInjector.injectarFacturasTest(context, cantidad) { resultado ->
        val reporte = FacturasTestInjector.generarReporte(resultado)
        onResult(reporte)
    }
}
