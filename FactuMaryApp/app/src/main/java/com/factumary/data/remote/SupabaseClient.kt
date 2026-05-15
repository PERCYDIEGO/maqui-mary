package com.factumary.data.remote

import com.factumary.data.db.entity.CustomerEntity
import com.factumary.data.db.entity.InvoiceEntity
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.postgrest
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.booleanOrNull

@Serializable
data class ClienteDto(
    val id: Long = 0,
    val name: String,
    val tipo_documento: String = "6",
    val num_documento: String = "",
    val dni: String = "",
    val address: String = "",
    val phone: String = "",
    val email: String = ""
)

@Serializable
data class FacturaDto(
    val id: Long = 0,
    val series: String = "F001",
    val number: Long = 0,
    val cliente_id: Long = 0,
    val cliente_nombre: String = "",
    val cliente_ruc: String = "",
    val cliente_direccion: String = "",
    val date_millis: Long = 0,
    val subtotal: Double = 0.0,
    val igv: Double = 0.0,
    val total: Double = 0.0,
    val notes: String = ""
)

@Serializable
data class FacturaInsertDto(
    val series: String = "F001",
    val number: Long = 0,
    val cliente_id: Long? = null,
    val cliente_nombre: String = "",
    val cliente_ruc: String = "",
    val cliente_direccion: String = "",
    val date_millis: Long = 0,
    val subtotal: Double = 0.0,
    val igv: Double = 0.0,
    val total: Double = 0.0,
    val notes: String = "",
    val tipo_comprobante: String = "01", // 01=Factura, 03=Boleta
    val origen: String = "mobile",
    val estado_sunat: String = "PENDIENTE",
    val hash: String = "",
    val cdr_codigo: String = "",
    val cdr_descripcion: String = ""
)

@Serializable
data class ConfiguracionDto(
    val id: Int = 1,
    val company_name: String = "ES PONJAS MAQUI MARY",
    val ruc: String = "10456789012",
    val address: String = "Calle Las Quebradas Mz E Lote 10, Ate Vitarte",
    val phone: String = "(51) 949 446 676",
    val series: String = "F001",
    val next_number: Long = 1
)

@Serializable
data class ProductoDto(
    val id: Long = 0,
    val name: String,
    val description: String = "",
    val price: Double = 0.0,
    val category: String = "",
    val color_info: String = "",
    val stock: Int = 0,
    val is_active: Boolean = true,
    val created_at: String = "",
    val updated_at: String = ""
)

@Serializable
data class UserProfileDto(
    val id: String = "",
    val email: String = "",
    val role: String = "viewer", // admin, editor, viewer
    val nombre: String = "",
    val alias: String = "",
    val force_password_change: Boolean = false,
    val created_at: String = ""
)

object SupabaseClientProvider {
    private const val SUPABASE_URL = "https://ofemdngaslpdexsqfcbb.supabase.co"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZW1kbmdhc2xwZGV4c3FmY2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzEyODUsImV4cCI6MjA5NDAwNzI4NX0.q5aetvduv8ovj7PyIHN_YqfGQTddJxbQEWYRmyPeIHM"

