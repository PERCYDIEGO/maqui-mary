import { NextRequest, NextResponse } from 'next/server'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const HEADERS = {
  'User-Agent': 'MaquiMary-Delivery/1.0 (contact@maquimary.pe)',
  'Accept-Language': 'es-PE,es;q=0.9',
  'Referer': 'https://maquimary.com.pe',
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') // 'search' | 'reverse'

  let url: string

  if (type === 'reverse') {
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    if (!lat || !lon) return NextResponse.json({ error: 'lat y lon requeridos' }, { status: 400 })
    url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`
  } else {
    const q = searchParams.get('q')
    if (!q) return NextResponse.json({ error: 'q requerido' }, { status: 400 })
    url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&countrycodes=pe&limit=6`
  }

  try {
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } })
    if (!res.ok) return NextResponse.json({ error: 'Error Nominatim' }, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Error de red' }, { status: 500 })
  }
}
