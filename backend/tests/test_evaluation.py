"""DS4A section 8.4: the computed evaluation reproduces the book (Table 8.3, p. 388) and behaves as the text says."""
import pytest

from app.ml.evaluation import binary_metrics, fit_curve


@pytest.fixture(scope="module")
def ev(client):
    return client.get("/api/v1/concepts/evaluation").json()


def test_table_8_3_is_reproduced(ev):
    c = ev["classification"]
    m = c["metrics"]
    assert (c["n_train"], c["n_test"]) == (319, 81)  # p. 381
    assert {k: m[k] for k in ("tp", "fp", "fn", "tn")} == ev["book_table_8_3"] == {"tp": 22, "fp": 11, "fn": 11, "tn": 37}
    assert len(c["stores"]) == 81
    assert sum(s["actual"] == s["predicted"] for s in c["stores"]) == 59


def test_try_it_metrics_p383(ev):
    m = ev["classification"]["metrics"]
    assert round(m["accuracy"], 2) == 0.73 and round(m["precision"], 2) == 0.67
    assert round(m["recall"], 2) == 0.67 and round(m["specificity"], 2) == 0.77
    assert m["specificity"] == m["specificity_book_formula"]  # FP = FN, so the printed formula gives the same value
    assert abs(m["accuracy"] + m["misclassification"] - 1) < 1e-9


def test_metric_formulas():
    m = binary_metrics(tp=8, fp=2, fn=4, tn=6)
    assert m["precision"] == 0.8 and m["recall"] == round(8 / 12, 4) and m["specificity"] == 0.75
    assert m["specificity_book_formula"] == 0.6


def test_regression_metrics(ev):
    r = ev["regression"]
    assert r["test"]["mse"] < r["baseline_mse"] and 0 < r["test"]["r2"] < 1
    assert r["train"]["mse"] < r["test"]["mse"]  # training error is almost always lower (p. 385)
    assert len(r["points"]) == 81


def test_no_free_lunch(ev):
    best = [p["best"] for p in ev["no_free_lunch"]]
    assert len(set(best)) == 3  # a different method wins each problem
    reg = {r["method"]: r["value"] for r in ev["no_free_lunch"][1]["results"]}
    curve = {r["method"]: r["value"] for r in ev["no_free_lunch"][2]["results"]}
    assert reg["Linear regression"] == min(reg.values()) and curve["Linear regression"] == max(curve.values())


def test_fig_8_17_shape():
    f = fit_curve()
    under, good, over = f["models"]
    assert under["complexity"] < good["complexity"] < over["complexity"]
    assert good["test_mse"] < under["test_mse"] and good["test_mse"] < over["test_mse"]  # blue is best
    assert over["train_mse"] < good["train_mse"] < under["train_mse"]  # training error keeps falling
    assert all(s["test_mse"] >= f["irreducible_mse"] * 0.9 for s in f["sweep"])
    assert f == fit_curve()  # deterministic


def test_depth_sweep_overfits(ev):
    d = ev["depth_sweep"]
    assert d[-1]["train_accuracy"] == 1.0 and d[-1]["test_accuracy"] < max(x["test_accuracy"] for x in d)
    assert all(a["train_accuracy"] <= b["train_accuracy"] for a, b in zip(d, d[1:]))


def test_fit_exercise_p388(ev):
    got = [(m["train_accuracy"], m["test_accuracy"], m["verdict"]) for m in ev["fit_exercise"]]
    assert [(round(a, 2), round(b, 2), v) for a, b, v in got] == [(1.0, 0.42, "overfitted"), (0.70, 0.69, "well-fitted"), (0.51, 0.50, "underfitted")]


def test_selection_never_uses_the_test_set(ev):
    """Audit A2: choose complexity by cross-validation on training data; the test set is only the final check."""
    f = fit_curve()
    assert f["best_complexity"] == min(f["sweep"], key=lambda s: s["cv_mse"])["complexity"]
    assert f["models"][1]["complexity"] == f["best_complexity"] and "cross-validation" in f["selection"]
    d, sel = ev["depth_sweep"], ev["depth_selection"]
    assert all("cv_accuracy" in r for r in d)
    assert sel["selected_depth"] == max(d, key=lambda r: (r["cv_accuracy"], -r["depth"]))["depth"]
    assert sel["test_accuracy"] == next(r["test_accuracy"] for r in d if r["depth"] == sel["selected_depth"])

