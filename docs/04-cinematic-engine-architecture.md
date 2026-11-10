# Cinematic Algorithm Experience Engine — architecture and plan

## 1. Audit of the existing project (Nov 2026)
| Area | Reused as-is | Gap addressed in this phase |
|---|---|---|
| Backend layering (`ml` → `services` → `api`), error contract, Pydantic, async SQLAlchemy, Alembic | ✅ | New `lessons`, `simulations`, `progress`, `saved_experiments` tables (migration 0002) |
| Datasets registry (Iris bundled with scikit-learn) | ✅ the loader | `GET /datasets/iris` must be matched before `GET /datasets/{id}` → `lessons` router registered first |
| ML engines (regression, trees, GD, metrics) | ✅ unchanged | New transparent `ml/kmeans.py` with a full execution trace |
| Vue 3 + Pinia + Router + Tailwind + Axios | ✅ | No 3D/animation stack, no shared playhead → new `engine/`, `lessons/kmeans-iris/`, `LessonView` |
| Visuals: Plotly charts, each computed independently | kept for the classic pages | Lessons need one deterministic timeline shared by Story / Lab / Math |
| Tests: pytest (63), Vitest (12) | ✅ | Add K-Means trace tests vs scikit-learn, engine unit tests, Playwright e2e |

Note: `https://data-science-kappa-three.vercel.app/` is a different project (DataLab, an SQL course for DS4A Ch. 5 / Shah Ch. 7); it is not
this repository.

## 2. Data flow
```
Iris (sklearn) ─► ml/kmeans.py (NumPy, records every phase) ─► services/simulation_service (validate, hash, cache, persist)
              ─► POST /api/v1/simulations/kmeans ─► trace JSON
trace ─► lessons/kmeans-iris/steps.ts  (trace → flat list of timed steps; no maths here)
      ─► lessons/kmeans-iris/state.ts  (stateAt(steps, t): pure → point positions/colours, centroids, lines, math values)
      ─► engine/LessonTimelineController (GSAP tween of the playhead only: play/pause/seek/speed/reverse)
      ─► TresJS scene renders state; CinematicCameraController.poseAt(t) in Story mode, OrbitControls in Lab mode
      ─► NarrationSynchronizer.cueAt(t) → subtitles; FormulaAnimationController → math panel highlights
```
Because every frame is computed from `t`, scrubbing, reverse play, speed changes and Story↔Lab switches can never drift from the algorithm.

## 3. Engine components (frontend/src/engine)
| Component | Responsibility |
|---|---|
| `LessonTimelineController` | owns the playhead `t`; GSAP tween 0→duration; play, pause, seek, rate, next/prev step boundary, restart scene |
| `SimulationStateManager` (Pinia `useLessonStore`) | lesson manifest, config, trace, steps, mode (story/lab/math), presenter flag, selected point |
| `AlgorithmTracePlayer` | composes trace → steps → state for the current `t`; algorithm-agnostic via a `LessonDefinition` interface |
| `CinematicCameraController` | camera keyframes → `poseAt(t)` (pure, eased); hands over to OrbitControls in Lab |
| `SceneTransitionManager` | scene list (id, title, start, end) from the steps; scene at `t`; fade amount at scene boundaries |
| `NarrationSynchronizer` | cue at `t`, word index for karaoke-style highlighting, optional Web Speech voice |
| `FormulaAnimationController` | which formula term is active for the current step progress |
| `DataPointRenderer` | one `InstancedMesh` for all points; colours/positions written into instance buffers each frame |
| `InteractionController` | keyboard shortcuts, pointer picking, reduced-motion detection, full screen |

## 4. Lesson manifest
`GET /api/v1/lessons/kmeans-iris` returns objectives, dataset, default config, scenes (with narration templates), math blocks,
controls, exercises and assessment questions. A new lesson = a new manifest + `ml/<algo>.py` + `lessons/<id>/{steps,state}.ts`.

## 5. Phases and status
| Phase | Scope | Status |
|---|---|---|
| 1 | Audit, architecture, CLAUDE.md, skills, agents | done |
| 2 | K-Means trace engine, API, DB, tests | this milestone |
| 3–4 | Interactive visualization, timeline + camera engine | this milestone |
| 5 | Seven scenes | scene 1 polished; scenes 2–7 functional (narration, real values, camera) in this milestone, polish later |
| 6 | Story / Lab / Math transitions | this milestone |
| 7 | Presenter mode, narration voice, accessibility, responsive | shortcuts + full screen + subtitles + reduced motion now; voice and mobile polish later |
| 8 | Performance, more tests, docs | later |
