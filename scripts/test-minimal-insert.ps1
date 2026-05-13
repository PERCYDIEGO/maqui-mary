$ErrorActionPreference = 'Stop'
$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZW1kbmdhc2xwZGV4c3FmY2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQzMTI4NSwiZXhwIjoyMDk0MDA3Mjg1fQ.Fc-LpbvWlkYJlrOT69IhaXsYoZlgKExDbq3EAoZPITM'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZW1kbmdhc2xwZGV4c3FmY2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQzMTI4NSwiZXhwIjoyMDk0MDA3Mjg1fQ.Fc-LpbvWlkYJlrOT69IhaXsYoZlgKExDbq3EAoZPITM'
    'Content-Type' = 'application/json'
}

# Intentar obtener las columnas de la tabla facturas
$body = @'
{"select": "*", "from": "facturas", "limit": 0}
'@

# No, eso no funciona con REST
# Mejor: intentar insertar con columnas una por una para descubrir cuáles faltan

$minimal = '{"series":"F001","number":99999,"cliente_nombre":"TEST","subtotal":10,"igv":1.8,"total":11.8,"date_millis":1715600000000}'

try {
    $resp = Invoke-RestMethod -Uri 'https://ofemdngaslpdexsqfcbb.supabase.co/rest/v1/facturas' -Method POST -Headers $headers -Body $minimal
    Write-Host "INSERT MINIMAL OK" -ForegroundColor Green
} catch [System.Net.WebException] {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $err = $reader.ReadToEnd()
    Write-Host "ERROR MINIMAL INSERT:" -ForegroundColor Red
    Write-Host $err
}
