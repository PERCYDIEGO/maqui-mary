import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { extractFromPfx } from '@/lib/sunat/xml-signer'

/**
 * GET /api/sunat/diagnostico
 * Verifica la configuración SUNAT sin emitir ningún comprobante.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; mensaje: string }> = {}

  // 1. Leer config desde Supabase
  const { data: config, error: configError } = await supabase
    .from('sunat_config')
    .select('*')
    .eq('id', 1)
    .single()

  if (configError) {
    checks.config_sunat = { ok: false, mensaje: `Error leyendo config: ${configError.message} (código: ${configError.code})` }
    return NextResponse.json({ ok: false, checks })
  }

  if (!config) {
    checks.config_sunat = { ok: false, mensaje: 'No existe fila id=1 en sunat_config' }
    return NextResponse.json({ ok: false, checks })
  }

  checks.config_sunat = { ok: true, mensaje: 'Configuración encontrada en Supabase' }

  // 2. RUC
  checks.ruc = config.ruc?.trim()
    ? { ok: true, mensaje: `RUC: ${config.ruc}` }
    : { ok: false, mensaje: 'RUC vacío — completa el campo en Configuración > SUNAT' }

  // 3. Razón Social
  checks.razon_social = config.razon_social?.trim()
    ? { ok: true, mensaje: `Razón Social: ${config.razon_social}` }
    : { ok: false, mensaje: 'Razón Social vacía' }

  // 4. SOL usuario
  checks.sol_user = config.sol_user?.trim()
    ? { ok: true, mensaje: `Usuario SOL configurado: ${config.sol_user}` }
    : { ok: false, mensaje: 'Usuario SOL vacío — ingresa solo el usuario (sin RUC), ej. MAQUIMARI' }

  // 5. SOL password
  checks.sol_password = config.sol_password?.trim()
    ? { ok: true, mensaje: 'Clave SOL configurada' }
    : { ok: false, mensaje: 'Clave SOL vacía' }

  // 6. Ambiente
  checks.ambiente = { ok: true, mensaje: `Ambiente: ${config.environment || 'demo'} → endpoint ${config.environment === 'produccion' ? 'PRODUCCIÓN' : 'BETA'}` }

  // 7. Certificado PFX (presencia)
  const hasCert = !!(config.cert_base64?.trim())
  checks.cert_base64 = hasCert
    ? { ok: true, mensaje: `Certificado PFX cargado (${config.cert_base64.length} caracteres en base64)` }
    : { ok: false, mensaje: 'Certificado PFX no cargado — sube tu .pfx en Configuración > SUNAT > Certificado' }

  // 8. Contraseña PFX (presencia)
  const hasCertPass = !!(config.cert_password?.trim())
  checks.cert_password = hasCertPass
    ? { ok: true, mensaje: 'Contraseña del certificado configurada' }
    : { ok: false, mensaje: 'Contraseña del certificado vacía' }

  // 9. Intentar extraer el PFX (prueba real de cert + password)
  if (hasCert && hasCertPass) {
    try {
      const certInfo = extractFromPfx(config.cert_base64, config.cert_password)
      const certLines = certInfo.certBase64.length
      checks.pfx_valido = { ok: true, mensaje: `PFX válido — cert extraído (${certLines} chars base64)` }
    } catch (e: any) {
      checks.pfx_valido = {
        ok: false,
        mensaje: `Error extrayendo PFX: ${e.message} — verifica que la contraseña sea correcta y el archivo .pfx no esté corrupto`,
      }
    }
  } else {
    checks.pfx_valido = { ok: false, mensaje: 'Saltado — falta certificado o contraseña' }
  }

  // 10. Conectividad a SUNAT beta
  try {
    const pingRes = await fetch('https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '"urn:sendBill"' },
      body: '<?xml version="1.0"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body/></soapenv:Envelope>',
      signal: AbortSignal.timeout(8000),
    })
    const text = await pingRes.text()
    const esFault = text.includes('faultstring') || text.includes('Fault')
    checks.conectividad_sunat = {
      ok: true,
      mensaje: `Endpoint SUNAT beta alcanzable (HTTP ${pingRes.status}) — ${esFault ? 'responde SOAP Fault esperado' : 'responde OK'}`,
    }
  } catch (e: any) {
    checks.conectividad_sunat = {
      ok: false,
      mensaje: `No se puede conectar a SUNAT beta: ${e.message} — posible firewall o DNS en Vercel`,
    }
  }

  // Último comprobante con error
  const { data: lastError } = await supabase
    .from('facturas')
    .select('series, number, estado_sunat, sunat_response, created_at')
    .eq('estado_sunat', 'ERROR')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const allOk = Object.values(checks).every(c => c.ok)

  return NextResponse.json({
    ok: allOk,
    checks,
    ultimo_error: lastError || null,
    resumen: allOk
      ? '✅ Todo listo para emitir a SUNAT'
      : '❌ Hay problemas que resolver antes de poder emitir',
  })
}
