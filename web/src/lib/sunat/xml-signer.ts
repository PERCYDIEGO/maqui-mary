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

  // 1. Timestamp ISO para SigningTime
  const signingTime = new Date().toISOString()

  // 2. URL oficial de la política de firma SUNAT
  const policyIdentifier = 'https://cpe.sunat.gob.pe/politicaDeSignature'
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

  // 3. Configurar xml-crypto
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

  // getKeyInfo devuelve SOLO el contenido de KeyInfo (sin el tag KeyInfo en sí),
  // porque xml-crypto lo envuelve automáticamente con <ds:KeyInfo>...</ds:KeyInfo>
  sig.keyInfoProvider = {
    getKeyInfo() {
      return `<ds:X509Data><ds:X509Certificate>${certBase64}</ds:X509Certificate></ds:X509Data>`
    },
    getKey: () => Buffer.from(''),
  }

  // 4. Computar firma con prefijo ds: nativo (xml-crypto v2 soporta { prefix } en runtime)
  ;(sig as any).computeSignature(xmlString, { prefix: 'ds' })
  let signatureXml = sig.getSignatureXml()

  // 5. Agregar Id="SignatureSP" al nodo raíz ds:Signature
  signatureXml = signatureXml.replace(
    /<ds:Signature /,
    '<ds:Signature Id="SignatureSP" '
  )

  // 6. Insertar xades:QualifyingProperties dentro de ds:Object
  const objectNode = `<ds:Object>${qualifyingProps}</ds:Object>`
  signatureXml = signatureXml.replace(
    /<\/ds:Signature>/,
    `${objectNode}</ds:Signature>`
  )

  // 7. Insertar la firma completa dentro de <ext:ExtensionContent/>
  const result = xmlString.replace(
    /<ext:ExtensionContent\/>/,
    `<ext:ExtensionContent>${signatureXml}</ext:ExtensionContent>`
  )

  return result
}
