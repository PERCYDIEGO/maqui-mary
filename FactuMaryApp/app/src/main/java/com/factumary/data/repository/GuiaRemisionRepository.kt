package com.factumary.data.repository

import com.factumary.data.db.dao.GuiaRemisionDao
import com.factumary.data.db.entity.GuiaRemisionEntity
import kotlinx.coroutines.flow.Flow

class GuiaRemisionRepository(private val dao: GuiaRemisionDao) {

    fun getAll(): Flow<List<GuiaRemisionEntity>> = dao.getAll()

    suspend fun getAllList(): List<GuiaRemisionEntity> = dao.getAllList()

    suspend fun getById(id: Long): GuiaRemisionEntity? = dao.getById(id)

    fun search(query: String): Flow<List<GuiaRemisionEntity>> = dao.search(query)

    suspend fun save(guia: GuiaRemisionEntity): Long = dao.insert(guia)

    suspend fun update(guia: GuiaRemisionEntity) = dao.update(guia)

    suspend fun delete(guia: GuiaRemisionEntity) = dao.delete(guia)

    suspend fun getLastNumber(series: String): Long = dao.getLastNumber(series)
}
