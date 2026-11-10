# Implementation progress — V2 presentation

Updated 6 Nov 2026 (phases 6–7, Section 8.3, layout guard).

| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0 Audit | repository, film, backend, tests, textbook | ✅ done | `PROJECT_AUDIT.md`; checkpoint `../checkpoints/ml-learning-lab-2026-11-05-before-v2.tar.gz` |
| 1 Reorganization | `presentation/` + `visualizations/` beside the working lab; registry-driven routes `/presentation/*` | ✅ done (additive; no working feature moved or removed) | `REORGANIZATION_PLAN.md` |
| 2 Shell | one global shell: steps, ← → Space PageUp/Down Home, progress, index (I), full screen (F), mute (M) and volume, reduced motion, auto-hiding chrome, `?step=` deep links, localStorage persistence | ✅ done | `e2e/presentation.spec.ts` › shell; `tests/presentation.spec.ts` |
| 3 Video intro | the finished MP4 (not re-rendered), poster, play/pause, scrub, volume, replay, skip, fallback to `/film`, last frame → particles → AI | ✅ done | e2e › intro (the video plays, `ended` triggers the hand-off, the AI section starts) |
| 4 Artificial intelligence | question → 4 animated tasks → definition → AI ⊃ ML ⊃ DL with camera focus and click-to-focus → rules vs learned (real backend stump search, train/test) → DS4A "Identify AI" | ✅ done | e2e › AI section asserts that the backend numbers are on screen; key frames in `docs/presentation-keyframes/` |
| 5 Machine learning | the idea → traditional programming → training → inference → side by side → training vs. inference; play, pause, replay and scrub on every pipeline; → completes a running animation first | ✅ done | e2e › machine learning asserts the backend's accuracies and learned threshold, that scrubbing is reversible (mid = searching, end = model), and that both lanes are synchronised; key frames 13–21 |
| 6 How ML works | one dataset through collect → prepare → features → split → train → predict → evaluate in a single continuous scene; every state from `GET /api/v1/concepts/learning-journey` (`ml/journey.py`, validated against scikit-learn); play, pause, previous and next stage, reset, speed, scrub, inspect a flower (decision path), explanation toggle | ✅ done | `e2e/journey.spec.ts` checks every on-screen number against the API (clean count, test-set size, tree thresholds, every confusion-matrix cell, test accuracy) and that scrubbing is reversible; `tests/journey.spec.ts`; key frames 22–30 |
| 7 Section 8.2 | 12 steps covering every heading of DS4A §8.2 in source order; real data where the book allows (Iris + backend K-Means groups; gradient descent fit and predictions from `GET /concepts/analyze-and-produce`); both Try It Yourself exercises; analogy and case study clearly labelled illustrative | ✅ done | `e2e/section82.spec.ts` (quiz scores, gradient-descent final model = least squares, every prediction equals the API, summary iteration count from the API); `tests/section82.spec.ts`; key frames 31–44 |
| 7b Section 8.3 | 14 modules for DS4A §8.3 in source order; real decision trees on the book's car seat and penguin data reproduce every number the text states (164 / 236, 66 of 85, 10.21 k, 206.5 mm, 283 / 307 / 317); live max depth / min n with the official 319 / 81 split; 4 Try It Yourself exercises with computed answers | ✅ done | `SECTION_8_3_CONTENT_MAP.md`; `e2e/section83.spec.ts`; `backend/tests/test_characteristics.py`; key frames 45–58 |
| 7c Section 8.4 | 14 modules for DS4A §8.4 in source order. Table 8.3 is recomputed on the official split, depth-5 tree, and matches exactly; metrics, MSE and R², No Free Lunch (three problems, three winners), Fig. 8.17 rebuilt on seeded synthetic data, the real depth sweep, and the p. 388 exercise with computed accuracies. Accent: rose | ✅ done | `SECTION_8_4_CONTENT_MAP.md`; `backend/tests/test_evaluation.py` (8); `e2e/section84.spec.ts` (every number equals the API); `tests/section84.spec.ts`; key frames 80–93 |
| 7d Section 8.5 | 12 modules for DS4A §8.5 plus one labelled extension. A real neural network (64 → 32 → 16 → 10) on scikit-learn's handwritten digits: 97.2 % on 360 unseen digits; real layer activations, mistakes and learning curves; draw-a-digit predicted by the backend. Accent: violet | ✅ done | `SECTION_8_5_CONTENT_MAP.md`; `backend/tests/test_deep.py` (5); `e2e/section85.spec.ts`; `tests/section85.spec.ts`; key frames 100–111 |
| 7e Section 8.6 | 8 modules for DS4A §8.6. Each of the four data dimensions is measured on real data (digits, penguins) by the backend; the practice quiz is labelled as beyond the book. Accent: gold | ✅ done | `SECTION_8_6_CONTENT_MAP.md`; `backend/tests/test_data_quality.py` (4); `e2e/section86.spec.ts`; `tests/section86.spec.ts`; key frames 120–127 |
| 7f Ethics in Practice | 10 modules for pp. 394–395. The facial-recognition bias mechanism is measured on a labelled penguin analogy (no face data), with mitigation by audit + reweighting; one external fact is cited (Gender Shades, 2018). Accent: coral | ✅ done | `ETHICS_CONTENT_MAP.md`; `backend/tests/test_ethics.py` (3); `e2e/ethics.spec.ts`; `tests/ethics.spec.ts`; key frames 130–139 |
| L2 Shah 3D lessons | Problems 8.2–8.4 as K-Means-style cinematic lessons: 3D regression planes, lines with residuals, the real cost bowl J(θ₀, θ₁) with the descent path, Story / Explore (α, iterations, divergence) / Math, on a lesson shell now shared with K-Means | ✅ done | `backend/tests/test_linreg_gd.py` (4); `tests/linregLesson.spec.ts` (7); `e2e/lessonsGd.spec.ts` (6); K-Means `lesson.spec` + `film.spec` unchanged and passing; frames in `docs/lesson-keyframes/` |
| A1 Cinematic activities | DS4A Ch. 8 "Applying the Concepts" (8 activities) as short films at `/activities`: Story (captions, pure (scene, p, line) visuals, caption-by-caption stepping), Try (checked against the solvers), Solution (computed answers + Python). Linked from the Exercise Academy and the presentation's Algorithm Lab. Plus Shah's Hands-On Problems 8.2–8.4 (new solvers for 8.2 and 8.4, on the downloaded Airline Costs and UCI CSM data); 8.1 awaits `ratings.csv` | ✅ DS4A 8/8 · Shah 3/4 | `CINEMATIC_ACTIVITIES.md`; `tests/activities.spec.ts` (21); `e2e/activities.spec.ts` (13); `backend/tests/test_hoids_problems.py`, `test_shah_datasets.py`; frames in `docs/activity-keyframes/` |
| R1 Redesign · Warm Lab | proposal phase 1 (`REDESIGN_PROPOSAL.html`, palette B): all presentation colours are theme tokens (`presentation/theme.ts`, CSS `--c-*` RGB triples; SVG colours moved to `style`, canvases read them through `cssRGB`); each act has its own accent (`--c-accent`: section label, progress, next button, kickers, backdrop glow); **Lecture Hall Light** for bright rooms (key L or the sun/moon button, persisted). The film keeps its own look | ✅ done | `e2e/theme.spec.ts` (toggle and persistence, distinct accents, every text token ≥ 4.5:1 on ground and surface in both themes); key frames 60–66 (warm) and 70–76 (light); checkpoint `../checkpoints/presentation-before-warm-lab.tar.gz` |
| 8 Algorithm lab | hub to K-Means (real trace), trees, regression and gradient descent, evaluation | 🟡 hub only; k-NN backend trace missing | `LabHubSection.vue` |
| 9 Quality | full regression | ✅ for the built parts | see below |

