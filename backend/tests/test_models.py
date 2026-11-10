"""Decision-tree extraction, regression, preprocessing and leakage."""
import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import LinearRegression

from app.datasets_registry import load_builtin
from app.ml import decision_tree as dt
from app.ml import regression as reg
from app.ml.preprocessing import DataValidationError, input_frame, validate_and_split


def _peng():
    df = load_builtin("penguins")
    feats = [c for c in df.columns if c != "species"]
    num = [c for c in feats if pd.api.types.is_numeric_dtype(df[c])]
    cat = [c for c in feats if c not in num]
    return df, feats, num, cat


def test_tree_extraction_matches_sklearn_internals():
    df, feats, num, cat = _peng()
    pipe = dt.fit_tree_pipeline(df[feats], df["species"], num, cat, "classification", max_depth=3, random_state=1)
    tree = dt.extract_tree(pipe)
    model = pipe.named_steps["model"]
    assert tree["n_nodes"] == model.tree_.node_count
    assert tree["n_leaves"] == model.get_n_leaves()
    root = tree["nodes"][0]
    assert root["samples"] == len(df)
    assert root["class_counts"] == df["species"].value_counts().to_dict()
    for n in tree["nodes"]:
        if not n["is_leaf"]:
            l, r = tree["nodes"][n["left"]], tree["nodes"][n["right"]]
            assert l["samples"] + r["samples"] == n["samples"]
            for c in tree["classes"]:
                assert l["class_counts"][c] + r["class_counts"][c] == n["class_counts"][c]
            assert n["impurity_decrease"] >= 0


def test_rules_and_paths_agree_with_predictions():
    df, feats, num, cat = _peng()
    pipe = dt.fit_tree_pipeline(df[feats], df["species"], num, cat, "classification", max_depth=4, random_state=1)
    tree = dt.extract_tree(pipe)
    rules = dt.decision_rules(tree)
    assert len(rules) == tree["n_leaves"]
    assert sum(r["samples"] for r in rules) == len(df)
    for i in range(0, len(df), 37):
        row = df[feats].iloc[[i]]
        path = dt.prediction_path(pipe, tree, row)
        assert path["prediction"] == pipe.predict(row)[0]


def test_yes_branch_matches_question_for_onehot_and_numeric():
    df = load_builtin("carseats")
    feats = ["price", "shelf_location"]
    pipe = dt.fit_tree_pipeline(df[feats], df["sales_cat"], ["price"], ["shelf_location"], "classification",
                                max_depth=3, random_state=1)
    tree = dt.extract_tree(pipe)
    good = df[feats][df.shelf_location == "Good"].iloc[[0]]
    path = dt.prediction_path(pipe, tree, good)
    for st in path["steps"]:
        if st["feature"] == "shelf_location_Good":
            # a Good store must answer "no" to "Is shelf_location ≠ Good?" and go right
            assert "≠ Good" in st["question"] and st["answer"].startswith("no")
            assert st["condition_met"] == "shelf_location is Good"
        else:
            assert st["answer"].startswith("yes") == (st["sample_value"] <= st["threshold"])


def test_leaf_correct_equals_training_accuracy():
    df, feats, num, cat = _peng()
    pipe = dt.fit_tree_pipeline(df[feats], df["species"], num, cat, "classification", max_depth=2, random_state=1)
    lc = dt.leaf_correct_predictions(dt.extract_tree(pipe))
    assert lc["accuracy"] == pytest.approx(pipe.score(df[feats], df["species"]))


def test_regression_tree_extraction():
    df = load_builtin("rock")
    pipe = dt.fit_tree_pipeline(df[["area", "peri"]], df["perm"], ["area", "peri"], [], "regression", max_depth=2)
    tree = dt.extract_tree(pipe)
    assert tree["task"] == "regression"
    assert tree["nodes"][0]["prediction"] == pytest.approx(df["perm"].mean())


def test_linear_regression_and_explained_prediction():
    df = load_builtin("rock")
    d = validate_and_split(df, ["area", "peri", "shape"], "perm", "regression", random_state=0)
    pipe = reg.fit_linear_regression(d.X_train, d.y_train, d.numeric_features, d.categorical_features)
    ref = LinearRegression().fit(d.X_train, d.y_train)
    coefs = reg.coefficients(pipe)
    assert coefs["intercept"] == pytest.approx(ref.intercept_)
    assert list(coefs["coefficients"].values()) == pytest.approx(list(ref.coef_))
    exp = reg.explain_prediction(pipe, d.X_test.iloc[[0]])
    assert exp["matches_sklearn"]


def test_validation_errors():
    df = load_builtin("penguins")
    with pytest.raises(DataValidationError):
        validate_and_split(df, ["species"], "species", "classification")      # target as feature
    with pytest.raises(DataValidationError):
        validate_and_split(df, ["island"], "species", "regression")           # categorical target for regression
    with pytest.raises(DataValidationError):
        validate_and_split(df, ["nope"], "species", "classification")
    with pytest.raises(DataValidationError):
        validate_and_split(df, ["bill_length_mm"], "flipper_length_mm", "classification")  # too many classes
    with pytest.raises(DataValidationError):
        input_frame({"bill_length_mm": "abc"}, ["bill_length_mm"], ["bill_length_mm"])


def test_split_is_deterministic():
    df = load_builtin("penguins")
    a = validate_and_split(df, ["bill_length_mm"], "species", "classification", random_state=7)
    b = validate_and_split(df, ["bill_length_mm"], "species", "classification", random_state=7)
    assert a.X_test.index.equals(b.X_test.index)
    assert len(a.X_test) == round(0.2 * len(df)) or abs(len(a.X_test) - 0.2 * len(df)) < 1


def test_no_leakage_scaler_fitted_on_train_only():
    from app.ml.classification import fit_logistic_regression
    df = load_builtin("penguins")
    d = validate_and_split(df, ["bill_length_mm", "body_mass_g"], "species", "classification", random_state=3)
    pipe = fit_logistic_regression(d.X_train, d.y_train, d.numeric_features, [])
    scaler = pipe.named_steps["prep"].named_transformers_["num"].named_steps["scale"]
    assert np.allclose(scaler.mean_, d.X_train.mean().to_numpy())
    assert not np.allclose(scaler.mean_, df[["bill_length_mm", "body_mass_g"]].mean().to_numpy())


def test_missing_values_imputed_with_training_median():
    df = pd.DataFrame({"x": [1.0, 2, 3, np.nan, 5, 6, 7, 8, 9, 10, 11, 12], "y": np.arange(12) * 2.0})
    d = validate_and_split(df, ["x"], "y", "regression", random_state=0)
    pipe = reg.fit_linear_regression(d.X_train, d.y_train, ["x"], [])
    imp = pipe.named_steps["prep"].named_transformers_["num"].named_steps["impute"]
    assert imp.statistics_[0] == pytest.approx(d.X_train["x"].median())
