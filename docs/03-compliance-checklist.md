# Compliance checklist — professor's official requirements

Source: `UdhëzimetPërDorëzimTëDetyrave.docx` (read in full) and `NdarjaETemave_HShDh_2026-27.docx` (Lecture 8 = DS4A Ch. 8 + Shah Ch. 8, 11 Nov).

| # | Requirement (from the instructions) | Deliverable | Status |
|---|---|---|---|
| 1 | DS4A presentation with ONLY the principal topics and concepts (20 min) | `Kapitulli8-HygertaHulaj.pptx` — 111 slides (one per step of the live presentation), speaker notes | ✅ Opened and rendered in PowerPoint and checked visually |
| 2 | Solve ALL "Applying the Concepts" tasks of the chapter (15 min); the professor may ask any one | `AC-DS4A-HygertaHulaj.docx` — all 8 activities, every sub-question; with a one-page answer summary | ✅ Values verified by automated tests |
| 3 | One HoIDS Try It Yourself per student (15 min) | `TiY-HoIDS-HygertaHulaj.docx` (TiY 8.1 on the OA 8.2 kangaroo data) | ✅ |
| 4 | One scientific paper, not older than 3 years (10 min) | `PunimiShkencor-HygertaHulaj.docx` — Kruschel et al., BISE 68(1), 2026; online 13 Feb 2025; DOI 10.1007/s12599-024-00922-2 | ✅ Verified via Crossref + arXiv |
| 5 | Send compressed, ≥ 24 h before the lecture | `docs/submission/HShDh_26-27_HygertaHulaj.zip` | ⏳ **Students must email it by Tue 10 Nov 2026** (before the lecture time) |
| 6 | Email subject `HShDh_26/27_EmriMbiemri1,EmriMbiemri2` | Subject: `HShDh_26/27_HygertaHulaj` | ⏳ students |
| 7 | File names EXACTLY as specified | the four names above | ✅ (see note C) |


**Note B — TiY 8.1 dataset.** The kangaroo nasal data (Shah OA 8.2) was obtained on 9 Nov 2026 and checked value by value
against the publisher's copy of the same data set (Brase, *Understandable Statistics*, "Gray Kangaroos"): 45 identical pairs.
The TiY document is solved on it (length = 27.893 + 2.7012 × width, R² = 0.777; gradient descent converges in 195 iterations).

**Note C — file names.** With one student the names are `Kapitulli8-HygertaHulaj.pptx`, `AC-DS4A-HygertaHulaj.docx`,
`TiY-HoIDS-HygertaHulaj.docx` and `PunimiShkencor-HygertaHulaj.docx` (folder `docs/submission`).

## Brief-level requirements (software)

| Requirement | Where |
|---|---|
| FastAPI + Swagger, versioned `/api/v1` | `backend/app/main.py`, http://localhost:8000/docs |
| PostgreSQL + SQLAlchemy 2 async + Alembic migration | `backend/alembic/versions/0001_initial.py` (applied to PostgreSQL 16 in Docker) |
| Vue 3 + TS + Vite + Tailwind + Pinia + Router + Axios + Plotly + Lucide | `frontend/` |
| Real training, no mocked metrics | `backend/app/services/training_engine.py` |
| Gradient descent from scratch, every iteration logged + step-by-step UI | `ml/gradient_descent.py`, `GradientDescentView.vue` |
| Real tree structure, rules, prediction paths | `ml/decision_tree.py`, `TreeDiagram.vue` |
| Confusion-matrix calculator, zero-denominator handling | `ml/metrics.py`, `EvaluationView.vue` |
| Over/underfitting lab with a fixed seed | `services/evaluation_service.py` |
| New-problem workflow: upload → inspect → train → evaluate → predict → export | `PlaygroundView.vue` |
| Practice mode with tolerance checking and session progress | `services/practice_service.py`, `PracticeView.vue` |
| Security: CSV-only, size/row/column limits, no path traversal, no pickles, configurable CORS | `services/dataset_service.py`, `core/config.py` |
| Docker Compose, `.env`, start scripts, README | repo root |
| Tests actually executed | backend 63 passed (pytest) · frontend 12 passed (Vitest) · vue-tsc clean · production build OK |
