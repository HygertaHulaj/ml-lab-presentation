"""Parameterised practice problems with computed answers.

A problem id has the form "<category>:<difficulty>:<seed>". The problem (and its answer) is a
deterministic function of the id, so answers are checked by regenerating and recomputing —
the client never needs the answer key in advance.
"""
from __future__ import annotations

import math
import random

from ..core.exceptions import AppError
from ..explainability.decision_tree_explainer import gini
from ..ml import gradient_descent as gd
from ..ml.metrics import BinaryCounts, binary_metrics

DIFFICULTIES = ("beginner", "intermediate", "advanced")
REL_TOL, ABS_TOL = 0.01, 0.006   # accepts rounding to 2 decimals

_SCENARIOS = [  # (scenario, answer) — response-type rule from DS4A §8.3
    ("Predicting the number of bikes rented tomorrow", "regression"),
    ("Predicting whether a transaction is fraudulent", "classification"),
    ("Predicting a student's final exam score (0–100)", "regression"),
    ("Predicting which of 4 genres a song belongs to", "classification"),
    ("Predicting monthly electricity cost in euros", "regression"),
    ("Predicting whether a patient will be readmitted within 30 days", "classification"),
    ("Predicting the selling price of a used phone", "regression"),
    ("Predicting the language a tweet is written in", "classification"),
    ("Predicting the travel time of a delivery in minutes", "regression"),
    ("Predicting whether a seedling will survive the winter", "classification"),
]


def _rng(seed: int) -> random.Random:
    return random.Random(seed)


def generate(category: str, difficulty: str, seed: int) -> dict:
    if difficulty not in DIFFICULTIES:
        raise AppError(f"difficulty must be one of {DIFFICULTIES}.")
    if not (0 <= seed < 10**9):
        raise AppError("seed must be between 0 and 999999999.")
    gen = _GENERATORS.get(category)
    if gen is None:
        raise AppError(f"Unknown category '{category}'. Choose from {sorted(_GENERATORS)}.")
    p = gen(_rng(seed), difficulty)
    p["problem_id"] = f"{category}:{difficulty}:{seed}"
    p["category"], p["difficulty"] = category, difficulty
    p["origin"] = "supplementary (generated practice problem)"
    return p


def public(problem: dict) -> dict:
    return {k: v for k, v in problem.items() if k not in ("solution", "explanation")}


def check(problem_id: str, answers: dict) -> dict:
    try:
        category, difficulty, seed = problem_id.split(":")
        seed = int(seed)
    except ValueError:
        raise AppError("Malformed problem_id.")
    p = generate(category, difficulty, seed)
    results, all_ok = {}, True
    for key, expected in p["solution"].items():
        given = answers.get(key)
        ok = _compare(given, expected)
        all_ok &= ok
        results[key] = {"given": given, "expected": expected, "correct": ok}
    return {"problem_id": problem_id, "correct": all_ok, "results": results, "explanation": p["explanation"]}


def _compare(given, expected) -> bool:
    if given is None:
        return False
    if isinstance(expected, str):
        return str(given).strip().lower() == expected.lower()
    if expected is None:
        return str(given).strip().lower() in ("undefined", "none", "nan", "")
    try:
        g = float(given)
    except (TypeError, ValueError):
        return False
    return math.isclose(g, float(expected), rel_tol=REL_TOL, abs_tol=ABS_TOL)


# ------------------------------------------------------------------ generators
def _confusion(r: random.Random, diff: str) -> dict:
    hi = {"beginner": 30, "intermediate": 120, "advanced": 500}[diff]
    tp, fp, fn, tn = (r.randint(1, hi) for _ in range(4))
    if diff == "advanced" and r.random() < 0.3:
        fp = tp = 0   # zero denominator for precision: must answer "undefined"
        tp = 0
    m = binary_metrics(BinaryCounts(tp, fp, fn, tn))
    keys = ["accuracy", "precision", "recall", "specificity"] + (["f1"] if diff != "beginner" else [])
    sol = {k: (None if m[k] is None else round(m[k], 4)) for k in keys}
    return {"title": "Confusion-matrix metrics",
            "prompt": f"A classifier produced TP = {tp}, FP = {fp}, FN = {fn}, TN = {tn}. Compute "
                      + ", ".join(keys) + " (two decimals; write 'undefined' if a denominator is 0).",
            "data": {"tp": tp, "fp": fp, "fn": fn, "tn": tn}, "answer_fields": keys, "solution": sol,
            "explanation": [m["calculations"].get(k, "") for k in keys if k in m["calculations"]]
                           + ([f"F1 = 2PR/(P+R) = {m['f1']:.4f}"] if "f1" in keys and m["f1"] is not None else [])}


