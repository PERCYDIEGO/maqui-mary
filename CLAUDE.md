# CLAUDE.md — Contexto del Proyecto para Claude Code

> **Proyecto:** Maqui Mary — Sistema Integral de Gestión Comercial  
> **Empresa:** INVERSIONES MAQUI MARY PERU E.I.R.L.  
> **RUC:** 20606218801

---

## Descripción

Plataforma web completa para una empresa peruana dedicada a la fabricación y venta de esponjas, estropajos y accesorios de limpieza para el hogar. Incluye facturación electrónica SUNAT, gestión comercial y diseño responsive para desktop y móvil.

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| **Framework web** | Next.js | 14 (App Router) |
| **Lenguaje** | TypeScript | 5.3 |
| **Estilos** | Tailwind CSS | 3.4 |
| **Base de datos** | Supabase (PostgreSQL) | — |
| **Auth** | Supabase Auth + bcryptjs | — |
| **Animaciones** | Framer Motion | 12.38 |
| **Facturación** | xml-crypto + node-forge + jszip | — |
| **Deploy** | Vercel | — |

---

## Comandos Útiles

### Web (desde `web/`)
| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor local en localhost:3000 |
| `npm run build` | Build de producción (Static Export) |
| `npm run start` | Servidor de producción local |
| `npm run lint` | ESLint con Next.js config |
| `npm run db:status` | Ver estado de tablas en Supabase |
| `npm run db:clean:dry` | Vista previa de limpieza de DB |
| `npm run db:clean` | **PELIGRO:** limpiar base de datos |
| `npm run db:truncate:dry` | Vista previa de truncado |
| `npm run db:truncate` | **PELIGRO:** truncar facturas y pedidos |

### General
| Comando | Descripción |
|---|---|
| `node scripts/clean-database.mjs` | Script de limpieza de DB |
| `node scripts/truncate-facturas-pedidos.mjs` | Script de truncado |
| `node scripts/check-db-status.mjs` | Verificar estado de tablas |

---

## Convenciones de Código

- **Formateador:** Prettier (implícito en Next.js)
- **Linter:** ESLint con `next lint`
- **Imports:** Absolutos desde `src/` (alias `@/` configurado)
- **Manejo de errores:** try-catch + toast notifications (`react-hot-toast`)
- **Idioma de comentarios:** Español peruano
- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)

---

## Estructura de Carpetas

```
Maqui-Mary/
├── CLAUDE.md                 ← Este archivo
├── CLAUDE.local.md           ← Preferencias personales (no git)
├── README.md                 ← Documentación general del proyecto
├── .gitignore                ← Exclusiones globales
├── deploy.ps1                ← Script de despliegue automático a Vercel
│
├── web/                      ← Aplicación web principal (Next.js 14)
│   ├── src/
│   │   ├── app/              ← App Router (páginas y layouts)
│   │   ├── components/       ← Componentes React reutilizables
│   │   ├── context/          ← Contextos de React (AppContext)
│   │   ├── lib/              ← Utilidades, lógica de negocio, SUNAT
│   │   │   ├── sunat/        ← XML builder, signer, SOAP client
│   │   │   ├── supabase.ts   ← Cliente Supabase
│   │   │   ├── calculos.ts   ← Cálculos de totales, IGV
│   │   │   ├── constants.ts  ← Constantes del proyecto
│   │   │   └── audio.ts      ← Gestión de audio/sonidos
│   │   ├── types/            ← Tipos TypeScript globales
│   │   └── middleware.ts     ← Auth middleware de Next.js
│   ├── public/               ← Assets estáticos (img, audio)
│   ├── scripts/              ← Scripts Node.js de utilidad
│   ├── supabase/             ← Migraciones SQL y schemas
│   ├── package.json
│   └── ...
│
├── scripts/                  ← Scripts PowerShell de testing
│   └── *.ps1
│
└── imagenes/                 ← Assets de marca
    ├── catalogo_productos/
    ├── logo/
    ├── medios_de_pago/
    └── yape_qr/
```

---

## APIs y Servicios Externos

| Servicio | Uso | Ubicación en código |
|---|---|---|
| **Supabase** | Auth, DB PostgreSQL, Storage | `web/src/lib/supabase.ts` |
| **SUNAT (OSE)** | Emisión de comprobantes electrónicos | `web/src/lib/sunat/` |
| **WhatsApp** | Botón de contacto directo | `web/src/components/WhatsAppButton.tsx` |

---

## Variables de Entorno Requeridas (web)

Archivo: `web/.env.local` (nunca subir a Git)

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Reglas de Negocio Críticas

1. **IGV:** 18% sobre el valor unitario de cada ítem.
2. **Cálculo de total:** Σ(cantidad × precio_unitario) + IGV.
3. **Stock:** Validar existencia antes de emitir comprobante. Descontar automáticamente al aprobar.
4. **SUNAT:** RUC `20606218801`. Tipos: `01`=Factura, `03`=Boleta, `09`=Guía de Remisión.
5. **Pedidos:** Flujo `pendiente` → `pagado` → `aprobado` → `entregado`.
6. **Auth:** Roles `admin`, `vendedor`, `cliente`. Middleware protege rutas `/crm/*`.
7. **Deploy:** Automático a Vercel después de bug fix verificado (`vercel --prod`).

---

## Notas Importantes

- El proyecto usa **App Router** de Next.js 14, no Pages Router.
- Las rutas API están en `web/src/app/api/` (Route Handlers).
- La facturación SUNAT genera XML firmado digitalmente con `xml-crypto` + certificado.
- El onboarding interactivo usa Framer Motion y una mascota esponja animada.
- La web es responsive: funciona en desktop y móvil sin app nativa separada.
- Todo el código debe ser en **español** (comentarios, nombres de funciones cuando aplique, UI).

---

> Este archivo es de solo lectura para Claude. Las preferencias personales del desarrollador deben ir en `CLAUDE.local.md` (no se sube a Git).
