"""Linear regression (ordinary least squares) with scikit-learn, plus explicit explanations.

Model: y_hat = b0 + b1*x1 + ... + bk*xk.  sklearn's LinearRegression solves the least-squares
problem min sum (y - y_hat)^2 directly (no iterations), which is why gradient descent should
converge towards the same coefficients.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline

from .metrics import regression_metrics
from .preprocessing import make_pipeline, transformed_feature_names


def fit_linear_regression(X_train: pd.DataFrame, y_train: pd.Series, numeric: list[str],
                          categorical: list[str]) -> Pipeline:
    pipe = make_pipeline(LinearRegression(), numeric, categorical, scale=False)
    pipe.fit(X_train, y_train.astype(float))
    return pipe


def coefficients(pipe: Pipeline) -> dict:
    model: LinearRegression = pipe.named_steps["model"]
    names = transformed_feature_names(pipe)
    return {"intercept": float(model.intercept_),
            "coefficients": {n: float(c) for n, c in zip(names, np.ravel(model.coef_))}}


def equation_text(coefs: dict, target: str = "y") -> str:
    parts = [f"{coefs['intercept']:.4f}"]
    for name, c in coefs["coefficients"].items():
        parts.append(f"{'+' if c >= 0 else '-'} {abs(c):.4f}*{name}")
    return f"{target}_hat = " + " ".join(parts)


def explain_prediction(pipe: Pipeline, X_row: pd.DataFrame) -> dict:
    """Show the prediction as intercept + sum(coefficient * transformed value)."""
    coefs = coefficients(pipe)
    xt = pipe.named_steps["prep"].transform(X_row)[0]
    terms = []
    total = coefs["intercept"]
    for (name, c), v in zip(coefs["coefficients"].items(), xt):
        contrib = c * float(v)
        total += contrib
        terms.append({"feature": name, "value": float(v), "coefficient": c, "contribution": contrib})
    sk_pred = float(pipe.predict(X_row)[0])
    return {"intercept": coefs["intercept"], "terms": terms, "prediction": total,
            "sklearn_prediction": sk_pred, "matches_sklearn": bool(np.isclose(total, sk_pred))}


def evaluate(pipe: Pipeline, X: pd.DataFrame, y: pd.Series) -> dict:
    pred = pipe.predict(X)
    m = regression_metrics(y.astype(float), pred)
    m["actual"] = [float(v) for v in y]
    m["predicted"] = [float(v) for v in pred]
    return m


def simple_ols_by_hand(x, y) -> dict:
    """Closed-form simple linear regression with every intermediate sum shown."""
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    n = x.size
    xm, ym = x.mean(), y.mean()
    sxy = float(np.sum((x - xm) * (y - ym)))
    sxx = float(np.sum((x - xm) ** 2))
    b1 = sxy / sxx
    b0 = ym - b1 * xm
    return {"n": n, "x_mean": float(xm), "y_mean": float(ym), "Sxy": sxy, "Sxx": sxx,
            "slope": float(b1), "intercept": float(b0),
            "formula": "b1 = Sxy / Sxx = sum((x-x_mean)(y-y_mean)) / sum((x-x_mean)^2); b0 = y_mean - b1*x_mean"}
