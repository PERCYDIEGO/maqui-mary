---
name: sunat-local
description: Skill local para facturación electrónica SUNAT en Maqui Mary.
---

## Datos de la empresa
- **RUC:** `20606218801`
- **Razón social:** INVERSIONES MAQUI MARY PERU E.I.R.L.
- **Dirección fiscal:** Pro. Quinta Avenida Mza. J Lote 17-B Asc. Ganaderos Porcinos Saraco — Lurigancho, Lima
- **OSE / Emisor:** El sistema firma y emite directamente (no usa OSE externo).

## Tipos de comprobante
| Código | Tipo | Uso |
|---|---|---|
| `01` | Factura | Venta a empresas (con RUC) |
| `03` | Boleta | Venta a personas (con DNI) |
| `09` | Guía de Remisión | Traslado de mercancía |

## Stack de firma digital
- `xml-crypto` para firmar el XML con el certificado digital.
- `node-forge` para manipular el certificado .p12 / .pfx.
- `jszip` para empaquetar el XML firmado si es necesario.
- `@xmldom/xmldom` para parsear y modificar XML.

## Estructura del XML (UBL 2.1)
- El XML debe cumplir el esquema UBL 2.1 de SUNAT.
- Campos obligatorios: `cbc:ID`, `cbc:IssueDate`, `cbc:IssueTime`, `cac:AccountingSupplierParty`, `cac:AccountingCustomerParty`, `cac:TaxTotal`, `cac:LegalMonetaryTotal`, `cac:InvoiceLine`.
- El hash (digest) del XML firmado debe almacenarse en la DB como `hash_cpe`.

## Ubicación del código
- `web/src/lib/sunat/xml-builder.ts` — Construye el XML UBL.
- `web/src/lib/sunat/xml-signer.ts` — Firma el XML con certificado.
- `web/src/lib/sunat/soap-client.ts` — Envía a SUNAT vía SOAP.
- `web/src/lib/sunat/config.ts` — Configuración (URL de SUNAT, timeouts).
- `web/src/lib/sunat/types.ts` — Tipos TypeScript para SUNAT.
- `web/src/app/api/sunat/emit/route.ts` — API endpoint para emitir.
- `web/src/app/api/sunat/preview/route.ts` — API endpoint para previsualizar XML.

## Reglas de operación
1. **Validar antes de firmar:**
   - RUC del emisor debe ser `20606218801`.
   - RUC del receptor debe ser válido (11 dígitos, DNI 8).
   - Montos deben ser > 0.
   - Stock suficiente antes de emitir (si es pedido).

2. **Certificado digital:**
   - Debe estar vigente (no vencido).
   - La contraseña del .p12 NO debe hardcodearse (usar env var).

3. **Almacenamiento:**
   - Guardar XML firmado en `public/xml/` o Supabase Storage.
   - Guardar CDR (constancia de recepción) en DB.
   - Guardar `hash_cpe` y `numero_documento` en tabla `facturas`.

4. **Reintentos:**
   - Si SUNAT responde con error de conexión, reintentar hasta 3 veces con backoff.
   - Si SUNAT rechaza por datos inválidos, no reintentar automáticamente — notificar al usuario.

## Testing
- Usar `scripts/test-sunat-api.ps1` para verificar conectividad.
- Usar `web/scripts/test-sunat-demo.mjs` para generar XML de prueba.
- En ambiente de prueba, SUNAT tiene un endpoint de homologación.