    val client = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_ANON_KEY
    ) {
        install(Auth)
        install(Postgrest)
    }

    /**
     * Si el input es un alias (no contiene @), busca el email en la web.
     * Si es email, lo usa directo.
     */
    suspend fun resolveAliasOrEmail(input: String): Result<String> {
        if (input.contains("@")) {
            return Result.success(input.trim())
        }

        return try {
            val httpClient = HttpClient(Android)
            val response = httpClient.post("https://maquimary.vercel.app/api/auth/resolve-alias") {
                contentType(ContentType.Application.Json)
                setBody("""{"alias":"${input.trim()}"}""")
            }

            val body = response.bodyAsText()
            val json = Json.parseToJsonElement(body).jsonObject

            if (json["ok"]?.jsonPrimitive?.booleanOrNull == true) {
                Result.success(json["email"]?.jsonPrimitive?.content ?: "")
            } else {
                Result.failure(Exception(json["error"]?.jsonPrimitive?.content ?: "Alias no encontrado"))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Error buscando alias: ${e.message}"))
        }
    }

    suspend fun login(email: String, password: String): Result<String> {
        return try {
            client.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            Result.success("Login exitoso")
        } catch (e: Exception) {
            val msg = e.message ?: "Error desconocido"
            // Si es 400 Invalid login, dar mensaje claro
            if (msg.contains("Invalid login", ignoreCase = true) || msg.contains("400", ignoreCase = true)) {
                Result.failure(Exception("Email o contraseña incorrectos. Si es tu primera vez, usa 'Crear cuenta'."))
            } else {
                Result.failure(Exception("Error: $msg"))
            }
        }
    }

    suspend fun signUp(email: String, password: String): Result<String> {
        return try {
            client.auth.signUpWith(Email) {
                this.email = email
                this.password = password
            }
            Result.success("Cuenta creada. Ahora puedes iniciar sesión.")
        } catch (e: Exception) {
            Result.failure(Exception("Error al crear cuenta: ${e.message}"))
        }
    }

    suspend fun logout() {
        try {
            client.auth.signOut()
        } catch (_: Exception) { }
    }

    fun isLoggedIn(): Boolean = client.auth.currentSessionOrNull() != null

    suspend fun fetchClientes(): Result<List<CustomerEntity>> {
        return try {
            val dtos = client.postgrest["clientes"]
                .select()
                .decodeList<ClienteDto>()
            val entities = dtos.map { dto ->
                CustomerEntity(
                    id = dto.id,
                    name = dto.name,
                    tipoDocumento = dto.tipo_documento,
                    numDocumento = dto.num_documento,
                    dni = dto.dni,
                    address = dto.address,
                    phone = dto.phone,
                    email = dto.email
                )
            }
            Result.success(entities)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun syncInvoiceToSupabase(invoice: InvoiceEntity): Result<Unit> {
        return try {
            val dto = FacturaInsertDto(
                series = invoice.series,
                number = invoice.number,
                cliente_id = if (invoice.customerId > 0) invoice.customerId else null,
                cliente_nombre = invoice.customerName,
                cliente_ruc = invoice.customerRuc,
                cliente_direccion = invoice.customerAddress,
                date_millis = invoice.createdAt,
                subtotal = invoice.subtotal,
                igv = invoice.igv,
                total = invoice.total,
                notes = invoice.notes,
                tipo_comprobante = invoice.tipoComprobante,
                estado_sunat = invoice.sunatStatus,
                hash = invoice.sunatHash,
                cdr_codigo = invoice.sunatCodigo,
                cdr_descripcion = invoice.sunatDescripcion
            )
            client.postgrest["facturas"].insert(dto)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun fetchConfiguracion(): Result<ConfiguracionDto> {
        return try {
            val configs = client.postgrest["configuracion"]
                .select()
                .decodeList<ConfiguracionDto>()
            val config = configs.firstOrNull()
                ?: return Result.failure(Exception("No hay configuración"))
            Result.success(config)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Obtiene productos desde Supabase (sincronización con la web)
     */
    suspend fun fetchProductos(): Result<List<ProductoDto>> {
        return try {
            val productos = client.postgrest["productos"]
                .select {
                    filter {
                        eq("is_active", true)
                    }
                }
                .decodeList<ProductoDto>()
            Result.success(productos)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Obtiene el perfil del usuario actual con su rol
     */
    suspend fun fetchUserProfile(): Result<UserProfileDto> {
        return try {
            val user = client.auth.currentUserOrNull()
                ?: return Result.failure(Exception("No hay usuario logueado"))
            
            val profiles = client.postgrest["profiles"]
                .select {
                    filter {
                        eq("id", user.id)
                    }
                }
                .decodeList<UserProfileDto>()
            
            val profile = profiles.firstOrNull()
                ?: return Result.failure(Exception("Perfil no encontrado"))
            
            Result.success(profile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Obtiene estadísticas de ventas para el dashboard
     */
    suspend fun fetchVentasStats(fechaInicio: Long, fechaFin: Long): Result<VentasStatsDto> {
        return try {
            val facturas = client.postgrest["facturas"]
                .select {
                    filter {
                        gte("date_millis", fechaInicio)
                        lte("date_millis", fechaFin)
                    }
                }
                .decodeList<FacturaDto>()
            
            val totalVentas = facturas.sumOf { it.total }
            val cantidadFacturas = facturas.size
            val promedioVenta = if (cantidadFacturas > 0) totalVentas / cantidadFacturas else 0.0
            
            // Agrupar por mes
            val ventasPorMes = facturas.groupBy { 
                val fecha = java.util.Date(it.date_millis)
                val cal = java.util.Calendar.getInstance()
                cal.time = fecha
                "${cal.get(java.util.Calendar.YEAR)}-${cal.get(java.util.Calendar.MONTH) + 1}"
            }.map { (mes, lista) ->
                VentaMesDto(mes, lista.size, lista.sumOf { it.total })
            }.sortedBy { it.mes }
            
            Result.success(VentasStatsDto(
                totalVentas = totalVentas,
                cantidadFacturas = cantidadFacturas,
                promedioVenta = promedioVenta,
                ventasPorMes = ventasPorMes
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Obtiene la primera fecha de venta para calcular rango
     */
    suspend fun fetchPrimeraFechaVenta(): Result<Long> {
        return try {
            val facturas = client.postgrest["facturas"]
                .select {
                    order("date_millis", io.github.jan.supabase.postgrest.query.Order.ASCENDING)
                    limit(1)
                }
                .decodeList<FacturaDto>()
            
            val primeraFecha = facturas.firstOrNull()?.date_millis 
                ?: System.currentTimeMillis()
            Result.success(primeraFecha)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Envía una factura para aprobación en el CRM
     */
    suspend fun enviarFacturaParaAprobacion(dto: com.factumary.data.repository.FacturaParaAprobacionDto): Result<String> {
        return try {
            val result = client.postgrest["facturas_pendientes"]
                .insert(dto)
            
            // Obtener el ID generado
            val inserted = result.decodeList<FacturaInsertResponse>()
            val supabaseId = inserted.firstOrNull()?.id?.toString() ?: ""
            
            Result.success(supabaseId)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Consulta el estado de una factura en proceso de aprobación
     */
    suspend fun consultarEstadoFactura(supabaseId: String): Result<com.factumary.data.repository.EstadoFacturaRemoto> {
        return try {
            val facturas = client.postgrest["facturas_pendientes"]
                .select {
                    filter {
                        eq("id", supabaseId.toInt())
                    }
                }
                .decodeList<FacturaPendienteDto>()
            
            val factura = facturas.firstOrNull()
                ?: return Result.failure(Exception("Factura no encontrada"))
            
            val estadoRemoto = com.factumary.data.repository.EstadoFacturaRemoto(
                aprobacion_status = factura.aprobacion_status,
                aprobado_por = factura.aprobado_por,
                aprobado_por_name = factura.aprobado_por_name,
                aprobado_at = factura.aprobado_at,
                rechazo_razon = factura.rechazo_razon,
                sunat_status = factura.sunat_status ?: "PENDIENTE",
                sunat_codigo = factura.sunat_codigo,
                sunat_descripcion = factura.sunat_descripcion,
                sunat_hash = factura.sunat_hash,
                sunat_xml_url = factura.sunat_xml_url,
                sunat_cdr_url = factura.sunat_cdr_url,
                sunat_error = factura.sunat_error,
                sunat_sent_at = factura.sunat_sent_at
            )
            
            Result.success(estadoRemoto)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

@Serializable
data class FacturaInsertResponse(
    val id: Int
)

@Serializable
data class FacturaPendienteDto(
    val id: Int,
    val aprobacion_status: String,
    val aprobado_por: String? = null,
    val aprobado_por_name: String? = null,
    val aprobado_at: Long? = null,
    val rechazo_razon: String? = null,
    val sunat_status: String? = null,
    val sunat_codigo: String? = null,
    val sunat_descripcion: String? = null,
    val sunat_hash: String? = null,
    val sunat_xml_url: String? = null,
    val sunat_cdr_url: String? = null,
    val sunat_error: String? = null,
    val sunat_sent_at: Long? = null
)

@Serializable
data class VentaMesDto(
    val mes: String,
    val cantidad: Int,
    val total: Double
)

@Serializable
data class VentasStatsDto(
    val totalVentas: Double,
    val cantidadFacturas: Int,
    val promedioVenta: Double,
    val ventasPorMes: List<VentaMesDto>
)
