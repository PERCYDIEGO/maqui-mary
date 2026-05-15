package com.factumary.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.db.entity.TransportistaEntity
import com.factumary.data.repository.TransportistaRepository
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransportistaPicker(
    onTransportistaSelected: (TransportistaEntity) -> Unit,
    onDismiss: () -> Unit,
    onNewTransportista: () -> Unit
) {
    val repo = remember { TransportistaRepository(FactuMaryApp.instance.database.transportistaDao()) }
    val transportistas by repo.getActivos().collectAsState(initial = emptyList())
    var searchQuery by remember { mutableStateOf("") }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val filtered = if (searchQuery.isBlank()) transportistas
    else transportistas.filter {
        it.nombreCompleto.contains(searchQuery, ignoreCase = true) ||
        it.dni.contains(searchQuery, ignoreCase = true) ||
        it.numeroPlaca.contains(searchQuery, ignoreCase = true)
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp)
        ) {
            Text(
                text = "Seleccionar Transportista",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MarrónOscuro
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Buscar transportista...") },
                leadingIcon = { Icon(Icons.Filled.LocalShipping, null) },
                trailingIcon = {
                    if (searchQuery.isNotBlank()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Filled.Close, "Limpiar")
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (filtered.isEmpty()) {
                Text(
                    text = if (searchQuery.isNotBlank()) "Sin resultados"
                    else "No hay transportistas activos",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextoMedio,
                    modifier = Modifier.padding(vertical = 16.dp)
                )
            } else {
                LazyColumn(
                    modifier = Modifier.height(300.dp)
                ) {
                    items(filtered) { transportista ->
                        TransportistaPickerItem(
                            transportista = transportista,
                            onClick = { onTransportistaSelected(transportista) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedButton(
                onClick = onNewTransportista,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Filled.Add, contentDescription = null)
                Text("Nuevo Transportista", modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun TransportistaPickerItem(
    transportista: TransportistaEntity,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 4.dp),
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
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = transportista.nombreCompleto,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MarrónOscuro
                )
                Text(
                    text = "DNI: ${transportista.dni} | Lic: ${transportista.licenciaConducir}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextoMedio
                )
                Text(
                    text = "Placa: ${transportista.numeroPlaca}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextoMedio
                )
            }
        }
    }
}
