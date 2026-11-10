"""DS4A section 8.5 "Deep Learning" (book pp. 389–392): a real neural network on real handwritten digits.

Data: scikit-learn's bundled handwritten digits (1,797 images, 8×8 pixels, shading 0–16), a small version of the
book's Fig. 8.25. A multi-layer perceptron (64 → 32 → 16 → 10) is trained on a seeded, stratified 80 / 20 split.
- `forward` recomputes the network's layer activations from its fitted weights (ReLU hidden layers, softmax output),
  so the presentation can show what each layer does; tests check it equals `predict_proba`.
- `learning_curves` is the real counterpart of the book's conceptual Fig. 8.24.
No FastAPI imports. Deterministic (fixed seeds). Training everything takes about a minute, so the result (including
the fitted weights) is generated once into `data/deep_bundle.json` (`python -m app.ml.deep`); the API serves that file
and predicts drawn digits with `forward` on the stored weights. Tests check the file equals a fresh computation.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np
from sklearn.datasets import load_digits
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier

HIDDEN = (32, 16)
SPLIT_SEED, NET_SEED = 8, 0
CURVE_SIZES = (30, 60, 120, 250, 500, 1000, 1437)
BUNDLE_PATH = Path(__file__).parent / "data" / "deep_bundle.json"


def r4(x: float) -> float:
    return round(float(x), 4)


@lru_cache(maxsize=1)
def data():
    d = load_digits()
    X = d.data / 16.0  # shading 0–16 → 0–1
    Xtr, Xte, ytr, yte, itr, ite = train_test_split(X, d.target, np.arange(len(X)), test_size=0.2,
                                                    random_state=SPLIT_SEED, stratify=d.target)
    return Xtr, Xte, ytr, yte, ite


@lru_cache(maxsize=1)
def network() -> MLPClassifier:
    Xtr, _, ytr, _, _ = data()
    return MLPClassifier(HIDDEN, max_iter=600, random_state=NET_SEED).fit(Xtr, ytr)


def forward(coefs: list[np.ndarray], intercepts: list[np.ndarray], x: np.ndarray) -> list[np.ndarray]:
    """Activations of every layer for one input (input, hidden..., output probabilities): ReLU, then softmax."""
    acts = [x]
    a = x
    for i, (W, b) in enumerate(zip(coefs, intercepts)):
        z = a @ np.asarray(W) + np.asarray(b)
        if i < len(coefs) - 1:
            a = np.maximum(z, 0.0)
        else:
            e = np.exp(z - z.max())
            a = e / e.sum()
        acts.append(a)
    return acts


def describe(coefs, intercepts, pixels01: np.ndarray, label: int | None = None) -> dict:
    acts = forward(coefs, intercepts, pixels01)
    probs = acts[-1]
    out = {
        "pixels": [int(round(v * 16)) for v in pixels01],  # the "array of numbers" the network reads (0–16)
        "layers": [[r4(v) for v in a] for a in acts[1:-1]],
        "probabilities": [r4(v) for v in probs],
        "prediction": int(np.argmax(probs)),
    }
    if label is not None:
        out["label"] = int(label)
    return out


def learning_curves(seed: int = 0) -> list[dict]:
    """Test accuracy vs number of training images: traditional ML, a small and a large network (Fig. 8.24)."""
    Xtr, Xte, ytr, yte, _ = data()
    order = np.random.default_rng(seed).permutation(len(Xtr))
    methods = {
        "Traditional machine learning (logistic regression)": lambda: LogisticRegression(max_iter=3000),
        "Small neural network (16)": lambda: MLPClassifier((16,), max_iter=1500, random_state=NET_SEED),
        "Large neural network (128 → 64)": lambda: MLPClassifier((128, 64), max_iter=1500, random_state=NET_SEED),
    }
    out = []
    for name, make in methods.items():
        pts = []
        for n in CURVE_SIZES:
            idx = order[:n]
            pts.append({"n": n, "accuracy": r4(make().fit(Xtr[idx], ytr[idx]).score(Xte, yte))})
        out.append({"method": name, "points": pts})
    return out


def compute_bundle() -> dict:
    Xtr, Xte, ytr, yte, ite = data()
    net = network()
    W, B = net.coefs_, net.intercepts_
    pred = net.predict(Xte)
    examples = []
    for digit in range(10):
        i = next(k for k in range(len(yte)) if yte[k] == digit and pred[k] == digit)
        examples.append({**describe(W, B, Xte[i], yte[i]), "index": int(ite[i])})
    wrong = [{**describe(W, B, Xte[k], yte[k]), "index": int(ite[k])} for k in range(len(yte)) if pred[k] != yte[k]]
    sizes = [Xtr.shape[1], *HIDDEN, len(net.classes_)]
    return {
        "dataset": {"name": "scikit-learn handwritten digits", "n": int(len(Xtr) + len(Xte)), "n_train": int(len(Xtr)),
                    "n_test": int(len(Xte)), "image": [8, 8], "shading_max": 16},
        "architecture": sizes,
        "n_weights": int(sum(W.size + b.size for W, b in zip(net.coefs_, net.intercepts_))),
        "iterations": int(net.n_iter_),
        "loss_curve": [r4(v) for v in net.loss_curve_[:: max(1, len(net.loss_curve_) // 60)]],
        "train_accuracy": r4(net.score(Xtr, ytr)), "test_accuracy": r4(float((pred == yte).mean())),
        "n_wrong": len(wrong), "examples": examples, "misclassified": wrong[:8],
        "learning_curves": learning_curves(),
        "weights": {"coefs": [w.round(6).tolist() for w in W], "intercepts": [b.round(6).tolist() for b in B]},
    }


@lru_cache(maxsize=1)
def load_bundle() -> dict:
    if BUNDLE_PATH.exists():
        return json.loads(BUNDLE_PATH.read_text(encoding="utf8"))
    b = compute_bundle()
    BUNDLE_PATH.parent.mkdir(exist_ok=True)
    BUNDLE_PATH.write_text(json.dumps(b), encoding="utf8")
    return b


def public_bundle() -> dict:
    return {k: v for k, v in load_bundle().items() if k != "weights"}


def predict_pixels(pixels: list[float]) -> dict:
    """A drawn digit: 64 shading values 0–16 (row by row, 8×8)."""
    x = np.clip(np.asarray(pixels, dtype=float), 0, 16) / 16.0
    if x.shape != (64,):
        raise ValueError("expected 64 pixel values (an 8×8 image)")
    w = load_bundle()["weights"]
    return describe(w["coefs"], w["intercepts"], x)


if __name__ == "__main__":  # regenerate data/deep_bundle.json
    BUNDLE_PATH.parent.mkdir(exist_ok=True)
    BUNDLE_PATH.write_text(json.dumps(compute_bundle()), encoding="utf8")
    print("wrote", BUNDLE_PATH)
