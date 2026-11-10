# Project audit — ML Learning Lab (5 Nov 2026, before V2)

Checkpoint before any restructuring: `../checkpoints/ml-learning-lab-2026-11-05-before-v2.tar.gz` (327 files of source and docs; no `node_modules`, `.venv` or MP4). The folder is not a git repository.

## 1. Inventory

Legend: **Keep** (use as is) · **Refactor** (reuse with changes) · **Merge** (fold into a presentation section) · **Archive** (keep, hide from the main flow) · **Remove**.

| Existing feature | Location | What it does today | Quality / completeness | Recommendation | Reason | Target in the new architecture |
|---|---|---|---|---|---|---|
| Cinematic film (interactive Three.js) | `frontend/src/views/FilmView.vue`, `frontend/src/experiences/cinematic/**` | 2:52 story, live 3D world, captions, procedural score, hub to the labs | Complete, tested (18 key frames, 3 e2e) | **Keep** | Works; it is the "interactive version" of the opening | `/film` stays; linked from the intro as "Interactive version" |
| Rendered film MP4 + subtitles | `frontend/public/film/*.mp4|.vtt|.srt` | The finished opening video (1920×1080, 30 fps, 172 s) | Complete; 693 MB (film grain) | **Keep, do not re-render** | Brief: the video is finished | Played by `CinematicVideoPlayer` in `/presentation/intro` |
| Remotion workspace | `video/remotion/` | Renders the same FilmWorld frame by frame | Working | **Keep** | Future pre-rendered sequences | unchanged |
| Shared story data | `shared/story/*.json` | Single source of film timing and narration, tokens, Iris | Complete, validated | **Keep** | Design tokens are reused by the presentation | `presentation/shell/tokens.ts` reads `visual-tokens.json` |
| K-Means cinematic lesson | `views/LessonView.vue`, `lessons/kmeans-iris/*`, `engine/*`, `stores/lesson.ts` | Story/Explore/Math over a real FastAPI trace; play, step, scrub, change K | Complete, 6 e2e tests | **Keep → Merge** | It is the clustering algorithm simulation the brief asks for | Opened from `/presentation/lab`; later embedded as a lab module |
| Lesson engine | `frontend/src/engine/*` | Timeline (GSAP playhead), camera, narration, transitions, shortcuts | Good, algorithm-agnostic | **Keep** | `LessonTimelineController` and shortcut and reduced-motion composables are reused by the shell | used by `presentation/` |
| Learn ML concept cards | `views/LearnView.vue` | 10 text definitions with source references (DS4A §8.1–8.6, Shah §8.2) | Accurate, but static text | **Refactor → Merge** | Its wording is the right source material, but the brief bans static paragraphs | Definitions move into the AI, ML and 8.2 sections as progressive reveals; the page stays in the classic lab |
| Exercise Academy | `views/ExercisesView.vue`, `ExerciseDetailView.vue`, `backend/app/exercises/**` | DS4A Applying-the-Concepts and Shah exercises, solved by the backend | Complete, tested | **Keep (classic lab)** | Graded coursework, outside the talk | linked from Summary |
| Training Studio | `views/TrainingView.vue`, `components/ml/*`, `services/training_*` | Train regression, logistic regression or trees on datasets; metrics | Complete | **Keep (classic lab)** | Real computations for the regression and classification paths | linked from Lab |
| Gradient Descent lab | `views/GradientDescentView.vue`, `ml/gradient_descent.py` | Shah Ex 8.2 / TiY 8.1, every iteration logged | Complete | **Keep (classic lab)** | Regression path | linked from Lab |
| Decision Tree Explorer | `views/DecisionTreeView.vue`, `ml/decision_tree.py` | Fit trees, rules, prediction paths | Complete | **Keep → future Merge** | DS4A §8.3's central model | §8.3 module (out of scope now) |
| Evaluation Lab | `views/EvaluationView.vue`, `services/evaluation_service.py` | Confusion matrix and complexity/overfitting | Complete | **Keep → future Merge** | DS4A §8.4 | Model evaluation section (later phase) |
| Playground and Practice | `views/PlaygroundView.vue`, `PracticeView.vue` | Upload a dataset; generated practice questions | Complete | **Archive (classic lab)** | Useful for students, not for the talk | classic lab only |
| Dashboard and sidebar shell | `views/DashboardView.vue`, `components/layout/*`, `App.vue` | Light-theme classic layout with a large sidebar | Works; visually a dashboard | **Keep for the classic lab; not used in the presentation** | Brief bans dashboard layouts in the presentation | the presentation uses `meta.immersive` |
| Backend API (36 endpoints) | `backend/app/api/v1/*` | datasets, exercises, training, evaluation, explanations, practice, lessons, simulations, progress | Complete, 83 pytest tests | **Keep** | The backend-computes rule | new concept endpoints are added next to them |
| Backend ML modules | `backend/app/ml/*` | regression, classification, trees, gradient descent, K-Means trace, metrics | Validated against scikit-learn | **Keep** | — | `ml/concepts.py` added for presentation demos |
| Alembic migrations | `backend/alembic/versions/0001, 0002` | DB schema | OK; the Docker image was stale (fixed 5 Nov by rebuilding) | **Keep** | — | — |
| Docker | `docker-compose.yml`, Dockerfiles | db + backend + frontend | Fixed 5 Nov (frontend context = repo root) | **Keep** | — | — |
| Tests | `backend/tests` (83), `frontend/tests` (50), `frontend/e2e` (10) | — | All green on 5 Nov | **Keep, extend** | — | `e2e/presentation.spec.ts` added |
| Docs | `docs/01–05`, `docs/06-the-scan/` | Requirements and inventory, presenter guide, compliance, engine, film bible | Good | **Keep** | — | this audit adds `docs/*.md` for V2 |
| Project skills | `.claude/skills/*` (9) | Animation, algorithm-viz, math, FastAPI, presentation, film storytelling, Three.js, medical-AI, QA | Good | **Keep, extend** | — | 4 V2 skills added |

