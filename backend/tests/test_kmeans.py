"""K-Means trace engine: validated against scikit-learn and independently computed reference values."""
import numpy as np
import pytest
from sklearn.cluster import KMeans

from app.datasets_registry import load_builtin
from app.ml.kmeans import KMeansInputError, pairwise_distances, run_kmeans

IRIS = load_builtin("iris")
FEATS = ["sepal_length_cm", "sepal_width_cm"]
X2 = IRIS[FEATS].to_numpy(float)
X4 = IRIS[[c for c in IRIS.columns if c != "species"]].to_numpy(float)


@pytest.mark.parametrize("X,k,init,seed", [(X2, 3, "k-means++", 7), (X2, 3, "random", 0), (X4, 3, "k-means++", 1),
                                           (X2, 5, "random", 3), (X4, 2, "random", 11)])
def test_matches_sklearn_from_same_initial_centroids(X, k, init, seed):
    t = run_kmeans(X, k, init=init, seed=seed, max_iter=300, tol=0.0)
    C0 = np.array(t.initialization.centroids)
    sk = KMeans(n_clusters=k, init=C0, n_init=1, algorithm="lloyd", max_iter=300, tol=0.0).fit(X)
    assert t.converged
    assert np.allclose(t.final_centroids, sk.cluster_centers_, atol=1e-9)
    assert np.array_equal(t.final_labels, sk.labels_)
    assert t.final_inertia == pytest.approx(sk.inertia_, rel=1e-9)


def test_distances_inertia_and_means_are_exact():
    t = run_kmeans(X2, 3, seed=7, max_iter=300, tol=0.0)
    for it in t.iterations:
        C = np.array(it.centroids_before)
        D = np.linalg.norm(X2[:, None, :] - C[None, :, :], axis=2)
        assert np.allclose(it.distances, D)
        assert it.labels == D.argmin(axis=1).tolist()
        assert it.inertia == pytest.approx(float(np.sum(D.min(axis=1) ** 2)))
        labels = np.array(it.labels)
        for j in range(3):
            pts = X2[labels == j]
            assert it.counts[j] == len(pts)
            assert np.allclose(it.sums[j], pts.sum(axis=0))
            assert np.allclose(it.centroids_after[j], pts.mean(axis=0))
        assert np.allclose(it.movement, np.linalg.norm(np.array(it.centroids_after) - C, axis=1))


def test_phases_are_consistent_across_iterations():
    t = run_kmeans(X2, 3, seed=7, max_iter=300, tol=0.0)
    for a, b in zip(t.iterations, t.iterations[1:]):
        assert b.centroids_before == a.centroids_after         # the update of i is the start of i+1
        assert b.inertia <= a.inertia + 1e-9                   # Lloyd never increases inertia
        assert a.inertia_after_update <= a.inertia + 1e-9      # an update never increases J for fixed labels
    assert t.stop_reason == "converged_labels"
    assert t.iterations[-1].changed == 0


def test_deterministic_for_same_seed_and_different_for_other_seeds():
    a = run_kmeans(X2, 3, init="random", seed=5).to_dict()
    b = run_kmeans(X2, 3, init="random", seed=5).to_dict()
    c = run_kmeans(X2, 3, init="random", seed=6).to_dict()
    assert a == b
    assert a["initialization"]["chosen_indices"] != c["initialization"]["chosen_indices"]


def test_kmeanspp_trace_records_real_selection():
    t = run_kmeans(X2, 4, init="k-means++", seed=7)
    steps = t.initialization.plusplus_steps
    assert len(steps) == 4 and steps[0].probabilities is None
    for s in steps[1:]:
        p = np.array(s.probabilities)
        assert p.sum() == pytest.approx(1.0)
        chosen_so_far = t.initialization.chosen_indices[: s.step - 1]
        d2 = np.min(np.sum((X2[:, None] - X2[chosen_so_far][None]) ** 2, axis=2), axis=1)
        assert np.allclose(s.d2, d2)
        assert s.chosen_probability == pytest.approx(p[s.chosen_index])
        # the recorded uniform draw reproduces the choice through the cumulative distribution
        assert s.chosen_index == min(int(np.searchsorted(np.cumsum(p), s.random_draw, side="right")), len(p) - 1)
        assert s.chosen_point == X2[s.chosen_index].tolist()


def test_tolerance_stop_and_max_iterations():
    t = run_kmeans(X2, 3, seed=7, max_iter=1, tol=0.0)
    assert t.stop_reason == "max_iterations" and not t.converged and len(t.iterations) == 1
    t = run_kmeans(X2, 3, seed=7, max_iter=100, tol=1e6)
    assert t.stop_reason == "converged_tol" and len(t.iterations) == 1


def test_empty_cluster_is_reseeded_and_recorded():
    X = np.array([[0.0, 0], [0.1, 0], [10, 10], [10.1, 10]])
    far = [[100.0, 100.0], [0.05, 0.0], [10.05, 10.0]]     # centroid 0 attracts no points
    t = run_kmeans(X, 3, initial_centroids=far, max_iter=10, tol=0.0)
    first = t.iterations[0]
    assert first.empty_clusters == [0]
    assert first.reseeded and first.reseeded[0]["cluster"] == 0
    assert first.centroids_after[0] == X[first.reseeded[0]["point_index"]].tolist()


def test_edge_cases():
    t = run_kmeans(X2, 1, seed=0)
    assert np.allclose(t.final_centroids[0], X2.mean(axis=0))
    dup = np.array([[1.0, 1.0]] * 5 + [[2.0, 2.0]] * 5)
    t = run_kmeans(dup, 2, init="k-means++", seed=0)
    assert sorted(map(tuple, np.round(t.final_centroids, 6))) == [(1.0, 1.0), (2.0, 2.0)]
    t = run_kmeans(np.eye(3), 3, init="random", seed=0)
    assert t.final_inertia == pytest.approx(0.0)
    for bad in [dict(k=0), dict(k=151), dict(k=3, max_iter=0), dict(k=3, tol=-1)]:
        with pytest.raises(KMeansInputError):
            run_kmeans(X2, **bad)
    with pytest.raises(KMeansInputError):
        run_kmeans(np.array([[1.0, np.nan], [2.0, 3.0]]), 1)


def test_pairwise_distance_formula():
    X = np.array([[5.1, 3.5]])
    C = np.array([[5.0, 3.4], [6.0, 2.9]])
    d = pairwise_distances(X, C)[0]
    assert d[0] == pytest.approx(np.sqrt(0.1 ** 2 + 0.1 ** 2))
    assert d[1] == pytest.approx(np.sqrt(0.9 ** 2 + 0.6 ** 2))


def test_final_distances_match_final_centroids():
    t = run_kmeans(X2, 3, seed=4, max_iter=2, tol=0.0)
    D = np.linalg.norm(X2[:, None] - np.array(t.final_centroids)[None], axis=2)
    assert np.allclose(t.final_distances, D)
    assert t.final_labels == D.argmin(axis=1).tolist()
