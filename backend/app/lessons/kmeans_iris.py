"""Lesson manifest: K-Means clustering on Iris.

Narration strings may contain placeholders ({k}, {n}, {inertia}, {init_sentence}, {stop_sentence}) that the
frontend fills from the actual simulation trace — the manifest never hard-codes computed results.
"""

LESSON = {
    "id": "kmeans-iris",
    "version": 1,
    "title": "K-Means: discovering groups in Iris flowers",
    "algorithm": "kmeans",
    "summary": "Watch K-Means find clusters in 150 real Iris flowers without ever seeing their species.",
    "objectives": [
        "Explain how measurements become coordinates in feature space.",
        "Describe unsupervised learning and the clustering problem.",
        "Compute a Euclidean distance and assign a point to its nearest centroid.",
        "Compute a centroid update as the mean of its assigned points.",
        "Explain convergence, inertia, and why the result is not guaranteed to be the global optimum.",
        "Compare clusters with known species and explain why they differ.",
    ],
    "dataset": {"id": "iris", "source": "Fisher (1936), UCI; bundled with scikit-learn (load_iris)", "n": 150,
                "features": ["sepal_length_cm", "sepal_width_cm", "petal_length_cm", "petal_width_cm"],
                "comparison_label": "species"},
    "default_config": {"dataset": "iris", "features": ["sepal_length_cm", "sepal_width_cm"], "k": 3,
                       "init": "k-means++", "seed": 7, "max_iter": 50, "tol": 1e-6},
    "scenes": [
        {"id": "enter", "title": "Enter the dataset", "narration": [
            "This is a garden of {n} real Iris flowers.",
            "Every flower is one observation — one row of the dataset.",
            "For each flower, a botanist measured its sepals and petals in centimetres. These numbers are its features.",
            "If we use two features as coordinates, every flower becomes a point. Its position is its measurements.",
        ]},
        {"id": "problem", "title": "The problem", "narration": [
            "Now we hide the species. The computer only sees positions.",
            "Can a computer discover groups in data without knowing the correct answers? That is unsupervised learning.",
            "Some regions are dense, others sparse — but the groups are not perfectly separated.",
        ]},
        {"id": "init", "title": "Initialize centroids", "narration": [
            "We choose K = {k}: the number of groups to look for. K-Means cannot choose it for us.",
            "Each group is represented by a centroid — a point that will move to the centre of its group.",
            "{init_sentence}",
        ]},
        {"id": "distance", "title": "Distance calculation", "narration": [
            "Take one flower. How far is it from each centroid?",
            "Subtract the coordinates, square the differences, add them up, take the square root.",
            "The nearest centroid wins: the flower joins that cluster.",
            "The same rule assigns every other flower.",
        ]},
        {"id": "update", "title": "Update centroids", "narration": [
            "Each centroid now moves to the mean position of the flowers assigned to it.",
            "Add their coordinates, divide by how many there are — that is the new centroid.",
        ]},
        {"id": "iterate", "title": "Iterate until convergence", "narration": [
            "Assign again, update again. Each round the total squared distance — the inertia — can only stay the same or drop.",
            "{stop_sentence}",
            "Converged does not mean best possible: another start could end in a different, even better, solution.",
        ]},
        {"id": "results", "title": "Results and comparison", "narration": [
            "These are the {k} clusters K-Means found, with inertia {inertia}.",
            "Now we reveal the real species — information the algorithm never used.",
            "Clusters and species overlap, but not perfectly: in these two features, two of the species occupy overlapping regions.",
            "Your turn: change K, the features, the initialization or the seed, and explore.",
        ]},
    ],
    "math": {
        "distance": {"formula": "d(x, μⱼ) = √( Σᵢ (xᵢ − μⱼᵢ)² )",
                     "symbols": {"x": "one observation (a flower)", "μⱼ": "centroid j", "i": "feature index"}},
        "assignment": {"formula": "cluster(x) = argminⱼ d(x, μⱼ)"},
        "update": {"formula": "μⱼ = (1 / |Cⱼ|) Σ_{x ∈ Cⱼ} x",
                   "symbols": {"Cⱼ": "set of points assigned to cluster j", "|Cⱼ|": "number of points in it"}},
        "inertia": {"formula": "J = Σⱼ Σ_{x ∈ Cⱼ} ‖x − μⱼ‖²"},
        "kmeanspp": {"formula": "P(xᵢ) = D(xᵢ)² / Σₗ D(xₗ)²",
                     "symbols": {"D(x)": "distance from x to the nearest centre already chosen"}},
        "code": "backend/app/ml/kmeans.py",
    },
    "controls": {"k": {"min": 1, "max": 10}, "features": "any two of the four", "init": ["k-means++", "random"],
                 "seed": {"min": 0, "max": 9999}, "max_iter": {"min": 1, "max": 300}},
    "exercises": [
        {"prompt": "Run K = 2, 3 and 4 with the same seed. How does the final inertia change? Why does more K always lower it?",
         "kind": "explore"},
        {"prompt": "Switch to petal length × petal width. Do the clusters match the species better? Why?", "kind": "explore"},
        {"prompt": "With random initialization, try seeds 0–5. Do all runs converge to the same clusters?", "kind": "explore"},
    ],
    "assessment": [
        {"question": "Does K-Means use the species labels to form clusters?", "answer": "No — it is unsupervised; labels are only used afterwards to compare."},
        {"question": "What does the update step compute?", "answer": "The mean of the points assigned to each centroid."},
        {"question": "Does convergence guarantee the lowest possible inertia?", "answer": "No — only a local optimum that depends on the initialization."},
    ],
}
