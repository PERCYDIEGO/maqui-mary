package com.factumary.ui.screens.dashboard

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.factumary.data.remote.SupabaseClientProvider
import com.factumary.data.remote.VentaMesDto
import com.factumary.data.seed.FacturasTestInjector
import com.factumary.ui.components.MaquiContext
import com.factumary.ui.components.MaquiGuide
import com.factumary.ui.components.MaquiMini
import com.factumary.ui.theme.MarrónOscuro
import com.factumary.ui.theme.TextoMedio
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.max

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigateToInvoices: () -> Unit,
    onNavigateToProducts: () -> Unit,
    onNavigateToCustomers: () -> Unit,
    onBack: () -> Unit
) {
    var stats by remember { mutableStateOf<DashboardStats?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showMaqui by remember { mutableStateOf(true) }
    var rangoMeses by remember { mutableStateOf(6) } // Default 6 meses

    LaunchedEffect(Unit) {
        loadDashboardData { meses ->
            rangoMeses = meses
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text("Dashboard", fontWeight = FontWeight.Bold)
                        Text(
                            "Maqui Mary - Panel de Control",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextoMedio
                        )
                    }
                },
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
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header con resumen
                DashboardHeader(
                    stats = stats,
                    isLoading = isLoading,
                    rangoMeses = rangoMeses
                )

                // Selector de rango
                RangoSelector(
                    rangoActual = rangoMeses,
                    onRangoChange = { nuevoRango ->
                        rangoMeses = nuevoRango
                        isLoading = true
                        // Recargar datos con nuevo rango
                    }
                )

                // Gráfico de ventas
                if (!isLoading && stats != null) {
                    VentasChart(
                        ventasPorMes = stats!!.ventasPorMes,
                        maxVentas = stats!!.maxVentas
                    )
                }

                // Accesos rápidos
                AccesosRapidos(
                    onInvoices = onNavigateToInvoices,
                    onProducts = onNavigateToProducts,
                    onCustomers = onNavigateToCustomers
                )

                // Alertas
                if (!isLoading && stats != null && stats!!.productosBajoStock > 0) {
                    AlertaStockBajo(
                        cantidad = stats!!.productosBajoStock,
                        onClick = onNavigateToProducts
                    )
                }

                // Panel de Testing (solo para desarrollo)
                TestingPanel()

                Spacer(modifier = Modifier.height(200.dp))
            }

            // Maqui Mascota
            if (showMaqui) {
                MaquiGuide(
                    context = MaquiContext.DASHBOARD,
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(bottom = 16.dp, end = 16.dp),
                    onDismiss = { showMaqui = false }
                )
            }
        }
    }
}

@Composable
private fun DashboardHeader(
    stats: DashboardStats?,
    isLoading: Boolean,
    rangoMeses: Int
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Últimos $rangoMeses meses",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(40.dp),
                    color = MaterialTheme.colorScheme.primary
                )
            } else if (stats != null) {
                val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "PE"))
                
                Text(
                    text = currencyFormat.format(stats.totalVentas),
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = MarrónOscuro
                )
                
                Text(
                    text = "${stats.cantidadFacturas} facturas emitidas",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextoMedio
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    StatItem(
                        icon = Icons.Filled.TrendingUp,
                        value = currencyFormat.format(stats.promedioVenta),
                        label = "Promedio"
                    )
                    StatItem(
                        icon = Icons.Filled.CalendarMonth,
                        value = "${stats.mesMasVentas?.mes ?: "-"}",
                        label = "Mejor mes"
                    )
                }
            }
        }
    }
}

@Composable
private fun StatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    label: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = MarrónOscuro
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = TextoMedio
        )
    }
}

@Composable
private fun RangoSelector(
    rangoActual: Int,
    onRangoChange: (Int) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Período",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(3, 6, 12, 24).forEach { meses ->
                    FilterChip(
                        selected = rangoActual == meses,
                        onClick = { onRangoChange(meses) },
                        label = { 
                            Text(
                                when(meses) {
                                    3 -> "3 meses"
                                    6 -> "6 meses"
                                    12 -> "1 año"
                                    24 -> "2 años"
                                    else -> "$meses meses"
                                }
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun VentasChart(
    ventasPorMes: List<VentaMesDto>,
    maxVentas: Double
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Ventas por Mes",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            if (ventasPorMes.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No hay datos de ventas en este período",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextoMedio,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                // Gráfico de barras simple
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ventasPorMes.forEach { ventaMes ->
                        BarraVenta(
                            mes = ventaMes.mes,
                            cantidad = ventaMes.cantidad,
                            total = ventaMes.total,
                            maxTotal = maxVentas
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun BarraVenta(
    mes: String,
    cantidad: Int,
    total: Double,
    maxTotal: Double
) {
    val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "PE"))
    val progreso = if (maxTotal > 0) (total / maxTotal).toFloat() else 0f
    
    val formattedMes = try {
        val parts = mes.split("-")
        if (parts.size == 2) {
            val year = parts[0]
            val month = parts[1].toInt()
            val monthNames = listOf("", "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
                                   "Jul", "Ago", "Sep", "Oct", "Nov", "Dic")
            "${monthNames[month]} $year"
        } else mes
    } catch (e: Exception) { mes }
    
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = formattedMes,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.width(80.dp)
            )
            
            LinearProgressIndicator(
                progress = progreso,
                modifier = Modifier
                    .weight(1f)
                    .height(12.dp)
                    .clip(RoundedCornerShape(6.dp)),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.primaryContainer
            )
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = currencyFormat.format(total),
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "$cantidad facs",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextoMedio
                )
            }
        }
    }
}

