package com.factumary.ui.screens.sunat

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Pending
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.db.entity.GuiaRemisionEntity
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.repository.GuiaRemisionRepository
import com.factumary.data.repository.InvoiceRepositoryAprobacion
import com.factumary.data.sunat.EmitItem
import com.factumary.data.sunat.EmitRequest
import com.factumary.data.sunat.SunatApiService
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

fun getStatusLabel(status: String): String = when (status) {
    "PENDIENTE" -> "Pendiente"
    "ENVIADO" -> "Enviado"
    "ACEPTADO" -> "Aceptado"
    "RECHAZADO" -> "Rechazado"
    "ERROR" -> "Error"
    else -> status
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SunatScreen(
    onBack: () -> Unit,
    onNavigateToDetail: (Long) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val sunatService = remember { SunatApiService() }
    val invoiceRepo = remember {
        InvoiceRepositoryAprobacion(FactuMaryApp.instance.database.invoiceDao())
    }
    val guiaRepo = remember {
        GuiaRemisionRepository(FactuMaryApp.instance.database.guiaRemisionDao())
    }
    val allInvoices by invoiceRepo.getAll().collectAsState(initial = emptyList())
    val allGuias by guiaRepo.getAll().collectAsState(initial = emptyList())
    val dao = remember { FactuMaryApp.instance.database.invoiceDao() }

    var selectedTab by remember { mutableStateOf(0) }

    val pendingInvoices = remember(allInvoices) {
        allInvoices.filter { it.sunatStatus in listOf(
            InvoiceEntity.SunatStatus.PENDIENTE,
            InvoiceEntity.SunatStatus.ERROR,
            InvoiceEntity.SunatStatus.RECHAZADO
        ) }
    }
    val sentInvoices = remember(allInvoices) {
        allInvoices.filter { it.sunatStatus in listOf(
            InvoiceEntity.SunatStatus.ENVIADO,
            InvoiceEntity.SunatStatus.ACEPTADO
        ) }
    }
    val pendingGuias = remember(allGuias) {
        allGuias.filter { it.estado == "PENDIENTE" || it.estado == "ERROR" }
    }

    fun enviarASunat(invoice: InvoiceEntity) {
        scope.launch {
            try {
                val items = dao.getItemsByInvoiceId(invoice.id)
                val request = EmitRequest(
                    cliente_id = invoice.customerId,
                    cliente_nombre = invoice.customerName,
                    cliente_ruc = invoice.customerRuc,
                    cliente_tipo_doc = invoice.customerTipoDoc,
                    cliente_direccion = invoice.customerAddress,
                    tipo_comprobante = invoice.tipoComprobante,
                    items = items.map { item ->
                        EmitItem(
                            producto_id = item.productId,
                            description = item.description,
                            quantity = item.quantity,
                            unit_price = item.unitPrice
                        )
                    },
                    notes = invoice.notes
                )
                val result = sunatService.emitir(request)
                result.fold(
                    onSuccess = {
                        dao.updateSunatStatus(
                            id = invoice.id,
                            status = InvoiceEntity.SunatStatus.ENVIADO,
                            timestamp = System.currentTimeMillis()
                        )
                        Toast.makeText(context, "Enviado a SUNAT correctamente", Toast.LENGTH_SHORT).show()
                    },
                    onFailure = { error ->
                        dao.updateSunatStatus(
                            id = invoice.id,
                            status = InvoiceEntity.SunatStatus.ERROR,
                            error = error.message ?: "Error desconocido",
                            timestamp = System.currentTimeMillis()
                        )
                        Toast.makeText(context, "Error: ${error.message}", Toast.LENGTH_LONG).show()
                    }
                )
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SUNAT") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Pendientes") }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Enviados") }
                )
            }

            when (selectedTab) {
                0 -> PendingTab(
                    invoices = pendingInvoices,
                    guias = pendingGuias,
                    onNavigateToDetail = onNavigateToDetail,
                    onEnviar = ::enviarASunat
                )
                1 -> SentTab(
                    invoices = sentInvoices,
                    onNavigateToDetail = onNavigateToDetail
                )
            }
        }
    }
}

