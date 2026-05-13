package com.factumary.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.factumary.data.db.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {

    @Query("SELECT * FROM products WHERE isActive = 1 ORDER BY category, name")
    fun getAllActive(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE isActive = 1 ORDER BY category, name")
    suspend fun getAllActiveList(): List<ProductEntity>

    @Query("SELECT * FROM products ORDER BY category, name")
    suspend fun getAll(): List<ProductEntity>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getById(id: Long): ProductEntity?

    @Query("SELECT * FROM products WHERE category = :category AND isActive = 1 ORDER BY name")
    fun getByCategory(category: String): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(products: List<ProductEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(product: ProductEntity): Long

    @Query("UPDATE products SET isActive = 0 WHERE id = :id")
    suspend fun deactivate(id: Long)

    @Query("UPDATE products SET stock = stock - :cantidad WHERE id = :id AND stock >= :cantidad")
    suspend fun decrementStock(id: Long, cantidad: Int): Int

    @Query("UPDATE products SET stock = stock + :cantidad WHERE id = :id")
    suspend fun incrementStock(id: Long, cantidad: Int): Int

    @Query("SELECT * FROM products WHERE isActive = 1 AND stock < 50 ORDER BY stock ASC")
    suspend fun getLowStock(): List<ProductEntity>

    @Query("SELECT COUNT(*) FROM products")
    suspend fun count(): Int
}
