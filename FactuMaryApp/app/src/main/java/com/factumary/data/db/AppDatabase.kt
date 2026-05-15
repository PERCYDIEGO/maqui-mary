package com.factumary.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.factumary.data.db.dao.CustomerDao
import com.factumary.data.db.dao.GuiaRemisionDao
import com.factumary.data.db.dao.InvoiceDao
import com.factumary.data.db.dao.ProductDao
import com.factumary.data.db.dao.TransportistaDao
import com.factumary.data.db.entity.CustomerEntity
import com.factumary.data.db.entity.GuiaRemisionEntity
import com.factumary.data.db.entity.InvoiceEntity
import com.factumary.data.db.entity.InvoiceItemEntity
import com.factumary.data.db.entity.ProductEntity
import com.factumary.data.db.entity.TransportistaEntity
import com.factumary.data.seed.SeedData

@Database(
    entities = [
        ProductEntity::class,
        CustomerEntity::class,
        InvoiceEntity::class,
        InvoiceItemEntity::class,
        TransportistaEntity::class,
        GuiaRemisionEntity::class
    ],
    version = 5,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun productDao(): ProductDao
    abstract fun customerDao(): CustomerDao
    abstract fun invoiceDao(): InvoiceDao
    abstract fun transportistaDao(): TransportistaDao
    abstract fun guiaRemisionDao(): GuiaRemisionDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "factumary.db"
                )
                    .fallbackToDestructiveMigration()
                    .addCallback(SeedCallback())
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }

    private class SeedCallback : Callback() {
        override fun onCreate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
            super.onCreate(db)
            INSTANCE?.let { database ->
                SeedData.seedProducts(database.productDao())
            }
        }
    }
}
