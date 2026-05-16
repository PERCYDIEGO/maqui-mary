'use client'

import { useState, useEffect, useMemo } from 'react'
import { Play, Pause, Lock, Unlock, Trash2, Volume2, Save, RotateCcw, Settings, Search, Music, Undo2, Headphones, Sparkles, Eye, EyeOff, RefreshCw, Shield, FileText, Upload, AlertCircle, CheckCircle, Globe, CreditCard, Building2, Hash } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { audio, TRACK_PRESETS } from '@/lib/audio'
import toast from 'react-hot-toast'

type SceneKey = 'landing' | 'crm' | 'login' | 'menu' | 'success'
type GameFilter = 'all' | 'top-gear' | 'gunbound'

type TrackMeta = { locked: boolean }
type Config = {
  default_tracks: Partial<Record<SceneKey, string>>
  track_volume: number
  track_meta: Record<string, TrackMeta>
  hidden_tracks: string[]
}

const SCENES: { key: SceneKey; label: string; icon: string; desc: string }[] = [
  { key: 'landing', label: 'Landing', icon: '🌅', desc: 'Página principal — clientes nuevos' },
  { key: 'crm', label: 'CRM', icon: '📊', desc: 'Panel de gestión — tú y tu equipo' },
  { key: 'login', label: 'Login', icon: '🔐', desc: 'Pantalla de inicio de sesión' },
  { key: 'menu', label: 'Menú', icon: '📋', desc: 'Navegación principal' },
  { key: 'success', label: 'Éxito', icon: '✅', desc: 'Compra/operación exitosa' },
]

const DEFAULT_CONFIG: Config = {
  default_tracks: {
    landing: 'top-gear-ending',
    crm: 'gunbound-battle-1',
    login: 'gunbound-now-loading',
    menu: 'gunbound-lobby',
    success: 'gunbound-sudden-death',
  },
  track_volume: 0.3,
  track_meta: Object.fromEntries(
    Object.keys(TRACK_PRESETS).map(id => [id, { locked: true }])
  ),
  hidden_tracks: [],
}

