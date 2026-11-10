"""Builds plain-language explanations from the *recorded* values of a training run.

Every sentence is assembled from numbers stored in the run (metrics, coefficients, tree nodes,
gradient-descent history). If a value is not available, the explanation says so rather than
guessing.
"""
from __future__ import annotations

from ..ml import gradient_descent as gd


def _fmt(v, nd=4):
    return "n/a" if v is None else f"{v:.{nd}f}"


def explain_run(experiment: dict, metrics: dict, summary: dict, history: dict) -> dict:
    algo = experiment["algorithm"]
    target, feats = experiment["target_column"], experiment["feature_columns"]
    split = summary.get("split", {})
    base = {
        "dataset_used": f"{split.get('train_rows', '?')} training rows and {split.get('test_rows', '?')} test rows "
                        f"(random seed {experiment['random_seed']}, test share {experiment['test_size']}).",
        "features": feats, "target": target, "task": experiment["task"],
        "leakage_guard": split.get("leakage_guard"),
    }
    m_tr, m_te = metrics.get("train"), metrics.get("test")
    if metrics.get("task") == "regression" and m_tr and m_te:
        perf = (f"Training R² = {_fmt(m_tr['r2'], 3)}, test R² = {_fmt(m_te['r2'], 3)}; test RMSE = {_fmt(m_te['rmse'], 3)} "
                f"(average size of a prediction error, in units of {target}).")
    elif metrics.get("task") == "classification" and m_tr and m_te:
        perf = f"Training accuracy = {_fmt(m_tr['accuracy'], 3)}, test accuracy = {_fmt(m_te['accuracy'], 3)}."
        if m_te.get("binary"):
            b = m_te["binary"]
            perf += (f" For positive class '{metrics['positive_label']}': precision {_fmt(b['precision'], 3)}, "
                     f"recall {_fmt(b['recall'], 3)}, specificity {_fmt(b['specificity'], 3)}.")
    elif m_tr:
        key = "r2" if metrics.get("task") == "regression" else "accuracy"
        perf = (f"Trained on all rows (no test split), so only training performance is available: {key} = "
                f"{_fmt(m_tr.get(key), 3)}. This shows how well the model fits, not how well it generalizes.")
    else:
        perf = "Performance metrics are unavailable (the run diverged or failed)."
    gap_note = None
    if m_tr and m_te:
        key = "r2" if metrics["task"] == "regression" else "accuracy"
        if m_tr.get(key) is not None and m_te.get(key) is not None:
            gap = m_tr[key] - m_te[key]
            gap_note = (f"Generalization gap ({key}, train − test) = {gap:.3f}. "
                        + ("A large positive gap suggests the model fits training details that do not carry over to new data."
                           if gap > 0.1 else "The gap is small, so training performance is a fair guide to test performance."))

    if algo == "linear_regression":
        coefs = summary["coefficients"]
        learns = f"One intercept and {len(coefs)} coefficient(s): {summary['equation']}."
        how = ("Least squares picks the coefficients that minimise the sum of squared errors on the training rows. "
               "It is solved exactly (no iterations).")
        params = [f"{k}: {v:+.4f} → holding other features fixed, a 1-unit increase in {k} changes the prediction by {v:+.4f}."
                  for k, v in coefs.items()]
        predicts = "Prediction = intercept + Σ coefficient × feature value."
        cannot = ["Coefficients show association in this data, not causation.",
                  "Predictions far outside the training range (extrapolation) are unreliable.",
                  "A straight-line model cannot capture curved relationships unless features are transformed."]
    elif algo == "logistic_regression":
        learns = "An intercept and one weight per (standardised) feature, defining a probability via the logistic function."
        how = (f"The L-BFGS optimiser minimised log-loss in {history.get('iterations', '?')} iterations "
               "(per-iteration values are not exposed by scikit-learn).")
        params = [summary.get("note", "")]
        predicts = "The weighted sum is converted to a probability; the class is chosen with the decision threshold."
        cannot = ["Assumes the log-odds are linear in the features.", "Probabilities are only as calibrated as the training data allow."]
    elif algo == "decision_tree":
        tree = summary["tree"]
        root = tree["nodes"][0]
        learns = (f"A tree of depth {tree['depth']} with {tree['n_splits']} split(s) and {tree['n_leaves']} leaves, "
                  f"using {', '.join(tree['features_used']) or 'no features (single leaf)'}.")
        how = (f"The tree starts with all {root['samples']} training rows (impurity {root['impurity']:.4f}, criterion "
               f"{tree['criterion']}). At each node it tries every feature/threshold and keeps the question with the largest "
               "impurity decrease, until max_depth or the minimum-sample rules stop it."
               + (f" First question: '{root['question']}' (impurity decrease {root['impurity_decrease']:.4f})." if not root["is_leaf"] else ""))
        params = [f"{k}: importance {v:.3f}" for k, v in list(tree["feature_importances"].items())[:8]]
        predicts = "A new row answers the questions from the root down; the leaf it reaches gives the prediction."
        cannot = ["Deep trees can memorise noise (overfit).", "Thresholds are midpoints between observed values; small data changes can change the tree.",
                  "Feature importance measures use in splits, not causal effect."]
    elif algo == "gradient_descent":
        h = history
        steps = h.get("history", [])
        learns = (f"Slope and intercept of ŷ = w·x + b. Final (original units): slope {summary['slope']:.6g}, "
                  f"intercept {summary['intercept']:.6g}; least squares on the same training data: "
                  f"slope {summary['ols_slope']:.6g}, intercept {summary['ols_intercept']:.6g}.")
        if steps:
            first, last = steps[0], steps[-1]
            how = (f"Started at w = {first['w']:.4g}, b = {first['b']:.4g} with loss {first['loss']:.6g}. After "
                   f"{h['iterations_run']} iteration(s) the loss was {last['loss']:.6g}. Stop reason: {h['stop_reason']}.")
        else:
            how = "No iterations were recorded."
        params = [f"learning rate α = {h['learning_rate']}", f"loss = {h['loss_name']}",
                  f"x standardised: {h.get('x_is_standardized')}"]
        predicts = f"ŷ = {summary['slope']:.6g} × x + ({summary['intercept']:.6g})."
        cannot = ["Gradient descent only finds the best line for this model form; it cannot fix a non-linear relationship.",
                  "If it has not converged, its coefficients differ from the least-squares optimum."]
        if summary.get("diverged"):
            cannot.insert(0, "This run DIVERGED: the learning rate was too large, so each step overshot the minimum.")
    else:
        learns = how = predicts = ""
        params, cannot = [], []
    return {**base, "what_it_learns": learns, "how_training_works": how, "learned_parameters": params,
            "how_predictions_are_made": predicts, "performance": perf, "generalization": gap_note,
            "limitations": cannot}


