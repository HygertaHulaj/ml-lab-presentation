"""Presentation concept demos: real computations behind the visual explanations."""
from __future__ import annotations

import numpy as np
from fastapi import APIRouter, Query

from ...ml.concepts import rule_accuracy, threshold_scan, train_test_indices
from ...services.simulation_service import iris_frame

router = APIRouter(tags=["concepts"])

FEATURES = {"petal_length_cm", "petal_width_cm", "sepal_length_cm", "sepal_width_cm"}


@router.get("/concepts/rule-vs-learned",
            summary="A rule written by a person vs a rule learned from labelled examples (Iris versicolor vs virginica)")
def rule_vs_learned(
    feature: str = Query("petal_length_cm"),
    human_threshold: float = Query(5.5, ge=0, le=10, description="The person's rule: 'virginica if feature >= threshold'"),
    seed: int = Query(42, ge=0, le=10_000),
):
    if feature not in FEATURES:
        raise ValueError(f"feature must be one of {sorted(FEATURES)}")
    df = iris_frame()
    df = df[df["species"].isin(["versicolor", "virginica"])].reset_index(drop=True)
    x = df[feature].to_numpy(float)
    y = (df["species"] == "virginica").to_numpy()
    tr, te = train_test_indices(len(df), y, 0.3, seed)
    cands, best = threshold_scan(x[tr], y[tr])
    human_train, _ = rule_accuracy(x[tr], y[tr], human_threshold)
    human_test, _ = rule_accuracy(x[te], y[te], human_threshold)
    learned_test, _ = rule_accuracy(x[te], y[te], best.threshold)
    return {
        "feature": feature,
        "classes": {"negative": "versicolor", "positive": "virginica"},
        "rule": "predict virginica if value >= threshold",
        "train": {"x": x[tr].round(2).tolist(), "positive": y[tr].tolist()},
        "test": {"x": x[te].round(2).tolist(), "positive": y[te].tolist(),
                 # inference: each rule applied to the unseen flowers (prediction = virginica?)
                 "pred_learned": (x[te] >= best.threshold).tolist(), "pred_human": (x[te] >= human_threshold).tolist()},
        "candidates": [{"threshold": c.threshold, "train_accuracy": round(c.train_accuracy, 4)} for c in cands],
        "learned": {"threshold": best.threshold, "train_accuracy": round(best.train_accuracy, 4), "test_accuracy": round(learned_test, 4)},
        "human": {"threshold": human_threshold, "train_accuracy": round(human_train, 4), "test_accuracy": round(human_test, 4)},
        "split": {"test_fraction": 0.3, "seed": seed, "n_train": int(len(tr)), "n_test": int(len(te))},
        "source": "Iris (Fisher, 1936) via scikit-learn; 100 flowers (versicolor, virginica)",
    }


@router.get("/concepts/learning-journey",
            summary="The ML process on Iris with every intermediate state: collect, prepare, features, split, train, predict, evaluate")
def learning_journey_route(
    x_feature: str = Query("petal_length_cm"),
    y_feature: str = Query("petal_width_cm"),
    max_depth: int = Query(2, ge=1, le=5),
    seed: int = Query(42, ge=0, le=10_000),
):
    from ...ml.journey import learning_journey
    return learning_journey(iris_frame(), features=[x_feature, y_feature], max_depth=max_depth, seed=seed)


@router.get("/concepts/analyze-and-produce",
            summary="DS4A §8.2 steps 2-3: fit a model automatically (gradient descent, Shah Table 8.2), then produce results for new data")
def analyze_and_produce(learning_rate: float = Query(0.005, gt=0, le=0.009), frames: int = Query(60, ge=10, le=200)):
    from ...datasets_registry import SHAH_TABLE_8_2 as T
    from ...ml.gradient_descent import closed_form_ols, run_gradient_descent
    x, y = np.array(T["x"], float), np.array(T["y"], float)
    r = run_gradient_descent(x, y, learning_rate=learning_rate, iterations=20_000)
    hist = r.history
    # log-spaced frames: the early iterations change the line the most
    idx = sorted({int(round(v)) for v in np.geomspace(1, len(hist), frames)} | {0, len(hist) - 1})
    idx = [i for i in idx if 0 <= i < len(hist)]
    w_ols, b_ols = closed_form_ols(x, y)
    new_x = [21.0, 23.0, 25.0]
    return {
        "source": "Shah, Hands-On Introduction to Data Science, Table 8.2 (20 rows)",
        "x": x.tolist(), "y": y.tolist(),
        "learning_rate": learning_rate, "iterations_run": r.iterations_run, "stop_reason": r.stop_reason,
        "frames": [{"iteration": hist[i].iteration, "w": round(hist[i].w, 5), "b": round(hist[i].b, 5), "loss": round(hist[i].loss, 4)} for i in idx],
        "final": {"w": round(r.w, 4), "b": round(r.b, 4), "loss": round(r.final_loss, 4)},
        "ols": {"w": round(w_ols, 4), "b": round(b_ols, 4)},
        "new_data": [{"x": v, "prediction": round(r.w * v + r.b, 2)} for v in new_x],
    }


