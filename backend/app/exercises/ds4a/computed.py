"""DS4A Chapter 8 'Applying the Concepts' — activities answered with real computation
(AC3 Reading a Decision Tree, AC6 Interpretability vs Complexity, AC7 Confusion-matrix metrics,
AC8 Over/under/well-fitted models).

Trees are fitted the same way as the book's official Python scripts
(github.com/datasci4all/Python_scripts, Ch_8): categorical columns one-hot encoded, numeric
columns passed through unscaled, DecisionTreeClassifier with the stated hyper-parameters.
"""
from __future__ import annotations

import pandas as pd

from ...datasets_registry import load_builtin
from ...ml import decision_tree as dt
from ...ml.metrics import BinaryCounts, binary_from_predictions, binary_metrics
from ...ml.preprocessing import column_metadata
from ..base import Exercise, Question, SimilarProblem


def _r2(v):
    return None if v is None else round(v, 2)


def _branches(tree: dict) -> str:
    root = tree["nodes"][0]
    if root["is_leaf"]:
        return f"no split — always predict {root['prediction']}"
    left, right = tree["nodes"][root["left"]], tree["nodes"][root["right"]]
    return (f"{root['left_condition']} → predict {left['prediction']}; "
            f"{root['right_condition']} → predict {right['prediction']}")


def _fit(df: pd.DataFrame, target: str, drop: list[str], depth: int, seed: int, min_n: int = 2):
    X = df.drop(columns=[target, *drop])
    meta = {m["name"]: m for m in column_metadata(X)}
    numeric = [c for c in X.columns if meta[c]["kind"] == "numeric"]
    categorical = [c for c in X.columns if c not in numeric]
    pipe = dt.fit_tree_pipeline(X, df[target].astype(str), numeric, categorical, "classification",
                                max_depth=depth, min_samples_split=min_n, random_state=seed)
    return pipe, dt.extract_tree(pipe), X


# ======================================================================= AC3
def _solve_ac3(p: dict) -> dict:
    depth, seed = int(p["max_depth"]), int(p["random_state"])
    df = load_builtin("college")
    pipe, tree, X = _fit(df, "private", [], depth, seed)
    root = tree["nodes"][0]
    rules = dt.decision_rules(tree)
    correct = dt.leaf_correct_predictions(tree)
    answers = [
        {"id": "1", "answer": f"{'Yes' if root['prediction'] == 'Yes' else 'No'} — predict private = {root['prediction']}",
         "explanation": f"The root node holds all {root['samples']} colleges: {root['class_counts']}. With no other "
                        f"information we predict the majority class, '{root['prediction']}'."},
    ]
    if not root["is_leaf"]:
        left, right = tree["nodes"][root["left"]], tree["nodes"][root["right"]]
        answers += [
            {"id": "2", "answer": root["feature"],
             "explanation": f"The single split chosen by the algorithm is '{root['question']}' — the variable "
                            f"whose split reduced Gini impurity the most ({root['impurity']:.4f} → "
                            f"{root['children_weighted_impurity']:.4f})."},
            {"id": "3", "answer": "Public" if right["prediction"] == "No" else "Private",
             "explanation": f"Colleges with {root['right_condition']} go to the right leaf, which contains "
                            f"{right['class_counts']} → majority '{right['prediction']}' (private = No means public). "
                            f"sklearn prints the threshold as {root['threshold']:.1f}; R's rpart prints the same split as "
                            f"'f_undergrad >= 2995'."},
            {"id": "4", "answer": {
                "public_predictions": right["samples"] if right["prediction"] == "No" else left["samples"],
                "private_predictions": left["samples"] if left["prediction"] == "Yes" else right["samples"],
                "correct_public": correct["correct_by_predicted_class"].get("No", 0),
                "correct_private": correct["correct_by_predicted_class"].get("Yes", 0),
                "total_correct": correct["correct_total"], "out_of": correct["n"]},
             "explanation": f"Left leaf predicts {left['prediction']} for {left['samples']} colleges "
                            f"({left['class_counts'][left['prediction']]} correct); right leaf predicts "
                            f"{right['prediction']} for {right['samples']} ({right['class_counts'][right['prediction']]} correct). "
                            f"Total correct = {correct['correct_total']} of {correct['n']} "
                            f"(training accuracy {correct['accuracy']:.4f})."},
        ]
        answers.append({"id": "5", "answer": {
            "Scope": f"{len(df)} US colleges (observational units); 17 numeric variables such as f_undergrad "
                     "(full-time undergraduates); response `private` (Yes/No). Source: DS4A dataset (ISLR College, US News 1995).",
            "Track": "Can a college's characteristics predict whether it is private, and which single variable separates private from public best?",
            "Articulate": f"The tree's first and only split is on {root['feature']} at {root['threshold']:.0f}. Smaller "
                          f"colleges (≤ {root['threshold']:.0f} full-time undergraduates) are predicted private, larger ones public. "
                          f"This rule is correct for {correct['correct_total']} of {correct['n']} colleges "
                          f"({100 * correct['accuracy']:.1f}%) in the data it was trained on.",
            "Respond": "Evaluate on held-out test data (training accuracy is optimistic), try deeper trees and compare, "
                       "and consider other variables such as out-of-state tuition."},
            "explanation": "STAR = Scope the data's context, Track the question, Articulate the results, Respond with next steps (DS4A preface)."})
    return {"answers": answers, "tree": tree, "rules": rules, "leaf_correct": correct,
            "dataset": {"key": "college", "rows": len(df), "features": list(X.columns), "target": "private"}}


