import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '@/lib/api-auth'

const DEFAULT_SETTINGS = {
  cintillo_timer_minutos: 5,
  cintillo_messages: [
    { icon: '🔥', text: 'El más vendido: {bestseller} — desde S/ {precio}' },
    { icon: '⏱️', text: 'Llevas {timer} explorando — ¡Calidad y precio justo!' },
    { icon: '🇵🇪', text: 'Hecho en Perú · Fabricación propia — Calidad que tu hogar merece' },
    { icon: '⭐', text: '5.0 estrellas · Más de 12,800 clientes nos respaldan' },
    { icon: '💪', text: 'La mejor relación calidad-precio — ¡Agrega al carrito!' },
  ],
}

async function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = await getAdminClient()
    const { data, error } = await supabase.from('app_config').select('settings').eq('id', 1).single()
    if (error || !data) {
      return NextResponse.json({ ok: true, settings: DEFAULT_SETTINGS })
    }
    return NextResponse.json({ ok: true, settings: { ...DEFAULT_SETTINGS, ...data.settings } })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const supabase = await getAdminClient()
    // Merge con settings existentes para no perder campos de otras secciones
    const { data: actual } = await supabase.from('app_config').select('settings').eq('id', 1).single()
    const settings = { ...(actual?.settings || {}), ...body }
    const { error } = await supabase.from('app_config').upsert(
      { id: 1, settings, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
