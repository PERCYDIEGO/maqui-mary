package com.factumary.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

/**
 * Mascota Esponja "Maqui" - Guía interactiva de la app
 * Reemplaza el tutorial estático con una experiencia interactiva divertida
 */
@Composable
fun MaquiMascot(
    message: String,
    onDismiss: () -> Unit = {},
    modifier: Modifier = Modifier,
    showHint: Boolean = true,
    onClick: (() -> Unit)? = null
) {
    var isVisible by remember { mutableStateOf(true) }
    var isBlinking by remember { mutableStateOf(false) }
    
    // Animación de flotación
    val infiniteTransition = rememberInfiniteTransition(label = "float")
    val floatOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -10f,
        animationSpec = infiniteRepeatable(
            animation = tween(1800, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "float"
    )
    
    // Animación de escala al aparecer
    val scale by animateFloatAsState(
        targetValue = if (isVisible) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.6f, stiffness = 300f),
        label = "scale"
    )
    
    // Parpadeo automático cada 3-5 segundos
    LaunchedEffect(Unit) {
        while (true) {
            delay((3000..5000).random().toLong())
            isBlinking = true
            delay(150)
            isBlinking = false
        }
    }
    
    if (!isVisible) return
    
    Box(
        modifier = modifier
            .scale(scale)
            .padding(16.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Burbuja de diálogo
            Surface(
                modifier = Modifier
                    .padding(bottom = 8.dp)
                    .clickable { onClick?.invoke() },
                shape = RoundedCornerShape(20.dp, 20.dp, 4.dp, 20.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                shadowElevation = 6.dp
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "🧽 ¡Hola! Soy Maqui",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        IconButton(
                            onClick = {
                                isVisible = false
                                onDismiss()
                            },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                Icons.Filled.Close,
                                contentDescription = "Cerrar",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(6.dp))
                    
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        textAlign = TextAlign.Start
                    )
                    
                    if (showHint) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "👆 Toca para más consejos",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.8f),
                            textAlign = TextAlign.End,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
            
            // La Esponja (cuerpo) - Colores mejorados
            Box(
                modifier = Modifier
                    .offset(y = floatOffset.dp)
                    .size(85.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color(0xFFFFE135)) // Amarillo más brillante
                    .border(3.dp, Color(0xFFE6B800), RoundedCornerShape(20.dp))
                    .clickable { 
                        isBlinking = true
                        onClick?.invoke()
                    },
                contentAlignment = Alignment.Center
            ) {
                // Poros de la esponja
                SpongePores()
                
                // Cara
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    // Ojos
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SpongeEye(isBlinking = isBlinking)
                        SpongeEye(isBlinking = isBlinking)
                    }
                    
                    Spacer(modifier = Modifier.height(6.dp))
                    
                    // Sonrisa
                    Box(
                        modifier = Modifier
                            .width(36.dp)
                            .height(14.dp)
                            .background(Color(0xFFE63946), RoundedCornerShape(0.dp, 0.dp, 18.dp, 18.dp))
                            .border(1.dp, Color(0xFFC1121F), RoundedCornerShape(0.dp, 0.dp, 18.dp, 18.dp))
                    )
                    
                    // Mejillas sonrojadas
                    Row(
                        modifier = Modifier
                            .offset(y = (-8).dp)
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .background(Color(0xFFFF6B9D).copy(alpha = 0.4f), CircleShape)
                        )
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .background(Color(0xFFFF6B9D).copy(alpha = 0.4f), CircleShape)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Ojo de la esponja con animación de parpadeo
 */
@Composable
private fun SpongeEye(isBlinking: Boolean) {
    val eyeScale by animateFloatAsState(
        targetValue = if (isBlinking) 0.1f else 1f,
        animationSpec = tween(100),
        label = "blink"
    )
    
    Box(
        modifier = Modifier
            .size(22.dp)
            .background(Color.White, CircleShape)
            .border(2.5.dp, Color(0xFF2D3436), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        // Pupila
        Box(
            modifier = Modifier
                .size(12.dp * eyeScale)
                .background(Color(0xFF2D3436), CircleShape)
        )
        
        // Brillo en el ojo
        if (!isBlinking) {
            Box(
                modifier = Modifier
                    .size(5.dp)
                    .offset(x = 3.dp, y = (-3).dp)
                    .background(Color.White, CircleShape)
                    .align(Alignment.TopEnd)
            )
        }
    }
}

/**
 * Poros decorativos de la esponja - distribución mejorada
 */
@Composable
private fun SpongePores() {
    val poreColor = Color(0xFFE6B800).copy(alpha = 0.4f)
    
    Box(
        modifier = Modifier.fillMaxSize()
    ) {
        Pore(modifier = Modifier.align(Alignment.TopStart).padding(10.dp), size = 9.dp, color = poreColor)
        Pore(modifier = Modifier.align(Alignment.TopEnd).padding(14.dp, 10.dp), size = 7.dp, color = poreColor)
        Pore(modifier = Modifier.align(Alignment.TopCenter).padding(top = 6.dp), size = 5.dp, color = poreColor)
        Pore(modifier = Modifier.align(Alignment.BottomStart).padding(12.dp), size = 8.dp, color = poreColor)
        Pore(modifier = Modifier.align(Alignment.BottomEnd).padding(10.dp), size = 10.dp, color = poreColor)
        Pore(modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 8.dp), size = 6.dp, color = poreColor)
        Pore(modifier = Modifier.align(Alignment.CenterStart).padding(6.dp), size = 5.dp, color = poreColor)
        Pore(modifier = Modifier.align(Alignment.CenterEnd).padding(6.dp), size = 7.dp, color = poreColor)
    }
}

@Composable
private fun Pore(modifier: Modifier, size: androidx.compose.ui.unit.Dp, color: Color) {
    Box(
        modifier = modifier
            .size(size)
            .background(color, CircleShape)
    )
}

/**
 * Mascota con mensajes rotativos para diferentes contextos
 * Mensajes mejorados con más personalidad y emojis
 */
@Composable
fun MaquiGuide(
    context: MaquiContext,
    modifier: Modifier = Modifier,
    onDismiss: () -> Unit = {}
) {
    var messageIndex by remember { mutableStateOf(0) }
    
    val messages = when (context) {
        MaquiContext.HOME -> listOf(
            "🎉 ¡Bienvenido a FactMary! Presiona 'Nueva Factura' para comenzar a vender.",
            "💡 ¿Sabías que? Puedes compartir facturas por WhatsApp o email en PDF.",
            "⚙️ Consejo: Configura tus datos en ajustes antes de emitir facturas.",
            "📊 Aquí ves todo: facturas, historial y catálogo de esponjas Maqui Mary.",
            "🧽 ¡Estoy aquí para ayudarte! Toca la burbuja para más consejos."
        )
        MaquiContext.DASHBOARD -> listOf(
            "📊 ¡Bienvenido al Dashboard! Aquí ves todas tus estadísticas de ventas.",
            "💰 El total muestra tus ventas desde el inicio. ¡Sigue creciendo!",
            "📈 El gráfico te muestra cómo van tus ventas mes a mes.",
            "🎯 ¿Bajo stock? Te aviso cuando necesites reponer productos.",
            "⚡ Usa los accesos rápidos para navegar más rápido."
        )
        MaquiContext.CREATE_INVOICE -> listOf(
            "👤 Paso 1: Verifica los datos del cliente. ¿Todo correcto?",
            "🛒 Paso 2: Agrega productos desde el catálogo de esponjas.",
            "📝 ¿No encuentras el producto? Escribe la descripción manualmente.",
            "💰 Paso 3: Revisa los totales: subtotal, IGV (18%) y total.",
            "✅ ¡Listo! Presiona 'Emitir Factura' para guardar en tu historial."
        )
        MaquiContext.CUSTOMER_LIST -> listOf(
            "🔍 Busca clientes por nombre o RUC en la barra de arriba.",
            "➕ ¿Cliente nuevo? Presiona el botón + para agregarlo.",
            "💾 Los clientes se guardan automáticamente. ¡No los perderás!",
            "👥 Selecciona un cliente tocando su tarjeta."
        )
        MaquiContext.INVOICE_HISTORY -> listOf(
            "📜 Aquí están todas tus ventas. Toca una para ver detalles.",
            "📄 ¿Necesitas el PDF? Abre la factura y presiona el icono de descarga.",
            "✅ Las facturas se ordenan por fecha, las más recientes primero.",
            "🔄 ¿Factura pendiente de SUNAT? Se enviará automáticamente."
        )
        MaquiContext.PRODUCT_CATALOG -> listOf(
            "🌈 Estas son nuestras esponjas de colores. ¡Vibrantes y duraderas!",
            "⚙️ ¿Acero? Tenemos fino y grueso para limpieza profunda.",
            "🔄 Esponjas doble uso: suave de un lado, abrasiva del otro.",
            "📦 Paquetes especiales para mayoristas. ¡Buen negocio!"
        )
        MaquiContext.SETTINGS -> listOf(
            "🏢 Configura los datos de INVERSIONES MAQUI MARY PERU E.I.R.L.",
            "📝 Razón social, RUC y dirección aparecerán en todas tus facturas.",
            "📱 ¿Cambio de teléfono? Actualízalo aquí.",
            "☁️ Sincroniza con la nube para respaldar tus datos."
        )
    }
    
    val currentMessage = messages[messageIndex % messages.size]
    
    MaquiMascot(
        message = currentMessage,
        onDismiss = onDismiss,
        modifier = modifier,
        showHint = true,
        onClick = {
            messageIndex = (messageIndex + 1) % messages.size
        }
    )
}

/**
 * Contextos donde puede aparecer Maqui
 */
enum class MaquiContext {
    HOME,           // Pantalla principal
    DASHBOARD,      // Panel de control
    CREATE_INVOICE, // Creando factura
    CUSTOMER_LIST,  // Lista de clientes
    INVOICE_HISTORY,// Historial de facturas
    PRODUCT_CATALOG,// Catálogo de productos
    SETTINGS        // Configuración
}

/**
 * Versión mini de la mascota para usar como indicador flotante
 */
@Composable
fun MaquiMini(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )
    
    Box(
        modifier = modifier
            .scale(scale)
            .size(60.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xFFFFE135))
            .border(3.dp, Color(0xFFE6B800), RoundedCornerShape(18.dp))
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        // Carita simplificada pero expresiva
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .background(Color.White, CircleShape)
                        .border(2.dp, Color(0xFF2D3436), CircleShape)
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .background(Color(0xFF2D3436), CircleShape)
                            .align(Alignment.Center)
                    )
                }
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .background(Color.White, CircleShape)
                        .border(2.dp, Color(0xFF2D3436), CircleShape)
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .background(Color(0xFF2D3436), CircleShape)
                            .align(Alignment.Center)
                    )
                }
            }
            Spacer(modifier = Modifier.height(3.dp))
            Box(
                modifier = Modifier
                    .width(18.dp)
                    .height(6.dp)
                    .background(Color(0xFFE63946), RoundedCornerShape(0.dp, 0.dp, 9.dp, 9.dp))
            )
        }
        
        // Indicador de ayuda
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .offset(x = 4.dp, y = (-4).dp)
                .size(18.dp)
                .background(Color(0xFFE63946), CircleShape)
                .border(2.dp, Color.White, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.Help,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(12.dp)
            )
        }
    }
}

/**
 * Indicador de ayuda con Maqui - Botón FAB
 */
@Composable
fun MaquiHelpButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    FloatingActionButton(
        onClick = onClick,
        modifier = modifier.size(60.dp),
        containerColor = Color(0xFFFFE135),
        contentColor = Color(0xFF2D3436),
        shape = RoundedCornerShape(18.dp)
    ) {
        Icon(
            imageVector = Icons.AutoMirrored.Filled.Help,
            contentDescription = "Ayuda",
            modifier = Modifier.size(28.dp)
        )
    }
}
