package com.factumary.data.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "customers")
data class CustomerEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val tipoDocumento: String = "6", // 6=RUC, 1=DNI, 0=Otros
    val numDocumento: String = "", // RUC o DNI según tipo
    val dni: String = "", // DNI del representante legal (cuando es empresa con RUC)
    val address: String = "",
    val phone: String = "",
    val email: String = ""
)
