package com.factumary.data.repository

import com.factumary.data.db.dao.TransportistaDao
import com.factumary.data.db.entity.TransportistaEntity
import kotlinx.coroutines.flow.Flow

class TransportistaRepository(private val dao: TransportistaDao) {

    fun getAll(): Flow<List<TransportistaEntity>> = dao.getAll()

    suspend fun getAllList(): List<TransportistaEntity> = dao.getAllList()

    suspend fun getById(id: Long): TransportistaEntity? = dao.getById(id)

    fun getActivos(): Flow<List<TransportistaEntity>> = dao.getActivos()

    fun search(query: String): Flow<List<TransportistaEntity>> = dao.search(query)

    suspend fun save(transportista: TransportistaEntity): Long = dao.insert(transportista)

    suspend fun update(transportista: TransportistaEntity) = dao.update(transportista)

    suspend fun delete(transportista: TransportistaEntity) = dao.delete(transportista)
}
