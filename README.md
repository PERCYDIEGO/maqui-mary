# Maqui Mary — Sistema Integral de Gestión Comercial

> **INVERSIONES MAQUI MARY PERÚ E.I.R.L.** — Esponjas, estropajos y accesorios de limpieza para el hogar.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Android](https://img.shields.io/badge/Android-Kotlin-3DDC84?logo=android)](https://developer.android.com/)

---

## ¿Qué es Maqui Mary?

Maqui Mary es el ecosistema digital completo para **INVERSIONES MAQUI MARY PERÚ E.I.R.L.**, empresa peruana dedicada a la venta de esponjas, estropajos y accesorios de limpieza para el hogar.

El sistema abarca:

| Módulo | Descripción | Tecnología |
|---|---|---|
| **Web App** | Facturación electrónica SUNAT, catálogo de productos, gestión de pedidos y panel administrativo | Next.js 14 + TypeScript + Tailwind + Supabase |
| **App Android** | FactuMaryApp — facturación móvil conectada al sistema central | Kotlin + Gradle |
| **Scripts** | Utilidades de testing, verificación de APIs y mantenimiento de base de datos | PowerShell |
| **Branding** | Logos, catálogo de productos, medios de pago y assets de marca | PNG / JPG |

---

## Estructura del Proyecto

```
Maqui-Mary/
├── web/                    # Aplicación web principal (Next.js)
│   ├── src/                # Código fuente (pages, components, hooks, utils)
│   ├── public/             # Archivos estáticos
│   ├── supabase/           # Configuración y migraciones de base de datos
│   ├── scripts/            # Scripts de utilidad Node.js
│   ├── package.json
│   └── ...
├── FactuMaryApp/           # Aplicación Android nativa
│   ├── app/                # Código fuente Kotlin
│   ├── build.gradle.kts
│   └── ...
├── scripts/                # Scripts PowerShell de testing y verificación
│   ├── check-all-columns.ps1
│   ├── test-sunat-api.ps1
│   └── ...
├── imagenes/               # Assets de marca
│   ├── catalogo_productos/
│   ├── logo/
│   ├── medios_de_pago/
│   └── yape_qr/
└── deploy.ps1              # Script de despliegue automático
```

---

## Características Principales

### Web App
- ⚡ **Landing page** con catálogo de productos y cotizador
- 🧾 **Facturación electrónica** integrada con SUNAT (XML firmado digitalmente)
- 🛒 **Gestión de pedidos** con estados y flujo de aprobación
- 👥 **Autenticación** con roles (admin, vendedor, cliente)
- 📊 **Dashboard** de ventas y métricas
- 📱 **Diseño responsive** optimizado para móviles

### App Android (FactuMaryApp)
- 📷 Escaneo de QR para pagos Yape
- 🧾 Emisión de comprobantes desde el celular
- 🔄 Sincronización en tiempo real con la web

---

## Cómo Correrlo Localmente

### Requisitos
- Node.js 18+
- PostgreSQL (o cuenta de Supabase)
- Android Studio (para la app móvil)

### Web App
```bash
cd web
npm install
# Crear archivo .env.local con las variables de entorno
npm run dev
```
Abrir [http://localhost:3000](http://localhost:3000)

### App Android
```bash
cd FactuMaryApp
# Abrir en Android Studio y sincronizar Gradle
# Ejecutar en emulador o dispositivo físico
```

---

## Variables de Entorno

Crear un archivo `.env.local` en la carpeta `web/` con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Nunca subir archivos `.env` a GitHub.** Están protegidos por `.gitignore`.

---

## Scripts Útiles

| Script | Uso |
|---|---|
| `deploy.ps1` | Despliegue automático a Vercel |
| `web/scripts/clean-database.mjs` | Limpieza controlada de la base de datos |
| `scripts/check-all-columns.ps1` | Verificación de esquema de tablas |
| `scripts/test-sunat-api.ps1` | Test de conexión con API de SUNAT |

---

## Estado del Proyecto

- ✅ Landing page operativa
- ✅ Sistema de facturación SUNAT funcionando
- ✅ Catálogo de productos con cotizador
- ✅ Gestión de pedidos con flujo de aprobación
- 🔄 App Android en desarrollo activo

---

## Licencia

Proyecto privado — **INVERSIONES MAQUI MARY PERÚ E.I.R.L.**

---

> *"Limpieza y calidad para el hogar peruano."* 🧽✨
