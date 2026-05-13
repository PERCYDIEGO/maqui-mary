package com.factumary.data.repository

import com.factumary.data.db.dao.CustomerDao
import com.factumary.data.db.entity.CustomerEntity
import com.factumary.data.remote.SupabaseClientProvider
import kotlinx.coroutines.flow.Flow

class CustomerRepository(private val dao: CustomerDao) {

    fun getAll(): Flow<List<CustomerEntity>> = dao.getAll()

    suspend fun getAllList(): List<CustomerEntity> = dao.getAllList()

    suspend fun getById(id: Long): CustomerEntity? = dao.getById(id)

    fun search(query: String): Flow<List<CustomerEntity>> = dao.search(query)

    suspend fun save(customer: CustomerEntity): Long = dao.insert(customer)

    suspend fun update(customer: CustomerEntity) = dao.update(customer)

    suspend fun delete(customer: CustomerEntity) = dao.delete(customer)

    suspend fun syncFromSupabase(): Result<Int> {
        return try {
            val result = SupabaseClientProvider.fetchClientes()
            result.fold(
                onSuccess = { clientes ->
                    dao.deleteAll()
                    dao.insertAll(clientes)
                    Result.success(clientes.size)
                },
                onFailure = { Result.failure(it) }
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
