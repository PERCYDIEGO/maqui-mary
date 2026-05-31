'use client'

import { useState, useEffect, useMemo } from 'react'
import { Play, Pause, Lock, Unlock, Trash2, Volume2, Save, RotateCcw, Settings, Search, Music, Undo2, Headphones, Sparkles, Eye, EyeOff, RefreshCw, Shield, FileText, Upload, AlertCircle, CheckCircle, CreditCard, Building2, Hash, MessageCircle, MapPin, Clock, Truck, Plus, Pencil, X, Check, ToggleLeft, ToggleRight, ChevronDown, FolderOpen, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { audio, TRACK_PRESETS, TRACK_GROUPS } from '@/lib/audio'
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

type TrackMeta = { locked: boolean }
type CustomGroup = { key: string; label: string; emoji: string; ids: string[] }
type Config = {
  default_tracks: Partial<Record<SceneKey, string>>
  track_volume: number
  track_meta: Record<string, TrackMeta>
  hidden_tracks: string[]
  custom_groups: CustomGroup[]
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
  custom_groups: [],
}

export default function MusicPlayerPage() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editor, setEditor] = useState(false)
  const [search, setSearch] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [firstTime, setFirstTime] = useState(true)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [newGroupForm, setNewGroupForm] = useState({ open: false, label: '', emoji: '📁' })
  const [editGroupKey, setEditGroupKey] = useState<string | null>(null)
  const [editGroupData, setEditGroupData] = useState({ label: '', emoji: '' })
  const [moveMenu, setMoveMenu] = useState<string | null>(null)

  // ─── SUNAT Config State ───
  const [sunatConfig, setSunatConfig] = useState<any>(null)
  const [sunatLoading, setSunatLoading] = useState(true)
  const [sunatSaving, setSunatSaving] = useState(false)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<'emisor' | 'apisunat' | 'contacto'>('emisor')

  // ─── Empresa / Contacto State ───
  const [empresaConfig, setEmpresaConfig] = useState({
    whatsapp_clientes:    '',
    whatsapp_negocio:     '',
    direccion_display:    '',
    horario:              '',
    clientes_satisfechos: '12800',
    fecha_constitucion:   '',
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

    fetch('/api/auth/me').then(r => r.json()).then(({ profile }) => {
      if (profile?.role === 'admin' || profile?.role === 'editor') setEditor(true)
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
          whatsapp_clientes:    data.whatsapp_clientes    || '',
          whatsapp_negocio:     data.whatsapp_negocio     || '',
          direccion_display:    data.direccion_display     || '',
          horario:              data.horario               || '',
          clientes_satisfechos: String(data.clientes_satisfechos || '12800'),
          fecha_constitucion:   data.fecha_constitucion    || '',
        })
      }
    }).catch(() => {})
  }, [])

  // Cargar configuración SUNAT
  useEffect(() => {
    async function loadSunatConfig() {
      try {
        const { data, error } = await supabase.from('sunat_config').select('*').eq('id', 1).single()
        // PGRST116 = no rows → config vacía, no es un error fatal
        if (error && error.code !== 'PGRST116') throw error
        setSunatConfig(data || { id: 1 })
      } catch (e: any) {
        setSunatConfig({ id: 1 })
        // Silenciar errores de RLS (infinite recursion) — se resuelve con migración SQL
        const isRlsError = e.message?.includes('infinite recursion') || e.message?.includes('policy')
        if (!isRlsError) toast.error('No se pudo cargar config SUNAT: ' + e.message)
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
        id: 1,  // siempre forzar id=1 para upsert correcto
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
      if (search && !id.toLowerCase().includes(search.toLowerCase()) &&
          !TRACK_PRESETS[id].label.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [config.hidden_tracks, search])

  // Auto-expandir grupos que tengan coincidencias al buscar
  useEffect(() => {
    if (!search.trim()) return
    const newOpen: Record<string, boolean> = {}
    TRACK_GROUPS.forEach(group => {
      const hasMatch = group.ids.some(id => {
        if (config.hidden_tracks.includes(id)) return false
        const term = search.toLowerCase()
        return id.toLowerCase().includes(term) || TRACK_PRESETS[id]?.label.toLowerCase().includes(term)
      })
      if (hasMatch) newOpen[group.key] = true
    })
    setOpenGroups(newOpen)
  }, [search, config.hidden_tracks])

  const tracksInCustomGroups = useMemo(() => {
    const s = new Set<string>()
    ;(config.custom_groups || []).forEach(g => g.ids.forEach(id => s.add(id)))
    return s
  }, [config.custom_groups])

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
    // Aplica al instante en DOM + localStorage para evitar flash al navegar
    try { localStorage.setItem('maqui-tema', tema) } catch {}
    if (tema && tema !== 'terracota') {
      document.documentElement.setAttribute('data-theme', tema)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
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

  function createCustomGroup() {
    if (!newGroupForm.label.trim()) return
    const key = `custom-${Date.now()}`
    setConfig(c => ({
      ...c,
      custom_groups: [...(c.custom_groups || []), { key, label: newGroupForm.label.trim(), emoji: newGroupForm.emoji || '📁', ids: [] }],
    }))
    setNewGroupForm({ open: false, label: '', emoji: '📁' })
    setOpenGroups(p => ({ ...p, [key]: true }))
  }

  function deleteCustomGroup(key: string) {
    setConfig(c => ({ ...c, custom_groups: (c.custom_groups || []).filter(g => g.key !== key) }))
  }

  function saveEditGroup() {
    if (!editGroupKey || !editGroupData.label.trim()) return
    setConfig(c => ({
      ...c,
      custom_groups: (c.custom_groups || []).map(g =>
        g.key === editGroupKey ? { ...g, label: editGroupData.label.trim(), emoji: editGroupData.emoji } : g
      ),
    }))
    setEditGroupKey(null)
  }

  function moveTrackToCustomGroup(trackId: string, targetKey: string | null) {
    setConfig(c => ({
      ...c,
      custom_groups: (c.custom_groups || []).map(g => {
        if (g.key === targetKey) return { ...g, ids: g.ids.includes(trackId) ? g.ids : [...g.ids, trackId] }
        return { ...g, ids: g.ids.filter(id => id !== trackId) }
      }),
    }))
    setMoveMenu(null)
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
                { key: 'apisunat', label: '⚡ APISUNAT.pe', icon: Zap },
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
                    placeholder="PRO. QUINTA AVENIDA MZA. J LOTE. 17-B ASC. GANADEROS PORCINOS SARACO"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Urbanización</label>
                  <input
                    value={sunatConfig?.urbanizacion || ''}
                    onChange={e => updateSunatField('urbanizacion', e.target.value)}
                    className="input-field w-full"
                    placeholder="GANADEROS PORCINOS SARACO"
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
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Serie Guía de Remisión</label>
                  <input
                    value={sunatConfig?.series_guia || ''}
                    onChange={e => updateSunatField('series_guia', e.target.value)}
                    className="input-field w-full"
                    placeholder="T001"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Siguiente N° Guía</label>
                  <input
                    type="number"
                    value={sunatConfig?.next_number_guia || 1}
                    onChange={e => updateSunatField('next_number_guia', parseInt(e.target.value) || 1)}
                    className="input-field w-full"
                    min={1}
                  />
                </div>
              </div>
            )}

            {/* Tab: APISUNAT.pe */}
            {activeTab === 'apisunat' && (
              <div className="space-y-5">
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-start gap-3">
                    <Zap size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-indigo-800">Emisión vía APISUNAT.pe</p>
                      <p className="text-xs text-indigo-600 mt-1">
                        API REST simple, sin XML ni SOAP. Plan Free: 20 comprobantes gratis.
                        Plan 01: S/8 x 100 comprobantes. Solo necesitas tu token de API.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-primary-700 mb-1">Token de API *</label>
                    <input
                      type="password"
                      value={sunatConfig?.apisunat_token || ''}
                      onChange={e => updateSunatField('apisunat_token', e.target.value)}
                      className="input-field w-full"
                      placeholder="Tu token de APISUNAT.pe"
                    />
                    <p className="text-xs text-primary-400 mt-1">Lo obtienes en app.apisunat.pe → Organizaciones</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Ambiente</label>
                    <select
                      value={sunatConfig?.apisunat_environment || 'sandbox'}
                      onChange={e => updateSunatField('apisunat_environment', e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="sandbox">Sandbox (pruebas)</option>
                      <option value="produccion">Producción (real)</option>
                    </select>
                  </div>
                </div>

                {sunatConfig?.apisunat_token && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50">
                    <CheckCircle size={18} className="text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-indigo-700">Token APISUNAT.pe configurado ✅</p>
                      <p className="text-xs text-indigo-500">Ambiente: {sunatConfig?.apisunat_environment === 'produccion' ? 'Producción' : 'Sandbox'}</p>
                    </div>
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
                      placeholder="51916165543"
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
                      placeholder="Lurigancho, Lima"
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
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1 flex items-center gap-1.5">
                      <span className="text-base">👥</span> Clientes satisfechos (landing)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={empresaConfig.clientes_satisfechos}
                      onChange={e => setEmpresaConfig(p => ({ ...p, clientes_satisfechos: e.target.value }))}
                      className="input-field w-full"
                      placeholder="12800"
                    />
                    <p className="text-xs text-primary-400 mt-1">Se muestra en la sección de estadísticas del landing (contador animado)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1 flex items-center gap-1.5">
                      <span className="text-base">🏭</span> Fecha de constitución
                    </label>
                    <input
                      type="date"
                      value={empresaConfig.fecha_constitucion}
                      onChange={e => setEmpresaConfig(p => ({ ...p, fecha_constitucion: e.target.value }))}
                      className="input-field w-full"
                    />
                    <p className="text-xs text-primary-400 mt-1">El landing calculará automáticamente los años de experiencia (ej: 2021-03-15 → "4 años fabricando calidad")</p>
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
          {/* Header con buscador */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-3 flex-1">
              <h2 className="font-heading font-bold text-primary-800 text-lg">🎶 Playlist</h2>
              <span className="text-xs text-primary-400 bg-primary-100 px-2 py-0.5 rounded-full">
                {visibleTracks.length} de {Object.keys(TRACK_PRESETS).length - hiddenCount} tracks
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNewGroupForm(f => ({ ...f, open: !f.open, label: '', emoji: '📁' }))}
                className="btn-outline text-xs !px-3 !py-1.5 flex items-center gap-1.5"
                title="Crear grupo personalizado"
              >
                <Plus size={13} /> Nuevo grupo
              </button>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar canción..."
                  className="input-field !pl-8 !py-1.5 !text-sm w-full sm:w-48"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-300 hover:text-primary-600">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form nuevo grupo */}
          {newGroupForm.open && (
            <div className="flex items-center gap-2 mb-3 px-4 py-3 bg-blue-50/60 border border-blue-200 rounded-xl">
              <input
                value={newGroupForm.emoji}
                onChange={e => setNewGroupForm(f => ({ ...f, emoji: e.target.value }))}
                className="w-10 text-center text-xl border border-primary-200 rounded-lg p-1 bg-white"
                maxLength={2}
                title="Emoji del grupo"
              />
              <input
                value={newGroupForm.label}
                onChange={e => setNewGroupForm(f => ({ ...f, label: e.target.value }))}
                className="flex-1 input-field !py-1.5 !text-sm"
                placeholder="Nombre del grupo..."
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') createCustomGroup(); if (e.key === 'Escape') setNewGroupForm({ open: false, label: '', emoji: '📁' }) }}
              />
              <button onClick={createCustomGroup} className="p-2 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 transition-colors" title="Crear">
                <Check size={16} />
              </button>
              <button onClick={() => setNewGroupForm({ open: false, label: '', emoji: '📁' })} className="p-2 rounded-xl bg-primary-100 text-primary-500 hover:bg-primary-200 transition-colors" title="Cancelar">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Empty state */}
          {visibleTracks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-30">🎵</div>
              <p className="text-primary-500 font-medium">No hay tracks visibles</p>
              <p className="text-sm text-primary-400 mt-1">
                {search ? 'Prueba con otro término de búsqueda' : 'Todos los tracks están ocultos'}
              </p>
              {search && (
                <button onClick={() => setSearch('')} className="btn-outline text-xs mt-3 !px-3 !py-1.5">
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}

          {/* Backdrop para cerrar move menu */}
          {moveMenu && <div className="fixed inset-0 z-[15]" onClick={() => setMoveMenu(null)} />}

          {/* Grupos colapsables */}
          <div className="space-y-2">
            {TRACK_GROUPS.map(group => {
              const groupTracks = group.ids.filter(id => {
                if (config.hidden_tracks.includes(id)) return false
                if (tracksInCustomGroups.has(id)) return false
                if (search) {
                  const term = search.toLowerCase()
                  return id.toLowerCase().includes(term) || TRACK_PRESETS[id]?.label.toLowerCase().includes(term)
                }
                return true
              })
              if (groupTracks.length === 0) return null

              const isOpen = openGroups[group.key] ?? false
              const playingInGroup = groupTracks.some(id => audio.trackPlaying && audio.currentTrackId === id)
              const defaultsInGroup = groupTracks.filter(id => Object.values(activeDefault).includes(id)).length
              const groupColors: Record<string, { header: string; badge: string; border: string }> = {
                'top-gear': { header: 'hover:bg-orange-50/60', badge: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
                'gunbound': { header: 'hover:bg-purple-50/60', badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
              }
              const gc = groupColors[group.key] || { header: 'hover:bg-primary-50', badge: 'bg-primary-100 text-primary-600', border: 'border-primary-200' }
              const hasCustomGroups = (config.custom_groups || []).length > 0

              return (
                <div key={group.key} className={`border ${isOpen ? gc.border : 'border-primary-200'} rounded-2xl overflow-hidden transition-all`}>
                  {/* Cabecera del grupo */}
                  <button
                    onClick={() => setOpenGroups(p => ({ ...p, [group.key]: !p[group.key] }))}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all ${isOpen ? 'bg-primary-50/80' : `bg-white ${gc.header}`}`}
                  >
                    <span className="text-xl shrink-0">{group.emoji}</span>
                    <div className="flex-1 text-left">
                      <span className="font-heading font-semibold text-primary-800">{group.label}</span>
                      <span className="ml-2 text-xs text-primary-400">{groupTracks.length} canciones</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {playingInGroup && (
                        <span className="text-xs font-medium text-accent-gold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-accent-gold rounded-full animate-pulse" />
                          Sonando
                        </span>
                      )}
                      {defaultsInGroup > 0 && !playingInGroup && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gc.badge}`}>
                          ★ {defaultsInGroup} activa{defaultsInGroup > 1 ? 's' : ''}
                        </span>
                      )}
                      <ChevronDown
                        size={17}
                        className={`text-primary-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Lista de tracks del grupo */}
                  {isOpen && (
                    <div className="border-t border-primary-100 divide-y divide-primary-50/80 bg-white">
                      {groupTracks.map(id => {
                        const preset = TRACK_PRESETS[id]
                        if (!preset) return null
                        const meta = config.track_meta[id] || { locked: true }
                        const isPlaying = audio.trackPlaying && audio.currentTrackId === id
                        const isLocked = meta.locked
                        const assignedScenes = Object.entries(activeDefault)
                          .filter(([_, v]) => v === id)
                          .map(([k]) => k as SceneKey)
                        const isDefault = assignedScenes.length > 0

                        return (
                          <div
                            key={id}
                            className={`group relative flex items-center gap-3 px-4 py-2.5 transition-all ${
                              isPlaying ? 'bg-accent-gold/8' : 'hover:bg-primary-50/60'
                            }`}
                          >
                            {/* Play/Pause */}
                            <button
                              onClick={() => playPreview(id)}
                              className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                                isPlaying
                                  ? 'bg-accent-gold text-white shadow-sm scale-105'
                                  : 'bg-primary-100 text-primary-600 hover:bg-primary-200 hover:scale-105 active:scale-95'
                              }`}
                              title={isPlaying ? 'Detener' : 'Previsualizar'}
                            >
                              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                            </button>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-medium text-sm truncate ${isPlaying ? 'text-accent-gold' : 'text-primary-800'}`}>
                                  {preset.label}
                                </p>
                                {isDefault && (
                                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
                                    ★ Default
                                  </span>
                                )}
                                {assignedScenes.map(sk => {
                                  const sc = SCENES.find(s => s.key === sk)
                                  return sc ? (
                                    <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-sky-100 text-sky-700">
                                      {sc.icon} {sc.label}
                                    </span>
                                  ) : null
                                })}
                                {!isDefault && preset.scene && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-primary-100 text-primary-400">
                                    {SCENES.find(s => s.key === preset.scene)?.icon} sugerido
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Mover a grupo personalizado */}
                            {hasCustomGroups && (
                              <div className="relative z-[20]">
                                <button
                                  onClick={e => { e.stopPropagation(); setMoveMenu(moveMenu === id ? null : id) }}
                                  className="shrink-0 p-1.5 rounded-xl transition-all text-primary-300 hover:bg-blue-50 hover:text-blue-500 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                  title="Mover a grupo"
                                >
                                  <FolderOpen size={13} />
                                </button>
                                {moveMenu === id && (
                                  <div className="absolute right-0 top-8 z-[30] bg-white border border-primary-200 rounded-xl shadow-lg py-1.5 min-w-[170px]">
                                    <p className="text-[10px] text-primary-400 px-3 py-1 font-medium uppercase tracking-wide">Mover a...</p>
                                    {(config.custom_groups || []).map(cg => (
                                      <button
                                        key={cg.key}
                                        onClick={e => { e.stopPropagation(); moveTrackToCustomGroup(id, cg.key) }}
                                        className="w-full text-left text-xs px-3 py-1.5 hover:bg-primary-50 flex items-center gap-2"
                                      >
                                        <span>{cg.emoji}</span>
                                        <span>{cg.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Candado */}
                            <button
                              onClick={() => updateMeta(id, { locked: !isLocked })}
                              className={`shrink-0 p-1.5 rounded-xl transition-all ${
                                isLocked
                                  ? 'text-accent-gold hover:bg-accent-gold/10'
                                  : 'text-primary-300 hover:bg-red-50 hover:text-red-400'
                              }`}
                              title={isLocked ? 'Bloqueada' : 'Desbloqueada'}
                            >
                              {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                            </button>

                            {/* Ocultar */}
                            {!isLocked && (
                              <button
                                onClick={() => hideTrack(id)}
                                className="shrink-0 p-1.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Ocultar"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Grupos personalizados */}
            {(config.custom_groups || []).map(cg => {
              const cgTracks = cg.ids.filter(id => {
                if (config.hidden_tracks.includes(id)) return false
                if (!TRACK_PRESETS[id]) return false
                if (search) {
                  const term = search.toLowerCase()
                  return id.toLowerCase().includes(term) || TRACK_PRESETS[id]?.label.toLowerCase().includes(term)
                }
                return true
              })

              const isOpen = openGroups[cg.key] ?? true
              const playingInGroup = cgTracks.some(id => audio.trackPlaying && audio.currentTrackId === id)
              const isEditing = editGroupKey === cg.key

              return (
                <div key={cg.key} className={`border ${isOpen ? 'border-blue-200' : 'border-primary-200'} rounded-2xl overflow-hidden transition-all`}>
                  {/* Cabecera */}
                  <div className={`flex items-center gap-2 px-4 py-3.5 transition-all ${isOpen ? 'bg-blue-50/40' : 'bg-white hover:bg-blue-50/20'}`}>
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          value={editGroupData.emoji}
                          onChange={e => setEditGroupData(d => ({ ...d, emoji: e.target.value }))}
                          className="w-10 text-center text-xl border border-primary-200 rounded-lg p-1 bg-white"
                          maxLength={2}
                        />
                        <input
                          value={editGroupData.label}
                          onChange={e => setEditGroupData(d => ({ ...d, label: e.target.value }))}
                          className="flex-1 input-field !py-1.5 !text-sm"
                          placeholder="Nombre del grupo"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveEditGroup(); if (e.key === 'Escape') setEditGroupKey(null) }}
                        />
                        <button onClick={saveEditGroup} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                          <Check size={15} />
                        </button>
                        <button onClick={() => setEditGroupKey(null)} className="p-1.5 rounded-lg bg-primary-100 text-primary-500 hover:bg-primary-200 transition-colors">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setOpenGroups(p => ({ ...p, [cg.key]: !p[cg.key] }))}
                          className="flex-1 flex items-center gap-3 text-left"
                        >
                          <span className="text-xl shrink-0">{cg.emoji}</span>
                          <div className="flex-1">
                            <span className="font-heading font-semibold text-primary-800">{cg.label}</span>
                            <span className="ml-2 text-xs text-primary-400">{cgTracks.length} canciones</span>
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">personalizado</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {playingInGroup && (
                              <span className="text-xs font-medium text-accent-gold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-accent-gold rounded-full animate-pulse" />
                                Sonando
                              </span>
                            )}
                            <ChevronDown size={17} className={`text-primary-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        <div className="flex items-center gap-1 ml-1 shrink-0">
                          <button
                            onClick={() => { setEditGroupKey(cg.key); setEditGroupData({ label: cg.label, emoji: cg.emoji }) }}
                            className="p-1.5 rounded-xl text-primary-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                            title="Editar nombre"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`¿Eliminar el grupo "${cg.label}"? Las canciones vuelven a su grupo original.`)) deleteCustomGroup(cg.key) }}
                            className="p-1.5 rounded-xl text-primary-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                            title="Eliminar grupo"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tracks del grupo */}
                  {isOpen && (
                    <div className="border-t border-blue-100 divide-y divide-primary-50/80 bg-white">
                      {cgTracks.length === 0 ? (
                        <div className="text-center py-6 text-primary-400">
                          <FolderOpen size={28} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-medium">Grupo vacío</p>
                          <p className="text-xs mt-1">Usa el ícono 📁 en cualquier track para moverlo aquí</p>
                        </div>
                      ) : (
                        cgTracks.map(id => {
                          const preset = TRACK_PRESETS[id]
                          if (!preset) return null
                          const meta = config.track_meta[id] || { locked: true }
                          const isPlaying = audio.trackPlaying && audio.currentTrackId === id
                          const isLocked = meta.locked

                          return (
                            <div
                              key={id}
                              className={`group relative flex items-center gap-3 px-4 py-2.5 transition-all ${
                                isPlaying ? 'bg-accent-gold/8' : 'hover:bg-primary-50/60'
                              }`}
                            >
                              <button
                                onClick={() => playPreview(id)}
                                className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                                  isPlaying ? 'bg-accent-gold text-white shadow-sm scale-105' : 'bg-primary-100 text-primary-600 hover:bg-primary-200 hover:scale-105 active:scale-95'
                                }`}
                                title={isPlaying ? 'Detener' : 'Previsualizar'}
                              >
                                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm truncate ${isPlaying ? 'text-accent-gold' : 'text-primary-800'}`}>
                                  {preset.label}
                                </p>
                              </div>
                              {/* Quitar del grupo */}
                              <button
                                onClick={() => moveTrackToCustomGroup(id, null)}
                                className="shrink-0 p-1.5 rounded-xl text-primary-300 hover:bg-orange-50 hover:text-orange-500 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Quitar del grupo (vuelve al original)"
                              >
                                <X size={13} />
                              </button>
                              {/* Candado */}
                              <button
                                onClick={() => updateMeta(id, { locked: !isLocked })}
                                className={`shrink-0 p-1.5 rounded-xl transition-all ${isLocked ? 'text-accent-gold hover:bg-accent-gold/10' : 'text-primary-300 hover:bg-red-50 hover:text-red-400'}`}
                                title={isLocked ? 'Bloqueada' : 'Desbloqueada'}
                              >
                                {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                              </button>
                              {/* Ocultar */}
                              {!isLocked && (
                                <button
                                  onClick={() => hideTrack(id)}
                                  className="shrink-0 p-1.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                  title="Ocultar"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
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
