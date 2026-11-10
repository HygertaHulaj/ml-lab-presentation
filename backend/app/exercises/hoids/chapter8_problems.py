"""HoIDS (Shah) Chapter 8 Hands-On Problems 8.1 (restaurant ratings), 8.2 (Airline Costs) and 8.4 (2014-2015 movies),
book pp. 231-233.

Problem 8.3 (rock) lives in chapter8.py. Problem 8.1 uses the book's OA 8.3 ratings.tsv (15 restaurants).
Every number below is computed from the data at call time.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats

from ...datasets_registry import load_builtin
from ...ml import gradient_descent as gd
from ..base import Exercise, Question, SimilarProblem


def ols_table(frame: pd.DataFrame, x: list[str], y: str) -> dict:
    """OLS with the R-style summary Shah asks to report "in appropriate terms": coefficients, standard errors,
    t and p values, R², adjusted R², the F test; plus fitted values for plotting. Rows with missing values are dropped."""
    d = frame[[*x, y]].dropna()
    X = np.column_stack([np.ones(len(d)), d[x].to_numpy(float)])
    yy = d[y].to_numpy(float)
    n, k = X.shape
    beta, *_ = np.linalg.lstsq(X, yy, rcond=None)
    fitted = X @ beta
    res = yy - fitted
    sse, sst = float(res @ res), float(((yy - yy.mean()) ** 2).sum())
    r2 = 1 - sse / sst
    s2 = sse / (n - k)
    se = np.sqrt(np.diag(s2 * np.linalg.inv(X.T @ X)))
    t = beta / se
    pv = 2 * stats.t.sf(np.abs(t), n - k)
    F = ((sst - sse) / (k - 1)) / s2
    return {
        "n": int(n), "response": y, "predictors": x, "r2": float(r2), "adj_r2": float(1 - (1 - r2) * (n - 1) / (n - k)),
        "F": float(F), "F_p": float(stats.f.sf(F, k - 1, n - k)), "rse": float(np.sqrt(s2)),
        "coefficients": [{"term": term, "estimate": float(b), "std_error": float(e), "t": float(tt), "p": float(pp)}
                         for term, b, e, tt, pp in zip(["(Intercept)", *x], beta, se, t, pv)],
        "fitted": fitted.tolist(), "actual": yy.tolist(),
    }


def _sig(c: dict) -> str:
    if c["p"] < 0.001:
        return "significant (p < 0.001)"
    if c["p"] < 0.05:
        return f"significant (p = {c['p']:.3f})"
    return f"not significant (p = {c['p']:.2f})"


# ======================================================================= HOP 8.1
R81 = ["ambience", "food", "service"]


def _solve_hop81(p: dict) -> dict:
    df = load_builtin("restaurant_ratings")
    full = ols_table(df, R81, "rating")
    two = ols_table(df, ["food", "service"], "rating")
    c = {k["term"]: k for k in full["coefficients"]}
    y = df["rating"].to_numpy(float)
    X = df[R81].to_numpy(float)
    # "try solving it by hand": a few parameter sets (b0, b_ambience, b_food, b_service), each scored on every restaurant
    ls = [c["(Intercept)"]["estimate"], c["ambience"]["estimate"], c["food"]["estimate"], c["service"]["estimate"]]
    candidates = [
        {"label": "Predict the average for everyone", "params": [float(y.mean()), 0.0, 0.0, 0.0]},
        {"label": "Equal weights: a third of each rating", "params": [0.0, 1 / 3, 1 / 3, 1 / 3]},
        {"label": "Least squares (the computer)", "params": [float(v) for v in ls]},
    ]
    for cand in candidates:
        b = np.asarray(cand["params"])
        pred = b[0] + X @ b[1:]
        cand["sse"] = float(((y - pred) ** 2).sum())
        cand["mse"] = float(((y - pred) ** 2).mean())
    order = np.argsort(y, kind="stable")
    ex_idx = [int(order[int(round(q * (len(y) - 1)))]) for q in (0.15, 0.5, 0.85)]  # low, middle, high overall rating
    examples = []
    for i in ex_idx:
        row = df.iloc[i]
        examples.append({"name": f"Restaurant {int(row['restaurant'])}", "restaurant": int(row["restaurant"]),
                         "ambience": float(row["ambience"]), "food": float(row["food"]), "service": float(row["service"]),
                         "rating": float(row["rating"]),
                         "predictions": [float(cand["params"][0] + np.dot(cand["params"][1:], X[i])) for cand in candidates]})
    F, S, A = c["food"], c["service"], c["ambience"]
    interpretation = (
        f"Across the {full['n']} restaurants, the overall rating rises by about {F['estimate']:.2f} points for each extra point of food "
        f"rating, {_sig(F)}, by about {S['estimate']:.2f} for each extra point of service, {_sig(S)}, and by about {A['estimate']:.2f} for "
        f"each extra point of ambience, {_sig(A)}, holding the other two fixed. Together the three ratings account for "
        f"{100 * full['r2']:.0f}% of the variation in the overall rating (adjusted R² {full['adj_r2']:.2f}), on these restaurants. "
        "Food matters most. With only 15 restaurants the estimates are uncertain, and these are associations, not causes."
    )
    return {
        "answers": [
            {"id": "a", "answer": "rating = b0 + b1·ambience + b2·food + b3·service",
             "explanation": "Four parameters: the constant b0 and one slope for each of the three ratings."},
            {"id": "b", "answer": [{"label": k["label"], "params": k["params"], "sse": k["sse"]} for k in candidates],
             "explanation": " · ".join(f"{k['label']}: sum of squared errors {k['sse']:.1f}" for k in candidates)
                            + ". Least squares gives the smallest sum of squared errors of any parameter set."},
            {"id": "c", "answer": {"intercept": c["(Intercept)"]["estimate"], "ambience": A["estimate"], "food": F["estimate"],
                                   "service": S["estimate"], "r2": full["r2"], "adj_r2": full["adj_r2"]},
             "explanation": interpretation},
        ],
        "model": full, "model_food_service": two, "candidates": candidates, "examples": examples,
        "n_restaurants": int(len(df)),
        "data": df[["rating", "ambience", "food", "service"]].to_dict(orient="list"),
        "names": [f"Restaurant {int(v)}" for v in df["restaurant"]],
    }


HOP81 = Exercise(
    id="hoids-hop8-1", book="HoIDS", chapter=8, exercise_number="Hands-On Problem 8.1",
    title="Linear Regression: Restaurant Ratings", category="Linear regression", source_page="p. 231", kind="computational",
    description="A popular restaurant review website has released a dataset (OA 8.3): each row is a restaurant's average rating of "
                "different aspects by previous customers: ambience, food, service and overall rating. The first three are predictors, "
                "the overall rating is the outcome. Express the linear regression in mathematical form, try a couple of parameter sets by "
                "hand, then fit the model and report it in appropriate terms.",
    required_dataset="restaurant_ratings",
    concepts=["multiple linear regression", "least squares", "interpreting coefficients", "R² and adjusted R²", "association vs causation"],
    understand="Write the model with four parameters, try a few parameter values and see how wrong they are, then let least squares "
               "find the values with the smallest squared error and read them in words.",
    questions=[Question("a", "The linear regression in mathematical form."),
               Question("b", "A couple of parameter sets tried by hand, with their predictions."),
               Question("c", "The fitted model, reported in appropriate terms.")],
    interpretation="Food is the strongest predictor of the overall rating, then service; ambience adds little. Fifteen restaurants are "
                   "a small sample, so the estimates are uncertain.",
    common_mistakes=["Reading the coefficients as causes: a better service rating does not make the overall rating higher.",
                     "Pasting the regression output without saying what each coefficient means.",
                     "Forgetting 'holding the other ratings fixed' when reading a slope."],
    python_code="""import numpy as np, pandas as pd
