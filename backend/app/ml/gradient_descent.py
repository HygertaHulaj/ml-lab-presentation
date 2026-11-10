"""Batch gradient descent for simple linear regression, implemented from scratch with NumPy.

Model:   y_hat = w * x + b
Loss:    MSE(w, b) = (1/n) * sum_i (y_i - y_hat_i)^2
Gradients (derived in HoIDS eq. 8.2 / 8.3):
    dMSE/dw = (2/n) * sum_i (y_hat_i - y_i) * x_i
    dMSE/db = (2/n) * sum_i (y_hat_i - y_i)
Update:  w <- w - alpha * dMSE/dw ;  b <- b - alpha * dMSE/db

Every iteration is recorded *as it actually happened*: the parameters used to make the
predictions, the loss at those parameters, the gradients at those parameters, and the
parameters produced by the update. Nothing is interpolated or invented.

HoIDS Example 8.2 uses the cost J = (1/2n) * sum e^2, whose gradient is half of the MSE
gradient. `loss="half_mse"` reproduces the book's algorithm exactly (theta update
theta - alpha * X^T e / n).
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Literal

import numpy as np

LossName = Literal["mse", "half_mse"]

MAX_ITERATIONS = 100_000
MAX_RECORDED_STEPS = 5_000  # history is thinned (but always keeps first/last) above this


@dataclass
class GDStep:
    iteration: int          # 0 = initial state before any update
    w: float                # parameters BEFORE this iteration's update
    b: float
    loss: float             # loss at (w, b)
    grad_w: float           # gradient at (w, b)
    grad_b: float
    w_next: float           # parameters AFTER the update
    b_next: float
    step_w: float           # alpha * grad_w (amount subtracted)
    step_b: float


@dataclass
class GDResult:
    w: float
    b: float
    final_loss: float
    iterations_run: int
    converged: bool
    diverged: bool
    stop_reason: str
    learning_rate: float
    loss_name: str
    history: list[GDStep] = field(default_factory=list)
    recorded_every: int = 1

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


def _validate(x: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    x = np.asarray(x, dtype=float).ravel()
    y = np.asarray(y, dtype=float).ravel()
    if x.shape != y.shape:
        raise ValueError(f"x and y must have the same length (got {x.size} and {y.size}).")
    if x.size < 2:
        raise ValueError("Gradient descent needs at least 2 data points.")
    if not (np.all(np.isfinite(x)) and np.all(np.isfinite(y))):
        raise ValueError("x and y must not contain missing or infinite values.")
    return x, y


def loss_value(x: np.ndarray, y: np.ndarray, w: float, b: float, loss: LossName = "mse") -> float:
    e = (w * x + b) - y
    mse = float(np.mean(e**2))
    return mse / 2.0 if loss == "half_mse" else mse


def gradients(x: np.ndarray, y: np.ndarray, w: float, b: float, loss: LossName = "mse") -> tuple[float, float]:
    """Analytic gradients of the chosen loss with respect to (w, b)."""
    n = x.size
    e = (w * x + b) - y                      # prediction error y_hat - y
    factor = 1.0 if loss == "half_mse" else 2.0
    grad_w = factor * float(np.sum(e * x)) / n
    grad_b = factor * float(np.sum(e)) / n
    return grad_w, grad_b


def iteration_detail(x: np.ndarray, y: np.ndarray, w: float, b: float, learning_rate: float,
                     loss: LossName = "mse") -> dict:
    """Full per-point breakdown of one iteration (used by the step-by-step explainer)."""
    x, y = _validate(x, y)
    y_hat = w * x + b
    e = y_hat - y
    gw, gb = gradients(x, y, w, b, loss)
    return {
        "w": w, "b": b,
        "x": x.tolist(), "y": y.tolist(),
        "predictions": y_hat.tolist(),
        "errors": e.tolist(),                  # y_hat - y
        "squared_errors": (e**2).tolist(),
        "error_times_x": (e * x).tolist(),
        "sum_error": float(e.sum()),
        "sum_error_times_x": float((e * x).sum()),
        "n": int(x.size),
        "loss": loss_value(x, y, w, b, loss),
        "grad_w": gw, "grad_b": gb,
        "learning_rate": learning_rate,
        "w_next": w - learning_rate * gw,
        "b_next": b - learning_rate * gb,
    }


def run_gradient_descent(
    x, y, *,
    learning_rate: float = 0.01,
    iterations: int = 1000,
    w0: float = 0.0,
    b0: float = 0.0,
    loss: LossName = "mse",
    tolerance: float | None = 1e-9,
    divergence_threshold: float = 1e12,
) -> GDResult:
    """Run batch gradient descent and record the true history.

    Stops early when the absolute change in loss is below `tolerance` (convergence)
    or when the loss explodes / becomes non-finite (divergence).
    """
    x, y = _validate(x, y)
    if not (0 < learning_rate <= 10):
        raise ValueError("learning_rate must be in (0, 10].")
    if not (1 <= iterations <= MAX_ITERATIONS):
        raise ValueError(f"iterations must be between 1 and {MAX_ITERATIONS}.")

    record_every = max(1, int(np.ceil(iterations / MAX_RECORDED_STEPS)))
    w, b = float(w0), float(b0)
    history: list[GDStep] = []
    prev_loss = None
    converged = diverged = False
    stop_reason = "max_iterations"
    it = 0

    for it in range(1, iterations + 1):
        current_loss = loss_value(x, y, w, b, loss)
        if not np.isfinite(current_loss) or current_loss > divergence_threshold:
            diverged = True
            stop_reason = "diverged"
            it -= 1
            break
        gw, gb = gradients(x, y, w, b, loss)
        w_next = w - learning_rate * gw
        b_next = b - learning_rate * gb
        if it == 1 or it % record_every == 0 or it == iterations:
            history.append(GDStep(it, w, b, current_loss, gw, gb, w_next, b_next,
                                  learning_rate * gw, learning_rate * gb))
        if tolerance is not None and prev_loss is not None and abs(prev_loss - current_loss) < tolerance:
            converged = True
            stop_reason = "converged"
            if history[-1].iteration != it:
                history.append(GDStep(it, w, b, current_loss, gw, gb, w_next, b_next,
                                      learning_rate * gw, learning_rate * gb))
            w, b = w_next, b_next
            break
        prev_loss = current_loss
        w, b = w_next, b_next

    final_loss = loss_value(x, y, w, b, loss) if not diverged else float("inf")
    return GDResult(
        w=w, b=b, final_loss=final_loss, iterations_run=it, converged=converged,
        diverged=diverged, stop_reason=stop_reason, learning_rate=learning_rate,
        loss_name=loss, history=history, recorded_every=record_every,
    )


def run_multivariate_gd(X, y, *, learning_rate: float = 0.1, iterations: int = 2000,
                        standardize: bool = True, tolerance: float | None = 1e-10,
                        record_every: int = 1) -> dict:
    """Batch gradient descent for h(x) = theta_0 + sum_j theta_j x_j (HoIDS eq. 8.4-8.7),
    cost J = (1/2m) sum (h(x_i) - y_i)^2, update theta_j := theta_j - alpha*(1/m) sum (h - y) x_ij.

    Features are standardized (z-scores) so one learning rate suits all of them; the learned
    coefficients are converted back to the original units for comparison with OLS."""
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float).ravel()
    if X.ndim == 1:
        X = X.reshape(-1, 1)
    if X.shape[0] != y.size or y.size < 2:
        raise ValueError("X and y must have the same number of rows (at least 2).")
    if not (np.all(np.isfinite(X)) and np.all(np.isfinite(y))):
        raise ValueError("X and y must not contain missing or infinite values.")
    if not (1 <= iterations <= MAX_ITERATIONS):
        raise ValueError(f"iterations must be between 1 and {MAX_ITERATIONS}.")
    mu = X.mean(axis=0) if standardize else np.zeros(X.shape[1])
    sd = X.std(axis=0) if standardize else np.ones(X.shape[1])
    if np.any(sd == 0):
        raise ValueError("A feature is constant; it cannot be used.")
    Z = np.column_stack([np.ones(len(y)), (X - mu) / sd])
    theta = np.zeros(Z.shape[1])
    m = len(y)
    history, prev = [], None
    stop = "max_iterations"
    it = 0
    for it in range(1, iterations + 1):
        err = Z @ theta - y
        cost = float(err @ err / (2 * m))
        if not np.isfinite(cost) or cost > 1e15:
            stop = "diverged"
            break
        grad = Z.T @ err / m
        if it == 1 or it % record_every == 0:
            history.append({"iteration": it, "theta": theta.tolist(), "cost": cost, "gradient": grad.tolist()})
        theta = theta - learning_rate * grad
        if tolerance is not None and prev is not None and abs(prev - cost) < tolerance:
            stop = "converged"
            break
        prev = cost
    # back to original units: y = t0 + sum t_j (x_j - mu_j)/sd_j
    coefs = theta[1:] / sd
    intercept = float(theta[0] - np.sum(theta[1:] * mu / sd))
    err = Z @ theta - y
    return {"theta_standardized": theta.tolist(), "intercept": intercept, "coefficients": coefs.tolist(),
            "final_cost": float(err @ err / (2 * m)), "iterations_run": it, "stop_reason": stop,
            "history": history, "standardized": standardize, "feature_means": mu.tolist(), "feature_sds": sd.tolist()}


def closed_form_ols(x, y) -> tuple[float, float]:
    """Least-squares solution (slope, intercept) for comparison with gradient descent."""
    x, y = _validate(x, y)
    x_mean, y_mean = x.mean(), y.mean()
    sxx = float(np.sum((x - x_mean) ** 2))
    if sxx == 0:
        raise ValueError("All x values are identical; the slope is undefined.")
    w = float(np.sum((x - x_mean) * (y - y_mean)) / sxx)
    return w, float(y_mean - w * x_mean)


def book_r_cost(x, y, w: float, b: float) -> float:
    """The cost exactly as written in HoIDS Example 8.2's R code:
    `sum(X %*% theta - y)^2 / (2*length(y))`. Because `^` binds to `sum(...)`, this is
    (sum of errors)^2 / 2n, NOT the sum of squared errors. Provided only to explain the
    shape of the book's Figure 8.11."""
    x, y = _validate(x, y)
    s = float(np.sum((w * x + b) - y))
    return s * s / (2 * x.size)
