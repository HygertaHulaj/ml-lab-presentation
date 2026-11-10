import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

_tmp = Path(tempfile.mkdtemp(prefix="mllab_test_"))
os.environ["MLLAB_DATABASE_URL"] = f"sqlite+aiosqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ["MLLAB_AUTO_CREATE_TABLES"] = "true"
os.environ["MLLAB_STORAGE_DIR"] = str(_tmp / "storage")


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        yield c
