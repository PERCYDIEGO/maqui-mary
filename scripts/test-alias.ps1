$body = '{"alias":"admin"}'
$resp = Invoke-RestMethod -Uri 'https://maquimary.vercel.app/api/auth/resolve-alias' -Method POST -ContentType 'application/json' -Body $body
$resp | ConvertTo-Json