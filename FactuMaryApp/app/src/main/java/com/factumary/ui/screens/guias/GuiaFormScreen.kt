package com.factumary.ui.screens.guias

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import com.factumary.data.db.entity.TransportistaEntity
import com.factumary.data.repository.GuiaRemisionRepository
import com.factumary.ui.components.TransportistaPicker
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import kotlinx.coroutines.launch

private val motivos = listOf(
    "venta" to "Venta",
    "compra" to "Compra",
    "devolucion" to "Devolución",
    "traslado_establecimientos" to "Traslado entre establecimientos",
    "consignacion" to "Consignación",
    "importacion" to "Importación",
    "exportacion" to "Exportación",
    "emisor_itinerante" to "Emisor itinerante",
    "otros" to "Otros"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuiaFormScreen(
    guiaId: Long?,
    onBack: () -> Unit,
    onSaved: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val repo = remember { GuiaRemisionRepository(FactuMaryApp.instance.database.guiaRemisionDao()) }
    var series by remember { mutableStateOf("G001") }
    var number by remember { mutableStateOf(0L) }
    var fechaInicioTraslado by remember { mutableStateOf(System.currentTimeMillis()) }
    var motivoTraslado by remember { mutableStateOf("venta") }
    var destinatarioNombre by remember { mutableStateOf("") }
    var destinatarioDniRuc by remember { mutableStateOf("") }
    var destinatarioDireccion by remember { mutableStateOf("") }
    var puntoLlegada by remember { mutableStateOf("") }
    var pesoTotal by remember { mutableStateOf("") }
    var transportistaId by remember { mutableStateOf<Long?>(null) }
    var transportistaNombre by remember { mutableStateOf("") }
    var transportistaDni by remember { mutableStateOf("") }
    var transportistaLicencia by remember { mutableStateOf("") }
    var transportistaPlaca by remember { mutableStateOf("") }
    var observaciones by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }
    var showTransportistaPicker by remember { mutableStateOf(false) }
    var motivoExpanded by remember { mutableStateOf(false) }

    val isEditing = guiaId != null

    LaunchedEffect(guiaId) {
        if (guiaId != null) {
            isLoading = true
            repo.getById(guiaId)?.let { g ->
                series = g.series
                number = g.number
                fechaInicioTraslado = g.fechaInicioTraslado
                motivoTraslado = g.motivoTraslado
                destinatarioNombre = g.destinatarioNombre
                destinatarioDniRuc = g.destinatarioDniRuc
                destinatarioDireccion = g.destinatarioDireccion
                puntoLlegada = g.puntoLlegada
                pesoTotal = if (g.pesoTotal > 0) g.pesoTotal.toString() else ""
                transportistaId = g.transportistaId
                transportistaNombre = g.transportistaNombre
                transportistaDni = g.transportistaDni
                transportistaLicencia = g.transportistaLicencia
                transportistaPlaca = g.transportistaPlaca
                observaciones = g.observaciones
            }
            isLoading = false
        } else {
            val lastNum = repo.getLastNumber(series)
            number = lastNum + 1
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isEditing) "Editar Guía" else "Nueva Guía de Remisión") },
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
        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.padding(padding))
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    text = "Guía $series-${"%03d".format(number)}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Motivo de traslado
                ExposedDropdownMenuBox(
                    expanded = motivoExpanded,
                    onExpandedChange = { motivoExpanded = it }
                ) {
                    OutlinedTextField(
                        value = motivos.find { it.first == motivoTraslado }?.second ?: motivoTraslado,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Motivo de Traslado") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = motivoExpanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = motivoExpanded,
                        onDismissRequest = { motivoExpanded = false }
                    ) {
                        motivos.forEach { (key, label) ->
                            DropdownMenuItem(
                                text = { Text(label) },
                                onClick = {
                                    motivoTraslado = key
                                    motivoExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Destinatario
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "Destinatario",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MarrónOscuro
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = destinatarioNombre,
                            onValueChange = { destinatarioNombre = it },
                            label = { Text("Nombre o Razón Social") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = destinatarioDniRuc,
                                onValueChange = { if (it.length <= 11) destinatarioDniRuc = it },
                                label = { Text("DNI / RUC") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = destinatarioDireccion,
                            onValueChange = { destinatarioDireccion = it },
                            label = { Text("Dirección") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Puntos de traslado
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "Puntos de Traslado",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MarrónOscuro
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = "PRO. QUINTA AVENIDA MZA. J LOTE. 17-B - LURIGANCHO",
                            onValueChange = {},
                            label = { Text("Punto de Partida") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            enabled = false,
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = puntoLlegada,
                            onValueChange = { puntoLlegada = it },
                            label = { Text("Punto de Llegada") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = pesoTotal,
                            onValueChange = { if (it.all { c -> c.isDigit() || c == '.' }) pesoTotal = it },
                            label = { Text("Peso Total (kg)") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Transportista
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "Transportista",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MarrónOscuro
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        if (transportistaNombre.isNotBlank()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Filled.LocalShipping, null, tint = MaterialTheme.colorScheme.primary)
                                Spacer(modifier = Modifier.width(8.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = transportistaNombre,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = "DNI: $transportistaDni | Placa: $transportistaPlaca",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextoMedio
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                        }

                        OutlinedButton(
                            onClick = { showTransportistaPicker = true },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Filled.LocalShipping, contentDescription = null)
                            Text(
                                if (transportistaNombre.isNotBlank()) "Cambiar Transportista"
                                else "Seleccionar Transportista",
                                modifier = Modifier.padding(start = 8.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Observaciones
                OutlinedTextField(
                    value = observaciones,
                    onValueChange = { observaciones = it },
                    label = { Text("Observaciones") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    maxLines = 3
                )

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        scope.launch {
                            isSaving = true
                            val entity = GuiaRemisionEntity(
                                id = guiaId ?: 0,
                                series = series,
                                number = number,
                                motivoTraslado = motivoTraslado,
                                destinatarioNombre = destinatarioNombre,
                                destinatarioDniRuc = destinatarioDniRuc,
                                destinatarioDireccion = destinatarioDireccion,
                                puntoLlegada = puntoLlegada,
                                pesoTotal = pesoTotal.toDoubleOrNull() ?: 0.0,
                                transportistaId = transportistaId,
                                transportistaNombre = transportistaNombre,
                                transportistaDni = transportistaDni,
                                transportistaLicencia = transportistaLicencia,
                                transportistaPlaca = transportistaPlaca,
                                observaciones = observaciones
                            )
                            if (isEditing) repo.update(entity)
                            else repo.save(entity)
                            isSaving = false
                            onSaved()
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    enabled = isSaving.not() && destinatarioNombre.isNotBlank()
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.height(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(Icons.Filled.Save, contentDescription = null)
                        Text("Guardar Guía", modifier = Modifier.padding(start = 8.dp))
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }

    if (showTransportistaPicker) {
        TransportistaPicker(
            onTransportistaSelected = { t: TransportistaEntity ->
                transportistaId = t.id
                transportistaNombre = t.nombreCompleto
                transportistaDni = t.dni
                transportistaLicencia = t.licenciaConducir
                transportistaPlaca = t.numeroPlaca
                showTransportistaPicker = false
            },
            onDismiss = { showTransportistaPicker = false },
            onNewTransportista = {
                showTransportistaPicker = false
            }
        )
    }
}
