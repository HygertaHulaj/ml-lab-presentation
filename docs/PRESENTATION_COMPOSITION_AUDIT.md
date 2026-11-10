# Presentation composition and accuracy audit

Date: 8 November 2026. Scope: a full chapter lesson of 60+ minutes; proposed core path: 80 minutes, with a longer exploration appendix.

## Verdict and evidence limits

The project contains enough working material for a substantial lesson. Its main weakness is composition: individually useful experiences have accumulated without one teaching sequence, one navigation contract, and one visual vocabulary. Correctness issues also remain. It should not yet be described as a finished professor-facing presentation.

This is a source and content audit, supported by inspection of saved presentation keyframes and the recent Movies workshop screenshots. It is not a new exhaustive live-browser or accessibility certification. The earlier 120 frontend unit tests, TypeScript check, and eight targeted Edge checks establish functionality for that change; they do not establish that every statement is scientifically correct or every screen works on the professor's projector. No application code was changed during this audit.

Read directly: the two local textbook PDFs, the section registry and content maps, presentation and lesson shells, activity player, Movies workshop, regression manifests and timeline, and relevant backend algorithms. Extracted source excerpts are in `tmp/presentation-audit/`.

Primary books:

- *Data Science for All*, Chapter 8, local `C:/Users/Gaming/Desktop/FSHMN/Data sience for all.pdf`. Book page = PDF page minus 25. Direct checks included pp. 363, 365–368, 380, 382–384, 389–390, and 392–395.
- Chirag Shah, *A Hands-On Introduction to Data Science*, Chapter 8, local `C:/Users/Gaming/Desktop/FSHMN/Hands-on introduction to data sience.pdf`. Direct checks: Hands-On Problems 8.2–8.3 on book p. 232/PDF p. 258, and Problem 8.4 on book p. 233/PDF p. 259; nearby gradient-descent explanations were inspected too.

## 1. Composition findings

| ID | Observed condition | Consequence | Recommended action |
|---|---|---|---|
| C1 | `presentation/sections.ts` defines 12 sections and 97 top-level steps, with additional reveals inside steps. AI, ML, the seven-stage learning journey, and §8.2 repeatedly introduce overlapping ideas. | The learner restarts the explanation before reaching the chapter's central model/evaluation questions. | Keep DS4A order. Give AI/ML one concise introduction; place the detailed process journey inside §8.2. Make repetition an explicit recall question rather than another introductory tour. |
| C2 | The chapter, activities, lessons, and workshop each own their controls and progression. The workshop embeds the lesson shell inside another journey, giving it multiple navigation bars and two playback/navigation footers. | The presenter has to learn the application while teaching. | One presenter shell owns chapter progress, theme, accessibility, full screen, and navigation. Activities/3D scenes render as content inside it; standalone routes remain available for independent exploration. |
| C3 | The presentation lab hub sends regression to `/gradient-descent`, activities to `/activities`, and clustering to `/lessons/kmeans-iris`; it does not directly integrate `/workshops/movies`. | The new classroom example remains an excursion rather than part of the chapter. | Embed Movies at the regression/optimization point in §8.3, then continue directly into §8.4 evaluation. Use the end hub only as an appendix. |
| C4 | The film supplies Noé's question, but later sections switch among flowers, cookies, car seats, movies, digits, rocks, and penguins. | Context changes can feel unrelated even when the concepts are valid. | Keep Noé's question as the narrative thread; introduce each dataset change as a deliberate transfer. Never imply that a penguin or digit result validates a medical system. |
| C5 | The final registry item still uses `PlannedSection.vue`, with `status: 'in-development'`. | There is no finished resolution of the opening question or chapter-level retrieval check. | Build a real conclusion: return to the scan, distinguish a prediction from a decision, ask three recall/application questions, and show sources and exploration links. |
| C6 | The earlier book-order talk and new Movies journey are both useful, but there is no explicit time budget or boundary between teaching and optional exploration. | A full run can expand unpredictably beyond the class period. | Define an 80-minute core route plus optional extensions. This is a proposed teaching budget, not a measured runtime. |

