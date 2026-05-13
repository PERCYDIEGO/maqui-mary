# 🧽 Icono de la App FactuMary - Maqui

## ✅ Cambios Realizados

### 1. Icono Vectorial Creado
**Archivo:** `res/drawable/ic_maqui_launcher.xml`

El icono muestra la **mascota Maqui**:
- 🟡 Círculo amarillo (cuerpo de esponja)
- 👀 Ojos grandes y expresivos con brillo
- 😊 Sonrisa roja amigable
- 🌸 Mejillas sonrojadas rosadas
- • Poros decorativos distribuidos

### 2. Configuración de Iconos

**Adaptive Icons (Android 8.0+):**
- `mipmap-anydpi-v26/ic_launcher.xml`
- `mipmap-anydpi-v26/ic_launcher_round.xml`

**Compatibilidad (todas las versiones):**
- `mipmap-mdpi/ic_launcher.xml` (48x48)
- `mipmap-mdpi/ic_launcher_round.xml`
- `mipmap-hdpi/ic_launcher.xml` (72x72)
- `mipmap-hdpi/ic_launcher_round.xml`
- `mipmap-xhdpi/ic_launcher.xml` (96x96)
- `mipmap-xhdpi/ic_launcher_round.xml`
- `mipmap-xxhdpi/ic_launcher.xml` (144x144)
- `mipmap-xxhdpi/ic_launcher_round.xml`
- `mipmap-xxxhdpi/ic_launcher.xml` (192x192)
- `mipmap-xxxhdpi/ic_launcher_round.xml`

### 3. AndroidManifest.xml Actualizado
```xml
android:icon="@mipmap/ic_launcher"
android:roundIcon="@mipmap/ic_launcher_round"
```

### 4. Colores
- **Fondo:** `#FFFFD93D` (Amarillo esponja)
- **Cuerpo:** `#FFE135` (Amarillo brillante)
- **Borde:** `#E6B800` (Dorado)
- **Sonrisa:** `#E63946` (Rojo coral)
- **Mejillas:** `#FF6B9D` (Rosa)

---

## 🎨 Diseño del Icono

```
    ┌─────────────────────┐
    │   🧽  Maqui         │
    │                     │
    │      👁️   👁️        │
    │        ───          │
    │       ╲   ╱         │
    │        ╲_/          │
    │                     │
    └─────────────────────┘
```

**Características:**
- ✅ Vectorial (escala perfecto en cualquier tamaño)
- ✅ Compatible con Android 5.0+
- ✅ Adaptive icon para Android 8.0+
- ✅ Fondo amarillo distintivo
- ✅ Expresión amigable y profesional

---

## 📱 Cómo se ve en el dispositivo

### En el launcher:
```
┌─────────────────────────────────────┐
│  🧽 FactuMary    📱 Otras apps...   │
│                                     │
│  [Icono amarillo con cara]          │
│     Maqui sonriendo                 │
│                                     │
│  FactuMary                          │
│                                     │
└─────────────────────────────────────┘
```

### En ajustes:
- Icono redondo en dispositivos con launcher circular
- Icono cuadrado/redondeado según el launcher del dispositivo

---

## 🚀 Para ver el cambio

1. **Recompilar la app**
   ```bash
   ./gradlew clean build
   ```

2. **Instalar en dispositivo/emulador**
   ```bash
   ./gradlew installDebug
   ```

3. **Ver el icono**
   - Busca "FactuMary" en el launcher
   - Verás la esponja Maqui sonriendo 😊

---

## 📝 Notas

- El icono es **vectorial** (XML) por lo que no pierde calidad
- Funciona en **todos los tamaños** de pantalla
- Compatible con **todos los launchers** (Pixel, Samsung, Xiaomi, etc.)
- El fondo amarillo hace que destaque entre otras apps

---

## 🔄 Si quieres cambiar el icono

### Opción 1: Usar tu logo PNG existente
Copia tu archivo de imagen a:
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-mdpi/ic_launcher.png` (48x48)

### Opción 2: Modificar el vector
Edita `ic_maqui_launcher.xml` y ajusta:
- Colores (`#FFD93D`, `#E63946`, etc.)
- Formas de los ojos
- Tamaño de la sonrisa
- Posición de los poros

---

**¡Listo! Tu app ahora tiene la mascota Maqui como icono!** 🧽✨
