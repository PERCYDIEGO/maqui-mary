package com.factumary.data.ose.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Request para enviar una factura/boleta al OSE (formato compatible Nubefact y similares)
 */
@Serializable
data class OseInvoiceRequest(
    @SerialName("operacion") val operation: String = "generar_comprobante",
    @SerialName("tipo_de_comprobante") val documentType: Int = 1, // 1=Factura, 2=Boleta
    @SerialName("serie") val series: String,
    @SerialName("numero") val number: Long,
    @SerialName("sunat_transaction") val sunatTransaction: Int = 1, // 1=Venta interna
    @SerialName("cliente_tipo_de_documento") val clientDocType: String = "6", // 6=RUC
    @SerialName("cliente_numero_de_documento") val clientDocNumber: String,
    @SerialName("cliente_denominacion") val clientName: String,
    @SerialName("cliente_direccion") val clientAddress: String = "",
    @SerialName("cliente_email") val clientEmail: String = "",
    @SerialName("cliente_telefono") val clientPhone: String = "",
    @SerialName("fecha_de_emision") val issueDate: String, // dd-MM-yyyy
    @SerialName("fecha_de_vencimiento") val dueDate: String = "",
    @SerialName("moneda") val currency: Int = 1, // 1=SOLES
    @SerialName("tipo_de_cambio") val exchangeRate: String = "",
    @SerialName("porcentaje_de_igv") val igvPercent: Double = 18.0,
    @SerialName("descuento_global") val globalDiscount: String = "",
    @SerialName("total_descuento") val totalDiscount: String = "",
    @SerialName("total_anticipo") val totalAdvance: String = "",
    @SerialName("total_gravada") val taxableAmount: Double,
    @SerialName("total_inafecta") val nonTaxableAmount: String = "",
    @SerialName("total_exonerada") val exoneratedAmount: String = "",
    @SerialName("total_igv") val igvAmount: Double,
    @SerialName("total_gratuita") val freeAmount: String = "",
    @SerialName("total_otros_cargos") val otherCharges: String = "",
    @SerialName("total") val totalAmount: Double,
    @SerialName("percepcion_tipo") val perceptionType: String = "",
    @SerialName("percepcion_base_imponible") val perceptionBase: String = "",
    @SerialName("total_percepcion") val totalPerception: String = "",
    @SerialName("total_incluido_percepcion") val totalWithPerception: String = "",
    @SerialName("detraccion") val detraccion: Boolean = false,
    @SerialName("observaciones") val notes: String = "",
    @SerialName("documento_que_se_modifica_tipo") val modifiedDocType: String = "",
    @SerialName("documento_que_se_modifica_serie") val modifiedDocSeries: String = "",
    @SerialName("documento_que_se_modifica_numero") val modifiedDocNumber: String = "",
    @SerialName("enviar_automaticamente_a_la_sunat") val autoSendSunat: Boolean = true,
    @SerialName("enviar_automaticamente_al_cliente") val autoSendClient: Boolean = false,
    @SerialName("codigo_unico") val uniqueCode: String = "",
    @SerialName("condiciones_de_pago") val paymentTerms: String = "",
    @SerialName("medio_de_pago") val paymentMethod: String = "",
    @SerialName("placa_vehiculo") val vehiclePlate: String = "",
    @SerialName("orden_compra_servicio") val purchaseOrder: String = "",
    @SerialName("tabla_personalizada_codigo") val customTableCode: String = "",
    @SerialName("formato_de_pdf") val pdfFormat: String = "",
    @SerialName("items") val items: List<OseInvoiceItem>
)

@Serializable
data class OseInvoiceItem(
    @SerialName("unidad_de_medida") val unitOfMeasure: String = "NIU", // NIU=Unidad
    @SerialName("codigo") val code: String = "",
    @SerialName("descripcion") val description: String,
    @SerialName("cantidad") val quantity: Double,
    @SerialName("valor_unitario") val unitValue: Double, // Sin IGV
    @SerialName("precio_unitario") val unitPrice: Double, // Con IGV
    @SerialName("descuento") val discount: String = "",
    @SerialName("subtotal") val subtotal: Double, // Sin IGV
    @SerialName("tipo_de_igv") val igvType: Int = 1, // 1=Gravado
    @SerialName("igv") val igv: Double,
    @SerialName("total") val total: Double, // Con IGV
    @SerialName("anticipo_regularizacion") val advanceRegularization: String = "",
    @SerialName("anticipo_documento_serie") val advanceDocSeries: String = "",
    @SerialName("anticipo_documento_numero") val advanceDocNumber: String = ""
)

/**
 * Response exitoso del OSE
 */
@Serializable
data class OseInvoiceResponse(
    @SerialName("tipo_de_comprobante") val documentType: String = "",
    @SerialName("serie") val series: String = "",
    @SerialName("numero") val number: Long = 0,
    @SerialName("enlace") val link: String = "", // URL del PDF
    @SerialName("aceptada_por_sunat") val acceptedBySunat: Boolean = false,
    @SerialName("sunat_description") val sunatDescription: String = "",
    @SerialName("sunat_note") val sunatNote: String = "",
    @SerialName("sunat_responsecode") val sunatResponseCode: String = "",
    @SerialName("sunat_soap_error") val sunatSoapError: String = "",
    @SerialName("cadena_para_codigo_qr") val qrString: String = "",
    @SerialName("codigo_hash") val hashCode: String = "",
    @SerialName("enlace_del_pdf") val pdfLink: String = "",
    @SerialName("enlace_del_xml") val xmlLink: String = "",
    @SerialName("enlace_del_cdr") val cdrLink: String = "",
    @SerialName("respuesta") val response: String = ""
)

/**
 * Response de error del OSE
 */
@Serializable
data class OseErrorResponse(
    @SerialName("errors") val errors: String = ""
)

/**
 * Configuración del OSE (token, URL base y ruta del endpoint)
 */
data class OseConfig(
    val apiToken: String,
    val baseUrl: String,
    val endpointPath: String
)
