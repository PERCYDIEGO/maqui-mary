# Script de Deploy y Mantenimiento - Maqui Mary
# Guardar en: D:\proyectos_opencode\projects\Maqui-Mary\deploy.ps1

param(
    [Parameter()]
    [ValidateSet("dev", "build", "deploy", "preview", "logs", "status")]
    [string]$Action = "dev"
)

$projectPath = "D:\proyectos_opencode\projects\Maqui-Mary\web"

function Show-Help {
    Write-Host "=== Maqui Mary Deploy Script ===" -ForegroundColor Cyan
    Write-Host "Uso: .\deploy.ps1 -Action <comando>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Comandos disponibles:" -ForegroundColor White
    Write-Host "  dev     - Iniciar servidor de desarrollo local" -ForegroundColor Green
    Write-Host "  build   - Compilar para produccion" -ForegroundColor Green
    Write-Host "  deploy  - Deploy a Vercel produccion" -ForegroundColor Green
    Write-Host "  preview - Deploy preview a Vercel" -ForegroundColor Green
    Write-Host "  logs    - Ver logs de Vercel" -ForegroundColor Green
    Write-Host "  status  - Ver estado del proyecto" -ForegroundColor Green
}

switch ($Action) {
    "dev" {
        Write-Host "Iniciando servidor de desarrollo..." -ForegroundColor Cyan
        Set-Location $projectPath
        npm run dev
    }
    "build" {
        Write-Host "Compilando para produccion..." -ForegroundColor Cyan
        Set-Location $projectPath
        npm run build
    }
    "deploy" {
        Write-Host "Deployando a Vercel produccion..." -ForegroundColor Cyan
        Set-Location $projectPath
        npx vercel --prod --yes
        Write-Host "Deploy completado! URL: https://maquimary.com.pe" -ForegroundColor Green
    }
    "preview" {
        Write-Host "Creando deploy preview..." -ForegroundColor Cyan
        Set-Location $projectPath
        npx vercel --yes
    }
    "logs" {
        Write-Host "Obteniendo logs de Vercel..." -ForegroundColor Cyan
        Set-Location $projectPath
        npx vercel logs maquimary.com.pe
    }
    "status" {
        Write-Host "=== Estado del Proyecto ===" -ForegroundColor Cyan
        Set-Location $projectPath
        
        Write-Host "Usuario Vercel:" -ForegroundColor Yellow -NoNewline
        npx vercel whoami
        
        Write-Host "Ultimo deploy:" -ForegroundColor Yellow
        npx vercel list --limit 1
        
        Write-Host "Rama git:" -ForegroundColor Yellow -NoNewline
        git branch --show-current 2>$null
        if (-not $?) { Write-Host " (no es repo git)" -ForegroundColor Red }
    }
}
