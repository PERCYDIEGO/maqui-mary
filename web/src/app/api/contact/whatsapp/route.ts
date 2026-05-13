import { NextResponse } from 'next/server'

const PHONE = process.env.WHATSAPP_PHONE || '51949446676'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const text = url.searchParams.get('text') || '¡Hola! Quiero información sobre productos Maqui Mary'
  const waUrl = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`
  return NextResponse.redirect(waUrl)
}
