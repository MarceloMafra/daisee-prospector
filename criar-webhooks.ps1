$dsn = "api59.unipile.com:18901"
$apiKey = Read-Host "API key"
$segredo = Read-Host "Segredo"
$url = "https://daisee-prospector.vercel.app/api/webhooks/unipile"
$hdrs = @(
  @{ key = "Content-Type"; value = "application/json" },
  @{ key = "x-webhook-secret"; value = $segredo }
)
$lista = @(
  @{ nome = "daisee-linkedin-respostas-v3"; source = "messaging" },
  @{ nome = "daisee-email-respostas-v3"; source = "email" }
)
foreach ($w in $lista) {
  $body = @{ request_url = $url; source = $w.source; name = $w.nome; headers = $hdrs } | ConvertTo-Json -Depth 5
  try {
    Invoke-RestMethod -Uri "https://$dsn/api/v1/webhooks" -Method POST -Headers @{ "X-API-KEY" = $apiKey; "content-type" = "application/json" } -Body $body | Out-Null
    Write-Host "OK: $($w.nome)" -ForegroundColor Green
  } catch {
    Write-Host "ERRO em $($w.nome): $($_.Exception.Message)" -ForegroundColor Red
  }
}