package com.factumary

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.navigation.compose.rememberNavController
import com.factumary.data.remote.SupabaseClientProvider
import com.factumary.ui.navigation.NavGraph
import com.factumary.ui.theme.FactuMaryTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            FactuMaryTheme {
                val navController = rememberNavController()
                var userRole by remember { mutableStateOf<String?>(null) }
                var isLoading by remember { mutableStateOf(true) }
                
                // Verificar sesión y rol al iniciar
                LaunchedEffect(Unit) {
                    if (SupabaseClientProvider.isLoggedIn()) {
                        // Obtener rol del usuario
                        val result = SupabaseClientProvider.fetchUserProfile()
                        userRole = result.getOrNull()?.role ?: "editor"
                    }
                    isLoading = false
                }
                
                if (!isLoading) {
                    NavGraph(
                        navController = navController,
                        userRole = userRole ?: "editor"
                    )
                }
            }
        }
    }
}