d = pd.read_csv("ratings.tsv", sep="\\t")          # restaurant, food, ambience, service, rating
X = np.column_stack([np.ones(len(d)), d[["ambience", "food", "service"]]])
beta = np.linalg.lstsq(X, d["rating"], rcond=None)[0]
print(beta)                                         # b0, b_ambience, b_food, b_service
""",
    similar=[SimilarProblem("Drop ambience. Does adjusted R² change much?", "Compute in Training Studio", "Supplementary."),
             SimilarProblem("Predict the rating from food alone. How much of the variation does it account for?", "Compute in Training Studio", "Supplementary.")],
    parameters={}, solver=_solve_hop81,
    notes=["Data: the book's OA 8.3 ratings.tsv, 15 restaurants (supplied by the user). The book's problem text calls it a CSV file."],
)


# ======================================================================= HOP 8.2
def _solve_hop82(p: dict) -> dict:
    df = load_builtin("airline_costs")
    m1 = ols_table(df, ["flight_length_miles", "daily_flight_time_hours"], "customers_served_1000s")
    m2 = ols_table(df, ["customers_served_1000s"], "total_assets_100k")
    c1 = {c["term"]: c for c in m1["coefficients"]}
    c2 = {c["term"]: c for c in m2["coefficients"]}
    L, T, C = c1["flight_length_miles"], c1["daily_flight_time_hours"], c2["customers_served_1000s"]
    insight = (
        f"Airlines with longer flights serve more customers: each extra mile of average flight length goes with about "
        f"{L['estimate']:.0f} thousand more customers, {_sig(L)}, while daily flight time adds nothing once length is known "
        f"({_sig(T)}); the model explains {100 * m1['r2']:.0f}% of the variation. Airlines that serve more customers also hold "
        f"more assets ({100 * m2['r2']:.0f}% explained): size goes with size. These are associations among 31 airlines in the "
        "early 1950s, not causes, and a few large carriers carry much of the second fit."
    )
    return {
        "answers": [
            {"id": "1", "answer": {"intercept": c1["(Intercept)"]["estimate"], "length": L["estimate"], "daily_time": T["estimate"],
                                   "r2": m1["r2"], "adj_r2": m1["adj_r2"]},
             "explanation": f"customers (1000s) = {c1['(Intercept)']['estimate']:.1f} + {L['estimate']:.2f}·length (miles) "
                            f"{T['estimate']:+.1f}·daily flight time (h); R² = {m1['r2']:.3f}, adjusted {m1['adj_r2']:.3f}, F = {m1['F']:.1f}. "
                            f"Length: {_sig(L)}. Daily flight time: {_sig(T)}."},
            {"id": "2", "answer": {"intercept": c2["(Intercept)"]["estimate"], "slope": C["estimate"], "r2": m2["r2"]},
             "explanation": f"total assets ($100,000s) = {c2['(Intercept)']['estimate']:.1f} + {C['estimate']:.4f}·customers (1000s); "
                            f"R² = {m2['r2']:.3f}: each extra 1,000 customers goes with about ${C['estimate'] * 100000:,.0f} more assets."},
            {"id": "3", "answer": insight, "explanation": "Compare the two models' R² and which coefficients are significant."},
        ],
        "model_1": m1, "model_2": m2, "airlines": [a.strip() for a in df["airline"].tolist()],
        # lines for the plots: model 1 along flight length with daily flight time held at its mean; model 2 as fitted
        "lines": {
            "length": {"x": [float(df.flight_length_miles.min()), float(df.flight_length_miles.max())],
                       "y": [c1["(Intercept)"]["estimate"] + L["estimate"] * v + T["estimate"] * float(df.daily_flight_time_hours.mean())
                             for v in (float(df.flight_length_miles.min()), float(df.flight_length_miles.max()))],
                       "daily_time_held_at": float(df.daily_flight_time_hours.mean())},
            "assets": {"x": [float(df.customers_served_1000s.min()), float(df.customers_served_1000s.max())],
                       "y": [c2["(Intercept)"]["estimate"] + C["estimate"] * v
                             for v in (float(df.customers_served_1000s.min()), float(df.customers_served_1000s.max()))]},
        },
        "data": df[["flight_length_miles", "daily_flight_time_hours", "customers_served_1000s", "total_assets_100k"]].to_dict(orient="list"),
    }


HOP82 = Exercise(
    id="hoids-hop8-2", book="HoIDS", chapter=8, exercise_number="Hands-On Problem 8.2",
    title="Linear Regression: Airline Costs", category="Linear regression", source_page="p. 232", kind="computational",
    description="Use the Airline Costs dataset (OA 8.4). Predict the number of customers each airline serves from its length of flight "
                "and daily flight time per plane. Next, build another regression model to predict the total assets of an airline from "
                "the customers served. Do you have any insight about the data from the last two regression models?",
    required_dataset="airline_costs",
    concepts=["multiple linear regression", "simple linear regression", "R² and adjusted R²", "significance of coefficients", "association vs causation"],
    understand="Two models: one with two predictors, one with a single predictor. Report each in words: what a one-unit change goes "
               "with, how much variation is explained, and which predictors matter.",
    questions=[Question("1", "Model 1: customers served ~ length of flight + daily flight time."),
               Question("2", "Model 2: total assets ~ customers served."),
               Question("3", "What insight do the two models give?")],
    interpretation="Flight length, not daily flight time, carries the first model; the second shows that bigger airlines (more customers) "
                   "have more assets. Both are associations in a small, old sample.",
    common_mistakes=["Reading the coefficient of daily flight time as meaningful when its p-value is large.",
                     "Concluding that serving more customers causes higher assets.",
                     "Forgetting the units: customers in 1000s, assets in $100,000s."],
    python_code="""import numpy as np, pandas as pd
