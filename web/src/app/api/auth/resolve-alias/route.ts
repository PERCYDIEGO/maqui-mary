import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Busca un usuario por alias y devuelve su email.
 * Un alias es cualquier string que no contenga @.
 * Se busca match contra: 
 * 1. auth.users.email (parte antes del @)
 * 2. auth.users.user_metadata.alias
 * 3. auth.users.user_metadata.username
 */
export async function POST(req: NextRequest) {
  try {
    const { alias } = await req.json()

    if (!alias || typeof alias !== 'string') {
      return NextResponse.json({ ok: false, error: 'Alias requerido' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const trimmedAlias = alias.trim().toLowerCase()

    // Buscar en auth.users usando Admin API
    const { data: usersList, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('[RESOLVE ALIAS] listUsers error:', listError)
      return NextResponse.json({ ok: false, error: 'Error interno al listar usuarios' }, { status: 500 })
    }

    if (!usersList?.users || usersList.users.length === 0) {
      return NextResponse.json({ ok: false, error: 'No hay usuarios registrados' }, { status: 404 })
    }

    // Buscar por email (parte antes del @) o metadata
    const matched = usersList.users.find(u => {
      const email = u.email?.toLowerCase() || ''
      const emailPrefix = email.split('@')[0]
      const meta = (u.user_metadata || {}) as any
      
      return emailPrefix === trimmedAlias ||
             meta.alias?.toLowerCase() === trimmedAlias ||
             meta.username?.toLowerCase() === trimmedAlias ||
             email === trimmedAlias
    })

    if (matched?.email) {
      return NextResponse.json({ ok: true, email: matched.email })
    }

    return NextResponse.json({
      ok: false,
      error: 'Usuario no encontrado'
    }, { status: 404 })

  } catch (err: any) {
    console.error('[RESOLVE ALIAS] Error:', err)
    return NextResponse.json({ ok: false, error: err.message || 'Error interno' }, { status: 500 })
  }
}
