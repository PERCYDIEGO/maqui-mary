import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CALLMEBOT_APIKEY = process.env.WHATSAPP_CALLMEBOT_APIKEY

async function getBusinessPhone(): Promise<string> {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await sb.from('app_config').select('settings').eq('id', 1).single()
    return data?.settings?.empresa?.whatsapp_negocio || '51916165543'
  } catch {
    return '51916165543'
  }
}

async function enviarWhatsApp(mensaje: string): Promise<void> {
  if (!CALLMEBOT_APIKEY) return
  const phone = await getBusinessPhone()
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(mensaje)}&apikey=${CALLMEBOT_APIKEY}`
  await fetch(url)
}

export async function POST(req: NextRequest) {
  try {
    const { tipo, datos } = await req.json()

    let mensaje = ''

    if (tipo === 'nuevo_pedido') {
      const { cliente, telefono, total, items, metodo } = datos
      const itemsTexto = (items as { name: string; quantity: number; price: number }[])
        .map(i => `• ${i.name} x${i.quantity} — S/ ${(i.price * i.quantity).toFixed(2)}`)
        .join('\n')
      mensaje =
        `🛒 *NUEVO PEDIDO*\n` +
        `👤 ${cliente} · 📱 ${telefono}\n` +
        `💳 ${metodo === 'yape' ? 'Yape' : 'Plin'}\n\n` +
        `${itemsTexto}\n\n` +
        `💰 *Total: S/ ${Number(total).toFixed(2)}*\n` +
        `📌 Confirmar en: maquimary.com.pe/crm/pedidos`
    }

    if (tipo === 'comprobante_subido') {
      const { cliente, telefono, total, facturaId } = datos
      mensaje =
        `✅ *COMPROBANTE RECIBIDO*\n` +
        `👤 ${cliente} · 📱 ${telefono}\n` +
        `💰 S/ ${Number(total).toFixed(2)}\n` +
        `🔗 Ver pedido #${facturaId}: maquimary.com.pe/crm/pedidos`
    }

    if (!mensaje) {
      return NextResponse.json({ ok: false, error: 'Tipo desconocido' }, { status: 400 })
    }

    await enviarWhatsApp(mensaje)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[NOTIFY/WA]', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
