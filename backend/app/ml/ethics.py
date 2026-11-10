"""DS4A Chapter 8 "Ethics in Practice: Social Justice in Data Science" (book pp. 394–395): the mechanism, measured.

The book's facial-recognition example: systems trained mostly on light-skinned faces fail other people more often.
No face data are used here. The same mechanism is measured on the real penguin data: one species (Chinstrap) is
made rarer and rarer in the training data while the others stay complete; the test set is fixed and complete.
- the under-represented group's error rate rises sharply, the majority's stays at zero, and overall accuracy hides it;
- mitigation, as the book describes (examine the training data, add quality checks): measure error *per group*
  and reweight the training data (`class_weight="balanced"`), which closes most of the gap.
Results are averaged over 20 random draws of the minority examples. No FastAPI imports.
"""
from __future__ import annotations

from functools import lru_cache

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

FEATURES = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]
MINORITY = "Chinstrap"
COUNTS = (0, 1, 2, 3, 5, 8, 12, 20)
MITIGATE_AT = 5
DRAWS = 20


def r4(x: float) -> float:
    return round(float(x), 4)


def _split(penguins: pd.DataFrame):
    pg = penguins.dropna(subset=[*FEATURES, "species"]).reset_index(drop=True)
    return train_test_split(pg, test_size=0.3, random_state=8, stratify=pg["species"])


def _run(train: pd.DataFrame, test: pd.DataFrame, balanced: bool) -> tuple[float, float, float]:
    m = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced" if balanced else None))
    m.fit(train[FEATURES], train["species"])
    p = m.predict(test[FEATURES])
    is_min = (test["species"] == MINORITY).to_numpy()
    y = test["species"].to_numpy()
    return float((p[is_min] != y[is_min]).mean()), float((p[~is_min] != y[~is_min]).mean()), float((p == y).mean())


def _point(others: pd.DataFrame, minority: pd.DataFrame, test: pd.DataFrame, k: int, balanced: bool = False) -> dict:
    draws = [_run(pd.concat([others, minority.sample(k, random_state=s)]), test, balanced) for s in range(DRAWS if 0 < k < len(minority) else 1)]
    me, oe, acc = (np.mean([d[i] for d in draws]) for i in range(3))
    return {"n_minority": k, "share": r4(k / (len(others) + k)), "minority_error": r4(me), "majority_error": r4(oe), "overall_accuracy": r4(acc)}


@lru_cache(maxsize=1)
def ethics_bundle_cached() -> dict:
    from ..datasets_registry import load_builtin
    train, test = _split(load_builtin("penguins"))
    others, minority = train[train["species"] != MINORITY], train[train["species"] == MINORITY]
    sweep = [_point(others, minority, test, k) for k in (*COUNTS, len(minority))]
    plain = next(s for s in sweep if s["n_minority"] == MITIGATE_AT)
    fixed = _point(others, minority, test, MITIGATE_AT, balanced=True)
    return {
        "minority": MINORITY, "draws": DRAWS,
        "train_counts": {s: int((train["species"] == s).sum()) for s in sorted(train["species"].unique())},
        "test_counts": {s: int((test["species"] == s).sum()) for s in sorted(test["species"].unique())},
        "sweep": sweep,
        "mitigation": {"n_minority": MITIGATE_AT, "before": plain, "after_reweighting": fixed},
    }
