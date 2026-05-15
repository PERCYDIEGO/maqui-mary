package com.factumary.ui.screens.documentos

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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.db.entity.GuiaRemisionEntity
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.repository.GuiaRemisionRepository
import com.factumary.data.repository.InvoiceRepositoryAprobacion
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentosScreen(
    onBack: () -> Unit,
    onNavigateToForm: (tipo: String, id: Long?) -> Unit
) {
    val scope = rememberCoroutineScope()
    val invoiceRepo = remember {
        InvoiceRepositoryAprobacion(FactuMaryApp.instance.database.invoiceDao())
    }
    val guiaRepo = remember {
        GuiaRemisionRepository(FactuMaryApp.instance.database.guiaRemisionDao())
    }
    val allInvoices by invoiceRepo.getAll().collectAsState(initial = emptyList())
    val allGuias by guiaRepo.getAll().collectAsState(initial = emptyList())

    var selectedTab by remember { mutableStateOf(0) }
    var showMenu by remember { mutableStateOf(false) }

    val dateFormat = remember { SimpleDateFormat("dd/MM/yyyy", Locale("es", "PE")) }
    val tabs = listOf("Boletas", "Facturas", "Guías")

    val boletas = remember(allInvoices) { allInvoices.filter { it.tipoComprobante == "03" } }
    val facturas = remember(allInvoices) { allInvoices.filter { it.tipoComprobante == "01" } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Documentos") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        floatingActionButton = {
            Box {
                FloatingActionButton(
                    onClick = { showMenu = true },
                    containerColor = MaterialTheme.colorScheme.primary
                ) {
                    Icon(
                        Icons.Filled.Add,
                        contentDescription = "Nuevo documento",
                        tint = MaterialTheme.colorScheme.onPrimary
                    )
                }
                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Boleta") },
                        onClick = {
                            showMenu = false
                            onNavigateToForm("boleta", null)
                        },
                        leadingIcon = {
                            Icon(Icons.Filled.Receipt, contentDescription = null)
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("Factura") },
                        onClick = {
                            showMenu = false
                            onNavigateToForm("factura", null)
                        },
                        leadingIcon = {
                            Icon(Icons.Filled.Receipt, contentDescription = null)
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("Guía de Remisión") },
                        onClick = {
                            showMenu = false
                            onNavigateToForm("guia", null)
                        },
                        leadingIcon = {
                            Icon(Icons.Filled.LocalShipping, contentDescription = null)
                        }
                    )
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) }
                    )
                }
            }

            when (selectedTab) {
                0 -> InvoiceTabContent(
                    items = boletas,
                    dateFormat = dateFormat,
                    onItemClick = { onNavigateToForm("boleta", it.id) }
                )
                1 -> InvoiceTabContent(
                    items = facturas,
                    dateFormat = dateFormat,
                    onItemClick = { onNavigateToForm("factura", it.id) }
                )
                2 -> GuiaTabContent(
                    items = allGuias,
                    dateFormat = dateFormat,
                    onItemClick = { onNavigateToForm("guia", it.id) }
                )
            }
        }
    }
}

@Composable
private fun InvoiceTabContent(
    items: List<InvoiceEntity>,
    dateFormat: SimpleDateFormat,
    onItemClick: (InvoiceEntity) -> Unit
) {
    if (items.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "No hay documentos de este tipo",
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
            items(items, key = { it.id }) { invoice ->
                InvoiceDocumentCard(
                    invoice = invoice,
                    dateFormat = dateFormat,
                    onClick = { onItemClick(invoice) }
                )
            }
        }
    }
}

@Composable
private fun GuiaTabContent(
    items: List<GuiaRemisionEntity>,
    dateFormat: SimpleDateFormat,
    onItemClick: (GuiaRemisionEntity) -> Unit
) {
    if (items.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "No hay documentos de este tipo",
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
            items(items, key = { it.id }) { guia ->
                GuiaDocumentCard(
                    guia = guia,
                    dateFormat = dateFormat,
                    onClick = { onItemClick(guia) }
                )
            }
        }
    }
}

@Composable
private fun InvoiceDocumentCard(
    invoice: InvoiceEntity,
    dateFormat: SimpleDateFormat,
    onClick: () -> Unit
) {
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
                    text = "${invoice.series}-${invoice.number}",
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
                    text = dateFormat.format(Date(invoice.dateMillis)),
                    style = MaterialTheme.typography.bodySmall,
                    color = TextoMedio
                )
                StatusBadge(status = invoice.sunatStatus)
            }
        }
    }
}

@Composable
private fun GuiaDocumentCard(
    guia: GuiaRemisionEntity,
    dateFormat: SimpleDateFormat,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
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
                        text = dateFormat.format(Date(guia.fechaEmision)),
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Peso: ${guia.pesoTotal} kg",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextoMedio
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        StatusBadge(status = guia.estado)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusBadge(status: String) {
    val color = when (status) {
        "ACEPTADO" -> Color(0xFF7BA87B)
        "RECHAZADO" -> MaterialTheme.colorScheme.error
        else -> TextoMedio
    }
    Text(
        text = status,
        style = MaterialTheme.typography.labelSmall,
        color = color,
        fontWeight = FontWeight.Medium
    )
}
