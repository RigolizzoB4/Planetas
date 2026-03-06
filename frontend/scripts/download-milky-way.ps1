# Baixa 2k_stars_milky_way.jpg e coloca em public/textures/
# Uso: .\scripts\download-milky-way.ps1 (execute na raiz do frontend ou do projeto)

$url = "https://www.solarsystemscope.com/textures/download/2k_stars_milky_way.jpg"
$dir = $PSScriptRoot + "\..\public\textures"
$out = Join-Path $dir "2k_stars_milky_way.jpg"

if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Host "Baixando Via Lactea para: $out"
try {
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
    Write-Host "OK. Arquivo salvo: $out"
} catch {
    Write-Host "Erro ao baixar: $_"
    Write-Host "Baixe manualmente: $url e salve em: $out"
    exit 1
}
