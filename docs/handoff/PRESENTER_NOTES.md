# Presenter notes: the 80-minute core route

Through-line, asked after the film and answered at the end: **What evidence would make us trust a model's prediction enough to use it?**

How to drive it: **→** next beat (some steps reveal in several beats; a quiz's first → checks the answers) · **←** back ·
**I** index · **F** full screen · **L** light/dark · **M** mute · **Esc** closes an embedded activity or lesson.
"Steps" = the screens of the section (some reveal in a few beats, so → is pressed a little more often).
Minutes are a **plan**, not a measured runtime: rehearse once and adjust.

Every number on screen is computed by the backend from the book's data (or labelled synthetic / beyond the book).

---

## 1 · Opening film — 5 min · 3 steps · `/presentation/intro`
**Question:** Can a prediction be trusted?
- Title → the film plays (2 min 52 s, captions on; Space pauses, S or Esc skips) → its last frame dissolves into data points.
- The hand-off asks today's question. Do not answer it yet.
- **Bridge:** The system produced a prediction. Which part of that process was learned?
- The film is a fictional scenario; say so if asked. It is not a clinical system.

## 2 · What is AI? — 4 min · 8 steps · `/presentation/ai`
**Answer:** AI is the broad field; machine learning learns rules from examples; deep learning is one kind of ML.
- Nested fields AI ⊃ ML ⊃ DL; then a person's rule versus a learned rule on real Iris flowers.
- Try it: identify AI (audience shouts answers; → checks).
- **Bridge:** If the rule is learned, how does the learning actually happen?

## 3 · What is ML? — 3 min · 6 steps · `/presentation/machine-learning`
**Answer:** Training searches for a rule using labelled examples; inference applies it to each new case.
- Traditional programming vs training vs inference, with real flowers moving through each pipeline (P plays/pauses).
- Point out: training accuracy is optimistic; the unseen-flower score is the honest one.

## 4 · How learning works — 4 min · 8 steps · `/presentation/how-learning-works`
**Answer:** Prepare, split, choose features and train on the training part only, then predict and evaluate unseen cases.
- Seven stages on the same flowers. **Say explicitly:** the feature scores are computed after the split, on the training
  flowers only; the duplicated rows are identical *records* (we keep one for the demo; a study would check them).
- Depth: cross-validation on the training flowers chooses it; the test flowers are the final check.

## 5 · §8.2 Three steps — 6 min · 11 steps · `/presentation/section-8-2`
**Answer:** Ingest, analyze, produce results; supervised learns from labels, unsupervised finds structure without them.
- Supervised vs unsupervised on the same Iris flowers: species colours (teal / green / violet) versus K-Means **cluster**
  colours (pink / amber / blue). Clusters are not species.
- Skip the Tesla case and the tidy-data detail if short of time. The section ends on Try It Yourself (no summary screen).
- **Practise here:** Activity 2; K-Means on Iris in 3D (optional).

## 6 · §8.3 Characteristics of methods — 13 min · 14 steps · `/presentation/section-8-3`
**Answer:** Methods differ in the response (category or number), in inference vs prediction, and in interpretability vs complexity.
- The car seat tree; the surrogate trap (Quick Tip p. 370); penguins Try It; regression vs classification; nested trees.
- **Practise here:** Activities 3–6 (pick one, about 3 minutes).
- **Bridge:** A category answers which kind; a numerical model answers how much. How does a model learn a number?

## 7 · Worked example: movies — 12 min · 8 steps · `/presentation/worked-example-movies`
Shah, Hands-On Problem 8.4 (not DS4A data). **Answer:** gradient descent lowers the squared error step by step; a well-fitted
line can still account for little of the variation.
- Let the class **pick a movie** (it follows them into §8.4) and **make a prediction** (recalled at the end).
- Which predictor: the criterion is the strongest absolute correlation (= highest one-predictor R², in-sample, not causal).
- One movie's error → squared → the cost J → the line and the cost map (→ steps iterations 0, 1, 3, 10, end; the slope of
  the line is not the gradient) → learning rate 0.1 vs 2.2 (ask first; → runs both on the server).
- Evidence: every R² here is **in-sample**. **Practise here:** the same model in 3D; Airlines; Rock (optional).
- **Bridge:** We reduced error on these examples. What tells us the model will work on new ones?

## 8 · §8.4 Evaluation — 12 min · 15 steps · `/presentation/section-8-4`
**Answer:** Judge a model on data it did not learn from: choose with validation, confirm once on a test set, and pick
metrics that match the costs of its mistakes.
- Table 8.3 is recomputed exactly (22 / 11 / 11 / 37). **Erratum:** specificity = TN / (TN + FP); the book prints
  TN / (TN + FN) (same number here because FP = FN).
- Fig. 8.17: blue is chosen by **cross-validation**; the test MSE is checked once afterwards. Car seats: depth chosen by
  cross-validation (depth 4), not by the best test score.
- **Back to the movies:** fitted R² vs held-out R² for the class's movie; the held-out score is about zero for budget alone,
  and varies from split to split.
- **Practise here:** Activities 7–8. **Bridge:** What if the input is the image itself?

## 9 · §8.5 Deep learning — 8 min · 12 steps · `/presentation/section-8-5`
**Answer:** A deep network learns its own features from pixels, at a cost in data, computing and interpretability; it is
not automatically the best method (cited: tree models often win on tabular data).
- A digit becomes 64 numbers and passes through the trained network; show one correct result and one mistake.

## 10 · §8.6 High-quality data — 5 min · 8 steps · `/presentation/section-8-6`
**Answer:** Useful training data are fresh, sufficient, diverse, accurate and representative.
- **Bridge:** Who is missing from the sample, and who pays for the model's mistakes?

## 11 · Ethics in practice — 5 min · 10 steps · `/presentation/ethics`
**Answer:** Overall accuracy can hide unequal errors: check each group, mitigate bias, keep people accountable.
- Gender Shades measured commercial **gender classification**, not police identity matching; the policing slide is the
  book's chain of risks. The penguin demo is an analogy (no face data).

## 12 · Conclusion — 3 min · 5 steps · `/presentation/conclusion`
- Back to Noé's scan → a prediction is not a decision → the evidence checklist (each item jumps back to where it was
  shown; ← returns) → three recall questions (discuss, then → checks) → sources and where to explore.
- Appendix (after the talk): the Algorithm Lab.

---
Total planned: **80 min**, 108 steps. For a 90-minute slot, use the spare 10 minutes for one "Practise here" activity
or a discussion question (Ethics → Discussion). Sections to shorten first: §8.2 Tesla and tidy data, §8.3 penguins,
§8.5 ChatGPT case.
