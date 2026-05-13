package com.factumary.data.repository

import com.factumary.data.db.dao.ProductDao
import com.factumary.data.db.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

class ProductRepository(private val dao: ProductDao) {

    fun getAllActive(): Flow<List<ProductEntity>> = dao.getAllActive()

    suspend fun getAllActiveList(): List<ProductEntity> = dao.getAllActiveList()

    suspend fun getById(id: Long): ProductEntity? = dao.getById(id)

    fun getByCategory(category: String): Flow<List<ProductEntity>> = dao.getByCategory(category)

    suspend fun getLowStock(): List<ProductEntity> = dao.getLowStock()

    suspend fun save(product: ProductEntity): Long = dao.insert(product)

    suspend fun delete(id: Long) = dao.deactivate(id)
}