AC3 = Exercise(
    id="ds4a-ac3", book="DS4A", chapter=8, exercise_number="AC 3",
    title="Reading a Decision Tree", category="Decision trees", source_page="p. 399", kind="training",
    description="Create a decision tree using the college dataset to predict whether a college is private or not, plot it, "
                "and answer: (1) without other information, would you predict a new college to be private? (2) On which "
                "variable did the tree split? (3) If f_undergrad is at least 2995, public or private? (4) From the leaves: "
                "how many public predictions, private predictions and total correct predictions? (5) Interpret with STAR.",
    required_dataset="college",
    concepts=["decision tree", "root node", "split", "leaf", "majority class", "STAR framework"],
    understand=("The questions mirror the in-chapter TiY on penguins (Figure 8.11), which is a single-split tree, and "
                "question 3 names one threshold, so the intended tree has max depth 1. Each node shows the class counts "
                "(alphabetical: No, Yes); the predicted label is the majority. The tree chooses the split that most reduces "
                "impurity (Gini)."),
    questions=[Question(str(i), q) for i, q in enumerate([
        "Without knowing anything else about a new college, would you predict it to be private?",
        "On which variable did the decision tree create a split?",
        "If a college has f_undergrad of at least 2995, would you predict public or private?",
        "From the leaves: how many public predictions, how many private predictions, and how many total correct predictions?",
        "Interpret the tree using the STAR Framework."], start=1)],
    interpretation=("A one-question rule on college size already classifies ~86% of training colleges correctly. "
                    "It is highly interpretable but it is evaluated on the same data it learned from, so it is an optimistic estimate."),
    common_mistakes=["Reading the counts in the wrong order: they are alphabetical (No, Yes).",
                     "Counting all observations in a leaf as correct — only the majority class in each leaf is correct.",
                     "Confusing 'private = No' with 'missing'."],
    python_code='''import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier, export_text

college = pd.read_csv("college.csv")            # DS4A Ch_8 data
X = college.drop(columns="private")             # all 17 numeric variables
y = college["private"]                          # Yes / No

tree = DecisionTreeClassifier(max_depth=1, random_state=1234).fit(X, y)
print(export_text(tree, feature_names=list(X.columns), show_weights=True))
# |--- f_undergrad <= 2995.00  -> weights [No=41, Yes=495] class Yes
# |--- f_undergrad >  2995.00  -> weights [No=171, Yes=70] class No
''',
    similar=[
        SimilarProblem("Fit a depth-1 tree on penguins (all variables). What is the root prediction and the split?",
                       "Adelie; flipper_length_mm ≤ 206.5", "Use the Decision Tree Explorer with dataset 'penguins', depth 1."),
        SimilarProblem("Fit a depth-1 tree on carseats (all stores) predicting sales_cat, excluding `sales`. Which variable splits first?",
                       "shelf_location (Good vs not Good)", "Matches DS4A Figure 8.6. Excluding `sales` avoids leaking the answer."),
    ],
    parameters={"max_depth": 1, "random_state": 1234}, solver=_solve_ac3,
)


