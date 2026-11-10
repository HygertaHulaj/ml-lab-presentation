"""Cinematic-lesson API: Iris dataset, K-Means simulations (cached), lesson manifest, progress, saved experiments."""


def test_iris_endpoint_not_shadowed_by_generic_dataset_route(client):
    r = client.get("/api/v1/datasets/iris").json()
    assert r["n"] == 150 and len(r["observations"]) == 150 and len(r["observations"][0]) == 4
    assert set(r["classes"]) == {"setosa", "versicolor", "virginica"}
    assert client.get("/api/v1/datasets/penguins").json()["row_count"] == 333   # generic route still works


def test_kmeans_simulation_trace_and_cache(client):
    body = {"features": ["sepal_length_cm", "sepal_width_cm"], "k": 3, "init": "k-means++", "seed": 7}
    r1 = client.post("/api/v1/simulations/kmeans", json=body)
    assert r1.status_code == 201
    s1 = r1.json()
    t = s1["trace"]
    assert t["n"] == 150 and t["k"] == 3 and t["features"] == body["features"]
    assert len(t["iterations"][0]["distances"]) == 150 and len(t["iterations"][0]["distances"][0]) == 3
    assert t["stop_reason"] in ("converged_labels", "converged_tol", "max_iterations")
    assert len(t["initialization"]["plusplus_steps"]) == 3
    assert sum(sum(v.values()) for v in t["summary"]["crosstab_species_by_cluster"].values()) == 150
    s2 = client.post("/api/v1/simulations/kmeans", json=body).json()
    assert s2["id"] == s1["id"] and s2["cached"] is True and s1["cached"] is False
    g = client.get(f"/api/v1/simulations/{s1['id']}").json()
    assert g["trace"]["final_inertia"] == t["final_inertia"]


def test_kmeans_validation(client):
    for bad in [{"k": 0}, {"k": 11}, {"features": ["petal_colour"]}, {"features": ["sepal_width_cm", "sepal_width_cm"]},
                {"init": "magic"}, {"max_iter": 0}, {"tol": -1}]:
        r = client.post("/api/v1/simulations/kmeans", json=bad)
        assert r.status_code == 422, bad
        assert r.json()["error"]["code"] == "validation_error"
    assert client.get("/api/v1/simulations/nope").status_code == 404


def test_standardized_run_records_scaling(client):
    t = client.post("/api/v1/simulations/kmeans", json={"standardize": True, "k": 3}).json()["trace"]
    assert t["scaling"]["method"] == "z-score" and len(t["scaling"]["means"]) == 2


def test_lesson_manifest(client):
    m = client.get("/api/v1/lessons/kmeans-iris").json()
    assert [s["id"] for s in m["scenes"]] == ["enter", "problem", "init", "distance", "update", "iterate", "results"]
    assert m["default_config"]["k"] == 3 and m["objectives"] and m["assessment"]
    assert client.get("/api/v1/lessons/nope").status_code == 404


def test_progress_and_saved_experiments(client):
    learner = "learner_test_0001"
    sim = client.post("/api/v1/simulations/kmeans", json={"k": 4, "seed": 2}).json()
    r = client.post("/api/v1/progress", json={"learner_id": learner, "lesson_id": "kmeans-iris", "scene_id": "distance",
                                             "position": 31.5, "mode": "lab", "completed_scenes": ["enter", "problem"],
                                             "simulation_id": sim["id"]})
    assert r.status_code == 200 and r.json()["completed_scenes"] == ["enter", "problem"]
    r = client.post("/api/v1/progress", json={"learner_id": learner, "lesson_id": "kmeans-iris", "scene_id": "update",
                                             "position": 40.0, "completed_scenes": ["init"]}).json()
    assert r["completed_scenes"] == ["enter", "init", "problem"] and r["scene_id"] == "update"
    got = client.get("/api/v1/progress", params={"learner_id": learner, "lesson_id": "kmeans-iris"}).json()
    assert got["position"] == 40.0
    assert client.post("/api/v1/progress", json={"learner_id": "bad id!", "lesson_id": "kmeans-iris",
                                                "scene_id": "x", "position": 0}).status_code == 422
    s = client.post(f"/api/v1/simulations/{sim['id']}/save", json={"learner_id": learner, "name": "K=4 seed 2"})
    assert s.status_code == 201
    lst = client.get("/api/v1/saved-experiments", params={"learner_id": learner}).json()
    assert lst[0]["name"] == "K=4 seed 2" and lst[0]["config"]["k"] == 4
