/**
 * Script para debuggear el XML generado para SUNAT
 * Ejecutar con: npx ts-node scripts/debug-xml.ts
 */

import { generateInvoiceXML } from '../src/lib/sunat/xml-builder'

const emisorConfig = {
  environment: 'demo' as const,
  ruc: '20606218801',
  razonSocial: 'INVERSIONES MAQUI MARY PERU E.I.R.L.',
  nombreComercial: 'MAQUI MARY',
  address: 'Av. Test 123',
  urbanizacion: '',
  provincia: 'LIMA',
  departamento: 'LIMA',
  distrito: 'LIMA',
  codigoPais: 'PE',
  ubigeo: '150101',
  solUser: 'test',
  solPassword: 'test',
  certPath: '',
  certPassword: '',
  seriesFactura: 'F001',
  seriesBoleta: 'B001',
  seriesNC: 'FC01',
  seriesND: 'FD01',
}

// Generar BOLETA (03)
const invoiceXml = generateInvoiceXML({
  tipoComprobante: '03',
  serie: 'B001',
  numero: 99999,
  fechaEmision: '2026-05-18',
  horaEmision: '10:00:00',
  cliente: { tipoDoc: '1' as any, numDoc: '00000000', nombre: 'CLIENTES VARIOS', direccion: '' },
  productos: [{
    codigo: 'TEST01',
    descripcion: 'PRODUCTO DE PRUEBA DEBUG',
    cantidad: 1,
    precioUnitario: 10.00,
    precioConIgv: 11.80,
    total: 10.00,
  }],
  subtotal: 10.00,
  igv: 1.80,
  total: 11.80,
  totalLetras: 'SON ONCE CON 80/100 SOLES',
  nota: '',
  moneda: 'PEN',
  emisor: emisorConfig,
})

console.log('═══════════════════════════════════════════════════════════')
console.log('XML GENERADO PARA BOLETA (tipo 03)')
console.log('═══════════════════════════════════════════════════════════')
console.log(invoiceXml)

console.log('\n═══════════════════════════════════════════════════════════')
console.log('ANÁLISIS:')
console.log('═══════════════════════════════════════════════════════════')

// Buscar UBLVersionID
const ublMatch = invoiceXml.match(/<cbc:UBLVersionID>(.*?)<\/cbc:UBLVersionID>/)
console.log('UBLVersionID valor:', ublMatch ? ublMatch[1] : 'NO ENCONTRADO')

// Buscar CustomizationID
const custMatch = invoiceXml.match(/<cbc:CustomizationID>(.*?)<\/cbc:CustomizationID>/)
console.log('CustomizationID valor:', custMatch ? custMatch[1] : 'NO ENCONTRADO')

// Verificar namespaces
console.log('Tiene xmlns Invoice:', invoiceXml.includes('xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"'))
console.log('Tiene xmlns cac:', invoiceXml.includes('xmlns:cac='))
console.log('Tiene xmlns cbc:', invoiceXml.includes('xmlns:cbc='))
console.log('Tiene xmlns ext:', invoiceXml.includes('xmlns:ext='))
console.log('Tiene xmlns ds:', invoiceXml.includes('xmlns:ds='))
console.log('Tiene xmlns xsi:', invoiceXml.includes('xmlns:xsi='))

// Verificar estructura
console.log('UBLExtensions está al principio:', invoiceXml.indexOf('<ext:UBLExtensions>') < invoiceXml.indexOf('<cbc:UBLVersionID>'))
console.log('Signature está presente:', invoiceXml.includes('<cac:Signature>'))

// Verificar si hay BOM
const hasBom = invoiceXml.charCodeAt(0) === 0xFEFF
console.log('Tiene BOM:', hasBom)

// Verificar primeros bytes
console.log('Primeros 100 chars:', JSON.stringify(invoiceXml.slice(0, 100)))
