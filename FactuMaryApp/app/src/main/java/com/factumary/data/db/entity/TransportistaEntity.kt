package com.factumary.data.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "transportistas")
data class TransportistaEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val nombres: String,
    val apellidos: String = "",
    val dni: String = "",
    val licenciaConducir: String = "",
    val numeroPlaca: String = "",
    val activo: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
) {
    val nombreCompleto: String get() = "$nombres $apellidos".trim()
}
