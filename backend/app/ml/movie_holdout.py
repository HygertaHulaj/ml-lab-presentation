"""Back to the movies (Shah, HoIDS Hands-On Problem 8.4, p. 233) inside DS4A §8.4: fitted R² versus held-out evidence.

The Movies worked example reports R² on the same movies each model was fitted to (in-sample). Here the same complete
observations are split once, with a fixed seed, into training and held-out movies. Each model is fitted on the training
movies only and then scored on movies it never saw, next to a no-information baseline that always predicts the training
mean. Because one small test set is noisy, the held-out R² of the budget model is also reported across many seeds.
No FastAPI imports. Deterministic.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

CANDIDATES = ["budget", "aggregate_followers", "likes", "dislikes", "comments"]
MODELS = [
    {"id": "budget", "label": "Budget alone", "predictors": ["budget"]},
    {"id": "a", "label": "(a) budget + followers", "predictors": ["budget", "aggregate_followers"]},
    {"id": "b", "label": "(b) + likes, dislikes, comments", "predictors": CANDIDATES},
]


def _fit(X: np.ndarray, y: np.ndarray) -> np.ndarray:
    A = np.column_stack([np.ones(len(y)), X])
    return np.linalg.lstsq(A, y, rcond=None)[0]


def _predict(beta: np.ndarray, X: np.ndarray) -> np.ndarray:
    return beta[0] + X @ beta[1:]


def _r2(y: np.ndarray, yhat: np.ndarray) -> float:
    """Coefficient of determination against the mean of the movies being scored (can be negative on new data)."""
    return 1.0 - float(np.sum((y - yhat) ** 2)) / float(np.sum((y - y.mean()) ** 2))


def _split(n: int, test_fraction: float, seed: int) -> tuple[np.ndarray, np.ndarray]:
    perm = np.random.default_rng(seed).permutation(n)
    k = int(round(n * test_fraction))
    return np.sort(perm[k:]), np.sort(perm[:k])


def movie_holdout(df: pd.DataFrame, *, seed: int = 42, test_fraction: float = 0.3, n_repeats: int = 50) -> dict:
    d = df.dropna(subset=["ratings", *CANDIDATES]).reset_index(drop=True)
    y = d["ratings"].to_numpy(float)
    tr, te = _split(len(d), test_fraction, seed)
    baseline = float(np.mean((y[te] - y[tr].mean()) ** 2))
    models = []
    for m in MODELS:
        X = d[m["predictors"]].to_numpy(float)
        all_beta = _fit(X, y)
        beta = _fit(X[tr], y[tr])
        models.append({
            **m,
            "fitted_r2_all": _r2(y, _predict(all_beta, X)),           # what the worked example showed: same movies as the fit
            "train_r2": _r2(y[tr], _predict(beta, X[tr])),
            "train_mse": float(np.mean((y[tr] - _predict(beta, X[tr])) ** 2)),
            "test_r2": _r2(y[te], _predict(beta, X[te])),
            "test_mse": float(np.mean((y[te] - _predict(beta, X[te])) ** 2)),
        })
    # sensitivity of the budget model's held-out R² to which movies happen to be held out
    xb = d[["budget"]].to_numpy(float)
    reps = []
    for s in range(n_repeats):
        a, b = _split(len(d), test_fraction, s)
        reps.append(_r2(y[b], _predict(_fit(xb[a], y[a]), xb[b])))
    beta_b = _fit(xb[tr], y[tr])
    in_test = np.zeros(len(d), bool)
    in_test[te] = True
    labels = d["movie"].astype(str).str.strip().tolist() if "movie" in d.columns else [f"Movie {i + 1}" for i in range(len(d))]
    return {
        "source": "Shah, HoIDS Hands-On Problem 8.4 (p. 233), UCI CSM dataset 2014–2015; complete observations only",
        "n": int(len(d)), "n_train": int(len(tr)), "n_test": int(len(te)), "seed": seed, "test_fraction": test_fraction,
        "baseline_test_mse": baseline,
        "models": models,
        "budget_test_r2_over_seeds": {"seeds": n_repeats, "min": float(np.min(reps)), "median": float(np.median(reps)), "max": float(np.max(reps))},
        "movies": [{"label": labels[i], "budget": float(xb[i, 0]), "rating": float(y[i]), "set": "test" if in_test[i] else "train",
                    "budget_prediction": float(_predict(beta_b, xb[i:i + 1])[0])} for i in range(len(d))],
    }
