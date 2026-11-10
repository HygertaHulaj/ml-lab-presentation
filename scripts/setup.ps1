# One-time setup (Windows PowerShell). Run from the project root:  .\scripts\setup.ps1
$ErrorActionPreference = "Stop"
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\pip install -r backend\requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Push-Location frontend; npm ci; Pop-Location
docker compose up -d db
Start-Sleep -Seconds 5
Push-Location backend; ..\.venv\Scripts\alembic upgrade head; Pop-Location
Write-Host "Setup complete. Start with .\scripts\start-backend.ps1 and .\scripts\start-frontend.ps1"
