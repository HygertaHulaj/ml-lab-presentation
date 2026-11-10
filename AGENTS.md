# ML Lab — project instructions

Educational machine-learning laboratory for *Introduction to Data Science* (Lecture 8). It has two layers:
1. **Classic lab** (Exercise Academy, Training Studio, evaluation tools) — DS4A Ch. 8 / Shah Ch. 8. Never delete these features.
   Since 9 Nov 2026 they are HIDDEN (not deleted) by `frontend/src/features.ts` (`SHOW_EXTRA_PAGES = false`), together with `/film`,
   `/workshops/movies` and the presentation's "Algorithm Lab" appendix: the app serves only `/presentation`, `/activities` and
   `/lessons/:id`, and `/` opens the presentation. Set the flag to `true` to bring them all back; their tests skip while hidden.
2. **Cinematic Algorithm Experience Engine** — lessons played as Story / Lab / Math over one shared, deterministic algorithm trace.
   The first lesson is K-Means on Iris; the Shah Ch. 8 Hands-On Problems 8.1–8.4 are regression / gradient-descent lessons (8.1 on the book's OA 8.3 ratings.tsv)
   (`backend/app/ml/linreg_gd.py` trace, `app/lessons/shah_ch8.py` manifests, `frontend/src/lessons/linreg-gd/`).
3. **Cinematic introduction film** "The Scan That Changed Everything" (`/film`) — a Three.js world that is a pure function of film time,
   rendered live in Vue (FilmView) and frame-accurately in Remotion (`video/remotion`). Ends on the K-Means lab. Bible: `docs/06-the-scan/`.
4. **V2 presentation** (`/presentation/*`) — ONE shell, sections in DS4A Chapter 8 order, opening with the finished MP4 (never re-render it
   without a demonstrated need). Plan/status: `docs/{PROJECT_AUDIT, REORGANIZATION_PLAN, PRESENTATION_FLOW, SECTION_8_2_CONTENT_MAP,
   ANIMATION_SPECIFICATIONS, IMPLEMENTATION_PROGRESS}.md`. Authoritative source: DS4A Ch. 8 (book page = PDF page − 25); §8.2 = pp. 365–368, §8.3 = pp. 368–379, §8.4 = pp. 380–388, §8.5 = pp. 389–392, §8.6 = pp. 392–393, Ethics in Practice = pp. 394–395 (content maps: `docs/SECTION_8_*_CONTENT_MAP.md`).

## Stack (do not replace)
Backend: Python 3.12 · FastAPI · Pydantic v2 · SQLAlchemy 2 (async) · Alembic · PostgreSQL · NumPy · pandas · scikit-learn
Frontend: Vue 3 · TypeScript (strict) · Vite · Pinia · Vue Router · Tailwind 4 · Three.js + TresJS · GSAP · Plotly (classic pages)
Tests: pytest · Vitest · Playwright (uses the installed Microsoft Edge, `channel: 'msedge'`)

## Layout and boundaries
```
backend/app/ml/            pure algorithms (no FastAPI imports). kmeans.py records a full execution trace.
backend/app/lessons/       lesson manifests (scenes, narration, math) — data, not code paths
backend/app/services/      application services (DB, caching, orchestration)
backend/app/api/v1/        thin routes; lessons.py MUST be registered before routes.py (GET /datasets/iris vs /datasets/{id})
frontend/src/engine/       algorithm-agnostic engine: timeline, camera, narration, transitions, formulas, interaction
frontend/src/lessons/<id>/ lesson-specific: trace → steps → visual state (pure functions) + scene components
frontend/src/views/        pages; LessonView dispatches lessons (K-Means, or shah-* → lessons/linreg-gd/GdLesson); FilmView plays the film
frontend/src/components/lesson/CinematicLessonShell.vue  the shared lesson shell (modes, subtitles, scrubber, keys); slots #scene #math #lab #hud
frontend/src/experiences/cinematic/  the film: story.ts (typed shared data), world/ (framework-agnostic Three.js), audio/, components/
shared/story/              storyboard.json · narration.json · visual-tokens.json · iris.json — single source of truth for Vue AND Remotion
video/remotion/            React/Remotion workspace (only place React is allowed); imports frontend/src/experiences/cinematic/world
frontend/src/presentation/ V2: sections.ts (registry = order/routes/steps/status), store.ts, shell/, media/, sections/NN-name/, api.ts
frontend/src/activities/   cinematic end-of-chapter activities (/activities): player (Story/Try/Solution), registry, ds4a/ visuals; data = Exercise Academy solvers
frontend/src/visualizations/ shared concept visuals (ParticleField…) — sections never import each other
backend/app/ml/concepts.py + api/v1/concepts.py   real computations behind presentation concept demos
```
Rules:
- The **backend computes**, the **frontend renders**. The frontend never runs K-Means itself and never invents values.
- Visual state is a **pure function of timeline position** (`stateAt(steps, t)`). GSAP only drives the position (and the camera in Story mode),
  so seeking, reversing and changing speed can never desynchronise the picture from the algorithm.
- Algorithm-specific code stays in `frontend/src/lessons/<id>/` and `backend/app/ml/<algo>.py`.

## Mathematical accuracy
- Every number shown (distances, means, inertia, K-Means++ probabilities) comes from the trace returned by `POST /api/v1/simulations/kmeans`.
- The NumPy engine is validated against `sklearn.cluster.KMeans(init=<same initial centroids>, n_init=1, algorithm="lloyd")` in tests.
- K-Means is unsupervised: species labels are returned only as `comparison_labels` and must not be used before the results scene.
- Clusters ≠ species. Never imply the data has perfectly separated groups, or that convergence means a global optimum.

## Conventions
- Python: type hints, dataclasses for domain objects, Pydantic for I/O, structured errors `{"error": {code, message, details}}`.
- Vue: `<script setup lang="ts">`, composables in `engine/`, no `any` in engine code. Dispose Three.js geometries and materials, and kill
  GSAP timelines in `onBeforeUnmount`.
- Presentation colours come only from theme tokens (`presentation/theme.ts`: Warm Lab default, Lecture Hall Light on key L, per-act `--c-accent`);
  no colour literals in presentation/visualization components. Rules: `docs/ANIMATION_SPECIFICATIONS.md` › Theme and colour.
- Reading sizes: essential presentation text uses `max(<size>, var(--up-<size>))` (22 px at 1920 wide, unchanged at 1366);
  secondary text (kickers, `.src` citations, ticks) may stay small. Guard: `e2e/projection.spec.ts`. Semantic colours:
  `--c-obs/--c-pred/--c-ref/--c-err` (`SEMANTIC` in `presentation/theme.ts`). The 3D stage is a dark inset in both themes.
- Embeds: practice opens inside the presentation via the registry's `embeds` and `ShellApi.openEmbed` (EmbedLayer);
  standalone routes stay. Shared keys: →/← steps · 1/2/3 modes · L theme · F full screen · Esc back from an embed.
- Accessibility: keyboard shortcuts (SPACE, ←/→, F, E, R, M, L), subtitles always on, `prefers-reduced-motion` → no camera flights or particles,
  WCAG AA contrast in both presentation themes.
- Performance: instanced meshes for points, lazy-loaded lesson route, a single render loop, simulations cached by config hash.

## Testing / definition of done
`backend: ..\.venv\Scripts\python -m pytest -q` · `frontend: npx vitest run && npx vue-tsc --noEmit && npx playwright test`
A feature is done only when its unit tests pass, it has been exercised in a real browser, and nothing in the classic lab regressed
(while it is hidden, its tests skip; run them with `SHOW_EXTRA_PAGES = true` before showing it again).
Recent research (beyond the book): `presentation/sections/09a-research/` (Kruschel et al. 2025, published values quoted and cited, not computed).

## Skills and agents
Project skills: `.Codex/skills/{cinematic-animation, algorithm-visualization, ml-math-explainer, fastapi-ml-engine, presentation-experience, cinematic-storytelling, threejs-scene-direction, medical-ai-visualization, narrative-quality-assurance, presentation-storytelling, ml-concept-visualization, animation-quality, educational-content-review}`.
Agents: `.Codex/agents/` (architecture, frontend-experience, cinematic-animation, machine-learning, qa-browser).
No secrets in the repo; `.env` is git-ignored.
