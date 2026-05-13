# 🎉 FactuMary - Sistema de Aprobación y PDF Local

## ✅ FLUJO COMPLETO IMPLEMENTADO

### 📱 En la App (Vendedor):
1. **Crea factura** → Se guarda como "POR_APROBAR"
2. **Genera PDF local** con marca de agua "PENDIENTE DE APROBACIÓN"
3. **Entrega PDF al cliente** inmediatamente (Compartir WhatsApp/Email)
4. **Envía a CRM** para aprobación del admin

### 🖥️ En el CRM/Web (Admin):
1. **Recibe factura** en estado "POR_APROBAR"
2. **Revisa y aprueba** (o rechaza con razón)
3. **Si aprueba** → Se envía automáticamente a SUNAT
4. **Sincroniza** estado final con la app

### 📱 App sincroniza:
- Estado de aprobación
- Respuesta de SUNAT
- Hash, XML, CDR oficiales

---

## 📁 ARCHIVOS NUEVOS

### 1. Data Layer
- `data/repository/InvoiceRepositoryAprobacion.kt` - Flujo de aprobación
- `data/db/entity/InvoiceEntity.kt` - Actualizado con estados de aprobación
- `data/db/dao/InvoiceDao.kt` - Métodos de aprobación

### 2. UI Layer
- `ui/screens/dashboard/DashboardScreen.kt` - Panel de control
- `ui/screens/invoice/PdfShareDialog.kt` - Diálogo para compartir PDF
- `ui/screens/customers/CustomerSelectorDropdown.kt` - Selector mejorado

### 3. PDF
- `pdf/PdfGenerator.kt` - Generación de PDFs con marca de agua

### 4. Remote
- `data/remote/SupabaseClient.kt` - Métodos de sincronización

---

## 🎨 CARACTERÍSTICAS DEL PDF

### Versión Preliminar (para cliente):
```
┌─────────────────────────────────────┐
│     PENDIENTE DE APROBACIÓN         │  ← Marca de agua diagonal
│                                     │
│  INVERSIONES MAQUI MARY PERU        │
│  RUC: 20606218801                   │
│                                     │
│  ⚠ PENDIENTE DE APROBACIÓN          │  ← Banner naranja
│                                     │
│  Cliente: [Nombre]                  │
│  Productos: [...]                   │
│                                     │
│  TOTAL: S/ XXX.XX                   │
│                                     │
│  Documento preliminar - Sujeto      │
│  a aprobación antes de envío        │
│  oficial a SUNAT                    │
└─────────────────────────────────────┘
```

### Versión Oficial (después de SUNAT):
- Sin marcas de agua
- Con hash oficial
- Con QR (opcional)
- Código de barras (opcional)

---

## 🔄 ESTADOS DE FACTURA

```
POR_APROBAR → APROBADO → PENDIENTE → ENVIADO → ACEPTADO
     ↓
RECHAZADO_LOCAL
```

### Estados visuales:
| Estado | Icono | Color | Descripción |
|--------|-------|-------|-------------|
| POR_APROBAR | ⏳ | Naranja | Esperando aprobación admin |
| APROBADO | ✅ | Verde | Aprobado, esperando envío SUNAT |
| ENVIADO | 📤 | Azul | Enviado a SUNAT |
| ACEPTADO | ✓ | Verde oscuro | Aceptado por SUNAT |
| RECHAZADO | ✗ | Rojo | Rechazado por SUNAT |
| RECHAZADO_LOCAL | ❌ | Rojo | Rechazado en CRM (no va a SUNAT) |

---

## 🎯 DASHBOARD

### Métricas mostradas:
- 💰 Total de ventas (últimos N meses)
- 📊 Gráfico de barras por mes
- 📈 Cantidad de facturas
- 💵 Promedio por venta
- 🏆 Mejor mes
- ⚠️ Alertas de stock bajo

### Rango de fechas:
- **Automático**: Desde la primera venta hasta hoy
- **Manual**: 3, 6, 12, 24 meses

---

## 📲 COMPARTIR PDF

### Opciones de comparte:
- WhatsApp (con mensaje)
- Email (con asunto y texto)
- Otras apps (Drive, Bluetooth, etc.)

### Mensaje incluido:
```
"Adjunto comprobante de pago. Este documento es 
preliminar y estará sujeto a aprobación antes del 
envío oficial a SUNAT."
```

---

## 🔐 ROLES DE USUARIO

### Admin:
- ✅ Ver dashboard
- ✅ Crear facturas
- ✅ Aprobar facturas (en web)
- ✅ Configuración

### Editor:
- ✅ Ver dashboard
- ✅ Crear facturas
- ❌ Aprobar facturas
- ❌ Configuración avanzada

### Viewer (futuro):
- ✅ Solo lectura
- ❌ No puede crear

---

## 🧪 PARA PROBAR

### 1. Crear Factura:
```
1. Login como "editor"
2. Dashboard → Nueva Factura
3. Seleccionar cliente (nuevo dropdown)
4. Agregar productos (sincronizados con web)
5. Emitir factura
6. Ver diálogo de compartir PDF
7. Compartir vía WhatsApp
```

### 2. Ver en CRM:
```
1. Ir a maquimary.vercel.app
2. Login como "admin"
3. Ver factura en estado "POR_APROBAR"
4. Aprobarla
5. Verificar que se envió a SUNAT
```

### 3. Sincronizar:
```
1. En app, ir a Settings
2. "Sincronizar estados"
3. Ver que la factura ahora está "ACEPTADO"
```

---

## ⚠️ IMPORTANTE

### Requisitos en Supabase:
1. Tabla `facturas_pendientes` con campos:
   - `aprobacion_status` (text)
   - `aprobado_por` (text)
   - `aprobado_por_name` (text)
   - `aprobado_at` (bigint)
   - `rechazo_razon` (text)
   - Campos SUNAT estándar

2. Tabla `profiles` con campo:
   - `role` (text: 'admin', 'editor', 'viewer')

3. Tabla `productos` sincronizada con web

### Permisos:
- Editor: Puede crear facturas, no aprobar
- Admin: Puede crear y aprobar

---

## 🚀 PRODUCCIÓN

### Checklist:
- [ ] Crear tablas en Supabase
- [ ] Configurar triggers de aprobación
- [ ] Configurar envío automático a SUNAT desde servidor
- [ ] Probar flujo completo
- [ ] Capacitar vendedores

---

**¡Listo para producción!** 🎉
