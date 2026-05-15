package com.factumary.ui.screens.pedidos

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.factumary.data.remote.SupabaseClientProvider
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Serializable
data class PedidoDto(
    val id: Long = 0,
    val cliente_nombre: String = "",
    val total: Double = 0.0,
    val payment_method: String = "",
    val payment_evidence_url: String = "",
    val date_millis: Long = 0,
    val estado: String = "pendiente",
    val origen: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PedidosWebScreen(onBack: () -> Unit) {
    var pedidos by remember { mutableStateOf<List<PedidoDto>>(emptyList()) }
    var selectedTabIndex by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var permissionError by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val tabs = listOf("Pendientes", "Todos")

    LaunchedEffect(Unit) {
        try {
            val result = SupabaseClientProvider.client.postgrest["facturas"]
                .select(columns = "id,cliente_nombre,total,payment_method,payment_evidence_url,date_millis,estado,origen") {
                    filter {
                        or {
                            eq("origen", "web")
                            eq("payment_method", "yape")
                            eq("payment_method", "plin")
                        }
                    }
                    order("date_millis", Order.DESCENDING)
                }
                .decodeList<PedidoDto>()
            pedidos = result
        } catch (e: Exception) {
            errorMessage = "Error al cargar: ${e.message}"
        } finally {
            isLoading = false
        }
    }

    val pending = pedidos.filter { it.estado == "pendiente" }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pedidos Web") },
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
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = selectedTabIndex) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTabIndex == index,
                        onClick = { selectedTabIndex = index },
                        text = { Text(title) }
                    )
                }
            }

            when {
                isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Cargando pedidos...", color = TextoMedio)
                    }
                }
                errorMessage != null -> {
                    Box(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            errorMessage ?: "",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }
                permissionError -> {
                    PermissionErrorView(modifier = Modifier.fillMaxSize())
                }
                else -> {
                    val displayList = if (selectedTabIndex == 0) pending else pedidos

                    if (displayList.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(
                                text = if (selectedTabIndex == 0) "No hay pedidos pendientes"
                                else "No hay pedidos",
                                color = TextoMedio,
                                style = MaterialTheme.typography.bodyLarge
                            )
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize().padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(displayList, key = { it.id }) { pedido ->
                                PedidoCard(
                                    pedido = pedido,
                                    onConfirmar = {
                                        scope.launch {
                                            actualizarEstado(
                                                pedidoId = pedido.id,
                                                nuevoEstado = "confirmado",
                                                onSuccess = {
                                                    pedidos = pedidos.map {
                                                        if (it.id == pedido.id) it.copy(estado = "confirmado")
                                                        else it
                                                    }
                                                },
                                                onPermissionError = { permissionError = true },
                                                onError = { errorMessage = it }
                                            )
                                        }
                                    },
                                    onCancelar = {
                                        scope.launch {
                                            actualizarEstado(
                                                pedidoId = pedido.id,
                                                nuevoEstado = "cancelado",
                                                onSuccess = {
                                                    pedidos = pedidos.map {
                                                        if (it.id == pedido.id) it.copy(estado = "cancelado")
                                                        else it
                                                    }
                                                },
                                                onPermissionError = { permissionError = true },
                                                onError = { errorMessage = it }
                                            )
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private suspend fun actualizarEstado(
    pedidoId: Long,
    nuevoEstado: String,
    onSuccess: () -> Unit,
    onPermissionError: () -> Unit,
    onError: (String) -> Unit
) {
    try {
        SupabaseClientProvider.client.postgrest["facturas"]
            .update(buildJsonObject { put("estado", nuevoEstado) }) {
                filter { eq("id", pedidoId) }
            }
        onSuccess()
    } catch (e: Exception) {
        val msg = e.message?.lowercase() ?: ""
        if (msg.contains("permission") || msg.contains("unauthorized") ||
            msg.contains("401") || msg.contains("403") ||
            msg.contains("row level security")
        ) {
            onPermissionError()
        } else {
            onError("Error al actualizar: ${e.message}")
        }
    }
}

@Composable
private fun PedidoCard(
    pedido: PedidoDto,
    onConfirmar: () -> Unit,
    onCancelar: () -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()) }

    Card(
        modifier = Modifier.fillMaxWidth(),
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
                    "Pedido #${pedido.id}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MarrónOscuro
                )
                EstadoBadge(estado = pedido.estado)
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                pedido.cliente_nombre,
                style = MaterialTheme.typography.bodyLarge,
                color = MarrónOscuro
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "S/ %.2f".format(pedido.total),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MarrónOscuro
            )

            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Pago: ", style = MaterialTheme.typography.bodySmall, color = TextoMedio)
                Text(
                    pedido.payment_method.replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MarrónOscuro
                )
            }

            Text(
                dateFormat.format(Date(pedido.date_millis)),
                style = MaterialTheme.typography.bodySmall,
                color = TextoMedio
            )

            if (pedido.estado == "pendiente") {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = onConfirmar,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Confirmar")
                    }
                    OutlinedButton(
                        onClick = onCancelar,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFC62828)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Cancelar")
                    }
                }
            }
        }
    }
}

@Composable
private fun EstadoBadge(estado: String) {
    val (color, text) = when (estado) {
        "pendiente" -> Color(0xFFF9A825) to "Pendiente"
        "confirmado" -> Color(0xFF2E7D32) to "Confirmado"
        "cancelado" -> Color(0xFFC62828) to "Cancelado"
        else -> TextoMedio to estado
    }
    Text(
        text = text,
        color = Color.White,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .background(color, RoundedCornerShape(4.dp))
            .padding(horizontal = 8.dp, vertical = 2.dp)
    )
}

@Composable
private fun PermissionErrorView(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            "Usa la web para gestionar pedidos",
            style = MaterialTheme.typography.titleMedium,
            color = MarrónOscuro,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "La app no tiene permisos para modificar pedidos web. Ingresa a maquimary.vercel.app para gestionarlos.",
            style = MaterialTheme.typography.bodyMedium,
            color = TextoMedio
        )
    }
}
