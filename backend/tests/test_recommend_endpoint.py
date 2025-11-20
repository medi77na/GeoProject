import copy

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

CRITICAL_PAYLOAD = {
    "kpis": {
        "pm25_max": 72.5,
        "pm25_avg": 58.2,
        "congestion_index": 0.88,
        "zones": [
            {"name": "Bello", "pm25": 72.5, "congestion": 0.9},
            {"name": "Medellin", "pm25": 49.0, "congestion": 0.62},
        ],
    },
    "context": {"scenario_name": "B", "wind_speed": 1.4},
}

MODERATE_PAYLOAD = {
    "kpis": {
        "pm25_max": 34.2,
        "pm25_avg": 26.0,
        "congestion_index": 0.42,
        "zones": [
            {"name": "Envigado", "pm25": 34.2, "congestion": 0.45},
            {"name": "Itagui", "pm25": 27.0, "congestion": 0.38},
        ],
    },
    "context": {"scenario_name": "A", "wind_speed": 3.4},
}


def test_recommend_endpoint_returns_critical_with_restrictive_actions():
    response = client.post("/api/v1/recommend", json=CRITICAL_PAYLOAD)
    assert response.status_code == 200

    data = response.json()
    assert data["severity"] == "critical"
    codes = {rec["code"] for rec in data["recommendations"]}
    assert any("PICO" in code or "RESTRICT" in code for code in codes)


def test_recommend_endpoint_moderate_severity():
    response = client.post("/api/v1/recommend", json=MODERATE_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert data["severity"] == "moderate"


def test_recommend_endpoint_validation_error():
    invalid_payload = {"context": {"scenario_name": "A"}}
    response = client.post("/api/v1/recommend", json=invalid_payload)
    assert response.status_code == 422


def test_recommend_endpoint_llm_commentary(monkeypatch):
    payload = copy.deepcopy(CRITICAL_PAYLOAD)
    payload["use_llm"] = True

    monkeypatch.setenv("OPENROUTER_API_KEY", "dummy")

    from backend.services import ai_client

    monkeypatch.setattr(
        ai_client,
        "get_explanation",
        lambda *, result, request: "mock-commentary",
    )

    response = client.post("/api/v1/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["llm_commentary"] == "mock-commentary"


def test_recommend_endpoint_llm_failure_is_safe(monkeypatch):
    payload = copy.deepcopy(CRITICAL_PAYLOAD)
    payload["use_llm"] = True

    monkeypatch.setenv("OPENROUTER_API_KEY", "dummy")
    from backend.services import ai_client

    def _raise(*, result, request):
        raise RuntimeError("LLM down")

    monkeypatch.setattr(ai_client, "get_explanation", _raise)

    response = client.post("/api/v1/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["llm_commentary"] is None
