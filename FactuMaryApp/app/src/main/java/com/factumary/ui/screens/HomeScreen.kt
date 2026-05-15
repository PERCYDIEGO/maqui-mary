package com.factumary.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.db.entity.ProductEntity
import com.factumary.data.remote.SupabaseClientProvider
import com.factumary.data.repository.ProductRepository
import com.factumary.ui.components.MaquiGuide
import com.factumary.ui.components.MaquiContext
import com.factumary.ui.components.MaquiMini
import com.factumary.ui.theme.Dorado
import com.factumary.ui.theme.MarrónMedio
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNewInvoice: () -> Unit,
    onInvoiceHistory: () -> Unit,
    onProductCatalog: () -> Unit,
    onSettings: () -> Unit,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val productRepo = remember { ProductRepository(FactuMaryApp.instance.database.productDao()) }
    var lowStockProducts by remember { mutableStateOf<List<ProductEntity>>(emptyList()) }
    var showMaqui by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        lowStockProducts = productRepo.getLowStock()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("FactuMary", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text("Esponjas Maqui Mary", style = MaterialTheme.typography.labelMedium, color = TextoMedio)
                    }
                },
                actions = {
                    IconButton(onClick = {
                        scope.launch {
                            SupabaseClientProvider.logout()
                            onLogout()
                        }
                    }) {
                        Icon(
                            Icons.AutoMirrored.Filled.Logout,
                            contentDescription = "Cerrar sesión",
                            tint = MarrónMedio
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MarrónOscuro
                )
            )
        },
        floatingActionButton = {
            // Botón flotante de Maqui para reabrir la guía
            if (!showMaqui) {
                MaquiMini(
                    onClick = { showMaqui = true }
                )
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "¿Qué deseas hacer?",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MarrónOscuro
                )

                // Alertas de stock bajo
                if (lowStockProducts.isNotEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f)
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "⚠️ Stock bajo",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            lowStockProducts.take(5).forEach { prod ->
                                Text(
                                    text = "• ${prod.name}: ${prod.stock} unidades",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )
                            }
                            if (lowStockProducts.size > 5) {
                                Text(
                                    text = "+ ${lowStockProducts.size - 5} productos más...",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = TextoMedio
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                MenuCard(
                    icon = Icons.Filled.AddCircle,
                    title = "Nueva Factura",
                    subtitle = "Genera una factura con productos Maqui Mary",
                    onClick = onNewInvoice,
                    accentColor = MaterialTheme.colorScheme.primary
                )

                MenuCard(
                    icon = Icons.Filled.History,
                    title = "Historial",
                    subtitle = "Revisa facturas emitidas anteriormente",
                    onClick = onInvoiceHistory,
                    accentColor = MaterialTheme.colorScheme.secondary
                )

                MenuCard(
                    icon = Icons.Filled.Inventory2,
                    title = "Catálogo",
                    subtitle = "Productos disponibles de Maqui Mary",
                    onClick = onProductCatalog,
                    accentColor = VerdeSuave
                )

                MenuCard(
                    icon = Icons.Filled.Settings,
                    title = "Configuración",
                    subtitle = "Datos de la empresa, RUC, serie",
                    onClick = onSettings,
                    accentColor = TextoMedio
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Banner de contacto
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = MaterialTheme.colorScheme.primaryContainer,
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.ShoppingCart,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "¿Venta por mayor?",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MarrónOscuro
                            )
                            Text(
                                text = "Contáctanos al +51 949 446 676",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextoMedio
                            )
                        }
                    }
                }

                // Espacio adicional para que Maqui no tape contenido
                Spacer(modifier = Modifier.height(200.dp))
            }

            // Maqui Mascota - Guía interactiva en la parte inferior
            if (showMaqui) {
                MaquiGuide(
                    context = MaquiContext.HOME,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(bottom = 16.dp, end = 16.dp),
                    onDismiss = { showMaqui = false }
                )
            }
        }
    }
}

private val VerdeSuave = Color(0xFF7BA87B)

@Composable
private fun MenuCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    accentColor: Color
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onClick() }
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = accentColor,
                modifier = Modifier.size(40.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MarrónOscuro
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextoMedio
                )
            }
        }
    }
}
