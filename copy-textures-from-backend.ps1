# Copia texturas de backend/textures/ para frontend/public/textures/
# Use quando as texturas já vieram do Emergent (backend) e você quer que o Netlify use as mesmas — sem baixar de novo da web.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$src = Join-Path $root "backend\textures"
$dst = Join-Path $root "frontend\public\textures"

if (-not (Test-Path $src)) {
    Write-Host "Pasta backend/textures/ nao encontrada. Crie-a e coloque as texturas la (ou use COMO_BAIXAR_TEXTURAS.html no frontend)." -ForegroundColor Yellow
    exit 0
}

$files = Get-ChildItem -Path $src -File -ErrorAction SilentlyContinue
if (-not $files) {
    Write-Host "Nenhum arquivo em backend/textures/. Coloque as texturas la ou baixe por frontend/public/textures/COMO_BAIXAR_TEXTURAS.html" -ForegroundColor Yellow
    exit 0
}

New-Item -ItemType Directory -Force -Path $dst | Out-Null
foreach ($f in $files) {
    Copy-Item $f.FullName -Destination $dst -Force
    Write-Host "Copiado: $($f.Name)" -ForegroundColor Green
}
Write-Host "Pronto. Texturas em frontend/public/textures/ para o Netlify." -ForegroundColor Cyan
