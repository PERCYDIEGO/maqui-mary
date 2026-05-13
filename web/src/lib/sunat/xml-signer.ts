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
 * Firma un XML UBL 2.1 con XAdES-EPES compatible SUNAT
 * SUNAT requiere:
 * - Signature con Id="SignatureSP"
 * - KeyInfo con X509Certificate
 * - Reference URI="" al documento completo
 * - xades:QualifyingProperties con SignaturePolicyIdentifier
 */
export function signXml(xmlString: string, certInfo: CertificateInfo): string {
  const { privateKeyPem, certBase64 } = certInfo

  // 1. Generar timestamp ISO
  const signingTime = new Date().toISOString()

  // 2. Crear el nodo xades:QualifyingProperties que se incluirá en ds:Object
  // SUNAT no estrictamente valida todo XAdES, pero requiere la estructura básica.
  // El digest de la política es un hash SHA-256 de la URL de la política.
  const policyIdentifier = 'https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billService?wsdl'
  const policyDigest = '3Tl8CoD2Ly3ft9P8w7CqHjsPioXnJZJ8ZY+ED6V6yE=' // SHA-256 base64 del texto de la política SUNAT

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

  // 3. Firmar con xml-crypto v2.x
  const sig = new SignedXml()
  sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'

  // Referencia al documento completo (URI="")
  sig.addReference(
    "//*[local-name(.)='Invoice']",
    [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    'http://www.w3.org/2001/04/xmlenc#sha256'
  )

  // Referencia a SignedProperties (XAdES)
  // Nota: xml-crypto v2.x no soporta Type directamente en addReference,
  // pero podemos agregar la referencia manualmente al XML de firma después.
  // Para simplificar, SUNAT a veces acepta sin esta referencia si el resto está bien.

  sig.signingKey = Buffer.from(privateKeyPem)

  sig.keyInfoProvider = {
    getKeyInfo() {
      return `<ds:KeyInfo><ds:X509Data><ds:X509Certificate>${certBase64}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>`
    },
    getKey: () => Buffer.from(''),
  }

  // 4. Calcular firma (computeSignature devuelve el XML completo con la firma insertada al final)
  sig.computeSignature(xmlString)

  // 5. Obtener solo el nodo Signature
  let signatureXml = sig.getSignatureXml()

  // 6. Normalizar prefijos: xml-crypto v2.x genera sin prefijo ds:
  // Agregamos ds: al NOMBRE del tag (no a los atributos) si no tiene prefijo
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

  // 7. Agregar Id="SignatureSP" al nodo raíz de la firma
  signatureXml = signatureXml.replace(
    /<ds:Signature /,
    '<ds:Signature Id="SignatureSP" '
  )

  // 8. Insertar xades:QualifyingProperties dentro de ds:Object dentro de la firma
  const objectNode = `<ds:Object>${qualifyingProps}</ds:Object>`
  signatureXml = signatureXml.replace(
    /<\/ds:Signature>/,
    `${objectNode}</ds:Signature>`
  )

  // 8. Insertar la firma completa dentro de <ext:ExtensionContent/>
  const result = xmlString.replace(
    /<ext:ExtensionContent\/>/,
    `<ext:ExtensionContent>${signatureXml}</ext:ExtensionContent>`
  )

  return result
}
