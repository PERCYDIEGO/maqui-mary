/**
 * Cliente SOAP para enviar comprobantes directamente a SUNAT Perú
 */

import JSZip from 'jszip'
import { getSunatConfig } from './config'

interface SoapResult {
  success: boolean
  cdrXml?: string // Constancia de Recepción (respuesta XML de SUNAT)
  cdrBase64?: string // CDR en base64
  error?: string
  responseCode?: string
  description?: string
}

/**
 * Comprime el XML firmado en un archivo ZIP con el nombre requerido por SUNAT
 * @param filename Nombre del archivo sin extensión (RUC-TIPO-SERIE-NUMERO)
 * @param xmlContent Contenido XML firmado
 * @returns ZIP en base64
 */
export async function zipXml(filename: string, xmlContent: string): Promise<string> {
  const zip = new JSZip()
  zip.file(`${filename}.xml`, xmlContent)
  const zipBlob = await zip.generateAsync({ type: 'base64' })
  return zipBlob
}

/**
 * Envía un comprobante a SUNAT vía SOAP
 * @param filename Nombre del archivo (RUC-TIPO-SERIE-NUMERO)
 * @param zipBase64 ZIP en base64
 * @param solUser Usuario SOL
 * @param solPassword Clave SOL
 */
export async function sendToSunat(
  filename: string,
  zipBase64: string,
  solUser: string,
  solPassword: string,
  endpoint?: string
): Promise<SoapResult> {
  const config = getSunatConfig()
  const finalEndpoint = endpoint || (config.environment === 'produccion'
    ? 'https://e-gw.sunat.gob.pe/ol-ti-itcpfegem/billService'
    : 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService')

  // Construir SOAP Envelope
  const soapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${escapeXml(solUser)}</wsse:Username>
        <wsse:Password>${escapeXml(solPassword)}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>${filename}.zip</fileName>
      <contentFile>${zipBase64}</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`

  try {
    const res = await fetch(finalEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '"urn:sendBill"',
      },
      body: soapXml,
    })

    const responseText = await res.text()

    // Parsear respuesta para extraer CDR
    const cdrMatch = responseText.match(/<applicationResponse>([\s\S]*?)<\/applicationResponse>/i)
    if (cdrMatch && cdrMatch[1]) {
      const cdrBase64 = cdrMatch[1].trim()

      // Decodificar CDR (es un ZIP en base64)
      try {
        const cdrZip = await JSZip.loadAsync(cdrBase64, { base64: true })
        // Buscar el XML dentro del ZIP
        const xmlFile = Object.values(cdrZip.files).find(f => f.name.endsWith('.xml'))
        const cdrXml = xmlFile ? await xmlFile.async('string') : undefined

        // Extraer código y descripción del CDR
        const responseCode = extractTag(cdrXml || '', 'cbc:ResponseCode') || extractTag(cdrXml || '', 'ResponseCode')
        const description = extractTag(cdrXml || '', 'cbc:Description') || extractTag(cdrXml || '', 'Description')

        const isAccepted = responseCode === '0'

        return {
          success: isAccepted,
          cdrXml,
          cdrBase64,
          responseCode,
          description: description || 'Comprobante procesado',
          error: isAccepted ? undefined : (description || `Código de respuesta: ${responseCode}`),
        }
      } catch (zipError: any) {
        return {
          success: false,
          error: `Error decodificando CDR: ${zipError.message}`,
        }
      }
    }

    // Si no hay applicationResponse, revisar errores SOAP
    const faultMatch = responseText.match(/<faultstring>([\s\S]*?)<\/faultstring>/i)
    if (faultMatch) {
      return { success: false, error: `Error SOAP: ${faultMatch[1].trim()}` }
    }

    return { success: false, error: 'Respuesta inesperada de SUNAT', description: responseText.slice(0, 500) }
  } catch (e: any) {
    return { success: false, error: e.message || 'Error de conexión con SUNAT' }
  }
}

/**
 * Consulta el estado de un comprobante enviado
 */
export async function checkStatus(
  ruc: string,
  tipo: string,
  serie: string,
  numero: number,
  solUser: string,
  solPassword: string
): Promise<SoapResult> {
  const config = getSunatConfig()
  const endpoint = config.environment === 'produccion'
    ? 'https://e-gw.sunat.gob.pe/ol-ti-itcpfegem/billService'
    : 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'

  const ticket = `${ruc}|${tipo}|${serie}|${numero}`

  const soapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${escapeXml(solUser)}</wsse:Username>
        <wsse:Password>${escapeXml(solPassword)}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:getStatus>
      <ticket>${ticket}</ticket>
    </ser:getStatus>
  </soapenv:Body>
</soapenv:Envelope>`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: soapXml,
    })

    const responseText = await res.text()

    const cdrMatch = responseText.match(/<applicationResponse>([\s\S]*?)<\/applicationResponse>/i)
    if (cdrMatch && cdrMatch[1]) {
      const cdrBase64 = cdrMatch[1].trim()
      try {
        const cdrZip = await JSZip.loadAsync(cdrBase64, { base64: true })
        const xmlFile = Object.values(cdrZip.files).find(f => f.name.endsWith('.xml'))
        const cdrXml = xmlFile ? await xmlFile.async('string') : undefined

        const responseCode = extractTag(cdrXml || '', 'cbc:ResponseCode') || extractTag(cdrXml || '', 'ResponseCode')
        const description = extractTag(cdrXml || '', 'cbc:Description') || extractTag(cdrXml || '', 'Description')

        return {
          success: responseCode === '0',
          cdrXml,
          cdrBase64,
          responseCode,
          description: description || 'Consulta realizada',
        }
      } catch (e: any) {
        return { success: false, error: `Error decodificando CDR: ${e.message}` }
      }
    }

    return { success: false, error: 'No se encontró CDR en la respuesta' }
  } catch (e: any) {
    return { success: false, error: e.message || 'Error de conexión' }
  }
}

// ─── Helpers ───

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function extractTag(xml: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : undefined
}