## 2. Specific accuracy corrections

These are distinct from aesthetic preferences. Priorities: **P1** before submission; **P2** while consolidating explanations. Book wording is sometimes the source of an oversimplification; a correction should identify that relationship rather than silently misattribute it to the book.

### A1 — P1: feature scoring uses future test labels

Evidence: `backend/app/ml/journey.py:73` computes ANOVA feature scores on all cleaned observations before splitting. `frontend/src/presentation/sections/04-learning-process/content.ts:13` describes that display as choosing the features; its following step promises unseen test observations.

Correction: split first, compute supervised feature scores on training observations only, and apply the chosen feature representation to the test observations. Broad collection/schema explanations may still precede the split. The API's features are explicitly supplied, so this code does **not by itself prove** that the displayed score inflated the fitted model's accuracy; it does teach a potentially leaky feature-selection workflow. State that nuance.

Methodological source: [scikit-learn: data leakage and feature selection](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage).

### A2 — P1: test data are presented as a tuning set

Evidence: `frontend/src/presentation/sections/07-section-8-4/DepthSweep.vue:59` says to prefer the best value on test data; the component highlights the depth with highest test accuracy. The learning journey's evaluation explanation also advises comparing train and test before choosing. The synthetic curve demo chooses its displayed middle model by minimum test MSE.

Correction: distinguish retrospective illustrations of overfitting from a recommended selection workflow. For a real selection exercise, train candidate models on training data, choose depth using a validation set or cross-validation, and evaluate the selected model on an untouched test set. Preserve exact DS4A split/results as a separately labelled textbook reproduction where required. DS4A p. 383 itself simplifies selection to comparing test metrics; explain the more rigorous extension explicitly.

