package com.factumary.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.factumary.ui.screens.HomeScreen
import com.factumary.ui.screens.auth.CambiarContrasenaScreen
import com.factumary.ui.screens.auth.LoginScreen
import com.factumary.ui.screens.auth.UserManagementScreen
import com.factumary.ui.screens.customers.CustomerListScreen
import com.factumary.ui.screens.dashboard.DashboardScreen
import com.factumary.ui.screens.documentos.DocumentosScreen
import com.factumary.ui.screens.guias.GuiaFormScreen
import com.factumary.ui.screens.guias.GuiaListScreen
import com.factumary.ui.screens.invoice.CreateInvoiceScreen
import com.factumary.ui.screens.invoice.InvoiceDetailScreen
import com.factumary.ui.screens.invoice.InvoiceHistoryScreen
import com.factumary.ui.screens.pedidos.PedidosWebScreen
import com.factumary.ui.screens.products.ProductCatalogScreen
import com.factumary.ui.screens.settings.SettingsScreen
import com.factumary.ui.screens.sunat.SunatScreen
import com.factumary.ui.screens.transportistas.TransportistaFormScreen
import com.factumary.ui.screens.transportistas.TransportistaListScreen

@Composable
fun NavGraph(
    navController: NavHostController,
    userRole: String = "editor", // admin, editor, viewer
    startDestination: String = Screen.Dashboard.route
) {
    val isAdmin = userRole == "admin"
    
    NavHost(navController = navController, startDestination = startDestination) {

        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = { role ->
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onForcePasswordChange = {
                    navController.navigate(Screen.CambiarContrasena.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Dashboard.route) {
            DashboardScreen(
                onNavigateToInvoices = { navController.navigate(Screen.InvoiceHistory.route) },
                onNavigateToProducts = { navController.navigate(Screen.ProductCatalog.route) },
                onNavigateToCustomers = { navController.navigate(Screen.CustomerList.route) },
                onNavigateToDocumentos = { navController.navigate(Screen.Documentos.route) },
                onNavigateToSunat = { navController.navigate(Screen.Sunat.route) },
                onNavigateToTransportistas = { navController.navigate(Screen.TransportistaList.route) },
                onNavigateToGuias = { navController.navigate(Screen.GuiaList.route) },
                onBack = { 
                    if (navController.previousBackStackEntry != null) {
                        navController.popBackStack()
                    }
                }
            )
        }

        composable(Screen.Home.route) {
            HomeScreen(
                onNewInvoice = { navController.navigate(Screen.CustomerList.route) },
                onInvoiceHistory = { navController.navigate(Screen.InvoiceHistory.route) },
                onProductCatalog = { navController.navigate(Screen.ProductCatalog.route) },
                onSettings = { navController.navigate(Screen.Settings.route) },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Dashboard.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.CustomerList.route) {
            CustomerListScreen(
                onCustomerSelected = { customerId ->
                    navController.navigate(Screen.CreateInvoiceWithCustomer.passId(customerId))
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.CreateInvoiceWithCustomer.route,
            arguments = listOf(navArgument("customerId") { type = NavType.LongType })
        ) { backStackEntry ->
            val customerId = backStackEntry.arguments?.getLong("customerId") ?: 0L
            CreateInvoiceScreen(
                customerId = customerId,
                onBack = { navController.popBackStack() },
                onInvoiceCreated = { invoiceId ->
                    navController.navigate(Screen.InvoiceDetail.passId(invoiceId)) {
                        popUpTo(Screen.Dashboard.route)
                    }
                }
            )
        }

        composable(
            route = Screen.InvoiceDetail.route,
            arguments = listOf(navArgument("invoiceId") { type = NavType.LongType })
        ) { backStackEntry ->
            val invoiceId = backStackEntry.arguments?.getLong("invoiceId") ?: 0L
            InvoiceDetailScreen(
                invoiceId = invoiceId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.InvoiceHistory.route) {
            InvoiceHistoryScreen(
                onInvoiceClick = { invoiceId ->
                    navController.navigate(Screen.InvoiceDetail.passId(invoiceId))
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.ProductCatalog.route) {
            ProductCatalogScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Settings.route) {
            SettingsScreen(onBack = { navController.popBackStack() })
        }

        // === Transportistas ===
        composable(Screen.TransportistaList.route) {
            TransportistaListScreen(
                onBack = { navController.popBackStack() },
                onNavigateToForm = { id ->
                    navController.navigate(Screen.TransportistaForm.passId(id))
                }
            )
        }

        composable(
            route = Screen.TransportistaForm.route,
            arguments = listOf(navArgument("transportistaId") {
                type = NavType.LongType
                defaultValue = -1L
            })
        ) { backStackEntry ->
            val transportistaId = backStackEntry.arguments?.getLong("transportistaId") ?: -1L
            TransportistaFormScreen(
                transportistaId = if (transportistaId == -1L) null else transportistaId,
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() }
            )
        }

        // === Guías de Remisión ===
        composable(Screen.GuiaList.route) {
            GuiaListScreen(
                onBack = { navController.popBackStack() },
                onNavigateToForm = { id ->
                    navController.navigate(Screen.GuiaForm.passId(id))
                }
            )
        }

        composable(
            route = Screen.GuiaForm.route,
            arguments = listOf(navArgument("guiaId") {
                type = NavType.LongType
                defaultValue = -1L
            })
        ) { backStackEntry ->
            val guiaId = backStackEntry.arguments?.getLong("guiaId") ?: -1L
            GuiaFormScreen(
                guiaId = if (guiaId == -1L) null else guiaId,
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() }
            )
        }

        // === Cambiar Contraseña ===
        composable(Screen.CambiarContrasena.route) {
            CambiarContrasenaScreen(
                onSuccess = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.CambiarContrasena.route) { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }

        // === Usuarios ===
        composable(Screen.UserManagement.route) {
            UserManagementScreen(
                onBack = { navController.popBackStack() },
                isAdmin = isAdmin
            )
        }

        // === Documentos Unificados ===
        composable(Screen.Documentos.route) {
            DocumentosScreen(
                onBack = { navController.popBackStack() },
                onNavigateToForm = { tipo, id ->
                    when (tipo) {
                        "boleta", "factura" -> {
                            if (id != null) navController.navigate(Screen.InvoiceDetail.passId(id))
                            else navController.navigate(Screen.CustomerList.route)
                        }
                        "guia" -> navController.navigate(Screen.GuiaForm.passId(id))
                    }
                }
            )
        }

        // === SUNAT ===
        composable(Screen.Sunat.route) {
            SunatScreen(
                onBack = { navController.popBackStack() },
                onNavigateToDetail = { id ->
                    navController.navigate(Screen.InvoiceDetail.passId(id))
                }
            )
        }

        // === Pedidos Web ===
        composable(Screen.PedidosWeb.route) {
            PedidosWebScreen(onBack = { navController.popBackStack() })
        }
    }
}
