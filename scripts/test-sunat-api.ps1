# Test de emisión SUNAT vía web proxy
# Ejecutar en PowerShell o curl

$BODY = @'
{
  "cliente_nombre": "CLIENTES VARIOS",
  "cliente_ruc": "",
  "cliente_tipo_doc": "0",
  "cliente_direccion": "",
  "tipo_comprobante": "03",
  "sin_identificar": true,
  "items": [
    {"producto_id": 1, "codigo": "ESP-001", "description": "Esponja Multiuso Amarilla", "quantity": 2, "unit_price": 1.50},
    {"producto_id": 2, "codigo": "ESP-002", "description": "Esponja de Acero Fino", "quantity": 1, "unit_price": 2.00}
  ],
  "notes": "Prueba desde script",
  "origen": "mobile"
}
'@

Write-Host "=== Enviando boleta sin identificar ===" -ForegroundColor Green
Invoke-RestMethod -Uri "https://maquimary.vercel.app/api/sunat/emit" -Method POST -ContentType "application/json" -Body $BODY | ConvertTo-Json -Depth 5

Write-Host "`n=== Listo ===" -ForegroundColor Green
Write-Host "Si el certificado no está en modo producción real, puede dar error de firma en SUNAT beta."
Write-Host "Eso es normal: el certificado ECEP-RENIEC solo funciona en producción real, no en beta."
