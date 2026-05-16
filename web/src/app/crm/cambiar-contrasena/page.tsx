'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, Shield, ArrowLeft, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export default function CambiarContrasenaPage() {
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN') setCheckingSession(false)
        })
        setTimeout(() => setCheckingSession(false), 3000)
      } else {
        setCheckingSession(false)
      }
    })
  }, [])

  const errors: string[] = []
  if (pass.length < 8) errors.push('• Mínimo 8 caracteres')
  if (!/[A-Z]/.test(pass)) errors.push('• Al menos una mayúscula')
  if (!/[a-z]/.test(pass)) errors.push('• Al menos una minúscula')
  if (!/[0-9]/.test(pass)) errors.push('• Al menos un número')
  const specialRgx = new RegExp('[!@#$%^&*(),.?":{}|<>_]')
  if (!specialRgx.test(pass)) errors.push('• Al menos un carácter especial (!@#$%...)')
  const valid = errors.length === 0 && pass === confirm && pass.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) { toast.error('Revisa los requisitos de seguridad'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pass })
      if (error) { toast.error(error.message); return }

      const user = (await supabase.auth.getSession()).data.session?.user
      if (user) {
        await supabase.from('profiles').update({ force_password_change: false }).eq('id', user.id)
      }
      toast.success('Contraseña actualizada ✅')
      router.push('/crm')
    } catch (e) { toast.error('Error al actualizar') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-900 via-ink-800 to-accent-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-elevated border border-white/60">
          {checkingSession ? (
            <div className="text-center py-8">
              <Loader size={24} className="mx-auto mb-3 text-ink-400 animate-spin" />
              <p className="text-ink-500 text-sm">Verificando acceso...</p>
            </div>
          ) : (
          <>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-accent-gold rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-ink-800" />
            </div>
            <h1 className="font-heading text-xl font-bold text-ink-800">Cambiar contraseña</h1>
            <p className="text-ink-500 text-sm mt-1">Debes cambiar tu contraseña por seguridad</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="Nueva contraseña"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-ink-200 bg-ink-50/50 text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold transition-all duration-200"
                autoFocus
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors">
                {show ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirmar contraseña"
                className="w-full px-4 py-3 rounded-xl border border-ink-200 bg-ink-50/50 text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold transition-all duration-200"
              />
            </div>

            <div className={`rounded-xl p-3 text-xs space-y-1 ${valid && pass === confirm && pass.length > 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {pass.length === 0 ? (
                <p>Requisitos de seguridad:</p>
              ) : valid && pass === confirm ? (
                <p className="text-green-600 font-medium">✅ Contraseña segura</p>
              ) : null}
              {errors.map((e, i) => (
                <p key={i} className={pass.length === 0 ? 'text-amber-600' : 'text-green-600'}>{e}</p>
              ))}
              {pass !== confirm && confirm.length > 0 && (
                <p className="text-red-500">❌ Las contraseñas no coinciden</p>
              )}
            </div>

            <button type="submit" disabled={!valid || loading} className="w-full bg-accent-terracotta hover:bg-accent-terracotta/90 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => { supabase.auth.signOut(); router.push('/crm/login') }} className="text-sm text-ink-400 hover:text-accent-gold transition-colors flex items-center justify-center gap-1 mx-auto">
              <ArrowLeft size={14} /> Volver al login
            </button>
          </div>
          </>
        )}
      </div>
    </div>
    </div>
  )
}
