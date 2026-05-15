package com.factumary.data.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "guias_remision")
data class GuiaRemisionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val series: String = "G001",
    val number: Long = 0,
    val fechaEmision: Long = System.currentTimeMillis(),
    val fechaInicioTraslado: Long = System.currentTimeMillis(),
    val motivoTraslado: String = "venta",
    val documentoRelacionadoId: Long? = null,
    val documentoRelacionadoTipo: String? = null,
    val documentoRelacionadoNumero: String? = null,
    val destinatarioNombre: String = "",
    val destinatarioDniRuc: String = "",
    val destinatarioDireccion: String = "",
    val puntoPartida: String = "PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO - LURIGANCHO",
    val puntoLlegada: String = "",
    val pesoTotal: Double = 0.0,
    val transportistaId: Long? = null,
    val transportistaNombre: String = "",
    val transportistaDni: String = "",
    val transportistaLicencia: String = "",
    val transportistaPlaca: String = "",
    val itemsJson: String = "[]",
    val observaciones: String = "",
    val estado: String = "PENDIENTE",
    val createdAt: Long = System.currentTimeMillis(),
    val supabaseSynced: Boolean = false
) {
    val numeroCompleto: String get() = "$series-${"%03d".format(number)}"
}
