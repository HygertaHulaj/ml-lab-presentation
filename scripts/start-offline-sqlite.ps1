# Fallback for a classroom PC without Docker: runs the API on a local SQLite file instead of PostgreSQL.
$env:MLLAB_DATABASE_URL = "sqlite+aiosqlite:///./mllab_offline.db"
$env:MLLAB_AUTO_CREATE_TABLES = "true"
Push-Location backend
..\.venv\Scripts\uvicorn app.main:app --port 8000
Pop-Location
