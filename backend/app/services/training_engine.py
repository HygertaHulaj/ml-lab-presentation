"""Synchronous, database-free training of every supported algorithm.

Input: a DataFrame and an experiment configuration. Output: the fitted model object (kept in
memory only) plus JSON-serialisable metrics, history and a model summary. All numbers come
from the fitted models; the only 'history' reported is history the algorithm really has.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Callable

import numpy as np
import pandas as pd

from ..explainability import formula_explainer
from ..ml import classification as clf
from ..ml import decision_tree as dt
from ..ml import gradient_descent as gd
from ..ml import regression as reg
from ..ml.metrics import regression_metrics
from ..ml.preprocessing import DataValidationError, input_frame, validate_and_split

MAX_ROWS_IN_PAYLOAD = 2000


@dataclass
class TrainingConfig:
    algorithm: str
    task: str
    target: str
    features: list[str]
    hyperparameters: dict
    test_size: float = 0.2
    random_seed: int = 42
    positive_label: str | None = None


@dataclass
class TrainedModel:
    config: TrainingConfig
    obj: Any                      # sklearn Pipeline, or dict with GD parameters
    numeric: list[str]
    categorical: list[str]
    classes: list[str] | None = None


@dataclass
class TrainingOutput:
    model: TrainedModel
    metrics: dict
    history: dict
    summary: dict
    duration_ms: float


def _cap(values: list) -> list:
    return values[:MAX_ROWS_IN_PAYLOAD]


def train(df: pd.DataFrame, cfg: TrainingConfig, progress: Callable[[float], None] | None = None) -> TrainingOutput:
    progress = progress or (lambda _p: None)
    t0 = time.perf_counter()
    data = validate_and_split(df, cfg.features, cfg.target, cfg.task, test_size=cfg.test_size,
                              random_state=cfg.random_seed)
    progress(0.2)
    hp = cfg.hyperparameters
    split_info = {"train_rows": len(data.X_train), "test_rows": len(data.X_test),
                  "dropped_rows_missing_target": data.dropped_rows, "numeric_features": data.numeric_features,
                  "categorical_features": data.categorical_features, "random_seed": cfg.random_seed,
                  "test_size": cfg.test_size,
                  "leakage_guard": "Imputation, scaling and one-hot encoding are fitted on the training split only."}

    if cfg.algorithm == "linear_regression":
        pipe = reg.fit_linear_regression(data.X_train, data.y_train, data.numeric_features, data.categorical_features)
        coefs = reg.coefficients(pipe)
        tr, te = reg.evaluate(pipe, data.X_train, data.y_train), reg.evaluate(pipe, data.X_test, data.y_test)
        metrics = {"task": "regression", "train": _strip(tr), "test": _strip(te),
                   "test_actual": _cap(te["actual"]), "test_predicted": _cap(te["predicted"])}
        history = {"type": "closed_form",
                   "note": "Ordinary least squares is solved directly (no iterations), so there is no step-by-step training history. "
                           "Use the Gradient Descent visualizer to watch an iterative solution."}
        summary = {"algorithm": "linear_regression", **coefs, "equation": reg.equation_text(coefs, cfg.target),
                   "split": split_info, "formulas": formula_explainer.for_algorithm("linear_regression")}
        model = TrainedModel(cfg, pipe, data.numeric_features, data.categorical_features)

    elif cfg.algorithm == "logistic_regression":
        pipe = clf.fit_logistic_regression(data.X_train, data.y_train, data.numeric_features, data.categorical_features,
                                           C=hp.get("C", 1.0), random_state=cfg.random_seed)
        classes = [str(c) for c in pipe.named_steps["model"].classes_]
        pos = _positive(cfg, classes)
        thr = hp.get("threshold") if len(classes) == 2 else None
        tr = clf.evaluate(pipe, data.X_train, data.y_train, positive_label=pos, threshold=thr)
        te = clf.evaluate(pipe, data.X_test, data.y_test, positive_label=pos, threshold=thr)
        metrics = {"task": "classification", "train": _strip(tr), "test": _strip(te), "positive_label": pos,
                   "threshold": thr if thr is not None else (0.5 if len(classes) == 2 else None),
                   "test_actual": _cap(te["actual"]), "test_predicted": _cap(te["predictions"])}
        if len(classes) == 2:
            metrics["threshold_curve"] = clf.threshold_curve(pipe, data.X_test, data.y_test, pos)
        n_iter = int(np.max(pipe.named_steps["model"].n_iter_))
        history = {"type": "solver", "solver": "lbfgs", "iterations": n_iter,
                   "note": "scikit-learn's L-BFGS optimiser does not expose per-iteration values; only the iteration count is reported."}
        summary = {"algorithm": "logistic_regression", **clf.logistic_coefficients(pipe), "split": split_info,
                   "formulas": formula_explainer.for_algorithm("logistic_regression")}
        model = TrainedModel(cfg, pipe, data.numeric_features, data.categorical_features, classes)

    elif cfg.algorithm == "decision_tree":
        pipe = dt.fit_tree_pipeline(data.X_train, data.y_train, data.numeric_features, data.categorical_features,
                                    cfg.task, max_depth=hp.get("max_depth"), min_samples_split=hp.get("min_samples_split", 2),
                                    min_samples_leaf=hp.get("min_samples_leaf", 1), criterion=hp.get("criterion"),
                                    random_state=cfg.random_seed)
        tree = dt.extract_tree(pipe)
        if cfg.task == "classification":
            classes = tree["classes"]
            pos = _positive(cfg, classes)
            tr = clf.evaluate(pipe, data.X_train, data.y_train, positive_label=pos)
            te = clf.evaluate(pipe, data.X_test, data.y_test, positive_label=pos)
            metrics = {"task": "classification", "train": _strip(tr), "test": _strip(te), "positive_label": pos,
                       "test_actual": _cap(te["actual"]), "test_predicted": _cap(te["predictions"])}
        else:
            classes = None
            tr, te = reg.evaluate(pipe, data.X_train, data.y_train), reg.evaluate(pipe, data.X_test, data.y_test)
            metrics = {"task": "regression", "train": _strip(tr), "test": _strip(te),
                       "test_actual": _cap(te["actual"]), "test_predicted": _cap(te["predicted"])}
        history = {"type": "tree_growth",
                   "splits_in_order": [{"node_id": n["id"], "depth": n["depth"], "question": n["question"],
                                        "samples": n["samples"], "impurity": n["impurity"],
                                        "impurity_decrease": n["impurity_decrease"]}
                                       for n in sorted((n for n in tree["nodes"] if not n["is_leaf"]),
                                                       key=lambda n: (n["depth"], n["id"]))],
                   "note": "Each split is the question that most reduced impurity at that node (greedy growth)."}
        summary = {"algorithm": "decision_tree", "tree": tree, "rules": dt.decision_rules(tree), "split": split_info,
                   "formulas": formula_explainer.for_algorithm("decision_tree", cfg.task)}
        model = TrainedModel(cfg, pipe, data.numeric_features, data.categorical_features, classes)

    elif cfg.algorithm == "gradient_descent":
        feat = cfg.features[0]
        if feat not in data.numeric_features:
            raise DataValidationError("Gradient descent needs a numeric feature.")
        tr_mask = data.X_train[feat].notna()
        te_mask = data.X_test[feat].notna()
        x_tr, y_tr = data.X_train.loc[tr_mask, feat].to_numpy(float), data.y_train[tr_mask].to_numpy(float)
        x_te, y_te = data.X_test.loc[te_mask, feat].to_numpy(float), data.y_test[te_mask].to_numpy(float)
        mu, sd = (x_tr.mean(), x_tr.std()) if hp.get("standardize_x") else (0.0, 1.0)
        if sd == 0:
            raise DataValidationError("The feature is constant in the training data.")
        z_tr = (x_tr - mu) / sd
        res = gd.run_gradient_descent(z_tr, y_tr, learning_rate=hp["learning_rate"], iterations=hp["iterations"],
                                      w0=hp["w0"], b0=hp["b0"], loss=hp["loss"], tolerance=hp.get("tolerance"))
        progress(0.8)
        slope, intercept = res.w / sd, res.b - res.w * mu / sd     # back to original units
        ols_w, ols_b = gd.closed_form_ols(x_tr, y_tr)
        def _pred(x): return slope * x + intercept
        finite = not res.diverged
        metrics = {"task": "regression",
                   "train": regression_metrics(y_tr, _pred(x_tr)) if finite else None,
                   "test": regression_metrics(y_te, _pred(x_te)) if finite and len(y_te) else None,
                   "test_actual": _cap(y_te.tolist()), "test_predicted": _cap(_pred(x_te).tolist()) if finite else [],
                   "ols_train": regression_metrics(y_tr, ols_w * x_tr + ols_b)}
        history = {"type": "gradient_descent", **res.to_dict(), "x_train": _cap(z_tr.tolist()), "y_train": _cap(y_tr.tolist()),
                   "x_is_standardized": bool(hp.get("standardize_x")), "x_mean": float(mu), "x_sd": float(sd)}
        summary = {"algorithm": "gradient_descent", "feature": feat, "slope": slope, "intercept": intercept,
                   "w_learned": res.w, "b_learned": res.b, "converged": res.converged, "diverged": res.diverged,
                   "stop_reason": res.stop_reason, "iterations_run": res.iterations_run,
                   "ols_slope": ols_w, "ols_intercept": ols_b, "split": split_info,
                   "formulas": formula_explainer.for_algorithm("gradient_descent", hp["loss"])}
        model = TrainedModel(cfg, {"slope": slope, "intercept": intercept, "feature": feat, "diverged": res.diverged},
                             [feat], [])
    else:
        raise DataValidationError(f"Unknown algorithm '{cfg.algorithm}'.")

    progress(1.0)
    return TrainingOutput(model, metrics, history, summary, (time.perf_counter() - t0) * 1000)


def _positive(cfg: TrainingConfig, classes: list[str]) -> str | None:
    if len(classes) != 2:
        return None
    if cfg.positive_label is not None:
        if str(cfg.positive_label) not in classes:
            raise DataValidationError(f"positive_label '{cfg.positive_label}' is not one of {classes}.")
        return str(cfg.positive_label)
    return classes[1]


def _strip(report: dict) -> dict:
    return {k: v for k, v in report.items() if k not in ("predictions", "actual", "predicted")}


def predict(model: TrainedModel, inputs: dict) -> dict:
    cfg = model.config
    if cfg.algorithm == "gradient_descent":
        p = model.obj
        if p["diverged"]:
            raise DataValidationError("This gradient-descent run diverged; it cannot make predictions.")
        try:
            x = float(inputs[p["feature"]])
        except (KeyError, TypeError, ValueError):
            raise DataValidationError(f"Provide a numeric value for '{p['feature']}'.")
        y = p["slope"] * x + p["intercept"]
        return {"prediction": y, "probabilities": None,
                "explanation": {"type": "linear", "formula": f"ŷ = {p['slope']:.6g} × {x:g} + ({p['intercept']:.6g}) = {y:.6g}",
                                "slope": p["slope"], "intercept": p["intercept"], "x": x}}
    X = input_frame(inputs, cfg.features, model.numeric)
    pipe = model.obj
    if cfg.algorithm == "linear_regression":
        exp = reg.explain_prediction(pipe, X)
        return {"prediction": exp["prediction"], "probabilities": None, "explanation": {"type": "linear", **exp}}
    if cfg.algorithm == "logistic_regression":
        classes = [str(c) for c in pipe.named_steps["model"].classes_]
        proba = pipe.predict_proba(X)[0]
        probs = {c: float(p) for c, p in zip(classes, proba)}
        thr = cfg.hyperparameters.get("threshold")
        if len(classes) == 2:
            pos = _positive(cfg, classes)
            t = thr if thr is not None else 0.5
            pred = pos if probs[pos] >= t else [c for c in classes if c != pos][0]
            why = f"P({pos}) = {probs[pos]:.4f} {'≥' if probs[pos] >= t else '<'} threshold {t} → {pred}"
        else:
            pred = classes[int(np.argmax(proba))]
            why = f"Class with the highest probability: {pred} ({max(proba):.4f})"
        return {"prediction": pred, "probabilities": probs, "explanation": {"type": "probability", "rule": why}}
    # decision tree
    tree = dt.extract_tree(pipe)
    path = dt.prediction_path(pipe, tree, X)
    probs = None
    if cfg.task == "classification":
        counts = path["leaf"]["class_counts"]
        tot = sum(counts.values())
        probs = {c: v / tot for c, v in counts.items()}
    return {"prediction": path["prediction"], "probabilities": probs, "explanation": {"type": "tree_path", **path}}
