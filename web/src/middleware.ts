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

  // BUG-09: verificar sesión server-side para rutas CRM con @supabase/ssr
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

    return response
  }

  // Rutas de API protegidas: la verificación la hacen las propias rutas con verifyAuth
  if (pathname.startsWith('/api/')) {
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }
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
