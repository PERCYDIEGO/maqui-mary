package com.factumary.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.factumary.ui.screens.HomeScreen
import com.factumary.ui.screens.auth.LoginScreen
import com.factumary.ui.screens.customers.CustomerListScreen
import com.factumary.ui.screens.dashboard.DashboardScreen
import com.factumary.ui.screens.invoice.CreateInvoiceScreen
import com.factumary.ui.screens.invoice.InvoiceDetailScreen
import com.factumary.ui.screens.invoice.InvoiceHistoryScreen
import com.factumary.ui.screens.products.ProductCatalogScreen
import com.factumary.ui.screens.settings.SettingsScreen

@Composable
fun NavGraph(
    navController: NavHostController,
    userRole: String = "editor" // admin, editor, viewer
) {
    val isAdmin = userRole == "admin"
    val isEditor = userRole == "editor" || isAdmin
    
    NavHost(navController = navController, startDestination = Screen.Dashboard.route) {

        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = { role ->
                    navController.navigate(Screen.Dashboard.route) {
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
    }
}