# ======================================================================= AC6
def _solve_ac6(p: dict) -> dict:
    depths = [int(d) for d in p["depths"]]
    seed = int(p["random_state"])
    df = load_builtin("penguins")
    trees = []
    for d in depths:
        pipe, tree, X = _fit(df, "species", [], d, seed)
        trees.append({"max_depth": d, "tree": tree, "rules": dt.decision_rules(tree),
                      "leaf_correct": dt.leaf_correct_predictions(tree)})
    roots = {t["tree"]["nodes"][0].get("feature") for t in trees}
    best = max(trees, key=lambda t: t["leaf_correct"]["correct_total"])
    identical = [(a["max_depth"], b["max_depth"]) for a, b in zip(trees, trees[1:])
                 if a["tree"]["nodes"] == b["tree"]["nodes"]]
    summary = [{"max_depth": t["max_depth"], "actual_depth": t["tree"]["depth"], "splits": t["tree"]["n_splits"],
                "leaves": t["tree"]["n_leaves"], "features_used": t["tree"]["features_used"],
                "correct": t["leaf_correct"]["correct_total"], "n": t["leaf_correct"]["n"],
                "training_accuracy": t["leaf_correct"]["accuracy"]} for t in trees]
    first, last = summary[0], summary[-1]
    ident_note = ""
    if identical:
        ident_note = (f" Note: the max_depth {identical[-1][1]} tree is IDENTICAL to the max_depth {identical[-1][0]} tree — "
                      f"at depth {trees[-2]['tree']['depth']} every leaf is already pure (one species), so there is nothing left "
                      "to split. max_depth is an upper limit, not a target.")
    answers = [
        {"id": "1", "answer": ", ".join(sorted(r for r in roots if r)),
         "explanation": "All trees start with the same root split because trees are grown greedily: the best first question "
                        "does not depend on how deep the tree is allowed to grow (DS4A Quick Tip: the trees are nested)."},
        {"id": "2", "answer": f"max depth {best['max_depth']}" + (" (tied with the deeper tree)" if identical else ""),
         "explanation": "Leaf correct counts: " + "; ".join(f"depth {s['max_depth']}: {s['correct']}/{s['n']} = {s['training_accuracy']:.3f}"
                                                         for s in summary) + "." + ident_note},
        {"id": "3", "answer": {
            "most_interpretable_least_complex": "first", "because_first": "a single split",
            "least_interpretable_most_complex": "third", "because_third": "the most splits",
            "variables": "more", "characterize": "more challenging", "middle": "second",
            "complexity_rank": [f"depth {s['max_depth']} ({s['splits']} splits)" for s in sorted(summary, key=lambda s: s['splits'])],
        }, "explanation": f"The first tree asks one question ({first['splits']} split, features {first['features_used']}); the "
                           f"third has {last['splits']} splits using {last['features_used']}." + ident_note},
        {"id": "4", "answer": {
            "Scope": f"{len(df)} penguins with complete records; explanatory variables island, bill length/depth, flipper length, "
                     "body mass, sex, year; response species (Adelie, Chinstrap, Gentoo). Source: DS4A dataset (palmerpenguins).",
            "Track": "How does allowing a deeper (more complex) tree change interpretability and accuracy when predicting species?",
            "Articulate": f"Depth 1 uses only {first['features_used'][0] if first['features_used'] else '-'} and is correct for "
                          f"{first['correct']}/{first['n']} penguins; it can never predict Chinstrap. Deeper trees use more variables and reach "
                          f"{last['correct']}/{last['n']} correct on the training data, but are much harder to describe.{ident_note}",
            "Respond": "Training accuracy of 100% does not prove the deep tree generalizes: split into training and test data and compare "
                       "test accuracy (see the Overfitting lab). Prefer the simplest tree with good test performance."},
         "explanation": "STAR framework."},
    ]
    return {"answers": answers, "trees": trees, "summary": summary, "identical_pairs": identical,
            "dataset": {"key": "penguins", "rows": len(df), "target": "species"}}


