# Configuración de Facturación Electrónica SUNAT — FactuMaryApp

Este documento explica paso a paso cómo configurar tu app **FactuMary** para enviar comprobantes electrónicos directamente a **SUNAT** a través de un **OSE (Operador de Servicios Electrónicos)**.

---

## ¿Qué es un OSE?

Un **OSE** es un proveedor autorizado por SUNAT que se encarga de:
- Firmar digitalmente tus comprobantes electrónicos
- Enviarlos a SUNAT
- Entregarte el **CDR** (Constancia de Recepción)

Tú solo envías los datos de la factura en JSON por API, y el OSE hace todo lo demás.

> **Importante:** Para usar la integración directa con SUNAT necesitas **certificado digital** (firma electrónica). Como no lo tienes, el OSE es la forma legal y práctica de automatizar.

---

## Paso 1: Elige tu OSE

### Recomendado para PYMES en Perú: **Nubefact**
- Web: https://nubefact.com
- API REST simple con token
- Plan gratuito para pruebas
- Soporte en español

### Alternativas:
- **Facturador SUNAT** (varios proveedores)
- **Greenter** (librería open source si tienes certificado digital)
- **Ublion**
- **Solucion Facturalo**

---

## Paso 2: Regístrate en Nubefact y obtén tus credenciales

1. Entra a https://nubefact.com
2. Crea una cuenta con tu **RUC** de Maqui Mary
3. Completa el onboarding (datos de tu empresa)
4. Ve a la sección **API / Integraciones**
5. Copia:
   - **Token de API** (largo, tipo `943e6f...`)
   - **ID de cuenta / Endpoint** (también suele ser un hash, ej: `943e6f17a99a4339ab7d59306f920555`)

---

## Paso 3: Configura FactuMaryApp

1. Abre la app en tu celular
2. Ve al menú → **Configuración**
3. Desplaza hasta la sección **"Facturación Electrónica (SUNAT)"**
4. Completa los campos:

| Campo | Valor de ejemplo | Descripción |
|---|---|---|
| URL base del OSE | `https://api.nubefact.com/api/v1/` | URL raíz de la API |
| Ruta del endpoint | `943e6f17a99a4339ab7d59306f920555` | Tu ID de cuenta en Nubefact |
| Token de API | `943e6f17a99a4339ab7d59306f920555` | Tu token secreto |

5. Presiona **"Guardar Token"**

---

## Paso 4: Emite tu primera factura electrónica

1. Ve a **Clientes** y selecciona uno (o crea uno con RUC)
2. Presiona **"Nueva Factura"**
3. Agrega productos y verifica los totales
4. Presiona **"Emitir Factura"**

La app hará automáticamente:
1. ✅ Guarda la factura localmente (Room)
2. ✅ Sincroniza con Supabase (nube)
3. ✅ **Envía la factura al OSE**
4. ✅ El OSE la firma y envía a SUNAT
5. ✅ Guarda el estado SUNAT en la factura

---

## Paso 5: Verifica el estado SUNAT

Después de emitir, la factura mostrará un **badge de estado**:

| Estado | Significado |
|---|---|
| 🟡 **Pendiente** | Aún no se envió al OSE (quizás no está configurado) |
| 🔵 **Enviado** | Enviado al OSE, SUNAT aún valida |
| 🟢 **SUNAT OK** | Aceptado por SUNAT. ¡Todo bien! |
| 🔴 **Error** | Falló el envío. Revisa el mensaje de error |

En el **detalle de la factura** puedes:
- Ver el mensaje exacto de SUNAT
- Presionar **"Reintentar"** si hubo un error de red
- Ver el enlace al **CDR** (Constancia de Recepción)

---

## Solución de problemas

### "OSE no configurado"
Ve a Configuración y guarda tu token de API.

### "Error HTTP 401: Unauthorized"
Tu token de API es incorrecto o expiró. Ve a Nubefact y verifica tu token.

### "Error HTTP 422: Unprocessable Entity"
Los datos de la factura no cumplen el formato. Revisa:
- RUC del cliente tiene 11 dígitos
- Serie correcta (F001 para facturas, B001 para boletas)
- Montos positivos

### "SUNAT rechazó el comprobante"
Revisa el mensaje de error específico de SUNAT en el detalle de la factura. Puede ser:
- RUC del cliente no existe
- Serie no autorizada en SUNAT
- Montos no cuadran

### Factura quedó en "Pendiente"
La app intentará enviar automáticamente cuando:
- Crees una factura nueva
- Presiones **"Reintentar"** en el detalle
- (Futuro) Se implemente un job periódico de reintentos

---

## Arquitectura técnica (para devs)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ FactuMary   │────▶│   OSE       │────▶│   SUNAT     │
│   App       │ JSON│ (Nubefact)  │ XML │             │
│  (Android)  │     │  Firma+Envía│ ZIP │  Valida+CDR │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  Supabase   │
│   (nube)    │
└─────────────┘
```

### Archivos clave del módulo SUNAT:
- `data/ose/model/OseInvoiceModels.kt` — Modelos JSON para la API
- `data/ose/OseHttpClient.kt` — Cliente Ktor HTTP
- `data/ose/OseService.kt` — Lógica de envío y config
- `data/repository/InvoiceRepository.kt` — Integración post-creación
- `ui/screens/settings/SettingsScreen.kt` — UI de configuración
- `ui/screens/invoice/InvoiceDetailScreen.kt` — UI de estado SUNAT

---

## Notas de seguridad

- 🔒 El **token de API** se guarda en `SharedPreferences` privadas de la app
- 🔒 Nunca compartas tu token. Si lo filtras, regénralo en Nubefact inmediatamente
- 🔒 La app usa **HTTPS** obligatoriamente para todas las comunicaciones con el OSE

---

## Próximos pasos / Roadmap

- [ ] Job periódico para reintentar envíos fallidos automáticamente
- [ ] Descarga del PDF oficial de SUNAT (con QR y hash)
- [ ] Soporte para **boletas** (B001) además de facturas
- [ ] Soporte para **notas de crédito/débito**
- [ ] Integración directa SUNAT cuando tengas certificado digital

---

¿Dudas? Escribe a soporte de tu OSE o revisa la documentación oficial:
- Nubefact API: https://nubefact.com/api