@router.get("/concepts/tree", summary="DS4A 8.3: a real decision tree on the book's car seat or penguin data")
def concept_tree(
    dataset: str = Query("carseats", pattern="^(carseats|penguins)$"),
    target: str = Query("sales_cat"),
    features: str = Query("shelf_location", description="comma-separated explanatory variables"),
    max_depth: int = Query(1, ge=1, le=8),
    min_n: int = Query(2, ge=2, le=200),
):
    from ...datasets_registry import load_builtin
    from ...ml.characteristics import fit_and_describe
    feats = [f.strip() for f in features.split(",") if f.strip()]
    df = load_builtin(dataset)
    tr = load_builtin("carseats_train") if dataset == "carseats" else None
    te = load_builtin("carseats_test") if dataset == "carseats" else None
    return fit_and_describe(df, dataset=dataset, target=target, features=feats, max_depth=max_depth, min_n=min_n, train=tr, test=te)


@router.get("/concepts/carseats-explore", summary="DS4A Figs 8.9 and 8.10 from the real car seat data")
def carseats_explore_route():
    from ...datasets_registry import load_builtin
    from ...ml.characteristics import carseats_explore
    return carseats_explore(load_builtin("carseats"))


_EVAL_CACHE: dict = {}


@router.get("/concepts/evaluation", summary="DS4A 8.4: confusion matrix, metrics, MSE/R², No Free Lunch, over- and underfitting")
def concept_evaluation():
    """Deterministic (official car seat split, seeded synthetic curve), so it is computed once and cached."""
    if "v" not in _EVAL_CACHE:
        from ...datasets_registry import load_builtin
        from ...ml.evaluation import evaluation_bundle
        _EVAL_CACHE["v"] = evaluation_bundle(load_builtin("carseats_train"), load_builtin("carseats_test"))
    return _EVAL_CACHE["v"]


@router.get("/concepts/deep-learning", summary="DS4A 8.5: a real neural network on handwritten digits, its layers and learning curves")
def concept_deep_learning():
    from ...ml.deep import public_bundle
    return public_bundle()


@router.post("/concepts/digits/predict", summary="DS4A 8.5: the trained network reads a drawn 8×8 digit (64 shading values, 0–16)")
def concept_digit_predict(body: dict):
    from ...ml.deep import predict_pixels
    pixels = body.get("pixels")
    if not isinstance(pixels, list) or len(pixels) != 64 or not all(isinstance(v, (int, float)) for v in pixels):
        raise ValueError("pixels must be a list of 64 numbers (an 8×8 image, shading 0–16)")
    return predict_pixels(pixels)


@router.get("/concepts/data-quality", summary="DS4A 8.6: freshness, volume, diversity and quality of training data, measured")
def concept_data_quality():
    from ...ml.data_quality import quality_bundle_cached
    return quality_bundle_cached()


@router.get("/concepts/ethics", summary="DS4A Ch. 8 Ethics in Practice: an under-represented group's error rate, measured, and a mitigation")
def concept_ethics():
    from ...ml.ethics import ethics_bundle_cached
    return ethics_bundle_cached()


_MOVIE_CACHE: dict = {}


@router.get("/concepts/movie-holdout", summary="Back to the movies in DS4A 8.4: in-sample R² versus held-out movies (Shah Problem 8.4 data)")
def concept_movie_holdout():
    if "v" not in _MOVIE_CACHE:
        from ...datasets_registry import load_builtin
        from ...ml.movie_holdout import movie_holdout
        _MOVIE_CACHE["v"] = movie_holdout(load_builtin("csm_movies"))
    return _MOVIE_CACHE["v"]
