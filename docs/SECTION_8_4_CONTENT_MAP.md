# Section 8.4 content map — DS4A "Machine Learning Method Evaluation"

**Source:** *Data Science for All*, Chapter 8, Section 8.4, **book pp. 380–388** (PDF pages 405–413). Extracted 6 Nov 2026 (PyMuPDF; Table 8.3, Fig. 8.17 and the p. 388 matrices read from the rendered pages).
**Status: built.**
- **Code:** `frontend/src/presentation/sections/07-section-8-4/`.
- **Backend:** `backend/app/ml/evaluation.py`, served by `GET /api/v1/concepts/evaluation`. It is deterministic and cached.
- **Tests:** `backend/tests/test_evaluation.py`, `frontend/tests/section84.spec.ts` and `frontend/e2e/section84.spec.ts`. The section is also in the layout guard.

**Table 8.3 is recomputed, not copied.** A decision tree with max depth 5 and min n 10 is trained on the book's official `carseats_train` (319 stores) using all ten genuine explanatory variables, with `sales` excluded per the p. 370 Quick Tip. Applied to `carseats_test` (81 stores), it gives exactly the book's TP 22, FP 11, FN 11 and TN 37. The backend test asserts this.

| # | Heading / element (p.) | What the book says (paraphrase) | Module and interaction | Real numbers |
|---|---|---|---|---|
| 0 | Section intro (p. 380) | After characteristics comes evaluation of quality and performance | Four question cards | — |
| 1 | Model Validation + 3 DEFINITIONS (pp. 380–381) | Training data, test data, model validation; the convention of a random 80 / 20 split; Big Picture Break: supervised learning is predictive modelling, judged on test data | `ValidationSplit`: → the 400 stores divide into training and a test set that is set aside | 319 / 81 (official split) |
| 2 | Model Evaluation and Comparison, accuracy DEFINITION (p. 381) | Fit on 319, predict 81; accuracy and misclassification rate | `TestStores` (accuracy): → reveals each test store's prediction ✓/✗ with a running count | 59 / 81 = 72.8 %; misclassification 27.2 %; training accuracy 89.3 % |
| 3 | Evaluating Classification Models, TP/FP/TN/FN DEFINITIONS (pp. 381–382) | RadiologyML's two mistakes; doctors worry more about false negatives | `MistakeTypes`: four schematic outcomes revealed in turn, then the FN point; human review stated | — (fictional tool, schematic scans) |
| 4 | Confusion matrix DEFINITION + Table 8.3 (p. 382) | Rows are predicted and columns actual: TP top left, FP top right, FN bottom left, TN bottom right | `TestStores` (matrix): the same 81 dots fly into the cells; "identical to Table 8.3" | 22 / 11 / 11 / 37 ✓ |
| 5 | Precision, recall, specificity DEFINITION + Quick Tip (p. 383) | The formulas; accuracy is the diagonal over the total | `MetricExplorer`: pick a metric; the numerator cells fill, the denominator cells are outlined, and the counts are substituted | 0.73 / 0.67 / 0.67 / 0.77 |
| 6 | Try It Yourself: calculate the metrics (p. 383) | Questions 1–4: compute, rounded to 2 dp; question 5: STAR | `ChoiceQuiz` with computed answers; STAR noted for discussion | as row 5 |
| 7 | Evaluating Regression Models, MSE and R² DEFINITION (p. 384) | Numeric predictions need difference-based metrics: low MSE, high R² | `RegressionEval`: predicted vs actual for 81 stores; → residuals; → MSE and R² (test, train, mean baseline) | test MSE 5.06, R² 0.38; train 2.17 / 0.73; mean baseline 8.19 |
| 8 | The "No Free Lunch" theorem (p. 384) | No method is best for every problem | `NoFreeLunch`: tree, logistic or linear regression, and k-NN on three problems; a different winner each time | logistic 84.0 %; linear MSE 1.19; k-NN MSE 1.12 on the curve, where linear is worst (2.43) |
| 9 | Overfitting and Underfitting + DEFINITION + cookie analogy (pp. 384–385) | Overfit: memorises the noise. Underfit: too simple. The recipe analogy | Two definitions + three recipe cards | — |
| 10 | Figs 8.17–8.21 (pp. 385–387) | True curve; gold line underfits; green wiggly overfits; blue is best (lowest test MSE); training error is almost always lower than test error | `FitCurve`: left, the data and models; right, training and test MSE against complexity (log axis, as in the book); → in the book's order; slider over all 24 models | synthetic, seed 1: gold 2 params (train 2.37 / test 2.43), blue 6 (0.62 / 1.07), green 23 (0.48 / 1.85); noise floor 1.0; training MSE below test MSE at every complexity; axis capped at 3.0 as in the book |
| 11 | The three-bullet rule (p. 387) | Good train + poor test = overfit; good both = good fit; poor both = underfit; error and accuracy move oppositely | `DepthSweep`: real car seat trees at depth 1–12, training vs test accuracy | depth 5 is best on test (72.8 %); depth ≥ 10 is 100 % train and 69.1 % test |
| 12 | Try It Yourself: three models (p. 388) | Name the cells, compute accuracies, judge fit | Book matrices + `ChoiceQuiz` (4 cell items, 3 verdicts); checking reveals the computed accuracies | 1.00 / 0.42 overfitted; 0.70 / 0.69 well-fitted; 0.51 / 0.50 underfitted |
| 13 | Summary | — | Five cards | — |

## Accuracy notes (educational review)
- **Specificity.** The book prints TN / (TN + FN). The standard definition is TN / (TN + FP), the share of actual negatives predicted negative, and the presentation uses it. In Table 8.3, FP = FN = 11, so both give 0.77, and a note on step 5 says so. The backend returns both values (`specificity`, `specificity_book_formula`).
- **MSE.** The book calls it the "average distance". It is the average *squared* difference, and the on-screen definition says so.
- **Fig. 8.17** is simulated in the book (adapted from ISLR). The presentation shows seeded synthetic data with the same shape, clearly labelled. Complexity is the number of parameters: a line, a parabola, then cubic regression splines.
- **No Free Lunch.** The comparison is illustrative, with default settings and one split. It shows that the ranking depends on the problem, not which method is best in general.
