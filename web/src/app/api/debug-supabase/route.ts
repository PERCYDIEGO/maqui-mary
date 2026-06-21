import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const ref = url ? url.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown' : 'unknown'

  return NextResponse.json({
    url,
    projectRef: ref,
    storageKey: `sb-${ref}-auth-token`,
  })
}
