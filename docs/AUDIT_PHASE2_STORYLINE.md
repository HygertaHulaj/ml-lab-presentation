# Audit phase 2: storyline, Movies after §8.3, the real ending (8 Nov 2026)

Source: `PRESENTATION_COMPOSITION_AUDIT.md` C1–C6, §4 and §7. Checkpoint before the work:
`../checkpoints/ml-learning-lab-2026-11-08-before-phase2.tar.gz`. The opening MP4 is reused unchanged.

## What changed

| Audit item | Change | Where |
|---|---|---|
| C4, §4 through-line | `THROUGH_LINE` ("What evidence would make us trust a model's prediction enough to use it?") shown on the film's handoff and answered by the conclusion. Every section has `question`, `takeaway`, `bridge`, `minutes`, `track` in the registry. | `presentation/sections.ts`, `01-introduction/IntroSection.vue` |
| §7 "every section ends with an answer and a reason for the next" | `SectionBridge` at the last step of every core section (in the page flow, so the layout guard covers it). Replaces the stale "Next: the lab" (8.2) and the hard-coded 8.6 bridge. | `sections/common/SectionBridge.vue`, all section components |
| C6 time budget | Core route planned at **80 min** (`CORE_MINUTES`), shown in the index with per-section minutes; the lab is marked *appendix*. A plan to validate in rehearsal, not a measured runtime. | `sections.ts`, `shell/PresentationShell.vue` |
| C3 Movies at the regression point | New section 7 `/presentation/worked-example-movies`, 8 beats inside the one shell (no nested toolbars). Labelled Shah, HoIDS Problem 8.4, not DS4A data. Numbers from `GET /lessons/shah-8-4-movies` + `POST /simulations/linreg-gd`. The class's chosen movie and prediction persist in the presentation store. | `sections/06b-movies/` |
| §4 "return to Movies to distinguish R² from a held-out claim" | New 8.4 step 13 *Back to the movies*: same 195 complete movies, one seeded split (137 / 58), fitted-on-all vs training vs held-out R², held-out MSE vs a training-mean baseline, spread over 50 splits, the class's movie (train or held-out, its training-only prediction). New backend `ml/movie_holdout.py`, `GET /concepts/movie-holdout`. | `07-section-8-4/MoviesReturn.vue` |
| C5 real ending | `PlannedSection` placeholder replaced by `/presentation/conclusion`: the film's last frame + through-line, prediction ≠ decision, the evidence checklist (each item jumps back to where it was taught), three recall questions, sources, explore links. `/presentation/summary` redirects. No main-path page says "in development". | `sections/11-conclusion/` |
| C3 end hub only as appendix | Lab hub moved after the conclusion as *Appendix*; links carry `?return=/presentation/lab`; K-Means tag corrected ("idea of DS4A §8.2; method beyond Ch. 8"); Movies 3D added. | `common/LabHubSection.vue` |
| §5 return path | The lesson shell honours `?return=` (same-site paths only), so the 3D lessons go back to the presentation beat they came from. | `components/lesson/CinematicLessonShell.vue` |

Measured on the backend (seed 42): budget alone R² 0.104 on all 195 movies, 0.116 on the 137 training movies, −0.003 on the
58 held-out movies (held-out MSE 0.872 vs baseline 0.937); over 50 splits the held-out R² ranges −0.121 to 0.203 (median 0.067).
Model (b) with five predictors: 0.219 fitted, 0.088 held-out.

## Checks
- Backend **129 passed** (new `test_movie_holdout.py`: disjoint split, same rows and in-sample R² as the lesson, held-out MSE from a training-only fit, train > held-out for every model).
- Frontend unit **121 passed** (registry: order, every core section has a question/answer/bridge, 80 core minutes, no in-development section); `vue-tsc` clean.
- Playwright **88 / 88**: new `movies.spec` (values match the API, the class's movie reaches 8.4, the 3D lesson returns) and `conclusion.spec`; 8.3, 8.4, ethics, presentation, theme, K-Means and Shah lessons, activities, journey; layout guard on all 12 sections × 4 viewports. Docker rebuilt.

## Not in phase 2 (phase 3 / 4)
One presenter shell for the standalone lessons and activities (they keep their own chrome when opened), a unified Warm Lab look
inside 3D lessons, keyboard meaning across routes, the 22 px reading-size pass, the 80-minute rehearsal, the handoff documents.
The presentation is still not described as professor-ready.
