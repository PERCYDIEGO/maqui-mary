package com.factumary.ui.screens.invoice

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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.factumary.data.db.entity.ProductEntity
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio

@Composable
fun SelectProductDialog(
    products: List<ProductEntity>,
    onDismiss: () -> Unit,
    onProductSelected: (ProductEntity) -> Unit
) {
    val grouped = products.groupBy { it.category }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Seleccionar Producto", color = MarrónOscuro, style = MaterialTheme.typography.titleLarge)
        },
        text = {
            LazyColumn {
                grouped.forEach { (category, categoryProducts) ->
                    item {
                        Text(
                            text = category,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }
                    items(categoryProducts) { product ->
                        val outOfStock = product.stock <= 0
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable(enabled = !outOfStock) { onProductSelected(product) }
                                .padding(vertical = 10.dp, horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = product.name,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium,
                                    color = if (outOfStock) TextoMedio else MaterialTheme.colorScheme.onSurface
                                )
                                if (product.description.isNotBlank()) {
                                    Text(
                                        text = product.description,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextoMedio
                                    )
                                }
                                Text(
                                    text = if (outOfStock) "Sin stock" else "Stock: ${product.stock} unidades",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (outOfStock) MaterialTheme.colorScheme.error
                                            else if (product.stock < 50) androidx.compose.ui.graphics.Color(0xFFFFA000)
                                            else androidx.compose.ui.graphics.Color(0xFF2E7D32),
                                    fontWeight = if (outOfStock) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                            Text(
                                text = "S/ ${String.format("%.2f", product.price)}",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = if (outOfStock) TextoMedio else MarrónOscuro
                            )
                        }
                        HorizontalDivider()
                    }
                    item { Spacer(modifier = Modifier.height(8.dp)) }
                }
            }
        },
        confirmButton = {}
    )
}
