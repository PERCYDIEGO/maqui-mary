/**
 * Script de diagnóstico para SUNAT
 * Genera XML, ZIP, y verifica integridad
 */

import JSZip from 'jszip'

// Simular el XML de prueba (similar al debug endpoint)
const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.0</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>B001-00000001</cbc:ID>
  <cbc:Note languageLocaleID="1000"><![CDATA[SON DIEZ CON 00/100 SOLES]]></cbc:Note>
</Invoice>`

async function testZip() {
  const zip = new JSZip()
  zip.file('20606218801-03-B001-00000001.xml', testXml, { compression: 'STORE' })
  const zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'STORE' })
  
  console.log('Original XML length:', testXml.length)
  console.log('ZIP base64 length:', zipBase64.length)
  
  // Verificar que el ZIP se puede leer
  const zipRead = await JSZip.loadAsync(zipBase64, { base64: true })
  const files = Object.keys(zipRead.files)
  console.log('Files in ZIP:', files)
  
  for (const file of files) {
    const content = await zipRead.files[file].async('string')
    console.log(`File ${file} length:`, content.length)
    console.log(`File ${file} starts with:`, content.slice(0, 100))
    console.log(`File ${file} matches original:`, content === testXml)
    
    // Verificar que no hay BOM
    const hasBom = content.charCodeAt(0) === 0xFEFF
    console.log(`File ${file} has BOM:`, hasBom)
    
    // Verificar encoding
    const buffer = Buffer.from(content, 'utf-8')
    console.log(`File ${file} UTF-8 buffer length:`, buffer.length)
  }
}

testZip().catch(console.error)
