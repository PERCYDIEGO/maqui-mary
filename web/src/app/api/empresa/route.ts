import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '@/lib/api-auth'

const DEFAULTS = {
  whatsapp_clientes: '51916165543',
  whatsapp_negocio:  '51916165543',
  horario:           'Lun–Sáb: 8:00 am – 6:00 pm',
  direccion_display: 'Ate Vitarte, Lima',
}

function adminSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  try {
    const sb = adminSb()
    const [{ data: cfg }, { data: sunat }] = await Promise.all([
      sb.from('app_config').select('settings').eq('id', 1).single(),
      sb.from('sunat_config').select('address,distrito,provincia,departamento').eq('id', 1).single(),
    ])
    const empresa = cfg?.settings?.empresa || {}
    return NextResponse.json({
      ok: true,
      ...DEFAULTS,
      ...empresa,
      // dirección desde sunat_config si está completa
      direccion_sunat: sunat
        ? [sunat.address, sunat.distrito, sunat.provincia].filter(Boolean).join(', ')
        : null,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: true, ...DEFAULTS })
  }
}

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req)
  if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const sb = adminSb()
    const { data: actual } = await sb.from('app_config').select('settings').eq('id', 1).single()
    const settings = { ...(actual?.settings || {}), empresa: body }
    const { error } = await sb.from('app_config').upsert(
      { id: 1, settings, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