@Composable
private fun PendingTab(
    invoices: List<InvoiceEntity>,
    guias: List<GuiaRemisionEntity>,
    onNavigateToDetail: (Long) -> Unit,
    onEnviar: (InvoiceEntity) -> Unit
) {
    if (invoices.isEmpty() && guias.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "No hay documentos pendientes",
                style = MaterialTheme.typography.bodyLarge,
                color = TextoMedio,
                textAlign = TextAlign.Center
            )
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(invoices, key = { "inv_${it.id}" }) { invoice ->
                PendingInvoiceCard(
                    invoice = invoice,
                    onClick = { onNavigateToDetail(invoice.id) },
                    onEnviar = { onEnviar(invoice) }
                )
            }
            items(guias, key = { "guia_${it.id}" }) { guia ->
                GuiaPendingCard(guia = guia)
            }
        }
    }
}

@Composable
private fun SentTab(
    invoices: List<InvoiceEntity>,
    onNavigateToDetail: (Long) -> Unit
) {
    if (invoices.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "No hay documentos enviados",
                style = MaterialTheme.typography.bodyLarge,
                color = TextoMedio,
                textAlign = TextAlign.Center
            )
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(invoices, key = { it.id }) { invoice ->
                SentInvoiceCard(
                    invoice = invoice,
                    onClick = { onNavigateToDetail(invoice.id) }
                )
            }
        }
    }
}

@Composable
private fun PendingInvoiceCard(
    invoice: InvoiceEntity,
    onClick: () -> Unit,
    onEnviar: () -> Unit
) {
    val dateStr = remember(invoice.dateMillis) {
        SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(Date(invoice.dateMillis))
    }
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
                Text(
                    text = "$tipoLabel ${invoice.series}-${invoice.number}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )
                Text(
                    text = "S/ ${String.format("%.2f", invoice.total)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = invoice.customerName,
                style = MaterialTheme.typography.bodyMedium,
                color = TextoMedio
            )
            Spacer(modifier = Modifier.height(4.dp))
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
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = onEnviar,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MarrónOscuro
                )
            ) {
                Icon(
                    Icons.Filled.Send,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Enviar a SUNAT")
            }
        }
    }
}

@Composable
private fun SentInvoiceCard(
    invoice: InvoiceEntity,
    onClick: () -> Unit
) {
    val dateStr = remember(invoice.dateMillis) {
        SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(Date(invoice.dateMillis))
    }
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
                Text(
                    text = "$tipoLabel ${invoice.series}-${invoice.number}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )
                Text(
                    text = "S/ ${String.format("%.2f", invoice.total)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = invoice.customerName,
                style = MaterialTheme.typography.bodyMedium,
                color = TextoMedio
            )
            Spacer(modifier = Modifier.height(4.dp))
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
private fun GuiaPendingCard(guia: GuiaRemisionEntity) {
    val dateStr = remember(guia.fechaEmision) {
        SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(Date(guia.fechaEmision))
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Filled.LocalShipping,
                contentDescription = null,
                tint = Color(0xFF4F46E5),
                modifier = Modifier.size(36.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = guia.numeroCompleto,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MarrónOscuro
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = guia.destinatarioNombre.ifBlank { "Sin destinatario" },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextoMedio
                )
                Spacer(modifier = Modifier.height(4.dp))
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
                    Text(
                        text = getStatusLabel(guia.estado),
                        style = MaterialTheme.typography.labelSmall,
                        color = TextoMedio,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun SunatStatusBadge(status: String) {
    val (icon, label, color) = when (status) {
        InvoiceEntity.SunatStatus.ACEPTADO -> Triple(
            Icons.Filled.CheckCircle, "Aceptado", Color(0xFF2E7D32)
        )
        InvoiceEntity.SunatStatus.ENVIADO -> Triple(
            Icons.Filled.CloudDone, "Enviado", Color(0xFF1565C0)
        )
        InvoiceEntity.SunatStatus.RECHAZADO -> Triple(
            Icons.Filled.Error, "Rechazado", Color(0xFFFFA000)
        )
        InvoiceEntity.SunatStatus.ERROR -> Triple(
            Icons.Filled.Error, "Error", Color(0xFFC62828)
        )
        else -> Triple(
            Icons.Filled.Pending, "Pendiente", Color(0xFF757575)
        )
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
