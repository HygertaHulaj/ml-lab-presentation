"""DS4A section 8.6 "Use High-Quality Data in Machine Learning" (book pp. 392–393): the four dimensions, measured.

Each dimension is shown with a real model on real data (logistic regression; fast and deterministic):
- freshness: digits from a *simulated* new scanner (real test images, shading × 0.55) fool a model trained on old
  images; retraining with a few fresh images restores it (RadiologyML needs the latest equipment's images).
- volume: test accuracy against the number of training images.
- diversity: penguins. A model trained on one island's penguins never sees a Chinstrap (they live on Dream), so it
  cannot recognise one; the same number of penguins drawn from all islands can (Noé's concern about one community).
- quality: lower-resolution digits (as with compressed scans) and wrongly labelled training data.
No FastAPI imports.
"""
from __future__ import annotations

from functools import lru_cache

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .deep import data as digits_data

FAINT = 0.55  # the simulated new scanner records only 55 % of the shading
FRESH_SIZES = (0, 50, 100, 300)
VOLUME_SIZES = (20, 50, 100, 200, 500, 1000, 1437)
LABEL_NOISE = (0.0, 0.1, 0.2, 0.4, 0.6)
PENGUIN_FEATURES = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]
SPECIES = ["Adelie", "Chinstrap", "Gentoo"]


def r4(x: float) -> float:
    return round(float(x), 4)


def _lr() -> LogisticRegression:
    return LogisticRegression(max_iter=3000)


def _px(x: np.ndarray) -> list[int]:
    return [int(round(v * 16)) for v in x]


def freshness() -> dict:
    Xtr, Xte, ytr, yte, _ = digits_data()
    faint = lambda X: X * FAINT  # noqa: E731
    old = _lr().fit(Xtr, ytr)
    rng = np.random.default_rng(0)
    order = rng.permutation(len(Xtr))
    rows = []
    for k in FRESH_SIZES:
        if k == 0:
            m = old
        else:
            idx = order[:k]
            m = _lr().fit(np.vstack([Xtr, faint(Xtr[idx])]), np.concatenate([ytr, ytr[idx]]))
        rows.append({"fresh_images": k, "accuracy_new_scanner": r4(m.score(faint(Xte), yte)), "accuracy_old_scanner": r4(m.score(Xte, yte))})
    i = int(np.where(yte == 4)[0][0])
    return {"simulated": True, "shading_factor": FAINT, "n_test": int(len(yte)), "old_model_on_old": r4(old.score(Xte, yte)),
            "retraining": rows, "example": {"label": int(yte[i]), "old": _px(Xte[i]), "new": _px(faint(Xte[i]))}}


def volume() -> list[dict]:
    Xtr, Xte, ytr, yte, _ = digits_data()
    order = np.random.default_rng(0).permutation(len(Xtr))
    return [{"n": n, "accuracy": r4(_lr().fit(Xtr[order[:n]], ytr[order[:n]]).score(Xte, yte))} for n in VOLUME_SIZES]


def diversity(penguins: pd.DataFrame, island: str = "Biscoe") -> dict:
    pg = penguins.dropna(subset=[*PENGUIN_FEATURES, "species", "island"]).reset_index(drop=True)
    tr, te = train_test_split(pg, test_size=0.3, random_state=8, stratify=pg["species"])
    one = tr[tr["island"] == island]
    mixed = tr.sample(len(one), random_state=0)
    table = pg.groupby(["island", "species"]).size().unstack(fill_value=0).reindex(columns=SPECIES, fill_value=0)
    models = []
    for name, d in ((f"Only {island} island", one), ("All three islands", mixed)):
        m = make_pipeline(StandardScaler(), _lr()).fit(d[PENGUIN_FEATURES], d["species"])
        p = m.predict(te[PENGUIN_FEATURES])
        models.append({
            "name": name, "n_train": int(len(d)), "species_seen": sorted(d["species"].unique().tolist()),
            "accuracy": r4((p == te["species"]).mean()),
            "recall": {s: r4((p[te["species"] == s] == s).mean()) for s in SPECIES},
            "n_test": {s: int((te["species"] == s).sum()) for s in SPECIES},
        })
    return {"island": island, "by_island": [{"island": i, **{s: int(table.loc[i, s]) for s in SPECIES}} for i in table.index],
            "n_test": int(len(te)), "models": models}


def _down(X: np.ndarray, f: int) -> np.ndarray:
    n = 8 // f
    return X.reshape(-1, n, f, n, f).mean(axis=(2, 4)).reshape(len(X), -1)


def quality() -> dict:
    Xtr, Xte, ytr, yte, _ = digits_data()
    i = int(np.where(yte == 2)[0][0])
    res = []
    for f in (1, 2, 4):
        res.append({"side": 8 // f, "accuracy": r4(_lr().fit(_down(Xtr, f), ytr).score(_down(Xte, f), yte)),
                    "example": _px(_down(Xte[i:i + 1], f)[0])})
    rng = np.random.default_rng(0)
    noise = []
    for p in LABEL_NOISE:
        y2 = ytr.copy()
        k = int(round(p * len(y2)))
        idx = rng.permutation(len(y2))[:k]
        y2[idx] = (y2[idx] + rng.integers(1, 10, k)) % 10  # a wrong label, never the right one
        noise.append({"wrong_labels": p, "n_wrong": k, "accuracy": r4(_lr().fit(Xtr, y2).score(Xte, yte))})
    return {"example_label": int(yte[i]), "resolution": res, "label_noise": noise}


@lru_cache(maxsize=1)
def quality_bundle_cached() -> dict:
    from ..datasets_registry import load_builtin
    return {"freshness": freshness(), "volume": volume(), "diversity": diversity(load_builtin("penguins")), "quality": quality(),
            "dataset": {"digits_train": int(len(digits_data()[0])), "digits_test": int(len(digits_data()[1]))}}
