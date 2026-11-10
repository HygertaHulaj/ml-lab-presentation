"""HoIDS Chapter 8 Hands-On Problem datasets (OA 8.4 Airline Costs, OA 8.5 rock, OA 8.6 CSM movies) load as documented."""
from app.datasets_registry import BUILTIN, load_builtin


def test_airline_costs():
    a = load_builtin("airline_costs")
    assert a.shape == (31, 12)
    assert a.loc[a.airline == "American", "customers_served_1000s"].item() == 56928
    assert {"flight_length_miles", "daily_flight_time_hours", "total_assets_100k"} <= set(a.columns)
    assert a.drop(columns="airline").notna().all().all()
    assert "Proctor" in BUILTIN["airline_costs"]["source"]


def test_csm_movies():
    m = load_builtin("csm_movies")
    assert m.shape[0] == 231 and set(m.year.unique()) == {2014, 2015}
    assert {"ratings", "budget", "aggregate_followers", "likes", "dislikes", "comments"} <= set(m.columns)
    assert m.ratings.between(1, 10).all()


def test_rock_still_there():
    assert load_builtin("rock").shape == (48, 4)