export default function MusicPlayerPage() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editor, setEditor] = useState(false)
  const [filter, setFilter] = useState<GameFilter>('all')
  const [search, setSearch] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [firstTime, setFirstTime] = useState(true)

  // ─── SUNAT Config State ───
  const [sunatConfig, setSunatConfig] = useState<any>(null)
  const [sunatLoading, setSunatLoading] = useState(true)
  const [sunatSaving, setSunatSaving] = useState(false)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<'emisor' | 'certificado' | 'ose'>('emisor')

  useEffect(() => {
    const seen = localStorage.getItem('mm-music-seen')
    if (seen) setFirstTime(false)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
          if (data?.role === 'admin' || data?.role === 'editor') setEditor(true)
        })
      }
    })
    fetch('/api/config').then(r => r.json()).then(data => {
      if (data.ok) setConfig({ ...DEFAULT_CONFIG, ...data.settings })
    }).finally(() => setLoading(false))
  }, [])

  // Cargar configuración SUNAT
  useEffect(() => {
    async function loadSunatConfig() {
      try {
        const { data, error } = await supabase.from('sunat_config').select('*').eq('id', 1).single()
        if (error) throw error
        setSunatConfig(data || {})
      } catch (e: any) {
        toast.error('Error cargando config SUNAT: ' + e.message)
      } finally {
        setSunatLoading(false)
      }
    }
    loadSunatConfig()
  }, [])

  async function handleSaveSunat() {
    setSunatSaving(true)
    try {
      let certBase64 = sunatConfig?.cert_base64 || ''

      // Si subió un nuevo archivo .pfx, convertir a base64
      if (certFile) {
        const reader = new FileReader()
        certBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(certFile)
        })
      }

      const payload = {
        ...sunatConfig,
        cert_base64: certBase64,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('sunat_config').upsert(payload)
      if (error) throw error

      toast.success('Configuración SUNAT guardada ✅')
      setCertFile(null)
    } catch (e: any) {
      toast.error('Error guardando: ' + e.message)
    } finally {
      setSunatSaving(false)
    }
  }

  function updateSunatField(field: string, value: string | number) {
    setSunatConfig((prev: any) => ({ ...prev, [field]: value }))
  }

  function dismissOnboarding() {
    setFirstTime(false)
    localStorage.setItem('mm-music-seen', 'true')
  }

  const visibleTracks = useMemo(() => {
    return Object.entries(TRACK_PRESETS).filter(([id]) => {
      if (config.hidden_tracks.includes(id)) return false
      if (filter === 'top-gear' && !id.startsWith('top-gear')) return false
      if (filter === 'gunbound' && !id.startsWith('gunbound')) return false
      if (search && !id.toLowerCase().includes(search.toLowerCase()) &&
          !TRACK_PRESETS[id].label.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [config.hidden_tracks, filter, search])

  const hiddenCount = config.hidden_tracks.length

  async function handleSave() {
    setSaving(true)
    try {
      const r = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await r.json()
      if (data.ok) toast.success('Configuración guardada ✅')
      else toast.error(data.error || 'Error al guardar')
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  function resetDefaults() {
    audio.stopTrack()
    setConfig(DEFAULT_CONFIG)
    audio.setTrackVolume(0.3)
    toast.success('Valores restaurados 🔄')
  }

  function updateMeta(id: string, upd: Partial<TrackMeta>) {
    setConfig(c => ({ ...c, track_meta: { ...c.track_meta, [id]: { ...c.track_meta[id], ...upd } } }))
  }

  function hideTrack(id: string) {
    const meta = config.track_meta[id]
    if (meta?.locked) return
    if (audio.currentTrackId === id) audio.stopTrack()
    setConfig(c => ({ ...c, hidden_tracks: [...c.hidden_tracks, id] }))
    toast('Canción oculta', {
      icon: '👻',
      duration: 4000,
    })
  }

  function restoreTrack(id: string) {
    setConfig(c => ({ ...c, hidden_tracks: c.hidden_tracks.filter(h => h !== id) }))
  }

  function restoreAll() {
    setConfig(c => ({ ...c, hidden_tracks: [] }))
    toast.success('Todas las canciones restauradas 🔄')
  }

  function handleGlobalVolume(v: number) {
    setConfig(c => ({ ...c, track_volume: v }))
    audio.setTrackVolume(v)
  }

  function playPreview(id: string) {
    if (audio.currentTrackId === id) {
      audio.stopTrack()
    } else {
      audio.startTrack(id, false)
    }
  }

  const activeDefault = (config as any).default_tracks as Record<string, string>

  if (loading) return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-100 animate-pulse" />
      <div className="w-48 h-5 mx-auto mb-2 rounded-full bg-primary-100 animate-pulse" />
      <div className="w-32 h-4 mx-auto rounded-full bg-primary-100 animate-pulse" />
    </div>
  )

  if (!editor) return (
    <div className="text-center py-16 text-primary-400">
      <Settings size={48} className="mx-auto mb-3 opacity-50" />
      <p className="font-medium">Sin permisos de editor</p>
      <p className="text-sm mt-1">Solo editores y administradores pueden configurar la música.</p>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            <span className="gradient-text">🎵 Music Player</span>
          </h1>
          <p className="text-primary-500 text-sm mt-1">
            Elige la banda sonora de tu marca — cada sección con su propio vibe
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetDefaults} className="btn-outline text-sm !px-4 !py-2 flex items-center gap-2">
            <RotateCcw size={16} /> Restaurar
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm !px-4 !py-2 flex items-center gap-2">
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* SECCIÓN SUNAT / EMISIÓN ELECTRÓNICA        */}
      {/* ═══════════════════════════════════════════ */}
      <div className="card mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-primary-800 text-lg">Configuración SUNAT</h2>
            <p className="text-primary-500 text-sm">Certificado digital, datos del emisor y emisión electrónica</p>
          </div>
        </div>

        {sunatLoading ? (
          <div className="text-center py-8 text-primary-400">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
            <p className="text-sm">Cargando configuración...</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-primary-200 pb-1">
              {[
                { key: 'emisor', label: '🏢 Datos del Emisor', icon: Building2 },
                { key: 'certificado', label: '🔐 Certificado Digital', icon: Shield },
                { key: 'ose', label: '🔗 OSE (Nubefact)', icon: Globe },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                    activeTab === tab.key
                      ? 'border-accent-gold text-accent-gold'
                      : 'border-transparent text-primary-500 hover:text-primary-700'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Datos del Emisor */}
            {activeTab === 'emisor' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">RUC *</label>
                  <input
                    value={sunatConfig?.ruc || ''}
                    onChange={e => updateSunatField('ruc', e.target.value)}
                    className="input-field w-full"
                    placeholder="20123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Ambiente *</label>
                  <select
                    value={sunatConfig?.environment || 'demo'}
                    onChange={e => updateSunatField('environment', e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="demo">Demo (pruebas)</option>
                    <option value="beta">Beta</option>
                    <option value="produccion">Producción (real)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-primary-700 mb-1">Razón Social *</label>
                  <input
                    value={sunatConfig?.razon_social || ''}
                    onChange={e => updateSunatField('razon_social', e.target.value)}
                    className="input-field w-full"
                    placeholder="ES PONJAS MAQUI MARY S.A.C."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-primary-700 mb-1">Nombre Comercial</label>
                  <input
                    value={sunatConfig?.nombre_comercial || ''}
                    onChange={e => updateSunatField('nombre_comercial', e.target.value)}
                    className="input-field w-full"
                    placeholder="MAQUI MARY"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-primary-700 mb-1">Dirección *</label>
                  <input
                    value={sunatConfig?.address || ''}
                    onChange={e => updateSunatField('address', e.target.value)}
                    className="input-field w-full"
                    placeholder="Calle Las Quebradas Mz E Lote 10, Ate Vitarte"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Urbanización</label>
                  <input
                    value={sunatConfig?.urbanizacion || ''}
                    onChange={e => updateSunatField('urbanizacion', e.target.value)}
                    className="input-field w-full"
                    placeholder="LAS QUEBRADAS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Ubigeo *</label>
                  <input
                    value={sunatConfig?.ubigeo || ''}
                    onChange={e => updateSunatField('ubigeo', e.target.value)}
                    className="input-field w-full"
                    placeholder="150103"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Departamento</label>
                  <input
                    value={sunatConfig?.departamento || ''}
                    onChange={e => updateSunatField('departamento', e.target.value)}
                    className="input-field w-full"
                    placeholder="LIMA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Provincia</label>
                  <input
                    value={sunatConfig?.provincia || ''}
                    onChange={e => updateSunatField('provincia', e.target.value)}
                    className="input-field w-full"
                    placeholder="LIMA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Distrito</label>
                  <input
                    value={sunatConfig?.distrito || ''}
                    onChange={e => updateSunatField('distrito', e.target.value)}
                    className="input-field w-full"
                    placeholder="ATE"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Series Factura</label>
                  <input
                    value={sunatConfig?.series_factura || ''}
                    onChange={e => updateSunatField('series_factura', e.target.value)}
                    className="input-field w-full"
                    placeholder="F001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Series Boleta</label>
                  <input
                    value={sunatConfig?.series_boleta || ''}
                    onChange={e => updateSunatField('series_boleta', e.target.value)}
                    className="input-field w-full"
                    placeholder="B001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Siguiente N° Factura</label>
                  <input
                    type="number"
                    value={sunatConfig?.next_number_factura || 1}
                    onChange={e => updateSunatField('next_number_factura', parseInt(e.target.value) || 1)}
                    className="input-field w-full"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Siguiente N° Boleta</label>
                  <input
                    type="number"
                    value={sunatConfig?.next_number_boleta || 1}
                    onChange={e => updateSunatField('next_number_boleta', parseInt(e.target.value) || 1)}
                    className="input-field w-full"
                    min={1}
                  />
                </div>
              </div>
            )}

            {/* Tab: Certificado Digital */}
            {activeTab === 'certificado' && (
              <div className="space-y-5">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Emisión directa a SUNAT</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Con tu certificado digital (.pfx) y usuario SOL, emitirás comprobantes directamente a SUNAT sin pagar a un OSE intermediario.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-primary-700 mb-2">Certificado Digital (.pfx)</label>
                    <div className="border-2 border-dashed border-primary-300 rounded-xl p-6 text-center hover:border-accent-gold transition-colors">
                      <input
                        type="file"
                        accept=".pfx,.p12"
                        onChange={e => setCertFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="cert-upload"
                      />
                      <label htmlFor="cert-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload size={28} className="text-primary-400" />
                        <span className="text-sm text-primary-600 font-medium">
                          {certFile ? certFile.name : sunatConfig?.cert_base64 ? 'Certificado ya cargado ✅' : 'Haz clic para subir tu .pfx'}
                        </span>
                        <span className="text-xs text-primary-400">
                          {certFile ? 'Listo para guardar' : 'Archivo .pfx o .p12'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Contraseña del .pfx *</label>
                    <input
                      type="password"
                      value={sunatConfig?.cert_password || ''}
                      onChange={e => updateSunatField('cert_password', e.target.value)}
                      className="input-field w-full"
                      placeholder="Contraseña del certificado"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Usuario SOL *</label>
                    <input
                      value={sunatConfig?.sol_user || ''}
                      onChange={e => updateSunatField('sol_user', e.target.value)}
                      className="input-field w-full"
                      placeholder="TUUSUARIOSOL"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-primary-700 mb-1">Clave SOL *</label>
                    <input
                      type="password"
                      value={sunatConfig?.sol_password || ''}
                      onChange={e => updateSunatField('sol_password', e.target.value)}
                      className="input-field w-full"
                      placeholder="Tu clave SOL"
                    />
                  </div>
                </div>

                {/* Estado del certificado */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50">
                  {sunatConfig?.cert_base64 ? (
                    <>
                      <CheckCircle size={18} className="text-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-700">Certificado digital configurado</p>
                        <p className="text-xs text-green-600">Modo: {sunatConfig?.environment === 'produccion' ? 'Producción' : 'Demo/Beta'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={18} className="text-amber-500 shrink-0" />
                      <p className="text-sm text-amber-700">No hay certificado digital configurado. Sube tu .pfx para activar la emisión directa.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tab: OSE */}
            {activeTab === 'ose' && (
              <div className="space-y-5">
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <div className="flex items-start gap-3">
                    <Globe size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Emisión vía OSE (Nubefact)</p>
                      <p className="text-xs text-amber-600 mt-1">
                        Si no tienes certificado digital, puedes usar un OSE como Nubefact. Ellos firman y envían a SUNAT por ti. Requiere token de API.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-primary-700 mb-1">Token de API (OSE)</label>
                    <input
                      type="password"
                      value={sunatConfig?.ose_token || ''}
                      onChange={e => updateSunatField('ose_token', e.target.value)}
                      className="input-field w-full"
                      placeholder="Token de Nubefact u otro OSE"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-primary-700 mb-1">URL Base</label>
                    <input
                      value={sunatConfig?.ose_url || ''}
                      onChange={e => updateSunatField('ose_url', e.target.value)}
                      className="input-field w-full"
                      placeholder="https://api.nubefact.com/api/v1/"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-primary-700 mb-1">Endpoint</label>
                    <input
                      value={sunatConfig?.ose_endpoint || ''}
                      onChange={e => updateSunatField('ose_endpoint', e.target.value)}
                      className="input-field w-full"
                      placeholder="943e6f17a99a4339ab7d59306f920555"
                    />
                  </div>
                </div>

                {sunatConfig?.ose_token && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50">
                    <CheckCircle size={18} className="text-green-500 shrink-0" />
                    <p className="text-sm text-green-700">Token OSE configurado. Si también tienes certificado digital, se priorizará la emisión directa.</p>
                  </div>
                )}
              </div>
            )}

            {/* Botón guardar */}
            <div className="flex justify-end pt-4 border-t border-primary-200 mt-6">
              <button
                onClick={handleSaveSunat}
                disabled={sunatSaving}
                className="btn-primary flex items-center gap-2 !px-6 !py-3 disabled:opacity-50"
              >
                <Save size={18} />
                {sunatSaving ? 'Guardando...' : 'Guardar Configuración SUNAT'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Onboarding CX */}
      {firstTime && (
        <div className="card-glass mb-6 p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 to-transparent pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-accent-gold/20 flex items-center justify-center text-2xl">
              🎧
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-bold text-primary-800 text-lg mb-1">
                Dale personalidad a tu marca
              </h3>
              <p className="text-sm text-primary-500 mb-3">
                La música de fondo crea conexión emocional con tus clientes. 
                Elige tracks distintos para la landing (clientes nuevos) y el CRM (tu equipo). 
                Todo se guarda automáticamente en la nube. 🚀
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={dismissOnboarding} className="btn-primary text-xs !px-3 !py-1.5">
                  ¡Entendido!
                </button>
                <button onClick={() => { dismissOnboarding(); audio.startTrack('top-gear-ending') }} className="btn-outline text-xs !px-3 !py-1.5 flex items-center gap-1.5">
                  <Play size={12} /> Probar ahora
                </button>
              </div>
            </div>
            <button onClick={dismissOnboarding} className="shrink-0 p-1.5 rounded-xl hover:bg-primary-100 text-primary-400">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Now Playing */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${audio.trackPlaying ? 'bg-green-500 animate-pulse' : 'bg-primary-300'}`} />
            <h2 className="font-heading font-bold text-primary-800 text-lg">Ahora suena</h2>
          </div>
          <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
            audio.trackPlaying
              ? 'bg-gradient-to-r from-green-50 to-accent-gold/5 border-green-200'
              : 'bg-primary-50/50 border-primary-100'
          }`}>
            {audio.trackPlaying ? (
              <>
                <div className="shrink-0 w-10 h-10 rounded-xl bg-accent-gold/20 flex items-center justify-center text-lg">
                  🎵
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary-800 truncate">
                    {TRACK_PRESETS[audio.currentTrackId]?.label || '?'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-green-600 font-medium">Reproduciendo</span>
                    <span className="text-primary-300">·</span>
                    <span className="text-xs text-primary-400">
                      {audio.currentTrackId.startsWith('top-gear') ? '🏁 Top Gear' : '🎮 Gunbound'}
                    </span>
                  </div>
                </div>
                <button onClick={() => audio.stopTrack()} className="btn-outline text-sm !px-3 !py-1.5 flex items-center gap-1.5">
                  <Pause size={14} /> Detener
                </button>
              </>
            ) : (
              <>
                <div className="shrink-0 w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-lg">
                  🎧
                </div>
                <div className="flex-1">
                  <p className="text-primary-500">Ninguna canción activa</p>
                  <p className="text-xs text-primary-400 mt-0.5">Presiona ▶ en cualquier track para previsualizar</p>
                </div>
              </>
            )}
          </div>

          {/* Quick scene test */}
          {audio.trackPlaying && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SCENES.map(scene => {
                const trackId = activeDefault[scene.key]
                const isActive = audio.currentTrackId === trackId
                return (
                  <button
                    key={scene.key}
                    onClick={() => { if (trackId) audio.startTrack(trackId) }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-accent-gold/10 border-accent-gold text-accent-gold font-medium'
                        : 'bg-white border-primary-200 text-primary-500 hover:border-primary-300'
                    }`}
                  >
                    {scene.icon} {scene.label}
                    {isActive && ' ▶'}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Playlist */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-3 flex-1">
              <h2 className="font-heading font-bold text-primary-800 text-lg">🎶 Playlist</h2>
              <span className="text-xs text-primary-400 bg-primary-100 px-2 py-0.5 rounded-full">
                {visibleTracks.length} de {Object.keys(TRACK_PRESETS).length - hiddenCount} tracks
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="input-field !pl-8 !py-1.5 !text-sm w-36 sm:w-44"
                />
              </div>
              {/* Filter tabs */}
              <div className="flex bg-primary-100 rounded-xl p-0.5">
                {(['all', 'top-gear', 'gunbound'] as GameFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                      filter === f ? 'bg-white text-primary-800 shadow-sm' : 'text-primary-500 hover:text-primary-700'
                    }`}
                  >
                    {f === 'all' ? 'Todo' : f === 'top-gear' ? '🏁 Top Gear' : '🎮 Gunbound'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Empty state */}
          {visibleTracks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-30">🎵</div>
              <p className="text-primary-500 font-medium">No hay tracks visibles</p>
              <p className="text-sm text-primary-400 mt-1">
                {search ? 'Prueba con otro término de búsqueda' : 'Todos los tracks están ocultos'}
              </p>
              {(search || hiddenCount > 0) && (
                <button onClick={() => { setSearch(''); setFilter('all') }} className="btn-outline text-xs mt-3 !px-3 !py-1.5">
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Track list */}
          <div className="space-y-1.5">
            {visibleTracks.map(([id, preset]) => {
              const meta = config.track_meta[id] || { locked: true }
              const isPlaying = audio.trackPlaying && audio.currentTrackId === id
              const isLocked = meta.locked
              const isDefault = Object.values(activeDefault).includes(id)
              const assignedScenes = Object.entries(activeDefault)
                .filter(([_, v]) => v === id)
                .map(([k]) => k as SceneKey)

              return (
                <div
                  key={id}
                  className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isPlaying
                      ? 'bg-accent-gold/10 border-accent-gold shadow-sm'
                      : 'bg-white border-primary-100 hover:border-primary-200 hover:shadow-sm'
                  }`}
                >
                  {/* Play/Pause */}
                  <button
                    onClick={() => playPreview(id)}
                    className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                      isPlaying
                        ? 'bg-accent-gold text-white shadow-md scale-110'
                        : 'bg-primary-100 text-primary-600 hover:bg-primary-200 hover:scale-105 active:scale-95'
                    }`}
                    title={isPlaying ? 'Detener' : 'Previsualizar'}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-sm truncate ${isPlaying ? 'text-accent-gold' : 'text-primary-800'}`}>
                        {preset.label}
                      </p>
                      {isDefault && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
                          ★ Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        id.startsWith('top-gear')
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {id.startsWith('top-gear') ? '🏁 Top Gear' : '🎮 Gunbound'}
                      </span>
                      {assignedScenes.map(sk => {
                        const sc = SCENES.find(s => s.key === sk)
                        return sc ? (
                          <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-sky-100 text-sky-700">
                            {sc.icon} {sc.label}
                          </span>
                        ) : null
                      })}
                      {!isDefault && preset.scene && !assignedScenes.includes(preset.scene) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-primary-100 text-primary-500">
                          {SCENES.find(s => s.key === preset.scene)?.icon} sugerido
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Candado */}
                  <button
                    onClick={() => updateMeta(id, { locked: !isLocked })}
                    className={`shrink-0 p-2 rounded-xl transition-all ${
                      isLocked
                        ? 'text-accent-gold hover:bg-accent-gold/10'
                        : 'text-primary-300 hover:bg-red-50 hover:text-red-400'
                    }`}
                    title={isLocked ? 'Bloqueada — desbloquear para ocultar' : 'Desbloqueada — toca el candado para proteger'}
                  >
                    {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                  </button>

                  {/* Ocultar (solo si desbloqueado) */}
                  {!isLocked && (
                    <button
                      onClick={() => hideTrack(id)}
                      className="shrink-0 p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Ocultar de la playlist"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Hidden tracks */}
        {hiddenCount > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <EyeOff size={18} className="text-primary-400" />
                <h2 className="font-heading font-bold text-primary-800 text-lg">Canciones ocultas</h2>
                <span className="text-xs text-primary-400 bg-primary-100 px-2 py-0.5 rounded-full">{hiddenCount}</span>
              </div>
              <button onClick={restoreAll} className="btn-outline text-xs !px-3 !py-1.5 flex items-center gap-1.5">
                <RefreshCw size={12} /> Restaurar todas
              </button>
            </div>
            <div className="space-y-1.5">
              {config.hidden_tracks.map(id => {
                const preset = TRACK_PRESETS[id]
                if (!preset) return null
                return (
                  <div key={id} className="flex items-center gap-3 p-2.5 rounded-xl bg-primary-50/50 border border-primary-100">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-sm opacity-50">
                      🎵
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-primary-500 line-through truncate">{preset.label}</p>
                    </div>
                    <button
                      onClick={() => restoreTrack(id)}
                      className="btn-outline text-xs !px-2.5 !py-1 flex items-center gap-1"
                    >
                      <Undo2 size={12} /> Restaurar
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Default tracks by scene */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles size={20} className="text-accent-gold" />
            <h2 className="font-heading font-bold text-primary-800 text-lg">🎯 Asignación por sección</h2>
          </div>
          <p className="text-sm text-primary-500 mb-4">
            Cada sección de tu web y CRM puede tener su propia canción. 
            Así creas el ambiente perfecto para cada momento.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {SCENES.map(scene => {
              const currentId = config.default_tracks[scene.key]
              const currentPreset = currentId ? TRACK_PRESETS[currentId] : null
              const isNowPlaying = audio.trackPlaying && audio.currentTrackId === currentId

              return (
                <div
                  key={scene.key}
                  className={`p-4 rounded-xl border transition-all ${
                    isNowPlaying
                      ? 'bg-accent-gold/5 border-accent-gold'
                      : 'bg-primary-50/50 border-primary-100 hover:border-primary-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{scene.icon}</span>
                    <span className="font-semibold text-sm text-primary-800">{scene.label}</span>
                  </div>
                  <p className="text-[11px] text-primary-400 mb-3">{scene.desc}</p>

                  <select
                    value={currentId || ''}
                    onChange={e => {
                      const id = e.target.value
                      setConfig(c => ({
                        ...c,
                        default_tracks: { ...c.default_tracks, [scene.key]: id },
                      }))
                      if (id) audio.startTrack(id)
                    }}
                    className="input-field w-full text-sm"
                  >
                    <option value="">🔇 Silencio</option>
                    {Object.entries(TRACK_PRESETS)
                      .filter(([id]) => !config.hidden_tracks.includes(id))
                      .map(([id, preset]) => (
                        <option key={id} value={id}>{preset.label}</option>
                      ))}
                  </select>

                  <div className="flex items-center gap-1.5 mt-2">
                    {currentPreset && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-primary-100 text-primary-600">
                        {currentPreset.label}
                      </span>
                    )}
                    {!currentId && (
                      <span className="text-[10px] text-primary-400">Sin asignar</span>
                    )}
                    {isNowPlaying && (
                      <span className="text-[10px] text-green-600 font-medium">▶ Sonando</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Volume */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 size={20} className="text-accent-gold" />
            <h2 className="font-heading font-bold text-primary-800 text-lg">Volumen global</h2>
          </div>
          <div className="flex items-center gap-4">
            <Volume2 size={18} className="text-primary-400 shrink-0" />
            <div className="flex-1 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={config.track_volume}
                onChange={e => handleGlobalVolume(parseFloat(e.target.value))}
                className="flex-1 accent-accent-gold h-2"
              />
              {/* Wave visualization */}
              <div className="flex items-end gap-0.5 h-6">
                {Array.from({ length: 8 }).map((_, i) => {
                  const active = config.track_volume > i * 0.125
                  const height = audio.trackPlaying
                    ? 4 + Math.sin(Date.now() * 0.01 + i) * 8 + Math.random() * 4
                    : 4
                  return (
                    <div
                      key={i}
                      className="w-1 rounded-full transition-all duration-150"
                      style={{
                        height: `${active ? Math.max(4, height) : 4}px`,
                        backgroundColor: active
                          ? `hsl(${40 - i * 3}, ${70 + i * 3}%, ${55 - i * 2}%)`
                          : '#e5e7eb',
                        opacity: audio.trackPlaying ? 0.8 : 0.4,
                      }}
                    />
                  )
                })}
              </div>
            </div>
            <span className="text-sm font-medium tabular-nums text-primary-600 w-10 text-right shrink-0">
              {Math.round(config.track_volume * 100)}%
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2 mt-3">
            {[0, 25, 50, 75, 100].map(v => (
              <button
                key={v}
                onClick={() => handleGlobalVolume(v / 100)}
                className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                  Math.round(config.track_volume * 100) === v
                    ? 'bg-accent-gold/10 border-accent-gold text-accent-gold font-medium'
                    : 'bg-white border-primary-200 text-primary-500 hover:border-primary-300'
                }`}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
