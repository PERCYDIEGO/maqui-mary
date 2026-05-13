package com.factumary.ui.screens.settings

import android.content.Context
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
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Numbers
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.unit.dp
import com.factumary.FactuMaryApp
import com.factumary.data.remote.SupabaseClientProvider
import com.factumary.data.repository.CustomerRepository
import com.factumary.data.repository.InvoiceRepository
import com.factumary.data.sunat.SunatApiService
import com.factumary.ui.components.MaquiContext
import com.factumary.ui.components.MaquiGuide
import com.factumary.ui.components.MaquiMini
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences("factumary_settings", Context.MODE_PRIVATE) }

    var companyName by remember { mutableStateOf(prefs.getString("company_name", "INVERSIONES MAQUI MARY PERU E.I.R.L.") ?: "INVERSIONES MAQUI MARY PERU E.I.R.L.") }
    var ruc by remember { mutableStateOf(prefs.getString("ruc", "20606218801") ?: "20606218801") }
    var address by remember { mutableStateOf(prefs.getString("address", "Calle Las Quebradas Mz E Lote 10, Ate Vitarte") ?: "Calle Las Quebradas Mz E Lote 10, Ate Vitarte") }
    var phone by remember { mutableStateOf(prefs.getString("phone", "(51) 949 446 676") ?: "(51) 949 446 676") }
    var series by remember { mutableStateOf(prefs.getString("series", "F001") ?: "F001") }
    var saved by remember { mutableStateOf(false) }
    var syncLoading by remember { mutableStateOf(false) }
    var syncMessage by remember { mutableStateOf<String?>(null) }
    var showMaqui by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Configuración") },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Icon(
                        Icons.Filled.Business,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    Text(
                        "Datos de la Empresa",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MarrónOscuro
                    )
                    Text(
                        "Estos datos aparecerán en tus facturas",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = companyName,
                        onValueChange = { companyName = it },
                        label = { Text("Razón Social") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = ruc,
                        onValueChange = { ruc = it },
                        label = { Text("RUC") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = address,
                        onValueChange = { address = it },
                        label = { Text("Dirección") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Teléfono") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Icon(
                        Icons.Filled.Numbers,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    Text(
                        "Numeración de Facturas",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MarrónOscuro
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = series,
                        onValueChange = { series = it },
                        label = { Text("Serie") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        supportingText = { Text("Ej: F001, B001, etc.") }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Información SUNAT
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Icon(
                        Icons.Filled.CloudUpload,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    Text(
                        "Facturación Electrónica (SUNAT)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MarrónOscuro
                    )
                    Text(
                        "Los comprobantes se envían automáticamente a SUNAT a través de la web de Maqui Mary. No necesitas configurar nada.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "RUC: 20606218801\nRazón Social: INVERSIONES MAQUI MARY PERU E.I.R.L.\nCertificado digital: ECEP-RENIEC (vigente hasta 2029)",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    prefs.edit().apply {
                        putString("company_name", companyName)
                        putString("ruc", ruc)
                        putString("address", address)
                        putString("phone", phone)
                        putString("series", series)
                        apply()
                    }
                    saved = true
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Guardar Configuración", style = MaterialTheme.typography.titleSmall)
            }

            if (saved) {
                Text(
                    text = "Configuración guardada correctamente",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.tertiary,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                )
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        "Sincronización",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MarrónOscuro
                    )
                    Text(
                        "Sincroniza datos con Supabase (nube)",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = {
                                syncLoading = true
                                syncMessage = null
                                scope.launch {
                                    try {
                                        val customerRepo = CustomerRepository(FactuMaryApp.instance.database.customerDao())
                                        val result = customerRepo.syncFromSupabase()
                                        result.fold(
                                            onSuccess = { count ->
                                                syncMessage = "$count clientes sincronizados desde la nube"
                                            },
                                            onFailure = {
                                                syncMessage = "Error: sin conexión o credenciales inválidas"
                                            }
                                        )
                                    } catch (e: Exception) {
                                        syncMessage = "Error: ${e.message}"
                                    }
                                    syncLoading = false
                                }
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            enabled = !syncLoading
                        ) {
                            if (syncLoading) {
                                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Filled.CloudDownload, null, modifier = Modifier.size(20.dp))
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Bajar Clientes")
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        OutlinedButton(
                            onClick = {
                                syncLoading = true
                                syncMessage = null
                                scope.launch {
                                    try {
                                        val sunatService = SunatApiService()
                                        val invoiceRepo = InvoiceRepository(
                                            FactuMaryApp.instance.database.invoiceDao(),
                                            FactuMaryApp.instance.database.productDao(),
                                            sunatService
                                        )
                                        invoiceRepo.syncAllUnsynced()
                                        syncMessage = "Facturas pendientes subidas a la nube"
                                    } catch (e: Exception) {
                                        syncMessage = "Error: ${e.message}"
                                    }
                                    syncLoading = false
                                }
                            },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            enabled = !syncLoading
                        ) {
                            if (syncLoading) {
                                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Filled.CloudUpload, null, modifier = Modifier.size(20.dp))
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Subir Facturas")
                        }
                    }

                    if (syncMessage != null) {
                        Text(
                            text = syncMessage!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = TextoMedio,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            HorizontalDivider()

            Spacer(modifier = Modifier.height(16.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Icon(
                        Icons.Filled.Info,
                        contentDescription = null,
                        tint = TextoMedio,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    Text(
                        "FactuMary v1.0",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MarrónOscuro
                    )
                    Text(
                        "App de facturación para Esponjas Maqui Mary Perú",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio
                    )
                    Text(
                        "Calle Las Quebradas Mz E Lote 10, Ate Vitarte",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextoMedio
                    )
                }
            }

            Spacer(modifier = Modifier.height(200.dp)) // Espacio para Maqui
        }

        // Maqui Mascota - Guía interactiva
        if (showMaqui) {
            MaquiGuide(
                context = MaquiContext.SETTINGS,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(bottom = 16.dp, end = 16.dp),
                onDismiss = { showMaqui = false }
            )
        }
        }
    }
}
