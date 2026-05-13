package com.factumary.ui.screens.invoice

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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.db.entity.CustomerEntity
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.db.entity.InvoiceItemEntity
import com.factumary.data.db.entity.ProductEntity
import com.factumary.data.repository.CustomerRepository
import com.factumary.data.repository.InvoiceRepositoryAprobacion
import com.factumary.data.repository.ProductRepository
import com.factumary.data.repository.ProductRepositorySync
import com.factumary.data.sunat.SunatApiService
import com.factumary.pdf.PdfGenerator
import com.factumary.ui.components.MaquiContext
import com.factumary.ui.components.MaquiGuide
import com.factumary.ui.components.MaquiMini
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class LineItem(
    val productId: Long? = null,
    var description: String = "",
    var quantity: Int = 1,
    var unitPrice: Double = 0.0,
    var stockAvailable: Int = 0
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateInvoiceScreen(
    customerId: Long,
    onBack: () -> Unit,
    onInvoiceCreated: (Long) -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    val sunatService = remember { SunatApiService() }
    val invoiceRepo = remember { InvoiceRepository(
        FactuMaryApp.instance.database.invoiceDao(),
        FactuMaryApp.instance.database.productDao(),
        sunatService
    ) }
    val customerRepo = remember { CustomerRepository(FactuMaryApp.instance.database.customerDao()) }
    val productRepo = remember { ProductRepositorySync(FactuMaryApp.instance.database.productDao()) }
    val invoiceRepoAprobacion = remember { InvoiceRepositoryAprobacion(FactuMaryApp.instance.database.invoiceDao()) }

    var customer by remember { mutableStateOf<CustomerEntity?>(null) }
    val items = remember { mutableStateListOf<LineItem>() }
    var notes by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var showProductDialog by remember { mutableStateOf(false) }
    var nextInvoiceNumber by remember { mutableStateOf(1L) }
    val products by productRepo.getAllActive().collectAsState(initial = emptyList())
    var showMaqui by remember { mutableStateOf(true) }
    
    // Para generación de PDF y compartir
    var pdfGenerado by remember { mutableStateOf<java.io.File?>(null) }
    var showPdfShareDialog by remember { mutableStateOf(false) }

    // Tipo de comprobante: 0=Factura, 1=Boleta
    var tipoComprobanteIndex by remember { mutableIntStateOf(0) }
    val isFactura = tipoComprobanteIndex == 0
    val series = if (isFactura) "F001" else "B001"
    val tipoComprobante = if (isFactura) "01" else "03"

    // Boleta sin identificar
    var sinIdentificar by remember { mutableStateOf(false) }

    LaunchedEffect(customerId, series) {
        if (!sinIdentificar) {
            customer = customerRepo.getById(customerId)
        }
        val nextNum = invoiceRepo.getNextNumber(series)
        nextInvoiceNumber = nextNum
        
        // Sincronizar productos desde Supabase
        scope.launch {
            try {
                productRepo.syncFromSupabase()
            } catch (_: Exception) {
                // Si falla, usamos productos locales
            }
        }
    }

    val subtotal = items.sumOf { it.quantity * it.unitPrice }
    val igv = subtotal * 0.18
    val total = subtotal + igv

    // Validación: no vender más del stock disponible
    val stockErrors = items.filter { it.quantity > it.stockAvailable }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isFactura) "Nueva Factura" else "Nueva Boleta") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Volver")
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
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
            // Selector Factura / Boleta
            item {
                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                    SegmentedButton(
                        shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
                        onClick = { tipoComprobanteIndex = 0; sinIdentificar = false },
                        selected = tipoComprobanteIndex == 0
                    ) { Text("Factura") }
                    SegmentedButton(
                        shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
                        onClick = { tipoComprobanteIndex = 1 },
                        selected = tipoComprobanteIndex == 1
                    ) { Text("Boleta") }
                }
            }

            // Boleta sin identificar
            if (!isFactura) {
                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Checkbox(
                            checked = sinIdentificar,
                            onCheckedChange = {
                                sinIdentificar = it
                                if (it) customer = null
                            }
                        )
                        Text(
                            "Boleta sin identificar (público en general)",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            // Cliente
            item {
                if (sinIdentificar && !isFactura) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Cliente", style = MaterialTheme.typography.labelMedium, color = TextoMedio)
                            Text("CLIENTES VARIOS", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text("Sin identificar", style = MaterialTheme.typography.bodyMedium, color = TextoMedio)
                        }
                    }
                } else {
                    customer?.let { c ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer
                            )
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Cliente", style = MaterialTheme.typography.labelMedium, color = TextoMedio)
                                Text(c.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                if (c.numDocumento.isNotBlank()) Text(
                                    "${if (c.tipoDocumento == "6") "RUC" else "DNI"}: ${c.numDocumento}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextoMedio
                                )
                            }
                        }
                    }
                }
            }

            // Número de comprobante
            item {
                Text(
                    text = "${if (isFactura) "Factura" else "Boleta"} N° $series-$nextInvoiceNumber",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )
                Text(
                    text = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(Date()),
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextoMedio
                )
            }

            item {
                HorizontalDivider()
            }

            // Productos
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Productos",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    OutlinedButton(
                        onClick = { showProductDialog = true },
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Filled.Add, null, modifier = Modifier.padding(end = 4.dp))
                        Text("Agregar")
                    }
                }
            }

            items(items) { item ->
                val index = items.indexOf(item)
                ProductLineCard(
                    item = item,
                    onUpdate = { updated ->
                        items[index] = updated
                    },
                    onDelete = { items.removeAt(index) }
                )
            }

            if (items.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        )
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Filled.ShoppingCart,
                                contentDescription = null,
                                tint = TextoMedio,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                            Text(
                                "Presiona \"Agregar\" para añadir productos",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextoMedio
                            )
                        }
                    }
                }
            }

            // Alertas de stock
            if (stockErrors.isNotEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                "Stock insuficiente:",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.error,
                                fontWeight = FontWeight.Bold
                            )
                            stockErrors.forEach {
                                Text(
                                    "• ${it.description}: pides ${it.quantity}, hay ${it.stockAvailable}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    }
                }
            }

            // Notas
            item {
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notas (opcional)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    minLines = 2
                )
            }

            item {
                HorizontalDivider()
            }

            // Totales
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        TotalRow("Subtotal", subtotal)
                        TotalRow("IGV (18%)", igv)
                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                        TotalRow("TOTAL", total, bold = true)
                    }
                }
            }

            // Botón guardar
            item {
                val canSave = items.isNotEmpty() && stockErrors.isEmpty() &&
                        (isFactura || sinIdentificar || customer != null)
                Button(
                    onClick = {
                        if (canSave) {
                            saving = true
                            scope.launch {
                                // Crear entidades
                                val invoice = InvoiceEntity(
                                    series = series,
                                    number = nextInvoiceNumber,
                                    tipoComprobante = tipoComprobante,
                                    customerId = if (sinIdentificar) 0 else customer?.id ?: 0,
                                    customerName = if (sinIdentificar) "CLIENTES VARIOS" else customer?.name ?: "",
                                    customerRuc = if (sinIdentificar) "" else customer?.numDocumento ?: "",
                                    customerAddress = if (sinIdentificar) "" else customer?.address ?: "",
                                    customerTipoDoc = when {
                                        sinIdentificar -> "0"
                                        isFactura -> "6"
                                        else -> customer?.tipoDocumento ?: "1"
                                    },
                                    subtotal = subtotal,
                                    igv = igv,
                                    total = total,
                                    notes = notes
                                )
                                val invoiceItems = items.map { line ->
                                    InvoiceItemEntity(
                                        productId = line.productId,
                                        description = line.description,
                                        quantity = line.quantity,
                                        unitPrice = line.unitPrice,
                                        total = line.quantity * line.unitPrice
                                    )
                                }
                                
                                // Guardar con flujo de aprobación
                                val userId = SupabaseClientProvider.client.auth.currentUserOrNull()?.id ?: ""
                                val userName = SupabaseClientProvider.client.auth.currentUserOrNull()?.email ?: "Vendedor"
                                
                                val result = invoiceRepoAprobacion.crearFacturaParaAprobacion(
                                    invoice = invoice,
                                    items = invoiceItems,
                                    userId = userId,
                                    userName = userName
                                )
                                
                                result.fold(
                                    onSuccess = { invoiceId ->
                                        // Generar PDF para el cliente (preliminar)
                                        val pdfFile = PdfGenerator.generate(
                                            context = context,
                                            invoice = invoice.copy(id = invoiceId),
                                            items = invoiceItems,
                                            esPreliminar = true
                                        )
                                        pdfGenerado = pdfFile
                                        showPdfShareDialog = true
                                        saving = false
                                        onInvoiceCreated(invoiceId)
                                    },
                                    onFailure = { error ->
                                        saving = false
                                        // Mostrar error
                                    }
                                )
                            }
                        }
                    },
                    enabled = canSave && !saving,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    )
                ) {
                    Icon(Icons.Filled.Check, null, modifier = Modifier.padding(end = 8.dp))
                    Text(
                        if (saving) "Guardando..." else "Emitir ${if (isFactura) "Factura" else "Boleta"}",
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }

                item { Spacer(modifier = Modifier.height(16.dp)) }
                item { Spacer(modifier = Modifier.height(200.dp)) } // Espacio para Maqui
            }

            // Maqui Mascota - Guía interactiva
            if (showMaqui) {
                MaquiGuide(
                    context = MaquiContext.CREATE_INVOICE,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(bottom = 16.dp, end = 16.dp),
                    onDismiss = { showMaqui = false }
                )
            }
        }
    }

    if (showProductDialog) {
        SelectProductDialog(
            products = products,
            onDismiss = { showProductDialog = false },
            onProductSelected = { product ->
                // Verificar si el producto ya existe en la lista
                val existingIndex = items.indexOfFirst { it.productId == product.id }
                
                if (existingIndex != -1) {
                    // Producto ya existe: actualizar cantidad
                    val existingItem = items[existingIndex]
                    val newQuantity = existingItem.quantity + 1
                    
                    // Validar que no exceda el stock
                    if (newQuantity <= product.stock) {
                        items[existingIndex] = existingItem.copy(quantity = newQuantity)
                    } else {
                        // Mostrar mensaje de error o toast
                        android.widget.Toast.makeText(
                            context,
                            "Stock insuficiente. Máximo: ${product.stock}",
                            android.widget.Toast.LENGTH_SHORT
                        ).show()
                    }
                } else {
                    // Producto nuevo: agregar a la lista
                    items.add(
                        LineItem(
                            productId = product.id,
                            description = product.name,
                            quantity = 1,
                            unitPrice = product.price,
                            stockAvailable = product.stock
                        )
                    )
                }
                showProductDialog = false
            }
        )
    }
    
    // Diálogo para compartir PDF generado
    if (showPdfShareDialog && pdfGenerado != null) {
        PdfShareDialog(
            pdfFile = pdfGenerado!!,
            onDismiss = { showPdfShareDialog = false },
            onShare = { file ->
                sharePdf(context, file)
                showPdfShareDialog = false
            }
        )
    }
}

