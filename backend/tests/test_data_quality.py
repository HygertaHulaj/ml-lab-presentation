"""DS4A section 8.6: each data dimension changes a real model's results in the direction the book describes."""
import pytest


@pytest.fixture(scope="module")
def q(client):
    return client.get("/api/v1/concepts/data-quality").json()


def test_freshness(q):
    f = q["freshness"]
    rows = f["retraining"]
    assert f["simulated"] is True and rows[0]["fresh_images"] == 0
    assert rows[0]["accuracy_new_scanner"] < f["old_model_on_old"] - 0.05  # old model, new equipment: worse
    assert rows[-1]["accuracy_new_scanner"] > rows[0]["accuracy_new_scanner"] + 0.05  # fresh data restores it
    assert max(f["example"]["new"]) < max(f["example"]["old"])


def test_volume(q):
    v = q["volume"]
    assert v[0]["n"] == 20 and v[-1]["n"] == q["dataset"]["digits_train"]
    assert v[-1]["accuracy"] > v[0]["accuracy"] + 0.2


def test_diversity_one_island_never_sees_chinstrap(q):
    d = q["diversity"]
    biscoe = next(r for r in d["by_island"] if r["island"] == "Biscoe")
    assert biscoe["Chinstrap"] == 0  # real data: Chinstraps live on Dream
    one, mixed = d["models"]
    assert one["n_train"] == mixed["n_train"]
    assert "Chinstrap" not in one["species_seen"] and one["recall"]["Chinstrap"] == 0
    assert mixed["recall"]["Chinstrap"] > 0.8 and mixed["accuracy"] > one["accuracy"]


def test_quality(q):
    res = [r["accuracy"] for r in q["quality"]["resolution"]]
    assert [r["side"] for r in q["quality"]["resolution"]] == [8, 4, 2]
    assert res[0] > res[1] > res[2]
    assert [len(r["example"]) for r in q["quality"]["resolution"]] == [64, 16, 4]
    noise = q["quality"]["label_noise"]
    assert noise[0]["accuracy"] > noise[-1]["accuracy"] and noise[0]["n_wrong"] == 0