AC6 = Exercise(
    id="ds4a-ac6", book="DS4A", chapter=8, exercise_number="AC 6",
    title="Interpretability versus Complexity", category="Decision trees", source_page="p. 400", kind="training",
    description="Create three decision trees for predicting species in the penguins data with max depth 1, 5 and 7. Plot them and "
                "answer: (1) which variable is at the top of all trees? (2) Based on the bottom nodes, which tree appears most "
                "accurate? (3) Rank the trees by complexity and interpretability (fill in the blanks). (4) STAR.",
    required_dataset="penguins",
    concepts=["max depth", "complexity", "interpretability", "nested trees", "trade-off"],
    understand=("DS4A §8.3: max depth controls how complex a tree may become. More splits capture more structure "
                "(complexity ↑) but each prediction needs more questions (interpretability ↓). Node counts are in "
                "alphabetical order: Adelie, Chinstrap, Gentoo."),
    questions=[Question(str(i), q) for i, q in enumerate([
        "Which variable appears at the top of all of these trees?",
        "Based on the nodes at the very bottom of each tree, which tree appears to be the most accurate?",
        "Rank the trees in order of complexity and interpretability (fill in the blanks).",
        "Describe the results using the STAR Framework."], start=1)],
    interpretation=("With scikit-learn the depth-5 tree already classifies every training penguin correctly, so allowing "
                    "depth 7 changes nothing. 'Most accurate' here means on training data only."),
    common_mistakes=["Concluding that 100% training accuracy means the best model (it may be overfitted).",
                     "Expecting the depth-7 tree to have depth 7: growth stops when leaves are pure.",
                     "Comparing with the book's R plots: R's rpart has extra stopping rules (minsplit = 20, cp = 0.01 by default), so its deep trees are smaller."],
    python_code='''import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

penguins = pd.read_csv("penguins.csv")
X, y = penguins.drop(columns="species"), penguins["species"]
encode = ColumnTransformer([("dummify", OneHotEncoder(sparse_output=False), ["island", "sex"])],
                           remainder="passthrough")
for depth in (1, 5, 7):
    model = Pipeline([("prep", encode),
                      ("tree", DecisionTreeClassifier(max_depth=depth, random_state=1234))]).fit(X, y)
    t = model["tree"]
    print(depth, "leaves:", t.get_n_leaves(), "actual depth:", t.get_depth(),
          "training accuracy:", round(model.score(X, y), 4))
''',
    similar=[
        SimilarProblem("Repeat with carseats (predict sales_cat, exclude sales) at depths 1, 3 and 10. Does the depth-10 tree reach 100% training accuracy? Is it best on carseats_test?",
                       "Compute in the Overfitting lab", "Shows that training accuracy keeps rising while test accuracy does not."),
        SimilarProblem("If a depth-3 tree has 7 splits and a depth-2 tree has 3, which is more interpretable?",
                       "The depth-2 tree", "Fewer questions per prediction."),
    ],
    parameters={"depths": [1, 5, 7], "random_state": 1234}, solver=_solve_ac6,
    notes=["The book's own Python script for the in-chapter TiY uses one-hot encoding for island and sex and passes the other columns through; this app does the same."],
)


