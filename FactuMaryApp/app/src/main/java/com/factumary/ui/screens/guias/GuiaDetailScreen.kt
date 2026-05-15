package com.factumary.ui.screens.guias

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.db.entity.GuiaRemisionEntity
import com.factumary.data.repository.GuiaRemisionRepository
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuiaDetailScreen(
    guiaId: Long,
    onBack: () -> Unit,
    onEdit: (Long) -> Unit
) {
    val scope = rememberCoroutineScope()
    val repo = remember { GuiaRemisionRepository(FactuMaryApp.instance.database.guiaRemisionDao()) }
    var guia by remember { mutableStateOf<GuiaRemisionEntity?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(guiaId) {
        guia = repo.getById(guiaId)
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detalle Guía de Remisión") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver")
                    }
                },
                actions = {
                    IconButton(onClick = { onEdit(guiaId) }) {
                        Icon(Icons.Filled.Edit, "Editar")
                    }
                    IconButton(onClick = {
                        scope.launch {
                            guia?.let { repo.delete(it) }
                            onBack()
                        }
                    }) {
                        Icon(Icons.Filled.Delete, "Eliminar", tint = MaterialTheme.colorScheme.error)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.padding(padding))
        } else if (guia == null) {
            Text("Guía no encontrada", modifier = Modifier.padding(padding))
        } else {
            val g = guia!!
            val dateFormat = remember { SimpleDateFormat("dd/MM/yyyy", Locale("es", "PE")) }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = g.numeroCompleto,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )
                Text(
                    text = g.estado,
                    style = MaterialTheme.typography.labelLarge,
                    color = when (g.estado) {
                        "ACEPTADO" -> androidx.compose.ui.graphics.Color(0xFF7BA87B)
                        "RECHAZADO" -> MaterialTheme.colorScheme.error
                        else -> TextoMedio
                    }
                )

                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Información General",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MarrónOscuro
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        DetailRow("Motivo", motivoLabel(g.motivoTraslado))
                        DetailRow("Fecha Emisión", dateFormat.format(Date(g.fechaEmision)))
                        DetailRow("Fecha Traslado", dateFormat.format(Date(g.fechaInicioTraslado)))
                        DetailRow("Peso", if (g.pesoTotal > 0) "${g.pesoTotal} kg" else "-")
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Destinatario",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MarrónOscuro
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        DetailRow("Nombre", g.destinatarioNombre)
                        DetailRow("DNI/RUC", g.destinatarioDniRuc)
                        DetailRow("Dirección", g.destinatarioDireccion)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Traslado",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MarrónOscuro
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        DetailRow("Punto de Partida", g.puntoPartida)
                        DetailRow("Punto de Llegada", g.puntoLlegada)
                    }
                }

                if (g.transportistaNombre.isNotBlank()) {
                    Spacer(modifier = Modifier.height(12.dp))

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.LocalShipping, null, tint = MaterialTheme.colorScheme.primary)
                                Text(
                                    text = "Transportista",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MarrónOscuro,
                                    modifier = Modifier.padding(start = 8.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            DetailRow("Conductor", g.transportistaNombre)
                            DetailRow("DNI", g.transportistaDni)
                            DetailRow("Licencia", g.transportistaLicencia)
                            DetailRow("Placa", g.transportistaPlaca)
                        }
                    }
                }

                if (g.observaciones.isNotBlank()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "Observaciones",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MarrónOscuro
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(g.observaciones, color = TextoMedio)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(modifier = Modifier.padding(vertical = 4.dp)) {
        Text(
            text = "$label: ",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MarrónOscuro,
            modifier = Modifier.width(120.dp)
        )
        Text(
            text = value.ifBlank { "-" },
            style = MaterialTheme.typography.bodyMedium,
            color = TextoMedio
        )
    }
}

private fun motivoLabel(key: String): String {
    return when (key) {
        "venta" -> "Venta"
        "compra" -> "Compra"
        "devolucion" -> "Devolución"
        "traslado_establecimientos" -> "Traslado entre establecimientos"
        "consignacion" -> "Consignación"
        "importacion" -> "Importación"
        "exportacion" -> "Exportación"
        "emisor_itinerante" -> "Emisor itinerante"
        "otros" -> "Otros"
        else -> key
    }
}
