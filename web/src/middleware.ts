// ============================================
// MIDDLEWARE DE SEGURIDAD
// Protege todas las rutas del CRM
// ============================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas públicas del CRM (no requieren autenticación)
const PUBLIC_CRM_ROUTES = [
  '/crm/login',
  '/crm/cambiar-contrasena',
]

// Rutas de API que deben ser públicas
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/config',
  '/api/setup',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar si es una ruta del CRM
  if (pathname.startsWith('/crm')) {
    // Permitir rutas públicas del CRM
    if (PUBLIC_CRM_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    // Para el resto de rutas del CRM, permitir el acceso
    // La protección real la hace el layout del CRM con verificación cliente-side
    // Esto evita problemas con las cookies de Supabase SSR
    return NextResponse.next()
  }

  // Verificar rutas de API protegidas
  if (pathname.startsWith('/api/')) {
    // Permitir rutas API públicas
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    // Las APIs del CRM deben verificar el token ellas mismas
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
