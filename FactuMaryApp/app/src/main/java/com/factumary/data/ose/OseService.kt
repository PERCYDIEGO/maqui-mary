package com.factumary.data.ose

import android.content.Context
import android.content.SharedPreferences
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.db.entity.InvoiceItemEntity
import com.factumary.data.ose.model.OseConfig
import com.factumary.data.ose.model.OseErrorResponse
import com.factumary.data.ose.model.OseInvoiceItem
import com.factumary.data.ose.model.OseInvoiceRequest
import com.factumary.data.ose.model.OseInvoiceResponse
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.isSuccess
import kotlinx.serialization.json.Json
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Servicio para enviar comprobantes electrónicos al OSE (ej: Nubefact)
 * y obtener la respuesta de SUNAT.
 */
class OseService(private val context: Context) {

    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences("ose_config", Context.MODE_PRIVATE)
    }

    companion object {
        private const val PREF_TOKEN = "ose_api_token"
        private const val PREF_URL = "ose_base_url"
        private const val PREF_ENDPOINT = "ose_endpoint_path"
        private const val DEFAULT_URL = "https://api.nubefact.com/api/v1/" // URL por defecto de Nubefact
        private const val DEFAULT_ENDPOINT = "943e6f17a99a4339ab7d59306f920555" // Ejemplo Nubefact
    }

    /**
     * Guarda la configuración del OSE (token, URL base y ruta del endpoint)
     */
    fun saveConfig(token: String, baseUrl: String = DEFAULT_URL, endpointPath: String = DEFAULT_ENDPOINT) {
        prefs.edit()
            .putString(PREF_TOKEN, token)
            .putString(PREF_URL, baseUrl)
            .putString(PREF_ENDPOINT, endpointPath)
            .apply()
        OseHttpClient.reset()
    }

    /**
     * Obtiene la configuración actual del OSE
     */
    fun getConfig(): OseConfig? {
        val token = prefs.getString(PREF_TOKEN, null) ?: return null
        val url = prefs.getString(PREF_URL, DEFAULT_URL) ?: DEFAULT_URL
        val endpoint = prefs.getString(PREF_ENDPOINT, DEFAULT_ENDPOINT) ?: DEFAULT_ENDPOINT
        return OseConfig(token, url, endpoint)
    }

    /**
     * Verifica si hay configuración válida del OSE
     */
    fun isConfigured(): Boolean = getConfig() != null

    /**
     * Elimina la configuración del OSE
     */
    fun clearConfig() {
        prefs.edit().clear().apply()
        OseHttpClient.reset()
    }

    /**
     * Envía una factura al OSE para que la firme y envíe a SUNAT.
     * Retorna Result con la respuesta del OSE o el error.
     */
    suspend fun sendInvoice(
        invoice: InvoiceEntity,
        items: List<InvoiceItemEntity>
    ): Result<OseInvoiceResponse> {
        val config = getConfig() ?: return Result.failure(
            IllegalStateException("OSE no configurado. Ve a Ajustes y configura tu token de API.")
        )

        val client = OseHttpClient.get(config)
        val dateFormat = SimpleDateFormat("dd-MM-yyyy", Locale.getDefault())
        val issueDate = dateFormat.format(Date(invoice.dateMillis))

        // Mapear items de Room a modelo OSE
        val oseItems = items.map { item ->
            val unitValue = item.unitPrice / 1.18 // Precio sin IGV (valor unitario)
            val itemSubtotal = unitValue * item.quantity
            val itemIgv = itemSubtotal * 0.18
            OseInvoiceItem(
                description = item.description,
                quantity = item.quantity.toDouble(),
                unitValue = unitValue,
                unitPrice = item.unitPrice,
                subtotal = itemSubtotal,
                igv = itemIgv,
                total = item.total
            )
        }

        val request = OseInvoiceRequest(
            series = invoice.series,
            number = invoice.number,
            clientDocNumber = invoice.customerRuc,
            clientName = invoice.customerName,
            clientAddress = invoice.customerAddress,
            issueDate = issueDate,
            taxableAmount = invoice.subtotal,
            igvAmount = invoice.igv,
            totalAmount = invoice.total,
            notes = invoice.notes,
            items = oseItems
        )

        return try {
            val cleanEndpoint = config.endpointPath.trimStart('/')
            val response: HttpResponse = client.post(cleanEndpoint) {
                setBody(request)
            }

            if (response.status.isSuccess()) {
                val body: OseInvoiceResponse = response.body()
                Result.success(body)
            } else {
                val errorBody = response.body<String>()
                val error = try {
                    Json { ignoreUnknownKeys = true }.decodeFromString(OseErrorResponse.serializer(), errorBody)
                } catch (_: Exception) {
                    null
                }
                Result.failure(
                    OseException(
                        code = response.status.value,
                        message = error?.errors ?: "Error HTTP ${response.status.value}: $errorBody"
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(
                OseException(
                    code = -1,
                    message = "Error de red: ${e.message ?: e.javaClass.simpleName}"
                )
            )
        }
    }

    /**
     * Exception custom para errores del OSE
     */
    data class OseException(val code: Int, override val message: String) : Exception(message)
}
