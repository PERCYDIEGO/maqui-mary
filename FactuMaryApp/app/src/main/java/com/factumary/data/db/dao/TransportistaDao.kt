package com.factumary.data.db.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.factumary.data.db.entity.TransportistaEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TransportistaDao {

    @Query("SELECT * FROM transportistas ORDER BY nombres ASC")
    fun getAll(): Flow<List<TransportistaEntity>>

    @Query("SELECT * FROM transportistas ORDER BY nombres ASC")
    suspend fun getAllList(): List<TransportistaEntity>

    @Query("SELECT * FROM transportistas WHERE id = :id")
    suspend fun getById(id: Long): TransportistaEntity?

    @Query("SELECT * FROM transportistas WHERE activo = 1 ORDER BY nombres ASC")
    fun getActivos(): Flow<List<TransportistaEntity>>

    @Query("SELECT * FROM transportistas WHERE nombres LIKE '%' || :query || '%' OR apellidos LIKE '%' || :query || '%' OR dni LIKE '%' || :query || '%' OR numeroPlaca LIKE '%' || :query || '%'")
    fun search(query: String): Flow<List<TransportistaEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(transportista: TransportistaEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(transportistas: List<TransportistaEntity>)

    @Query("DELETE FROM transportistas")
    suspend fun deleteAll()

    @Update
    suspend fun update(transportista: TransportistaEntity)

    @Delete
    suspend fun delete(transportista: TransportistaEntity)
}
