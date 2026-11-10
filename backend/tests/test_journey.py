"""The learning-journey states are real and consistent (validated against scikit-learn)."""
import numpy as np
from sklearn.tree import DecisionTreeClassifier

from app.ml.journey import learning_journey
from app.services.simulation_service import iris_frame


def test_journey_is_consistent_with_sklearn():
    df = iris_frame()
    j = learning_journey(df, features=["petal_length_cm", "petal_width_cm"], max_depth=2, seed=42)
    assert j["prepare"]["n_raw"] == 150 and j["prepare"]["duplicates"] == [{"removed": 142, "same_as": 101}]
    assert j["prepare"]["n_clean"] == 149 and sum(j["prepare"]["missing"].values()) == 0
    tr, te = j["split"]["train_ids"], j["split"]["test_ids"]
    assert len(tr) + len(te) == 149 and not set(tr) & set(te) and 142 not in tr + te
    # petal measurements separate the species far better than sepal width (ANOVA F)
    f = {s["feature"]: s["f_score"] for s in j["feature_scores"]}
    assert f["petal_length_cm"] > 10 * f["sepal_width_cm"]
    # the recorded model equals a fresh scikit-learn tree on the same training rows
    X = df.loc[tr, ["petal_length_cm", "petal_width_cm"]].to_numpy()
    clf = DecisionTreeClassifier(max_depth=2, random_state=42).fit(X, df.loc[tr, "species"])
    assert j["model"]["splits"][0]["threshold"] == round(float(clf.tree_.threshold[0]), 4)
    assert len(j["model"]["splits"]) == 2 and len(j["model"]["leaves"]) == 3
    pred = clf.predict(df.loc[te, ["petal_length_cm", "petal_width_cm"]].to_numpy())
    assert [p["predicted"] for p in j["predictions"]] == pred.tolist()
    cm = np.array(j["evaluation"]["confusion"])
    assert cm.sum() == len(te) and round(np.trace(cm) / cm.sum(), 4) == j["evaluation"]["test_accuracy"]
    assert [d["depth"] for d in j["evaluation"]["by_depth"]] == [1, 2, 3, 4, 5]
    # each prediction's path ends in a leaf and follows the thresholds
    for p in j["predictions"]:
        for s in p["path"][:-1]:
            assert (s["value"] <= s["threshold"]) == (s["goes"] == "left")


def test_journey_endpoint(client):
    r = client.get("/api/v1/concepts/learning-journey")
    assert r.status_code == 200 and len(r.json()["records"]) == 150
    assert client.get("/api/v1/concepts/learning-journey", params={"x_feature": "colour"}).status_code in (400, 422)


def test_feature_scores_use_training_rows_only():
    """Audit A1: the F-scores that choose features are computed after the split, on training flowers only."""
    import numpy as np
    from sklearn.feature_selection import f_classif
    from app.ml.journey import FEATURES
    df = iris_frame()
    j = learning_journey(df, features=["petal_length_cm", "petal_width_cm"], max_depth=2, seed=42)
    tr = df.loc[j["split"]["train_ids"]]
    F, _ = f_classif(tr[FEATURES].to_numpy(float), tr["species"].to_numpy())
    assert [s["f_score"] for s in j["feature_scores"]] == [round(float(v), 2) for v in F]
    assert all(s["computed_on"] == "training" for s in j["feature_scores"])
    by = j["evaluation"]["by_depth"]
    assert j["evaluation"]["selected_depth"] == max(by, key=lambda r: (r["cv_accuracy"], -r["depth"]))["depth"]
