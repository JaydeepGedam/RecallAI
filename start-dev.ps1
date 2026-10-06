# PowerShell runner script for RecallAI
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Starting RecallAI MVP Development Server" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$backendPort = 8000
$env:VITE_BACKEND_PORT = "8000"

# Detect virtual environment uvicorn executable
$uvicornCmd = ".\backend\.venv\Scripts\uvicorn"
if (Test-Path "$PSScriptRoot\backend\.venv\Scripts\uvicorn.exe") {
    $uvicornCmd = ".\backend\.venv\Scripts\uvicorn"
} elseif (Test-Path "$PSScriptRoot\backend\venv\Scripts\uvicorn.exe") {
    $uvicornCmd = ".\backend\venv\Scripts\uvicorn"
} else {
    $uvicornCmd = "uvicorn"
}

Write-Host "`n1. Launching Backend on http://localhost:$backendPort..." -ForegroundColor Green
$backendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host '--- RecallAI Backend ---' -ForegroundColor Cyan; $uvicornCmd app.main:app --app-dir backend --reload --port $backendPort" -PassThru

Write-Host "2. Launching Frontend on http://localhost:5173..." -ForegroundColor Green
$frontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; `$env:VITE_BACKEND_PORT='$backendPort'; Write-Host '--- RecallAI Frontend ---' -ForegroundColor Cyan; npm run dev" -PassThru

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  RecallAI is starting in separate windows!" -ForegroundColor Green
Write-Host "  - Frontend UI:  http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend API:  http://localhost:$backendPort" -ForegroundColor White
Write-Host "  - API Swagger:  http://localhost:$backendPort/docs" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
