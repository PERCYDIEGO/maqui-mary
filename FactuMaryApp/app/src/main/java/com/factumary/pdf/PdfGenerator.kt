package com.factumary.pdf

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.db.entity.InvoiceItemEntity
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Generador de PDFs para FactuMary
 * 
 * Genera PDFs locales que el vendedor puede entregar al cliente inmediatamente,
 * aunque la factura aún esté pendiente de aprobación y envío a SUNAT.
 */
object PdfGenerator {

    private val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())

    /**
     * Genera PDF de factura/boleta
     * 
     * @param context Contexto Android
     * @param invoice Datos de la factura
     * @param items Items de la factura
     * @param esPreliminar Si es true, muestra marca de "PENDIENTE DE APROBACIÓN"
     * @return Archivo PDF generado
     */
    fun generate(
        context: Context,
        invoice: InvoiceEntity,
        items: List<InvoiceItemEntity>,
        esPreliminar: Boolean = false
    ): File {
        val document = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = document.startPage(pageInfo)
        val canvas = page.canvas

        val titlePaint = Paint().apply {
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textSize = 24f
            color = Color.parseColor("#4A3528")
        }
        val headerPaint = Paint().apply {
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textSize = 16f
            color = Color.parseColor("#4A3528")
        }
        val normalPaint = Paint().apply {
            textSize = 12f
            color = Color.parseColor("#2C1810")
        }
        val smallPaint = Paint().apply {
            textSize = 10f
            color = Color.parseColor("#6B5A4E")
        }
        val linePaint = Paint().apply {
            color = Color.parseColor("#E8D5C4")
            strokeWidth = 1f
        }
        val tableHeaderPaint = Paint().apply {
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textSize = 11f
            color = Color.WHITE
        }

        var y = 40f

        val tipoDocLabel = if (invoice.tipoComprobante == "01") "FACTURA ELECTRÓNICA" else "BOLETA ELECTRÓNICA DE VENTA"

        // === MARCA DE AGUA SI ES PRELIMINAR ===
        if (esPreliminar) {
            drawMarcaAguaPreliminar(canvas)
        }

        // Título
        canvas.drawText("INVERSIONES MAQUI MARY PERU E.I.R.L.", 40f, y, titlePaint)
        y += 20f
        canvas.drawText("RUC: 20606218801", 40f, y, smallPaint)
        y += 14f
        canvas.drawText("Calle Las Quebradas Mz E Lote 10, Ate Vitarte", 40f, y, smallPaint)
        y += 14f
        canvas.drawText("Tel: (51) 949 446 676", 40f, y, smallPaint)

        // Línea separadora
        y += 10f
        canvas.drawLine(40f, y, 555f, y, linePaint)

        // Tipo documento
        y += 20f
        canvas.drawText(tipoDocLabel, 40f, y, headerPaint)
        val numWidth = headerPaint.measureText("${invoice.series}-${invoice.number}")
        canvas.drawText("${invoice.series}-${invoice.number}", 555f - numWidth, y, headerPaint)

        y += 16f
        canvas.drawText("Fecha: ${dateFormat.format(Date(invoice.dateMillis))}", 40f, y, normalPaint)

        // Estado de aprobación (si es preliminar)
        if (esPreliminar) {
            y += 16f
            val estadoPaint = Paint().apply {
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                textSize = 11f
                color = Color.parseColor("#FF9800") // Naranja
            }
            val estadoTexto = when (invoice.aprobacionStatus) {
                InvoiceEntity.AprobacionStatus.POR_APROBAR -> "⚠ PENDIENTE DE APROBACIÓN"
                InvoiceEntity.AprobacionStatus.RECHAZADO_LOCAL -> "❌ RECHAZADO"
                else -> "⏳ EN PROCESO"
            }
            canvas.drawText(estadoTexto, 40f, y, estadoPaint)
        }

        // Datos del cliente
        y += 24f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 14f
        canvas.drawText("CLIENTE:", 40f, y, headerPaint)
        y += 16f
        canvas.drawText(invoice.customerName, 40f, y, normalPaint)
        y += 14f
        val docLabel = when (invoice.customerTipoDoc) {
            "6" -> "RUC"
            "1" -> "DNI"
            else -> "Doc"
        }
        if (invoice.customerRuc.isNotBlank() && invoice.customerTipoDoc != "0") {
            canvas.drawText("$docLabel: ${invoice.customerRuc}", 40f, y, normalPaint)
            y += 14f
        }
        if (invoice.customerAddress.isNotBlank()) {
            canvas.drawText(invoice.customerAddress, 40f, y, normalPaint)
            y += 14f
        }

        // Tabla de productos
        y += 12f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 6f

        // Fondo de encabezado de tabla
        val tableBgPaint = Paint().apply { color = Color.parseColor("#6B4E3A") }
        canvas.drawRect(40f, y, 555f, y + 22f, tableBgPaint)

        val colCant = 40f
        val colDesc = 80f
        val colPrecio = 370f
        val colTotal = 470f

        canvas.drawText("Cant", colCant + 4f, y + 15f, tableHeaderPaint)
        canvas.drawText("Descripción", colDesc + 4f, y + 15f, tableHeaderPaint)
        canvas.drawText("P.Unit", colPrecio + 4f, y + 15f, tableHeaderPaint)
        canvas.drawText("Total", colTotal + 4f, y + 15f, tableHeaderPaint)
        y += 26f

        items.forEach { item ->
            canvas.drawText("${item.quantity}", colCant + 4f, y, normalPaint)
            canvas.drawText(item.description, colDesc + 4f, y, normalPaint)
            canvas.drawText(
                "S/ ${String.format("%.2f", item.unitPrice)}",
                colPrecio + 4f, y, normalPaint
            )
            canvas.drawText(
                "S/ ${String.format("%.2f", item.total)}",
                colTotal + 4f, y, normalPaint
            )
            y += 18f
            canvas.drawLine(40f, y - 6f, 555f, y - 6f, linePaint)
        }

        // Totales
        y += 16f
        val labelX = 370f
        val valueX = 470f

        canvas.drawText("Subtotal:", labelX, y, normalPaint)
        canvas.drawText("S/ ${String.format("%.2f", invoice.subtotal)}", valueX, y, normalPaint)
        y += 16f
        canvas.drawText("IGV (18%):", labelX, y, normalPaint)
        canvas.drawText("S/ ${String.format("%.2f", invoice.igv)}", valueX, y, normalPaint)
        y += 16f

        val totalPaint = Paint().apply {
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textSize = 14f
            color = Color.parseColor("#4A3528")
        }
        canvas.drawLine(370f, y, 555f, y, linePaint)
        y += 16f
        canvas.drawText("TOTAL:", labelX, y, totalPaint)
        canvas.drawText("S/ ${String.format("%.2f", invoice.total)}", valueX, y, totalPaint)

        // Notas
        if (invoice.notes.isNotBlank()) {
            y += 24f
            canvas.drawLine(40f, y, 555f, y, linePaint)
            y += 14f
            canvas.drawText("Notas:", 40f, y, headerPaint)
            y += 14f

            val textPaint = TextPaint().apply {
                color = Color.parseColor("#2C1810")
                textSize = 11f
            }
            val staticLayout = StaticLayout.Builder.obtain(
                invoice.notes, 0, invoice.notes.length, textPaint, 515
            ).build()
            canvas.save()
            canvas.translate(40f, y)
            staticLayout.draw(canvas)
            canvas.restore()
            y += staticLayout.height.toFloat() + 8f
        }

        // Pie
        y = 820f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 14f
        
        if (esPreliminar) {
            // Mensaje para facturas preliminares
            canvas.drawText("Documento preliminar - Sujeto a aprobación antes de envío a SUNAT", 40f, y, smallPaint)
        } else {
            // Mensaje estándar
            canvas.drawText("Representación impresa del comprobante electrónico - Esponjas Maqui Mary Perú", 40f, y, smallPaint)
        }

        document.finishPage(page)

        val dir = File(context.cacheDir, "pdfs")
        dir.mkdirs()
        val file = File(dir, "${if (invoice.tipoComprobante == "01") "Factura" else "Boleta"}_${invoice.series}-${invoice.number}.pdf")

        FileOutputStream(file).use { out ->
            document.writeTo(out)
        }
        document.close()

        return file
    }

    /**
     * Dibuja marca de agua diagonal para documentos preliminares
     */
    private fun drawMarcaAguaPreliminar(canvas: Canvas) {
        val marcaPaint = Paint().apply {
            color = Color.parseColor("#FF9800") // Naranja
            alpha = 30 // Muy transparente
            textSize = 60f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }

        canvas.save()
        canvas.rotate(-45f, 297f, 421f) // Rotar 45 grados desde el centro
        
        canvas.drawText("PENDIENTE", 150f, 400f, marcaPaint)
        canvas.drawText("DE APROBACIÓN", 100f, 470f, marcaPaint)
        
        canvas.restore()
    }

    /**
     * Genera PDF con estado SUNAT (una vez aprobada y enviada)
     * Incluye QR, hash, y otros datos oficiales
     */
    fun generateOficial(
        context: Context,
        invoice: InvoiceEntity,
        items: List<InvoiceItemEntity>
    ): File {
        // Por ahora usa el mismo generador sin marca de agua
        // En el futuro puede incluir QR, código de barras, etc.
        return generate(context, invoice, items, esPreliminar = false)
    }
}
