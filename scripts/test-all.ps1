# Runs every automated test. Backend tests use SQLite; Playwright starts (or reuses) the servers on :8000 and :5173.
Push-Location backend; ..\.venv\Scripts\python -m pytest -q; Pop-Location
Push-Location frontend; npx vitest run; npx vue-tsc --noEmit; npx playwright test; Pop-Location
