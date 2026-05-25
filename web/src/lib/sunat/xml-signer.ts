/**
 * Firma digital XML XAdES-EPES para SUNAT Perú
 * Extrae clave privada y certificado de un .pfx y firma el XML UBL 2.1
 * Compatible con xml-crypto v2.x
 */

import { SignedXml } from 'xml-crypto'
import * as forge from 'node-forge'

interface CertificateInfo {
  privateKeyPem: string
  certificatePem: string
  certBase64: string
}

/**
 * Extrae la clave privada y el certificado X509 de un archivo .pfx (PKCS#12)
 */
export function extractFromPfx(pfxBase64: string, password: string): CertificateInfo {
  const p12Der = forge.util.decode64(pfxBase64)
  const p12Asn1 = forge.asn1.fromDer(p12Der)
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
  if (!keyBag?.key) throw new Error('No se encontró clave privada en el .pfx')

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
  const certBag = certBags[forge.pki.oids.certBag]?.[0]
  if (!certBag?.cert) throw new Error('No se encontró certificado X509 en el .pfx')

  const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key as forge.pki.PrivateKey)
  const certificatePem = forge.pki.certificateToPem(certBag.cert)

  const certBase64 = certificatePem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\r?\n/g, '')
    .trim()

  return { privateKeyPem, certificatePem, certBase64 }
}

/**
 * Firma un XML UBL 2.1 con XAdES-EPES compatible SUNAT.
 *
 * Estrategia clave — inserción manual sin DOM round-trip:
 *
 * El problema de usar location + getSignedXml() es que xmldom re-serializa
 * todo el documento, alterando espacios y namespace declarations. Eso hace que
 * el digest calculado por xml-crypto no coincida con el que SUNAT recalcula al
 * verificar la firma ("Incorrect reference digest value").
 *
 * Solución: computeSignature sin location, extraer solo <ds:Signature> con
 * getSignatureXml(), e insertarlo manualmente en el string original sin tocar
 * el resto del documento. Así SUNAT re-canonicaliza exactamente el mismo XML
 * sobre el que xml-crypto computó el digest.
 */
export function signXml(xmlString: string, certInfo: CertificateInfo): string {
  const { privateKeyPem, certBase64 } = certInfo

  const signingTime = new Date().toISOString()
  const policyIdentifier = 'https://cpe.sunat.gob.pe/politicaDeSignature'
  const policyDigest = '3Tl8CoD2Ly3ft9P8w7CqHjsPioXnJZJ8ZY+ED6V6yE='

  // Exclusive C14N para SignedInfo — evita el problema de namespaces heredados.
  // xml-crypto firma SignedInfo como elemento standalone (sin contexto del documento padre).
  // SUNAT lo verifica en contexto del Invoice completo, que tiene xmlns/cac/cbc/ext heredados.
  // Con inclusive C14N, los bytes difieren → RSA falla.
  // Con exclusive C14N, solo se incluyen namespaces usados (xmlns:ds), mismo resultado en ambos lados.
  const sig = new SignedXml(null, {
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  })

  // enveloped-signature + inclusive C14N explícito.
  // Sin C14N explícito en los transforms, xml-crypto y SUNAT pueden elegir
  // algoritmos distintos por defecto al canonicalizar el node set resultante,
  // causando que el digest de xml-crypto no coincida con el que SUNAT recalcula.
  sig.addReference(
    '/*',
    [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    'http://www.w3.org/2001/04/xmlenc#sha256',
    '',    // uri = "" → <Reference URI="">
    '',
    '',
    true   // isEmptyUri
  )

  sig.signingKey = Buffer.from(privateKeyPem)

  sig.keyInfoProvider = {
    getKeyInfo() {
      return `<ds:X509Data><ds:X509Certificate>${certBase64}</ds:X509Certificate></ds:X509Data>`
    },
    getKey: () => Buffer.from(''),
  }

  // Computar sin location → xml-crypto computa el digest sobre el xmlString
  // original (parseado a DOM) sin insertar nada todavía en el documento.
  sig.computeSignature(xmlString, { prefix: 'ds' })

  // Extraer solo el nodo <ds:Signature>...</ds:Signature>
  let signatureXml = sig.getSignatureXml()

  // Id="SignatureSP" requerido por SUNAT para la referencia interna
  signatureXml = signatureXml.replace(
    /<ds:Signature /,
    '<ds:Signature Id="SignatureSP" '
  )

  // XAdES QualifyingProperties — va DENTRO de ds:Signature en ds:Object.
  // El transform enveloped-signature elimina todo ds:Signature antes de
  // recalcular el digest, así que este bloque no invalida la firma.
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

  signatureXml = signatureXml.replace(
    '</ds:Signature>',
    `<ds:Object>${qualifyingProps}</ds:Object></ds:Signature>`
  )

  // ─── LIMPIEZA CRÍTICA: eliminar namespaces duplicados y vacíos ───
  // xml-crypto/xmldom insertan xmlns:ds duplicado y xmlns="" vacíos
  // que el parser Java de SUNAT rechaza (error 1008)
  signatureXml = signatureXml
    .replace(/ xmlns:ds="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#"/g, '')
    .replace(/ xmlns=""/g, '')

  // Inserción manual en el string original — sin pasar por getSignedXml()
  // ni por el serializer de xmldom. El resto del documento queda intacto,
  // byte a byte igual al xmlString sobre el que xml-crypto calculó el digest.
  const signedXml = xmlString.replace(
    '<ext:ExtensionContent/>',
    `<ext:ExtensionContent>${signatureXml}</ext:ExtensionContent>`
  )

  if (!signedXml.includes('<ext:ExtensionContent>')) {
    throw new Error('No se encontró <ext:ExtensionContent/> en el XML para insertar la firma')
  }

  return signedXml
}
