package com.factumary.data.sunat

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Servicio que usa la web de Maqui Mary como proxy para emitir
 * comprobantes electrónicos a SUNAT.
 * POST https://maquimary.vercel.app/api/sunat/emit
 */
class SunatApiService {

    private val client = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; isLenient = true })
        }
        install(Logging) {
            level = LogLevel.ALL
        }
    }

    private val baseUrl = "https://maquimary.vercel.app"

    /**
     * Emite una factura o boleta electrónica vía el endpoint de la web.
     */
    suspend fun emitir(
        request: EmitRequest
    ): Result<EmitResponse> {
        return try {
            val response: HttpResponse = client.post("$baseUrl/api/sunat/emit") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }

            if (response.status.isSuccess()) {
                val body: EmitResponse = response.body()
                if (body.ok) {
                    Result.success(body)
                } else {
                    Result.failure(Exception(body.error ?: "Error desconocido del servidor"))
                }
            } else {
                val errorText = response.body<String>()
                Result.failure(Exception("HTTP ${response.status.value}: $errorText"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Error de red: ${e.message ?: e.javaClass.simpleName}"))
        }
    }
}

// ═══════════════════════════════════════════
// Request / Response DTOs
// ═══════════════════════════════════════════

@Serializable
data class EmitRequest(
    val cliente_id: Long? = null,
    val cliente_nombre: String = "",
    val cliente_ruc: String = "",
    val cliente_tipo_doc: String = "6", // 6=RUC, 1=DNI, 0=Sin identificar
    val cliente_direccion: String = "",
    val tipo_comprobante: String = "01", // 01=Factura, 03=Boleta
    val sin_identificar: Boolean = false,
    val items: List<EmitItem> = emptyList(),
    val notes: String = "",
    val origen: String = "mobile",
    val forma_pago: String = "contado",
    val moneda: String = "PEN",
    val tipo_cambio: String = "",
    val guia_remision: String = "",
    val orden_compra: String = ""
)

@Serializable
data class EmitItem(
    val producto_id: Long? = null,
    val codigo: String = "",
    val description: String,
    val quantity: Int,
    val unit_price: Double
)

@Serializable
data class EmitResponse(
    val ok: Boolean = false,
    val error: String? = null,
    val factura: FacturaResponse? = null,
    val estado_sunat: String = "PENDIENTE",
    val modo: String = "",
    val mensaje: String = "",
    val error_ose: String? = null
)

@Serializable
data class FacturaResponse(
    val id: Long = 0,
    val series: String = "",
    val number: Long = 0,
    val tipo_comprobante: String = "",
    val cliente_nombre: String = "",
    val cliente_ruc: String = "",
    val subtotal: Double = 0.0,
    val igv: Double = 0.0,
    val total: Double = 0.0,
    val estado_sunat: String = "",
    val hash: String? = null,
    val cdr_codigo: String? = null,
    val cdr_descripcion: String? = null,
    val pdf_url: String? = null,
    val xml_url: String? = null,
    val created_at: String? = null
)
