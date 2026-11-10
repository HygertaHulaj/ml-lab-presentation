"""DS4A section 8.5: the stored network is a real, reproducible network on real digits."""
import numpy as np
import pytest

from app.ml import deep


@pytest.fixture(scope="module")
def b(client):
    return client.get("/api/v1/concepts/deep-learning").json()


def test_bundle_shape(b):
    assert b["architecture"] == [64, 32, 16, 10]
    assert b["dataset"]["n"] == 1797 and (b["dataset"]["n_train"], b["dataset"]["n_test"]) == (1437, 360)
    assert b["n_weights"] == 64 * 32 + 32 + 32 * 16 + 16 + 16 * 10 + 10
    assert b["test_accuracy"] > 0.95 and b["train_accuracy"] >= b["test_accuracy"]
    assert "weights" not in b
    assert [e["label"] for e in b["examples"]] == list(range(10))
    assert all(e["prediction"] == e["label"] for e in b["examples"])
    assert all(m["prediction"] != m["label"] for m in b["misclassified"])
    assert b["n_wrong"] == round((1 - b["test_accuracy"]) * 360)


def test_stored_file_equals_a_fresh_training_run():
    """The JSON shipped with the backend is exactly what training produces (deterministic)."""
    stored = deep.load_bundle()
    net = deep.network()
    _, Xte, _, yte, _ = deep.data()
    assert stored["test_accuracy"] == round(float((net.predict(Xte) == yte).mean()), 4)
    for W, w in zip(net.coefs_, stored["weights"]["coefs"]):
        assert np.allclose(W, w, atol=1e-6)


def test_forward_pass_equals_predict_proba():
    net = deep.network()
    _, Xte, _, _, _ = deep.data()
    for x in Xte[:25]:
        probs = deep.forward(net.coefs_, net.intercepts_, x)[-1]
        assert np.allclose(probs, net.predict_proba(x[None])[0], atol=1e-9)


def test_learning_curves_fig_8_24(b):
    curves = {c["method"]: [p["accuracy"] for p in c["points"]] for c in b["learning_curves"]}
    assert len(curves) == 3 and all(len(v) == len(deep.CURVE_SIZES) for v in curves.values())
    for v in curves.values():
        assert v[-1] > v[0]  # more data helps every method
    large = next(v for k, v in curves.items() if k.startswith("Large"))
    assert large[-1] == max(v[-1] for v in curves.values())  # with the most data the large network is best
    # one point recomputed: the curves are real
    Xtr, Xte, ytr, yte, _ = deep.data()
    idx = np.random.default_rng(0).permutation(len(Xtr))[:120]
    from sklearn.linear_model import LogisticRegression
    lr = LogisticRegression(max_iter=3000).fit(Xtr[idx], ytr[idx]).score(Xte, yte)
    assert next(v for k, v in curves.items() if k.startswith("Traditional"))[2] == round(lr, 4)


def test_predict_a_drawn_digit(client, b):
    e = b["examples"][7]
    r = client.post("/api/v1/concepts/digits/predict", json={"pixels": e["pixels"]}).json()
    assert r["prediction"] == 7 and len(r["probabilities"]) == 10 and abs(sum(r["probabilities"]) - 1) < 1e-3
    assert [len(l) for l in r["layers"]] == [32, 16]
    bad = client.post("/api/v1/concepts/digits/predict", json={"pixels": [1, 2, 3]})
    assert bad.status_code in (400, 422)
