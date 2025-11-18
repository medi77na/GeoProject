from fastapi.testclient import TestClient

from backend.main import app


def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert all(key in payload for key in ("status", "service", "phase"))
    assert payload["status"] == "ok"
