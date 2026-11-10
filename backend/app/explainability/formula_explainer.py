"""The mathematics behind each algorithm, as structured data the frontend renders."""

_GD = {
    "model": "ŷ = w·x + b",
    "loss_mse": "MSE(w, b) = (1/n) Σᵢ (yᵢ − ŷᵢ)²",
    "loss_half_mse": "J(w, b) = 1/(2n) Σᵢ (ŷᵢ − yᵢ)²   (Shah eq. 8.5; the ½ cancels the 2 from differentiation)",
    "grad_w_mse": "∂MSE/∂w = (2/n) Σᵢ (ŷᵢ − yᵢ)·xᵢ",
    "grad_b_mse": "∂MSE/∂b = (2/n) Σᵢ (ŷᵢ − yᵢ)",
    "grad_w_half_mse": "∂J/∂w = (1/n) Σᵢ (ŷᵢ − yᵢ)·xᵢ",
    "grad_b_half_mse": "∂J/∂b = (1/n) Σᵢ (ŷᵢ − yᵢ)",
    "update": "w ← w − α·∂Loss/∂w ;  b ← b − α·∂Loss/∂b",
}


def for_algorithm(algorithm: str, variant: str | None = None) -> dict:
    if algorithm == "linear_regression":
        return {
            "model": "ŷ = β₀ + β₁x₁ + β₂x₂ + … + βₖxₖ",
            "simple_case": "ŷ = β₀ + β₁x ; β₁ = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)² ; β₀ = ȳ − β₁x̄",
            "objective": "choose β to minimise Σᵢ (yᵢ − ŷᵢ)² (least squares, solved exactly)",
            "metrics": {"MAE": "(1/n) Σ |yᵢ − ŷᵢ|", "MSE": "(1/n) Σ (yᵢ − ŷᵢ)²", "RMSE": "√MSE",
                        "R²": "1 − Σ(yᵢ − ŷᵢ)² / Σ(yᵢ − ȳ)²"},
            "categorical_note": "Categorical features become 0/1 indicator columns (one-hot); each gets its own β.",
        }
    if algorithm == "logistic_regression":
        return {
            "model": "P(y = positive | x) = 1 / (1 + e^−(β₀ + β₁x₁ + … + βₖxₖ))",
            "decision": "predict positive if P ≥ threshold (default 0.5)",
            "objective": "maximise the likelihood (minimise log-loss) with L2 regularisation of strength 1/C",
            "scaling": "Numeric features are standardised (z-scores) using training-set means and SDs.",
            **_classification_metrics(),
        }
    if algorithm == "decision_tree":
        if variant == "regression":
            impurity = {"MSE (squared_error)": "node impurity = (1/n) Σ (yᵢ − ȳ_node)²",
                        "split choice": "choose the question that maximises impurity(parent) − weighted mean impurity(children)",
                        "leaf prediction": "mean of the training targets in the leaf"}
            return {"impurity": impurity, "metrics": for_algorithm("linear_regression")["metrics"]}
        return {"impurity": {"Gini": "G = 1 − Σₖ pₖ²  (pₖ = share of class k in the node)",
                             "Entropy": "H = − Σₖ pₖ log₂ pₖ",
                             "split choice": "choose the question that maximises G(parent) − [n_L·G(L) + n_R·G(R)]/n",
                             "leaf prediction": "majority class in the leaf"},
                **_classification_metrics()}
    if algorithm == "gradient_descent":
        half = variant == "half_mse"
        return {"model": _GD["model"], "loss": _GD["loss_half_mse" if half else "loss_mse"],
                "grad_w": _GD["grad_w_half_mse" if half else "grad_w_mse"],
                "grad_b": _GD["grad_b_half_mse" if half else "grad_b_mse"], "update": _GD["update"],
                "learning_rate": "α controls the step size: too small → slow; too large → overshoots and diverges."}
    raise ValueError(algorithm)


def _classification_metrics() -> dict:
    return {"metrics": {
        "Accuracy": "(TP + TN) / (TP + TN + FP + FN)",
        "Precision": "TP / (TP + FP)",
        "Recall (sensitivity)": "TP / (TP + FN)",
        "Specificity": "TN / (TN + FP)",
        "F1": "2 · Precision · Recall / (Precision + Recall)",
    }, "confusion_terms": {
        "TP": "predicted positive, actually positive", "FP": "predicted positive, actually negative",
        "FN": "predicted negative, actually positive", "TN": "predicted negative, actually negative"}}
