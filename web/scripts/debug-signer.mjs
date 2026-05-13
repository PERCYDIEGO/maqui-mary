import pg from 'pg'
import forge from 'node-forge'
import { SignedXml } from 'xml-crypto'

const { Client } = pg
const CONN = 'postgresql://postgres:1rkddYkZ1B5nNZS0@db.ofemdngaslpdexsqfcbb.supabase.co:5432/postgres'

function extractFromPfx(pfxBase64, password) {
  const p12Der = forge.util.decode64(pfxBase64)
  const p12Asn1 = forge.asn1.fromDer(p12Der)
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
  if (!keyBag?.key) throw new Error('No se encontró clave privada')

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
  const certBag = certBags[forge.pki.oids.certBag]?.[0]
  if (!certBag?.cert) throw new Error('No se encontró certificado')

  const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key)
  const certificatePem = forge.pki.certificateToPem(certBag.cert)
  const certBase64 = certificatePem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\r?\n/g, '')
    .trim()

  return { privateKeyPem, certificatePem, certBase64 }
}

function signXml(xmlString, certInfo) {
  const { privateKeyPem, certBase64 } = certInfo
  const signingTime = new Date().toISOString()
  const policyIdentifier = 'https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billService?wsdl'
  const policyDigest = '3Tl8CoD2Ly3ft9P8w7CqHjsPioXnJZJ8ZY+ED6V6yE='

  const qualifyingProps = `<xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#SignatureSP">
    <xades:SignedProperties Id="SignedProperties">
      <xades:SignedSignatureProperties>
        <xades:SigningTime>${signingTime}</xades:SigningTime>
        <xades:SignaturePolicyIdentifier>
          <xades:SignaturePolicyId>
            <xades:SigPolicyId>
              <xades:Identifier>${policyIdentifier}</xades:Identifier>
            </xades:SigPolicyId>
            <xades:SigPolicyHash>
              <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
              <ds:DigestValue>${policyDigest}</ds:DigestValue>
            </xades:SigPolicyHash>
          </xades:SignaturePolicyId>
        </xades:SignaturePolicyIdentifier>
      </xades:SignedSignatureProperties>
    </xades:SignedProperties>
  </xades:QualifyingProperties>`

  const sig = new SignedXml()
  sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
  sig.addReference(
    "//*[local-name(.)='Invoice']",
    [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    'http://www.w3.org/2001/04/xmlenc#sha256'
  )

  sig.signingKey = Buffer.from(privateKeyPem)
  sig.keyInfoProvider = {
    getKeyInfo() {
      return `<ds:KeyInfo><ds:X509Data><ds:X509Certificate>${certBase64}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>`
    },
    getKey: () => Buffer.from(''),
  }

  sig.computeSignature(xmlString)
  let signatureXml = sig.getSignatureXml()

  // Normalizar prefijos ds:
  signatureXml = signatureXml.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g,
    (match, tagName, attrs) => {
      if (tagName.includes(':') || tagName === '?xml') return match
      return `<ds:${tagName}${attrs}>`
    }
  )
  signatureXml = signatureXml.replace(
    /<\/([a-zA-Z][a-zA-Z0-9]*)>/g,
    (match, tagName) => {
      if (tagName.includes(':')) return match
      return `</ds:${tagName}>`
    }
  )

  signatureXml = signatureXml.replace(
    /<ds:Signature /,
    '<ds:Signature Id="SignatureSP" '
  )

  const objectNode = `<ds:Object>${qualifyingProps}</ds:Object>`
  signatureXml = signatureXml.replace(
    /<\/ds:Signature>/,
    `${objectNode}</ds:Signature>`
  )

  const result = xmlString.replace(
    /<ext:ExtensionContent\/>/,
    `<ext:ExtensionContent>${signatureXml}</ext:ExtensionContent>`
  )

  return result
}

const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ID>F001-00000001</cbc:ID>
</Invoice>`

async function main() {
  const client = new Client({ connectionString: CONN })
  await client.connect()
  const { rows } = await client.query(`SELECT cert_base64, cert_password FROM sunat_config WHERE id = 1`)
  await client.end()

  const certInfo = extractFromPfx(rows[0].cert_base64, rows[0].cert_password)
  const signed = signXml(testXml, certInfo)

  console.log('📋 Estructura de firma:')
  console.log('  Tiene SignatureSP:', signed.includes('Id="SignatureSP"'))
  console.log('  Tiene QualifyingProperties:', signed.includes('QualifyingProperties'))
  console.log('  Tiene X509Certificate:', signed.includes('X509Certificate'))
  console.log('  Tiene SignatureValue:', signed.includes('SignatureValue'))
  console.log('  Tiene SignedInfo:', signed.includes('SignedInfo'))
  console.log('  Tiene DigestValue:', /<(ds:)?DigestValue>/.test(signed))
  console.log('  Longitud total:', signed.length)

  const fs = await import('fs')
  fs.writeFileSync('D:/proyectos_opencode/projects/Maqui-Mary/web/scripts/test-signed.xml', signed)
  console.log('\n💾 Guardado en scripts/test-signed.xml')
}

main().catch(e => { console.error(e); process.exit(1) })