spans = [(0, 20), (21, 28), (29, 36), (37, 44), (45, 52), (53, 60), (61, 68), (69, 76), (77, 84), (85, 92), (93, 100), (101, 108)]
names = ["airline", "length", "speed", "daily_time", "customers", "op_cost", "rev_tons", "load", "capacity", "assets", "investments", "adj_assets"]
air = pd.read_fwf("airline_costs.dat", colspecs=spans, names=names)

def ols(X, y):
    X = np.column_stack([np.ones(len(y)), X])
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    r2 = 1 - ((y - X @ beta) ** 2).sum() / ((y - y.mean()) ** 2).sum()
    return beta, r2

print(ols(air[["length", "daily_time"]].to_numpy(float), air["customers"].to_numpy(float)))
print(ols(air[["customers"]].to_numpy(float), air["assets"].to_numpy(float)))
""",
    similar=[SimilarProblem("Add plane speed to model 1. Does adjusted R² rise?", "Compute in Training Studio", "Supplementary."),
             SimilarProblem("Predict operating cost per ton-mile from length of flight. Is the relationship negative?", "Compute in Training Studio", "Supplementary.")],
    parameters={}, solver=_solve_hop82,
    notes=["Data: Proctor & Duncan (1954) via L. Winner (UF), the file named in OA 8.4. The original URL has moved, so the file comes "
           "from the Internet Archive snapshot of that URL (2018-03-25).",
           "The file's column is 'population served (1000s)'; the book's problem calls it 'customers served in 1000s'."],
)


# ======================================================================= HOP 8.4
CSM_FEATURES = ["budget", "aggregate_followers", "likes", "dislikes", "comments"]


def _solve_hop84(p: dict) -> dict:
    df = load_builtin("csm_movies")
    d = df.dropna(subset=["ratings", *CSM_FEATURES])  # the same complete rows for every model, so R² values compare fairly
    ma = ols_table(d, ["budget", "aggregate_followers"], "ratings")
    mb = ols_table(d, CSM_FEATURES, "ratings")
    corr = {f: float(np.corrcoef(d[f], d["ratings"])[0, 1]) for f in CSM_FEATURES}
    best = max(corr, key=lambda f: abs(corr[f]))
    x, y = d[best].to_numpy(float), d["ratings"].to_numpy(float)
    single = ols_table(d, [best], "ratings")
    mv = gd.run_multivariate_gd(x.reshape(-1, 1), y, learning_rate=float(p["learning_rate"]), iterations=int(p["iterations"]),
                                record_every=max(1, int(p["iterations"]) // 400))
    b0, b1 = single["coefficients"][0]["estimate"], single["coefficients"][1]["estimate"]
    pa = {c["term"]: c["p"] for c in ma["coefficients"]}
    return {
        "answers": [
            {"id": "a", "answer": {"r2": ma["r2"], "adj_r2": ma["adj_r2"], "n": ma["n"], "p_budget": pa["budget"], "p_followers": pa["aggregate_followers"]},
             "explanation": f"ratings ~ budget + followers explains only {100 * ma['r2']:.1f}% of the variation (n = {ma['n']} movies). "
                            f"Budget is {_sig(ma['coefficients'][1])}; followers are {_sig(ma['coefficients'][2])}."},
            {"id": "b", "answer": {"r2": mb["r2"], "adj_r2": mb["adj_r2"], "gain_r2": mb["r2"] - ma["r2"], "gain_adj_r2": mb["adj_r2"] - ma["adj_r2"]},
             "explanation": f"Adding likes, dislikes and comments raises R² from {ma['r2']:.3f} to {mb['r2']:.3f} (adjusted {ma['adj_r2']:.3f} → "
                            f"{mb['adj_r2']:.3f}): the expanded model accounts for more variation in these observed ratings. Whether it predicts new movies better requires separate validation."},
            {"id": "c", "answer": {"best_predictor": best, "correlation": corr[best], "gd_intercept": mv["intercept"], "gd_slope": mv["coefficients"][0],
                                   "ols_intercept": b0, "ols_slope": b1, "iterations_run": mv["iterations_run"], "stop_reason": mv["stop_reason"]},
             "explanation": f"By the criterion strongest absolute correlation with rating (= highest one-predictor in-sample R²), the best single predictor is {best} (r = {corr[best]:.3f}). Gradient descent on the standardized {best} finds "
                            f"rating = {mv['intercept']:.3f} + {mv['coefficients'][0]:.3e}·{best} after {mv['iterations_run']} iterations, the same "
                            f"line as least squares ({b0:.3f} + {b1:.3e}·{best}); per $1 million of budget, {b1 * 1e6:+.3f} rating points."},
        ],
        "model_a": ma, "model_b": mb, "correlations": corr, "best": best, "single": single, "gradient_descent": mv,
        "n_movies": int(len(df)), "n_complete": int(len(d)),
        "scatter": {"x": x.tolist(), "y": y.tolist(), "movie": d["movie"].tolist()},
    }


HOP84 = Exercise(
    id="hoids-hop8-4", book="HoIDS", chapter=8, exercise_number="Hands-On Problem 8.4",
    title="Gradient Descent: 2014–2015 movies and social media", category="Gradient descent", source_page="p. 233", kind="computational",
    description="Use the conventional and social media movies dataset (OA 8.6). (a) What can you tell about a movie's rating from its "
                "budget and aggregated social-media followers? (b) If you add likes, dislikes and comments, does the prediction improve? "
                "(c) Among all the factors, which is the best predictor of rating? With it, use gradient descent to find the optimal "
                "intercept and gradient.",
    required_dataset="csm_movies",
    concepts=["multiple linear regression", "R² vs adjusted R²", "choosing a predictor", "gradient descent", "missing values"],
    understand="Compare models on the same movies; adjusted R² penalizes adding predictors; compare it alongside the model's purpose and validation results. Then fit one "
               "predictor by gradient descent and check that it lands on the least-squares line.",
    questions=[Question("a", "Rating from budget and aggregate followers."),
               Question("b", "Add likes, dislikes and comments: does the prediction improve?"),
               Question("c", "The best single predictor, and gradient descent's intercept and gradient for it.")],
    interpretation="Budget and social-media interaction account for only a small part of the observed variation in ratings. The extra "
                   "interaction variables raise in-sample R² and adjusted R²; whether they predict new movies better needs separate validation. "
                   "Budget has the strongest absolute correlation with rating (the highest one-predictor R² on these movies): an association, not a cause.",
    common_mistakes=["Comparing R² of models fitted on different rows (missing values differ between columns).",
                     "Judging a model only by R², which never falls when variables are added; adjusted R² penalizes extra predictors, "
                     "and neither measures performance on unseen data.",
                     "Running gradient descent on raw budgets (hundreds of millions): scale the feature first."],
    python_code="""import numpy as np, pandas as pd
