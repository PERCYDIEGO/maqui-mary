import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SITE = 'https://maquimary.com.pe'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: productos, error } = await supabase
    .from('productos')
    .select('id, codigo, name, description, price, imagen, stock, category')
    .eq('activo', true)
    .order('id')

  if (error || !productos) {
    return new NextResponse('Error al obtener productos', { status: 500 })
  }

  const items = productos.map((p) => {
    const imageUrl = p.imagen
      ? p.imagen.startsWith('http') ? p.imagen : `${SITE}${p.imagen}`
      : `${SITE}/img/esponjas-colores.png`

    const disponibilidad = (p.stock ?? 0) > 0 ? 'in_stock' : 'out_of_stock'
    const precio = Number(p.price).toFixed(2)
    const id = p.codigo || `MM-${p.id}`
    const titulo = escapeXml(p.name)
    const descripcion = escapeXml(p.description || p.name)

    return `
    <item>
      <g:id>${escapeXml(id)}</g:id>
      <g:title>${titulo}</g:title>
      <g:description>${descripcion}</g:description>
      <g:link>${SITE}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:price>${precio} PEN</g:price>
      <g:availability>${disponibilidad}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>Maqui Mary</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>638</g:google_product_category>
      <g:shipping>
        <g:country>PE</g:country>
        <g:service>Delivery Lima</g:service>
        <g:price>0 PEN</g:price>
      </g:shipping>
    </item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Maqui Mary - Esponjas y Accesorios de Limpieza</title>
    <link>${SITE}</link>
    <description>Esponjas, estropajos y accesorios de limpieza al por mayor en Lima, Perú. RUC 20606218801.</description>
    ${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
