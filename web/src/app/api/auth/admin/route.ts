import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const sb = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user } } = await sb.auth.getUser(token)
  if (!user) return null

  const adminSb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile } = await adminSb.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'admin') return user

  return null
}

const adminSb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function GET(req: NextRequest) {
  const admin = await checkAdmin(req)
  if (!admin) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })

  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=100`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    })
    const data = await r.json()
    const users = (data.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      is_anonymous: u.is_anonymous,
    }))

    const { data: profiles } = await adminSb.from('profiles').select('id, full_name, role, alias')
    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const result = users.map((u: any) => ({
      ...u,
      alias: profileMap.get(u.id)?.alias || u.email,
      full_name: profileMap.get(u.id)?.full_name || '',
      role: profileMap.get(u.id)?.role || 'editor',
    }))

    return NextResponse.json({ ok: true, users: result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin(req)
  if (!admin) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })

  const { alias, password, full_name, role } = await req.json()
  if (!alias || !password) return NextResponse.json({ ok: false, error: 'Alias y contraseña requeridos' }, { status: 400 })

  const email = alias.includes('@') ? alias : `${alias}@maquimary.local`

  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/_create_user`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: full_name || '',
        role: role || 'editor',
        alias,
      }),
    })

    if (!r.ok) {
      const d = await r.json()
      throw new Error(d.message || d.error || 'Error al crear usuario')
    }

    const data = await r.json()
    const row = Array.isArray(data) ? data[0] : data

    if (row.status === 'error') {
      throw new Error(row.result?.error || 'Error en el trigger de creación')
    }

    return NextResponse.json({
      ok: true,
      user: row.result,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

async function checkUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const sb = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user } } = await sb.auth.getUser(token)
  return user
}

async function getProfile(userId: string) {
  const { data } = await adminSb.from('profiles').select('role, alias').eq('id', userId).single()
  return data
}

export async function PUT(req: NextRequest) {
  const admin = await checkAdmin(req)
  const user = admin || await checkUser(req)
  if (!user) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })

  const { user_id, full_name, role, password, alias } = await req.json()
  if (!user_id) return NextResponse.json({ ok: false, error: 'user_id requerido' }, { status: 400 })

  const isAdmin = !!admin
  const isSelf = user.id === user_id

  if (!isAdmin) {
    if (!isSelf) {
      return NextResponse.json({ ok: false, error: 'No puedes modificar otros usuarios' }, { status: 403 })
    }
    const allowedFields: Record<string, any> = {}
    if (password !== undefined) allowedFields.generated_password = password
    if (alias !== undefined) allowedFields.alias = alias
    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ ok: false, error: 'No hay campos válidos para actualizar' }, { status: 400 })
    }
    try {
      if (password) {
        const r = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, {
          method: 'PUT',
          headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password, email_confirm: true }),
        })
        if (!r.ok) { const d = await r.json(); throw new Error(d.msg || 'Error al actualizar contraseña') }
      }
      await adminSb.from('profiles').update(allowedFields).eq('id', user_id)
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }
  }

  try {
    if (password) {
      const r = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, {
        method: 'PUT',
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, email_confirm: true }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.msg || 'Error al actualizar') }
    }

    const updateData: Record<string, any> = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (role !== undefined) updateData.role = role
    if (password !== undefined) updateData.generated_password = password
    if (alias !== undefined) updateData.alias = alias

    if (Object.keys(updateData).length > 0) {
      await adminSb.from('profiles').update(updateData).eq('id', user_id)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await checkAdmin(req)
  if (!admin) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ ok: false, error: 'user_id requerido' }, { status: 400 })
  if (user_id === admin.id) return NextResponse.json({ ok: false, error: 'No puedes eliminarte a ti mismo' }, { status: 400 })

  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, {
      method: 'DELETE',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    })
    if (!r.ok) { const d = await r.json(); throw new Error(d.msg || 'Error al eliminar') }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
