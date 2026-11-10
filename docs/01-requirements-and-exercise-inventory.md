# ML Learning Lab — Phase 1: Verified Requirements & Exercise Inventory

Student: **Hygerta Hulaj** · Lecture 8 (Ligj. 8) · Presentation **11 Nov 2026**
Sources read directly: `UdhëzimetPërDorëzimTëDetyrave.docx`, `NdarjaETemave_HShDh_2026-27.docx`,
DS4A Chapter 8 (book pp. 363–403), HoIDS Chapter 8 (book pp. 209–234).

Status legend: ✅ verified from source text · ⚠️ needs the figure/table image or dataset to finish · ❗ conflict / erratum

---

## 1. Professor's requirements (verified from the instructions .docx)

| # | Component | Time | Exact requirement |
|---|---|---|---|
| 1 | Presentation (DS4A) | 20 min | Chapter presentation with **ONLY** the main topics and concepts. |
| 2 | Applying the Concepts (DS4A) | 15 min | Solve **all** chapter tasks at the end of the chapter ("Applying the Concepts"). Solved jointly, but the professor **randomly picks one student** to present one of them. |
| 3 | Try It Yourself (HoIDS) | 15 min | **Each** group member picks **one** Try It Yourself task from the corresponding HoIDS chapter. |
| 4 | Scientific paper | 10 min | **1** paper, **not older than 3 years**, covering the chapter's topic (one per group). |

**Submission** (✅ exact wording from the docx):
- Email all materials **compressed**, **at least 24 h before the lecture** → deadline **Tue 10 Nov 2026** (before the lecture time on 11 Nov).
- Email subject: `HShDh_26/27_HygertaHulaj`
- Files must be named **exactly** (otherwise rejected):
  1. `Kapitulli8-HygertaHulaj` — .pptx presentation
  2. `AC-DS4A-HygertaHulaj` 
  3. `TiY-HoIDS-HygertaHulaj` — one file per student
  4. `PunimiShkencor-HygertaHulaj`
- Schedule (✅ Ndarja docx): Ligj. 8 = DS4A Ch. 8 *Machine Learning* + Shah Ch. 8 *Machine Learning Introduction and Regression*, 11 Nov. Hygerta Hulaj is listed for Ligj. 8.

Paper date window: published **on or after Nov 2023**.

---

## 2. DS4A Chapter 8 — "Applying the Concepts" inventory (book pp. 398–401)

There are **8 activities**, matching the 8 categories in the brief.

| # | Activity | Data / input | Subquestions | Type | Status |
|---|---|---|---|---|---|
| AC1 | Identify Artificial Intelligence | list a–h | 1 (multi-select) | conceptual | ✅ |
| AC2 | Identify Data Ingestion, Data Analysis, and Results — "Physical Fitness Assistant" | 9 items | 9 classifications | conceptual | ✅ |
| AC3 | Reading a Decision Tree | **dataset `college`**, target: private or not | 5 (incl. STAR) | **real tree training** | ⚠️ dataset |
| AC4 | Regression versus Classification | 6 response variables | 6 | conceptual | ✅ |
| AC5 | Inference versus Prediction | 3 scenarios | 3 × (type, variable kind, goal) | conceptual | ✅ |
| AC6 | Interpretability versus Complexity | **dataset `penguins`**, trees with max depth **1, 5, 7** | 4 (incl. STAR) | **real tree training** | ⚠️ dataset |
| AC7 | Accuracy, Precision, Recall, Specificity from a Confusion Matrix | **`carseats_train`, `carseats_test`**; tree max depth 1, min n 2, seed 1234, target `sales_cat` | 5 (incl. STAR) | **real tree training + metrics** | ⚠️ dataset |
| AC8 | Overfitted, Underfitted, Well-Fitted Models | 3 confusion matrices (train/test) printed as an **image** | 1a–d, 2, 3a–c | numerical + conceptual | ⚠️ image |

### Draft answers to the conceptual activities (to be cross-checked in Phase 2)

**AC1** — Uses AI in most cases: **b** spam-caller labeling, **c** talk-to-text, **e** Amazon Echo Dot, **f** email text suggestions.
Not AI: a keyboard, d stopwatch, g headphones, h e-scooters.