def _reg_vs_clf(r: random.Random, diff: str) -> dict:
    s, a = r.choice(_SCENARIOS)
    return {"title": "Regression or classification?", "prompt": s + ". Regression or classification?",
            "data": {}, "answer_fields": ["approach"], "solution": {"approach": a},
            "explanation": ["Look only at the response: " + ("it is a number → regression." if a == "regression"
                                                             else "it is a category → classification.")]}


def _linear_prediction(r: random.Random, diff: str) -> dict:
    if diff == "advanced":
        n = 5
        x = sorted(r.sample(range(1, 15), n))
        y = [round(2 + 1.5 * xi + r.uniform(-3, 3), 1) for xi in x]
        w, b = gd.closed_form_ols(x, y)
        return {"title": "Least-squares line by hand", "prompt": f"Points x = {x}, y = {y}. Compute the least-squares slope and intercept.",
                "data": {"x": x, "y": y}, "answer_fields": ["slope", "intercept"],
                "solution": {"slope": round(w, 4), "intercept": round(b, 4)},
                "explanation": ["slope = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)²", "intercept = ȳ − slope·x̄",
                                f"slope = {w:.4f}, intercept = {b:.4f}"]}
    k = 1 if diff == "beginner" else 3
    b0 = round(r.uniform(-20, 20), 1)
    coefs = [round(r.uniform(-5, 5), 2) for _ in range(k)]
    xs = [r.randint(0, 20) for _ in range(k)]
    yhat = b0 + sum(c * v for c, v in zip(coefs, xs))
    terms = " + ".join(f"{c}·x{i + 1}" for i, c in enumerate(coefs))
    return {"title": "Prediction from a fitted linear model",
            "prompt": f"ŷ = {b0} + {terms}. Compute ŷ for " + ", ".join(f"x{i + 1} = {v}" for i, v in enumerate(xs)) + ".",
            "data": {"intercept": b0, "coefficients": coefs, "x": xs}, "answer_fields": ["prediction"],
            "solution": {"prediction": round(yhat, 4)},
            "explanation": [f"ŷ = {b0} + " + " + ".join(f"{c}×{v}" for c, v in zip(coefs, xs)) + f" = {yhat:.4f}"]}


def _gradient_step(r: random.Random, diff: str) -> dict:
    n = {"beginner": 2, "intermediate": 3, "advanced": 4}[diff]
    x = [r.randint(1, 6) for _ in range(n)]
    y = [r.randint(1, 15) for _ in range(n)]
    w = round(r.uniform(-1, 2), 1) if diff != "beginner" else 0.0
    b = round(r.uniform(-1, 1), 1) if diff == "advanced" else 0.0
    alpha = r.choice([0.01, 0.05, 0.1])
    d = gd.iteration_detail(x, y, w, b, alpha, "mse")
    return {"title": "One gradient-descent step (MSE)",
            "prompt": f"Data x = {x}, y = {y}. Model ŷ = wx + b with w = {w}, b = {b}, learning rate α = {alpha}, loss MSE. "
                      "Compute ∂MSE/∂w, ∂MSE/∂b, and the updated w and b.",
            "data": {"x": x, "y": y, "w": w, "b": b, "alpha": alpha}, "answer_fields": ["grad_w", "grad_b", "w_next", "b_next"],
            "solution": {"grad_w": round(d["grad_w"], 4), "grad_b": round(d["grad_b"], 4),
                         "w_next": round(d["w_next"], 4), "b_next": round(d["b_next"], 4)},
            "explanation": [f"predictions ŷ = {[round(v, 3) for v in d['predictions']]}",
                            f"errors ŷ−y = {[round(v, 3) for v in d['errors']]}",
                            f"∂MSE/∂w = (2/{n})·Σ(ŷ−y)x = (2/{n})·{d['sum_error_times_x']:.4f} = {d['grad_w']:.4f}",
                            f"∂MSE/∂b = (2/{n})·Σ(ŷ−y) = (2/{n})·{d['sum_error']:.4f} = {d['grad_b']:.4f}",
                            f"w_new = {w} − {alpha}×{d['grad_w']:.4f} = {d['w_next']:.4f}",
                            f"b_new = {b} − {alpha}×{d['grad_b']:.4f} = {d['b_next']:.4f}"]}