# ======================================================================= AC7
def _solve_ac7(p: dict) -> dict:
    depth, min_n, seed = int(p["max_depth"]), int(p["min_n"]), int(p["random_state"])
    pos = str(p["positive_label"])
    train, test = load_builtin("carseats_train"), load_builtin("carseats_test")
    pipe, tree, X = _fit(train, "sales_cat", ["sales"], depth, seed, min_n=min_n)
    X_test = test.drop(columns=["sales_cat", "sales"])
    pred = pipe.predict(X_test)
    counts = binary_from_predictions(test["sales_cat"].astype(str).to_numpy(), pred, pos)
    m = binary_metrics(counts)
    neg = "Low" if pos == "High" else "High"
    c = m["counts"]
    answers = [
        {"id": "1", "answer": _r2(m["accuracy"]), "exact": m["accuracy"], "explanation": "Accuracy = (TP + TN) / total = " + m["calculations"]["accuracy"]},
        {"id": "2", "answer": _r2(m["precision"]), "exact": m["precision"], "explanation": "Precision = TP / (TP + FP) = " + m["calculations"]["precision"]},
        {"id": "3", "answer": _r2(m["recall"]), "exact": m["recall"], "explanation": "Recall = TP / (TP + FN) = " + m["calculations"]["recall"]},
        {"id": "4", "answer": _r2(m["specificity"]), "exact": m["specificity"],
         "explanation": "Specificity = TN / (TN + FP) = " + m["calculations"]["specificity"] +
                        f". (DS4A p.383 prints TN/(TN+FN) = {_r2(m['negative_predictive_value'])}; that formula is the negative "
                        "predictive value. The book's own Python script computes TN/(TN+FP).)"},
        {"id": "5", "answer": {
            "Scope": f"Car-seat sales at {len(train)} training and {len(test)} test stores; response sales_cat (High > 8,000 units, Low otherwise); "
                     "10 explanatory variables (sales excluded because it determines sales_cat).",
            "Track": f"How well does a one-question tree predict High-selling stores in new (test) stores, and which errors does it make? Positive class = {pos}.",
            "Articulate": f"The tree uses one split: {_branches(tree)}. On the 81 test stores it is right {c['tp'] + c['tn']} times "
                          f"(accuracy {m['accuracy']:.2f}). When it says {pos} it is usually right (precision {m['precision']:.2f}), but it finds only "
                          f"{c['tp']} of the {c['tp'] + c['fn']} truly {pos} stores (recall {m['recall']:.2f}); it correctly labels {c['tn']} of {c['tn'] + c['fp']} "
                          f"{neg} stores (specificity {m['specificity']:.2f}).",
            "Respond": "Many High stores are missed (false negatives). If missing High stores is costly, grow a deeper tree or add variables (e.g. price) "
                       "and compare recall on the test data."}, "explanation": "STAR framework."},
    ]
    return {"answers": answers, "metrics": m, "tree": tree, "rules": dt.decision_rules(tree),
            "confusion_matrix": {"labels": [pos, neg], "layout": "rows = actual, columns = predicted",
                                 "matrix": [[c["tp"], c["fn"]], [c["fp"], c["tn"]]]},
            "test_predictions": [{"actual": a, "predicted": b} for a, b in zip(test["sales_cat"], pred)],
            "dataset": {"train_rows": len(train), "test_rows": len(test), "features": list(X.columns), "target": "sales_cat"}}


AC7 = Exercise(
    id="ds4a-ac7", book="DS4A", chapter=8, exercise_number="AC 7",
    title="Calculate Accuracy, Precision, Recall, and Specificity Using a Confusion Matrix", category="Model evaluation",
    source_page="p. 400", kind="training",
    description="Using carseats_train and carseats_test, fit a decision tree predicting sales_cat with max depth 1, min n 2 and seed 1234, "
                "build the test confusion matrix and compute (1) accuracy, (2) precision, (3) recall, (4) specificity; (5) interpret with STAR. "
                "Round to two decimals.",
    required_dataset="carseats_train, carseats_test",
    concepts=["train/test split", "confusion matrix", "accuracy", "precision", "recall", "specificity", "positive class"],
    understand=("The model is trained on the 319 training stores and judged on the 81 unseen test stores (model validation, §8.4). "
                "'min n' (tidymodels) corresponds to sklearn's min_samples_split. The positive class must be stated: here 'High' "
                "(as in Table 8.3 and the book's script, where High is coded 0 and placed first)."),
    questions=[Question(str(i), q) for i, q in enumerate([
        "Compute the accuracy on the test data.", "Compute the precision on the test data.",
        "Compute the recall on the test data.", "Compute the specificity on the test data.",
        "Interpret the confusion matrix using the STAR Framework."], start=1)],
    interpretation="A single split on shelf location gives moderate accuracy, good precision and specificity, but low recall for High stores.",
    common_mistakes=["Using `sales` as a feature (it reveals sales_cat — leakage).",
                     "Mixing up matrix layouts: Table 8.3 has predicted in rows, sklearn's confusion_matrix has actual in rows.",
                     "Using the book's printed specificity formula TN/(TN+FN)."],
    python_code='''import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import confusion_matrix

train, test = pd.read_csv("carseats_train.csv"), pd.read_csv("carseats_test.csv")
X_train, y_train = train.drop(columns=["sales", "sales_cat"]), train["sales_cat"]
X_test,  y_test  = test.drop(columns=["sales", "sales_cat"]),  test["sales_cat"]

encode = ColumnTransformer([("dummify", OneHotEncoder(sparse_output=False),
                             ["shelf_location", "urban", "us"])], remainder="passthrough")
model = Pipeline([("prep", encode),
                  ("tree", DecisionTreeClassifier(max_depth=1, min_samples_split=2, random_state=1234))])
model.fit(X_train, y_train)

cm = confusion_matrix(y_test, model.predict(X_test), labels=["High", "Low"])  # rows = actual
TP, FN, FP, TN = cm[0, 0], cm[0, 1], cm[1, 0], cm[1, 1]
print("accuracy   ", round((TP + TN) / cm.sum(), 2))
print("precision  ", round(TP / (TP + FP), 2))
print("recall     ", round(TP / (TP + FN), 2))
print("specificity", round(TN / (TN + FP), 2))
''',
    similar=[
        SimilarProblem("Table 8.3 (DS4A p.382): TP=22, FP=11, FN=11, TN=37. Compute accuracy, precision, recall, specificity.",
                       "0.73, 0.67, 0.67, 0.77", "59/81, 22/33, 22/33, 37/48 — this is the in-chapter TiY."),
        SimilarProblem("Repeat AC7 with max depth 5. Does recall improve?",
                       "Compute with the parameters panel", "Deeper trees can find more High stores but may overfit."),
    ],
    parameters={"max_depth": 1, "min_n": 2, "random_state": 1234, "positive_label": "High"}, solver=_solve_ac7,
    notes=["Uses the book's official carseats_train.csv (319 stores) and carseats_test.csv (81 stores) from github.com/datasci4all/Datasets.",
           "DS4A p.383 prints specificity = TN/(TN+FN); the standard definition, used here and in the book's Python script, is TN/(TN+FP)."],
)


