"""Evaluation helpers: standalone confusion-matrix calculator and the model-complexity lab."""
from __future__ import annotations

import pandas as pd

from ..ml import decision_tree as dt
from ..ml.metrics import BinaryCounts, binary_metrics, regression_metrics
from ..ml.preprocessing import validate_and_split


def confusion_matrix_metrics(tp: int, fp: int, fn: int, tn: int, pos: str, neg: str) -> dict:
    m = binary_metrics(BinaryCounts(tp, fp, fn, tn))
    m["positive_label"], m["negative_label"] = pos, neg
    m["matrix"] = {"layout": "rows = actual, columns = predicted", "labels": [pos, neg], "values": [[tp, fn], [fp, tn]]}
    m["book_note"] = ("DS4A p.383 prints specificity as TN/(TN+FN). That quantity is the negative predictive value "
                      "(shown separately); the standard specificity is TN/(TN+FP).")
    return m


def complexity_curve(df: pd.DataFrame, features: list[str], target: str, task: str, depths: list[int], *,
                     test_size: float, seed: int, min_samples_split: int) -> dict:
    """Train one real tree per max_depth on the SAME split and report train/test performance."""
    data = validate_and_split(df, features, target, task, test_size=test_size, random_state=seed)
    rows = []
    for d in depths:
        pipe = dt.fit_tree_pipeline(data.X_train, data.y_train, data.numeric_features, data.categorical_features,
                                    task, max_depth=d, min_samples_split=min_samples_split, random_state=seed)
        tree = pipe.named_steps["model"]
        if task == "classification":
            tr = float((pipe.predict(data.X_train) == data.y_train.to_numpy()).mean())
            te = float((pipe.predict(data.X_test) == data.y_test.to_numpy()).mean())
            metric = "accuracy"
        else:
            tr = regression_metrics(data.y_train, pipe.predict(data.X_train))["r2"]
            te = regression_metrics(data.y_test, pipe.predict(data.X_test))["r2"]
            metric = "r2"
        rows.append({"max_depth": d, "actual_depth": int(tree.get_depth()), "leaves": int(tree.get_n_leaves()),
                     "train": tr, "test": te, "gap": (tr - te) if tr is not None and te is not None else None})
    valid = [r for r in rows if r["test"] is not None]
    best = max(valid, key=lambda r: (r["test"], -r["leaves"])) if valid else None
    baseline = None
    if task == "classification":
        baseline = float(data.y_test.value_counts(normalize=True).max())
    notes = []
    if best:
        notes.append(f"Best test {metric} = {best['test']:.3f} at max_depth {best['max_depth']} ({best['leaves']} leaves).")
        deepest = rows[-1]
        if deepest["train"] is not None and deepest["test"] is not None and deepest["train"] - deepest["test"] > 0.1:
            gap = deepest["train"] - deepest["test"]
            if best["test"] - deepest["test"] > 0.02:
                notes.append(f"At max_depth {deepest['max_depth']} the training {metric} is {deepest['train']:.3f} but test is only "
                             f"{deepest['test']:.3f} (best test {best['test']:.3f}): extra complexity made test performance worse — "
                             "consistent with overfitting.")
            else:
                notes.append(f"At max_depth {deepest['max_depth']} the training {metric} is {deepest['train']:.3f} and test is "
                             f"{deepest['test']:.3f} (gap {gap:.3f}). The model fits the training data far better than new data, but its "
                             "test performance did not drop, so this split alone does not show overfitting. Prefer the simplest "
                             "depth with near-best test performance.")
        simplest = min((r for r in valid if best and best["test"] - r["test"] <= 0.01), key=lambda r: r["leaves"], default=None)
        if simplest and simplest["max_depth"] != best["max_depth"]:
            notes.append(f"Simplest tree within 0.01 of the best test {metric}: max_depth {simplest['max_depth']} ({simplest['leaves']} leaves).")
        if rows[0]["test"] is not None and best["test"] - rows[0]["test"] > 0.03:
            notes.append(f"max_depth {rows[0]['max_depth']} scores {rows[0]['test']:.3f} on test — lower than the best, consistent with underfitting.")
        if baseline is not None:
            notes.append(f"Majority-class baseline on the test set = {baseline:.3f}.")
    notes.append("These labels are judgements from train-vs-test performance on one split; a different seed can shift the curve.")
    return {"metric": metric, "rows": rows, "best": best, "baseline": baseline, "notes": notes,
            "split": {"train_rows": len(data.X_train), "test_rows": len(data.X_test), "seed": seed}}
