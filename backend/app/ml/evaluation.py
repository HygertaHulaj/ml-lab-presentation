"""DS4A section 8.4 "Machine Learning Method Evaluation" (book pp. 380–388): every number the presentation shows.

- Table 8.3 is recomputed: a decision tree (max depth 5, min n 10) trained on the book's official car seat training
  split (319 stores) and applied to its test split (81 stores) gives exactly the book's TP 22 / FP 11 / FN 11 / TN 37.
- Regression metrics (MSE, R²) of a regression tree on `sales`, on the same split.
- "No Free Lunch": several methods on several problems; the best one changes with the problem.
- Overfitting / underfitting: (a) Fig. 8.17 rebuilt on seeded synthetic data (the book's figure is adapted from ISLR,
  also simulated), spline models of increasing flexibility with training and test MSE; (b) the same effect on the real
  car seat data, tree depth vs training and test accuracy.
- The Try It Yourself confusion matrices (p. 388) are the book's own numbers; their accuracies are computed here.
No FastAPI imports.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.model_selection import KFold, StratifiedKFold
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.pipeline import make_pipeline as sk_pipeline
from sklearn.preprocessing import PolynomialFeatures, SplineTransformer

from .characteristics import SCHEMAS
from .decision_tree import build_tree, fit_tree_pipeline
from .preprocessing import make_pipeline

NUM = [c for c in SCHEMAS["carseats"]["numeric"] if c != "sales"]
CAT = [c for c in SCHEMAS["carseats"]["categorical"] if c != "sales_cat"]
FEATURES = NUM + CAT  # every genuine explanatory variable (no surrogates of the response, Quick Tip p. 370)
TABLE_8_3_TREE = {"max_depth": 5, "min_n": 10}
CV_FOLDS = 5

# Try It Yourself, p. 388: the book's matrices, rows = actual (0, 1), columns = predicted (0, 1). Positive class = 1.
BOOK_FIT_MODELS = [
    {"model": 1, "training": [[400, 0], [0, 386]], "testing": [[44, 60], [56, 40]]},
    {"model": 2, "training": [[310, 90], [142, 244]], "testing": [[72, 31], [31, 66]]},
    {"model": 3, "training": [[400, 0], [386, 0]], "testing": [[100, 0], [100, 0]]},
]


def r4(x: float) -> float:
    return round(float(x), 4)


def binary_metrics(tp: int, fp: int, fn: int, tn: int) -> dict:
    n = tp + fp + fn + tn
    return {
        "tp": tp, "fp": fp, "fn": fn, "tn": tn, "n": n,
        "accuracy": r4((tp + tn) / n), "misclassification": r4((fp + fn) / n),
        "precision": r4(tp / (tp + fp)) if tp + fp else None,
        "recall": r4(tp / (tp + fn)) if tp + fn else None,
        # standard definition: share of actual negatives predicted negative
        "specificity": r4(tn / (tn + fp)) if tn + fp else None,
        # the formula as printed on p. 383 (TN / (TN + FN)); equal here because FP = FN
        "specificity_book_formula": r4(tn / (tn + fn)) if tn + fn else None,
    }


def classification_eval(train: pd.DataFrame, test: pd.DataFrame) -> dict:
    p = fit_tree_pipeline(train[FEATURES], train["sales_cat"], NUM, CAT, "classification",
                          max_depth=TABLE_8_3_TREE["max_depth"], min_samples_split=TABLE_8_3_TREE["min_n"])
    pred, act = p.predict(test[FEATURES]), test["sales_cat"].to_numpy()
    tp = int(((pred == "High") & (act == "High")).sum()); fp = int(((pred == "High") & (act == "Low")).sum())
    fn = int(((pred == "Low") & (act == "High")).sum()); tn = int(((pred == "Low") & (act == "Low")).sum())
    return {
        **TABLE_8_3_TREE, "positive": "High", "n_train": int(len(train)), "n_test": int(len(test)),
        "train_accuracy": r4((p.predict(train[FEATURES]) == train["sales_cat"]).mean()),
        "metrics": binary_metrics(tp, fp, fn, tn),
        "stores": [{"actual": a, "predicted": b} for a, b in zip(act.tolist(), pred.tolist())],
    }


def _reg_scores(y: np.ndarray, yhat: np.ndarray) -> dict:
    resid = y - yhat
    return {"mse": r4(np.mean(resid ** 2)), "r2": r4(1 - np.sum(resid ** 2) / np.sum((y - y.mean()) ** 2))}


def regression_eval(train: pd.DataFrame, test: pd.DataFrame) -> dict:
    p = fit_tree_pipeline(train[FEATURES], train["sales"], NUM, CAT, "regression",
                          max_depth=TABLE_8_3_TREE["max_depth"], min_samples_split=TABLE_8_3_TREE["min_n"])
    y, yhat = test["sales"].to_numpy(float), p.predict(test[FEATURES])
    ytr = train["sales"].to_numpy(float)
    return {
        **TABLE_8_3_TREE, "target": "sales", "unit": "thousand units",
        "test": _reg_scores(y, yhat), "train": _reg_scores(ytr, p.predict(train[FEATURES])),
        "baseline_mse": r4(np.mean((y - ytr.mean()) ** 2)),  # always predicting the training mean
        "points": [{"actual": r4(a), "predicted": r4(b)} for a, b in zip(y, yhat)],
    }


def _curve_data(seed: int = 1, n_train: int = 50, n_test: int = 2000, sd: float = 1.0):
    rng = np.random.default_rng(seed)
    xtr = np.sort(rng.uniform(0, 100, n_train)); ytr = _true_f(xtr) + rng.normal(0, sd, n_train)
    xte = rng.uniform(0, 100, n_test); yte = _true_f(xte) + rng.normal(0, sd, n_test)
    return xtr, ytr, xte, yte


def no_free_lunch(train: pd.DataFrame, test: pd.DataFrame) -> list[dict]:
    """Same methods, three problems: the best method changes with the problem and the data (p. 384)."""
    xtr, ytr, xte, yte = _curve_data()
    ctr, cte = pd.DataFrame({"x": xtr, "y": ytr}), pd.DataFrame({"x": xte, "y": yte})
    problems = [
        ("Car seats: High or Low sales?", "classification", train, test, "sales_cat", NUM, CAT),
        ("Car seats: how many thousand units?", "regression", train, test, "sales", NUM, CAT),
        ("A curved relationship (Fig. 8.17 data, synthetic)", "regression", ctr, cte, "y", ["x"], []),
    ]
    out = []
    for title, task, tr, te, target, num, cat in problems:
        if task == "classification":
            methods = {"Decision tree": build_tree(task, max_depth=5, min_samples_split=10),
                       "Logistic regression": LogisticRegression(max_iter=2000),
                       "k-nearest neighbours (k = 5)": KNeighborsClassifier(5)}
        else:
            methods = {"Decision tree": build_tree(task, max_depth=5, min_samples_split=10),
                       "Linear regression": LinearRegression(),
                       "k-nearest neighbours (k = 5)": KNeighborsRegressor(5)}
        rows = []
        for name, est in methods.items():
            pipe = make_pipeline(est, num, cat, scale=name != "Decision tree")
            pipe.fit(tr[num + cat], tr[target])
            pr = pipe.predict(te[num + cat])
            if task == "classification":
                rows.append({"method": name, "metric": "accuracy", "value": r4((pr == te[target].to_numpy()).mean())})
            else:
                rows.append({"method": name, "metric": "mse", "value": r4(np.mean((te[target].to_numpy(float) - pr) ** 2))})
        best = (max if task == "classification" else min)(rows, key=lambda r: r["value"])["method"]
        out.append({"problem": title, "task": task, "n_train": int(len(tr)), "n_test": int(len(te)), "results": rows, "best": best})
    return out


def _true_f(x: np.ndarray) -> np.ndarray:
    """A curved true relationship shaped like the book's Fig. 8.17 (rises, peaks near x = 70, falls)."""
    return 4 + 5.4 * np.exp(-(((x - 70) / 30) ** 2))


