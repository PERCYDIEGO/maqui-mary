package com.factumary.ui.navigation

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Home : Screen("home")
    data object Dashboard : Screen("dashboard")
    data object CreateInvoice : Screen("create_invoice")
    data object CreateInvoiceWithCustomer : Screen("create_invoice/{customerId}") {
        fun passId(id: Long) = "create_invoice/$id"
    }
    data object InvoiceHistory : Screen("invoice_history")
    data object InvoiceDetail : Screen("invoice_detail/{invoiceId}") {
        fun passId(id: Long) = "invoice_detail/$id"
    }
    data object ProductCatalog : Screen("product_catalog")
    data object CustomerList : Screen("customer_list")
    data object AddCustomer : Screen("add_customer")
    // Tutorial eliminado - ahora usamos la mascota Maqui interactiva
    data object Settings : Screen("settings")
    data object TransportistaList : Screen("transportista_list")
    data object TransportistaForm : Screen("transportista_form/{transportistaId}") {
        fun passId(id: Long?) = "transportista_form/${id ?: -1}"
    }
    data object GuiaList : Screen("guia_list")
    data object GuiaForm : Screen("guia_form/{guiaId}") {
        fun passId(id: Long?) = "guia_form/${id ?: -1}"
    }
    data object CambiarContrasena : Screen("cambiar_contrasena")
    data object UserManagement : Screen("user_management")
    data object Documentos : Screen("documentos")
    data object Sunat : Screen("sunat")
    data object PedidosWeb : Screen("pedidos_web")
}