## 2. Duplication and inconsistencies found
1. **Two design languages.** The classic lab is a light dashboard; the film and lessons are dark and cinematic. The presentation adopts the dark tokens from `visual-tokens.json`, and the classic lab stays as it is.
2. **Two cinematic surfaces for the same story.** `/film` (live 3D) and the MP4. Resolved: the presentation intro plays the MP4; `/film` is the interactive alternative. There is no second copy of the story.
3. **Two camera controllers.** `engine/CinematicCameraController` (keyframe lerp, lessons) and `experiences/cinematic/world/CameraDirector` (splines and slerp, film). Both work, so I kept both; new 3D presentation scenes should use `CameraDirector`.
4. **Two reduced-motion detections** (`usePrefersReducedMotion` and the film's own override). The presentation store owns one setting, initialised from the OS preference.
5. **Concept definitions** live as hard-coded text in `LearnView.vue`. The presentation keeps its own structured copy in `presentation/content/` with page references, and both cite DS4A.
6. **Hub inside the film** (`FilmView` "Inside Machine Learning") overlaps with the presentation's Lab section. It stays for `/film`; the presentation does not use it.

## 3. Broken or unfinished
- No broken features found in the tests (all 143 pass).
- The MP4 is large (693 MB). It plays locally, but it is heavy for Docker. A grain-free re-encode would make it much smaller, without re-rendering.
- The film's book mismatch is intentional: DS4A p. 363 says RadiologyML "learns from their corrections"; the film shows corrections going through review, retraining and validation. The presentation's 8.2 module quotes the book and explains the responsible version.
- k-NN does not exist in the backend yet. It is needed for the Lab's classification simulation (a later phase).

## 4. Unused code and assets
- `frontend/dist/` is an old build output (ignored).
- `video/remotion/out/master.mp4` (2.2 GB) is the uncompressed render master; it can be deleted.
- No dead source modules were found; every view is routed.

## 5. Textbook source (verified)
The course chapter is **DS4A (Data Science for All), Chapter 8 "Machine Learning", book pp. 362–404**. Its introduction is the Noé, Dr. Salizar and RadiologyML story.
**Section 8.2 is "Three Steps in the Machine Learning Process", book pp. 365–368.** See `SECTION_8_2_CONTENT_MAP.md`.
(Shah's HoIDS §8.2 "What Is Machine Learning?" is a secondary source, already used by the classic lab.)
