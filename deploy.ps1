# Publicar o site: envia as alterações para o GitHub e o Netlify atualiza sozinho.
# Uso: .\deploy.ps1   ou   .\deploy.ps1 "minha mensagem de commit"

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$msg = if ($args.Count -gt 0) { $args -join " " } else { "Atualização do site" }

Write-Host "Adicionando alterações..." -ForegroundColor Cyan
git add -A

$status = git status --porcelain
if (-not $status) {
    Write-Host "Nenhuma alteração para enviar. Tudo já está no GitHub." -ForegroundColor Yellow
    exit 0
}

Write-Host "Commit: $msg" -ForegroundColor Cyan
git commit -m $msg

Write-Host "Enviando para o GitHub (main)..." -ForegroundColor Cyan
git push origin main

Write-Host ""
Write-Host "Pronto." -ForegroundColor Green
Write-Host "O Netlify vai atualizar o site em 1-2 minutos. Abra o painel do Netlify ou a URL do seu site." -ForegroundColor White
