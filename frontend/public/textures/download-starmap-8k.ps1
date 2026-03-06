# Baixa o mapa estelar 8K (8192x4096) do Paul Bourke e salva como starmap_8k.png
# Uso: execute nesta pasta (frontend/public/textures/) ou na raiz do projeto.

$url = "https://paulbourke.net/miscellaneous/astronomy/8192x4096.png"
$destDir = $PSScriptRoot
$out = Join-Path $destDir "starmap_8k.png"

Write-Host "Baixando mapa estelar 8K (Paul Bourke)..."
Write-Host "URL: $url"
Write-Host "Destino: $out"

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
    Write-Host "OK. Arquivo salvo: $out"
} catch {
    Write-Host "Erro ao baixar: $_"
    Write-Host "Baixe manualmente: $url"
    Write-Host "Salve como: $out"
    exit 1
}
