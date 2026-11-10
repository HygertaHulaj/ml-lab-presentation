import numpy as np
import pytest
from sklearn import metrics as skm

from app.ml.metrics import (BinaryCounts, binary_from_predictions, binary_metrics, classification_report,
                            confusion_counts, regression_metrics)


def test_table_8_3_in_chapter_tiy():
    m = binary_metrics(BinaryCounts(tp=22, fp=11, fn=11, tn=37))
    assert round(m["accuracy"], 2) == 0.73
    assert round(m["precision"], 2) == 0.67
    assert round(m["recall"], 2) == 0.67
    assert round(m["specificity"], 2) == 0.77
    # the book's printed (incorrect) formula TN/(TN+FN) is reported separately
    assert m["negative_predictive_value"] == pytest.approx(37 / 48)


def test_manual_formulas():
    m = binary_metrics(BinaryCounts(tp=12, fp=5, fn=21, tn=43))
    assert m["accuracy"] == pytest.approx(55 / 81)
    assert m["precision"] == pytest.approx(12 / 17)
    assert m["recall"] == pytest.approx(12 / 33)
    assert m["specificity"] == pytest.approx(43 / 48)
    assert m["f1"] == pytest.approx(2 * (12 / 17) * (12 / 33) / ((12 / 17) + (12 / 33)))


def test_zero_denominators_are_undefined_not_errors():
    m = binary_metrics(BinaryCounts(tp=0, fp=0, fn=5, tn=10))
    assert m["precision"] is None and m["f1"] is None
    assert m["recall"] == 0.0
    m = binary_metrics(BinaryCounts(tp=3, fp=0, fn=0, tn=0))
    assert m["specificity"] is None


def test_invalid_counts():
    with pytest.raises(ValueError):
        BinaryCounts(tp=-1, fp=0, fn=0, tn=1)
    with pytest.raises(ValueError):
        BinaryCounts(0, 0, 0, 0)


def test_agrees_with_sklearn():
    rng = np.random.default_rng(1)
    y = rng.choice(["a", "b"], 200)
    p = rng.choice(["a", "b"], 200)
    c = binary_from_predictions(y, p, "a")
    m = binary_metrics(c)
    assert m["precision"] == pytest.approx(skm.precision_score(y, p, pos_label="a"))
    assert m["recall"] == pytest.approx(skm.recall_score(y, p, pos_label="a"))
    assert np.array_equal(confusion_counts(y, p, ["a", "b"]), skm.confusion_matrix(y, p, labels=["a", "b"]))


def test_multiclass_macro_and_weighted():
    rng = np.random.default_rng(2)
    labels = ["x", "y", "z"]
    y = rng.choice(labels, 300)
    p = rng.choice(labels, 300)
    r = classification_report(y, p, labels)
    assert r["macro_precision"] == pytest.approx(skm.precision_score(y, p, average="macro"))
    assert r["weighted_recall"] == pytest.approx(skm.recall_score(y, p, average="weighted"))
    assert r["accuracy"] == pytest.approx(skm.accuracy_score(y, p))


def test_regression_metrics_match_sklearn():
    rng = np.random.default_rng(3)
    y, p = rng.normal(size=50), rng.normal(size=50)
    m = regression_metrics(y, p)
    assert m["mse"] == pytest.approx(skm.mean_squared_error(y, p))
    assert m["mae"] == pytest.approx(skm.mean_absolute_error(y, p))
    assert m["r2"] == pytest.approx(skm.r2_score(y, p))
    assert m["rmse"] == pytest.approx(np.sqrt(m["mse"]))
