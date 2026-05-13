package com.factumary.ui.screens.invoice

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Pending
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.db.entity.InvoiceItemEntity
import com.factumary.data.repository.InvoiceRepository
import com.factumary.data.sunat.SunatApiService
import com.factumary.pdf.PdfGenerator
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceDetailScreen(
    invoiceId: Long,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val sunatService = remember { SunatApiService() }
    val repo = remember { InvoiceRepository(
        FactuMaryApp.instance.database.invoiceDao(),
        FactuMaryApp.instance.database.productDao(),
        sunatService
    ) }

    var invoice by remember { mutableStateOf<InvoiceEntity?>(null) }
    var items by remember { mutableStateOf<List<InvoiceItemEntity>>(emptyList()) }
    var pdfFile by remember { mutableStateOf<File?>(null) }
    var retryLoading by remember { mutableStateOf(false) }
    var retryMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(invoiceId) {
        invoice = repo.getById(invoiceId)
        items = repo.getItemsByInvoiceId(invoiceId)
    }

    val isFactura = invoice?.tipoComprobante == "01"
    val tipoLabel = if (isFactura) "FACTURA" else "BOLETA"

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("$tipoLabel ${invoice?.series}-${invoice?.number}") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Volver")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        invoice?.let { inv ->
                            scope.launch {
                                val file = withContext(Dispatchers.IO) {
                                    PdfGenerator.generate(context, inv, items)
                                }
                                pdfFile = file
                                savePdfToDownloads(context, file, inv)
                            }
                        }
                    }) {
                        Icon(Icons.Filled.PictureAsPdf, "Guardar PDF", tint = MaterialTheme.colorScheme.primary)
                    }
                    IconButton(onClick = {
                        invoice?.let { inv ->
                            scope.launch {
                                val file = withContext(Dispatchers.IO) {
                                    PdfGenerator.generate(context, inv, items)
                                }
                                sharePdf(context, file)
                            }
                        }
                    }) {
                        Icon(Icons.Filled.Share, "Compartir", tint = MaterialTheme.colorScheme.primary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        invoice?.let { inv ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Encabezado + Estado SUNAT
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = tipoLabel,
                                        style = MaterialTheme.typography.headlineMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MarrónOscuro
                                    )
                                    Text(
                                        text = "${inv.series}-${inv.number}",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = MarrónOscuro
                                    )
                                }
                                Icon(
                                    imageVector = if (inv.supabaseSynced) Icons.Filled.CloudDone else Icons.Filled.CloudOff,
                                    contentDescription = if (inv.supabaseSynced) "Sincronizado" else "No sincronizado",
                                    tint = if (inv.supabaseSynced) androidx.compose.ui.graphics.Color(0xFF2E7D32) else TextoMedio,
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                            Text(
                                text = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
                                    .format(Date(inv.dateMillis)),
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextoMedio
                            )

                            // Estado SUNAT
                            Spacer(modifier = Modifier.height(12.dp))
                            SunatStatusSection(
                                status = inv.sunatStatus,
                                codigo = inv.sunatCodigo,
                                descripcion = inv.sunatDescripcion,
                                error = inv.sunatError,
                                retryLoading = retryLoading,
                                retryMessage = retryMessage,
                                onRetry = {
                                    retryLoading = true
                                    retryMessage = null
                                    scope.launch {
                                        repo.retryPendingSunatInvoices()
                                        invoice = repo.getById(inv.id)
                                        retryMessage = when (invoice?.sunatStatus) {
                                            InvoiceEntity.SunatStatus.ACEPTADO -> "Aceptado por SUNAT"
                                            InvoiceEntity.SunatStatus.ENVIADO -> "Enviado a SUNAT"
                                            InvoiceEntity.SunatStatus.RECHAZADO -> "Rechazado: ${invoice?.sunatDescripcion}"
                                            else -> invoice?.sunatError ?: "No se pudo enviar"
                                        }
                                        retryLoading = false
                                    }
                                }
                            )
                        }
                    }
                }

                // Emisor
                item {
                    SectionCard(title = "Emisor") {
                        Text("INVERSIONES MAQUI MARY PERU E.I.R.L.", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text("RUC: 20606218801", style = MaterialTheme.typography.bodySmall)
                        Text("Calle Las Quebradas Mz E Lote 10, Ate Vitarte", style = MaterialTheme.typography.bodySmall)
                    }
                }

                // Cliente
                item {
                    SectionCard(title = "Cliente") {
                        Text(inv.customerName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        if (inv.customerRuc.isNotBlank()) Text(
                            "${if (inv.customerTipoDoc == "6") "RUC" else "DNI"}: ${inv.customerRuc}",
                            style = MaterialTheme.typography.bodySmall
                        )
                        if (inv.customerAddress.isNotBlank()) Text(inv.customerAddress, style = MaterialTheme.typography.bodySmall)
                    }
                }

                // Productos
                item {
                    Text(
                        "Detalle",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MarrónOscuro
                    )
                }

                items(items) { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.description, style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "${item.quantity} x S/ ${String.format("%.2f", item.unitPrice)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextoMedio
                            )
                        }
                        Text(
                            "S/ ${String.format("%.2f", item.total)}",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MarrónOscuro
                        )
                    }
                    HorizontalDivider()
                }

                // Totales
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Subtotal", color = TextoMedio)
                                Text("S/ ${String.format("%.2f", inv.subtotal)}")
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("IGV (18%)", color = TextoMedio)
                                Text("S/ ${String.format("%.2f", inv.igv)}")
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("TOTAL", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                Text("S/ ${String.format("%.2f", inv.total)}", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            }
                        }
                    }
                }

                // Notas
                if (inv.notes.isNotBlank()) {
                    item {
                        Text("Notas: ${inv.notes}", style = MaterialTheme.typography.bodySmall, color = TextoMedio)
                    }
                }

                // Hash / CDR info
                if (inv.sunatHash.isNotBlank()) {
                    item {
                        Text("Hash: ${inv.sunatHash.take(16)}...", style = MaterialTheme.typography.labelSmall, color = TextoMedio)
                    }
                }

                // Botones acción
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = {
                                scope.launch {
                                    val file = withContext(Dispatchers.IO) {
                                        PdfGenerator.generate(context, inv, items)
                                    }
                                    pdfFile = file
                                    savePdfToDownloads(context, file, inv)
                                }
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Filled.PictureAsPdf, null, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("PDF")
                        }
                        Button(
                            onClick = {
                                scope.launch {
                                    val file = withContext(Dispatchers.IO) {
                                        PdfGenerator.generate(context, inv, items)
                                    }
                                    sharePdf(context, file)
                                }
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.secondary
                            )
                        ) {
                            Icon(Icons.Filled.Share, null, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Compartir")
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        } ?: run {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text("Cargando...", color = TextoMedio)
            }
        }
    }
}