Methodological source: [scikit-learn: cross-validation and model selection](https://scikit-learn.org/stable/modules/cross_validation.html). No claim that the book-reproduction counts are numerically wrong.

### A3 — P1: deep learning is described as universally more accurate

Evidence: `frontend/src/presentation/sections/08-section-8-5/content.ts:11–20` includes broad superiority, near-instant accurate answers, and almost-impossible-to-explain claims. The broad superiority language closely follows DS4A p. 389; that does not make it universally true.

Suggested replacements:

- “Deep learning can learn useful representations from images, language, and other complex data; performance depends on the task, data, and model.”
- “Inference can be fast after training; latency and accuracy depend on the system.”
- “Large neural networks are often difficult to interpret; explanation methods provide partial insight, not a complete guarantee.”

Use the existing No Free Lunch section as the bridge: a more complex method is not automatically the best choice. Primary counterexample to universal superiority: [Grinsztajn et al., NeurIPS 2022, tree-based and deep models on tabular data](https://papers.neurips.cc/paper_files/paper/2022/hash/0378c7692da36807bdec87ab043cdadc-Abstract-Datasets_and_Benchmarks.html). That benchmark does not establish that trees always win either.

### A4 — P1: model-fit improvement is called predictive improvement

Evidence: `frontend/src/lessons/linreg-gd/timeline.ts:38` concludes that prediction improves from larger R²/adjusted R² in the two fitted movie models. These are within-sample statistics. The new workshop correctly says unseen-movie performance has not been measured, so the two surfaces disagree in wording.

Replace that narration with: “The expanded model accounts for more variation in these observed ratings. Whether it predicts new movies better requires separate validation.” Keep all existing computed values.

### A5 — P2: identical rows are treated as proof of a duplicated flower

Evidence: `frontend/src/presentation/sections/04-learning-process/content.ts:12` says one flower appears twice and calls one row a copy. Backend evidence establishes identical recorded rows, not the identity of the physical specimens.

Replace with: “Two rows have identical recorded measurements and labels. For this cleaning demonstration we retain one; in a real study we would check whether they are repeated records or distinct specimens.” Deduplication is a policy decision here, not an automatic universal cleaning rule.

### A6 — P2: the intercept update lacks its feature definition

Evidence: the generic update in `backend/app/lessons/shah_ch8.py` uses zᵢⱼ for all parameters but does not define zᵢ₀. The model text defines standardized predictor variables, not the intercept feature.

Correction: explicitly set zᵢ₀ = 1, or show the intercept update separately: θ₀ ← θ₀ − α·mean(prediction − actual). For slopes, retain θⱼ ← θⱼ − α·mean((prediction − actual)·zⱼ). Clarify that all parameters update simultaneously and that “slope of the fitted line” differs from “gradient of the cost.”

### A7 — P2: stopping and optimality wording remains too strong

Evidence: `fillTemplate` says cost stopped changing and suggests closeness to least squares “within the stopping tolerance”; the implementation stops on a cost-change tolerance, not a coefficient-distance tolerance. The manifest still calls the final step “The bottom” or “The optimal intercept and gradient” even for custom incomplete runs.

Correction: say the cost change fell below the configured tolerance. Compare coefficients/costs with the least-squares reference separately; do not imply that one tolerance bounds the other. Use outcome-aware headings: “Converged within tolerance,” “Iteration limit reached,” or “Cost is growing.” Keep the workshop's distinction between growing error and the backend's numerical divergence cutoff.

### A8 — P2: R² alone is insufficient for the rock question

Evidence: the rock lesson objectives include “Judge linearity with R².” Shah Problem 8.3 asks whether permeability relates linearly to the other measurements. A scalar fit statistic cannot establish the assumed functional form.

Correction: show observed-versus-fitted and residual-versus-fitted views, describe unexplained structure, and treat transformation as an option to evaluate. Preserve the existing warning that the displayed plane holds shape at its mean. A high or low R² is evidence about fit, not a proof of linearity or nonlinearity.

### A9 — P2: the best-single-predictor step is skipped in the new journey

Evidence: Shah Problem 8.4(c) asks the student to identify the best factor before using gradient descent. The workshop starts with budget. The older activity already exposes five correlations and its selected factor in `frontend/src/activities/hoids/Hop84Visual.vue` and the corresponding backend solver.

Correction: reuse that backend evidence inside the continuous journey before presenting the budget-only optimizer. State the criterion: strongest absolute sample correlation, equivalently highest single-predictor in-sample R² under ordinary least squares with an intercept on the same observations. This is not a claim about causal importance or best unseen-data prediction.

### A10 — P2: facial analysis and identity recognition need a sharper boundary

Evidence: `frontend/src/presentation/sections/10-ethics/content.ts` accurately names gender-classification systems and accurately quotes the two headline error rates. The surrounding section places that evidence under facial recognition and before policing/identity-match harms.

Correction: explicitly say that Gender Shades evaluated commercial gender classification, not police identity matching. Its results demonstrate subgroup disparities for the measured task; they do not provide a wrongful-identification rate for policing. Keep the figures, identify the task, and separate the policy example.

Primary source: [Buolamwini and Gebru, Gender Shades, PMLR 81, 2018](https://proceedings.mlr.press/v81/buolamwini18a.html).

### A11 — P2: adjusted R² is described as a chance/significance test

Evidence: the learning objective in `backend/app/exercises/hoids/chapter8_problems.py:180` says adjusted R² rewards a predictor only if it adds more than chance.

Correction: adjusted R² penalizes the number of predictors relative to sample size. An increase is not, by itself, a statistical significance test or evidence of better generalization. Suggested wording: “Adjusted R² penalizes adding predictors; compare it alongside the model's purpose and validation results.” Formula reference: [statsmodels adjusted R²](https://www.statsmodels.org/stable/generated/statsmodels.regression.linear_model.RegressionResults.rsquared_adj.html).

## 3. Correct work to preserve

- DS4A §8.2's three main steps and §8.3–§8.6 coverage are already mapped carefully. The short seven-stage workflow is an implementation breakdown inside the three-step framework, not a competing replacement.
- The evaluation implementation already corrects DS4A p. 383's specificity formula. The conventional definition is TN/(TN+FP), with actual negatives in the denominator. Keep the transparent erratum note; the book prints TN/(TN+FN). In its worked matrix FP and FN are equal, so the two expressions happen to give the same number.
- MSE is already correctly explained as a squared difference, rather than merely “distance.”
- K-Means separates clustering from known species and warns about local rather than guaranteed global solutions. Retain these distinctions.
- The rock plane already suppresses misleading full-model residuals when a predictor is held at its mean.
- Real backend traces, fixed seeds, the same complete movie observations across comparisons, and distinct least-squares reference statistics are strengths.
- The film's reviewed correction → retraining → validation loop is a useful clarification of the book's compressed “learns from corrections” narrative.
- The finished opening MP4 should be reused. The composition findings do not demonstrate any need to re-render it.
- Preserve the classic Exercise Academy, Training Studio, evaluation pages, and independent activities as exploration resources.

## 4. Recommended storyline: one question, several kinds of evidence

Through-line: **What evidence would make us trust a model's prediction enough to use it?**

Return to Noé at the beginning and end. Use his concern to motivate questions, not to convert all datasets into a fictional medical experiment. Distinguish learning examples from evidence about clinical performance.

| Core block | Minutes | Audience question | Reused content and transition |
|---|---:|---|---|
| Opening and objectives | 5 | Can a prediction be trusted? | Finished scan film. Hold the final frame; establish three learning goals and the unresolved question. |
| AI, ML, DL: scope and learning | 7 | Which part is learned from examples? | One nested-fields reveal and one rules-versus-learning example. Avoid replaying definitions in later introductions. DS4A §8.1. |
| The process | 10 | Where do predictions come from? | DS4A §8.2's ingest → analyze → produce map. Put the existing Iris workflow inside it; repair feature selection and split order. One short three-step activity. |
| Choosing and understanding models | 13 | Are we grouping, classifying, or predicting a number? | Contrast unlabelled Iris grouping with labelled classification; then use the book's car-seat tree to explain rules, response type, interpretation, and complexity. Selected §8.3 exercises. |
| Regression worked example | 12 | How does a model learn a numerical prediction? | Embed Movies: question → audience prediction → justify budget → residual → squared cost → line/bowl → learning-rate experiment → evidence. Label this Shah Problem 8.4, not a DS4A dataset. Preview a movie plane; Airlines and Rock are optional extensions. |
| Evaluation | 12 | Does a good training fit work on unseen observations? | DS4A §8.4. Reuse car seats for the exact confusion matrix; move through error types/metrics and validation-aware complexity comparison. Return to Movies to distinguish R² from a held-out prediction claim. |
| Deep learning | 8 | What changes when the input is an image? | DS4A §8.5. A digit becomes numbers and traverses the trained network. Inspect one correct result and one mistake. Link learned features to the earlier feature map; explain resource and interpretability trade-offs without universal superiority claims. |
| Data quality and ethics | 10 | Who or what does the model fail? | DS4A §8.6 and Ethics in Practice. Reuse the same digit model under simulated acquisition change; use penguins only for the clearly labelled subgroup analogy. Ask why overall accuracy can hide harm. |
| Resolution and recall | 3 | What evidence is still missing? | Return to the scan: representative data, suitable validation, error costs, subgroup performance, and human review. Three retrieval questions; references; optional exploration. |
| Total | **80** | | Includes short discussion pauses; validate in rehearsal. |

This keeps the book's broad order, while moving algorithm work into the concept it explains. For a 90-minute class, use the additional ten minutes for an independent exercise or discussion. The core path should not require all three regression datasets or every optional control. Do not delete source coverage; distinguish core screens, instructor detail, and exploration.

Example transition sentences:

1. Film → concepts: “The system produced a prediction. Which part of that process was learned?”
2. Process → models: “We know where learning happens. What kind of answer are we asking the model to produce?”
3. Classification → regression: “A category answers which kind; a numerical model answers how much.”
4. Optimization → evaluation: “We reduced error on these examples. What tells us the model will work on new ones?”
5. Evaluation → deep learning: “We supplied measurements to the earlier models. What if the input is the image itself?”
6. Deep learning → quality/ethics: “A powerful model still learns from a particular sample of the world. Who is missing from that sample?”
7. Closing: “Noé's question needs evidence about errors and people, not only an impressive prediction.”

## 5. A shared visual and interaction system

Use the existing `presentation/theme.ts` as the foundation. Keep separate chart, image, and 3D rendering techniques where they help explain different things; unify their framing and meaning.

| Element | Required composition |
|---|---|
| Shell | One chapter progress indicator and one control area. No nested presenter headers/footers. Standalone tools can keep their own shells outside presenter mode. |
| Screen | One question, one main visual, one concise takeaway, and one clear next action. Technical detail opens on demand. |
| Visual identity | Same typography, spacing, panel treatment, source badge, and dark/light behavior. Avoid a jump from Warm Lab to fixed navy/cyan when entering 3D. |
| Semantic colors | Define observations, prediction, reference/target, and error roles once. Keep dataset-category palettes separately defined. Per-section accent is decorative emphasis, not a changing class label. |
| Iris colors | The learning journey currently maps species to data/human/feature tokens; the K-Means lesson has a different literal species palette. A species should retain its identity across supervised comparison views; clusters must have a distinct palette and remain unlabelled during clustering. |
| Point identity | A selected observation remains selected as it moves from scatter to prediction error to results. Its name/units do not disappear at a route boundary. |
| Source badges | Consistent labels: book reproduction; real-data extension; synthetic illustration; fictional film scenario. State each demo's dataset and task. |
| Key controls | Proposed: →/← advances teaching beats; Space plays/pauses media; F full screen; L theme; a consistent detail action. The current chapter uses Space to advance, lessons use it to play, and M changes meaning. Resolve explicitly; preserve legacy shortcuts on independent routes when needed. |
| Theme and motion | One presenter state supplies dark/light and reduced-motion settings to all embedded content. Currently lessons use a separate OS-based detector and fixed colors, whereas activities use presentation state. |
| Reading sizes | Required teaching statements and essential numbers should target at least 22 CSS px at 1080p, with projection testing. Current lesson labels are commonly 10–13 px and many section details 12–18 px. Small reference citations may remain secondary; essential evidence must not depend on them. |
| 3D | Use the plane/bowl when it explains geometry. Offer a stable 2D view, direct labels, accessible textual evidence, and reduced-motion cuts. Compress or clip only with a visible explanation. |
| Return path | After an embedded experiment, the next action resumes the chapter at the intended next concept. Exploration links preserve an explicit return position. |

The new Movies journey is a useful prototype, but it also needs this consolidation: multiple toolbars, a fixed-theme inner scene, small math labels, an omitted best-predictor justification, and lower content that can require scrolling. Passing browser checks did not resolve these presentation-quality issues.

## 6. Research basis and practical implications

These studies support design choices; none proves that this particular application improves learning. That would require its own learner evaluation.

| Evidence | Practical implication for this lab |
|---|---|
| [Mayer: coherence, signaling, spatial and temporal contiguity](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-reducing-extraneous-processing-in-multimedia-learning/F29A19FCD34C542806F736E0661C05F5) | Reduce unrelated motion, competing controls, and repeated prose. Put the explanation beside the exact point/line it refers to. Synchronize the fitted line and cost marker. |
| [Mayer and Pilegard: segmentation and pre-training](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-managing-essential-processing-in-multimedia-learning-segmenting-pretraining-and-modality-principles/DD24C2F48B9B1277CE59F78276110258) | Introduce observation, predictor, prediction, and error before a multi-parameter bowl. Use meaningful learner-paced beats rather than one long automatic fly-through. |
| [Renkl: worked examples in multimedia learning](https://www.cambridge.org/core/books/cambridge-handbook-of-multimedia-learning/worked-examples-principle-in-multimedia-learning/8753055D1FB47CF1E2BB897FD44FBEF8) | First demonstrate one observation and a complete error calculation. Then ask the audience to complete or explain a related step. Open-ended controls alone are insufficient guidance for beginners. |
| [Freeman et al., PNAS 2014: active learning in undergraduate STEM](https://www.pnas.org/doi/10.1073/pnas.1319030111) | Keep audience predictions and short application questions. Require a reason and discuss the result; clicking a button without reasoning is a weak substitute for an active task. |
| [Deslauriers et al., PNAS 2019: actual versus perceived learning](https://www.pnas.org/doi/10.1073/pnas.1821936116) | Judge success by what students can explain or transfer after the demo, rather than how cinematic or effortless the presentation feels. |

Keep captions available and narration optional. Multimedia redundancy findings do not justify removing accessibility support; reduce competing explanatory paragraphs instead.

## 7. Implementation sequence for the later prompt

This is the basis for the implementation prompt, not authorization to call the application finished or to send it.

1. **Correct the P1/P2 teaching issues.** Add meaningful checks for train-only feature scoring, honest selection/evaluation labeling, outcome-sensitive narration, and correct source/task attribution. Recompute affected metrics through the backend.
2. **Define the core lesson in the registry.** Assign objectives, source pages, teaching question, time budget, core/detail/exploration status, and transition takeaway. Keep routes or redirects for existing working content.
3. **Give the presenter shell ownership.** Reuse the existing theme and interaction infrastructure. Add embeddable content variants rather than nesting complete applications or replacing the stack.
4. **Integrate the worked examples.** Place short activities at the moment their concept is taught. Reuse the Movies correlation evidence, regression trace, and solver output; keep the same observations throughout comparisons.
5. **Unify composition.** Shared teaching-beat layout, semantic colors, persistent selections, readable essential numbers, clear source/analogy labels, and projection-safe charts.
6. **Build the closing section and supporting material.** Finish the recall questions, book/research references, instructor notes, and student exploration index.
7. **Rehearse and package.** Measure the 80-minute route and record optional pauses. Check a clean start, all chapter transitions, both themes, reduced motion, full screen, audio-off use, real projector/laptop sizes, console errors, and classic-lab regressions.

Implementation acceptance examples:

- The professor starts at one URL and completes the core lesson without navigating through a dashboard or searching a hub.
- A Movies experiment returns to the evaluation teaching beat with context and selected observation preserved.
- Every highlighted model-selection result names its validation basis; final test evaluation stays separate.
- All displayed movie metrics identify fitted-data versus held-out scope.
- Entering a 3D beat does not change theme, keyboard meanings, or essential text size unexpectedly.
- Every section ends with an answer to its teaching question and a reason for the next section.
- No main-path page says planned/in development, and no numerical teaching claim depends on an unreadable footnote.

## 8. Professor-facing handoff after implementation

Prepare one documented start link, a short abstract with learning objectives, the chapter/source map, concise presenter notes, references and textbook errata, and a reproducible local/offline startup procedure. Include dataset origins and licences where redistribution requires them. Update the README's stale counts and coverage descriptions from actual verification results.

Provide a short fallback recording and key screenshots for a machine without working WebGL, without treating those assets as a substitute for the interactive source. Re-encoding an existing film for distribution is a separate packaging decision; no new film render is justified by this audit.

Readiness means the agreed corrections are implemented, the chapter has a resolved ending, the core route has been rehearsed, and the receiving machine can run it. Sending to the professor remains a later explicit action.
