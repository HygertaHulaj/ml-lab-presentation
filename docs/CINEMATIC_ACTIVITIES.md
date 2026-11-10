# Cinematic activities — end-of-chapter exercises as short films

**Routes:** `/activities` (hub) and `/activities/:id` (player). Both are full screen and lazy-loaded, with the presentation's theme tokens (key L switches to light).
**Code:** `frontend/src/activities/`:
- `types.ts`, `timing.ts` and `registry.ts`
- `ActivityPlayer.vue`, `TryPanel.vue` and `SolutionPanel.vue`
- `visuals/` (shared: `SortBoard`, `StarCards`)
- `ds4a/` (per-activity visuals and scripts)

**Data:** the existing Exercise Academy solvers (`POST /api/v1/exercises/{id}/solve`, `backend/app/exercises/`). The activities add no new computation and invent no values.
**Links:** the hub, the Exercise Academy detail page ("▶ Watch as a cinematic activity"), and the presentation's Algorithm Lab card "Apply the concepts".

## The player
- **Story:** scenes of caption lines (captions always on). The playhead `t` is the only thing GSAP moves. `timing.ts` maps `t` to (scene, p, line, lp), and each visual is a pure function of these.
  - Keys: Space play/pause · ←/→ previous/next caption · PageUp/PageDown previous/next scene · 1/2/3 Story/Try/Solution · F full screen · L theme · Esc hub.
  - Reduced motion: no autoplay. → steps caption by caption and shows each end state.
- **Try:** a choice or a number for each item. "Check" compares with the solver's answers (numbers to two decimals) and shows why.
- **Solution:** each computed answer with its explanation, the interpretation, common mistakes, data notes, and the Python that reproduces it.

## DS4A Chapter 8 "Applying the Concepts" (pp. 398–401)
| # | Activity | Visual | Real numbers (from the solver) |
|---|---|---|---|
| 1 | Identify Artificial Intelligence | `SortBoard`: 8 objects into AI / Not AI | 4 AI, 4 not AI |
| 2 | Identify Data Ingestion, Data Analysis, and Results | `SortBoard`: 9 features of the Physical Fitness Assistant into the 3 steps | 4 / 3 / 2 |
| 3 | Reading a Decision Tree (college) | `Ac3Visual`: the real one-split tree; 777 college dots flow into the leaves | split f_undergrad ≤ 2995; 666 / 777 correct |
| 4 | Regression versus Classification | `SortBoard`: 6 responses | 3 regression, 3 classification |
| 5 | Inference versus Prediction | `Ac5Visual`: the book's fill-in sentences complete as narrated | regression/inference; classification/both; classification/prediction |
| 6 | Interpretability versus Complexity (penguins) | `Ac6Visual`: depth 1, 5, 7 trees grow side by side | top split flipper_length_mm; 262 / 333 vs 333 / 333; the depth-7 tree equals depth 5 |
| 7 | Accuracy, Precision, Recall, Specificity (car seats) | `Ac7Visual`: depth-1 tree; 81 test stores fill the confusion matrix | TP 12, FP 5, FN 21, TN 43 → 0.68 / 0.71 / 0.36 / 0.90 |
| 8 | Overfitted, Underfitted, Well-Fitted | `Ac8Visual`: the book's six matrices, the accuracy column, train vs test bars, verdicts | 0.80 / 0.64 overfitted; 0.72 / 0.65 well-fitted; 0.59 / 0.59 underfitted |

## Shah (HoIDS) Chapter 8 Hands-On Problems (pp. 231–233)
The solvers live in `backend/app/exercises/hoids/chapter8_problems.py` (8.2, 8.4) and `chapter8.py` (8.3). `ols_table` gives an R-style summary: estimate, standard error, t, p, R², adjusted R² and F.

| # | Problem | Visual | Real numbers (from the solver) |
|---|---|---|---|
| 8.2 | Linear regression: Airline Costs | `Hop82Visual`: 31 airlines pour in, the model-1 line with daily flight time held at its mean, the coefficient table, model 2 with the largest carriers labelled, the insight | customers = −7,792 + 183.3·length − 213·daily time, R² 0.622 (length p < 0.001, daily time p = 0.88); assets = −98.5 + 0.0217·customers, R² 0.819 |
| 8.3 | Gradient descent: rock samples | `Hop83Visual`: correlations, predicted vs actual, the cost curve, OLS vs GD table | peri r = −0.74; R² 0.704; GD converged after 1,068 iterations at the OLS coefficients |
| 8.4 | Gradient descent: movies and social media | `Hop84Visual`: model (a), R² (a) vs (b), the five correlations, the GD line tilting with the recorded iterations beside the cost, GD vs OLS | 195 complete movies: R² 0.105 → 0.219 (adjusted 0.096 → 0.199); budget is the best predictor (r = 0.323); GD = OLS, +0.0057 rating per $1M |

**3D cinematic lessons** (like K-Means: Story, Explore and Math modes, at `/lessons/shah-8-2-airlines`, `/lessons/shah-8-3-rock` and `/lessons/shah-8-4-movies`):
- **8.2:** a regression plane tilts into place through 31 airlines in 3D; then a line plus the cost bowl for assets ~ customers.
- **8.3:** the plane over perimeter and area (shape held at its mean) while gradient descent updates all four θ.
- **8.4:** the plane for (a); the R² comparison for (b); for (c), the line on budget with a ball rolling down the real cost surface.

Explore re-runs gradient descent with any learning rate. α = 2.2 diverges.

Problem 8.1 (restaurant ratings) uses the book's OA 8.3 `ratings.tsv`: 15 restaurants with average food, ambience and service ratings and the overall rating (registry key `restaurant_ratings`). Activity `hoids-hop8-1` (model form, parameter sets tried by hand with their squared errors, the fitted table, the report) and lesson `shah-8-1-restaurants` (the plane rating ~ food + service with ambience held at its mean, then food + service vs + ambience).
The book's online-appendix list for Chapter 8 (seen in the user's copy) names the files OA 8.1–8.6. Status:
- **OA 8.3 · 8.1 restaurant ratings:** `backend/datasets/raw/ratings.tsv` (supplied by the user, 15 restaurants). **OA 8.1 · Examples 8.1–8.2:** `backend/datasets/raw/regression.csv`, identical to the transcribed Table 8.2.
- **OA 8.4 · 8.2 Airline Costs:** `backend/datasets/raw/airline_costs.dat` + `airline_costs.txt` (column map). Source: Proctor & Duncan (1954), via L. Winner's UF datasets. The URL the book prints has moved, so the file was retrieved from the Internet Archive snapshot of that exact URL (2018-03-25). 31 airlines. Registry key `airline_costs`; "customers served" is the file's "population served" column.
- **OA 8.5 · 8.3 rock:** `backend/datasets/raw/rock.csv` (48 samples). Registry key `rock`.
- **OA 8.6 · 8.4 movies:** `backend/datasets/raw/csm_2014_2015.xlsx`, the UCI dataset 424 at the URL the book prints (CC BY 4.0), plus `csm_2014_2015.csv`, converted cell by cell with the standard library. 231 movies, although the UCI page says 217. There are missing values in aggregate_followers (35), screens (10) and budget (1). Registry key `csm_movies`.

## Tests
- `frontend/tests/activities.spec.ts`: timing, sorting, and every script and Try item, built from real solver fixtures in `tests/fixtures/activities/`.
- `frontend/e2e/activities.spec.ts`: the hub and links; Story play, stepping and modes; for each activity, every scene renders, Try reaches full marks with the solver's answers, the Solution shows them, and the AC 3 and AC 7 screen numbers equal the API.