# ======================================================================= AC8
AC8_DEFAULT = {  # DS4A p.401, rows = Actual (0, 1), columns = Predicted (0, 1)
    "model_1": {"training": [[92, 39], [26, 162]], "testing": [[17, 16], [13, 35]]},
    "model_2": {"training": [[60, 71], [19, 169]], "testing": [[15, 18], [10, 38]]},
    "model_3": {"training": [[0, 131], [0, 188]], "testing": [[0, 33], [0, 48]]},
}


def _counts(mat) -> BinaryCounts:
    (tn, fp), (fn, tp) = mat   # rows actual 0/1, cols predicted 0/1 ; positive = 1
    return BinaryCounts(tp=int(tp), fp=int(fp), fn=int(fn), tn=int(tn))


def _solve_ac8(p: dict) -> dict:
    models = p["matrices"]
    table, diag = [], {}
    for name, sets in models.items():
        row = {}
        for split in ("training", "testing"):
            m = binary_metrics(_counts(sets[split]))
            c = m["counts"]
            table.append({"model": name, "dataset": split, "accuracy": _r2(m["accuracy"]), "exact": m["accuracy"],
                          "calculation": f"({c['tp']} + {c['tn']}) / {c['total']}"})
            row[split] = m
            mat = sets[split]
            row[split + "_baseline"] = max(mat[0][0] + mat[0][1], mat[1][0] + mat[1][1]) / c["total"]
            row[split + "_predicts_one_class"] = (mat[0][0] + mat[1][0] == 0) or (mat[0][1] + mat[1][1] == 0)
        diag[name] = row
    best_test = max(diag, key=lambda k: diag[k]["testing"]["accuracy"])
    conclusions = {}
    for name, r in diag.items():
        tr, te = r["training"]["accuracy"], r["testing"]["accuracy"]
        if r["training_predicts_one_class"] or tr <= r["training_baseline"] + 0.01:
            label, fit, pred = "underfitted", "did not fit", "did not predict"
            why = (f"training accuracy {tr:.2f} is no better than always predicting the majority class "
                   f"({r['training_baseline']:.2f})" + (" — it predicts the same class for every observation" if r["training_predicts_one_class"] else "")
                   + f"; test accuracy {te:.2f} is equally poor.")
        elif name == best_test:
            label, fit, pred = "well-fitted", "fit", "predicted"
            why = f"it has the highest test accuracy ({te:.2f}) and a small train-test gap ({tr - te:.2f})."
        else:
            label, fit, pred = "overfitted", "fit", "did not predict"
            why = (f"it has the highest training accuracy ({tr:.2f}) but its test accuracy ({te:.2f}) is lower than "
                   f"{best_test.replace('_', ' ')}'s; the gap of {tr - te:.2f} shows it memorised training details.")
        conclusions[name] = {"label": label, "training_fit": fit, "test": pred, "reason": why,
                             "train_accuracy": tr, "test_accuracy": te}
    answers = [
        {"id": "1", "answer": {"a_TP": "Predicted = 1, Actual = 1", "b_TN": "Predicted = 0, Actual = 0",
                               "c_FP": "Predicted = 1, Actual = 0", "d_FN": "Predicted = 0, Actual = 1"},
         "explanation": "Positive = 1. 'True/False' says whether the prediction was right; 'Positive/Negative' is what was predicted."},
        {"id": "2", "answer": table, "explanation": "Accuracy = sum of the diagonal / total (DS4A Quick Tip)."},
        {"id": "3", "answer": conclusions,
         "explanation": "Overfitted: good on training, worse on test. Well-fitted: good on both. Underfitted: poor on both (DS4A p.387)."},
    ]
    return {"answers": answers, "accuracy_table": table, "conclusions": conclusions}


