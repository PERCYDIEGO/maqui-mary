package com.factumary.ui.screens.auth

import android.content.Context
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckBoxOutlineBlank
import androidx.compose.material.icons.filled.CheckBox
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.remote.SupabaseClientProvider
import com.factumary.data.repository.CustomerRepository
import com.factumary.ui.theme.Dorado
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onLoginSuccess: (String) -> Unit,
    onForcePasswordChange: () -> Unit = {}
) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("factumary_login", Context.MODE_PRIVATE) }

    var email by remember { mutableStateOf(prefs.getString("email", "") ?: "") }
    var password by remember { mutableStateOf(prefs.getString("password", "") ?: "") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var passwordVisible by remember { mutableStateOf(false) }
    var recordar by remember { mutableStateOf(prefs.getBoolean("recordar", false)) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            shape = RoundedCornerShape(24.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Lock,
                    contentDescription = null,
                    tint = Dorado,
                    modifier = Modifier.size(48.dp)
                )

                Text(
                    text = "FactuMary",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )
                Text(
                    text = "Esponjas Maqui Mary",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextoMedio
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it; error = null },
                    label = { Text("Usuario o Email") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it; error = null },
                    label = { Text("Contraseña") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
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

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { recordar = !recordar }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (recordar) Icons.Filled.CheckBox else Icons.Filled.CheckBoxOutlineBlank,
                        contentDescription = if (recordar) "Recordando" else "No recordar",
                        tint = if (recordar) MaterialTheme.colorScheme.primary else TextoMedio,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.padding(start = 8.dp))
                    Text(
                        text = "Recordar usuario",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio
                    )
                }

                if (error != null) {
                    Text(
                        text = error!!,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Button(
                    onClick = {
                        if (email.isBlank() || password.isBlank()) {
                            error = "Ingresa correo y contraseña"
                            return@Button
                        }
                        loading = true
                        error = null
                        scope.launch {
                            // Paso 1: Resolver alias a email si es necesario
                            val resolved = SupabaseClientProvider.resolveAliasOrEmail(email.trim())
                            if (resolved.isFailure) {
                                loading = false
                                error = resolved.exceptionOrNull()?.message ?: "Usuario no encontrado"
                                return@launch
                            }
                            val resolvedEmail = resolved.getOrThrow()

                            // Paso 2: Login con email
                            val result = SupabaseClientProvider.login(resolvedEmail, password)
                            loading = false
                            result.fold(
                                onSuccess = {
                                    prefs.edit().apply {
                                        if (recordar) {
                                            putString("email", resolvedEmail)
                                            putString("password", password)
                                            putBoolean("recordar", true)
                                        } else {
                                            remove("email")
                                            remove("password")
                                            putBoolean("recordar", false)
                                        }
                                        apply()
                                    }
                                    scope.launch {
                                        try {
                                            // Sincronizar clientes
                                            val customerRepo = CustomerRepository(FactuMaryApp.instance.database.customerDao())
                                            customerRepo.syncFromSupabase()
                                            
                                            // Sincronizar productos
                                            val productRepo = com.factumary.data.repository.ProductRepositorySync(
                                                FactuMaryApp.instance.database.productDao()
                                            )
                                            productRepo.syncFromSupabase()
                                        } catch (_: Exception) { }
                                        
                                        // Obtener rol del usuario
                                        val profileResult = SupabaseClientProvider.fetchUserProfile()
                                        val profile = profileResult.getOrNull()
                                        val role = profile?.role ?: "editor"
                                        if (profile?.force_password_change == true) {
                                            onForcePasswordChange()
                                        } else {
                                            onLoginSuccess(role)
                                        }
                                    }
                                },
                                onFailure = { e -> error = e.message ?: "Error de conexión" }
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    enabled = !loading
                ) {
                    if (loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Ingresar", style = MaterialTheme.typography.titleSmall)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Botón crear cuenta
                Button(
                    onClick = {
                        if (email.isBlank() || password.isBlank()) {
                            error = "Ingresa correo y contraseña para crear cuenta"
                            return@Button
                        }
                        loading = true
                        error = null
                        scope.launch {
                            val result = SupabaseClientProvider.signUp(email.trim(), password)
                            loading = false
                            result.fold(
                                onSuccess = { msg ->
                                    error = msg
                                },
                                onFailure = { e -> error = e.message ?: "Error al crear cuenta" }
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    enabled = !loading,
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.secondary
                    )
                ) {
                    Text("Crear cuenta", style = MaterialTheme.typography.titleSmall)
                }
            }
        }
    }
}
