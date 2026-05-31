// ============================================
// MIDDLEWARE DE SEGURIDAD
// Protege todas las rutas del CRM con verificación server-side
// ============================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas públicas del CRM (no requieren autenticación)
const PUBLIC_CRM_ROUTES = [
  '/crm/login',
  '/crm/cambiar-contrasena',
]

// Rutas exclusivas para admin
const ADMIN_ONLY_ROUTES = [
  '/crm/usuarios',
  '/crm/sunat',
  '/crm/configuracion',
]

// Rutas vedadas para almacen (solo admin y vendedor)
const VENDEDOR_ROUTES = [
  '/crm/documentos',
  '/crm/boletas',
  '/crm/facturas',
  '/crm/guias',
  '/crm/clientes',
  '/crm/transportistas',
]

// Rutas de API que deben ser públicas (landing, contacto, etc.)
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/config',
  '/api/setup',
  '/api/contact',
  '/api/notify',
  '/api/payment',
  '/api/productos',
  '/api/geocode',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/crm')) {
    if (PUBLIC_CRM_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    const response = NextResponse.next({
      request: { headers: request.headers },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value },
          set(name: string, value: string, options: Record<string, unknown>) { response.cookies.set({ name, value, ...options } as any) },
          remove(name: string, options: Record<string, unknown>) { response.cookies.set({ name, value: '', ...options } as any) },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      const loginUrl = new URL('/crm/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Verificar rol cuando la ruta lo requiere
    const isAdminRoute = ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route))
    const isVendedorRoute = VENDEDOR_ROUTES.some(route => pathname.startsWith(route))

    if (isAdminRoute || isVendedorRoute) {
      // Service role para bypass de RLS — garantiza que el query siempre funcione
      let userRole = 'vendedor'
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=role`,
          {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            },
          }
        )
        const rows = await res.json()
        userRole = rows[0]?.role || 'vendedor'
      } catch {}

      const isAdmin = ['admin', 'superusuario'].includes(userRole)
      const isVendedor = ['vendedor', 'editor'].includes(userRole)

      if (isAdminRoute && !isAdmin) {
        return NextResponse.redirect(new URL('/crm/sin-permiso', request.url))
      }

      if (isVendedorRoute && !isAdmin && !isVendedor) {
        return NextResponse.redirect(new URL('/crm/sin-permiso', request.url))
      }
    }

    return response
  }

  // API routes: handlers are responsible for auth via verifyAuth/verifyAdmin
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

// Configurar qué rutas aplica el middleware
export const config = {
  matcher: [
    '/crm/:path*',
    '/api/:path*',
  ],
}
