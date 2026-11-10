"""End-to-end API tests through FastAPI (SQLite database, real training)."""
import io
import time

import pytest


def test_health_and_openapi(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    paths = client.get("/openapi.json").json()["paths"]
    for p in ["/api/v1/exercises", "/api/v1/datasets/upload", "/api/v1/training/start", "/api/v1/predictions",
              "/api/v1/evaluation/confusion-matrix", "/api/v1/explanations/{run_id}/steps", "/api/v1/experiments"]:
        assert p in paths


def test_exercises_endpoints(client):
    lst = client.get("/api/v1/exercises").json()
    assert len(lst) == 15  # DS4A 8 + Shah TiY + Hands-On 8.1 (substitute data), 8.2, 8.3, 8.4
    assert "hoids-hop8-1" in {e["id"] for e in lst}
    assert client.get("/api/v1/exercises/ds4a-ac7").json()["required_dataset"].startswith("carseats")
    r = client.post("/api/v1/exercises/ds4a-ac7/solve", json={}).json()
    assert r["computed"] and r["answers"][0]["answer"] == 0.68
    assert len(client.get("/api/v1/exercises/ds4a-ac8/similar").json()) >= 2
    assert "understand" in client.get("/api/v1/exercises/ds4a-ac1/explanation").json()
    assert client.get("/api/v1/exercises/nope").status_code == 404
    r = client.post("/api/v1/exercises/hoids-tiy8-1/solve", json={})
    assert r.status_code == 422 and "OA 8.2" in r.json()["error"]["message"]
    assert client.post("/api/v1/exercises/ds4a-ac7/solve", json={"parameters": {"_frame": 1}}).status_code == 422


def test_datasets_builtin(client):
    ds = {d["id"]: d for d in client.get("/api/v1/datasets").json()}
    assert ds["carseats_train"]["row_count"] == 319 and ds["penguins"]["origin"] == "textbook"
    assert ds["diabetes"]["origin"] == "example"
    assert all("file_path" not in d for d in ds.values())        # no local paths leaked
    prev = client.get("/api/v1/datasets/penguins/preview?limit=5").json()
    assert len(prev["rows"]) == 5 and prev["total_rows"] == 333
    assert client.get("/api/v1/datasets/penguins/columns").status_code == 200


def test_upload_validation(client):
    good = b"a,b,label\n1,2,x\n3,4,y\n5,6,x\n7,8,y\n"
    r = client.post("/api/v1/datasets/upload", files={"file": ("../../evil name.csv", good, "text/csv")})
    assert r.status_code == 201
    body = r.json()
    assert body["row_count"] == 4 and "/" not in body["name"] and ".." not in body["name"]
    assert client.post("/api/v1/datasets/upload", files={"file": ("x.py", b"print(1)", "text/plain")}).status_code == 400
    assert client.post("/api/v1/datasets/upload", files={"file": ("e.csv", b"", "text/csv")}).status_code == 400
    big = b"a,b\n" + b"1,2\n" * 2_000_000
    assert client.post("/api/v1/datasets/upload", files={"file": ("big.csv", big, "text/csv")}).status_code == 413


def _train(client, payload, wait=True):
    r = client.post(f"/api/v1/training/start?wait={'true' if wait else 'false'}", json={"experiment": payload})
    assert r.status_code == 202, r.text
    return r.json()


def test_linear_regression_flow(client):
    st = _train(client, {"dataset_id": "rock", "algorithm": "linear_regression", "target_column": "perm",
                         "feature_columns": ["area", "peri", "shape"], "random_seed": 1})
    assert st["status"] == "COMPLETED"
    rid = st["run_id"]
    m = client.get(f"/api/v1/training/{rid}/metrics").json()
    assert m["task"] == "regression" and m["test"]["r2"] is not None
    p = client.post("/api/v1/predictions", json={"run_id": rid, "inputs": {"area": 5000, "peri": 2000, "shape": 0.2}}).json()
    assert p["explanation"]["matches_sklearn"]
    e = client.get(f"/api/v1/explanations/{rid}").json()
    assert "least squares" in e["how_training_works"].lower()
    assert client.post("/api/v1/predictions", json={"run_id": rid, "inputs": {"area": "x", "peri": 1, "shape": 1}}).status_code == 422


def test_decision_tree_flow(client):
    st = _train(client, {"dataset_id": "carseats_train", "algorithm": "decision_tree", "target_column": "sales_cat",
                         "feature_columns": ["price", "shelf_location", "advertising"], "hyperparameters": {"max_depth": 2},
                         "positive_label": "High"})
    rid = st["run_id"]
    rules = client.get(f"/api/v1/explanations/{rid}/decision-rules").json()
    assert len(rules["rules"]) == rules["tree"]["n_leaves"]
    steps = client.get(f"/api/v1/explanations/{rid}/steps").json()
    assert steps["type"] == "tree_growth" and steps["splits"]
    ev = client.get(f"/api/v1/evaluation/{rid}").json()
    assert ev["positive_label"] == "High" and "binary" in ev["test"]
    p = client.post("/api/v1/predictions", json={"run_id": rid, "inputs": {"price": 90, "shelf_location": "Good", "advertising": 10}}).json()
    assert p["prediction"] in ("High", "Low") and p["explanation"]["steps"]


def test_logistic_threshold_flow(client):
    st = _train(client, {"dataset_id": "breast_cancer", "algorithm": "logistic_regression", "target_column": "diagnosis",
                         "feature_columns": ["mean_radius", "mean_texture"], "positive_label": "malignant",
                         "hyperparameters": {"threshold": 0.3}})
    m = client.get(f"/api/v1/training/{st['run_id']}/metrics").json()
    assert m["threshold"] == 0.3 and len(m["threshold_curve"]) > 5
    recalls = [t["recall"] for t in m["threshold_curve"]]
    assert recalls == sorted(recalls, reverse=True)   # lower threshold -> recall can only grow


def test_gradient_descent_flow(client):
    st = _train(client, {"dataset_id": "shah_regression", "algorithm": "gradient_descent", "target_column": "y",
                         "feature_columns": ["x"], "test_size": 0.2,
                         "hyperparameters": {"learning_rate": 0.01, "iterations": 300, "loss": "half_mse", "tolerance": None}})
    rid = st["run_id"]
    h = client.get(f"/api/v1/training/{rid}/history").json()
    assert h["type"] == "gradient_descent" and h["iterations_run"] == 300
    it = client.get(f"/api/v1/explanations/{rid}/steps?iteration_index=3").json()
    assert it["matches_recorded"] == {"grad_w": True, "grad_b": True} and len(it["narrative"]) == 7
    p = client.post("/api/v1/predictions", json={"run_id": rid, "inputs": {"x": 10}}).json()
    assert isinstance(p["prediction"], float)


def test_gradient_descent_on_all_rows_reproduces_book(client):
    st = _train(client, {"dataset_id": "shah_regression", "algorithm": "gradient_descent", "target_column": "y",
                         "feature_columns": ["x"], "test_size": 0,
                         "hyperparameters": {"learning_rate": 0.01, "iterations": 300, "loss": "half_mse", "tolerance": None}})
    s = client.get(f"/api/v1/training/{st['run_id']}").json()["model_summary"]
    assert round(s["intercept"], 3) == -5.009 and round(s["slope"], 3) == 3.592
    assert s["split"]["train_rows"] == 20 and s["split"]["test_rows"] == 0
    bad = client.post("/api/v1/experiments", json={"dataset_id": "rock", "algorithm": "decision_tree", "target_column": "perm",
                      "feature_columns": ["area"], "test_size": 0})
    assert bad.status_code == 422


def test_gradient_descent_divergence_reported(client):
    st = _train(client, {"dataset_id": "shah_regression", "algorithm": "gradient_descent", "target_column": "y",
                         "feature_columns": ["x"], "hyperparameters": {"learning_rate": 0.5, "iterations": 200}})
    assert st["status"] == "COMPLETED"
    d = client.get(f"/api/v1/training/{st['run_id']}").json()
    assert d["model_summary"]["diverged"] is True
    e = client.get(f"/api/v1/explanations/{st['run_id']}").json()
    assert "DIVERGED" in e["limitations"][0]


def test_background_training_and_polling(client):
    st = _train(client, {"dataset_id": "penguins", "algorithm": "decision_tree", "target_column": "species",
                         "feature_columns": ["bill_length_mm", "flipper_length_mm"]}, wait=False)
    assert st["status"] in ("PENDING", "RUNNING", "COMPLETED")
    for _ in range(100):
        s = client.get(f"/api/v1/training/{st['run_id']}/status").json()
        if s["status"] == "COMPLETED":
            break
        time.sleep(0.1)
    assert s["status"] == "COMPLETED"


def test_failed_training_is_reported(client):
    st = _train(client, {"dataset_id": "penguins", "algorithm": "linear_regression", "target_column": "island",
                         "feature_columns": ["bill_length_mm"], "task": "regression"})
    assert st["status"] == "FAILED" and "numeric target" in st["error"]


def test_invalid_experiment_requests(client):
    r = client.post("/api/v1/training/start", json={"experiment": {"dataset_id": "penguins", "algorithm": "gradient_descent",
                    "target_column": "body_mass_g", "feature_columns": ["bill_length_mm", "bill_depth_mm"]}})
    assert r.status_code == 422
    r = client.post("/api/v1/experiments", json={"dataset_id": "penguins", "algorithm": "decision_tree",
                    "target_column": "species", "feature_columns": ["species"]})
    assert r.status_code == 422
    r = client.post("/api/v1/experiments", json={"dataset_id": "penguins", "algorithm": "decision_tree",
                    "target_column": "species", "feature_columns": ["bill_length_mm"], "hyperparameters": {"max_depth": 99}})
    assert r.status_code == 422
    r = client.post("/api/v1/experiments", json={"dataset_id": "nope", "algorithm": "decision_tree",
                    "target_column": "species", "feature_columns": ["bill_length_mm"]})
    assert r.status_code == 404


def test_experiments_listing(client):
    r = client.post("/api/v1/experiments", json={"dataset_id": "iris", "algorithm": "decision_tree",
                    "target_column": "species", "feature_columns": ["petal_length_cm"]})
    assert r.status_code == 201
    exp = r.json()
    assert exp["task"] == "classification"
    st = client.post("/api/v1/training/start?wait=true", json={"experiment_id": exp["id"]}).json()
    detail = client.get(f"/api/v1/experiments/{exp['id']}").json()
    assert detail["runs"][0]["run_id"] == st["run_id"]
    assert any(e["id"] == exp["id"] for e in client.get("/api/v1/experiments").json())


def test_confusion_matrix_calculator(client):
    r = client.post("/api/v1/evaluation/confusion-matrix", json={"tp": 22, "fp": 11, "fn": 11, "tn": 37}).json()
    assert round(r["specificity"], 2) == 0.77 and r["matrix"]["values"] == [[22, 11], [11, 37]]
    assert client.post("/api/v1/evaluation/confusion-matrix", json={"tp": 0, "fp": 0, "fn": 0, "tn": 0}).status_code == 422
    assert client.post("/api/v1/evaluation/confusion-matrix", json={"tp": -1, "fp": 0, "fn": 0, "tn": 1}).status_code == 422
    r = client.post("/api/v1/evaluation/confusion-matrix", json={"tp": 0, "fp": 0, "fn": 3, "tn": 5}).json()
    assert r["precision"] is None


def test_complexity_lab(client):
    r = client.post("/api/v1/evaluation/complexity", json={"dataset_id": "carseats", "target_column": "sales_cat",
                    "feature_columns": ["price", "shelf_location", "advertising", "age", "income"],
                    "depths": [1, 2, 4, 8, 15], "random_seed": 1234}).json()
    rows = r["rows"]
    assert [x["max_depth"] for x in rows] == [1, 2, 4, 8, 15]
    assert rows[-1]["train"] >= rows[0]["train"]
    assert r["best"] is not None and r["baseline"] is not None


def test_practice_mode(client):
    cats = client.get("/api/v1/practice/categories").json()["categories"]
    for cat in cats:
        for diff in ("beginner", "intermediate", "advanced"):
            p = client.get(f"/api/v1/practice/{cat}/new?difficulty={diff}&seed=42").json()
            assert "solution" not in p
    from app.services.practice_service import generate
    full = generate("gradient_step", "advanced", 42)
    ok = client.post("/api/v1/practice/check", json={"problem_id": full["problem_id"], "answers": full["solution"]}).json()
    assert ok["correct"]
    bad = client.post("/api/v1/practice/check", json={"problem_id": full["problem_id"],
                      "answers": {k: 999 for k in full["solution"]}}).json()
    assert not bad["correct"]
    rounded = {k: round(v, 2) for k, v in full["solution"].items()}
    assert client.post("/api/v1/practice/check", json={"problem_id": full["problem_id"], "answers": rounded}).json()["correct"]
    assert client.get("/api/v1/practice/nope/new").status_code == 400


def test_unknown_run(client):
    assert client.get("/api/v1/training/doesnotexist/status").status_code == 404
    assert client.post("/api/v1/predictions", json={"run_id": "nope", "inputs": {"x": 1}}).status_code == 404
