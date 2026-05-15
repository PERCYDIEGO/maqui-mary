package com.factumary.ui.screens.transportistas

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
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
import com.factumary.data.db.entity.TransportistaEntity
import com.factumary.data.repository.TransportistaRepository
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import com.factumary.ui.theme.VerdeSuave
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransportistaDetailScreen(
    transportistaId: Long,
    onBack: () -> Unit,
    onEdit: (Long) -> Unit
) {
    val scope = rememberCoroutineScope()
    val repo = remember { TransportistaRepository(FactuMaryApp.instance.database.transportistaDao()) }
    var transportista by remember { mutableStateOf<TransportistaEntity?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(transportistaId) {
        transportista = repo.getById(transportistaId)
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detalle Transportista") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver")
                    }
                },
                actions = {
                    IconButton(onClick = { onEdit(transportistaId) }) {
                        Icon(Icons.Filled.Edit, "Editar")
                    }
                    IconButton(onClick = {
                        scope.launch {
                            transportista?.let { repo.delete(it) }
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
        } else if (transportista == null) {
            Text(
                text = "Transportista no encontrado",
                modifier = Modifier.padding(padding)
            )
        } else {
            val t = transportista!!
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp)
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Icon(
                            Icons.Filled.LocalShipping,
                            contentDescription = null,
                            tint = if (t.activo) MaterialTheme.colorScheme.primary else TextoMedio,
                            modifier = Modifier.align(Alignment.CenterHorizontally)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = t.nombreCompleto,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MarrónOscuro
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        InfoRow("DNI", t.dni)
                        InfoRow("Licencia", t.licenciaConducir)
                        InfoRow("Placa", t.numeroPlaca)
                        InfoRow("Estado", if (t.activo) "Activo" else "Inactivo")
                    }
                }
            }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(modifier = Modifier.padding(vertical = 4.dp)) {
        Text(
            text = "$label: ",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MarrónOscuro
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = TextoMedio
        )
    }
}

private val VerdeSuave = androidx.compose.ui.graphics.Color(0xFF7BA87B)
