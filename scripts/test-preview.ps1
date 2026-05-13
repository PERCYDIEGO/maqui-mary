$ErrorActionPreference = 'Stop'
$body = @'
{
  "cliente_nombre": "CLIENTES VARIOS",
  "cliente_ruc": "",
  "cliente_tipo_doc": "0",
  "cliente_direccion": "",
  "tipo_comprobante": "03",
  "sin_identificar": true,
  "items": [
    {"producto_id": 1, "codigo": "ESP-001", "description": "Esponja Multiuso Amarilla", "quantity": 2, "unit_price": 1.50}
  ],
  "notes": "Prueba preview",
  "origen": "mobile"
}
'@

Write-Host "=== Preview XML firmado ===" -ForegroundColor Green
$resp = Invoke-RestMethod -Uri "https://maquimary.vercel.app/api/sunat/preview" -Method POST -ContentType "application/json" -Body $body

Write-Host "Estado: $($resp.estado)"
Write-Host "Mensaje: $($resp.mensaje)"

if ($resp.xml) {
    Write-Host "`n=== XML (primeros 2000 chars) ===" -ForegroundColor Cyan
    Write-Host $resp.xml.Substring(0, [Math]::Min(2000, $resp.xml.Length))
}

if ($resp.qr) {
    Write-Host "`nQR generado: $($resp.qr.Length) chars" -ForegroundColor Green
}
