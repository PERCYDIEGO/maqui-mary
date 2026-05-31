export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const adminSb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  // Leer sesión desde cookies (SSR-safe)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  // Service role bypassa RLS — garantiza que el perfil siempre se lea correctamente
  const { data: profile } = await adminSb
    .from('profiles')
    .select('role, full_name, alias')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ ok: true, profile: profile || null })
}

// PATCH: actualiza campos permitidos del propio perfil (service role — bypass RLS)
const PATCH_ALLOWED_FIELDS = ['force_password_change'] as const

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const update: Record<string, unknown> = {}
  for (const field of PATCH_ALLOWED_FIELDS) {
    if (field in body) update[field] = body[field]
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ ok: false, error: 'No hay campos válidos' }, { status: 400 })

  await adminSb.from('profiles').update(update).eq('id', user.id)
  return NextResponse.json({ ok: true })
}
