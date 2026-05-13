# Reglas de Arquitectura — Maqui Mary

## Patrón detectado
**App Router de Next.js 14** con separación por capas:
- **Pages / Routes:** `src/app/` (App Router)
- **API Routes:** `src/app/api/` (Route Handlers)
- **Componentes:** `src/components/` (React reutilizables)
- **Lógica de negocio:** `src/lib/` (utilidades, cálculos, integraciones)
- **Tipos:** `src/types/` (TypeScript global)
- **Contexto:** `src/context/` (estado global React)

## Estructura de carpetas y reglas de dependencia

```
src/
├── app/                          ← Páginas y layouts (App Router)
│   ├── api/                      ← Route Handlers (backend dentro de Next.js)
│   ├── crm/                      ← Panel administrativo protegido
│   ├── page.tsx                  ← Landing page pública
│   └── layout.tsx                ← Root layout
├── components/                   ← Componentes React reutilizables
│   ├── onboarding/               ← Sistema de tutorial/mascota
│   └── pdf/                      ← Generador de PDFs
├── context/                      ← Contextos de React
├── lib/                          ← Lógica de negocio y utilidades
│   ├── sunat/                    ← Facturación electrónica SUNAT
│   ├── supabase.ts               ← Cliente de base de datos
│   ├── calculos.ts               ← Cálculos matemáticos (IGV, totales)
│   ├── constants.ts              ← Constantes del negocio
│   └── audio.ts                  ← Gestión de sonidos
├── types/                        ← Tipos TypeScript
└── middleware.ts                 ← Auth middleware
```

## Reglas de organización

| Regla | Descripción |
|---|---|
| `app/` puede importar de | `components/`, `lib/`, `types/`, `context/` |
| `components/` puede importar de | `lib/`, `types/`, `context/` |
| `components/` NO puede importar de | `app/api/`, `app/crm/` (evitar acoplamiento con páginas) |
| `lib/` puede ser importado por | cualquiera |
| `lib/sunat/` solo debe ser usado por | `app/api/sunat/`, `lib/calculos.ts` |
| `context/` solo debe ser usado por | `app/`, `components/` |

## Convenciones de App Router
- Cada ruta es una carpeta con `page.tsx`.
- Layouts compartidos van en `layout.tsx`.
- Loading states van en `loading.tsx`.
- Error boundaries van en `error.tsx`.
- API routes usan `route.ts` (no `route.js`).

## Reglas de API Routes
- Validar SIEMPRE el body con zod o manualmente.
- Retornar status codes correctos (200, 201, 400, 401, 404, 500).
- Nunca exponer detalles internos de error al cliente (loguear en servidor).
- Auth: verificar sesión con Supabase antes de procesar.
