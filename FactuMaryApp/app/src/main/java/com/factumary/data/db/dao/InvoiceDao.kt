package com.factumary.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.db.entity.InvoiceItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface InvoiceDao {

    @Query("SELECT * FROM invoices ORDER BY createdAt DESC")
    fun getAll(): Flow<List<InvoiceEntity>>

    @Query("SELECT * FROM invoices ORDER BY createdAt DESC")
    suspend fun getAllSync(): List<InvoiceEntity>

    @Query("SELECT COUNT(*) FROM invoices")
    suspend fun count(): Int

    @Query("SELECT * FROM invoices WHERE id = :id")
    suspend fun getById(id: Long): InvoiceEntity?

    @Query("SELECT * FROM invoices ORDER BY createdAt DESC LIMIT 1")
    suspend fun getLastInvoice(): InvoiceEntity?

    @Query("SELECT MAX(number) FROM invoices WHERE series = :series")
    suspend fun getLastNumber(series: String): Long?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(invoice: InvoiceEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItems(items: List<InvoiceItemEntity>)

    @Query("SELECT * FROM invoice_items WHERE invoiceId = :invoiceId ORDER BY id ASC")
    suspend fun getItemsByInvoiceId(invoiceId: Long): List<InvoiceItemEntity>

    @Transaction
    suspend fun createInvoiceWithItems(
        invoice: InvoiceEntity,
        items: List<InvoiceItemEntity>
    ): Long {
        val invoiceId = insert(invoice)
        val itemsWithId = items.map { it.copy(invoiceId = invoiceId) }
        insertItems(itemsWithId)
        return invoiceId
    }

    @Query("DELETE FROM invoices WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("SELECT * FROM invoices WHERE supabaseSynced = 0 ORDER BY createdAt ASC")
    suspend fun getUnsyncedInvoices(): List<InvoiceEntity>

    @Query("UPDATE invoices SET supabaseSynced = 1 WHERE id = :id")
    suspend fun markAsSynced(id: Long)

    // Métodos para estado SUNAT (nuevos)
    @Query("UPDATE invoices SET sunatStatus = :status, sunatCodigo = :codigo, sunatDescripcion = :descripcion, sunatHash = :hash, sunatXmlUrl = :xmlUrl, sunatCdrUrl = :cdrUrl, sunatError = :error, sunatSentAt = :timestamp WHERE id = :id")
    suspend fun updateSunatStatus(
        id: Long,
        status: String,
        codigo: String = "",
        descripcion: String = "",
        hash: String = "",
        xmlUrl: String = "",
        cdrUrl: String = "",
        error: String = "",
        timestamp: Long = System.currentTimeMillis()
    )

    @Query("SELECT * FROM invoices WHERE sunatStatus IN ('PENDIENTE', 'ERROR', 'RECHAZADO') ORDER BY createdAt ASC")
    suspend fun getPendingSunatInvoices(): List<InvoiceEntity>

    // Métodos legacy OSE (compatibilidad)
    @Query("UPDATE invoices SET oseStatus = :status, oseTicket = :ticket, oseCdr = :cdr, oseErrorMessage = :errorMessage, oseSyncedAt = :timestamp WHERE id = :id")
    suspend fun updateOseStatus(
        id: Long,
        status: String,
        ticket: String = "",
        cdr: String = "",
        errorMessage: String = "",
        timestamp: Long = System.currentTimeMillis()
    )

    @Query("SELECT * FROM invoices WHERE oseStatus IN ('PENDING', 'ERROR') ORDER BY createdAt ASC")
    suspend fun getPendingOseInvoices(): List<InvoiceEntity>

    @Query("SELECT * FROM invoices WHERE oseStatus = 'ACCEPTED' AND oseCdr = '' ORDER BY createdAt ASC")
    suspend fun getAcceptedWithoutCdr(): List<InvoiceEntity>

    // ═══════════════════════════════════════════════════════════════════════════
    // MÉTODOS PARA SISTEMA DE APROBACIÓN
    // ═══════════════════════════════════════════════════════════════════════════

    @Query("SELECT * FROM invoices WHERE aprobacionStatus = :status ORDER BY createdAt DESC")
    fun getByAprobacionStatus(status: String): Flow<List<InvoiceEntity>>

    @Query("SELECT * FROM invoices WHERE aprobacionStatus = :status ORDER BY createdAt DESC")
    suspend fun getByAprobacionStatusList(status: String): List<InvoiceEntity>

    @Query("SELECT * FROM invoices WHERE aprobacionStatus = :aprobacionStatus AND sunatStatus = :sunatStatus ORDER BY createdAt DESC")
    suspend fun getByAprobacionAndSunatStatus(aprobacionStatus: String, sunatStatus: String): List<InvoiceEntity>

    @Query("UPDATE invoices SET supabaseSynced = :synced, supabaseId = :supabaseId, syncedAt = :timestamp WHERE id = :id")
    suspend fun updateSupabaseSync(id: Long, synced: Boolean, supabaseId: String, timestamp: Long = System.currentTimeMillis())

    @Query("UPDATE invoices SET aprobacionStatus = :aprobacionStatus, aprobadoPor = :aprobadoPor, aprobadoPorName = :aprobadoPorName, aprobadoAt = :aprobadoAt, rechazoRazon = :rechazoRazon, sunatStatus = :sunatStatus, sunatCodigo = :sunatCodigo, sunatDescripcion = :sunatDescripcion, sunatHash = :sunatHash, sunatXmlUrl = :sunatXmlUrl, sunatCdrUrl = :sunatCdrUrl, sunatError = :sunatError, sunatSentAt = :sunatSentAt WHERE id = :id")
    suspend fun updateEstadoDesdeSupabase(
        id: Long,
        aprobacionStatus: String,
        aprobadoPor: String,
        aprobadoPorName: String,
        aprobadoAt: Long,
        rechazoRazon: String,
        sunatStatus: String,
        sunatCodigo: String,
        sunatDescripcion: String,
        sunatHash: String,
        sunatXmlUrl: String,
        sunatCdrUrl: String,
        sunatError: String,
        sunatSentAt: Long
    )

    @Query("SELECT * FROM invoices WHERE aprobacionStatus = 'POR_APROBAR' AND supabaseSynced = 0 ORDER BY createdAt ASC")
    suspend fun getPendientesSincronizacion(): List<InvoiceEntity>
}
