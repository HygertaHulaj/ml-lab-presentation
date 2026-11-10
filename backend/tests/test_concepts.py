"""Presentation concept demo: the learned one-feature rule is a real, reproducible computation."""
import numpy as np
from sklearn.tree import DecisionTreeClassifier

from app.ml.concepts import rule_accuracy, threshold_scan, train_test_indices


def test_threshold_scan_finds_the_best_rule_by_brute_force():
    rng = np.random.default_rng(0)
    x = np.concatenate([rng.normal(4.3, 0.5, 40), rng.normal(5.5, 0.5, 40)])
    y = np.array([False] * 40 + [True] * 40)
    cands, best = threshold_scan(x, y)
    brute = max(rule_accuracy(x, y, t)[1] for t in np.linspace(x.min() - 1, x.max() + 1, 4001))
    assert best.correct == brute
    assert len(cands) == len(np.unique(x)) - 1
    # a depth-1 tree (Gini) never beats the accuracy-optimal stump on training data
    stump = DecisionTreeClassifier(max_depth=1, random_state=0).fit(x.reshape(-1, 1), y)
    assert (stump.predict(x.reshape(-1, 1)) == y).sum() <= best.correct


def test_split_is_stratified_and_seeded():
    y = np.array([0] * 50 + [1] * 50)
    a = train_test_indices(100, y, 0.3, 42)
    b = train_test_indices(100, y, 0.3, 42)
    assert (a[0] == b[0]).all() and len(a[1]) == 30 and (y[a[1]] == 1).sum() == 15
    assert not set(a[0]) & set(a[1])


def test_rule_vs_learned_endpoint(client):
    r = client.get("/api/v1/concepts/rule-vs-learned", params={"human_threshold": 5.5}).json()
    assert r["split"]["n_train"] == 70 and r["split"]["n_test"] == 30
    assert len(r["candidates"]) > 10
    best = max(c["train_accuracy"] for c in r["candidates"])
    assert r["learned"]["train_accuracy"] == best
    assert r["learned"]["train_accuracy"] >= r["human"]["train_accuracy"]
    assert 4.5 < r["learned"]["threshold"] < 5.3
    t = r["test"]
    acc = sum(p == y for p, y in zip(t["pred_learned"], t["positive"])) / len(t["x"])
    assert round(acc, 4) == r["learned"]["test_accuracy"]
    assert round(sum(p == y for p, y in zip(t["pred_human"], t["positive"])) / len(t["x"]), 4) == r["human"]["test_accuracy"]          # the textbook-known versicolor/virginica boundary region
    assert client.get("/api/v1/concepts/rule-vs-learned", params={"feature": "colour"}).status_code in (400, 422)
