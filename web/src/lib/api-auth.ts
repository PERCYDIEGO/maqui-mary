import { type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function verifyAuth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const sb = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user } } = await sb.auth.getUser(token)
  return user
}

export async function verifyAdmin(req: NextRequest) {
  const user = await verifyAuth(req)
  if (!user) return null

  const adminSb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile } = await adminSb.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'admin') return user

  return null
}
