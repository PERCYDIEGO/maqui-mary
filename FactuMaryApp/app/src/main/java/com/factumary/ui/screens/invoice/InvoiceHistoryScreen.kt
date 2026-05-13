package com.factumary.ui.screens.invoice

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Pending
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.repository.InvoiceRepository
import com.factumary.data.sunat.SunatApiService
import com.factumary.ui.components.MaquiContext
import com.factumary.ui.components.MaquiGuide
import com.factumary.ui.components.MaquiMini
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceHistoryScreen(
    onInvoiceClick: (Long) -> Unit,
    onBack: () -> Unit
) {
    val sunatService = remember { SunatApiService() }
    val repo = remember { InvoiceRepository(
        FactuMaryApp.instance.database.invoiceDao(),
        FactuMaryApp.instance.database.productDao(),
        sunatService
    ) }
    val invoices by repo.getAll().collectAsState(initial = emptyList())
    var showMaqui by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Historial de Ventas") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Volver")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        floatingActionButton = {
            if (!showMaqui) {
                MaquiMini(onClick = { showMaqui = true })
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize()) {
        if (invoices.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    Icons.Filled.Receipt,
                    contentDescription = null,
                    tint = TextoMedio,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
                Text(
                    "Aún no hay ventas registradas",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextoMedio
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(invoices) { invoice ->
                    InvoiceCard(
                        invoice = invoice,
                        onClick = { onInvoiceClick(invoice.id) }
                    )
                }
                item { Spacer(modifier = Modifier.height(200.dp)) } // Espacio para Maqui
            }

            // Maqui Mascota - Guía interactiva
            if (showMaqui) {
                MaquiGuide(
                    context = MaquiContext.INVOICE_HISTORY,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(bottom = 16.dp, end = 16.dp),
                    onDismiss = { showMaqui = false }
                )
            }
        }
        }
    }
}

@Composable
private fun InvoiceCard(
    invoice: InvoiceEntity,
    onClick: () -> Unit
) {
    val dateStr = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
        .format(Date(invoice.dateMillis))
    val tipoLabel = if (invoice.tipoComprobante == "01") "FACTURA" else "BOLETA"

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "$tipoLabel ${invoice.series}-${invoice.number}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MarrónOscuro
                    )
                }
                Text(
                    text = "S/ ${String.format("%.2f", invoice.total)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )
            }
            Text(
                text = invoice.customerName,
                style = MaterialTheme.typography.bodyMedium,
                color = TextoMedio
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = dateStr,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextoMedio
                )
                SunatStatusBadge(status = invoice.sunatStatus)
            }
        }
    }
}

@Composable
private fun SunatStatusBadge(status: String) {
    val (icon, label, color) = when (status) {
        InvoiceEntity.SunatStatus.ACEPTADO -> Triple(Icons.Filled.CheckCircle, "SUNAT OK", Color(0xFF2E7D32))
        InvoiceEntity.SunatStatus.ENVIADO -> Triple(Icons.Filled.CloudDone, "Enviado", Color(0xFF1565C0))
        InvoiceEntity.SunatStatus.RECHAZADO -> Triple(Icons.Filled.Error, "Rechazado", Color(0xFFFFA000))
        InvoiceEntity.SunatStatus.ERROR -> Triple(Icons.Filled.Error, "Error", Color(0xFFC62828))
        else -> Triple(Icons.Filled.Pending, "Pendiente", Color(0xFF757575))
    }

    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = color,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
    }
}