m = pd.read_excel("2014 and 2015 CSM dataset.xlsx")
cols = ["Budget", "Aggregate Followers", "Likes", "Dislikes", "Comments"]
d = m.dropna(subset=["Ratings", *cols])
from sklearn.linear_model import LinearRegression
for X in (["Budget", "Aggregate Followers"], cols):
    print(X, LinearRegression().fit(d[X], d["Ratings"]).score(d[X], d["Ratings"]))
mu, sd = d["Budget"].mean(), d["Budget"].std(ddof=0)
x, y = ((d["Budget"] - mu) / sd).to_numpy(), d["Ratings"].to_numpy()
t0 = t1 = 0.0
for _ in range(5000):                        # batch gradient descent, cost J = (1/2m) * sum(error^2)
    e = t0 + t1 * x - y
    t0, t1 = t0 - 0.1 * e.mean(), t1 - 0.1 * (e * x).mean()
print("intercept", t0 - t1 * mu / sd, "slope", t1 / sd)
""",
    similar=[SimilarProblem("Use log(budget) instead of budget. Does R² improve?", "Compute in Training Studio", "Supplementary."),
             SimilarProblem("Run gradient descent on budget with learning rate 1.5 and 2.5. Which converges, which diverges?", "Use the GD Visualizer", "Supplementary.")],
    parameters={"learning_rate": 0.1, "iterations": 5000}, solver=_solve_hop84,
    notes=["Data: UCI dataset 424 (CC BY 4.0), the file named in OA 8.6. The file has 231 movies (the UCI page says 217).",
           "Missing values (aggregate followers 35, screens 10, budget 1): every model uses the same complete rows for the five "
           "factors, so R² values compare fairly."],
)

EXERCISES = [HOP81, HOP82, HOP84]
