package com.factumary.data.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Entidad de Factura con estados de aprobación y envío a SUNAT
 * 
 * Flujo de estados:
 * POR_APROBAR → APROBADO → PENDIENTE → ENVIADO → ACEPTADO/RECHAZADO/ERROR
 *            ↳ RECHAZADO_LOCAL
 */
@Entity(tableName = "invoices")
data class InvoiceEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val series: String = "F001",
    val number: Long = 0,
    val tipoComprobante: String = "01", // 01=Factura, 03=Boleta
    val customerId: Long = 0,
    val customerName: String = "",
    val customerRuc: String = "",
    val customerAddress: String = "",
    val customerTipoDoc: String = "6", // 6=RUC, 1=DNI, 0=Sin identificar
    val dateMillis: Long = System.currentTimeMillis(),
    val subtotal: Double = 0.0,
    val igv: Double = 0.0,
    val total: Double = 0.0,
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val createdBy: String = "", // ID del usuario que creó la factura
    val createdByName: String = "", // Nombre del vendedor
    
    // Estado de aprobación antes de enviar a SUNAT
    val aprobacionStatus: String = "POR_APROBAR", // POR_APROBAR, APROBADO, RECHAZADO_LOCAL
    val aprobadoPor: String = "", // ID del admin que aprobó
    val aprobadoPorName: String = "", // Nombre del admin
    val aprobadoAt: Long = 0, // Timestamp de aprobación
    val rechazoRazon: String = "", // Razón del rechazo local
    
    // Estado de envío a SUNAT
    val sunatStatus: String = "PENDIENTE", // PENDIENTE, ENVIADO, ACEPTADO, RECHAZADO, ERROR
    val sunatCodigo: String = "", // Código de respuesta SUNAT
    val sunatDescripcion: String = "", // Descripción de respuesta SUNAT
    val sunatHash: String = "", // Hash del comprobante
    val sunatXmlUrl: String = "", // URL o base64 del XML
    val sunatCdrUrl: String = "", // URL o base64 del CDR
    val sunatError: String = "", // Mensaje de error si falló
    val sunatSentAt: Long = 0, // Timestamp del envío a SUNAT
    
    // Sincronización
    val supabaseSynced: Boolean = false,
    val syncedAt: Long = 0,
    val supabaseId: String = "", // ID en Supabase
    
    // Legacy OSE (mantener compatibilidad)
    val oseStatus: String = "PENDING",
    val oseTicket: String = "",
    val oseCdr: String = "",
    val oseErrorMessage: String = "",
    val oseSyncedAt: Long = 0
) {
    // Estados de aprobación local
    object AprobacionStatus {
        const val POR_APROBAR = "POR_APROBAR"      // Creada, esperando aprobación admin
        const val APROBADO = "APROBADO"            // Aprobada, lista para enviar a SUNAT
        const val RECHAZADO_LOCAL = "RECHAZADO_LOCAL" // Rechazada en el CRM (no se envía)
    }
    
    // Estados de SUNAT
    object SunatStatus {
        const val PENDIENTE = "PENDIENTE"          // Aprobada local, esperando envío a SUNAT
        const val ENVIADO = "ENVIADO"              // Enviada a SUNAT, esperando respuesta
        const val ACEPTADO = "ACEPTADO"            // SUNAT aceptó la factura
        const val RECHAZADO = "RECHAZADO"          // SUNAT rechazó la factura
        const val ERROR = "ERROR"                  // Error en el envío
    }

    // Estados legacy OSE
    object OseStatus {
        const val PENDING = "PENDING"
        const val SENT = "SENT"
        const val ACCEPTED = "ACCEPTED"
        const val REJECTED = "REJECTED"
        const val ERROR = "ERROR"
    }
    
    /**
     * Retorna el estado visual para mostrar en la UI
     */
    fun getEstadoVisual(): EstadoVisual {
        return when {
            // Prioridad 1: Estados de aprobación local
            aprobacionStatus == AprobacionStatus.POR_APROBAR -> 
                EstadoVisual.ESPERANDO_APROBACION
            aprobacionStatus == AprobacionStatus.RECHAZADO_LOCAL -> 
                EstadoVisual.RECHAZADO_LOCAL
            
            // Prioridad 2: Estados de SUNAT
            sunatStatus == SunatStatus.ACEPTADO -> 
                EstadoVisual.ACEPTADO_SUNAT
            sunatStatus == SunatStatus.RECHAZADO -> 
                EstadoVisual.RECHAZADO_SUNAT
            sunatStatus == SunatStatus.ERROR -> 
                EstadoVisual.ERROR_SUNAT
            sunatStatus == SunatStatus.ENVIADO -> 
                EstadoVisual.ENVIADO_SUNAT
            
            // Prioridad 3: Aprobada pero pendiente de envío
            aprobacionStatus == AprobacionStatus.APROBADO -> 
                EstadoVisual.APROBADO_PENDIENTE
            
            else -> EstadoVisual.PENDIENTE
        }
    }
    
    /**
     * Estados visuales para la UI
     */
    enum class EstadoVisual {
        ESPERANDO_APROBACION,   // ⏳ Esperando que admin apruebe
        RECHAZADO_LOCAL,        // ❌ Rechazado en CRM (no va a SUNAT)
        APROBADO_PENDIENTE,     // ✅ Aprobado, esperando envío a SUNAT
        ENVIADO_SUNAT,          // 📤 Enviado a SUNAT
        ACEPTADO_SUNAT,         // ✓ Aceptado por SUNAT
        RECHAZADO_SUNAT,        // ✗ Rechazado por SUNAT
        ERROR_SUNAT,            // ⚠️ Error al enviar
        PENDIENTE               // 🕐 Pendiente
    }
}
