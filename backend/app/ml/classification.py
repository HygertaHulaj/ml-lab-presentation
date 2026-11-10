"""Classification models: logistic regression and decision tree classifiers.

Logistic regression provides class probabilities, so a decision threshold can be applied for
binary problems. Decision trees also expose leaf class proportions, but with few leaves the
probabilities take only a handful of values, so thresholding is offered for logistic
regression only (where it is meaningful).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from .metrics import classification_report
from .preprocessing import make_pipeline, transformed_feature_names


def fit_logistic_regression(X_train: pd.DataFrame, y_train: pd.Series, numeric: list[str],
                            categorical: list[str], *, C: float = 1.0, max_iter: int = 1000,
                            random_state: int = 42) -> Pipeline:
    if not (1e-4 <= C <= 1e4):
        raise ValueError("C must be between 0.0001 and 10000.")
    pipe = make_pipeline(LogisticRegression(C=C, max_iter=max_iter, random_state=random_state),
                         numeric, categorical, scale=True)
    pipe.fit(X_train, y_train)
    return pipe


def predict_with_threshold(pipe: Pipeline, X: pd.DataFrame, positive_label: str, threshold: float) -> np.ndarray:
    model = pipe.named_steps["model"]
    classes = [str(c) for c in model.classes_]
    if len(classes) != 2:
        raise ValueError("A decision threshold only applies to binary classification.")
    if not (0.0 < threshold < 1.0):
        raise ValueError("threshold must be strictly between 0 and 1.")
    pos_idx = classes.index(str(positive_label))
    neg = classes[1 - pos_idx]
    proba = pipe.predict_proba(X)[:, pos_idx]
    return np.where(proba >= threshold, classes[pos_idx], neg)


def evaluate(pipe: Pipeline, X: pd.DataFrame, y: pd.Series, *, positive_label: str | None = None,
             threshold: float | None = None) -> dict:
    model = pipe.named_steps["model"]
    labels = [str(c) for c in model.classes_]
    if threshold is not None and len(labels) == 2 and hasattr(model, "predict_proba"):
        pred = predict_with_threshold(pipe, X, positive_label or labels[1], threshold)
    else:
        pred = pipe.predict(X).astype(str)
    rep = classification_report(y.astype(str).to_numpy(), pred, labels, positive_label=positive_label)
    rep["predictions"] = [str(p) for p in pred]
    rep["actual"] = [str(v) for v in y]
    return rep


def logistic_coefficients(pipe: Pipeline) -> dict:
    model: LogisticRegression = pipe.named_steps["model"]
    names = transformed_feature_names(pipe)
    classes = [str(c) for c in model.classes_]
    if len(classes) == 2:
        return {"classes": classes, "intercept": float(model.intercept_[0]),
                "coefficients": {n: float(c) for n, c in zip(names, model.coef_[0])},
                "note": f"Coefficients are log-odds of '{classes[1]}' per 1 standard deviation of each (scaled) feature."}
    return {"classes": classes,
            "intercept": {c: float(i) for c, i in zip(classes, model.intercept_)},
            "coefficients": {c: {n: float(v) for n, v in zip(names, row)} for c, row in zip(classes, model.coef_)},
            "note": "Multinomial model: one coefficient vector per class (log-odds on standardized features)."}


def threshold_curve(pipe: Pipeline, X: pd.DataFrame, y: pd.Series, positive_label: str,
                    thresholds=None) -> list[dict]:
    """Precision / recall / specificity at a range of thresholds (computed, not interpolated)."""
    from .metrics import binary_from_predictions, binary_metrics
    thresholds = thresholds if thresholds is not None else np.round(np.arange(0.05, 0.96, 0.05), 2)
    out = []
    for t in thresholds:
        pred = predict_with_threshold(pipe, X, positive_label, float(t))
        m = binary_metrics(binary_from_predictions(y.astype(str).to_numpy(), pred, positive_label))
        out.append({"threshold": float(t), "accuracy": m["accuracy"], "precision": m["precision"],
                    "recall": m["recall"], "specificity": m["specificity"], "f1": m["f1"],
                    "counts": m["counts"]})
    return out
