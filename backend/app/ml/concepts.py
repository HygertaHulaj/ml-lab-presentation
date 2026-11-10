"""Small, transparent learners used by the presentation's concept demos (no FastAPI imports).

`threshold_scan` learns a one-feature rule ("predict class B if x >= t") from labelled examples, recording every
candidate threshold it tries. This is a decision stump selected by training accuracy: the same idea as a depth-1
decision tree (DS4A §8.3), shown here as "a rule learned from examples" in contrast to a rule written by a person.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Candidate:
    threshold: float
    train_accuracy: float
    correct: int


def rule_accuracy(x: np.ndarray, y_positive: np.ndarray, threshold: float) -> tuple[float, int]:
    """Accuracy of the rule `positive if x >= threshold`."""
    pred = x >= threshold
    correct = int((pred == y_positive).sum())
    return correct / len(x), correct


def threshold_scan(x: np.ndarray, y_positive: np.ndarray) -> tuple[list[Candidate], Candidate]:
    """Try every midpoint between consecutive distinct values; return all candidates and the best one.

    Ties are resolved by the first (smallest) threshold, so the result is deterministic.
    """
    if len(x) != len(y_positive) or len(x) < 2:
        raise ValueError("x and y must have the same length (at least 2)")
    vals = np.unique(x)
    mids = (vals[:-1] + vals[1:]) / 2
    cands: list[Candidate] = []
    for t in mids:
        acc, correct = rule_accuracy(x, y_positive, float(t))
        cands.append(Candidate(round(float(t), 4), acc, correct))
    best = max(cands, key=lambda c: (c.correct, -c.threshold))
    return cands, best


def train_test_indices(n: int, labels: np.ndarray, test_fraction: float, seed: int) -> tuple[np.ndarray, np.ndarray]:
    """Stratified, seeded split (reproducible)."""
    rng = np.random.default_rng(seed)
    test: list[int] = []
    for c in np.unique(labels):
        idx = np.flatnonzero(labels == c)
        rng.shuffle(idx)
        test.extend(idx[: int(round(len(idx) * test_fraction))].tolist())
    test_idx = np.array(sorted(test))
    train_idx = np.setdiff1d(np.arange(n), test_idx)
    return train_idx, test_idx