## Checks (8 Nov, after audit phase 4: Iris palette, rehearsal walk, handoff; details in `AUDIT_PHASE4_VERIFICATION_HANDOFF.md`)
- Backend **129 passed**; frontend unit **124 passed**; `vue-tsc` clean.
- Playwright full suite, one worker: **111 passed, 0 failed**, 2 skipped (the on-demand measurement and fallback-capture tools). Includes the new rehearsal walk (whole route by → only, both themes, reduced motion, clean console; 258 presses) and the projection check.
- Fallback PDF: 108 frames, each verified against its step label. Docker frontend rebuilt (backend unchanged since phase 2).

## Checks (8 Nov, after audit phase 3: embeds, one theme, reading sizes; details in `AUDIT_PHASE3_SHELL_THEME.md`)
- Frontend unit **123 passed** (new: registry embeds are real activities/lessons; semantic colour roles in both themes); `vue-tsc` clean. Backend unchanged since phase 2 (129 passed).
- Playwright full suite, one worker: **107 passed, 2 failed, 1 skipped** (the skip is the measurement tool). Both failures were the layout guard on §8.3 step 2 at 1920×1080 and 1880×960 (variable names overlapping their descriptions at the larger size); fixed, and §8.3 rerun: layout 4/4, projection, walkthrough pass.
- New `e2e/projection.spec.ts`: all 11 core sections at 1920×1080, essential text ≥ 22 px, no step scrolls. Docker frontend rebuilt.
- A first full run with 3 parallel workers failed on infrastructure (the dev server died, connection refused); the affected specs passed serially (23/23). Run the suite with one worker.

