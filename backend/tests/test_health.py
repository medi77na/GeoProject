import sys
import os
from fastapi.testclient import TestClient

# Add project root to the path to resolve 'backend' module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.main import app


def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert all(key in payload for key in ("status", "service", "phase"))
    assert payload["status"] == "ok"