def gradient_descent_steps(history: dict, start: int = 0, limit: int = 50) -> dict:
    steps = history.get("history", [])
    return {"type": "gradient_descent", "total_recorded": len(steps), "recorded_every": history.get("recorded_every", 1),
            "learning_rate": history.get("learning_rate"), "loss_name": history.get("loss_name"),
            "steps": steps[start:start + limit]}


def gradient_descent_iteration(history: dict, index: int) -> dict:
    """Full per-point breakdown of one recorded iteration, recomputed from the recorded (w, b).
    Predictions/errors are deterministic functions of (w, b, data), so this is exact."""
    steps = history.get("history", [])
    if not (0 <= index < len(steps)):
        raise IndexError(f"Iteration index must be between 0 and {len(steps) - 1}.")
    s = steps[index]
    detail = gd.iteration_detail(history["x_train"], history["y_train"], s["w"], s["b"],
                                 history["learning_rate"], history["loss_name"])
    detail["iteration"] = s["iteration"]
    detail["matches_recorded"] = {"grad_w": abs(detail["grad_w"] - s["grad_w"]) < 1e-6 * max(1, abs(s["grad_w"])),
                                  "grad_b": abs(detail["grad_b"] - s["grad_b"]) < 1e-6 * max(1, abs(s["grad_b"]))}
    detail["narrative"] = [
        f"1. Current parameters: w = {s['w']:.6g}, b = {s['b']:.6g}.",
        f"2. Predictions ŷᵢ = w·xᵢ + b for all {detail['n']} training points.",
        f"3. Errors eᵢ = ŷᵢ − yᵢ; Σe = {detail['sum_error']:.6g}, Σe·x = {detail['sum_error_times_x']:.6g}.",
        f"4. Loss = {s['loss']:.6g}.",
        f"5. Gradients: ∂L/∂w = {s['grad_w']:.6g}, ∂L/∂b = {s['grad_b']:.6g}.",
        f"6. Update: w = {s['w']:.6g} − {history['learning_rate']} × {s['grad_w']:.6g} = {s['w_next']:.6g}; "
        f"b = {s['b']:.6g} − {history['learning_rate']} × {s['grad_b']:.6g} = {s['b_next']:.6g}.",
        f"7. New line: ŷ = {s['w_next']:.6g}·x + {s['b_next']:.6g}.",
    ]
    return detail
