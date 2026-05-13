$ErrorActionPreference = 'Stop'
$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZW1kbmdhc2xwZGV4c3FmY2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQzMTI4NSwiZXhwIjoyMDk0MDA3Mjg1fQ.Fc-LpbvWlkYJlrOT69IhaXsYoZlgKExDbq3EAoZPITM'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZW1kbmdhc2xwZGV4c3FmY2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQzMTI4NSwiZXhwIjoyMDk0MDA3Mjg1fQ.Fc-LpbvWlkYJlrOT69IhaXsYoZlgKExDbq3EAoZPITM'
    'Content-Type' = 'application/json'
}

$base = '{"series":"F001","number":99999,"cliente_nombre":"TEST","subtotal":10,"igv":1.8,"total":11.8,"date_millis":1715600000000}'

$columnsToTest = @(
    @{ name='cliente_id'; value='null'; type='null' }
    @{ name='cliente_ruc'; value='""'; type='string' }
    @{ name='cliente_direccion'; value='""'; type='string' }
    @{ name='tipo_comprobante'; value='"01"'; type='string' }
    @{ name='origen'; value='"crm"'; type='string' }
    @{ name='estado_sunat'; value='"PENDIENTE"'; type='string' }
    @{ name='sunat_response'; value='""'; type='string' }
    @{ name='ticket_sunat'; value='""'; type='string' }
    @{ name='notes'; value='""'; type='string' }
    @{ name='forma_pago'; value='"contado"'; type='string' }
    @{ name='moneda'; value='"PEN"'; type='string' }
    @{ name='tipo_cambio'; value='null'; type='null' }
    @{ name='guia_remision'; value='""'; type='string' }
    @{ name='orden_compra'; value='""'; type='string' }
    @{ name='cdr_xml'; value='""'; type='string' }
    @{ name='cdr_codigo'; value='""'; type='string' }
    @{ name='cdr_descripcion'; value='""'; type='string' }
    @{ name='hash'; value='""'; type='string' }
    @{ name='firma_digest'; value='""'; type='string' }
    @{ name='pdf_url'; value='""'; type='string' }
    @{ name='xml_url'; value='""'; type='string' }
    @{ name='enviado_at'; value='null'; type='null' }
)

Write-Host "=== Probando columnas de facturas ===" -ForegroundColor Cyan

foreach ($col in $columnsToTest) {
    $body = $base.TrimEnd('}') + ',"' + $col.name + '":' + $col.value + '}'
    try {
        $resp = Invoke-RestMethod -Uri 'https://ofemdngaslpdexsqfcbb.supabase.co/rest/v1/facturas' -Method POST -Headers $headers -Body $body
        Write-Host "[OK] $($col.name)" -ForegroundColor Green
    } catch [System.Net.WebException] {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $err = $reader.ReadToEnd()
        if ($err -match 'column') {
            Write-Host "[MISSING] $($col.name)" -ForegroundColor Red
        } else {
            Write-Host "[OTHER] $($col.name) -> $err" -ForegroundColor Yellow
        }
    }
}
