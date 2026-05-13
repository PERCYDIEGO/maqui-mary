package com.factumary.data.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val description: String = "",
    val price: Double,
    val category: String,
    val colorInfo: String = "",
    val stock: Int = 0,
    val isActive: Boolean = true
)
