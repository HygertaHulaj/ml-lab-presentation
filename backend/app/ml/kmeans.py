"""Transparent K-Means (Lloyd's algorithm) that records every computational step.

Each iteration has two phases that the trace keeps separate:
  1. ASSIGNMENT — centroids fixed; distances d(x_i, mu_j) = ||x_i - mu_j||_2 are computed and every
     point goes to its nearest centroid (ties -> lowest index, as numpy.argmin and scikit-learn).
  2. UPDATE     — labels fixed; each centroid moves to the mean of its assigned points,
     mu_j = (1/|C_j|) * sum_{x in C_j} x.
The inertia J = sum_i min_j ||x_i - mu_j||^2 is measured after each assignment.

Stopping rules, checked after each update:
  * "converged_labels": the assignment did not change from the previous iteration (a fixed point);
  * "converged_tol": total squared centroid movement <= tol;
  * "max_iterations".

Empty clusters (no points assigned) are re-seeded to the point farthest from its own centroid; this
is recorded in the trace. Initialization: "random" (K distinct observations) or "k-means++"
(Arthur & Vassilvitskii, 2007), with every selection step recorded. All randomness uses
numpy.random.default_rng(seed), so identical configurations give identical traces.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal

import numpy as np

InitMethod = Literal["random", "k-means++"]


class KMeansInputError(ValueError):
    pass


@dataclass
class PlusPlusStep:
    """One K-Means++ selection: D(x)^2 to the nearest already-chosen centre, probabilities, choice."""
    step: int                         # 1-based index of the centre being chosen
    chosen_index: int
    chosen_point: list[float]
    random_draw: float | None         # uniform draw in [0, 1) used for the weighted choice (None for the first centre)
    d2: list[float] | None            # D(x_i)^2 for every point (None for the first centre: uniform choice)
    probabilities: list[float] | None
    chosen_probability: float


@dataclass
class Initialization:
    method: str
    seed: int
    chosen_indices: list[int]
    centroids: list[list[float]]
    plusplus_steps: list[PlusPlusStep] = field(default_factory=list)
    explanation: str = ""


@dataclass
class Iteration:
    iteration: int                     # 1-based
    centroids_before: list[list[float]]
    distances: list[list[float]]       # n x k Euclidean distances, computed with centroids_before
    labels: list[int]                  # assignment phase result
    changed: int                       # how many points changed cluster versus the previous assignment
    inertia: float                     # sum of squared distance to the assigned centroid (before update)
    counts: list[int]
    sums: list[list[float]]            # per-cluster coordinate sums used by the mean
    centroids_after: list[list[float]] # update phase result
    movement: list[float]              # ||mu_after - mu_before|| per centroid
    total_shift_sq: float
    empty_clusters: list[int]
    reseeded: list[dict]               # [{cluster, point_index}] when an empty cluster was re-seeded
    inertia_after_update: float        # J measured with the updated centroids and the same labels


@dataclass
class KMeansTrace:
    n: int
    k: int
    features: list[str]
    points: list[list[float]]
    initialization: Initialization
    iterations: list[Iteration]
    converged: bool
    stop_reason: str
    final_labels: list[int]
    final_centroids: list[list[float]]
    final_inertia: float
    final_distances: list[list[float]]   # n x k distances to the final centroids
    max_iter: int
    tol: float

    def to_dict(self) -> dict:
        return asdict(self)


def _validate(X: np.ndarray, k: int, max_iter: int, tol: float) -> np.ndarray:
    X = np.asarray(X, dtype=float)
    if X.ndim != 2 or X.shape[0] == 0 or X.shape[1] == 0:
        raise KMeansInputError("X must be a non-empty 2-D array (n observations x d features).")
    if not np.all(np.isfinite(X)):
        raise KMeansInputError("X contains missing or infinite values.")
    if not (1 <= k <= X.shape[0]):
        raise KMeansInputError(f"k must be between 1 and the number of observations ({X.shape[0]}).")
    if not (1 <= max_iter <= 1000):
        raise KMeansInputError("max_iter must be between 1 and 1000.")
    if not (tol >= 0 and np.isfinite(tol)):
        raise KMeansInputError("tol must be a non-negative number.")
    return X


def pairwise_distances(X: np.ndarray, C: np.ndarray) -> np.ndarray:
    """Euclidean distance matrix (n x k): sqrt(sum_i (x_i - mu_i)^2)."""
    diff = X[:, None, :] - C[None, :, :]
    return np.sqrt(np.sum(diff * diff, axis=2))


def init_random(X: np.ndarray, k: int, rng: np.random.Generator) -> Initialization:
    idx = rng.choice(X.shape[0], size=k, replace=False)
    return Initialization(method="random", seed=-1, chosen_indices=[int(i) for i in idx],
                          centroids=X[idx].tolist(),
                          explanation=f"{k} distinct observations chosen uniformly at random become the initial centroids.")


def init_plusplus(X: np.ndarray, k: int, rng: np.random.Generator) -> Initialization:
    n = X.shape[0]
    first = int(rng.integers(n))
    chosen = [first]
    steps = [PlusPlusStep(step=1, chosen_index=first, chosen_point=X[first].tolist(), random_draw=None,
                          d2=None, probabilities=None, chosen_probability=1.0 / n)]
    for s in range(2, k + 1):
        C = X[chosen]
        d2 = np.min(np.sum((X[:, None, :] - C[None, :, :]) ** 2, axis=2), axis=1)
        total = float(d2.sum())
        if total == 0.0:                          # all remaining points coincide with chosen centres
            probs = np.full(n, 1.0 / n)
            mask = np.ones(n, bool)
            mask[chosen] = False
            if mask.any():
                probs = mask / mask.sum()
        else:
            probs = d2 / total
        u = float(rng.random())
        idx = int(np.searchsorted(np.cumsum(probs), u, side="right"))
        idx = min(idx, n - 1)
        chosen.append(idx)
        steps.append(PlusPlusStep(step=s, chosen_index=idx, chosen_point=X[idx].tolist(), random_draw=u,
                                  d2=d2.tolist(), probabilities=probs.tolist(), chosen_probability=float(probs[idx])))
    return Initialization(method="k-means++", seed=-1, chosen_indices=chosen, centroids=X[chosen].tolist(),
                          plusplus_steps=steps,
                          explanation="The first centre is a uniformly random observation. Each next centre is drawn with "
                                      "probability proportional to D(x)², the squared distance to the nearest centre already "
                                      "chosen, so far-away points are more likely to be picked.")


def run_kmeans(X, k: int, *, init: InitMethod = "k-means++", seed: int = 0, max_iter: int = 100, tol: float = 1e-4,
               features: list[str] | None = None, initial_centroids=None) -> KMeansTrace:
    X = _validate(X, k, max_iter, tol)
    n, d = X.shape
    rng = np.random.default_rng(seed)
    if initial_centroids is not None:
        C0 = np.asarray(initial_centroids, dtype=float)
        if C0.shape != (k, d):
            raise KMeansInputError(f"initial_centroids must have shape ({k}, {d}).")
        ini = Initialization(method="given", seed=seed, chosen_indices=[], centroids=C0.tolist(),
                             explanation="Initial centroids supplied by the caller.")
    elif init == "random":
        ini = init_random(X, k, rng)
    elif init == "k-means++":
        ini = init_plusplus(X, k, rng)
    else:
        raise KMeansInputError("init must be 'random' or 'k-means++'.")
    ini.seed = seed

    C = np.asarray(ini.centroids, dtype=float)
    prev_labels: np.ndarray | None = None
    iterations: list[Iteration] = []
    stop_reason, converged = "max_iterations", False

    for it in range(1, max_iter + 1):
        # ---- assignment phase (centroids fixed)
        D = pairwise_distances(X, C)
        labels = np.argmin(D, axis=1)
        inertia = float(np.sum(D[np.arange(n), labels] ** 2))
        changed = n if prev_labels is None else int(np.sum(labels != prev_labels))

        # ---- update phase (labels fixed)
        counts = np.bincount(labels, minlength=k)
        sums = np.zeros((k, d))
        np.add.at(sums, labels, X)
        C_new = C.copy()
        nonempty = counts > 0
        C_new[nonempty] = sums[nonempty] / counts[nonempty, None]
        empty = [int(j) for j in np.where(~nonempty)[0]]
        reseeded = []
        if empty:
            # re-seed each empty cluster to the point farthest from its assigned centroid
            far_order = np.argsort(-D[np.arange(n), labels], kind="stable")
            used = set()
            for j, p in zip(empty, (i for i in far_order if i not in used)):
                used.add(int(p))
                C_new[j] = X[p]
                reseeded.append({"cluster": j, "point_index": int(p)})
        movement = np.linalg.norm(C_new - C, axis=1)
        shift_sq = float(np.sum((C_new - C) ** 2))
        inertia_after = float(np.sum(np.sum((X - C_new[labels]) ** 2, axis=1)))

        iterations.append(Iteration(
            iteration=it, centroids_before=C.tolist(), distances=D.tolist(), labels=labels.tolist(), changed=changed,
            inertia=inertia, counts=counts.tolist(), sums=sums.tolist(), centroids_after=C_new.tolist(),
            movement=movement.tolist(), total_shift_sq=shift_sq, empty_clusters=empty, reseeded=reseeded,
            inertia_after_update=inertia_after))

        C = C_new
        if prev_labels is not None and changed == 0 and not reseeded:
            stop_reason, converged = "converged_labels", True
            break
        if shift_sq <= tol and not reseeded:
            stop_reason, converged = "converged_tol", True
            break
        prev_labels = labels

    final_D = pairwise_distances(X, C)
    final_labels = np.argmin(final_D, axis=1)
    final_inertia = float(np.sum(final_D[np.arange(n), final_labels] ** 2))
    return KMeansTrace(n=n, k=k, features=list(features or [f"x{i + 1}" for i in range(d)]), points=X.tolist(),
                       initialization=ini, iterations=iterations, converged=converged, stop_reason=stop_reason,
                       final_labels=final_labels.tolist(), final_centroids=C.tolist(), final_inertia=final_inertia,
                       final_distances=final_D.tolist(),
                       max_iter=max_iter, tol=tol)
