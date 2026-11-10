# ML Learning Lab — Train, Predict, Explain & Explore

An explainable machine-learning laboratory for **Introduction to Data Science (2026/27), Lecture 8 — Machine Learning**
(DS4A Chapter 8 · Shah Chapter 8). Student: **Hygerta Hulaj**.

Every number the app shows comes from real model training (scikit-learn, or our own NumPy gradient descent) or from
counts the user enters. There are no prerecorded predictions or mocked metrics.

| | |
|---|---|
| Backend | Python 3.12 · FastAPI · Pydantic v2 · SQLAlchemy 2 (async) · Alembic · PostgreSQL · scikit-learn · NumPy · pandas |
| Frontend | Vue 3 · TypeScript · Vite · Tailwind CSS 4 · Pinia · Vue Router · Axios · Plotly.js · Three.js + TresJS · GSAP · Lucide |
| Tests | pytest (129 backend tests) · Vitest (124 frontend tests) · Playwright (111 end-to-end tests + 2 on-demand tools, run with one worker) · vue-tsc type-check |
| Infrastructure | Docker Compose (PostgreSQL, backend, frontend) · `.env` configuration · PowerShell start scripts |

## The lecture (start here)

**http://localhost:8080/presentation** (Docker) or http://localhost:5173/presentation (local): one presentation shell for the
whole of DS4A Chapter 8, about 80 minutes (planned), driven with → only. It opens with the film *The Scan That Changed
Everything*, follows the chapter in order with a worked regression example on real movies (Shah Problem 8.4) between §8.3
and §8.4, a short "Recent research" section after §8.5 (Kruschel et al. 2025, on the accuracy–interpretability trade-off),
and ends with a conclusion that answers the opening question. Activities and the 3D lessons open inside it (Esc
returns). For the lecture, every other page (classic lab, `/film`, movie workshop, Algorithm Lab appendix) is hidden, not
deleted: `/` opens the presentation; set `SHOW_EXTRA_PAGES = true` in `frontend/src/features.ts` to bring them back. Keys: → / ← steps · I index · F full screen · L light/dark · M mute · Esc back from an embed.

Handoff for the presenter: `docs/handoff/START_HERE.md` (startup, pre-class check, fallback), `PRESENTER_NOTES.md`,
`ABSTRACT.md`, `SOURCES_AND_ERRATA.md`, `STUDENT_EXPLORATION.md`.

## Quick start (Windows)

Prerequisites: Python 3.12, Node.js 20+, Docker Desktop (for PostgreSQL).

```powershell
.\scripts\setup.ps1            # venv + pip install, npm ci, PostgreSQL container, alembic upgrade head
.\scripts\start-backend.ps1    # API on http://localhost:8000  (Swagger: http://localhost:8000/docs)
.\scripts\start-frontend.ps1   # app on http://localhost:5173
```

### Option B — everything in Docker (no local Python or Node needed)

```powershell
.\scripts\start-docker.ps1     # builds and starts db + backend + frontend
.\scripts\stop-docker.ps1      # stops them (data is kept in Docker volumes)
```

| Container | Image | Port | Notes |
|---|---|---|---|
| `db` | postgres:16-alpine | 5432 | data in volume `pgdata`, health-checked before the backend starts |
| `backend` | `backend/Dockerfile` (python:3.12-slim) | 8000 | runs `alembic upgrade head`, then uvicorn; uploads and model cards in volume `storage` |
| `frontend` | `frontend/Dockerfile` (Vite build → nginx) | 8080 | single-page-app fallback; calls the API at `http://localhost:8000` (build arg `VITE_API_URL`) |

The app is at http://localhost:8080 and Swagger at http://localhost:8000/docs. The Docker backend and the local dev backend
(`start-backend.ps1`) both use port 8000, so run only one of them at a time. `docker compose down -v` also deletes the database and uploads.

Verified on this machine: all three containers start, the backend migrates a fresh database (6 tables), the frontend calls the
containerized API with CORS allowed for `localhost:8080`, training/prediction/upload work, and results persist in PostgreSQL.

