'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, Plus, UserCog, Shield, Trash2, X, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type UserRow = {
  id: string
  email: string
  alias: string
  created_at: string
  last_sign_in_at: string
  full_name?: string
  role?: string
}

const PASS_WORDS = ['esponja', 'paño', 'limpieza', 'maqui', 'mary', 'multiuso', 'acero', 'colores', 'vajilla', 'hogar', 'cocina', 'trapo']
const PASS_SUFFIXES = ['123', '2024', '456', '789', '321', '999', '555', '777']

function generarPass(): string {
  const a = PASS_WORDS[Math.floor(Math.random() * PASS_WORDS.length)]
  const b = PASS_WORDS[Math.floor(Math.random() * PASS_WORDS.length)]
  const n = PASS_SUFFIXES[Math.floor(Math.random() * PASS_SUFFIXES.length)]
  return a.charAt(0).toUpperCase() + a.slice(1) + b.charAt(0).toUpperCase() + b.slice(1) + n
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [form, setForm] = useState({ alias: '', password: '', full_name: '', role: 'editor' })
  const [saving, setSaving] = useState(false)
  const [myId, setMyId] = useState<string>('')
  const [myRole, setMyRole] = useState<string>('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setMyId(session.user.id)
        supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
          if (data?.role === 'admin') setIsAdmin(true)
          setMyRole(data?.role || 'editor')
        })
      }
    })
    loadUsers()
  }, [])

  useEffect(() => {
    if (showModal === 'create') {
      const pass = generarPass()
      setForm(f => ({ ...f, password: pass }))
    }
  }, [showModal])

  async function loadUsers() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const r = await fetch('/api/auth/admin', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await r.json()
      if (data.ok) {
        setUsers(data.users.map((u: any) => ({
          ...u,
          alias: u.alias || u.email,
          full_name: u.full_name || '',
          role: u.role || 'editor',
        })))
      } else {
        toast.error('No tienes permisos de administrador')
      }
    } catch {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.alias || !form.password) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const r = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(form),
      })
      const data = await r.json()
      if (data.ok) {
        toast.success('Usuario creado')
        setShowModal(null)
        setForm({ alias: '', password: '', full_name: '', role: 'editor' })
        loadUsers()
      } else {
        toast.error(data.error || 'Error al crear')
      }
    } catch {
      toast.error('Error al crear usuario')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!selectedUser) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const r = await fetch('/api/auth/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          user_id: selectedUser.id,
          alias: form.alias,
          full_name: form.full_name,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        }),
      })
      const data = await r.json()
      if (data.ok) {
        toast.success('Usuario actualizado')
        setShowModal(null)
        setSelectedUser(null)
        setForm({ alias: '', password: '', full_name: '', role: 'editor' })
        loadUsers()
      } else {
        toast.error(data.error || 'Error al actualizar')
      }
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(user: UserRow) {
    if (!confirm(`¿Eliminar a ${user.alias}? Esta acción no se puede deshacer.`)) return
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const r = await fetch('/api/auth/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ user_id: user.id }),
      })
      const data = await r.json()
      if (data.ok) {
        toast.success('Usuario eliminado')
        loadUsers()
      } else {
        toast.error(data.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error al eliminar')
    }
  }

  function openEdit(user: UserRow) {
    setSelectedUser(user)
    setForm({ alias: user.alias, password: '', full_name: user.full_name || '', role: user.role || 'editor' })
    setShowModal('edit')
  }

  const filtered = users.filter(u =>
    u.alias.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="text-center py-16 text-primary-500"><Users size={48} className="mx-auto mb-3 opacity-50 animate-pulse" /><p>Cargando usuarios...</p></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-primary-800">Usuarios</h1>
          <p className="text-primary-500 text-sm mt-1">{isAdmin ? `${users.length} usuarios registrados` : 'Tu perfil'}</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setForm({ alias: '', password: '', full_name: '', role: 'editor' }); setShowModal('create') }} className="btn-primary text-sm flex items-center gap-2 !px-4 !py-2">
            <Plus size={18} /> Nuevo usuario
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" />
          <input type="text" placeholder="Buscar por alias o nombre..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-12" />
        </div>
      )}

      <div className="space-y-3">
        {(isAdmin ? filtered : users.filter(u => u.id === myId)).map(u => (
          <div key={u.id} className="card !p-4 flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-sm ${u.role === 'admin' ? 'bg-accent-gold/20 text-accent-gold' : 'bg-primary-100 text-primary-600'}`}>
              <Shield size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-primary-800 truncate">{u.full_name || u.alias}</p>
              <p className="text-primary-500 text-xs">{u.alias}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : u.role === 'viewer' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {u.role === 'admin' ? 'Admin' : u.role === 'viewer' ? 'Visor' : 'Editor'}
                </span>
                <span className="text-xs text-primary-400">
                  Creado: {new Date(u.created_at).toLocaleDateString('es-PE')}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(u)} className="p-2 rounded-lg bg-primary-100 text-primary-600 hover:bg-primary-200"><UserCog size={16} /></button>
              {isAdmin && u.id !== myId && (
                <button onClick={() => handleDelete(u)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={16} /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAdmin && filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-primary-400">
          <Users size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium">No se encontraron usuarios</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(null)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <button onClick={() => setShowModal(null)} className="absolute top-4 right-4 text-primary-400 hover:text-primary-600"><X size={20} /></button>

            <h2 className="font-heading text-xl font-bold text-primary-800 mb-6">
              {showModal === 'create' ? 'Nuevo Usuario' : isAdmin ? 'Editar Usuario' : 'Mi perfil'}
            </h2>

            <form onSubmit={showModal === 'create' ? handleCreate : (e) => { e.preventDefault(); handleUpdate() }} className="space-y-4">
              {showModal === 'create' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Alias</label>
                    <input type="text" required value={form.alias} onChange={e => setForm({ ...form, alias: e.target.value })} placeholder="Ej: juanperez" className="input-field" />
                    <p className="text-xs text-primary-400 mt-1">Se usará para iniciar sesión</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Contraseña</label>
                    <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Ej: Maqui1234!" className="input-field font-mono text-sm" />
                    <p className="text-xs text-primary-400 mt-1">Generada automáticamente, puedes cambiarla</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Nombre completo</label>
                    <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Ej: Juan Pérez" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Rol</label>
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input-field">
                      <option value="admin">Admin — Acceso total</option>
                      <option value="editor">Editor — Productos, pedidos, facturas</option>
                      <option value="viewer">Visor — Solo lectura</option>
                    </select>
                  </div>
                </>
              )}
              {showModal === 'edit' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Alias</label>
                    <input type="text" value={form.alias} onChange={e => setForm({ ...form, alias: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">{isAdmin ? 'Nueva contraseña' : 'Cambiar contraseña'} <span className="text-primary-400 font-normal">(dejar vacío para mantener)</span></label>
                    <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Si no cambia, dejar vacío" className="input-field" />
                  </div>
                  {isAdmin && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-1">Nombre completo</label>
                        <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Ej: Juan Pérez" className="input-field" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary-700 mb-1">Rol</label>
                        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input-field">
                          <option value="admin">Admin — Acceso total</option>
                          <option value="editor">Editor — Productos, pedidos, facturas</option>
                          <option value="viewer">Visor — Solo lectura</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}
              <button type="submit" disabled={saving} className="w-full btn-primary py-3 disabled:opacity-50">
                {saving ? 'Guardando...' : showModal === 'create' ? 'Crear usuario' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
