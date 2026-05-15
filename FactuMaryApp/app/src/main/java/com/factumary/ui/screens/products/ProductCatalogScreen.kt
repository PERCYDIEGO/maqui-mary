package com.factumary.ui.screens.products

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Circle
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.repository.ProductRepository
import com.factumary.ui.components.MaquiContext
import com.factumary.ui.components.MaquiGuide
import com.factumary.ui.components.MaquiMini
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductCatalogScreen(onBack: () -> Unit) {
    val repo = remember { ProductRepository(FactuMaryApp.instance.database.productDao()) }
    val products by repo.getAllActive().collectAsState(initial = emptyList())
    val grouped = products.groupBy { it.category }
    var showMaqui by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Catálogo Maqui Mary") },
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
            if (!showMaqui) {
                MaquiMini(onClick = { showMaqui = true })
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            grouped.forEach { (category, categoryProducts) ->
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = category,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }
                items(categoryProducts) { product ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Filled.Circle,
                                contentDescription = null,
                                tint = colorFromName(product.colorInfo),
                                modifier = Modifier
                                    .padding(end = 12.dp)
                                    .width(24.dp)
                                    .height(24.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = product.name,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Medium,
                                    color = MarrónOscuro
                                )
                                if (product.description.isNotBlank()) {
                                    Text(
                                        text = product.description,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextoMedio
                                    )
                                }
                            }
                            Text(
                                text = "S/ ${String.format("%.2f", product.price)}",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MarrónOscuro
                            )
                        }
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(200.dp)) } // Espacio para Maqui
        }

        // Maqui Mascota - Guía interactiva
        if (showMaqui) {
            MaquiGuide(
                context = MaquiContext.PRODUCT_CATALOG,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(bottom = 16.dp, end = 16.dp),
                onDismiss = { showMaqui = false }
            )
        }
        }
    }
}

private fun colorFromName(name: String): Color = when (name.lowercase()) {
    "amarillo" -> Color(0xFFFFD700)
    "verde" -> Color(0xFF4CAF50)
    "rojo" -> Color(0xFFE53935)
    "azul" -> Color(0xFF2196F3)
    "celeste" -> Color(0xFF87CEEB)
    "naranja" -> Color(0xFFFF9800)
    "rosado" -> Color(0xFFE91E8C)
    "blanco" -> Color(0xFFF5F5F5)
    "morado" -> Color(0xFF9C27B0)
    "gris" -> Color(0xFF9E9E9E)
    "variado" -> Color(0xFF6B4E3A)
    else -> Color(0xFF6B4E3A)
}