**Offline classroom.** After setup, nothing needs the internet: the datasets are bundled, Plotly is bundled into the
frontend, and the UI uses system fonts. If Docker is unavailable on the classroom PC, `.\scripts\start-offline-sqlite.ps1`
runs the same API on a local SQLite file.

Run all tests: `.\scripts\test-all.ps1`

## Cinematic lessons (new): K-Means on Iris

Open **http://localhost:5173/lessons/kmeans-iris** (sidebar: *Cinematic: K-Means*). One deterministic K-Means trace from the backend
drives three modes that share one position on the timeline:

- **Story**: seven narrated scenes with camera choreography and synchronized subtitles. The flowers become points,
  the species are hidden, the centroids are initialized (with the actual K-Means++ probabilities), distances are worked
  step by step, the centroids move to their means, the inertia falls, and the species are revealed for comparison.
- **Explore**: orbit the scene, click any flower, and change K, the features, the initialization, the seed or the iteration limit.
  The server re-runs the algorithm (results are cached by configuration). You can save and compare experiments.
- **Math**: every formula with the real numbers from the trace substituted in, plus the corresponding Python.

Keyboard: `Space` play/pause · `←/→` previous/next step · `E` explore · `M` math · `R` restart scene · `F` full screen · `P` presenter.

| Layer | Files |
|---|---|
| Algorithm + trace (NumPy, validated against scikit-learn) | `backend/app/ml/kmeans.py` |
| API | `GET /api/v1/datasets/iris`, `POST /api/v1/simulations/kmeans`, `GET /api/v1/simulations/{id}`, `GET /api/v1/lessons/kmeans-iris`, `POST/GET /api/v1/progress`, `POST /api/v1/simulations/{id}/save`, `GET /api/v1/saved-experiments` |
| DB (migration 0002) | `lessons`, `simulations` (config hash → trace), `lesson_progress`, `saved_experiments` |
| Engine (algorithm-agnostic) | `frontend/src/engine/*` — timeline (GSAP playhead), camera, narration, scenes, formula stages, instanced point renderer, interaction |
| Lesson | `frontend/src/lessons/kmeans-iris/*` — timeline builder, pure `stateAt`/`mathAt`, TresJS scene, math and lab panels |

Architecture: `docs/04-cinematic-engine-architecture.md` · adding a lesson: `docs/05-adding-a-lesson.md` · project rules: `CLAUDE.md`.
Tests: `pytest` (129), `vitest` (124), `npx playwright test --workers=1` (111 + 2 on-demand tools, uses the installed Microsoft Edge).

## What is inside

```
backend/app/
  api/v1/routes.py        REST endpoints (thin: validation + delegation)
  schemas/api.py          Pydantic request/response contracts
  models/entities.py      ORM: Dataset, Exercise, Experiment, TrainingRun, Prediction
  services/               dataset (safe CSV upload), training (bounded worker pool, cache), engine, evaluation, practice, exercises
  ml/                     regression, classification, decision_tree (real node extraction), gradient_descent (NumPy, from scratch), metrics, preprocessing
  explainability/         formula, training and decision-tree explainers built from recorded values
  exercises/ds4a, hoids/  the textbook exercises with computed solutions
  datasets_registry.py    dataset provenance
backend/datasets/         ds4a/ (official DS4A Ch. 8 files), raw/rock.csv
backend/alembic/          migrations
frontend/src/views/       Dashboard, Learn, Exercises, Training, GradientDescent, DecisionTree, Evaluation, Playground, Practice
docs/submission/          the submission files (Word and PowerPoint), named as the professor requires
docs/                     requirements analysis, presenter guide, compliance checklist
```

## API (all under `/api/v1`, documented at `/docs`)

