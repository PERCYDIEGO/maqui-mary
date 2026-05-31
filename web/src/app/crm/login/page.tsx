'use client'

import { useState, useEffect, useRef } from 'react'
import { Lock, Eye, EyeOff, User, CheckSquare, Square, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { MaquiMaryLogo } from '@/components/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recordar, setRecordar] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [formReady, setFormReady] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    setLoading(false)
    mountedRef.current = true
    // Esperar 1s antes de permitir submit para evitar auto-envío del password manager móvil
    const t = setTimeout(() => setFormReady(true), 1000)
    return () => { mountedRef.current = false; clearTimeout(t) }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formReady) return
    setErrorMsg('')

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Completa todos los campos')
      return
    }

    const domain = process.env.NEXT_PUBLIC_EMAIL_DOMAIN || 'maquimary.local'
    const loginId = email.trim().includes('@') ? email.trim() : `${email.trim()}@${domain}`

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginId,
        password,
      })

      if (error) {
        const msg = error.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos'
          : error.message || 'Error al iniciar sesión'
        setErrorMsg(msg)
        toast.error(msg)
        setLoading(false)
        return
      }

      if (mountedRef.current) {
        try {
          if (recordar) {
            sessionStorage.setItem('maqui_remember_email', email.trim())
          } else {
            sessionStorage.removeItem('maqui_remember_email')
          }
          sessionStorage.removeItem('maqui_remember_pass')
        } catch {}
        toast.success('Bienvenido')
        window.location.href = '/crm'
      }
    } catch (err: any) {
      if (!window.navigator.onLine) {
        setErrorMsg('Sin conexión a internet')
        toast.error('Sin conexión')
      } else {
        const msg = err?.message || 'Error al conectar con el servidor. Intenta de nuevo.'
        setErrorMsg(msg)
        toast.error(msg)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-900 via-ink-800 to-accent-navy flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-noise" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-terracotta/5 rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative">
        {/* Badge de seguridad - corregido para no estar oculto */}
        <div className="flex justify-center mb-4">
          <div className="bg-accent-terracotta text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5">
            <Lock size={12} />
            Acceso Restringido
          </div>
        </div>
        
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-elevated border border-white/60 animate-fade-up">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <MaquiMaryLogo size={48} variant="icon" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-800">Área de Empleados</h1>
            <p className="font-body text-ink-500 text-sm mt-1">Ingresa tus credenciales para acceder</p>
            <p className="text-xs text-ink-400 mt-2">Sistema interno Maqui Mary</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 group-focus-within:text-accent-gold transition-colors" />
              <input
                type="text"
                inputMode="email"
                autoCapitalize="off"
                autoCorrect="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo o alias"
                className="w-full px-4 py-3.5 pl-12 rounded-xl border border-ink-200 bg-ink-50/50 text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold transition-all duration-200"
              />
            </div>

            <div className="relative group">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full px-4 py-3.5 pr-12 rounded-xl border border-ink-200 bg-ink-50/50 text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
              >
                {show ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <label
              onClick={() => setRecordar(!recordar)}
              className="flex items-center gap-2 text-sm text-ink-500 hover:text-ink-700 transition-colors cursor-pointer select-none"
            >
              {recordar
                ? <CheckSquare size={18} className="text-accent-gold" />
                : <Square size={18} className="text-ink-400" />}
              Recordar correo
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-terracotta hover:bg-accent-terracotta/90 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Ingresar
                </>
              )}
            </button>

            {errorMsg && (
              <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl p-3.5 border border-red-200/80 animate-fade-down">
                {errorMsg}
              </p>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-ink-100 text-center">
            <a href="/" className="text-sm text-ink-500 hover:text-accent-gold transition-colors inline-flex items-center gap-1.5 group">
              <span>Volver a la tienda</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </a>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-ink-500/60">
          <Sparkles size={12} className="inline mr-1" />
          ESPONJAS MAQUI MARY — Lurigancho, Lima
        </p>
      </div>
    </div>
  )
}