def _spline(df_: int):
    """A model with df_ parameters: a line (2), a parabola (3), then cubic regression splines (n_knots + 2)."""
    if df_ <= 2:
        return LinearRegression()
    if df_ == 3:
        return sk_pipeline(PolynomialFeatures(2, include_bias=False), LinearRegression())
    return sk_pipeline(SplineTransformer(n_knots=df_ - 2, degree=3, include_bias=False, extrapolation="linear"), LinearRegression())


def fit_curve(seed: int = 1, n_train: int = 50, n_test: int = 2000, sd: float = 1.0,
              simple: int = 2, flexible: int = 23, max_df: int = 25) -> dict:
    """Fig. 8.17, recomputed: training points, the true curve, three fitted models and MSE vs flexibility."""
    xtr, ytr, xte, yte = _curve_data(seed, n_train, n_test, sd)
    grid = np.linspace(0, 100, 201)
    sweep, curves = [], {}
    folds = list(KFold(CV_FOLDS, shuffle=True, random_state=seed).split(xtr))
    for d in range(2, max_df + 1):
        m = _spline(d).fit(xtr[:, None], ytr)
        tr_mse = float(np.mean((ytr - m.predict(xtr[:, None])) ** 2))
        te_mse = float(np.mean((yte - m.predict(xte[:, None])) ** 2))
        cv = [float(np.mean((ytr[v] - _spline(d).fit(xtr[f, None], ytr[f]).predict(xtr[v, None])) ** 2)) for f, v in folds]
        sweep.append({"complexity": d, "train_mse": r4(tr_mse), "cv_mse": r4(np.mean(cv)), "test_mse": r4(te_mse)})
        curves[d] = [r4(v) for v in m.predict(grid[:, None])]
    # model SELECTION uses cross-validation on the training points only; the test MSE is reported, never used to choose
    best = min(sweep, key=lambda s: s["cv_mse"])["complexity"]
    lowest_test = min(sweep, key=lambda s: s["test_mse"])["complexity"]  # for comparison only (what the book's Fig. 8.21 shows)
    shown = (simple, best, flexible)  # the gold, blue and green models of Fig. 8.17; blue = chosen by cross-validation
    names = dict(zip(shown, ["underfit", "well fitted", "overfit"]))
    return {
        "seed": seed, "noise_sd": sd, "irreducible_mse": r4(sd ** 2), "synthetic": True,
        "train": [{"x": r4(a), "y": r4(b)} for a, b in zip(xtr, ytr)],
        "grid": [r4(v) for v in grid], "truth": [r4(v) for v in _true_f(grid)],
        "models": [{"complexity": d, "label": names[d], "curve": curves[d], **next(s for s in sweep if s["complexity"] == d)} for d in shown],
        "sweep": sweep, "best_complexity": best, "lowest_test_complexity": lowest_test,
        "selection": f"{CV_FOLDS}-fold cross-validation on the {n_train} training points; test MSE is the final check only",
        "curves": [{"complexity": d, "curve": curves[d]} for d in sorted(curves)],  # every model, for the slider
    }


