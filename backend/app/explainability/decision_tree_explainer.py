"""Explains a fitted tree's splits using the stored node statistics."""


def explain_splits(tree: dict) -> list[dict]:
    nodes = tree["nodes"]
    out = []
    for n in nodes:
        if n["is_leaf"]:
            continue
        left, right = nodes[n["left"]], nodes[n["right"]]
        out.append({
            "node_id": n["id"], "depth": n["depth"], "question": n["question"],
            "samples": n["samples"], "impurity": n["impurity"],
            "left": {"condition": n["left_condition"], "samples": left["samples"], "impurity": left["impurity"],
                     "class_counts": left.get("class_counts"), "prediction": left["prediction"]},
            "right": {"condition": n["right_condition"], "samples": right["samples"], "impurity": right["impurity"],
                      "class_counts": right.get("class_counts"), "prediction": right["prediction"]},
            "impurity_decrease": n["impurity_decrease"],
            "calculation": (f"{tree['criterion']}(parent) = {n['impurity']:.4f}; weighted children = "
                            f"({left['samples']}×{left['impurity']:.4f} + {right['samples']}×{right['impurity']:.4f}) / {n['samples']} "
                            f"= {n['children_weighted_impurity']:.4f}; decrease = {n['impurity_decrease']:.4f}"),
        })
    return out


def gini(counts: list[int]) -> float:
    n = sum(counts)
    return 0.0 if n == 0 else 1.0 - sum((c / n) ** 2 for c in counts)