**AC2** — Physical Fitness Assistant
| Item | Step |
|---|---|
| 1 Alerts and Recommendations | 3 – Producing model-based results |
| 2 Calendar Data | 1 – Ingesting data |
| 3 Eating Habits | 1 – Ingesting data |
| 4 Feedback Loop | 2 – Analyzing the data (model is refined/re-learned from outcomes; note it also feeds new data back into Step 1) |
| 5 Pattern Recognition | 2 – Analyzing the data |
| 6 Physical Activity Monitoring | 1 – Ingesting data |
| 7 Resource Allocation | 3 – Producing model-based results |
| 8 User Input | 1 – Ingesting data |
| 9 Muscle Level Prediction | 2 – Analyzing the data (the item text says "algorithms analyze the ingested data") |

**AC4** — 1 classification · 2 regression · 3 regression (numeric 1–10 score; can be treated as ordinal classification — explain both) · 4 classification · 5 classification · 6 regression.

**AC5**
1. IMDB top-100 rank → **regression**, rank is **quantitative**, interest = **inference**.
2. Presidential election winner → **classification**, elected is **categorical**, **both** (predict winner *and* learn which characteristics mattered).
3. California fire risk → **classification**, at-risk is **categorical**, **prediction**.

**AC3 / AC6 / AC7** must be computed from a real fitted model (Phase 2). Known textual anchors to reproduce:
- AC3: the question states a split at **`f_undergrad` ≥ 2995** → our tree must reproduce this split; otherwise document why.
- AC6: the in-chapter TiY on penguins mentions **flipper length < 207 mm** at the root → expected root variable `flipper_length_mm`.
- AC7: the chapter text describes a 319 / 81 train/test split of the 400 stores.

### ❗ Erratum to flag in the presentation
DS4A p. 383 defines **specificity = TN / (TN + FN)**. That is the *negative predictive value*. The standard definition (and the one the brief requires) is **specificity = TN / (TN + FP)** — the proportion of actual negatives correctly predicted. Solutions will use the standard formula and state the erratum explicitly, showing both numbers so the students can answer either way if asked.

---

## 3. HoIDS (Shah) Chapter 8 — inventory (book pp. 209–234)

| Item | Type | Data | Status |
|---|---|---|---|
| Hands-On Example 8.1 Linear Regression | worked example | `regression.csv` = Table 8.2 (20 rows, printed in book) | ✅ reproduced: **ŷ = −10.263 + 3.977x** |
| Hands-On Example 8.2 Gradient Descent | worked example | same, θ=(0,0), α=0.01, 300 iterations | ✅ reproduced (see below) |
| **Try It Yourself 8.1: Gradient Descent** | **official TiY** | kangaroo nasal dimension data (OA 8.2) — predict nasal length from nasal width | ⚠️ dataset |
| Conceptual Questions 1–4 | questions | — | ✅ |
| Hands-On Problem 8.1 | linear regression | restaurant ratings (OA 8.3) | ⚠️ dataset |
| Hands-On Problem 8.2 | linear regression | Airline Costs (OA 8.4) | ⚠️ dataset |
| Hands-On Problem 8.3 | **gradient descent** | 48 rock samples, BP Research (OA 8.5) — this is R's built-in `rock` dataset (area, peri, shape, perm) | ✅ authentic source identifiable |
| Hands-On Problem 8.4 | gradient descent | 2014–15 movie social-media dataset (OA 8.6) | ⚠️ dataset |