@Composable
private fun AccesosRapidos(
    onInvoices: () -> Unit,
    onProducts: () -> Unit,
    onCustomers: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Accesos Rápidos",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                AccesoRapidoItem(
                    icon = Icons.Filled.ReceiptLong,
                    label = "Facturas",
                    onClick = onInvoices
                )
                AccesoRapidoItem(
                    icon = Icons.Filled.Inventory,
                    label = "Productos",
                    onClick = onProducts
                )
                AccesoRapidoItem(
                    icon = Icons.Filled.People,
                    label = "Clientes",
                    onClick = onCustomers
                )
            }
        }
    }
}

@Composable
private fun AccesoRapidoItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable { onClick() }
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(28.dp)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun AlertaStockBajo(
    cantidad: Int,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.Warning,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Stock bajo",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.error
                )
                Text(
                    text = "$cantidad productos necesitan reposición",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error
            )
        }
    }
}

@Composable
private fun TestingPanel() {
    val context = androidx.compose.ui.platform.LocalContext.current
    var showResult by remember { mutableStateOf(false) }
    var testResult by remember { mutableStateOf("") }
    var isInjecting by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Filled.Science,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.tertiary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Testing - Inyección de Facturas",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.tertiary
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Genera facturas de prueba para probar el flujo de aprobación en el CRM",
                style = MaterialTheme.typography.bodySmall,
                color = TextoMedio
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = {
                        isInjecting = true
                        FacturasTestInjector.injectarFacturasTest(context, 3) { resultado ->
                            testResult = FacturasTestInjector.generarReporte(resultado)
                            showResult = true
                            isInjecting = false
                        }
                    },
                    enabled = !isInjecting,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.tertiary
                    )
                ) {
                    if (isInjecting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = MaterialTheme.colorScheme.onTertiary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Inyectar 3 facturas")
                    }
                }

                OutlinedButton(
                    onClick = {
                        isInjecting = true
                        FacturasTestInjector.injectarFacturasTest(context, 5) { resultado ->
                            testResult = FacturasTestInjector.generarReporte(resultado)
                            showResult = true
                            isInjecting = false
                        }
                    },
                    enabled = !isInjecting,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Inyectar 5")
                }
            }

            // Mostrar resultado
            if (showResult && testResult.isNotBlank()) {
                Spacer(modifier = Modifier.height(12.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.surface,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "Resultado:",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = testResult,
                            style = MaterialTheme.typography.bodySmall,
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                        )
                    }
                }
            }
        }
    }
}

// Datos del dashboard
private data class DashboardStats(
    val totalVentas: Double,
    val cantidadFacturas: Int,
    val promedioVenta: Double,
    val ventasPorMes: List<VentaMesDto>,
    val maxVentas: Double,
    val mesMasVentas: VentaMesDto?,
    val productosBajoStock: Int
)

private suspend fun loadDashboardData(
    onRangoCalculated: (Int) -> Unit
): DashboardStats? {
    return try {
        // Obtener primera fecha de venta
        val primeraFechaResult = SupabaseClientProvider.fetchPrimeraFechaVenta()
        val primeraFecha = primeraFechaResult.getOrNull() ?: System.currentTimeMillis()
        
        // Calcular rango automático (desde primera venta hasta hoy)
        val calPrimera = Calendar.getInstance().apply { timeInMillis = primeraFecha }
        val calHoy = Calendar.getInstance()
        
        val diffMonths = ((calHoy.get(Calendar.YEAR) - calPrimera.get(Calendar.YEAR)) * 12 +
                         (calHoy.get(Calendar.MONTH) - calPrimera.get(Calendar.MONTH)))
        
        val rangoMeses = max(3, min(24, diffMonths + 1)) // Mínimo 3, máximo 24 meses
        onRangoCalculated(rangoMeses)
        
        // Calcular fechas para el query
        val fechaInicio = calPrimera.apply {
            set(Calendar.DAY_OF_MONTH, 1)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
        }.timeInMillis
        
        val fechaFin = System.currentTimeMillis()
        
        // Obtener estadísticas
        val statsResult = SupabaseClientProvider.fetchVentasStats(fechaInicio, fechaFin)
        
        statsResult.getOrNull()?.let { stats ->
            val maxVentas = stats.ventasPorMes.maxOfOrNull { it.total } ?: 0.0
            val mesMasVentas = stats.ventasPorMes.maxByOrNull { it.total }
            
            DashboardStats(
                totalVentas = stats.totalVentas,
                cantidadFacturas = stats.cantidadFacturas,
                promedioVenta = stats.promedioVenta,
                ventasPorMes = stats.ventasPorMes,
                maxVentas = maxVentas,
                mesMasVentas = mesMasVentas,
                productosBajoStock = 0 // Se obtendría del repositorio local
            )
        }
    } catch (e: Exception) {
        null
    }
}
