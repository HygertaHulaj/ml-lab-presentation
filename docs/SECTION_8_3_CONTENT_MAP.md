# Section 8.3 content map — DS4A "Characteristics of Machine Learning Methods"

**Source:** *Data Science for All*, Chapter 8, Section 8.3, **book pp. 368–379** (PDF pages 393–404). Extracted 6 Nov 2026 (PyMuPDF).
**Status: built.** Module code is in `frontend/src/presentation/sections/06-section-8-3/` and the backend in `backend/app/ml/characteristics.py` (`GET /api/v1/concepts/tree`, `/concepts/carseats-explore`). It is tested by `e2e/section83.spec.ts`, `tests/section83.spec.ts` and `backend/tests/test_characteristics.py`.

The book's figures are images. Every number shown is therefore recomputed from the book's official datasets (`backend/datasets/ds4a/carseats*.csv`, `penguins.csv`) with scikit-learn, and the tests check it against the values printed in the text.

| # | Heading / element (p.) | What the book says (paraphrase) | Module and interaction | Real numbers (computed; checked against the book) |
|---|---|---|---|---|
| 0 | Section intro (p. 368) | Supervised and unsupervised methods differ greatly; the focus is supervised methods, through the decision tree | Four-characteristics map | — |
| 1 | Decision Trees, DEFINITION + Fig. 8.5 (pp. 368–369) | A hierarchical, flowchart-like model: nodes, splits (questions), branches (answers), leaves (predictions) | `TreeAnatomy`: → reveals node, split, branches, leaves on a generic tree | generic figure (no data) |
| 2 | Car seat data, Table 8.1 + Quick Tip (pp. 369–370) | 400 stores; predict `sales_cat`; exclude `sales` because knowing it means knowing `sales_cat` | `SurrogateDemo`: tick "use sales"; the backend refits; accuracy jumps to 100 % and a warning explains why | with `sales`: 100 % (split on sales); without: shelf location + price |
| 3 | Reading a tree, Figs 8.6–8.8 (pp. 370–371) | Top node "Low", 164 High / 236 Low; split on shelf location = Good; leaves; predict a new store | `ReadingTree`: → walks top node, split, branches, leaves; choose a new store's shelf location and see its path | root 164 / 236 ✓, Good leaf 85 stores, 66 High ✓ (283 / 400 correct) |
| 4 | What makes a good explanatory variable, Figs 8.9–8.10 (pp. 371–372) | The share of High differs by shelf location, so they are associated; sales vs price is a moderate-to-strong negative linear association | `ExplanatoryVars`: stacked columns, then a scatter | Bad 15 %, Medium 38 %, Good 78 % High; r = −0.45 |
| 5 | Try It Yourself: Reading a Decision Tree, Fig. 8.11 (p. 373) | Penguins tree: overall prediction, split variable, threshold (< 207 mm), correct leaf predictions | `PenguinQuiz`: 4 questions; answers read from the fitted tree | root Adelie ✓, flipper length ≤ 206.5 mm ✓, 144 + 118 = 262 correct |
| 6 | Regression versus Classification, DEFINITION + Try It Yourself (pp. 373–374) | Quantitative response → regression; categorical → classification; 6 items | Definitions + `ChoiceQuiz` (6 items) | — |
| 7 | Table 8.2 + Fig. 8.12 + Quick Tip (pp. 374–375) | Some methods do both; the same tree read the same way, a category vs. a mean | `BothTasks`: the classification and regression trees side by side | Good leaf mean 10.21 thousand over 85 stores ✓ (book: "10,000 units", 85) |
| 8 | Inference versus Prediction + Quick Tip (p. 375) | RadiologyML = prediction; car seats = inference; a poorly predicting model is not worth interpreting | Two cards + which variables drive sales (variable importances) | importances from the depth-3 tree |
| 9 | Try It Yourself: Inference versus Prediction (pp. 375–376) | Zoo salaries, new book success, Orlando air temperature | `ChoiceQuiz`, 4 combined options each | — (answers stated in the book) |
| 10 | Interpretability and Complexity, DEFINITION + Fig. 8.13 (pp. 376–377) | The trade-off; inference needs interpretability | `InterpComplexity`: the 3 methods the text names, placed qualitatively | qualitative (Fig. 8.13 is adapted from ISLR) |
| 11 | Max depth and min n (p. 377) | The two complexity controls of a tree | `ComplexityControls`: sliders refit the tree live; leaves, accuracy, official 319 / 81 train/test | live from the backend |
| 12 | Try It Yourself: Interpretability vs Complexity + Quick Tip (nested trees), Figs 8.14–8.16 (pp. 377–379) | Three nested trees; same first split; which predicts best; rank interpretability and complexity | `NestedTrees`: 3 trees (depth 1–3) + 4 questions | shelf location first in all ✓; 283 / 307 / 317 correct → third ✓ |
| 13 | Summary | — | 5 key points | — |

## Notes
- **Table 8.2** (popular methods) is an image. The presentation does not reproduce it; it points to the book.
- **Fig. 8.13** shows more methods than the text names. Only the three named in the text are placed, and they're marked qualitative.
- The book's trees were made with R. scikit-learn reproduces every number the text states. Splits that the text doesn't state could differ slightly from the printed figures, so the screen always shows the backend's tree.
