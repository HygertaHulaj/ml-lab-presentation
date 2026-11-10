"""HoIDS Ch. 8 Hands-On Problems 8.2-8.4: solvers agree with independent fits (scikit-learn) and with each other."""
import numpy as np
from sklearn.linear_model import LinearRegression

from app.datasets_registry import load_builtin
from app.exercises.registry import get_exercise


def test_hop82_matches_sklearn():
    s = get_exercise("hoids-hop8-2").solve()
    a = load_builtin("airline_costs")
    X = a[["flight_length_miles", "daily_flight_time_hours"]]
    lr = LinearRegression().fit(X, a.customers_served_1000s)
    m1 = s["model_1"]
    assert np.isclose(m1["r2"], lr.score(X, a.customers_served_1000s))
    assert np.allclose([c["estimate"] for c in m1["coefficients"]], [lr.intercept_, *lr.coef_])
    p = {c["term"]: c["p"] for c in m1["coefficients"]}
    assert p["flight_length_miles"] < 0.001 and p["daily_flight_time_hours"] > 0.05
    assert 0.8 < s["model_2"]["r2"] < 0.85 and s["model_2"]["n"] == 31


def test_hop83_gradient_descent_equals_ols():
    s = get_exercise("hoids-hop8-3").solve()
    ols, gd_ = s["answers"][0]["answer"], s["answers"][1]["answer"]
    assert gd_["stop_reason"] == "converged"
    assert np.isclose(ols["intercept"], gd_["intercept"], rtol=1e-5)
    for f in ("area", "peri", "shape"):
        assert np.isclose(ols["coefficients"][f], gd_["coefficients"][f], rtol=1e-4)
    assert len(s["fit"]["perm"]) == 48


def test_hop84_same_rows_and_gd():
    s = get_exercise("hoids-hop8-4").solve()
    assert s["model_a"]["n"] == s["model_b"]["n"] == s["n_complete"] < s["n_movies"]
    assert s["model_b"]["r2"] > s["model_a"]["r2"] and s["model_b"]["adj_r2"] > s["model_a"]["adj_r2"]
    c = s["answers"][2]["answer"]
    assert c["best_predictor"] == max(s["correlations"], key=lambda k: abs(s["correlations"][k]))
    assert np.isclose(c["gd_slope"], c["ols_slope"], rtol=1e-3) and np.isclose(c["gd_intercept"], c["ols_intercept"], rtol=1e-4)


def test_hop81_book_ratings_match_sklearn():
    """Problem 8.1 on the book's OA 8.3 ratings.tsv: least squares checked against scikit-learn."""
    import numpy as np
    from sklearn.linear_model import LinearRegression
    from app.datasets_registry import load_builtin
    from app.exercises.hoids.chapter8_problems import HOP81
    df = load_builtin("restaurant_ratings")
    assert list(df.columns) == ["restaurant", "food", "ambience", "service", "rating"] and len(df) == 15
    r = HOP81.solver({})
    X = df[["ambience", "food", "service"]]
    m = LinearRegression().fit(X, df["rating"])
    a = r["answers"][2]["answer"]
    assert abs(a["intercept"] - m.intercept_) < 1e-9
    assert np.allclose([a["ambience"], a["food"], a["service"]], m.coef_)
    assert abs(a["r2"] - m.score(X, df["rating"])) < 1e-9
    sse = [c["sse"] for c in r["candidates"]]
    assert sse[-1] == min(sse)  # least squares beats every hand-tried parameter set
    for e in r["examples"]:
        assert abs(e["predictions"][-1] - float(m.predict(np.array([[e["ambience"], e["food"], e["service"]]]))[0])) < 1e-9


def test_shah_table_8_2_file_matches_the_transcription():
    from app.datasets_registry import SHAH_TABLE_8_2, load_builtin
    d = load_builtin("shah_regression")
    assert d["x"].tolist() == SHAH_TABLE_8_2["x"] and d["y"].tolist() == SHAH_TABLE_8_2["y"]


def test_hop81_is_served(client):
    j = client.post("/api/v1/exercises/hoids-hop8-1/solve", json={}).json()
    assert len(j["answers"]) == 3 and j["n_restaurants"] == 15 and j["exercise_id"] == "hoids-hop8-1"
