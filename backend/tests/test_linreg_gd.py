"""Cinematic lessons for Shah Ch. 8: the gradient-descent trace reaches least squares, frames are ordered, and the
three lesson manifests are served and their parts run."""
import numpy as np
from sklearn.linear_model import LinearRegression

from app.datasets_registry import load_builtin
from app.ml.linreg_gd import linreg_gd_trace


def test_trace_reaches_least_squares_and_sklearn():
    m = load_builtin("csm_movies")
    t = linreg_gd_trace(m, predictors=["budget"], response="ratings", learning_rate=0.1, iterations=5000,
                        complete_on=["aggregate_followers", "likes", "dislikes", "comments"])
    assert t["stop_reason"] == "converged" and t["n"] == 195
    d = m.dropna(subset=["budget", "ratings", "aggregate_followers", "likes", "dislikes", "comments"])
    lr = LinearRegression().fit(d[["budget"]], d["ratings"])
    assert np.isclose(t["final"]["coefficients"][0], lr.coef_[0], rtol=1e-4)
    assert np.isclose(t["final"]["intercept"], lr.intercept_, rtol=1e-5)
    its = [f["iteration"] for f in t["frames"]]
    assert its[0] == 0 and its == sorted(its) and its[-1] == t["iterations_run"]
    costs = [f["cost"] for f in t["frames"]]
    assert all(a >= b - 1e-12 for a, b in zip(costs, costs[1:]))  # cost never rises at a safe learning rate
    s = t["surface"]
    assert np.isclose(s["minimum"]["cost"], t["final"]["cost"], rtol=1e-6)
    assert len(s["cost"]) == 41 and len(s["cost"][0]) == 41


def test_plane_slice_holds_other_predictors_at_their_means():
    r = load_builtin("rock")
    t = linreg_gd_trace(r, predictors=["area", "peri", "shape"], response="perm", shown=["peri", "area"])
    f = t["frames"][-1]
    b0, (ba, bp, bs) = f["intercept"], f["coefficients"]
    assert t["held_at_mean"] == ["shape"] and not t["exact_display"]
    assert np.isclose(f["display"]["intercept"], b0 + bs * t["means"]["shape"])
    assert np.allclose(f["display"]["slopes"], [bp, ba])


def test_divergence_is_reported():
    t = linreg_gd_trace(load_builtin("csm_movies"), predictors=["budget"], response="ratings", learning_rate=2.4, iterations=500)
    assert t["stop_reason"] == "diverged" and "surface" in t


def test_lessons_served_and_parts_run(client):
    for lid in ("shah-8-2-airlines", "shah-8-3-rock", "shah-8-4-movies"):
        man = client.get(f"/api/v1/lessons/{lid}").json()
        assert man["algorithm"] == "linreg_gd" and man["parts"]
        for part in man["parts"]:
            r = client.post("/api/v1/simulations/linreg-gd", json=part["config"]).json()
            tr = r["trace"]
            assert tr["stop_reason"] == "converged"
            assert np.allclose(tr["final"]["coefficients"], tr["ols"]["coefficients"], rtol=1e-3)
            assert (part["kind"] == "line") == ("surface" in tr)
    bad = client.post("/api/v1/simulations/linreg-gd", json={"dataset": "nope", "predictors": ["x"], "response": "y"})
    assert bad.status_code in (400, 404, 422)


def test_diagnostics_and_single_predictor_criterion():
    """Audit A8/A9: residual diagnostics of the least-squares fit, and |r| ranking = one-predictor R² on the same rows."""
    import numpy as np
    from app.datasets_registry import load_builtin
    from app.ml.linreg_gd import linreg_gd_trace
    df = load_builtin("csm_movies")
    cand = ["budget", "aggregate_followers", "likes", "dislikes", "comments"]
    t = linreg_gd_trace(df, predictors=["budget"], response="ratings", rank_single=cand, complete_on=cand)
    d = t["diagnostics"]
    y = np.asarray(t["points"]["y"])
    assert np.allclose(np.asarray(d["fitted"]) + np.asarray(d["residuals"]), y)
    assert abs(float(np.mean(d["residuals"]))) < 1e-8  # least squares with an intercept
    ranks = t["single_predictors"]
    assert [abs(q["r"]) for q in ranks] == sorted((abs(q["r"]) for q in ranks), reverse=True)
    assert ranks[0]["predictor"] == "budget" and abs(ranks[0]["r2"] - t["ols"]["r2"]) < 1e-9  # R² = r² for one predictor
    rock = linreg_gd_trace(load_builtin("rock"), predictors=["area", "peri", "shape"], response="perm", shown=["peri", "area"])
    assert 0 < rock["diagnostics"]["log_response_r2"] < 1
