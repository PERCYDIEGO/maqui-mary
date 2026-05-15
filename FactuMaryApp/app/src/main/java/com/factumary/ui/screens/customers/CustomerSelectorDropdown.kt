package com.factumary.ui.screens.customers

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties
import com.factumary.FactuMaryApp
import com.factumary.data.db.entity.CustomerEntity
import com.factumary.data.repository.CustomerRepository
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio

/**
 * Selector de clientes tipo dropdown/buscador mejorado
 * Reduce el ruido visual mostrando solo el cliente seleccionado o el campo de búsqueda
 */
@Composable
fun CustomerSelectorDropdown(
    selectedCustomer: CustomerEntity?,
    onCustomerSelected: (CustomerEntity) -> Unit,
    _onAddNewCustomer: () -> Unit,
    modifier: Modifier = Modifier
) {
    val repo = remember { CustomerRepository(FactuMaryApp.instance.database.customerDao()) }
    val customers by repo.getAll().collectAsState(initial = emptyList())
    
    var searchQuery by remember { mutableStateOf("") }
    var isDropdownExpanded by remember { mutableStateOf(false) }
    var showAddDialog by remember { mutableStateOf(false) }
    
    val keyboardController = LocalSoftwareKeyboardController.current
    
    // Filtrar clientes
    val filteredCustomers = remember(searchQuery, customers) {
        if (searchQuery.isBlank()) {
            customers
        } else {
            customers.filter {
                it.name.contains(searchQuery, ignoreCase = true) ||
                it.numDocumento.contains(searchQuery, ignoreCase = true)
            }
        }
    }
    
    Box(modifier = modifier.fillMaxWidth()) {
        Column {
            // Campo principal - muestra seleccionado o buscador
            if (selectedCustomer != null && !isDropdownExpanded) {
                // Vista del cliente seleccionado
                SelectedCustomerCard(
                    customer = selectedCustomer,
                    onClick = { isDropdownExpanded = true },
                    onClear = { onCustomerSelected(CustomerEntity(name = "")) }
                )
            } else {
                // Campo de búsqueda
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { 
                        searchQuery = it
                        isDropdownExpanded = true
                    },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Buscar cliente por nombre o RUC...") },
                    leadingIcon = { 
                        Icon(Icons.Filled.Search, contentDescription = null)
                    },
                    trailingIcon = {
                        Row {
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = { searchQuery = "" }) {
                                    Icon(Icons.Filled.Clear, contentDescription = "Limpiar")
                                }
                            }
                            IconButton(onClick = { showAddDialog = true }) {
                                Icon(
                                    Icons.Filled.Add,
                                    contentDescription = "Nuevo cliente",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(
                        onSearch = { keyboardController?.hide() }
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                    )
                )
            }
            
            // Dropdown con resultados
            AnimatedVisibility(
                visible = isDropdownExpanded,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp)
                        .heightIn(max = 300.dp),
                    shape = RoundedCornerShape(12.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column {
                        // Header del dropdown
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${filteredCustomers.size} clientes encontrados",
                                style = MaterialTheme.typography.labelMedium,
                                color = TextoMedio
                            )
                            IconButton(
                                onClick = { isDropdownExpanded = false },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    Icons.Filled.Close,
                                    contentDescription = "Cerrar",
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                        
                        HorizontalDivider()
                        
                        // Lista de clientes
                        LazyColumn(
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (filteredCustomers.isEmpty()) {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(24.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Icon(
                                                Icons.Filled.PersonOff,
                                                contentDescription = null,
                                                tint = TextoMedio,
                                                modifier = Modifier.size(40.dp)
                                            )
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Text(
                                                text = "No se encontraron clientes",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = TextoMedio
                                            )
                                            TextButton(onClick = { showAddDialog = true }) {
                                                Text("Crear nuevo cliente")
                                            }
                                        }
                                    }
                                }
                            } else {
                                items(
                                    items = filteredCustomers,
                                    key = { it.id }
                                ) { customer ->
                                    CustomerDropdownItem(
                                        customer = customer,
                                        searchQuery = searchQuery,
                                        onClick = {
                                            onCustomerSelected(customer)
                                            searchQuery = ""
                                            isDropdownExpanded = false
                                            keyboardController?.hide()
                                        }
                                    )
                                }
                            }
                            
                            // Opción de agregar nuevo al final
                            item {
                                HorizontalDivider()
                                TextButton(
                                    onClick = { 
                                        showAddDialog = true
                                        isDropdownExpanded = false
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Filled.Add, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Agregar nuevo cliente")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Diálogo para agregar cliente
    if (showAddDialog) {
        AddCustomerDialog(
            onDismiss = { showAddDialog = false },
            onSave = { customer ->
                // Guardar y seleccionar automáticamente
                onCustomerSelected(customer)
                showAddDialog = false
            }
        )
    }
}

@Composable
private fun SelectedCustomerCard(
    customer: CustomerEntity,
    onClick: () -> Unit,
    onClear: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
        ),
        border = androidx.compose.foundation.BorderStroke(
            1.dp, 
            MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.Person,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(28.dp)
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Cliente seleccionado",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextoMedio
                )
                Text(
                    text = customer.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MarrónOscuro,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (customer.numDocumento.isNotBlank()) {
                    Text(
                        text = "${if (customer.tipoDocumento == "6") "RUC" else "DNI"}: ${customer.numDocumento}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio
                    )
                }
            }
            
            IconButton(onClick = onClear) {
                Icon(
                    Icons.Filled.Edit,
                    contentDescription = "Cambiar cliente",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun CustomerDropdownItem(
    customer: CustomerEntity,
    searchQuery: String,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = customer.name.take(1).uppercase(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                HighlightedText(
                    text = customer.name,
                    highlight = searchQuery,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )
                
                if (customer.numDocumento.isNotBlank()) {
                    Text(
                        text = "${if (customer.tipoDocumento == "6") "RUC" else "DNI"}: ${customer.numDocumento}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio
                    )
                }
            }
            
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
            )
        }
    }
}

@Composable
private fun HighlightedText(
    text: String,
    highlight: String,
    style: androidx.compose.ui.text.TextStyle,
    fontWeight: FontWeight = FontWeight.Normal
) {
    if (highlight.isBlank()) {
        Text(text = text, style = style, fontWeight = fontWeight)
        return
    }
    
    // Simplificación: mostrar texto normal si es complejo
    Text(
        text = text,
        style = style,
        fontWeight = fontWeight,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis
    )
}

// Versión simplificada para usar en CreateInvoiceScreen
@Composable
fun CompactCustomerSelector(
    customer: CustomerEntity?,
    onCustomerClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onCustomerClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (customer != null) 
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else 
                MaterialTheme.colorScheme.surface
        ),
        border = if (customer == null) 
            androidx.compose.foundation.BorderStroke(
                1.dp, 
                MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
            )
        else null
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = if (customer != null) Icons.Filled.Person else Icons.Filled.PersonAdd,
                contentDescription = null,
                tint = if (customer != null) 
                    MaterialTheme.colorScheme.primary 
                else 
                    TextoMedio,
                modifier = Modifier.size(28.dp)
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                if (customer != null) {
                    Text(
                        text = "Cliente",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextoMedio
                    )
                    Text(
                        text = customer.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MarrónOscuro
                    )
                    if (customer.numDocumento.isNotBlank()) {
                        Text(
                            text = "${if (customer.tipoDocumento == "6") "RUC" else "DNI"}: ${customer.numDocumento}",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextoMedio
                        )
                    }
                } else {
                    Text(
                        text = "Seleccionar cliente",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextoMedio
                    )
                    Text(
                        text = "Toca para buscar o crear",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio.copy(alpha = 0.7f)
                    )
                }
            }
            
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = TextoMedio.copy(alpha = 0.5f)
            )
        }
    }
}
