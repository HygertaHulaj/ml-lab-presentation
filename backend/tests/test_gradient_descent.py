import numpy as np
import pytest

from app.datasets_registry import SHAH_TABLE_8_2
from app.ml import gradient_descent as gd

X = np.array(SHAH_TABLE_8_2["x"], float)
Y = np.array(SHAH_TABLE_8_2["y"], float)


@pytest.mark.parametrize("loss", ["mse", "half_mse"])
@pytest.mark.parametrize("w,b", [(0.0, 0.0), (2.5, -3.0), (-1.0, 10.0)])
def test_analytic_gradient_matches_numerical(loss, w, b):
    gw, gb = gd.gradients(X, Y, w, b, loss)
    h = 1e-6
    num_w = (gd.loss_value(X, Y, w + h, b, loss) - gd.loss_value(X, Y, w - h, b, loss)) / (2 * h)
    num_b = (gd.loss_value(X, Y, w, b + h, loss) - gd.loss_value(X, Y, w, b - h, loss)) / (2 * h)
    assert gw == pytest.approx(num_w, rel=1e-5)
    assert gb == pytest.approx(num_b, rel=1e-5)


def test_parameter_update_rule_is_recorded_exactly():
    res = gd.run_gradient_descent(X, Y, learning_rate=0.001, iterations=5, tolerance=None)
    for s in res.history:
        assert s.w_next == pytest.approx(s.w - 0.001 * s.grad_w)
        assert s.b_next == pytest.approx(s.b - 0.001 * s.grad_b)
        assert s.loss == pytest.approx(gd.loss_value(X, Y, s.w, s.b))
    # consecutive steps chain: next step starts where the previous ended
    for a, b in zip(res.history, res.history[1:]):
        assert b.w == pytest.approx(a.w_next) and b.b == pytest.approx(a.b_next)


def test_reproduces_shah_example_8_2():
    """Book settings: theta=(0,0), alpha=0.01, 300 iterations, cost with 1/(2m)."""
    res = gd.run_gradient_descent(X, Y, learning_rate=0.01, iterations=300, loss="half_mse", tolerance=None)
    assert res.iterations_run == 300
    assert res.b == pytest.approx(-5.0091, abs=1e-3)
    assert res.w == pytest.approx(3.5924, abs=1e-3)


def test_book_r_cost_bug_value():
    res = gd.run_gradient_descent(X, Y, learning_rate=0.01, iterations=1, loss="half_mse", tolerance=None)
    s = res.history[0]
    assert gd.book_r_cost(X, Y, s.w_next, s.b_next) == pytest.approx(3038.049, abs=1e-2)
    assert gd.loss_value(X, Y, s.w_next, s.b_next, "half_mse") == pytest.approx(175.248, abs=1e-2)


def test_ols_matches_book_lm_output():
    w, b = gd.closed_form_ols(X, Y)
    assert round(b, 3) == -10.263 and round(w, 3) == 3.977


def test_converges_to_ols_with_enough_iterations():
    w, b = gd.closed_form_ols(X, Y)
    for loss, lr in (("half_mse", 0.01), ("mse", 0.005)):
        res = gd.run_gradient_descent(X, Y, learning_rate=lr, iterations=100_000, loss=loss, tolerance=1e-12)
        assert res.w == pytest.approx(w, abs=1e-3) and res.b == pytest.approx(b, abs=1e-2)


def test_stability_limit_depends_on_loss_scaling():
    """Stable iff alpha < 2/lambda_max of the loss Hessian. For Table 8.2, (1/n)X^T X has
    lambda_max ~= 144.3, so half-MSE needs alpha < 0.0139 and MSE (gradient x2) needs alpha < 0.0069."""
    A = np.column_stack([np.ones_like(X), X])
    lam = np.linalg.eigvalsh(A.T @ A / len(X)).max()
    assert 2 / lam == pytest.approx(0.01386, abs=1e-4)
    assert not gd.run_gradient_descent(X, Y, learning_rate=0.01, iterations=3000, loss="half_mse").diverged
    assert gd.run_gradient_descent(X, Y, learning_rate=0.02, iterations=3000, loss="half_mse").diverged
    assert gd.run_gradient_descent(X, Y, learning_rate=0.01, iterations=3000, loss="mse").diverged


def test_loss_decreases_for_small_learning_rate():
    res = gd.run_gradient_descent(X, Y, learning_rate=0.001, iterations=200, tolerance=None)
    losses = [s.loss for s in res.history]
    assert all(b <= a for a, b in zip(losses, losses[1:]))


def test_divergence_detected():
    res = gd.run_gradient_descent(X, Y, learning_rate=0.05, iterations=500, tolerance=None)
    assert res.diverged and res.stop_reason == "diverged"


def test_invalid_inputs():
    with pytest.raises(ValueError):
        gd.run_gradient_descent([1], [2])
    with pytest.raises(ValueError):
        gd.run_gradient_descent([1, 2], [1, 2, 3])
    with pytest.raises(ValueError):
        gd.run_gradient_descent([1, np.nan], [1, 2])
    with pytest.raises(ValueError):
        gd.run_gradient_descent(X, Y, learning_rate=0)


def test_multivariate_gd_matches_least_squares():
    rng = np.random.default_rng(0)
    Xm = rng.normal(size=(60, 3)) * [1, 100, 0.01]
    y = 4 + Xm @ np.array([2.0, -0.03, 150.0]) + rng.normal(scale=0.1, size=60)
    res = gd.run_multivariate_gd(Xm, y, learning_rate=0.1, iterations=20_000)
    A = np.column_stack([np.ones(60), Xm])
    beta = np.linalg.lstsq(A, y, rcond=None)[0]
    assert res["intercept"] == pytest.approx(beta[0], abs=1e-3)
    assert np.allclose(res["coefficients"], beta[1:], rtol=1e-3)


def test_iteration_detail_consistent():
    d = gd.iteration_detail(X, Y, 1.0, 2.0, 0.01)
    gw, gb = gd.gradients(X, Y, 1.0, 2.0)
    assert d["grad_w"] == pytest.approx(gw) and d["grad_b"] == pytest.approx(gb)
    assert d["sum_error"] == pytest.approx(sum(1.0 * x + 2.0 - y for x, y in zip(X, Y)))
