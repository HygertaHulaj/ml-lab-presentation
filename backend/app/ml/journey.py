"""The machine-learning process on one small real dataset, with every intermediate state recorded (no FastAPI imports).

collect → prepare (missing values, exact duplicates) → features (ANOVA F-score per feature) → split (stratified, seeded)
→ train (decision tree, splits in the order they were learned, with the regions they create) → predict (unseen flowers,
with each one's decision path) → evaluate (confusion matrix, accuracy, precision/recall, train-vs-test by depth).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.feature_selection import f_classif
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
from sklearn.tree import DecisionTreeClassifier

from .concepts import train_test_indices

FEATURES = ["sepal_length_cm", "sepal_width_cm", "petal_length_cm", "petal_width_cm"]


def _tree_states(clf: DecisionTreeClassifier, feats: list[str], classes: list[str], bounds: dict[str, tuple[float, float]]):
    """Splits in learning order (breadth-first = the order a depth-limited tree is grown) and the leaf regions."""
    t = clf.tree_
    splits, leaves = [], []
    queue = [(0, 0, dict(bounds))]
    while queue:
        node, depth, box = queue.pop(0)
        counts = t.value[node][0]
        counts = (counts / counts.sum() * t.n_node_samples[node]).round().astype(int).tolist()
        if t.children_left[node] == -1:
            leaves.append({"node": int(node), "depth": depth, "class": classes[int(np.argmax(counts))], "counts": dict(zip(classes, counts)),
                           "box": {f: list(box[f]) for f in feats}, "n": int(t.n_node_samples[node])})
            continue
        f = feats[t.feature[node]]
        thr = round(float(t.threshold[node]), 4)
        lo, hi = box[f]
        splits.append({"order": len(splits), "node": int(node), "depth": depth, "feature": f, "threshold": thr, "n": int(t.n_node_samples[node]),
                       "gini": round(float(t.impurity[node]), 4), "counts": dict(zip(classes, counts)), "box": {g: list(box[g]) for g in feats},
                       "left": int(t.children_left[node]), "right": int(t.children_right[node])})
        left = dict(box); left[f] = (lo, min(hi, thr))
        right = dict(box); right[f] = (max(lo, thr), hi)
        queue.append((int(t.children_left[node]), depth + 1, left))
        queue.append((int(t.children_right[node]), depth + 1, right))
    return splits, leaves


def _path(clf: DecisionTreeClassifier, feats: list[str], row: np.ndarray) -> list[dict]:
    t = clf.tree_
    node, out = 0, []
    while t.children_left[node] != -1:
        f, thr = t.feature[node], float(t.threshold[node])
        go_left = row[f] <= thr
        out.append({"node": int(node), "feature": feats[f], "threshold": round(thr, 4), "value": float(row[f]), "goes": "left" if go_left else "right"})
        node = t.children_left[node] if go_left else t.children_right[node]
    out.append({"node": int(node), "leaf": True})
    return out


def learning_journey(df: pd.DataFrame, *, features: list[str], max_depth: int = 2, seed: int = 42, test_fraction: float = 0.3) -> dict:
    if len(features) != 2 or any(f not in FEATURES for f in features):
        raise ValueError(f"choose exactly two features from {FEATURES}")
    classes = [str(c) for c in sorted(df["species"].unique().tolist())]
    records = [{"id": int(i), **{f: float(r[f]) for f in FEATURES}, "species": r["species"]} for i, r in df.iterrows()]

    # prepare: missing values and exact duplicates (keep the first occurrence)
    missing = {c: int(df[c].isna().sum()) for c in [*FEATURES, "species"]}
    dup_mask = df.duplicated(keep="first")
    dups = []
    for i in np.flatnonzero(dup_mask.to_numpy()):
        same = df.index[(df == df.iloc[i]).all(axis=1)].tolist()
        dups.append({"removed": int(df.index[i]), "same_as": int(same[0])})
    clean = df[~dup_mask]

    # split
    ids = clean.index.to_numpy()
    y_all = clean["species"].to_numpy()
    tr_pos, te_pos = train_test_indices(len(clean), y_all, test_fraction, seed)
    train_ids, test_ids = ids[tr_pos], ids[te_pos]
    Xtr, ytr = clean.loc[train_ids, features].to_numpy(float), clean.loc[train_ids, "species"].to_numpy()
    Xte, yte = clean.loc[test_ids, features].to_numpy(float), clean.loc[test_ids, "species"].to_numpy()

    # features: ANOVA F-score per measurement, computed on the TRAINING flowers only (the test set stays untouched)
    F, _ = f_classif(clean.loc[train_ids, FEATURES].to_numpy(float), ytr)
    feature_scores = [{"feature": f, "f_score": round(float(s), 2), "computed_on": "training"} for f, s in zip(FEATURES, F)]

    # train
    clf = DecisionTreeClassifier(max_depth=max_depth, random_state=seed).fit(Xtr, ytr)
    pad = {f: (float(np.floor(df[f].min())) - 0.0, float(np.ceil(df[f].max() * 2) / 2)) for f in features}
    splits, leaves = _tree_states(clf, features, classes, pad)

    # predict + evaluate
    pte, ptr = clf.predict(Xte), clf.predict(Xtr)
    predictions = [{"id": int(i), "truth": str(t), "predicted": str(p), "correct": bool(t == p), "path": _path(clf, features, x)}
                   for i, t, p, x in zip(test_ids, yte, pte, Xte)]
    cm = confusion_matrix(yte, pte, labels=classes)
    prec, rec, _, sup = precision_recall_fscore_support(yte, pte, labels=classes, zero_division=0)
    depths = []
    folds = list(StratifiedKFold(5, shuffle=True, random_state=seed).split(Xtr, ytr))
    for d in range(1, 6):
        c = DecisionTreeClassifier(max_depth=d, random_state=seed).fit(Xtr, ytr)
        cv = [float((DecisionTreeClassifier(max_depth=d, random_state=seed).fit(Xtr[f], ytr[f]).predict(Xtr[v]) == ytr[v]).mean()) for f, v in folds]
        depths.append({"depth": d, "train_accuracy": round(float((c.predict(Xtr) == ytr).mean()), 4), "cv_accuracy": round(float(np.mean(cv)), 4),
                       "test_accuracy": round(float((c.predict(Xte) == yte).mean()), 4)})
    selected_depth = max(depths, key=lambda r: (r["cv_accuracy"], -r["depth"]))["depth"]

    return {
        "source": "Iris (Fisher, 1936) via scikit-learn",
        "classes": classes,
        "features_all": FEATURES,
        "features": features,
        "records": records,
        "prepare": {"n_raw": len(df), "missing": missing, "duplicates": dups, "n_clean": int(len(clean)), "tidy": True},
        "feature_scores": feature_scores,
        "split": {"seed": seed, "test_fraction": test_fraction, "train_ids": train_ids.tolist(), "test_ids": test_ids.tolist()},
        "model": {"type": "decision tree", "max_depth": max_depth, "splits": splits, "leaves": leaves, "bounds": {f: list(pad[f]) for f in features}},
        "predictions": predictions,
        "evaluation": {
            "labels": classes, "confusion": cm.tolist(),
            "train_accuracy": round(float((ptr == ytr).mean()), 4), "test_accuracy": round(float((pte == yte).mean()), 4),
            "precision": dict(zip(classes, np.round(prec, 4).tolist())), "recall": dict(zip(classes, np.round(rec, 4).tolist())),
            "support": dict(zip(classes, sup.tolist())), "by_depth": depths,
            "selected_depth": selected_depth, "selection": "5-fold stratified cross-validation on the training flowers",
        },
    }
