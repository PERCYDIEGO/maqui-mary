'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Search, MapPin, Package, Loader2, Navigation, Ruler } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Fix Leaflet default icon en webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
  popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41],
})

// ── Origen: Cajamarquilla/Saracoto, Lurigancho (RUC Maqui Mary) ─────────────
const ORIGIN_LAT = -11.9820
const ORIGIN_LNG = -76.9520
const LIMA_CENTER: [number, number] = [-12.0464, -77.0428]

type ZonaDelivery = {
  id: number
  nombre: string
  distancia_min: number
  distancia_max: number | null
  tarifa: number
  tiempo_estimado: string
}

type Props = {
  onConfirm: (address: string, distrito: string, tarifa: number, distanciaKm: number) => void
  onCancel: () => void
}

// Distancia en línea recta usando Haversine (km)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function DraggableMarker({ position, onMove }: { position: [number, number]; onMove: (lat: number, lng: number) => void }) {
  const markerRef = useRef<L.Marker>(null)
  return (
    <Marker draggable position={position} ref={markerRef}
      eventHandlers={{ dragend() { const m = markerRef.current; if (m) { const { lat, lng } = m.getLatLng(); onMove(lat, lng) } } }}
    />
  )
}

function MapClicker({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

function MapFlyController({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 1 })
  }, [target])
  return null
}

