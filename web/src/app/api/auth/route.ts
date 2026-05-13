import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  try {
    const { email, password, action } = await req.json()

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 401 })
      return NextResponse.json({ ok: true, user: data.user })
    }

    if (action === 'check') {
      const token = req.cookies.get('sb-access-token')?.value || req.cookies.get('sb-refresh-token')?.value
      if (!token) return NextResponse.json({ ok: false }, { status: 401 })
      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: 'Acción no válida' }, { status: 400 })
  } catch (err: any) {
    console.error('[AUTH] Error:', err)
    return NextResponse.json({ ok: false, error: err.message || 'Error interno' }, { status: 500 })
  }
}
