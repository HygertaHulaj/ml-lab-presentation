# Audit phase 1: accuracy corrections A1–A11 (8 Nov 2026)

Source: `PRESENTATION_COMPOSITION_AUDIT.md` §2. Checkpoint before the work: `../checkpoints/ml-learning-lab-2026-11-08-before-phase1.tar.gz`.
Every new number is computed by the backend; the frontend only renders it. Preserved unchanged (§3): the specificity erratum,
MSE explained as squared error, K-Means clusters ≠ species, the rock plane-slice warning, fixed seeds, the film's retraining
loop, the opening MP4 and the classic lab.

| # | Correction | Where | Test |
|---|---|---|---|
| A1 | ANOVA F-scores are computed **after the split, on the training flowers only** (`computed_on: "training"`). Text states this and that the two plotted features are supplied explicitly. | `ml/journey.py`, `04-learning-process/content.ts` | `test_journey.py::test_feature_scores_use_training_rows_only` |
| A2 | Model **selection uses cross-validation inside the training data**; the test set is the final check only. Fig. 8.17: `cv_mse` (5-fold on the 50 training points) selects blue (4 parameters); `lowest_test_complexity` (6) is kept for comparison only. Car seats: `cv_accuracy` per depth plus `depth_selection` (5-fold stratified on 319 stores → depth 4, test 67.9 %). Iris journey: `cv_accuracy`, `selected_depth`. Wording in DepthSweep, FitCurve, NoFreeLunch, the 8.4 summary cards and the journey's evaluation step. | `ml/evaluation.py`, `ml/journey.py`, `07-section-8-4/*`, `04-learning-process/content.ts` | `test_evaluation.py::test_selection_never_uses_the_test_set`; `e2e/section84` reads `depth_selection` |
| A3 | Deep-learning gains reworded as "can …, depending on task, data and model"; interpretability as "partial insight, not a full guarantee"; a cited caveat (Grinsztajn et al., NeurIPS 2022) bridges to No Free Lunch. | `08-section-8-5/content.ts`, `Section85.vue` | `tests/section85.spec.ts` |
| A4 | "The prediction improves" → "the expanded model accounts for more variation in these observed ratings. Whether it predicts new movies better requires separate validation." | lesson timeline, HOP 8.4 solver, activity script, Hop84Visual | `tests/linregLesson.spec.ts` (no "prediction improves") |
| A5 | Identical rows: "for this cleaning demonstration we keep one; in a real study we would check whether they are repeated records or distinct specimens." | `04-learning-process/content.ts` | — |
| A6 | Model written with zᵢ₀ = 1; the update covers j = 0…n and states the intercept step θ₀ := θ₀ − α·mean(prediction − actual). The bowl scene distinguishes the slope of the line from the gradient of the cost. | `lessons/shah_ch8.py` (lesson version 2) | fixture regenerated from the backend |
| A7 | Stop sentence: "the change in cost fell below the tolerance". Outcome-aware headings: *Converged within tolerance* / *Iteration limit reached* / *Cost is growing*; "optimal intercept and gradient" → "Reading the line: intercept and slope". | `timeline.ts`, `shah_ch8.py` | `tests/linregLesson.spec.ts` |
| A8 | Rock: backend `diagnostics` (fitted, residuals, residual sd, R² on log(perm) as an option to test). New residual-vs-fitted plot in the Math panel at the reading and closing scenes; objective now "check linearity with a residual-versus-fitted plot, not with R² alone". | `ml/linreg_gd.py`, `ResidualPlot.vue`, `GdMathPanel.vue` | `test_linreg_gd.py::test_diagnostics_and_single_predictor_criterion` |
| A9 | Movies: backend `single_predictors` ranks candidates by \|r\| on the same rows (= highest one-predictor in-sample R²). Shown in the lesson's models scene, the workshop's Solution and the narration, with "not causal, not best unseen prediction". | `ml/linreg_gd.py`, `api/v1/lessons.py` (`rank_single`), `MovieWorkshop.vue`, `GdMathPanel.vue` | same test; `tests/linregLesson.spec.ts` |
| A10 | Gender Shades now carries its scope: it measured commercial **gender classification**, not police identity matching. The policing slide is framed as the book's chain of risks. Source: https://proceedings.mlr.press/v81/buolamwini18a.html | `10-ethics/content.ts`, `EthicsSection.vue` | `e2e/ethics.spec.ts` |
| A11 | "Adjusted R² rewards a predictor only if it adds more than chance" → "Adjusted R² penalizes adding predictors; compare it alongside the model's purpose and validation results." The quiz now asks whether adjusted R² rises *on these movies*. | `chapter8_problems.py`, `activities/hoids/scripts.ts`, `Hop84Visual.vue` | `tests/activities.spec.ts`, `e2e/activities.spec.ts` |

Left as the book wrote it: the exercise *questions* (e.g. Shah's "does the prediction improve?", "optimal intercept and gradient") are
quoted problem statements; the answers and explanations around them carry the corrected wording.

Not part of phase 1 (later phases, need approval): storyline (Movies after §8.3, real ending), presenter shell unification, theme
and 22 px pass, final verification and handoff. The presentation is **not** yet described as professor-ready.