## Checks (8 Nov, after audit phase 2: storyline, Movies worked example, conclusion; details in `AUDIT_PHASE2_STORYLINE.md`)
- Backend **129 passed**; frontend unit **121 passed**; `vue-tsc` clean; Playwright **88 / 88** (new movies + conclusion walkthroughs, the touched sections, lessons, activities, theme, layout guard on 12 sections × 4 viewports). Docker images rebuilt.

## Checks (8 Nov, after audit phase 1, accuracy corrections A1–A11; details in `AUDIT_PHASE1_CORRECTIONS.md`)
- Backend **126 passed** (new: train-only feature scores, CV-based selection, residual diagnostics, single-predictor criterion); frontend unit **120 passed**; `vue-tsc` clean.
- Playwright: 8.4, 8.5, ethics, activities, 3D lessons, movie workshop, journey, K-Means lesson, film: all pass (two lesson tests updated for the renamed "Reading the line" heading); layout guard + presentation + theme **48 / 48**. Docker images rebuilt.
- Not yet run after phase 1: the full suite in one go (sections 8.2, 8.3, 8.6 and responsive were not touched).

## Checks (7 Nov, after Section 8.6 and Ethics)
- Backend **113 passed**; frontend unit **88 passed**; `vue-tsc` clean. Playwright full suite **60 / 60** with 8.6, then ethics, presentation, theme and 12 layout tests rerun after adding Ethics; all pass. Docker images rebuilt and checked on :8080.

## Checks (7 Nov, after Section 8.5)
- Backend **106 passed**; frontend unit **83 passed**; `vue-tsc` clean. Playwright: all walkthroughs pass, including film, lesson, presentation, 8.2–8.5, theme and responsive. The layout guard is now one test per section and viewport (32), and all pass. Docker images rebuilt and checked on :8080.

## Checks (6 Nov, after Warm Lab + Section 8.4)
- Backend **101 passed**; frontend unit **78 passed**; `vue-tsc` clean; Playwright **26 / 26**. This includes the layout guard over every step of 8.4 at four viewports and the theme contrast checks. Docker images rebuilt and checked on :8080.

## Checks (6 Nov)
- Backend: **89 passed** (including the concepts endpoints: predictions reproduce the reported accuracies; the journey's tree, predictions and confusion matrix equal scikit-learn's).
- Frontend unit: **71 passed** (50 + 21 presentation). `vue-tsc` clean.
- Playwright: film 3, lesson 6, responsive 1, presentation 6, **16/16 passing**. The intro test runs slowly (up to about 80 s) because it seeks inside the 693 MB MP4.

## Layout guard (6 Nov)
`e2e/layout.spec.ts` checks every step of every built section at 1920×1080, 1880×960, 1536×864 and 1366×768 for overlapping text. It found the Section 8.2 step 5 overflow (content sliding under the title on shorter windows) and tight AI titles. Fixed with `align-items: safe center` plus internal scrolling as a fallback, a two-column ingest list, and title spacing. Shell fix: arrow keys keep working after clicking a checkbox or slider.

## Blockers and risks
- **MP4 size (693 MB).** Seeking is slow and the Docker image would be heavy. Recommended: a grain-free re-encode of the existing file (no re-render), for example CRF 26 with `hqdn3d`.
- **Docker** images do not contain V2 yet. Rebuild with `docker compose up -d --build`.
- **The browser pane** pauses animation when hidden. Visual checks run headless through Playwright.
- **k-NN** needs a new backend trace (phase 8).
