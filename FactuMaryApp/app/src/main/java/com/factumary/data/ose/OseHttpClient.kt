package com.factumary.data.ose

import android.content.Context
import com.factumary.data.ose.model.OseConfig
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/**
 * Cliente HTTP singleton para comunicación con el OSE (ej: Nubefact)
 * Usa Ktor que ya está incluido en el proyecto para Supabase.
 */
object OseHttpClient {

    private var client: HttpClient? = null

    fun get(config: OseConfig): HttpClient {
        return client ?: HttpClient(Android) {
            install(ContentNegotiation) {
                json(Json {
                    ignoreUnknownKeys = true
                    prettyPrint = true
                    isLenient = true
                })
            }
            install(Logging) {
                level = LogLevel.ALL
            }
            defaultRequest {
                url(config.baseUrl)
                contentType(ContentType.Application.Json)
                headers.append("Authorization", config.apiToken)
            }
            expectSuccess = false // Para manejar errores HTTP manualmente
        }.also { client = it }
    }

    fun reset() {
        client?.close()
        client = null
    }
}
