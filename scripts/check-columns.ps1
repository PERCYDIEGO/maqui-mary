# Verificar columnas existentes en tabla facturas
$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZW1kbmdhc2xwZGV4c3FmY2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQzMTI4NSwiZXhwIjoyMDk0MDA3Mjg1fQ.Fc-LpbvWlkYJlrOT69IhaXsYoZlgKExDbq3EAoZPITM'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZW1kbmdhc2xwZGV4c3FmY2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQzMTI4NSwiZXhwIjoyMDk0MDA3Mjg1fQ.Fc-LpbvWlkYJlrOT69IhaXsYoZlgKExDbq3EAoZPITM'
    'Content-Type' = 'application/json'
}

$query = 'select column_name, data_type from information_schema.columns where table_name = ''facturas'' order by ordinal_position'

$body = (@{ query = $query } | ConvertTo-Json)

Write-Host "Consultando columnas de facturas..."

Invoke-RestMethod -Uri 'https://ofemdngaslpdexsqfcbb.supabase.co/rest/v1/rpc/exec_sql' -Method POST -Headers $headers -Body $body