export default function DeliveryMapSelector({ onConfirm, onCancel }: Props) {
  const [position, setPosition] = useState<[number, number]>(LIMA_CENTER)
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [address, setAddress] = useState('')
  const [distrito, setDistrito] = useState('')
  const [tarifa, setTarifa] = useState<number | null>(null)
  const [tiempoEstimado, setTiempoEstimado] = useState('')
  const [zonaNombre, setZonaNombre] = useState('')
  const [distanciaKm, setDistanciaKm] = useState<number | null>(null)
  const [zonas, setZonas] = useState<ZonaDelivery[]>([])
  const [gettingLocation, setGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()
  const zonasRef = useRef<ZonaDelivery[]>([])
  useEffect(() => { zonasRef.current = zonas }, [zonas])

  useEffect(() => {
    supabase.from('zonas_delivery')
      .select('id, nombre, distancia_min, distancia_max, tarifa, tiempo_estimado')
      .eq('activo', true)
      .order('distancia_min')
      .then(({ data }) => { if (data) setZonas(data) })
  }, [])

  const lookupByDistance = useCallback((km: number) => {
    const zona = zonasRef.current.find(z =>
      km >= z.distancia_min && (z.distancia_max === null || km < z.distancia_max)
    )
    if (zona) {
      setTarifa(zona.tarifa)
      setTiempoEstimado(zona.tiempo_estimado)
      setZonaNombre(zona.nombre)
    } else {
      setTarifa(null)
      setTiempoEstimado('')
      setZonaNombre('')
    }
  }, [])

  function calcAndLookup(lat: number, lng: number) {
    const km = haversineKm(ORIGIN_LAT, ORIGIN_LNG, lat, lng)
    setDistanciaKm(km)
    lookupByDistance(km)
  }

  async function reverseGeocode(lat: number, lng: number) {
    setGeocoding(true)
    setDistrito('')
    setAddress('')
    setTarifa(null)
    setDistanciaKm(null)
    calcAndLookup(lat, lng)
    try {
      const res = await fetch(`/api/geocode?type=reverse&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      const a = data.address || {}
      const d = a.suburb || a.town || a.city_district || a.county || ''
      setAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      setDistrito(d)
    } catch (e) {
      console.error('reverseGeocode error:', e)
    }
    setGeocoding(false)
  }

  function moveMarker(lat: number, lng: number) {
    setPosition([lat, lng])
    setFlyTo([lat, lng])
    reverseGeocode(lat, lng)
  }

  // Búsqueda con debounce
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 3) { setSearchResults([]); return }
    clearTimeout(searchTimer.current)
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q + ', Lima, Peru')}`)
        const data = await res.json()
        setSearchResults(Array.isArray(data) ? data : [])
      } catch { setSearchResults([]) }
      setSearching(false)
    }, 500)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  function selectResult(r: any) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    const a = r.address || {}
    const d = a.suburb || a.town || a.city_district || a.county || ''
    setPosition([lat, lng])
    setFlyTo([lat, lng])
    setSearchQuery('')
    setSearchResults([])
    setAddress(r.display_name)
    setDistrito(d)
    calcAndLookup(lat, lng)
  }

  async function handleMyLocation() {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta GPS. Busca tu dirección en el buscador.')
      return
    }

    // Verificar estado del permiso antes de intentar
    if (navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        if (perm.state === 'denied') {
          setLocationError('BLOQUEADO_CHROME')
          return
        }
      } catch {}
    }

    setGettingLocation(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos: [number, number] = [coords.latitude, coords.longitude]
        setPosition(pos)
        setFlyTo(pos)
        reverseGeocode(coords.latitude, coords.longitude)
        setGettingLocation(false)
      },
      (err) => {
        setGettingLocation(false)
        if (err.code === 1) {
          setLocationError('BLOQUEADO_CHROME')
        } else if (err.code === 2) {
          setLocationError('GPS no disponible en este momento. Activa el GPS en Ajustes del celular y vuelve a intentar, o busca tu dirección arriba.')
        } else {
          setLocationError('Tardó demasiado. Busca tu dirección en el campo de búsqueda de arriba o toca el mapa directamente.')
        }
      },
      { timeout: 15000, maximumAge: 0, enableHighAccuracy: true }
    )
  }

  const canConfirm = !geocoding && address.length > 0 && distanciaKm !== null
  const tarifaFinal = tarifa ?? 0

  return (
    <div className="flex flex-col">
      {/* Búsqueda */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Busca tu dirección o referencia..."
            className="w-full pl-9 pr-9 py-2.5 border border-ink-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent-terracotta bg-white"
          />
          {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-terracotta animate-spin" />}
        </div>

        {searchResults.length > 0 && (
          <div className="border border-ink-200 rounded-xl bg-white shadow-lg max-h-40 overflow-y-auto z-[9999] relative">
            {searchResults.map((r, i) => (
              <button key={i} onClick={() => selectResult(r)}
                className="w-full text-left px-3 py-2.5 hover:bg-ink-50 text-xs border-b border-ink-100 last:border-0 flex items-start gap-2">
                <MapPin size={12} className="text-accent-terracotta shrink-0 mt-0.5" />
                <span className="text-ink-700 line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}

        <button onClick={handleMyLocation} disabled={gettingLocation}
          className="flex items-center gap-1.5 text-xs text-accent-terracotta font-medium hover:underline disabled:opacity-50">
          <Navigation size={12} />
          {gettingLocation ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual (GPS)'}
        </button>
        {locationError && (
          locationError === 'BLOQUEADO_CHROME' ? (
            <div className="text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 leading-snug space-y-2">
              <p className="font-semibold text-red-700">🔒 Ubicación bloqueada en Chrome</p>
              <p className="text-red-600">Para activarla, elige una opción:</p>
              <div className="space-y-1 text-red-700">
                <p><span className="font-medium">Opción 1 —</span> Escribe esto en la barra de Chrome:</p>
                <code className="block bg-white border border-red-200 rounded px-2 py-1 font-mono text-[10px] text-red-800 select-all">
                  chrome://settings/content/location
                </code>
                <p className="text-[10px] text-red-600">Busca esta página en la lista "Bloqueado" y toca el ícono 🗑️.</p>
              </div>
              <div className="space-y-0.5 text-red-700">
                <p><span className="font-medium">Opción 2 —</span> Desde Ajustes del celular:</p>
                <p className="text-[10px] text-red-600">Ajustes → Aplicaciones → Chrome → Permisos → Ubicación → Permitir</p>
              </div>
              <div className="flex gap-2 pt-0.5">
                <button
                  onClick={() => { setLocationError(''); handleMyLocation() }}
                  className="text-xs font-semibold text-white bg-red-600 rounded-lg px-3 py-1.5 hover:bg-red-700"
                >
                  ↺ Reintentar GPS
                </button>
                <button
                  onClick={() => setLocationError('')}
                  className="text-xs font-medium text-red-600 underline py-1.5"
                >
                  Buscar dirección manualmente
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 leading-snug space-y-1.5">
              <p>⚠️ {locationError}</p>
              <button
                onClick={() => { setLocationError(''); handleMyLocation() }}
                className="text-xs font-medium text-red-700 underline"
              >
                Reintentar GPS
              </button>
            </div>
          )
        )}
      </div>

      {/* Mapa */}
      <div className="mx-4 rounded-2xl overflow-hidden border border-ink-200 shadow-sm" style={{ height: 220 }}>
        <MapContainer center={LIMA_CENTER} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          {/* Marker de origen (almacén) */}
          <Marker position={[ORIGIN_LAT, ORIGIN_LNG]} />
          {/* Marker del cliente */}
          <DraggableMarker position={position} onMove={moveMarker} />
          <MapClicker onClick={moveMarker} />
          <MapFlyController target={flyTo} />
        </MapContainer>
      </div>
      <p className="text-[10px] text-ink-400 text-center mt-1.5 px-4">
        Pin azul = almacén Maqui Mary · Pin rojo = tu dirección — toca el mapa o arrástralo
      </p>

      {/* Geocoding loader */}
      {geocoding && (
        <div className="mx-4 mt-2 p-3 rounded-xl bg-ink-50 border border-ink-200 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-ink-400" />
          <span className="text-xs text-ink-500">Calculando distancia y tarifa...</span>
        </div>
      )}

      {/* Resultado */}
      {!geocoding && distanciaKm !== null && (
        <div className={`mx-4 mt-2 p-3 rounded-xl border ${tarifa !== null ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Ruler size={14} className={tarifa !== null ? 'text-green-600' : 'text-blue-500'} />
              <span className="text-sm font-semibold text-ink-800">
                {distanciaKm.toFixed(1)} km del almacén
              </span>
              {zonaNombre && (
                <span className="text-[10px] bg-white border border-ink-200 px-1.5 py-0.5 rounded-full text-ink-500">
                  {zonaNombre}
                </span>
              )}
            </div>
            {tarifa !== null ? (
              <span className="font-bold text-green-700 text-sm">+S/ {tarifa.toFixed(2)}</span>
            ) : (
              <span className="text-xs text-blue-600 font-medium">Delivery a coordinar</span>
            )}
          </div>
          {distrito && (
            <p className="text-[11px] text-ink-500 ml-6">📍 {distrito}</p>
          )}
          {tiempoEstimado && (
            <p className="text-[11px] text-ink-500 mt-0.5 ml-6">🕒 {tiempoEstimado}</p>
          )}
          {address && (
            <p className="text-[10px] text-ink-400 mt-1.5 line-clamp-2">{address}</p>
          )}
        </div>
      )}

      {!geocoding && distanciaKm === null && (
        <div className="mx-4 mt-2 p-3 rounded-xl bg-ink-50 border border-ink-100 text-center">
          <p className="text-xs text-ink-400">Toca el mapa para calcular el costo de delivery</p>
        </div>
      )}

      {/* Botones */}
      <div className="px-4 pt-3 pb-4 space-y-2">
        <button
          onClick={() => canConfirm && onConfirm(address, distrito, tarifaFinal, distanciaKm!)}
          disabled={!canConfirm}
          className="w-full py-3 bg-accent-terracotta text-white rounded-2xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-terracotta/90"
        >
          {geocoding ? 'Calculando...'
            : distanciaKm === null ? 'Selecciona tu dirección en el mapa'
            : tarifa !== null ? `Confirmar · +S/ ${tarifa.toFixed(2)} delivery (${distanciaKm.toFixed(1)} km)`
            : 'Confirmar · Delivery a coordinar'}
        </button>
        <button onClick={onCancel} className="w-full text-xs text-ink-500 hover:text-ink-700 py-1">
          ← Volver al carrito
        </button>
      </div>
    </div>
  )
}