@Composable
private fun ProductLineCard(
    item: LineItem,
    onUpdate: (LineItem) -> Unit,
    onDelete: () -> Unit
) {
    val overStock = item.quantity > item.stockAvailable
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        colors = if (overStock) CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
        ) else CardDefaults.cardColors()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.description,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "Stock: ${item.stockAvailable} uds",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (overStock) MaterialTheme.colorScheme.error else TextoMedio
                    )
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Filled.Delete, "Eliminar", tint = MaterialTheme.colorScheme.error)
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = item.quantity.toString(),
                    onValueChange = {
                        val qty = it.toIntOrNull() ?: 1
                        onUpdate(item.copy(quantity = if (qty > 0) qty else 1))
                    },
                    label = { Text("Cant") },
                    modifier = Modifier.width(80.dp),
                    shape = RoundedCornerShape(8.dp),
                    singleLine = true,
                    isError = overStock
                )
                OutlinedTextField(
                    value = String.format("%.2f", item.unitPrice),
                    onValueChange = {
                        val price = it.toDoubleOrNull() ?: 0.0
                        onUpdate(item.copy(unitPrice = price))
                    },
                    label = { Text("Precio S/") },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp),
                    singleLine = true
                )
                Text(
                    text = "S/ ${String.format("%.2f", item.quantity * item.unitPrice)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro,
                    modifier = Modifier
                        .padding(8.dp)
                        .align(Alignment.CenterVertically)
                )
            }
        }
    }
}

@Composable
private fun TotalRow(label: String, amount: Double, bold: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = if (bold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyLarge,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
            color = MarrónOscuro
        )
        Text(
            text = "S/ ${String.format("%.2f", amount)}",
            style = if (bold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyLarge,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
            color = MarrónOscuro
        )
    }
}