def depth_sweep(train: pd.DataFrame, test: pd.DataFrame, max_depth: int = 12) -> list[dict]:
    """Real data: training accuracy keeps rising with depth; test accuracy does not.
    `cv_accuracy` = 5-fold stratified cross-validation inside the training stores: the basis for CHOOSING a depth."""
    rows = []
    Xtr, ytr = train[FEATURES].reset_index(drop=True), train["sales_cat"].reset_index(drop=True)
    folds = list(StratifiedKFold(CV_FOLDS, shuffle=True, random_state=42).split(Xtr, ytr))
    for d in range(1, max_depth + 1):
        p = fit_tree_pipeline(Xtr, ytr, NUM, CAT, "classification", max_depth=d, min_samples_split=2)
        cv = [float((fit_tree_pipeline(Xtr.iloc[f], ytr.iloc[f], NUM, CAT, "classification", max_depth=d, min_samples_split=2)
                     .predict(Xtr.iloc[v]) == ytr.iloc[v]).mean()) for f, v in folds]
        rows.append({"depth": d, "train_accuracy": r4((p.predict(Xtr) == ytr).mean()), "cv_accuracy": r4(np.mean(cv)),
                     "test_accuracy": r4((p.predict(test[FEATURES]) == test["sales_cat"]).mean())})
    return rows


def depth_selection(rows: list[dict], n_train: int) -> dict:
    """Choose the depth by cross-validated accuracy (ties → the simpler tree); then report its test accuracy once."""
    best = max(rows, key=lambda r: (r["cv_accuracy"], -r["depth"]))
    return {"selected_depth": best["depth"], "cv_accuracy": best["cv_accuracy"], "test_accuracy": best["test_accuracy"],
            "criterion": f"{CV_FOLDS}-fold stratified cross-validation within the {n_train} training stores"}


def fit_exercise() -> list[dict]:
    """p. 388: accuracy = (TP + TN) / total for each book matrix, and the verdict that follows from the pair."""
    out = []
    for m in BOOK_FIT_MODELS:
        acc = {}
        for k in ("training", "testing"):
            (tn, fp), (fn, tp) = m[k]
            acc[k] = r4((tp + tn) / (tp + tn + fp + fn))
        tr, te = acc["training"], acc["testing"]
        verdict = "overfitted" if tr - te > 0.15 else "underfitted" if tr < 0.6 else "well-fitted"
        out.append({**m, "train_accuracy": tr, "test_accuracy": te, "verdict": verdict,
                    "fit_training": verdict != "underfitted", "predicted_test": verdict == "well-fitted"})
    return out


def evaluation_bundle(train: pd.DataFrame, test: pd.DataFrame) -> dict:
    return {
        "classification": classification_eval(train, test),
        "book_table_8_3": {"tp": 22, "fp": 11, "fn": 11, "tn": 37},
        "regression": regression_eval(train, test),
        "no_free_lunch": no_free_lunch(train, test),
        "fit_curve": fit_curve(),
        "depth_sweep": (ds := depth_sweep(train, test)),
        "depth_selection": depth_selection(ds, len(train)),
        "fit_exercise": fit_exercise(),
    }
