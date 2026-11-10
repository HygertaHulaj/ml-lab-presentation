"""DS4A section 8.3 demos: real decision trees on the book's datasets (car seats, penguins), read from scikit-learn.

No FastAPI imports. Everything the presentation shows in its 8.3 section (node counts, thresholds, leaf means,
correct predictions, train/test accuracy) is computed here.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .decision_tree import extract_tree, fit_tree_pipeline

SCHEMAS = {
    "carseats": {"numeric": ["competitor_price", "income", "advertising", "population", "price", "age", "education", "sales"],
                 "categorical": ["shelf_location", "urban", "us", "sales_cat"], "targets": ["sales_cat", "sales"]},
    "penguins": {"numeric": ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"],
                 "categorical": ["island", "sex", "species"], "targets": ["species"]},
}
# surrogates of the response: knowing them means knowing the answer (DS4A Quick Tip, p. 370)
SURROGATES = {"sales_cat": {"sales"}, "sales": {"sales_cat"}}


def fit_and_describe(df: pd.DataFrame, *, dataset: str, target: str, features: list[str], max_depth: int, min_n: int,
                     train: pd.DataFrame | None = None, test: pd.DataFrame | None = None) -> dict:
    sch = SCHEMAS[dataset]
    if target not in sch["targets"]:
        raise ValueError(f"target must be one of {sch['targets']}")
    if not features or any(f not in sch["numeric"] + sch["categorical"] or f == target for f in features):
        raise ValueError("choose explanatory variables from the dataset (not the response itself)")
    task = "classification" if target in sch["categorical"] else "regression"
    num = [f for f in features if f in sch["numeric"]]
    cat = [f for f in features if f in sch["categorical"]]
    data = df.dropna(subset=[*features, target])
    pipe = fit_tree_pipeline(data[num + cat], data[target], num, cat, task, max_depth=max_depth, min_samples_split=min_n)
    tree = extract_tree(pipe)
    pred = pipe.predict(data[num + cat])
    out: dict = {"dataset": dataset, "target": target, "features": features, "task": task, "max_depth": max_depth,
                 "min_n": min_n, "n": int(len(data)), "tree": tree,
                 "leakage": sorted(set(features) & SURROGATES.get(target, set()))}
    if task == "classification":
        out["correct"] = int((pred == data[target]).sum())
        out["accuracy"] = round(float(out["correct"] / len(data)), 4)
    else:
        resid = data[target].to_numpy(float) - pred
        out["rmse"] = round(float(np.sqrt(np.mean(resid ** 2))), 4)
        out["r2"] = round(float(1 - np.sum(resid ** 2) / np.sum((data[target] - data[target].mean()) ** 2)), 4)
    if train is not None and test is not None and task == "classification":
        p2 = fit_tree_pipeline(train[num + cat], train[target], num, cat, task, max_depth=max_depth, min_samples_split=min_n)
        out["official_split"] = {
            "n_train": int(len(train)), "n_test": int(len(test)),
            "train_accuracy": round(float((p2.predict(train[num + cat]) == train[target]).mean()), 4),
            "test_accuracy": round(float((p2.predict(test[num + cat]) == test[target]).mean()), 4),
            "n_leaves": int(extract_tree(p2)["n_leaves"]),
        }
    return out


def carseats_explore(df: pd.DataFrame) -> dict:
    """Fig. 8.9 (sales_cat by shelf_location) and Fig. 8.10 (sales vs price) from the real data."""
    ct = df.groupby("shelf_location")["sales_cat"].value_counts().unstack(fill_value=0)
    order = ["Bad", "Medium", "Good"]
    return {
        "by_shelf": [{"shelf_location": s, "High": int(ct.loc[s, "High"]), "Low": int(ct.loc[s, "Low"]),
                      "share_high": round(float(ct.loc[s, "High"] / ct.loc[s].sum()), 4)} for s in order],
        "price_sales": {"price": df["price"].astype(float).tolist(), "sales": df["sales"].astype(float).round(2).tolist(),
                        "r": round(float(df[["price", "sales"]].corr().iloc[0, 1]), 4)},
        "n": int(len(df)),
    }
