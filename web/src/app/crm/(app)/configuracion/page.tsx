'use client'

import { useState, useEffect, useMemo } from 'react'
import { Play, Pause, Lock, Unlock, Trash2, Volume2, Save, RotateCcw, Settings, Search, Music, Undo2, Headphones, Sparkles, Eye, EyeOff, RefreshCw, Shield, FileText, Upload, AlertCircle, CheckCircle, Globe, CreditCard, Building2, Hash, MessageCircle, MapPin, Clock, Truck, Plus, Pencil, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { audio, TRACK_PRESETS } from '@/lib/audio'
import toast from 'react-hot-toast'

type ZonaDelivery = {
  id: number
  nombre: string
  distancia_min: number
  distancia_max: number | null
  tarifa: number
  tiempo_estimado: string
  activo: boolean
}

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
  const [activeTab, setActiveTab] = useState<'emisor' | 'certificado' | 'ose' | 'contacto'>('emisor')

  // ─── Empresa / Contacto State ───
  const [empresaConfig, setEmpresaConfig] = useState({
    whatsapp_clientes: '',
    whatsapp_negocio: '',
    direccion_display: '',
    horario: '',
  })
  const [empresaSaving, setEmpresaSaving] = useState(false)

  // ─── Delivery Zonas State ───
  const [zonas, setZonas] = useState<ZonaDelivery[]>([])
  const [zonasLoading, setZonasLoading] = useState(true)
  const [editId, setEditId] = useState<number | null>(null)
  const [editData, setEditData] = useState<{ nombre: string; distancia_min: string; distancia_max: string; tarifa: string; tiempo_estimado: string }>({ nombre: '', distancia_min: '', distancia_max: '', tarifa: '', tiempo_estimado: '' })
  const [savingId, setSavingId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [newZona, setNewZona] = useState({ nombre: '', distancia_min: '', distancia_max: '', tarifa: '', tiempo_estimado: '1-2 días hábiles' })
  const [addingSaving, setAddingSaving] = useState(false)

  // ─── Tema visual ───
  const [temaActivo, setTemaActivo] = useState('terracota')
  const [temaSaving, setTemaSaving] = useState(false)

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
      if (data.ok) {
        setConfig({ ...DEFAULT_CONFIG, ...data.settings })
        if (data.settings?.tema) setTemaActivo(data.settings.tema)
      }
    }).finally(() => setLoading(false))
  }, [])

  // Cargar configuración de empresa / contacto
  useEffect(() => {
    fetch('/api/empresa').then(r => r.json()).then(data => {
      if (data.ok) {
        setEmpresaConfig({
          whatsapp_clientes: data.whatsapp_clientes || '',
          whatsapp_negocio:  data.whatsapp_negocio  || '',
          direccion_display: data.direccion_display  || '',
          horario:           data.horario            || '',
        })
      }
    }).catch(() => {})
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

  // Cargar zonas de delivery
  useEffect(() => {
    supabase
      .from('zonas_delivery')
      .select('*')
      .order('distancia_min', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setZonas(data)
        setZonasLoading(false)
      })
  }, [])

  function startEdit(z: ZonaDelivery) {
    setEditId(z.id)
    setEditData({
      nombre: z.nombre,
      distancia_min: String(z.distancia_min),
      distancia_max: z.distancia_max !== null ? String(z.distancia_max) : '',
      tarifa: String(z.tarifa),
      tiempo_estimado: z.tiempo_estimado,
    })
  }

  function cancelEdit() {
    setEditId(null)
  }

  async function saveEdit(id: number) {
    const tarifa = parseFloat(editData.tarifa)
    const distMin = parseFloat(editData.distancia_min)
    if (!editData.nombre.trim() || isNaN(tarifa) || tarifa < 0 || isNaN(distMin) || distMin < 0) {
      toast.error('Nombre, distancia mínima y tarifa válidos son requeridos')
      return
    }
    const distMax = editData.distancia_max.trim() ? parseFloat(editData.distancia_max) : null
    setSavingId(id)
    const { error } = await supabase
      .from('zonas_delivery')
      .update({ nombre: editData.nombre.trim(), distancia_min: distMin, distancia_max: distMax, tarifa, tiempo_estimado: editData.tiempo_estimado.trim() })
      .eq('id', id)
    if (error) { toast.error('Error al guardar: ' + error.message) }
    else {
      setZonas(zs => zs.map(z => z.id === id ? { ...z, nombre: editData.nombre.trim(), distancia_min: distMin, distancia_max: distMax, tarifa, tiempo_estimado: editData.tiempo_estimado.trim() } : z))
      setEditId(null)
      toast.success('Zona actualizada ✅')
    }
    setSavingId(null)
  }

  async function toggleActivo(z: ZonaDelivery) {
    const { error } = await supabase.from('zonas_delivery').update({ activo: !z.activo }).eq('id', z.id)
    if (error) toast.error('Error: ' + error.message)
    else setZonas(zs => zs.map(x => x.id === z.id ? { ...x, activo: !z.activo } : x))
  }

  async function deleteZona(id: number) {
    if (!confirm('¿Eliminar esta zona de delivery?')) return
    const { error } = await supabase.from('zonas_delivery').delete().eq('id', id)
    if (error) toast.error('Error: ' + error.message)
    else { setZonas(zs => zs.filter(z => z.id !== id)); toast.success('Zona eliminada') }
  }

  async function handleAddZona() {
    const tarifa = parseFloat(newZona.tarifa)
    const distMin = parseFloat(newZona.distancia_min)
    if (!newZona.nombre.trim() || isNaN(tarifa) || tarifa < 0 || isNaN(distMin) || distMin < 0) {
      toast.error('Completa nombre, distancia mínima y tarifa válida')
      return
    }
    const distMax = newZona.distancia_max.trim() ? parseFloat(newZona.distancia_max) : null
    setAddingSaving(true)
    const { data, error } = await supabase
      .from('zonas_delivery')
      .insert({ nombre: newZona.nombre.trim(), distancia_min: distMin, distancia_max: distMax, tarifa, tiempo_estimado: newZona.tiempo_estimado.trim(), activo: true })
      .select()
      .single()
    if (error) toast.error('Error: ' + error.message)
    else {
      setZonas(zs => [...zs, data].sort((a, b) => a.distancia_min - b.distancia_min))
      setNewZona({ nombre: '', distancia_min: '', distancia_max: '', tarifa: '', tiempo_estimado: '1-2 días hábiles' })
      setAdding(false)
      toast.success('Zona agregada ✅')
    }
    setAddingSaving(false)
  }

  async function getToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }

  async function handleSaveEmpresa() {
    setEmpresaSaving(true)
    try {
      const token = await getToken()
      const r = await fetch('/api/empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(empresaConfig),
      })
      const data = await r.json()
      if (data.ok) toast.success('Configuración de contacto guardada ✅')
      else toast.error(data.error || 'Error al guardar')
    } catch { toast.error('Error al guardar') }
    finally { setEmpresaSaving(false) }
  }

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
      const token = await getToken()
      const r = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(config),
      })
      const data = await r.json()
      if (data.ok) toast.success('Configuración guardada ✅')
      else toast.error(data.error || 'Error al guardar')
    } catch { toast.error('Error al guardar') }
    finally { setSaving(false) }
  }

  async function handleSaveTema(tema: string) {
    setTemaActivo(tema)
    setTemaSaving(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tema }),
      })
      const data = await res.json()
      if (data.ok) toast.success('Tema aplicado ✅')
      else toast.error(data.error || 'Error al guardar tema')
    } catch { toast.error('Error al guardar tema') }
    finally { setTemaSaving(false) }
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
            <div className="flex flex-wrap gap-2 mb-6 border-b border-primary-200 pb-1">
              {[
                { key: 'emisor', label: '🏢 Datos del Emisor', icon: Building2 },
                { key: 'certificado', label: '🔐 Certificado Digital', icon: Shield },
                { key: 'ose', label: '🔗 OSE (Nubefact)', icon: Globe },
                { key: 'contacto', label: '📞 Contacto & Web', icon: MessageCircle },
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

            {/* Tab: Contacto & Web */}
            {activeTab === 'contacto' && (
              <div className="space-y-5">
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-start gap-3">
                    <MessageCircle size={18} className="text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Datos de contacto del landing</p>
                      <p className="text-xs text-green-600 mt-1">
                        Estos valores se muestran en la web pública y en los botones de WhatsApp. El negocio también recibe notificaciones en el número configurado aquí.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1 flex items-center gap-1.5">
                      <MessageCircle size={14} className="text-green-500" /> WhatsApp Clientes
                    </label>
                    <input
                      value={empresaConfig.whatsapp_clientes}
                      onChange={e => setEmpresaConfig(p => ({ ...p, whatsapp_clientes: e.target.value }))}
                      className="input-field w-full"
                      placeholder="51949324254"
                    />
                    <p className="text-xs text-primary-400 mt-1">Número que ven los clientes en la web (con código de país)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1 flex items-center gap-1.5">
                      <MessageCircle size={14} className="text-green-500" /> WhatsApp Negocio
                    </label>
                    <input
                      value={empresaConfig.whatsapp_negocio}
                      onChange={e => setEmpresaConfig(p => ({ ...p, whatsapp_negocio: e.target.value }))}
                      className="input-field w-full"
                      placeholder="51916165543"
                    />
                    <p className="text-xs text-primary-400 mt-1">Número que recibe notificaciones de pedidos nuevos</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1 flex items-center gap-1.5">
                      <MapPin size={14} className="text-accent-gold" /> Dirección para mostrar
                    </label>
                    <input
                      value={empresaConfig.direccion_display}
                      onChange={e => setEmpresaConfig(p => ({ ...p, direccion_display: e.target.value }))}
                      className="input-field w-full"
                      placeholder="Ate Vitarte, Lima"
                    />
                    <p className="text-xs text-primary-400 mt-1">Dirección corta que aparece en el footer del landing</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1 flex items-center gap-1.5">
                      <Clock size={14} className="text-accent-gold" /> Horario de atención
                    </label>
                    <input
                      value={empresaConfig.horario}
                      onChange={e => setEmpresaConfig(p => ({ ...p, horario: e.target.value }))}
                      className="input-field w-full"
                      placeholder="Lun–Sáb: 8:00 am – 6:00 pm"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-primary-200">
                  <button
                    onClick={handleSaveEmpresa}
                    disabled={empresaSaving}
                    className="btn-primary flex items-center gap-2 !px-6 !py-3 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {empresaSaving ? 'Guardando...' : 'Guardar Contacto & Web'}
                  </button>
                </div>
              </div>
            )}

            {/* Botón guardar SUNAT (solo para las otras tabs) */}
            {activeTab !== 'contacto' && (
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
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* SECCIÓN TARIFAS DE DELIVERY               */}
      {/* ═══════════════════════════════════════════ */}
      <div className="card mb-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-primary-800 text-lg">Tarifas de Delivery</h2>
              <p className="text-primary-500 text-sm">Zonas por distancia (km) desde Cajamarquilla — tarifa y tiempo estimado</p>
            </div>
          </div>
          <button
            onClick={() => { setAdding(true); setNewZona({ nombre: '', distancia_min: '', distancia_max: '', tarifa: '', tiempo_estimado: '1-2 días hábiles' }) }}
            className="btn-primary flex items-center gap-2 !px-4 !py-2 text-sm"
          >
            <Plus size={15} /> Agregar zona
          </button>
        </div>

        {zonasLoading ? (
          <div className="text-center py-8 text-primary-400">
            <RefreshCw size={20} className="mx-auto mb-2 animate-spin" />
            <p className="text-sm">Cargando zonas...</p>
          </div>
        ) : (
          <>
            {/* Tabla de zonas */}
            <div className="overflow-x-auto rounded-xl border border-primary-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-50 border-b border-primary-100">
                    <th className="text-left px-4 py-3 font-semibold text-primary-700 w-[22%]">Zona</th>
                    <th className="text-left px-4 py-3 font-semibold text-primary-700 w-[18%]">Distancia (km)</th>
                    <th className="text-left px-4 py-3 font-semibold text-primary-700 w-[13%]">Tarifa (S/)</th>
                    <th className="text-left px-4 py-3 font-semibold text-primary-700 w-[22%]">Tiempo estimado</th>
                    <th className="text-center px-4 py-3 font-semibold text-primary-700 w-[10%]">Activo</th>
                    <th className="text-right px-4 py-3 font-semibold text-primary-700 w-[15%]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {zonas.length === 0 && !adding && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-primary-400">
                        <MapPin size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No hay zonas configuradas</p>
                        <p className="text-xs mt-1">Agrega la primera zona con el botón de arriba</p>
                      </td>
                    </tr>
                  )}
                  {zonas.map(z => (
                    <tr key={z.id} className={`border-b border-primary-50 last:border-0 transition-colors ${editId === z.id ? 'bg-blue-50/40' : 'hover:bg-primary-50/40'}`}>
                      {editId === z.id ? (
                        /* ── Fila en modo edición ── */
                        <>
                          <td className="px-3 py-2">
                            <input
                              value={editData.nombre}
                              onChange={e => setEditData(d => ({ ...d, nombre: e.target.value }))}
                              className="input-field w-full !py-1.5 !text-sm"
                              placeholder="Ej: Zona 3 — Este Lima"
                              autoFocus
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number" min="0" step="0.5"
                                value={editData.distancia_min}
                                onChange={e => setEditData(d => ({ ...d, distancia_min: e.target.value }))}
                                className="input-field w-full !py-1.5 !text-sm"
                                placeholder="0"
                              />
                              <span className="text-primary-400 text-xs shrink-0">–</span>
                              <input
                                type="number" min="0" step="0.5"
                                value={editData.distancia_max}
                                onChange={e => setEditData(d => ({ ...d, distancia_max: e.target.value }))}
                                className="input-field w-full !py-1.5 !text-sm"
                                placeholder="∞"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="0" step="0.5"
                              value={editData.tarifa}
                              onChange={e => setEditData(d => ({ ...d, tarifa: e.target.value }))}
                              className="input-field w-full !py-1.5 !text-sm"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={editData.tiempo_estimado}
                              onChange={e => setEditData(d => ({ ...d, tiempo_estimado: e.target.value }))}
                              className="input-field w-full !py-1.5 !text-sm"
                              placeholder="Ej: 1-2 días hábiles"
                            />
                          </td>
                          <td className="px-3 py-2 text-center text-primary-400 text-xs italic">—</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => saveEdit(z.id)}
                                disabled={savingId === z.id}
                                className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 transition-colors"
                                title="Guardar"
                              >
                                {savingId === z.id ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                              </button>
                              <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-primary-100 text-primary-500 hover:bg-primary-200 transition-colors" title="Cancelar">
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        /* ── Fila en modo lectura ── */
                        <>
                          <td className="px-4 py-3 font-medium text-primary-800">{z.nombre}</td>
                          <td className="px-4 py-3 text-xs text-primary-600">
                            {z.distancia_min} – {z.distancia_max !== null ? `${z.distancia_max} km` : '∞'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-blue-700">S/ {z.tarifa.toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3 text-primary-600 text-xs">{z.tiempo_estimado}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => toggleActivo(z)} title={z.activo ? 'Desactivar' : 'Activar'}>
                              {z.activo
                                ? <ToggleRight size={22} className="text-green-500 hover:text-green-700 transition-colors" />
                                : <ToggleLeft size={22} className="text-primary-300 hover:text-primary-500 transition-colors" />
                              }
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => startEdit(z)} className="p-1.5 rounded-lg text-primary-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Editar">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => deleteZona(z.id)} className="p-1.5 rounded-lg text-primary-300 hover:bg-red-50 hover:text-red-500 transition-colors" title="Eliminar">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  {/* ── Fila de nueva zona ── */}
                  {adding && (
                    <tr className="bg-green-50/40 border-b border-green-100">
                      <td className="px-3 py-2">
                        <input
                          value={newZona.nombre}
                          onChange={e => setNewZona(n => ({ ...n, nombre: e.target.value }))}
                          className="input-field w-full !py-1.5 !text-sm"
                          placeholder="Ej: Zona 3 — Este Lima"
                          autoFocus
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" step="0.5"
                            value={newZona.distancia_min}
                            onChange={e => setNewZona(n => ({ ...n, distancia_min: e.target.value }))}
                            className="input-field w-full !py-1.5 !text-sm"
                            placeholder="0"
                          />
                          <span className="text-primary-400 text-xs shrink-0">–</span>
                          <input
                            type="number" min="0" step="0.5"
                            value={newZona.distancia_max}
                            onChange={e => setNewZona(n => ({ ...n, distancia_max: e.target.value }))}
                            className="input-field w-full !py-1.5 !text-sm"
                            placeholder="∞"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="0" step="0.5"
                          value={newZona.tarifa}
                          onChange={e => setNewZona(n => ({ ...n, tarifa: e.target.value }))}
                          className="input-field w-full !py-1.5 !text-sm"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={newZona.tiempo_estimado}
                          onChange={e => setNewZona(n => ({ ...n, tiempo_estimado: e.target.value }))}
                          className="input-field w-full !py-1.5 !text-sm"
                          placeholder="Ej: 1-2 días hábiles"
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-green-600 text-xs font-medium">Activo</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={handleAddZona}
                            disabled={addingSaving}
                            className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 transition-colors"
                            title="Guardar nueva zona"
                          >
                            {addingSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button onClick={() => setAdding(false)} className="p-1.5 rounded-lg bg-primary-100 text-primary-500 hover:bg-primary-200 transition-colors" title="Cancelar">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumen */}
            <div className="flex items-center gap-4 mt-3 text-xs text-primary-400">
              <span>{zonas.filter(z => z.activo).length} zonas activas</span>
              <span>·</span>
              <span>{zonas.filter(z => !z.activo).length} inactivas</span>
              {zonas.length > 0 && (
                <>
                  <span>·</span>
                  <span>Tarifas: S/ {Math.min(...zonas.map(z => z.tarifa)).toFixed(2)} – S/ {Math.max(...zonas.map(z => z.tarifa)).toFixed(2)}</span>
                  <span>·</span>
                  <span>Hasta {zonas.reduce((max, z) => z.distancia_max !== null && z.distancia_max > max ? z.distancia_max : max, 0)} km</span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* SECCIÓN ESTILO VISUAL DE LA WEB           */}
      {/* ═══════════════════════════════════════════ */}
      <div className="card mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-lg">
            🎨
          </div>
          <div>
            <h2 className="font-heading font-bold text-primary-800 text-lg">Estilo Visual de la Web</h2>
            <p className="text-primary-500 text-sm">Elige la paleta de colores de tu tienda — se aplica al instante para tus clientes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {([
            {
              id: 'terracota',
              nombre: 'Terracota',
              desc: 'Cálido y natural · Default',
              primario: '#C96B4E',
              secundario: '#C89F5C',
              fondo: '#FBF7F2',
              emoji: '🧡',
            },
            {
              id: 'esmeralda',
              nombre: 'Esmeralda',
              desc: 'Verde · Fresco y orgánico',
              primario: '#22875A',
              secundario: '#50B482',
              fondo: '#F0FAF4',
              emoji: '💚',
            },
            {
              id: 'oceano',
              nombre: 'Océano',
              desc: 'Azul · Confianza y limpieza',
              primario: '#1E64B4',
              secundario: '#48A8D2',
              fondo: '#F0F7FF',
              emoji: '💙',
            },
            {
              id: 'morado',
              nombre: 'Morado Maqui',
              desc: 'Morado · Elegante y premium',
              primario: '#6B21A8',
              secundario: '#9B59D0',
              fondo: '#F8F3FF',
              emoji: '💜',
            },
            {
              id: 'noche',
              nombre: 'Noche Peruana',
              desc: 'Azul acero · Sofisticado',
              primario: '#37899A',
              secundario: '#5AAFC8',
              fondo: '#EEF4FA',
              emoji: '🩵',
            },
          ] as const).map(tema => {
            const selected = temaActivo === tema.id
            return (
              <button
                key={tema.id}
                onClick={() => handleSaveTema(tema.id)}
                disabled={temaSaving}
                className={`relative p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-60 ${
                  selected
                    ? 'border-primary-500 shadow-md ring-2 ring-primary-200'
                    : 'border-primary-100 hover:border-primary-300 bg-white'
                }`}
                style={selected ? { backgroundColor: tema.fondo } : {}}
              >
                {selected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                    <Check size={11} className="text-white" />
                  </div>
                )}

                {/* Preview mini */}
                <div className="mb-3 rounded-xl overflow-hidden border border-primary-100 h-16" style={{ backgroundColor: tema.fondo }}>
                  <div className="h-5 w-full" style={{ backgroundColor: tema.primario, opacity: 0.9 }} />
                  <div className="px-2 pt-1.5 flex gap-1.5">
                    <div className="h-2 rounded-full flex-1" style={{ backgroundColor: tema.primario, opacity: 0.3 }} />
                    <div className="h-2 rounded-full w-6" style={{ backgroundColor: tema.secundario, opacity: 0.5 }} />
                  </div>
                  <div className="px-2 pt-1.5">
                    <div className="h-4 rounded-lg w-14 flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: tema.primario }}>
                      Comprar
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base">{tema.emoji}</span>
                  <span className="font-heading font-bold text-sm text-primary-800">{tema.nombre}</span>
                </div>
                <p className="text-[11px] text-primary-400 leading-tight">{tema.desc}</p>

                {/* Swatches */}
                <div className="flex gap-1 mt-2">
                  <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: tema.primario }} />
                  <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: tema.secundario }} />
                  <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: tema.fondo }} />
                </div>
              </button>
            )
          })}
        </div>

        <p className="text-xs text-primary-400 mt-4 flex items-center gap-1.5">
          <span>💡</span>
          El tema se aplica a la tienda web pública. El panel CRM mantiene siempre su diseño propio.
        </p>
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