AC8 = Exercise(
    id="ds4a-ac8", book="DS4A", chapter=8, exercise_number="AC 8",
    title="Overfitted, Underfitted, and Well-Fitted Models", category="Model evaluation", source_page="pp. 400–401",
    kind="computational",
    description="Given training and testing confusion matrices for three models of varying complexity: (1) fill in the TP/TN/FP/FN "
                "definitions; (2) complete the accuracy table to two decimals; (3) state whether each model was overfitted, "
                "well-fitted or underfitted, whether it fit the training data, and whether it predicted the test data well.",
    required_dataset=None,
    concepts=["overfitting", "underfitting", "generalization", "accuracy", "baseline"],
    understand=("Compare each model's training and test accuracy. The matrices total 319 (training) and 81 (testing) — the same "
                "sizes as carseats_train/test. Layout: rows = Actual, columns = Predicted; positive = 1."),
    questions=[Question("1", "Fill in: TP, TN, FP, FN in terms of Predicted and Actual."),
               Question("2", "Complete the Accuracy column (two decimals)."),
               Question("3", "Classify Model 1, 2, 3 as overfitted / well-fitted / underfitted.")],
    interpretation=("Model 1 has the best training accuracy but loses the most on test data (overfitted). Model 2 generalizes best "
                    "(well-fitted). Model 3 predicts '1' for everything, so its accuracy is just the share of 1s (underfitted)."),
    common_mistakes=["Calling Model 3 'well-fitted' because train and test accuracy are equal — equal but poor means underfitted.",
                     "Choosing the model with the best training accuracy.",
                     "Reading the matrix as Predicted × Actual (that is Table 8.3's layout, not this one's)."],
    python_code='''import numpy as np
matrices = {  # rows = actual (0, 1), columns = predicted (0, 1)
    "Model 1": {"train": [[92, 39], [26, 162]], "test": [[17, 16], [13, 35]]},
    "Model 2": {"train": [[60, 71], [19, 169]], "test": [[15, 18], [10, 38]]},
    "Model 3": {"train": [[0, 131], [0, 188]],  "test": [[0, 33],  [0, 48]]},
}
for name, d in matrices.items():
    acc = {k: np.trace(np.array(m)) / np.sum(m) for k, m in d.items()}
    print(name, {k: round(v, 2) for k, v in acc.items()})
''',
    similar=[
        SimilarProblem("Model A: train 0.99, test 0.70. Model B: train 0.85, test 0.83. Model C: train 0.60, test 0.58 (majority share 0.60). Classify each.",
                       "A overfitted, B well-fitted, C underfitted", "Same reasoning as AC8."),
        SimilarProblem("Why can't we diagnose overfitting from training accuracy alone?",
                       "We need test performance", "Overfitting is defined by poor generalization to unseen data."),
    ],
    parameters={"matrices": AC8_DEFAULT}, solver=_solve_ac8,
    notes=["Matrices transcribed from the DS4A p.401 image and checked: training totals 319, testing totals 81."],
)

EXERCISES = [AC3, AC6, AC7, AC8]
