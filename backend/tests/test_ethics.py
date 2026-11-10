"""Ethics in Practice (DS4A pp. 394–395): under-representation raises one group's error while overall accuracy hides it."""
import pytest


@pytest.fixture(scope="module")
def e(client):
    return client.get("/api/v1/concepts/ethics").json()


def test_minority_error_falls_with_representation(e):
    s = e["sweep"]
    assert s[0]["n_minority"] == 0 and s[0]["minority_error"] == 1.0  # never seen: never recognised
    assert s[-1]["n_minority"] == e["train_counts"]["Chinstrap"]
    errs = [p["minority_error"] for p in s]
    assert errs[0] > errs[3] > errs[-1]
    assert all(p["majority_error"] <= 0.02 for p in s)  # the majority is served well throughout


def test_overall_accuracy_hides_the_gap(e):
    p = next(x for x in e["sweep"] if x["n_minority"] == 5)
    assert p["overall_accuracy"] > 0.9 and p["minority_error"] > 0.2


def test_reweighting_and_auditing_close_the_gap(e):
    m = e["mitigation"]
    assert m["after_reweighting"]["minority_error"] < m["before"]["minority_error"] / 2
    assert m["after_reweighting"]["majority_error"] <= 0.05
