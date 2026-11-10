# Adding a new cinematic lesson (e.g. k-NN, PCA, Gradient Descent)

The engine in `frontend/src/engine/` knows nothing about K-Means. A lesson supplies five pieces:

| # | Piece | Where | K-Means example |
|---|---|---|---|
| 1 | **Algorithm with a trace** — pure NumPy, deterministic (`np.random.default_rng(seed)`), each phase recorded | `backend/app/ml/<algo>.py` | `kmeans.py` → `KMeansTrace` |
| 2 | **Manifest** — objectives, dataset, default config, scenes + narration templates, math, controls, exercises, assessment | `backend/app/lessons/<id>.py`, registered in `simulation_service.LESSONS` | `kmeans_iris.py` |
| 3 | **Simulation endpoint** — Pydantic request, cached by config hash | `api/v1/lessons.py` + `services/simulation_service.py` | `POST /simulations/kmeans` |
| 4 | **Timeline builder** — trace → steps, scenes, narration cues, camera keys, markers. No maths. | `frontend/src/lessons/<id>/timeline.ts` | `buildTimeline` |
| 5 | **Pure state + scene** — `stateAt(tl, trace, t)`, `mathAt(...)`, a Tres scene that writes state into Three.js objects, and a math panel | `frontend/src/lessons/<id>/{state.ts, Scene.vue, MathPanel.vue}` | `KMeansScene.vue` |

Reused as-is: `LessonTimelineController` (playhead), `CinematicCameraController`, `NarrationSynchronizer`, `SceneTransitionManager`,
`FormulaAnimationController`, `DataPointRenderer`, `InteractionController` (shortcuts, reduced motion, full screen), `LessonView` layout.

## Rules (from CLAUDE.md and the project skills)
1. The backend computes; the frontend never invents values. If a visual needs a number, add it to the trace.
2. `stateAt` must be pure: the same `t` always gives the same picture (tests compare forward and backward seeking).
3. Keep assignment-type and update-type phases as separate steps so the learner can see each one.
4. Ship tests: backend (vs scikit-learn or hand-computed references), Vitest (state equals the trace at step ends),
   Playwright (a value shown in the UI equals the API response).

## Checklist
- [ ] `pytest` — the algorithm matches its reference implementation
- [ ] `vitest` — `stateAt` and `mathAt` reproduce trace values at step boundaries
- [ ] `playwright` — the lesson loads, plays, seeks, switches mode and shows API values
- [ ] Reduced motion, keyboard navigation and the mobile viewport checked

## Second lesson family: regression and gradient descent (Shah Ch. 8)
- **Backend:**
  - `ml/linreg_gd.py` builds the trace: frames of θ, J and the gradient on a log-spaced schedule, the line or plane to display (other predictors held at their means), the least-squares reference, and for one predictor the cost surface J(θ₀, θ₁).
  - The route is `POST /simulations/linreg-gd`, cached by config.
  - `lessons/shah_ch8.py` holds the manifests. Each lesson has *parts* of kind `plane` or `line`, with narration templates.
- **Frontend:**
  - `lessons/linreg-gd/`: `timeline.ts` (manifest + traces → steps, cues, camera), `state.ts` (pure `stateAt`), `GdScene.vue`, `GdMathPanel.vue`, `GdLabPanel.vue` and `GdLesson.vue`.
  - Store: `stores/linregLesson.ts`.
  - Both families play in `components/lesson/CinematicLessonShell.vue`. A new family needs a store with the `ShellStore` shape (`components/lesson/shell.ts`) and its own scene, math and lab components.

