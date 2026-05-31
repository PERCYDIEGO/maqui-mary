import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/api-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

const ALLOWED_PREFIXES = ['/rest/v1/']

async function handler(req: NextRequest) {
  const user = await verifyAuth(req)
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

  const allowed = ALLOWED_PREFIXES.some(p => path.startsWith(p))
  if (!allowed) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const targetUrl = `${supabaseUrl}${path}`
  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined

  const forwardHeaders: Record<string, string> = {}
  const allowedHeaders = ['apikey', 'authorization', 'content-type']
  for (const key of allowedHeaders) {
    const val = req.headers.get(key)
    if (val) forwardHeaders[key] = val
  }

  const res = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body,
  })

  const contentType = res.headers.get('content-type') || 'application/json'
  const text = await res.text()

  const responseHeaders: Record<string, string> = {
    'Content-Type': contentType,
  }
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) responseHeaders['Set-Cookie'] = setCookie

  return new NextResponse(text, {
    status: res.status,
    headers: responseHeaders,
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
