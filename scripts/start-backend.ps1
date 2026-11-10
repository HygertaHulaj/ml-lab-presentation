# Starts PostgreSQL (Docker), applies migrations, and serves the API on http://localhost:8000 (docs: /docs)
docker compose up -d db
Push-Location backend
..\.venv\Scripts\alembic upgrade head
..\.venv\Scripts\uvicorn app.main:app --port 8000
Pop-Location
