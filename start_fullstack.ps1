# Full Stack Startup Script for TransactAI
# This script starts both the backend (FastAPI) and frontend (Next.js)

Write-Host "🚀 Starting TransactAI Full Stack Application..." -ForegroundColor Green
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating default .env file..." -ForegroundColor Yellow
    @"
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=TransactAI
DB_USER=postgres
DB_PASS=admin

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
"@ | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "✅ Created .env file with default values" -ForegroundColor Green
    Write-Host "   Please update .env with your database credentials if needed" -ForegroundColor Yellow
    Write-Host ""
}

# Initialize database if needed
Write-Host "📦 Initializing database..." -ForegroundColor Cyan
python init_database.py
Write-Host ""

# Start Backend in background (Enabling SKIP_ML_LOAD for faster local startup)
Write-Host "🔧 Starting Backend (FastAPI) on http://localhost:8000 (ML Bypass: Enabled)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    $env:PYTHONPATH = $using:PWD
    $env:SKIP_ML_LOAD = "true"
    Set-Location $using:PWD
    uvicorn api.main:app --reload --port 8000
}

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "🎨 Starting Frontend (Next.js) on http://localhost:3000..." -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================================" -ForegroundColor Gray
Write-Host "Backend: http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Change to frontend directory and start Next.js
Set-Location frontend
npm run dev

# Cleanup on exit
Write-Host ""
Write-Host "🛑 Stopping servers..." -ForegroundColor Yellow
Stop-Job $backendJob
Remove-Job $backendJob
Set-Location ..

