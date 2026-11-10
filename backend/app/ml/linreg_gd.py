"""Linear regression found by batch gradient descent, recorded as a trace for the cinematic lessons (Shah Ch. 8).

The model is h(x) = θ0 + Σ θj zj on standardized features zj = (xj − μj) / σj, cost J = (1/2m) Σ (h − y)² and the
update θj := θj − α (1/m) Σ (h − y) zj (HoIDS eqs. 8.4–8.7). Every frame the lesson shows is recorded here: θ in both
standardized and original units, J, the gradient, and, for display, the line or plane through the *shown* predictors
with any other predictors held at their means. The least-squares solution (normal equations) is the reference.
For one predictor the cost surface J(θ0, θ1) is sampled on a grid so the lesson can draw the bowl the descent rolls down.
No FastAPI imports. Deterministic.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

MAX_ITERATIONS = 20000
MAX_FRAMES = 70


def _frames_schedule(n_run: int) -> list[int]:
    """Iterations to show: every one of the first 12, then log-spaced up to the last (early steps move most)."""
    first = list(range(0, min(n_run, 12) + 1))
    if n_run <= 12:
        return first
    rest = np.unique(np.round(np.geomspace(12, n_run, MAX_FRAMES - len(first))).astype(int)).tolist()
    return sorted(set(first + rest + [n_run]))


def _ols(X: np.ndarray, y: np.ndarray) -> dict:
    A = np.column_stack([np.ones(len(y)), X])
    beta, *_ = np.linalg.lstsq(A, y, rcond=None)
    res = y - A @ beta
    sst = float(((y - y.mean()) ** 2).sum())
    r2 = 1 - float(res @ res) / sst
    n, k = A.shape
    return {"intercept": float(beta[0]), "coefficients": beta[1:].tolist(), "r2": r2,
            "adj_r2": 1 - (1 - r2) * (n - 1) / (n - k) if n > k else r2, "fitted": (A @ beta).tolist()}


def linreg_gd_trace(df: pd.DataFrame, *, predictors: list[str], response: str, shown: list[str] | None = None,
                    learning_rate: float = 0.1, iterations: int = 5000, tolerance: float = 1e-10,
                    label_column: str | None = None, compare: list[dict] | None = None,
                    complete_on: list[str] | None = None, rank_single: list[str] | None = None) -> dict:
    """`complete_on`: extra columns that must be present, so several models use exactly the same rows.
    `rank_single`: candidate predictors ranked by |sample correlation| with the response on those same rows."""
    shown = list(shown or predictors[:2])
    if not 1 <= len(shown) <= 2 or any(s not in predictors for s in shown):
        raise ValueError("`shown` must name one or two of the predictors.")
    if not 1 <= iterations <= MAX_ITERATIONS:
        raise ValueError(f"iterations must be between 1 and {MAX_ITERATIONS}.")
    if not 0 < learning_rate <= 5:
        raise ValueError("learning_rate must be in (0, 5].")
    needed = sorted({*predictors, response, *(complete_on or []), *(rank_single or []), *(v for c in (compare or []) for v in c["predictors"])})
    for c in needed:
        if c not in df.columns or not pd.api.types.is_numeric_dtype(df[c]):
            raise ValueError(f"Column '{c}' must exist and be numeric.")
    d = df.dropna(subset=needed).reset_index(drop=True)
    X = d[predictors].to_numpy(float)
    y = d[response].to_numpy(float)
    m = len(y)
    mu, sd = X.mean(0), X.std(0)
    if np.any(sd == 0):
        raise ValueError("A predictor is constant.")
    Z = np.column_stack([np.ones(m), (X - mu) / sd])

    theta = np.zeros(Z.shape[1])
    thetas, costs, grads = [], [], []
    stop, prev = "max_iterations", None
    for it in range(iterations + 1):
        err = Z @ theta - y
        cost = float(err @ err / (2 * m))
        grad = Z.T @ err / m
        thetas.append(theta.copy()); costs.append(cost); grads.append(grad.copy())
        if not np.isfinite(cost) or cost > 1e30:
            stop = "diverged"
            break
        if prev is not None and abs(prev - cost) < tolerance:
            stop = "converged"
            break
        if it == iterations:
            break
        prev = cost
        theta = theta - learning_rate * grad
    n_run = len(thetas) - 1

    held = [p for p in predictors if p not in shown]
    si = [predictors.index(s) for s in shown]
    hi = [predictors.index(h) for h in held]

    def to_original(th: np.ndarray) -> tuple[float, list[float]]:
        coefs = th[1:] / sd
        return float(th[0] - np.sum(th[1:] * mu / sd)), coefs.tolist()

    frames = []
    for k in _frames_schedule(n_run):
        th = thetas[k]
        b0, coefs = to_original(th)
        display_intercept = b0 + sum(coefs[j] * float(mu[j]) for j in hi)  # held predictors at their means
        frames.append({"iteration": k, "theta_std": [float(v) for v in th], "intercept": b0, "coefficients": coefs,
                       "display": {"intercept": display_intercept, "slopes": [coefs[j] for j in si]},
                       "cost": costs[k], "gradient_norm": float(np.linalg.norm(grads[k])), "gradient": [float(v) for v in grads[k]]})

    ols = _ols(X, y)
    ols["display"] = {"intercept": ols["intercept"] + sum(ols["coefficients"][j] * float(mu[j]) for j in hi),
                      "slopes": [ols["coefficients"][j] for j in si]}
    out = {
        "algorithm": "linreg_gd", "n": int(m), "n_dropped": int(len(df) - m), "response": response,
        "predictors": predictors, "shown": shown, "held_at_mean": held,
        "means": dict(zip(predictors, mu.tolist())), "sds": dict(zip(predictors, sd.tolist())),
        "learning_rate": float(learning_rate), "iterations_run": int(n_run), "stop_reason": stop,
        "points": {"x": [d[s].astype(float).tolist() for s in shown], "y": y.tolist(),
                   "labels": d[label_column].astype(str).str.strip().tolist() if label_column else None},
        "ols": ols, "frames": frames,
        "final": {"cost": costs[-1], "intercept": frames[-1]["intercept"], "coefficients": frames[-1]["coefficients"]},
        "initial_cost": costs[0],
    }
    # residuals are drawn only when every predictor is shown (otherwise the plane is a slice, not the full model)
    out["exact_display"] = not held
    if len(predictors) == 1:  # the bowl depends only on the data, so it is drawn for divergent runs too
        th_star = np.linalg.lstsq(Z, y, rcond=None)[0]
        # with a standardized predictor J(θ) = J* + ½‖θ − θ*‖², a circular bowl: sample the same radius in both directions,
        # wide enough to include the starting point θ = 0 with a margin
        R = max(1.2 * float(np.hypot(*th_star)), float(np.std(y)), 1e-6)
        g0 = np.linspace(th_star[0] - R, th_star[0] + R, 41)
        g1 = np.linspace(th_star[1] - R, th_star[1] + R, 41)
        A0, A1 = np.meshgrid(g0, g1, indexing="ij")
        z = Z[:, 1]
        # J(θ0, θ1) = (1/2m) Σ (θ0 + θ1 z − y)²; with standardized z (mean 0, var 1): expand to avoid a 41×41×m array
        Sy, Syy, Szy = y.sum(), (y ** 2).sum(), (z * y).sum()
        J = (m * A0 ** 2 + m * A1 ** 2 - 2 * A0 * Sy - 2 * A1 * Szy + Syy + 2 * A0 * A1 * z.sum()) / (2 * m)
        out["surface"] = {"theta0": g0.tolist(), "theta1": g1.tolist(), "cost": J.tolist(),
                          "minimum": {"theta0": float(th_star[0]), "theta1": float(th_star[1]),
                                      "cost": float(np.sum((Z @ th_star - y) ** 2) / (2 * m))}}
    # residual diagnostics of the full least-squares model (audit A8): R² alone cannot show curvature or unequal spread
    fitted = np.asarray(ols["fitted"])
    resid = y - fitted
    diag = {"fitted": fitted.tolist(), "residuals": resid.tolist(),
            "residual_sd": float(resid.std(ddof=X.shape[1] + 1)) if m > X.shape[1] + 1 else float(resid.std())}
    if np.all(y > 0):  # a transformation to test, not a conclusion: R² on the log scale (different units, not comparable 1:1)
        diag["log_response_r2"] = _ols(X, np.log(y))["r2"]
    out["diagnostics"] = diag
    if rank_single:
        # the single-predictor criterion (audit A9): strongest |r| = highest one-predictor in-sample R² (R² = r²) on the same rows
        ranks = []
        for c in rank_single:
            r = float(np.corrcoef(d[c].to_numpy(float), y)[0, 1])
            ranks.append({"predictor": c, "r": r, "r2": r * r})
        out["single_predictors"] = sorted(ranks, key=lambda q: -abs(q["r"]))
    if compare:
        out["models"] = []
        for c in compare:
            r = _ols(d[c["predictors"]].to_numpy(float), y)
            out["models"].append({"label": c["label"], "predictors": c["predictors"], "r2": r["r2"], "adj_r2": r["adj_r2"]})
    return out
