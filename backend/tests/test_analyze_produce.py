"""DS4A §8.2 steps 2-3 demo: automatic fitting converges to least squares; predictions use the fitted model."""


def test_analyze_and_produce(client):
    r = client.get("/api/v1/concepts/analyze-and-produce").json()
    assert len(r["x"]) == 20 and r["stop_reason"] == "converged"
    assert abs(r["final"]["w"] - r["ols"]["w"]) < 0.01 and abs(r["final"]["b"] - r["ols"]["b"]) < 0.05
    assert r["ols"] == {"w": 3.9774, "b": -10.2632}  # Shah Example 8.1: y = -10.263 + 3.977x
    f = r["frames"]
    assert f[0]["iteration"] == 1 and f[0]["w"] == 0 and f[0]["b"] == 0
    assert all(a["loss"] >= b["loss"] - 1e-9 for a, b in zip(f, f[1:]))  # the loss never increases
    for p in r["new_data"]:
        assert p["prediction"] == round(r["final"]["w"] * p["x"] + r["final"]["b"], 2) or abs(p["prediction"] - (r["final"]["w"] * p["x"] + r["final"]["b"])) < 0.02