@Composable
private fun SunatStatusSection(
    status: String,
    codigo: String,
    descripcion: String,
    error: String,
    retryLoading: Boolean,
    retryMessage: String?,
    onRetry: () -> Unit
) {
    val (icon, label, color) = when (status) {
        InvoiceEntity.SunatStatus.ACEPTADO -> Triple(Icons.Filled.CheckCircle, "Aceptado por SUNAT", Color(0xFF2E7D32))
        InvoiceEntity.SunatStatus.ENVIADO -> Triple(Icons.Filled.CloudDone, "Enviado a SUNAT", Color(0xFF1565C0))
        InvoiceEntity.SunatStatus.RECHAZADO -> Triple(Icons.Filled.Error, "Rechazado por SUNAT", Color(0xFFFFA000))
        InvoiceEntity.SunatStatus.ERROR -> Triple(Icons.Filled.Error, "Error al enviar", Color(0xFFC62828))
        else -> Triple(Icons.Filled.Pending, "Pendiente de envío", Color(0xFF757575))
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.08f)
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = icon,
                        contentDescription = label,
                        tint = color,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelLarge,
                        color = color,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                if (status in listOf(InvoiceEntity.SunatStatus.PENDIENTE, InvoiceEntity.SunatStatus.ERROR, InvoiceEntity.SunatStatus.RECHAZADO)) {
                    OutlinedButton(
                        onClick = onRetry,
                        enabled = !retryLoading,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        if (retryLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.Filled.Refresh, null, modifier = Modifier.size(14.dp))
                        }
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Reintentar", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }

            if (codigo.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Código SUNAT: $codigo",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextoMedio
                )
            }

            if (descripcion.isNotBlank() && status != InvoiceEntity.SunatStatus.ACEPTADO) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = descripcion,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (status == InvoiceEntity.SunatStatus.ERROR || status == InvoiceEntity.SunatStatus.RECHAZADO)
                        Color(0xFFC62828) else TextoMedio
                )
            }

            if (error.isNotBlank() && status == InvoiceEntity.SunatStatus.ERROR) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = error,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFC62828)
                )
            }

            if (retryMessage != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = retryMessage,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.tertiary
                )
            }
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.labelMedium,
                color = TextoMedio
            )
            Spacer(modifier = Modifier.height(4.dp))
            content()
        }
    }
}

private fun savePdfToDownloads(context: Context, file: File, invoice: InvoiceEntity) {
    try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, "${invoice.series}-${invoice.number}.pdf")
                put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            }
            val uri = context.contentResolver.insert(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI, values
            )
            uri?.let {
                context.contentResolver.openOutputStream(it)?.use { output ->
                    file.inputStream().use { input -> input.copyTo(output) }
                }
            }
        } else {
            val destDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            val destFile = File(destDir, "${invoice.series}-${invoice.number}.pdf")
            file.copyTo(destFile, overwrite = true)
        }
        Toast.makeText(context, "PDF guardado en Descargas", Toast.LENGTH_SHORT).show()
    } catch (e: Exception) {
        Toast.makeText(context, "Error al guardar PDF: ${e.message}", Toast.LENGTH_LONG).show()
    }
}

private fun sharePdf(context: Context, file: File) {
    try {
        val uri = androidx.core.content.FileProvider.getUriForFile(
            context,
            "${context.packageName}.provider",
            file
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Compartir comprobante"))
    } catch (e: Exception) {
        Toast.makeText(context, "Error al compartir: ${e.message}", Toast.LENGTH_SHORT).show()
    }
}
