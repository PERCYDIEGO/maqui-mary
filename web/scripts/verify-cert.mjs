import pg from 'pg'
import forge from 'node-forge'

const { Client } = pg
const CONN = 'postgresql://postgres:1rkddYkZ1B5nNZS0@db.ofemdngaslpdexsqfcbb.supabase.co:5432/postgres'

function extractFromPfx(pfxBase64, password) {
  const p12Der = forge.util.decode64(pfxBase64)
  const p12Asn1 = forge.asn1.fromDer(p12Der)
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
  if (!keyBag?.key) throw new Error('No se encontró clave privada en el .pfx')

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
  const certBag = certBags[forge.pki.oids.certBag]?.[0]
  if (!certBag?.cert) throw new Error('No se encontró certificado X509 en el .pfx')

  const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key)
  const certificatePem = forge.pki.certificateToPem(certBag.cert)
  const certBase64 = certificatePem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\r?\n/g, '')
    .trim()

  return { privateKeyPem, certificatePem, certBase64 }
}

async function main() {
  const client = new Client({ connectionString: CONN })
  await client.connect()

  console.log('Verificando certificado digital en Supabase...\n')

  const { rows } = await client.query(`
    SELECT ruc, razon_social, nombre_comercial, address, provincia, departamento, distrito, ubigeo,
           sol_user, cert_base64, cert_password, environment
    FROM sunat_config WHERE id = 1
  `)

  if (!rows.length) {
    console.error('No hay sunat_config')
    process.exit(1)
  }

  const cfg = rows[0]
  console.log('Configuracion cargada:')
  console.log(`   RUC: ${cfg.ruc}`)
  console.log(`   Razon Social: ${cfg.razon_social}`)
  console.log(`   Ambiente: ${cfg.environment}`)
  console.log(`   SOL User: ${cfg.sol_user}`)
  console.log(`   Certificado base64 length: ${cfg.cert_base64?.length || 0}`)
  console.log(`   Cert password: ${cfg.cert_password ? '***' : 'NO SET'}`)
  console.log()

  if (!cfg.cert_base64 || !cfg.cert_password) {
    console.error('No hay certificado o contraseña. Sube el .p12 en /crm/configuracion')
    process.exit(1)
  }

  console.log('Extrayendo clave privada y certificado X509 del .pfx...')
  let certInfo
  try {
    certInfo = extractFromPfx(cfg.cert_base64, cfg.cert_password)
    console.log('Certificado extraido correctamente')
    console.log(`   PrivateKey PEM length: ${certInfo.privateKeyPem.length}`)
    console.log(`   Certificate PEM length: ${certInfo.certificatePem.length}`)
    console.log(`   Certificate Base64 length: ${certInfo.certBase64.length}`)
  } catch (e) {
    console.error('Error extrayendo certificado:', e.message)
    process.exit(1)
  }

  // Verificar info del certificado
  try {
    const cert = forge.pki.certificateFromPem(certInfo.certificatePem)
    const subject = cert.subject.getField('CN') ? cert.subject.getField('CN').value : 'N/A'
    const issuer = cert.issuer.getField('CN') ? cert.issuer.getField('CN').value : 'N/A'
    const validFrom = cert.validity.notBefore
    const validTo = cert.validity.notAfter
    console.log(`\nInformacion del certificado:`)
    console.log(`   Subject (CN): ${subject}`)
    console.log(`   Issuer (CN): ${issuer}`)
    console.log(`   Valido desde: ${validFrom.toISOString()}`)
    console.log(`   Valido hasta: ${validTo.toISOString()}`)

    const now = new Date()
    if (now < validFrom || now > validTo) {
      console.log('\n⚠️  ADVERTENCIA: El certificado NO esta vigente actualmente.')
    } else {
      console.log('\n✅ Certificado vigente.')
    }
  } catch (e) {
    console.log('No se pudo leer metadata del certificado:', e.message)
  }

  console.log('\nCertificado digital listo para firmar XML UBL 2.1.')
  console.log('Puedes probar una emision desde /crm/facturas/nueva')

  await client.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
