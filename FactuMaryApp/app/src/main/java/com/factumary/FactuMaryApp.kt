package com.factumary

import android.app.Application
import com.factumary.data.db.AppDatabase

class FactuMaryApp : Application() {

    val database: AppDatabase by lazy {
        AppDatabase.getInstance(this)
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: FactuMaryApp
            private set
    }
}
