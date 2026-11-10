# Runs the whole app in Docker: PostgreSQL + FastAPI backend + Vue frontend (served by nginx).
#   App:     http://localhost:8080
#   API:     http://localhost:8000   (Swagger: http://localhost:8000/docs)
# The backend container applies Alembic migrations automatically on start.
# Stop any local dev servers first (ports 8000/5173), they conflict with the backend container on 8000.
docker compose up -d --build
Write-Host "Waiting for the API..."
for ($i = 0; $i -lt 60; $i++) {
  try { if ((Invoke-RestMethod http://localhost:8000/api/health).status -eq "ok") { break } } catch {}
  Start-Sleep -Seconds 2
}
docker compose ps
Write-Host "Open http://localhost:8080"
