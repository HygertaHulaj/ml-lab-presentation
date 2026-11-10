"""HoIDS (Shah) Chapter 8 — worked examples, the Try It Yourself, and Hands-On Problem 8.3.

Only ONE Try It Yourself exists in Chapter 8 (TiY 8.1). Per the students' decision, the second
presenter uses Hands-On Problem 8.3, which is labelled as a Hands-On Problem, not a TiY.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from ...datasets_registry import load_builtin
from ...ml import gradient_descent as gd
from ...ml.metrics import regression_metrics
from ...ml.preprocessing import DataValidationError
from ...ml.regression import simple_ols_by_hand
from ..base import Exercise, Question, SimilarProblem

HOIDS = "A Hands-On Introduction to Data Science (Shah)"


def _xy(frame: pd.DataFrame, x: str, y: str) -> tuple[np.ndarray, np.ndarray]:
    for c in (x, y):
        if c not in frame.columns:
            raise DataValidationError(f"Column '{c}' not found. Available: {list(frame.columns)}")
        if not pd.api.types.is_numeric_dtype(frame[c]):
            raise DataValidationError(f"Column '{c}' must be numeric.")
    d = frame[[x, y]].dropna()
    if len(d) < 3:
        raise DataValidationError("Need at least 3 complete (x, y) rows.")
    return d[x].to_numpy(float), d[y].to_numpy(float)


def simple_gd_report(x, y, *, learning_rate, iterations, w0=0.0, b0=0.0, loss="half_mse",
                     tolerance=None) -> dict:
    ols = simple_ols_by_hand(x, y)
    res = gd.run_gradient_descent(x, y, learning_rate=learning_rate, iterations=iterations,
                                  w0=w0, b0=b0, loss=loss, tolerance=tolerance)
    first = gd.iteration_detail(x, y, w0, b0, learning_rate, loss)
    pred = res.w * x + res.b
    return {
        "ols": ols,
        "gradient_descent": res.to_dict(),
        "first_iteration_detail": first,
        "comparison": {"gd_slope": res.w, "gd_intercept": res.b, "ols_slope": ols["slope"],
                       "ols_intercept": ols["intercept"], "slope_diff": res.w - ols["slope"],
                       "intercept_diff": res.b - ols["intercept"]},
        "gd_fit_metrics": regression_metrics(y, pred) if np.all(np.isfinite(pred)) else None,
        "ols_fit_metrics": regression_metrics(y, ols["slope"] * x + ols["intercept"]),
        "book_r_cost_at_iteration_1": gd.book_r_cost(x, y, res.history[0].w_next, res.history[0].b_next) if res.history else None,
        "data": {"x": x.tolist(), "y": y.tolist()},
    }


# ======================================================================= Example 8.1
def _solve_ex81(p):
    df = load_builtin("shah_regression")
    x, y = _xy(df, "x", "y")
    ols = simple_ols_by_hand(x, y)
    lr = LinearRegression().fit(x.reshape(-1, 1), y)
    return {"answers": [
        {"id": "1", "answer": f"y = {ols['slope']:.3f}x {ols['intercept']:+.3f}",
         "explanation": f"Slope = Sxy/Sxx = {ols['Sxy']:.3f}/{ols['Sxx']:.3f} = {ols['slope']:.4f}; intercept = "
                        f"{ols['y_mean']:.2f} - {ols['slope']:.4f}×{ols['x_mean']:.2f} = {ols['intercept']:.4f}. "
                        "The book's R output: (Intercept) -10.263, x 3.977."}],
        "ols": ols, "sklearn": {"slope": float(lr.coef_[0]), "intercept": float(lr.intercept_)},
        "metrics": regression_metrics(y, lr.predict(x.reshape(-1, 1))), "data": {"x": x.tolist(), "y": y.tolist()}}


EX81 = Exercise(
    id="hoids-ex8-1", book="HoIDS", chapter=8, exercise_number="Hands-On Example 8.1",
    title="Linear Regression (regression.csv)", category="Regression", source_page="pp. 217–219", kind="computational",
    description="Fit a straight line y = mx + b to the 20 points of Table 8.2 (regression.csv) using linear regression.",
    required_dataset="shah_regression",
    concepts=["linear regression", "slope", "intercept", "least squares"],
    understand="Least squares picks the line that minimises the sum of squared vertical distances. For one predictor it has a closed-form solution.",
    questions=[Question("1", "Find the regression line for Table 8.2.")],
    interpretation="Each extra unit of x is associated with ≈3.98 more units of y. The negative intercept has no practical meaning here (x starts at 1).",
    common_mistakes=["Interpreting the intercept outside the data range.", "Thinking 'linear' means the data must be perfectly on a line."],
    python_code='''import numpy as np
from sklearn.linear_model import LinearRegression
x = np.arange(1, 21).reshape(-1, 1)
y = np.array([3, 4, 8, 4, 6, 9, 8, 12, 15, 26, 35, 40, 45, 54, 49, 59, 60, 62, 63, 68])
model = LinearRegression().fit(x, y)
print(model.intercept_, model.coef_[0])   # -10.263..., 3.977...
''',
    similar=[SimilarProblem("Fit a line to rock: perm ~ area. Is the relationship strong?", "Compute in Training Studio", "Supplementary practice."),
             SimilarProblem("If the slope is 3.977, how much does ŷ change when x increases from 10 to 12?", "≈ 7.95", "2 × 3.977.")],
    solver=_solve_ex81,
)


# ======================================================================= Example 8.2
def _solve_ex82(p):
    df = load_builtin("shah_regression")
    x, y = _xy(df, "x", "y")
    rep = simple_gd_report(x, y, learning_rate=float(p["learning_rate"]), iterations=int(p["iterations"]),
                           w0=float(p["w0"]), b0=float(p["b0"]), loss=p["loss"], tolerance=None)
    g = rep["gradient_descent"]
    rep["answers"] = [{"id": "1", "answer": f"intercept = {g['b']:.4f}, slope = {g['w']:.4f} after {g['iterations_run']} iterations",
                       "explanation": f"OLS gives intercept {rep['ols']['intercept']:.4f}, slope {rep['ols']['slope']:.4f}. "
                                      "With α = 0.01 and 300 iterations (the book's settings) gradient descent has NOT yet reached "
                                      "the OLS intercept: x is not centred, so the intercept direction converges slowly. "
                                      "Increase iterations (e.g. 20,000) to see it converge."},
                      {"id": "2", "answer": f"Book's plotted cost at iteration 1 = {rep['book_r_cost_at_iteration_1']:.2f}",
                       "explanation": "The book's R cost `sum(X %*% theta - y)^2/(2*length(y))` squares the SUM of errors, not "
                                      "each error, because ^ applies to sum(...). That is why Figure 8.11 starts near 3000. "
                                      "The parameter updates are unaffected; only the plotted curve is."}]
    return rep


EX82 = Exercise(
    id="hoids-ex8-2", book="HoIDS", chapter=8, exercise_number="Hands-On Example 8.2",
    title="Gradient Descent (regression.csv)", category="Gradient descent", source_page="pp. 224–228", kind="computational",
    description="Initialise θ = (0, 0), α = 0.01, 300 iterations, and run batch gradient descent on Table 8.2, storing cost and θ at each step.",
    required_dataset="shah_regression",
    concepts=["cost function", "partial derivatives", "learning rate", "batch gradient descent", "convergence"],
    understand=("Gradient descent starts from a line (θ) and repeatedly moves θ against the gradient of the cost. "
                "Shah's cost J(θ) = 1/(2m) Σ (h(x)−y)² gives gradient (1/m) Σ (h(x)−y)·x_j (eq. 8.6) and update eq. 8.7."),
    questions=[Question("1", "Run gradient descent with the book's settings and report θ."),
               Question("2", "Explain the cost curve in Figure 8.11.")],
    interpretation="The loss drops sharply in the first iterations (slope is learnt quickly) and then slowly as the intercept creeps towards its optimum.",
    common_mistakes=["Assuming 300 iterations means convergence.", "Using a learning rate that is too large (the loss explodes — try α = 0.02 on this data)."],
    python_code='''import numpy as np
x = np.arange(1, 21); y = np.array([3,4,8,4,6,9,8,12,15,26,35,40,45,54,49,59,60,62,63,68])
X = np.column_stack([np.ones_like(x), x]).astype(float)   # x0 = 1 for the intercept
theta = np.zeros(2); alpha = 0.01
for i in range(300):
    error = X @ theta - y                 # h(x) - y
    delta = X.T @ error / len(y)          # gradient (eq. 8.6)
    theta = theta - alpha * delta         # update (eq. 8.7)
cost = np.sum((X @ theta - y) ** 2) / (2 * len(y))   # correct cost: sum of SQUARED errors
print(theta, cost)                        # [-5.009  3.592]
''',
    similar=[SimilarProblem("Run 20,000 iterations with α = 0.01. How close is θ to OLS?", "Within ~0.01", "Use the parameters panel."),
             SimilarProblem("Set α = 0.02. What happens?", "The loss diverges", "Too large a step overshoots the minimum each iteration.")],
    parameters={"learning_rate": 0.01, "iterations": 300, "w0": 0.0, "b0": 0.0, "loss": "half_mse"}, solver=_solve_ex82,
    notes=["Verified: final θ after 300 iterations = (−5.009, 3.592); OLS = (−10.263, 3.977).",
           "Erratum: the book's R cost function computes (Σe)²/2n instead of Σe²/2n."],
)


# ======================================================================= TiY 8.1
def _solve_tiy81(p):
    frame = p.get("_frame")
    if frame is None:
        raise DataValidationError(
            "TiY 8.1 needs the kangaroo nasal-dimension data from Shah's online resources (OA 8.2). "
            "It is not bundled because it could not be obtained from an authentic source. Upload the CSV under "
            "Datasets → Upload, then choose it here with dataset_id, x_column (nasal width) and y_column (nasal length).")
    x, y = _xy(frame, p["x_column"], p["y_column"])
    rep = simple_gd_report(x, y, learning_rate=float(p["learning_rate"]), iterations=int(p["iterations"]),
                           loss=p["loss"], tolerance=float(p["tolerance"]))
    if p.get("standardize", True):
        # Centre/scale x so gradient descent converges quickly, then map back to original units.
        mv = gd.run_multivariate_gd(x.reshape(-1, 1), y, learning_rate=0.1, iterations=int(p["iterations"]))
        rep["standardized_gd"] = {"intercept": mv["intercept"], "slope": mv["coefficients"][0],
                                  "iterations_run": mv["iterations_run"], "stop_reason": mv["stop_reason"]}
    o, g = rep["ols"], rep["gradient_descent"]
    rep["answers"] = [
        {"id": "1", "answer": f"nasal_length = {o['intercept']:.3f} + {o['slope']:.4f} × nasal_width",
         "explanation": "Linear model fitted by least squares (closed form)."},
        {"id": "2", "answer": f"GD: intercept {g['b']:.3f}, slope {g['w']:.4f} ({g['stop_reason']}, {g['iterations_run']} iterations)",
         "explanation": "Compare with the least-squares values; if they differ, gradient descent has not converged — raise the "
                        "iterations or use the standardized run."}]
    return rep


TIY81 = Exercise(
    id="hoids-tiy8-1", book="HoIDS", chapter=8, exercise_number="Try It Yourself 8.1",
    title="Gradient Descent — kangaroo nasal dimensions", category="Gradient descent", source_page="p. 228", kind="computational",
    description="Use the kangaroo nasal-dimension data (OA 8.2) to build a linear regression model predicting nasal length from "
                "nasal width. Then use gradient descent to find the optimal intercept and gradient (slope).",
    required_dataset="kangaroo nasal data (Shah OA 8.2) — user upload",
    concepts=["linear regression", "gradient descent", "convergence", "feature scaling"],
    understand="Same algorithm as Example 8.2 on real measurements. Nasal widths are large numbers (mm), so an unscaled gradient descent needs a very small α; standardizing x fixes this.",
    questions=[Question("1", "Build a linear regression model: nasal length from nasal width."),
               Question("2", "Use gradient descent to find the optimal intercept and slope.")],
    interpretation="When gradient descent converges, it reaches the same line as least squares; it is the general method used when no closed form exists.",
    common_mistakes=["Using α = 0.01 on unscaled millimetre data (diverges).", "Swapping x and y (the task predicts length FROM width)."],
    python_code='''import numpy as np, pandas as pd
df = pd.read_csv("kangaroo.csv")                 # from Shah OA 8.2
x, y = df["nasal_width"].to_numpy(float), df["nasal_length"].to_numpy(float)
z = (x - x.mean()) / x.std()                     # scale x so one alpha works
w, b, alpha = 0.0, 0.0, 0.1
for i in range(5000):
    error = (w * z + b) - y
    w -= alpha * np.mean(error * z)
    b -= alpha * np.mean(error)
slope = w / x.std(); intercept = b - w * x.mean() / x.std()   # back to mm
print(intercept, slope, np.polyfit(x, y, 1))                  # compare with least squares
''',
    similar=[SimilarProblem("HoIDS Hands-On Problem 8.3 (rock): gradient descent with three predictors.", "See HOP 8.3", "Presented by the second student."),
             SimilarProblem("Run TiY 8.1 unscaled with α = 0.01. What happens and why?", "Diverges", "Large x values make the gradient huge.")],
    parameters={"dataset_id": None, "x_column": "nasal_width", "y_column": "nasal_length",
                "learning_rate": 0.0000001, "iterations": 5000, "loss": "half_mse", "standardize": True, "tolerance": 1e-9},
    solver=_solve_tiy81,
    notes=["DATASET NOT BUNDLED: Shah's OA 8.2 file must be downloaded from the book's online resources (Cambridge). "
           "A candidate authentic source is the `kanga` data in the R package faraway (Andrews & Herzberg 1985), but it is "
           "not confirmed to be the same file, so it is not substituted."],
)


# ======================================================================= HOP 8.3
def _solve_hop83(p):
    df = load_builtin("rock")
    feats = ["area", "peri", "shape"]
    X, y = df[feats].to_numpy(float), df["perm"].to_numpy(float)
    lr = LinearRegression().fit(X, y)
    pred = lr.predict(X)
    mv = gd.run_multivariate_gd(X, y, learning_rate=float(p["learning_rate"]), iterations=int(p["iterations"]),
                                record_every=max(1, int(p["iterations"]) // 500))
    corr = {f: float(np.corrcoef(df[f], y)[0, 1]) for f in feats}
    m = regression_metrics(y, pred)
    return {"answers": [
        {"id": "1", "answer": {"intercept": float(lr.intercept_), "coefficients": dict(zip(feats, map(float, lr.coef_))),
                               "r2": m["r2"], "correlations_with_perm": corr},
         "explanation": f"OLS: perm = {lr.intercept_:.2f} + " + " + ".join(f"{c:.4f}·{f}" for f, c in zip(feats, lr.coef_)) +
                        f". R² = {m['r2']:.3f}: a linear model explains about {100 * m['r2']:.0f}% of the variation in permeability, "
                        "so the relationship is only partly linear (perm is very skewed: values from 6.3 to 1300)."},
        {"id": "2", "answer": {"intercept": mv["intercept"], "coefficients": dict(zip(feats, mv["coefficients"])),
                               "iterations_run": mv["iterations_run"], "stop_reason": mv["stop_reason"]},
         "explanation": "Gradient descent on standardized features (Shah eq. 8.7) converges to the same coefficients as OLS "
                        "once the cost stops changing."}],
        "ols_metrics": m, "gradient_descent": mv, "data_preview": df.head(10).to_dict(orient="records"),
        "fit": {"perm": y.tolist(), "predicted": pred.tolist()}}


HOP83 = Exercise(
    id="hoids-hop8-3", book="HoIDS", chapter=8, exercise_number="Hands-On Problem 8.3",
    title="Gradient Descent — petroleum rock samples", category="Gradient descent", source_page="p. 232", kind="computational",
    description="Using 48 rock samples (area, peri, shape, perm): first create a linear model and check whether perm has a linear "
                "relationship with the other three attributes; next use gradient descent to find the optimal intercept and gradient.",
    required_dataset="rock",
    concepts=["multiple linear regression", "gradient descent (multivariate)", "feature scaling", "R²"],
    understand="With three predictors, θ has four values. Gradient descent updates all of them simultaneously using eq. 8.7.",
    questions=[Question("1", "Fit a linear model perm ~ area + peri + shape and judge linearity."),
               Question("2", "Use gradient descent to find the optimal intercept and coefficients.")],
    interpretation="Both methods give the same coefficients; the moderate R² and skewed perm suggest a transformed model (e.g. log(perm)) could fit better.",
    common_mistakes=["Running gradient descent on unscaled features (area ≈ 10⁴, shape ≈ 0.1) — one α cannot suit both.",
                     "Reading coefficient size as importance when features are on different scales."],
    python_code='''import numpy as np, pandas as pd
rock = pd.read_csv("rock.csv")                       # R datasets::rock
X, y = rock[["area", "peri", "shape"]].to_numpy(float), rock["perm"].to_numpy(float)
mu, sd = X.mean(0), X.std(0)
Z = np.column_stack([np.ones(len(y)), (X - mu) / sd]) # x0 = 1, scaled features
theta, alpha = np.zeros(4), 0.1
for i in range(5000):
    theta -= alpha * Z.T @ (Z @ theta - y) / len(y)   # eq. 8.7 for all j at once
coef = theta[1:] / sd; intercept = theta[0] - np.sum(theta[1:] * mu / sd)
print(intercept, coef)
''',
    similar=[SimilarProblem("Repeat with log(perm) as the response. Does R² improve?", "Compute in Training Studio", "Supplementary."),
             SimilarProblem("Use only `peri` as predictor and run simple gradient descent.", "Use the GD Visualizer with dataset rock", "Supplementary.")],
    parameters={"learning_rate": 0.1, "iterations": 5000}, solver=_solve_hop83,
    notes=["This is an end-of-chapter Hands-On Problem, NOT a Try It Yourself (Chapter 8 contains only TiY 8.1).",
           "The rock data is R's built-in `datasets::rock`, which matches the description (48 samples, BP Research, Ronit Katz)."],
)

EXERCISES = [EX81, EX82, TIY81, HOP83]
