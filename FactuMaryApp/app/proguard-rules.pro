# FactuMary ProGuard Rules
-keepclassmembers class * extends androidx.room.RoomDatabase { *; }

# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.factumary.data.remote.**$$serializer { *; }
-keepclassmembers class com.factumary.data.remote.** {
    *** Companion;
}
-keepclasseswithmembers class com.factumary.data.remote.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Ktor
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**

# Supabase
-keep class io.github.jan.supabase.** { *; }
-dontwarn io.github.jan.supabase.**
