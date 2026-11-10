"""Textbook exercise solutions: values verified against the books and independent computation."""
import pytest

from app.exercises.registry import all_exercises, get_exercise
from app.ml.preprocessing import DataValidationError


def _ans(result, qid):
    return next(a for a in result["answers"] if a["id"] == qid)


def test_every_ds4a_activity_present():
    ds4a = [e for e in all_exercises() if e.book == "DS4A"]
    assert [e.exercise_number for e in ds4a] == [f"AC {i}" for i in range(1, 9)]
    for e in all_exercises():
        assert len(e.similar) >= 2, e.id
        assert e.source_page


def test_ac1_answer_key():
    r = get_exercise("ds4a-ac1").solve()
    ai = sorted(a["id"][-1] for a in r["answers"] if a["answer"] == "AI")
    assert ai == ["b", "c", "e", "f"]


def test_ac2_steps():
    r = get_exercise("ds4a-ac2").solve()
    by = {a["id"]: a["answer"][:6] for a in r["answers"]}
    assert [k for k, v in by.items() if v == "Step 1"] == ["2", "3", "6", "8"]
    assert [k for k, v in by.items() if v == "Step 3"] == ["1", "7"]


def test_ac3_college_tree():
    r = get_exercise("ds4a-ac3").solve()
    assert _ans(r, "2")["answer"] == "f_undergrad"
    assert _ans(r, "3")["answer"] == "Public"
    a4 = _ans(r, "4")["answer"]
    assert a4["total_correct"] == 666 and a4["out_of"] == 777
    assert a4["correct_private"] == 495 and a4["correct_public"] == 171
    assert r["tree"]["nodes"][0]["threshold"] == pytest.approx(2995.0)


def test_ac6_penguins_depths():
    r = get_exercise("ds4a-ac6").solve()
    assert _ans(r, "1")["answer"] == "flipper_length_mm"
    s = {x["max_depth"]: x for x in r["summary"]}
    assert s[1]["splits"] == 1 and s[1]["correct"] == 262 and s[1]["n"] == 333
    assert s[5]["training_accuracy"] == 1.0
    assert (5, 7) in r["identical_pairs"]          # depth-7 tree identical to depth-5 tree
    root = r["trees"][0]["tree"]["nodes"][0]
    assert root["threshold"] == pytest.approx(206.5)


def test_ac7_confusion_matrix_metrics():
    r = get_exercise("ds4a-ac7").solve()
    assert r["confusion_matrix"]["matrix"] == [[12, 21], [5, 43]]
    assert [_ans(r, str(i))["answer"] for i in range(1, 5)] == [0.68, 0.71, 0.36, 0.9]
    assert r["dataset"]["train_rows"] == 319 and r["dataset"]["test_rows"] == 81
    assert "shelf_location" in r["tree"]["nodes"][0]["question"]


def test_ac8_fit_diagnosis():
    r = get_exercise("ds4a-ac8").solve()
    acc = {(t["model"], t["dataset"]): t["accuracy"] for t in r["accuracy_table"]}
    assert acc == {("model_1", "training"): 0.80, ("model_1", "testing"): 0.64,
                   ("model_2", "training"): 0.72, ("model_2", "testing"): 0.65,
                   ("model_3", "training"): 0.59, ("model_3", "testing"): 0.59}
    c = r["conclusions"]
    assert (c["model_1"]["label"], c["model_2"]["label"], c["model_3"]["label"]) == ("overfitted", "well-fitted", "underfitted")


def test_shah_examples():
    r = get_exercise("hoids-ex8-1").solve()
    assert round(r["ols"]["intercept"], 3) == -10.263 and round(r["ols"]["slope"], 3) == 3.977
    r = get_exercise("hoids-ex8-2").solve()
    g = r["gradient_descent"]
    assert round(g["b"], 3) == -5.009 and round(g["w"], 3) == 3.592


def test_hop83_gd_matches_ols():
    r = get_exercise("hoids-hop8-3").solve({"iterations": 20000})
    ols, gdres = _ans(r, "1")["answer"], _ans(r, "2")["answer"]
    assert gdres["intercept"] == pytest.approx(ols["intercept"], rel=1e-3)
    for f in ("area", "peri", "shape"):
        assert gdres["coefficients"][f] == pytest.approx(ols["coefficients"][f], rel=1e-3)


def test_tiy81_requires_authentic_dataset():
    with pytest.raises(DataValidationError, match="OA 8.2"):
        get_exercise("hoids-tiy8-1").solve()


def test_tiy81_runs_on_uploaded_frame():
    import numpy as np
    import pandas as pd
    rng = np.random.default_rng(0)
    w = rng.uniform(200, 300, 40)
    frame = pd.DataFrame({"nasal_width": w, "nasal_length": 100 + 2.5 * w + rng.normal(0, 10, 40)})
    r = get_exercise("hoids-tiy8-1").solve({"_frame": frame})
    assert r["standardized_gd"]["slope"] == pytest.approx(r["ols"]["slope"], rel=1e-3)