| Area | Endpoints |
|---|---|
| Exercises | `GET /exercises`, `GET /exercises/{id}`, `POST /exercises/{id}/solve`, `GET /exercises/{id}/explanation`, `GET /exercises/{id}/similar` |
| Datasets | `GET /datasets`, `POST /datasets/upload`, `GET /datasets/{id}`, `GET /datasets/{id}/preview`, `GET /datasets/{id}/columns` |
| Training | `POST /training/start` (`?wait=true` for synchronous), `GET /training/{run}/status`, `/history`, `/metrics`, `GET /training/{run}`, WebSocket `/training/{run}/ws` |
| Predictions | `POST /predictions` |
| Evaluation | `POST /evaluation/confusion-matrix`, `POST /evaluation/complexity`, `GET /evaluation/{run}` |
| Explanations | `GET /explanations/{run}`, `/steps` (`?iteration_index=k` for one gradient-descent iteration), `/decision-rules` |
| Experiments | `GET /experiments`, `POST /experiments`, `GET /experiments/{id}` |
| Practice | `GET /practice/categories`, `GET /practice/{category}/new`, `POST /practice/check` |

Errors always use `{"error": {"code", "message", "details"}}` with the correct HTTP status.

## Design decisions

- **ML is separate from the HTTP layer.** `ml/` and `exercises/` are pure Python and can be tested without the server.
- **Training runs in a bounded thread pool** (2 workers, 120 s timeout), so the event loop never blocks. Clients poll
  `/status` or use the WebSocket. Sizes and progress values come only from what the server actually measures.
- **No pickles.** Fitted models live in an in-memory LRU cache. After a restart they are re-trained deterministically
  from the stored configuration and seed. A JSON model card is written to `storage/models/` for record keeping.
- **No data leakage.** Imputation, scaling and one-hot encoding sit inside sklearn Pipelines fitted on the training split only (tested).
- **Upload safety.** `.csv` only, 5 MB, 100 000 rows, 100 columns; parsed as data by pandas; stored under a
  server-generated name; storage keys are validated against a strict pattern (no path traversal); local paths are never returned.
- **Honest explanations.** Gradient-descent steps are the logged iterations. Tree rules are read from `tree_.*`.
  Where scikit-learn hides intermediate steps (L-BFGS for logistic regression), the app says so instead of inventing them.

## Datasets and provenance

| Dataset | Source | Used for |
|---|---|---|
| carseats, carseats_train (319), carseats_test (81), college (777), penguins (333) | Official DS4A data repository, github.com/datasci4all/Datasets (`Ch_8_Data`, MIT licence) | DS4A Activities 3, 6, 7; labs |
| Shah Table 8.2 (`regression.csv`) | The book's OA 8.1 file (identical to the HoIDS p. 217 table, checked in a test) | Shah Examples 8.1, 8.2 |
| rock (48) | R `datasets::rock` (BP Research / R. Katz) via Rdatasets | Shah Hands-On Problem 8.3 |
| restaurant_ratings (15) | The book's OA 8.3 `ratings.tsv` (food, ambience, service, overall rating) | Shah Hands-On Problem 8.1 |
| diabetes, breast_cancer, iris | bundled with scikit-learn | **Supplementary** examples (labelled in the UI) |
| kangaroo nasal data (Shah OA 8.2) | **Not bundled** — not obtainable from a verifiable public source | Shah TiY 8.1 runs after the user uploads the file |

## Known limitations

- Shah TiY 8.1 needs the OA 8.2 kangaroo CSV from the book's Cambridge resources. Upload it in *Solve a New Problem*.
- The book's figures were produced in R (`rpart`/tidymodels). scikit-learn thresholds are midpoints (e.g. 206.5 where R prints 207),
  and R's default stopping rules (`minsplit = 20`, `cp = 0.01`) make its deep trees smaller. The split variables and counts reproduce.
- Fitted models are re-trained after a server restart (deterministic, same results). This is a deliberate trade-off to avoid pickles.
- No user accounts (not needed for the classroom MVP).

## Cinematic introduction: "The Scan That Changed Everything"
Open `http://localhost:5173/film`. It is a 2:52 animated story (3D, captions, procedural score) that ends inside the ML Lab with the real Iris data and the K-Means lesson.
The production bible, storyboard, camera plan, character workflow, audio spec and run/render instructions are in [`docs/06-the-scan/`](docs/06-the-scan/README.md).
Rendered MP4: `cd video/remotion && npm install && npm run render`.

