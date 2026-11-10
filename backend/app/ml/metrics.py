"""Evaluation metrics computed explicitly from counts, so every number can be explained.

Binary confusion matrix convention used throughout the app:

                    Predicted positive   Predicted negative
  Actual positive          TP                   FN
  Actual negative          FP                   TN

Note: DS4A Table 8.3 prints the matrix as Predicted (rows) x Actual (columns), while the
"Overfitted, Underfitted, Well-Fitted" activity prints Actual (rows) x Predicted (columns).
The counts mean the same thing; only the layout differs.

Specificity: DS4A p.383 prints TN/(TN+FN). The standard definition (and the one used here)
is TN/(TN+FP). `negative_predictive_value` = TN/(TN+FN) is also returned so the book's
version can be shown and discussed.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Sequence

import numpy as np


def safe_div(num: float, den: float) -> float | None:
    """Return num/den, or None when the denominator is 0 (metric undefined)."""
    return None if den == 0 else num / den


@dataclass
class BinaryCounts:
    tp: int
    fp: int
    fn: int
    tn: int

    def __post_init__(self):
        for k in ("tp", "fp", "fn", "tn"):
            v = getattr(self, k)
            if not isinstance(v, (int, np.integer)) or v < 0:
                raise ValueError(f"{k.upper()} must be a non-negative integer (got {v!r}).")
        if self.total == 0:
            raise ValueError("The confusion matrix is empty (all counts are 0).")

    @property
    def total(self) -> int:
        return int(self.tp + self.fp + self.fn + self.tn)


def binary_metrics(c: BinaryCounts) -> dict:
    tp, fp, fn, tn, n = c.tp, c.fp, c.fn, c.tn, c.total
    precision = safe_div(tp, tp + fp)
    recall = safe_div(tp, tp + fn)
    f1 = None
    if precision is not None and recall is not None and (precision + recall) > 0:
        f1 = 2 * precision * recall / (precision + recall)
    return {
        "counts": asdict(c) | {"total": n},
        "accuracy": (tp + tn) / n,
        "misclassification_rate": (fp + fn) / n,
        "precision": precision,
        "recall": recall,
        "specificity": safe_div(tn, tn + fp),
        "negative_predictive_value": safe_div(tn, tn + fn),
        "f1": f1,
        "calculations": {
            "accuracy": f"({tp} + {tn}) / ({tp} + {tn} + {fp} + {fn}) = {tp + tn}/{n}",
            "precision": f"{tp} / ({tp} + {fp}) = {tp}/{tp + fp}" if tp + fp else "undefined: no positive predictions (TP + FP = 0)",
            "recall": f"{tp} / ({tp} + {fn}) = {tp}/{tp + fn}" if tp + fn else "undefined: no actual positives (TP + FN = 0)",
            "specificity": f"{tn} / ({tn} + {fp}) = {tn}/{tn + fp}" if tn + fp else "undefined: no actual negatives (TN + FP = 0)",
            "negative_predictive_value": f"{tn} / ({tn} + {fn}) = {tn}/{tn + fn}" if tn + fn else "undefined: no negative predictions",
        },
    }


def confusion_counts(y_true: Sequence, y_pred: Sequence, labels: Sequence) -> np.ndarray:
    """Confusion matrix with rows = actual, columns = predicted, in `labels` order."""
    y_true = np.asarray(y_true, dtype=object)
    y_pred = np.asarray(y_pred, dtype=object)
    if y_true.shape != y_pred.shape:
        raise ValueError("y_true and y_pred must have the same length.")
    idx = {lab: i for i, lab in enumerate(labels)}
    m = np.zeros((len(labels), len(labels)), dtype=int)
    for t, p in zip(y_true, y_pred):
        if t not in idx or p not in idx:
            raise ValueError(f"Label {t!r} or {p!r} not in labels {list(labels)}.")
        m[idx[t], idx[p]] += 1
    return m


def binary_from_predictions(y_true, y_pred, positive_label) -> BinaryCounts:
    y_true = np.asarray(y_true, dtype=object)
    y_pred = np.asarray(y_pred, dtype=object)
    pt, pp = y_true == positive_label, y_pred == positive_label
    return BinaryCounts(
        tp=int(np.sum(pt & pp)), fp=int(np.sum(~pt & pp)),
        fn=int(np.sum(pt & ~pp)), tn=int(np.sum(~pt & ~pp)),
    )


def classification_report(y_true, y_pred, labels: Sequence, positive_label=None) -> dict:
    """Full classification evaluation. Binary problems report positive-class metrics;
    multiclass problems report one-vs-rest metrics per class plus macro and weighted averages."""
    labels = list(labels)
    matrix = confusion_counts(y_true, y_pred, labels)
    n = int(matrix.sum())
    result: dict = {
        "labels": [str(l) for l in labels],
        "matrix": matrix.tolist(),
        "matrix_layout": "rows = actual class, columns = predicted class",
        "n": n,
        "accuracy": float(np.trace(matrix)) / n if n else None,
    }
    per_class = {}
    for lab in labels:
        per_class[str(lab)] = binary_metrics(binary_from_predictions(y_true, y_pred, lab)) if n else None
    result["per_class"] = per_class

    if len(labels) == 2:
        pos = positive_label if positive_label is not None else labels[1]
        if pos not in labels:
            raise ValueError(f"positive_label {pos!r} is not one of {labels}.")
        result["positive_label"] = str(pos)
        result["binary"] = per_class[str(pos)]
    else:
        support = matrix.sum(axis=1)
        for name in ("precision", "recall", "specificity", "f1"):
            vals = [per_class[str(l)][name] for l in labels]
            defined = [(v, s) for v, s in zip(vals, support) if v is not None]
            result[f"macro_{name}"] = float(np.mean([v for v, _ in defined])) if defined else None
            tot = sum(s for _, s in defined)
            result[f"weighted_{name}"] = float(sum(v * s for v, s in defined) / tot) if tot else None
        result["averaging_note"] = (
            "Macro average: the unweighted mean of the per-class (one-vs-rest) metric, so every class "
            "counts equally. Weighted average: each class's metric weighted by its number of actual "
            "observations (support), so large classes dominate."
        )
    return result


def regression_metrics(y_true, y_pred) -> dict:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    if y_true.size == 0:
        raise ValueError("Cannot evaluate an empty set of predictions.")
    e = y_true - y_pred
    mse = float(np.mean(e**2))
    ss_res = float(np.sum(e**2))
    ss_tot = float(np.sum((y_true - y_true.mean()) ** 2))
    return {
        "n": int(y_true.size),
        "mae": float(np.mean(np.abs(e))),
        "mse": mse,
        "rmse": float(np.sqrt(mse)),
        "r2": None if ss_tot == 0 else 1 - ss_res / ss_tot,
        "ss_res": ss_res,
        "ss_tot": ss_tot,
    }


def fit_diagnosis(train_score: float, test_score: float, *, higher_is_better: bool = True,
                  gap_threshold: float = 0.10, low_threshold: float | None = None) -> dict:
    """Heuristic over/under-fitting label from train vs test performance.

    This is a *teaching heuristic*, not a statistical test: it only looks at the size of the
    generalization gap and, optionally, whether both scores are low. Thresholds are returned
    so the reasoning is transparent."""
    gap = (train_score - test_score) if higher_is_better else (test_score - train_score)
    label = "well-fitted"
    reason = f"generalization gap {gap:.3f} is below {gap_threshold}"
    if gap > gap_threshold:
        label, reason = "possibly overfitted", f"training performance exceeds test performance by {gap:.3f} (> {gap_threshold})"
    elif low_threshold is not None:
        low = (train_score < low_threshold and test_score < low_threshold) if higher_is_better else \
              (train_score > low_threshold and test_score > low_threshold)
        if low:
            label, reason = "possibly underfitted", f"both training and test performance are poor (threshold {low_threshold})"
    return {"label": label, "gap": gap, "reason": reason, "gap_threshold": gap_threshold,
            "low_threshold": low_threshold}
