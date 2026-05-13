package com.factumary.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = MarrónMedio,
    onPrimary = CremaClaro,
    primaryContainer = Crema,
    onPrimaryContainer = MarrónOscuro,
    secondary = NaranjaCálido,
    onSecondary = CremaClaro,
    secondaryContainer = Crema,
    onSecondaryContainer = MarrónOscuro,
    tertiary = VerdeSuave,
    onTertiary = CremaClaro,
    background = FondoClaro,
    onBackground = TextoOscuro,
    surface = SuperficieClaro,
    onSurface = TextoOscuro,
    surfaceVariant = Crema,
    onSurfaceVariant = TextoMedio,
    outline = MarrónClaro
)

@Composable
fun FactuMaryTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = FactuMaryTypography,
        content = content
    )
}
