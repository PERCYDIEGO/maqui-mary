package com.factumary.ui.screens.transportistas

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.db.entity.TransportistaEntity
import com.factumary.data.repository.TransportistaRepository
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import com.factumary.ui.theme.VerdeSuave
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransportistaListScreen(
    onBack: () -> Unit,
    onNavigateToForm: (Long?) -> Unit
) {
    val scope = rememberCoroutineScope()
    val repo = remember { TransportistaRepository(FactuMaryApp.instance.database.transportistaDao()) }
    val transportistas by repo.getAll().collectAsState(initial = emptyList())
    var searchQuery by remember { mutableStateOf("") }

    val filtered = if (searchQuery.isBlank()) transportistas
    else transportistas.filter {
        it.nombreCompleto.contains(searchQuery, ignoreCase = true) ||
        it.dni.contains(searchQuery, ignoreCase = true) ||
        it.numeroPlaca.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Transportistas") },
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
            FloatingActionButton(
                onClick = { onNavigateToForm(null) },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Filled.Add, "Nuevo transportista", tint = MaterialTheme.colorScheme.onPrimary)
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Buscar transportista...") },
                leadingIcon = { Icon(Icons.Filled.Search, null) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (filtered.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (searchQuery.isNotBlank()) "Sin resultados"
                        else "Agrega tu primer transportista",
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextoMedio,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filtered) { transportista ->
                        TransportistaCard(
                            transportista = transportista,
                            onClick = { onNavigateToForm(transportista.id) },
                            onDelete = {
                                scope.launch { repo.delete(transportista) }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TransportistaCard(
    transportista: TransportistaEntity,
    onClick: () -> Unit,
    onDelete: () -> Unit
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
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .then(
                        if (transportista.activo) Modifier
                        else Modifier
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Filled.LocalShipping,
                    contentDescription = null,
                    tint = if (transportista.activo) MaterialTheme.colorScheme.primary
                    else TextoClaro,
                    modifier = Modifier.size(28.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = transportista.nombreCompleto,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = if (transportista.activo) MarrónOscuro else TextoMedio
                )
                Text(
                    text = "DNI: ${transportista.dni}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextoMedio
                )
                Text(
                    text = "Placa: ${transportista.numeroPlaca}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextoMedio
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                if (transportista.activo) {
                    Icon(
                        Icons.Filled.CheckCircle,
                        contentDescription = "Activo",
                        tint = VerdeSuave,
                        modifier = Modifier.size(20.dp)
                    )
                }
                IconButton(onClick = onDelete) {
                    Icon(
                        Icons.Filled.Delete,
                        contentDescription = "Eliminar",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

private val TextoClaro = androidx.compose.ui.graphics.Color(0xFFA09286)
private val VerdeSuave = androidx.compose.ui.graphics.Color(0xFF7BA87B)
