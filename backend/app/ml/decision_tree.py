"""Decision trees: training and *extraction of the real fitted structure* from scikit-learn.

Nothing here is invented: node thresholds, sample counts, class counts, impurities and
prediction paths are all read from `estimator.tree_` after fitting.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

from .preprocessing import make_pipeline, transformed_feature_names


def build_tree(task: str, *, max_depth: int | None, min_samples_split: int = 2,
               min_samples_leaf: int = 1, criterion: str | None = None, random_state: int = 42):
    if max_depth is not None and not (1 <= max_depth <= 30):
        raise ValueError("max_depth must be between 1 and 30.")
    if not (2 <= min_samples_split <= 1000):
        raise ValueError("min_samples_split must be between 2 and 1000.")
    if not (1 <= min_samples_leaf <= 1000):
        raise ValueError("min_samples_leaf must be between 1 and 1000.")
    if task == "classification":
        return DecisionTreeClassifier(max_depth=max_depth, min_samples_split=min_samples_split,
                                      min_samples_leaf=min_samples_leaf, criterion=criterion or "gini",
                                      random_state=random_state)
    return DecisionTreeRegressor(max_depth=max_depth, min_samples_split=min_samples_split,
                                 min_samples_leaf=min_samples_leaf, criterion=criterion or "squared_error",
                                 random_state=random_state)


def fit_tree_pipeline(X_train: pd.DataFrame, y_train: pd.Series, numeric: list[str], categorical: list[str],
                      task: str, **tree_kwargs) -> Pipeline:
    pipe = make_pipeline(build_tree(task, **tree_kwargs), numeric, categorical, scale=False)
    pipe.fit(X_train, y_train)
    return pipe


def _onehot_map(pipe: Pipeline) -> dict[str, tuple[str, str]]:
    """transformed feature name -> (original column, category) for one-hot encoded columns."""
    prep = pipe.named_steps["prep"]
    out: dict[str, tuple[str, str]] = {}
    for name, trans, cols in prep.transformers_:
        if name != "cat":
            continue
        enc = trans.named_steps["onehot"]
        for col, cats in zip(cols, enc.categories_):
            for cat in cats:
                out[f"{col}_{cat}"] = (col, str(cat))
    return out


def _condition_text(feature: str, threshold: float, goes_left: bool, onehot: dict) -> str:
    if feature in onehot:
        col, cat = onehot[feature]
        # one-hot value is 0 or 1; left branch is "<= 0.5" i.e. NOT this category
        return f"{col} is not {cat}" if goes_left else f"{col} is {cat}"
    return f"{feature} <= {threshold:.4g}" if goes_left else f"{feature} > {threshold:.4g}"


def extract_tree(pipe: Pipeline) -> dict:
    """Return every node of the fitted tree with its real statistics."""
    model = pipe.named_steps["model"]
    t = model.tree_
    names = transformed_feature_names(pipe)
    onehot = _onehot_map(pipe)
    is_clf = isinstance(model, DecisionTreeClassifier)
    classes = [str(c) for c in model.classes_] if is_clf else None

    # parent / depth bookkeeping
    depth = np.zeros(t.node_count, dtype=int)
    parent = [-1] * t.node_count
    for i in range(t.node_count):
        for child in (t.children_left[i], t.children_right[i]):
            if child != -1:
                depth[child] = depth[i] + 1
                parent[child] = i

    nodes = []
    for i in range(t.node_count):
        leaf = t.children_left[i] == -1
        n = int(t.n_node_samples[i])
        node = {
            "id": i,
            "depth": int(depth[i]),
            "parent": parent[i],
            "is_leaf": bool(leaf),
            "samples": n,
            "impurity": float(t.impurity[i]),
            "left": None if leaf else int(t.children_left[i]),
            "right": None if leaf else int(t.children_right[i]),
        }
        if not leaf:
            f = names[t.feature[i]]
            node.update(
                feature=f,
                threshold=float(t.threshold[i]),
                # Phrased so that "yes" always means the LEFT branch (sklearn sends value <= threshold left;
                # for a one-hot column that is "category is NOT present").
                question=(f"Is {onehot[f][0]} ≠ {onehot[f][1]}?" if f in onehot else f"Is {f} <= {t.threshold[i]:.4g}?"),
                left_condition=_condition_text(f, t.threshold[i], True, onehot),
                right_condition=_condition_text(f, t.threshold[i], False, onehot),
            )
        if is_clf:
            # sklearn >= 1.4 stores class *fractions* in tree_.value; convert back to counts
            frac = t.value[i][0]
            counts = np.rint(frac / frac.sum() * t.weighted_n_node_samples[i]).astype(int)
            node["class_counts"] = {c: int(v) for c, v in zip(classes, counts)}
            node["prediction"] = classes[int(np.argmax(frac))]
        else:
            node["prediction"] = float(t.value[i][0][0])
        nodes.append(node)

    # impurity decrease of every split (what the algorithm actually maximised)
    for node in nodes:
        if not node["is_leaf"]:
            l, r = nodes[node["left"]], nodes[node["right"]]
            weighted = (l["samples"] * l["impurity"] + r["samples"] * r["impurity"]) / node["samples"]
            node["impurity_decrease"] = node["impurity"] - weighted
            node["children_weighted_impurity"] = weighted

    leaves = [n for n in nodes if n["is_leaf"]]
    importances = {}
    if model.tree_.node_count > 1:
        importances = {nm: float(v) for nm, v in zip(names, model.feature_importances_) if v > 0}
    return {
        "task": "classification" if is_clf else "regression",
        "criterion": model.criterion,
        "classes": classes,
        "n_nodes": int(t.node_count),
        "n_leaves": len(leaves),
        "n_splits": int(t.node_count - len(leaves)),
        "depth": int(model.get_depth()),
        "features_used": sorted({n["feature"] for n in nodes if not n["is_leaf"]}),
        "feature_importances": dict(sorted(importances.items(), key=lambda kv: -kv[1])),
        "nodes": nodes,
    }


def decision_rules(tree: dict) -> list[dict]:
    """One IF ... THEN ... rule per leaf, built from the real split conditions."""
    nodes = tree["nodes"]
    rules = []
    for leaf in (n for n in nodes if n["is_leaf"]):
        conds = []
        child, p = leaf["id"], leaf["parent"]
        while p != -1:
            par = nodes[p]
            conds.append(par["left_condition"] if par["left"] == child else par["right_condition"])
            child, p = p, par["parent"]
        conds.reverse()
        rule = {"leaf_id": leaf["id"], "conditions": conds, "prediction": leaf["prediction"],
                "samples": leaf["samples"]}
        if "class_counts" in leaf:
            rule["class_counts"] = leaf["class_counts"]
            correct = max(leaf["class_counts"].values())
            rule["correct_in_leaf"] = int(correct)
        rules.append(rule)
    return rules


def prediction_path(pipe: Pipeline, tree: dict, X_row: pd.DataFrame) -> dict:
    """Follow one sample through the fitted tree and explain each decision."""
    model = pipe.named_steps["model"]
    Xt = pipe.named_steps["prep"].transform(X_row)
    path_ids = model.decision_path(Xt).indices.tolist()
    names = transformed_feature_names(pipe)
    nodes = tree["nodes"]
    steps = []
    for nid in path_ids:
        node = nodes[nid]
        if node["is_leaf"]:
            break
        fi = names.index(node["feature"])
        value = float(Xt[0, fi])
        go_left = value <= node["threshold"]
        steps.append({
            "node_id": nid, "question": node["question"], "feature": node["feature"],
            "sample_value": value, "threshold": node["threshold"],
            "answer": "yes (left)" if go_left else "no (right)",
            "condition_met": node["left_condition"] if go_left else node["right_condition"],
        })
    leaf = nodes[path_ids[-1]]
    return {"path": path_ids, "steps": steps, "leaf_id": leaf["id"], "prediction": leaf["prediction"],
            "leaf": leaf}


def leaf_correct_predictions(tree: dict) -> dict:
    """Training-set correct predictions implied by the leaves (majority class in each leaf)."""
    if tree["task"] != "classification":
        raise ValueError("Only defined for classification trees.")
    per_class = {c: 0 for c in tree["classes"]}
    for n in tree["nodes"]:
        if n["is_leaf"]:
            per_class[n["prediction"]] += n["class_counts"][n["prediction"]]
    total = int(sum(n["samples"] for n in tree["nodes"] if n["is_leaf"]))
    correct = int(sum(per_class.values()))
    return {"correct_by_predicted_class": per_class, "correct_total": correct, "n": total,
            "accuracy": correct / total if total else None}