### ❗ Conflict: only ONE Try It Yourself in Shah Chapter 8
The professor asks **each** student to pick one TiY. Chapter 8 contains exactly one: **TiY 8.1 (Gradient Descent)**.
Proposed resolution (needs the students' / professor's decision — Q3):
- **Hygerta → TiY 8.1** (kangaroo data, OA 8.2; obtained 9 Nov and checked identical to the publisher's "Gray Kangaroos" data, 45 pairs).

### ✅ Verified findings in the Shah gradient-descent example (great for the oral defense)
Computed independently on Table 8.2:
- OLS: intercept −10.2632, slope 3.9774 (matches the book's `lm` output).
- Book's GD (θ=(0,0), α=0.01, 300 iterations) ends at **b = −5.009, m = 3.592** — it has **not converged** to OLS in 300 iterations because the intercept direction learns slowly with unscaled x. Our app will show this and let students increase iterations / scale x.
- ❗ The book's R cost function `sum(X %*% theta - y)^2/(2*length(y))` computes **(Σe)² / 2n**, not **Σe² / 2n** (operator precedence). Its value after iteration 1 is **3038.05**, which matches the ~3000 starting value of Figure 8.11; the correct cost is 175.25. The parameter updates are unaffected (they use the gradient), only the plotted cost curve is wrong. The app will plot the correct MSE and can show the book's version side by side.

---

## 4. Dataset inventory

| Dataset | Used by | Authentic source | Availability |
|---|---|---|---|
| Shah Table 8.2 `regression.csv` | HoIDS Ex 8.1/8.2 | printed in book | ✅ transcribed (20 rows) |
| `penguins` | DS4A AC6 | Palmer Penguins (Horst, Hill & Gorman 2020; R `palmerpenguins`, 344 rows) | ✅ public — download once |
| `college` | DS4A AC3 | ISLR2 `College` (US News 1995, 777 colleges); DS4A uses snake_case names e.g. `f_undergrad` | ✅ public — column names must be mapped |
| `carseats_train`, `carseats_test` | DS4A AC7 | ISLR2 `Carseats` (400 stores) + `sales_cat` (High if sales > 8, per book p. 371). The **book's exact split files come from MyLab Statistics** | ⚠️ exact files likely unavailable; R `set.seed(1234)` split can't be reproduced bit-for-bit in Python → document the difference, or obtain the MyLab CSVs |
| kangaroo nasal dimensions | HoIDS TiY 8.1 | Shah's OA 8.2 (book website) | ⚠️ must be downloaded from the publisher site; **will not be fabricated** |
| `rock` | HoIDS HOP 8.3 | R datasets `rock` (BP Research / Katz) | ✅ public |
| restaurant / airline / movies | HoIDS HOP 8.1, 8.2, 8.4 | Shah OA 8.3, 8.4, 8.6 | optional |

---

## 5. Exercise → concept → implementation mapping

| Exercise | Concepts | Backend module | Frontend view |
|---|---|---|---|
| AC1, AC2, AC4, AC5 | AI vs ML, ML pipeline steps, regression vs classification, inference vs prediction | `exercises/ds4a/conceptual.py` (rule-based, answer key + reasoning) | ExercisesView (quiz mode) |
| AC3 | decision tree reading, majority-class root prediction, leaf counts | `ml/decision_tree.py` + `explainability/decision_tree_explainer.py` | DecisionTreeView |
| AC6 | depth vs interpretability/complexity, nested trees | `ml/decision_tree.py` (depths 1/5/7) | DecisionTreeView compare mode |
| AC7 | train/test, confusion matrix, accuracy/precision/recall/specificity | `ml/decision_tree.py` + `ml/metrics.py` | EvaluationView |
| AC8 | over/under/well-fitting from train vs test accuracy | `ml/metrics.py` | EvaluationView |
| Shah Ex 8.1 | OLS linear regression | `ml/regression.py` | TrainingView |
| Shah Ex 8.2, TiY 8.1, HOP 8.3 | batch gradient descent, MSE, partial derivatives, learning rate | `ml/gradient_descent.py` (NumPy, every iteration logged) | GradientDescentView |

---

## 6. Open questions / blockers (need a decision)

- **Q1 – Toolchain.** This PC has no Node.js, Docker Desktop is installed but not running, and the Python 3.12 install was interrupted (no `pip`). The FastAPI + Vue + PostgreSQL stack needs all three.
- **Q2 – Image-only content.** AC8's three confusion matrices, Table 8.3 and Figures 8.11/8.14–8.16 are images in the PDF. Rendering them needs a PDF renderer (e.g. `pymupdf` via pip).
- **Q3 – Second TiY** (see §3).
- **Q4 – File name spacing** in item 2 of the naming rule (`EmriMbiemri1, EmriMbiemri2` vs no space).

## 7. Time plan (today = Wed 4 Nov; submit by Tue 10 Nov)

| Day | Work |
|---|---|
| Wed 4 | Phase 1 (this doc) ✅ · toolchain · datasets · solve AC1–AC8 + Shah GD |
| Thu 5 | Backend: FastAPI, ML engine, explainability, DB + migrations, tests |
| Fri 6 | Frontend: Vue views for GD, trees, evaluation, exercises |
| Sat 7 | Playground (CSV upload), practice mode, end-to-end tests |
| Sun 8 | PowerPoint, AC solutions doc, TiY docs, paper summary |
| Mon 9 | Rehearsal, fixes, presenter guide, build ZIP |
| Tue 10 | **Email submission** (≥24 h before lecture) |

Priority rule: the four official deliverables come first; the app is supplementary.
