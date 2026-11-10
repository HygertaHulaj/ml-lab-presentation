# Presenter Guide — Lecture 8, Machine Learning (11 Nov 2026)

Hygerta Hulaj · total ≈ 60 minutes

| Block | Time | Material | Who |
|---|---|---|---|
| 1. Chapter presentation | 20 min | `Kapitulli8-HygertaHulaj.pptx` (speaker notes on every slide name the speaker) | Hygerta |
| 2. Applying the Concepts | 15 min | `AC-DS4A-…docx` + app → Exercise Academy | **Know all 8 activities: the professor may ask any of them** |
| 3. Try It Yourself | 15 min | `TiY-HoIDS-HygertaHulaj.docx` (TiY 8.1, kangaroo data) | Hygerta |
| 4. Scientific paper | 10 min | `PunimiShkencor-…docx` | Hygerta |

## Before the lecture (checklist)

1. Laptop charged; app started with `scripts\start-backend.ps1` + `scripts\start-frontend.ps1`. Open http://localhost:5173 and click
   through Exercise Academy → AC 7 once, so the first slow scikit-learn import has already happened.
2. Wi-Fi is **not** needed. If Docker fails, use `scripts\start-offline-sqlite.ps1`.
3. PowerPoint open in Presenter View, with the speaker notes visible.
4. Backup: the four Word/PowerPoint files on a USB stick.

## The 8 Applying-the-Concepts activities — one-line answers to memorise

| # | Answer in one breath |
|---|---|
| AC1 | AI: **b** spam-caller labeling, **c** talk-to-text, **e** Echo Dot, **f** email suggestions. Not AI: keyboard, stopwatch, headphones, e-scooters. |
| AC2 | Step 1 ingest: **2, 3, 6, 8** · Step 2 analyse: **4, 5, 9** · Step 3 results: **1, 7**. |
| AC3 | Predict **private** (565 vs 212) · split on **f_undergrad** · ≥ 2995 → **public** · leaves: 536 private predictions (495 correct), 241 public (171 correct) → **666 / 777** correct. |
| AC4 | Classification: 1, 4, 5 · Regression: 2, 3*, 6 (*wine 1–10 is numeric; could be argued ordinal classification). |
| AC5 | IMDB rank: regression / quantitative / inference · election: classification / categorical / **both** · fires: classification / categorical / prediction. |
| AC6 | Top variable **flipper_length_mm** (≤ 206.5; the book's R prints 207). Depth 1: 262/333 correct; depth 5: 333/333; **depth 7 is identical to depth 5** (leaves already pure). Fill-ins: first / single split / third / most splits / more / more challenging / second. |
| AC7 | Split: shelf_location Good vs not. Test matrix TP 12, FN 21, FP 5, TN 43 → **accuracy 0.68, precision 0.71, recall 0.36, specificity 0.90** (the book's printed formula would give 0.67). |
| AC8 | TP: P=1,A=1 · TN: P=0,A=0 · FP: P=1,A=0 · FN: P=0,A=1. Accuracies: M1 0.80/0.64, M2 0.72/0.65, M3 0.59/0.59 → M1 **overfitted**, M2 **well-fitted**, M3 **underfitted** (predicts 1 for everything). |

## Live demo script (optional, 1–2 min, at the end of block 1 or during block 2)

1. **Decision Trees** → preset "AC 6 · penguins species" → *Compare* (1, 5, 7). Point at "actual depth 5" for max depth 7.
2. **Evaluation Lab** → preset "Table 8.3" → the four metrics with their calculations.
3. **Gradient Descent** → *Run* → press ▶ — the line moves, the loss falls, and the step-by-step panel shows the real gradients.

## Oral-defense questions and answers

**Why did you choose a decision tree?**
The chapter uses it as its main supervised method. It works for both regression and classification. It is easy to read from top to
bottom, so we can explain every prediction. Its complexity is easy to control with max depth and min n.

**How does training work for a decision tree?**
Starting with all training rows, the algorithm tries every variable and threshold and keeps the split that reduces impurity (Gini) the
most. It repeats on each child until max depth, or until a node is pure or too small. Each leaf predicts its majority class.

**What happens if the training data changes?**
The fitted model changes. Trees especially can pick different splits or thresholds. That is why we fix a random seed for
reproducibility and judge models on test data — and why the data must be representative (DS4A §8.6).

**Regression vs classification?**
It depends only on the response variable. A quantitative response means regression (predict a number; MSE, R²). A categorical response
means classification (predict a class; accuracy, precision, recall, specificity).

**How is the confusion matrix calculated?**
Compare every test prediction with the true label, and count the four combinations for the chosen positive class: TP, FP, FN, TN.
Accuracy = (TP+TN)/total, precision = TP/(TP+FP), recall = TP/(TP+FN), specificity = TN/(TN+FP).

**Why can a model overfit?**
With enough complexity it can memorise noise and peculiarities of the training data. Training accuracy reaches 100% while test
performance stops improving or falls. In our car-seat demo, training accuracy reaches 1.00 and test accuracy stays about 0.76.

**How does gradient descent update coefficients?**
Compute the predictions and errors, then the gradient of the loss with respect to each parameter, and step against it:
w ← w − α·∂L/∂w, b ← b − α·∂L/∂b. Repeat until the loss stops changing.

**How do you know whether the model performs well?**
Evaluate on held-out test data, compare against a baseline (for example always predicting the majority class), compare several models
(No Free Lunch), and look at the right metric for the costs involved (for example recall when missing a positive is expensive).

**Can the same model predict values from a completely different dataset?**
No. A model only knows the relationships in its training data. On a new problem the same *algorithm* must be re-trained and validated
on that new data. Our app's "Solve a New Problem" page does exactly this.

**Why does your specificity differ from the book's formula?**
The book prints TN/(TN+FN) on p. 383, but that is the negative predictive value. The standard definition, also used in the book's own
Python script, is TN/(TN+FP).

**Why does your depth-1 penguin threshold say 206.5, not 207?**
scikit-learn places thresholds at the midpoint between neighbouring observed values (206 and 207). R's rpart prints the rounded value.
It is the same split.

**Your Shah gradient-descent result after 300 iterations is not the least-squares line — is that a bug?**
No. With α = 0.01 and x not centred, the intercept converges slowly. After 300 iterations: slope 3.592, intercept −5.009. Running longer
gives exactly −10.263 and 3.977, matching `lm`. The book's plotted cost curve also has a bug: it squares the sum of errors.
