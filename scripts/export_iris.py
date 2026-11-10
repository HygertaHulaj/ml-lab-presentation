r"""Export the real Iris dataset (Fisher, 1936; bundled with scikit-learn) to shared/story/iris.json.

The film's last scene turns its particles into these 150 real observations, and the Remotion render cannot call the
API, so the rows are exported once. Run: .venv\Scripts\python scripts/export_iris.py
"""
import json
from pathlib import Path

from sklearn.datasets import load_iris

d = load_iris()
out = {
    "source": "scikit-learn load_iris() — Fisher (1936) / UCI Iris",
    "features": ["sepal_length_cm", "sepal_width_cm", "petal_length_cm", "petal_width_cm"],
    "classes": [str(c) for c in d.target_names],
    "observations": [[round(float(v), 2) for v in row] for row in d.data],
    "labels": [int(t) for t in d.target],
}
p = Path(__file__).resolve().parents[1] / "shared" / "story" / "iris.json"
p.write_text(json.dumps(out, separators=(",", ":")))
print(f"wrote {p} ({len(out['observations'])} rows)")
