"""DS4A section 8.3: the trees reproduce the book's printed numbers (Figs 8.6, 8.11, 8.12, 8.14-8.16)."""


def nodes(r):
    return r["tree"]["nodes"]


def test_fig_8_6_and_8_12(client):
    c = client.get("/api/v1/concepts/tree", params={"target": "sales_cat", "features": "shelf_location"}).json()
    root = nodes(c)[0]
    assert root["class_counts"] == {"High": 164, "Low": 236} and root["prediction"] == "Low"
    good = [n for n in nodes(c) if n["is_leaf"] and n["prediction"] == "High"][0]
    assert good["samples"] == 85 and good["class_counts"]["High"] == 66
    r = client.get("/api/v1/concepts/tree", params={"target": "sales", "features": "shelf_location"}).json()
    leaf = max((n for n in nodes(r) if n["is_leaf"]), key=lambda n: n["prediction"])
    assert leaf["samples"] == 85 and round(leaf["prediction"], 1) == 10.2  # book: "10,000 units", 85 observations
    assert r["task"] == "regression" and "r2" in r


def test_fig_8_11_penguins(client):
    p = client.get("/api/v1/concepts/tree", params={"dataset": "penguins", "target": "species",
                                                    "features": "bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,island,sex"}).json()
    root = nodes(p)[0]
    assert root["prediction"] == "Adelie" and root["feature"] == "flipper_length_mm" and 206 < root["threshold"] < 207


def test_nested_trees_and_leakage(client):
    feats = "competitor_price,income,advertising,population,price,age,education,shelf_location,urban,us"
    res = [client.get("/api/v1/concepts/tree", params={"features": feats, "max_depth": d}).json() for d in (1, 2, 3)]
    assert [r["correct"] for r in res] == [283, 307, 317]  # deeper trees fit the data better; the third is best
    assert all(nodes(r)[0]["feature"].startswith("shelf_location") for r in res)  # same first split: nested
    assert all("test_accuracy" in r["official_split"] for r in res)
    leak = client.get("/api/v1/concepts/tree", params={"features": "shelf_location,price,sales"}).json()
    assert leak["leakage"] == ["sales"] and leak["accuracy"] == 1.0  # a surrogate predicts the response perfectly
    assert client.get("/api/v1/concepts/tree", params={"features": "sales_cat"}).status_code in (400, 422)


def test_explore(client):
    e = client.get("/api/v1/concepts/carseats-explore").json()
    assert e["n"] == 400 and [b["shelf_location"] for b in e["by_shelf"]] == ["Bad", "Medium", "Good"]
    assert e["by_shelf"][2]["High"] == 66 and e["price_sales"]["r"] < -0.4
