package com.factumary.data.repository

import com.factumary.data.db.dao.ProductDao
import com.factumary.data.db.entity.ProductEntity
import com.factumary.data.remote.SupabaseClientProvider
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class ProductRepositorySync(
    private val productDao: ProductDao
) {
    fun getAllActive(): Flow<List<ProductEntity>> = productDao.getAllActive()

    /**
     * Sincroniza productos desde Supabase (web) hacia la base local
     */
    suspend fun syncFromSupabase(): Result<Int> {
        return try {
            val result = SupabaseClientProvider.fetchProductos()
            result.fold(
                onSuccess = { productosDto ->
                    // Convertir DTOs a entidades locales
                    val productos = productosDto.map { dto ->
                        ProductEntity(
                            id = dto.id,
                            name = dto.name,
                            description = dto.description,
                            price = dto.price,
                            category = dto.category,
                            colorInfo = dto.color_info,
                            stock = dto.stock,
                            isActive = dto.is_active
                        )
                    }
                    
                    // Guardar en base de datos local
                    productDao.insertAll(productos)
                    Result.success(productos.size)
                },
                onFailure = { error ->
                    Result.failure(error)
                }
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Obtiene productos locales (fallback si no hay internet)
     */
    suspend fun getAllLocal(): List<ProductEntity> {
        return productDao.getAllActive().first()
    }

    suspend fun getById(id: Long): ProductEntity? {
        return productDao.getById(id)
    }

    suspend fun getLowStock(): List<ProductEntity> {
        return productDao.getLowStock()
    }
}
