"""Back to the movies (DS4A 8.4 × Shah Problem 8.4): fitted versus held-out scores, computed on the same complete movies."""
import numpy as np

from app.datasets_registry import load_builtin
from app.ml.linreg_gd import linreg_gd_trace
from app.ml.movie_holdout import CANDIDATES, movie_holdout


def test_split_is_disjoint_and_matches_the_worked_example():
    df = load_builtin("csm_movies")
    r = movie_holdout(df)
    assert r["n"] == r["n_train"] + r["n_test"] and r["n_test"] == round(r["n"] * 0.3)
    assert sum(m["set"] == "test" for m in r["movies"]) == r["n_test"]
    # the in-sample R² equals the lesson's least-squares R² on the same complete movies
    t = linreg_gd_trace(df, predictors=["budget"], response="ratings", complete_on=CANDIDATES)
    assert t["n"] == r["n"]
    assert abs(r["models"][0]["fitted_r2_all"] - t["ols"]["r2"]) < 1e-9
    assert r == movie_holdout(df)  # deterministic


def test_held_out_scores_come_from_a_training_only_fit():
    df = load_builtin("csm_movies")
    r = movie_holdout(df)
    test = [m for m in r["movies"] if m["set"] == "test"]
    y = np.array([m["rating"] for m in test]); p = np.array([m["budget_prediction"] for m in test])
    assert abs(float(np.mean((y - p) ** 2)) - r["models"][0]["test_mse"]) < 1e-9
    s = r["budget_test_r2_over_seeds"]
    assert s["min"] <= s["median"] <= s["max"] and s["seeds"] == 50
    for m in r["models"]:
        assert m["train_r2"] > m["test_r2"]  # optimistic on the movies it learned from


def test_endpoint(client):
    r = client.get("/api/v1/concepts/movie-holdout")
    assert r.status_code == 200 and len(r.json()["models"]) == 3
