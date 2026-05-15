package com.factumary.ui.screens.auth

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.factumary.data.remote.SupabaseClientProvider
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import com.factumary.ui.theme.VerdeSuave
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

@Serializable
data class UserItem(
    val id: String,
    val email: String,
    val role: String,
    val nombre: String = "",
    val alias: String = "",
    val activo: Boolean = true
)

private val ROLES = listOf("admin", "editor", "viewer")

private fun displayRole(role: String): String = when (role) {
    "admin" -> "Administrador"
    "editor" -> "Editor"
    "viewer" -> "Visor"
    else -> role
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserManagementScreen(
    onBack: () -> Unit,
    isAdmin: Boolean
) {
    if (!isAdmin) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Filled.Person,
                    contentDescription = null,
                    tint = TextoMedio,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Acceso restringido",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Solo administradores pueden gestionar usuarios",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextoMedio,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 32.dp)
                )
            }
        }
        return
    }

    val scope = rememberCoroutineScope()
    var users by remember { mutableStateOf<List<UserItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var showFormDialog by remember { mutableStateOf(false) }
    var editingUser by remember { mutableStateOf<UserItem?>(null) }
    var deletingUser by remember { mutableStateOf<UserItem?>(null) }
    var operationError by remember { mutableStateOf<String?>(null) }
    var operationLoading by remember { mutableStateOf(false) }

    fun loadUsers() {
        scope.launch {
            loading = true
            error = null
            try {
                users = SupabaseClientProvider.client.postgrest["profiles"]
                    .select()
                    .decodeList<UserItem>()
            } catch (e: Exception) {
                error = e.message ?: "Error al cargar usuarios"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { loadUsers() }

    val filtered = if (searchQuery.isBlank()) users
    else users.filter {
        it.email.contains(searchQuery, ignoreCase = true) ||
        it.nombre.contains(searchQuery, ignoreCase = true) ||
        it.alias.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Usuarios") },
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
                onClick = {
                    editingUser = null
                    showFormDialog = true
                },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Filled.Add, "Nuevo usuario", tint = MaterialTheme.colorScheme.onPrimary)
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
                placeholder = { Text("Buscar usuario por email o nombre") },
                leadingIcon = { Icon(Icons.Filled.Search, null) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (loading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (error != null) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = error!!,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center
                    )
                }
            } else if (filtered.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (searchQuery.isNotBlank()) "Sin resultados"
                        else "Agrega tu primer usuario",
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextoMedio,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filtered, key = { it.id }) { user ->
                        UserCard(
                            user = user,
                            onEdit = {
                                editingUser = user
                                showFormDialog = true
                            },
                            onDelete = { deletingUser = user }
                        )
                    }
                }
            }
        }
    }

    if (showFormDialog) {
        UserFormDialog(
            editUser = editingUser,
            operationLoading = operationLoading,
            onDismiss = { showFormDialog = false },
            onSave = { email, password, role, nombre, alias, activo ->
                operationLoading = true
                operationError = null
                scope.launch {
                    try {
                        if (editingUser != null) {
                            SupabaseClientProvider.client.postgrest["profiles"].upsert(
                                UserItem(
                                    id = editingUser!!.id,
                                    email = email,
                                    role = role,
                                    nombre = nombre,
                                    alias = alias,
                                    activo = activo
                                )
                            )
                        } else {
                            val httpClient = HttpClient(Android)
                            val response = httpClient.post("https://maquimary.vercel.app/api/auth/admin") {
                                contentType(ContentType.Application.Json)
                                setBody(
                                    """{"action":"create","email":"$email","password":"$password","role":"$role","nombre":"$nombre","alias":"$alias"}"""
                                )
                            }
                            val body = response.bodyAsText()
                            val json = Json.parseToJsonElement(body).jsonObject
                            if (json["ok"]?.jsonPrimitive?.booleanOrNull != true) {
                                throw Exception(json["error"]?.jsonPrimitive?.content ?: "Error al crear usuario")
                            }
                        }
                        showFormDialog = false
                        loadUsers()
                    } catch (e: Exception) {
                        operationError = e.message ?: "Error al guardar usuario"
                    } finally {
                        operationLoading = false
                    }
                }
            }
        )
    }

    if (deletingUser != null) {
        AlertDialog(
            onDismissRequest = { deletingUser = null },
            title = {
                Text("Eliminar usuario", color = MarrónOscuro, style = MaterialTheme.typography.titleLarge)
            },
            text = {
                Text(
                    text = "¿Estás seguro de eliminar a ${deletingUser!!.nombre.ifBlank { deletingUser!!.email }}? Esta acción no se puede deshacer.",
                    color = TextoMedio
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                SupabaseClientProvider.client.postgrest["profiles"].delete {
                                    filter { eq("id", deletingUser!!.id) }
                                }
                                deletingUser = null
                                loadUsers()
                            } catch (e: Exception) {
                                operationError = e.message
                                deletingUser = null
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Eliminar")
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingUser = null }) {
                    Text("Cancelar", color = MarrónOscuro)
                }
            }
        )
    }
}

