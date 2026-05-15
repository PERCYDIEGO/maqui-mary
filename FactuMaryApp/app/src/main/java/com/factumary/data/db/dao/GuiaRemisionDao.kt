package com.factumary.data.db.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.factumary.data.db.entity.GuiaRemisionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GuiaRemisionDao {

    @Query("SELECT * FROM guias_remision ORDER BY number DESC")
    fun getAll(): Flow<List<GuiaRemisionEntity>>

    @Query("SELECT * FROM guias_remision ORDER BY number DESC")
    suspend fun getAllList(): List<GuiaRemisionEntity>

    @Query("SELECT * FROM guias_remision WHERE id = :id")
    suspend fun getById(id: Long): GuiaRemisionEntity?

    @Query("SELECT * FROM guias_remision WHERE destinatarioNombre LIKE '%' || :query || '%' OR number LIKE '%' || :query || '%'")
    fun search(query: String): Flow<List<GuiaRemisionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(guia: GuiaRemisionEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(guias: List<GuiaRemisionEntity>)

    @Query("DELETE FROM guias_remision")
    suspend fun deleteAll()

    @Update
    suspend fun update(guia: GuiaRemisionEntity)

    @Delete
    suspend fun delete(guia: GuiaRemisionEntity)

    @Query("SELECT COALESCE(MAX(number), 0) FROM guias_remision WHERE series = :series")
    suspend fun getLastNumber(series: String): Long
}
