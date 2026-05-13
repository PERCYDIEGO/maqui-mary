import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminSb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const facturaId = formData.get('facturaId') as string | null

    if (!file || !facturaId) {
      return NextResponse.json({ ok: false, error: 'Archivo y facturaId requeridos' }, { status: 400 })
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, error: 'Solo imágenes JPG, PNG o WebP' }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ ok: false, error: 'La imagen no debe superar 5MB' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `factura_${facturaId}_${Date.now()}.${fileExt}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await adminSb.storage
      .from('payment-evidence')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = adminSb.storage
      .from('payment-evidence')
      .getPublicUrl(fileName)

    const { error: updateError } = await adminSb
      .from('facturas')
      .update({ payment_evidence_url: publicUrl })
      .eq('id', facturaId)

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, publicUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Error interno' }, { status: 500 })
  }
}