@Composable
private fun UserCard(
    user: UserItem,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onEdit() },
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Filled.Person,
                contentDescription = null,
                tint = if (user.activo) MaterialTheme.colorScheme.primary else TextoMedio,
                modifier = Modifier.padding(end = 12.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = user.nombre.ifBlank { user.email },
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = if (user.activo) MarrónOscuro else TextoMedio
                )
                if (user.nombre.isNotBlank()) {
                    Text(
                        text = user.email,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = displayRole(user.role),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium
                    )
                    if (user.alias.isNotBlank()) {
                        Text(
                            text = " · ${user.alias}",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextoMedio
                        )
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                if (user.activo) {
                    Icon(
                        Icons.Filled.CheckCircle,
                        contentDescription = "Activo",
                        tint = VerdeSuave,
                        modifier = Modifier.size(20.dp)
                    )
                } else {
                    Text(
                        text = "Inactivo",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextoMedio
                    )
                }
                Row {
                    IconButton(onClick = onEdit, modifier = Modifier.size(36.dp)) {
                        Icon(
                            Icons.Filled.Edit,
                            contentDescription = "Editar",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    IconButton(onClick = onDelete, modifier = Modifier.size(36.dp)) {
                        Icon(
                            Icons.Filled.Delete,
                            contentDescription = "Eliminar",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UserFormDialog(
    editUser: UserItem?,
    operationLoading: Boolean,
    onDismiss: () -> Unit,
    onSave: (email: String, password: String, role: String, nombre: String, alias: String, activo: Boolean) -> Unit
) {
    val isEditing = editUser != null
    var email by remember { mutableStateOf(editUser?.email ?: "") }
    var password by remember { mutableStateOf("") }
    var role by remember { mutableStateOf(editUser?.role ?: "editor") }
    var nombre by remember { mutableStateOf(editUser?.nombre ?: "") }
    var alias by remember { mutableStateOf(editUser?.alias ?: "") }
    var activo by remember { mutableStateOf(editUser?.activo ?: true) }
    var passwordVisible by remember { mutableStateOf(false) }
    var roleExpanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = { if (!operationLoading) onDismiss() },
        title = {
            Text(
                text = if (isEditing) "Editar Usuario" else "Nuevo Usuario",
                color = MarrónOscuro,
                style = MaterialTheme.typography.titleLarge
            )
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    singleLine = true,
                    enabled = !isEditing
                )

                Spacer(modifier = Modifier.height(8.dp))

                if (!isEditing) {
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Contraseña") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true,
                        visualTransformation = if (passwordVisible) VisualTransformation.None
                            else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Filled.Visibility
                                        else Icons.Filled.VisibilityOff,
                                    contentDescription = if (passwordVisible) "Ocultar" else "Mostrar"
                                )
                            }
                        }
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                ExposedDropdownMenuBox(
                    expanded = roleExpanded,
                    onExpandedChange = { roleExpanded = it }
                ) {
                    OutlinedTextField(
                        value = displayRole(role),
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Rol") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = roleExpanded) },
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true
                    )
                    ExposedDropdownMenu(
                        expanded = roleExpanded,
                        onDismissRequest = { roleExpanded = false }
                    ) {
                        ROLES.forEach { option ->
                            DropdownMenuItem(
                                text = { Text(displayRole(option)) },
                                onClick = {
                                    role = option
                                    roleExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = nombre,
                    onValueChange = { nombre = it },
                    label = { Text("Nombre completo") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = alias,
                    onValueChange = { alias = it },
                    label = { Text("Alias (opcional)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Usuario activo",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MarrónOscuro
                    )
                    Switch(
                        checked = activo,
                        onCheckedChange = { activo = it }
                    )
                }

                if (operationLoading) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(email, password, role, nombre, alias, activo)
                },
                enabled = email.isNotBlank() && (isEditing || password.isNotBlank()) && !operationLoading,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text(if (isEditing) "Guardar" else "Crear")
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                enabled = !operationLoading
            ) {
                Text("Cancelar", color = MarrónOscuro)
            }
        }
    )
}
