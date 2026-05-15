package com.factumary.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import io.github.jan.supabase.postgrest.postgrest
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
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.factumary.data.remote.SupabaseClientProvider
import com.factumary.ui.theme.Dorado
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import io.github.jan.supabase.gotrue.auth
import kotlinx.coroutines.launch

@Composable
fun CambiarContrasenaScreen(onSuccess: () -> Unit, onBack: () -> Unit) {
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var currentPasswordVisible by remember { mutableStateOf(false) }
    var newPasswordVisible by remember { mutableStateOf(false) }
    var confirmPasswordVisible by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val passwordRules = remember(newPassword) {
        listOf(
            RuleState("M\u00ednimo 8 caracteres", newPassword.length >= 8),
            RuleState("Al menos una may\u00fascula", newPassword.any { it.isUpperCase() }),
            RuleState("Al menos una min\u00fascula", newPassword.any { it.isLowerCase() }),
            RuleState("Al menos un n\u00famero", newPassword.any { it.isDigit() }),
            RuleState("Al menos un car\u00e1cter especial", newPassword.any { !it.isLetterOrDigit() })
        )
    }

    val passwordsMatch = newPassword == confirmPassword && newPassword.isNotEmpty()
    val canSubmit = passwordRules.all { it.passed } && passwordsMatch && currentPassword.isNotEmpty() && !loading

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
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "\u2190 Volver",
                        color = MarrónOscuro,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.clickable(onClick = onBack)
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Icon(
                    imageVector = Icons.Filled.Lock,
                    contentDescription = null,
                    tint = Dorado,
                    modifier = Modifier.size(48.dp)
                )

                Text(
                    text = "Cambiar Contrase\u00f1a",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )
                Text(
                    text = "Por seguridad, debes cambiar tu contrase\u00f1a en tu primer inicio de sesi\u00f3n",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextoMedio
                )

                Spacer(modifier = Modifier.height(4.dp))

                OutlinedTextField(
                    value = currentPassword,
                    onValueChange = { currentPassword = it; error = null },
                    label = { Text("Contrase\u00f1a Actual") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    visualTransformation = if (currentPasswordVisible) VisualTransformation.None
                        else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { currentPasswordVisible = !currentPasswordVisible }) {
                            Icon(
                                imageVector = if (currentPasswordVisible) Icons.Filled.Visibility
                                    else Icons.Filled.VisibilityOff,
                                contentDescription = if (currentPasswordVisible) "Ocultar" else "Mostrar"
                            )
                        }
                    }
                )

                OutlinedTextField(
                    value = newPassword,
                    onValueChange = { newPassword = it; error = null },
                    label = { Text("Nueva Contrase\u00f1a") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    visualTransformation = if (newPasswordVisible) VisualTransformation.None
                        else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { newPasswordVisible = !newPasswordVisible }) {
                            Icon(
                                imageVector = if (newPasswordVisible) Icons.Filled.Visibility
                                    else Icons.Filled.VisibilityOff,
                                contentDescription = if (newPasswordVisible) "Ocultar" else "Mostrar"
                            )
                        }
                    }
                )

                Column(
                    modifier = Modifier.fillMaxWidth().padding(start = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    passwordRules.forEach { rule ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (rule.passed) Icons.Filled.Check else Icons.Filled.Close,
                                contentDescription = null,
                                tint = if (rule.passed) Color(0xFF4CAF50) else Color(0xFFE53935),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.padding(start = 6.dp))
                            Text(
                                text = rule.label,
                                style = MaterialTheme.typography.bodySmall,
                                color = if (rule.passed) Color(0xFF4CAF50) else Color(0xFFE53935)
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it; error = null },
                    label = { Text("Confirmar Contrase\u00f1a") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    isError = confirmPassword.isNotEmpty() && !passwordsMatch,
                    visualTransformation = if (confirmPasswordVisible) VisualTransformation.None
                        else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                            Icon(
                                imageVector = if (confirmPasswordVisible) Icons.Filled.Visibility
                                    else Icons.Filled.VisibilityOff,
                                contentDescription = if (confirmPasswordVisible) "Ocultar" else "Mostrar"
                            )
                        }
                    }
                )

                if (confirmPassword.isNotEmpty() && !passwordsMatch) {
                    Text(
                        text = "Las contrase\u00f1as no coinciden",
                        color = Color(0xFFE53935),
                        style = MaterialTheme.typography.bodySmall
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
                        loading = true
                        error = null
                        scope.launch {
                            try {
                                SupabaseClientProvider.client.auth.updateUser {
                                    password = newPassword
                                }

                                val user = SupabaseClientProvider.client.auth.currentUserOrNull()
                                if (user != null) {
                                    SupabaseClientProvider.client.postgrest["profiles"].update(
                                        mapOf("force_password_change" to false)
                                    ) {
                                        filter {
                                            eq("id", user.id)
                                        }
                                    }
                                }

                                loading = false
                                onSuccess()
                            } catch (e: Exception) {
                                loading = false
                                error = e.message ?: "Error al cambiar contrase\u00f1a"
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    enabled = canSubmit
                ) {
                    if (loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Cambiar Contrase\u00f1a", style = MaterialTheme.typography.titleSmall)
                    }
                }
            }
        }
    }
}

private data class RuleState(val label: String, val passed: Boolean)