def _gini(r: random.Random, diff: str) -> dict:
    k = 2 if diff == "beginner" else 3
    if diff != "advanced":
        counts = [r.randint(0, 60) for _ in range(k)]
        counts[0] += 1
        g = gini(counts)
        return {"title": "Gini impurity of a node", "prompt": f"A node has class counts {counts}. Compute its Gini impurity.",
                "data": {"counts": counts}, "answer_fields": ["gini"], "solution": {"gini": round(g, 4)},
                "explanation": [f"n = {sum(counts)}; p = {[round(c / sum(counts), 4) for c in counts]}",
                                f"Gini = 1 − Σp² = {g:.4f}"]}
    left = [r.randint(1, 50) for _ in range(k)]
    right = [r.randint(1, 50) for _ in range(k)]
    parent = [a + b for a, b in zip(left, right)]
    gp, gl, gr = gini(parent), gini(left), gini(right)
    nl, nr, n = sum(left), sum(right), sum(parent)
    dec = gp - (nl * gl + nr * gr) / n
    return {"title": "Impurity decrease of a split",
            "prompt": f"A split sends class counts {left} left and {right} right. Compute the parent Gini and the impurity decrease.",
            "data": {"left": left, "right": right}, "answer_fields": ["gini_parent", "decrease"],
            "solution": {"gini_parent": round(gp, 4), "decrease": round(dec, 4)},
            "explanation": [f"parent counts {parent}: Gini = {gp:.4f}", f"left Gini = {gl:.4f}, right Gini = {gr:.4f}",
                            f"decrease = {gp:.4f} − ({nl}×{gl:.4f} + {nr}×{gr:.4f})/{n} = {dec:.4f}"]}


def _fit_diag(r: random.Random, diff: str) -> dict:
    kind = r.choice(["overfitted", "well-fitted", "underfitted"])
    base = round(r.uniform(0.5, 0.65), 2)
    if kind == "overfitted":
        tr, te = round(r.uniform(0.93, 1.0), 2), round(r.uniform(0.6, 0.75), 2)
    elif kind == "well-fitted":
        tr = round(r.uniform(0.82, 0.9), 2); te = round(tr - r.uniform(0.0, 0.04), 2)
    else:
        tr = round(base + r.uniform(-0.02, 0.02), 2); te = round(base + r.uniform(-0.03, 0.01), 2)
    return {"title": "Over-, under- or well-fitted?",
            "prompt": f"Training accuracy {tr}, test accuracy {te}. Always predicting the majority class gives {base}. "
                      "Is the model overfitted, well-fitted or underfitted?",
            "data": {"train": tr, "test": te, "baseline": base}, "answer_fields": ["diagnosis"],
            "solution": {"diagnosis": kind},
            "explanation": ["Overfitted: much better on training than test.", "Underfitted: no better than the baseline on both.",
                            "Well-fitted: good on both with a small gap."]}


_GENERATORS = {"confusion_matrix": _confusion, "regression_vs_classification": _reg_vs_clf,
               "linear_prediction": _linear_prediction, "gradient_step": _gradient_step,
               "gini": _gini, "fit_diagnosis": _fit_diag}

CATEGORIES = {
    "confusion_matrix": "Accuracy, precision, recall, specificity (DS4A §8.4)",
    "regression_vs_classification": "Regression vs classification (DS4A §8.3)",
    "linear_prediction": "Linear regression predictions and least squares (HoIDS §8.3)",
    "gradient_step": "One gradient-descent update (HoIDS §8.4)",
    "gini": "Gini impurity and split quality (decision trees)",
    "fit_diagnosis": "Overfitting and underfitting (DS4A §8.4)",
}
