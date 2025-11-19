from statistics import mean

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_simulate_default_ok():
    response = client.post("/api/v1/simulate", json={"scenario": "A"})
    assert response.status_code == 200

    data = response.json()
    assert data["scenario"] == "A"

    zones = data["zones"]
    assert isinstance(zones, list)
    assert len(zones) > 0

    time = data["time"]
    assert isinstance(time, list)
    assert len(time) > 0

    traffic = data["traffic"]
    pollution = data["pollution"]

    for z in zones:
        assert z in traffic
        assert z in pollution
        assert len(traffic[z]) == len(time)
        assert len(pollution[z]) == len(time)


def test_simulate_invalid_horizon():
    response = client.post(
        "/api/v1/simulate",
        json={"scenario": "A", "horizon": 0},
    )
    assert response.status_code in (400, 422)


def test_simulate_scenario_a_vs_b_differs():
    payload_common = {
        "zones": ["Bello", "Medellin"],
        "horizon": 24,
        "traffic_level": "medium",
        "seed": 123,
    }

    resp_a = client.post(
        "/api/v1/simulate",
        json={**payload_common, "scenario": "A"},
    )
    resp_b = client.post(
        "/api/v1/simulate",
        json={**payload_common, "scenario": "B"},
    )

    assert resp_a.status_code == 200
    assert resp_b.status_code == 200

    data_a = resp_a.json()
    data_b = resp_b.json()

    zone = "Medellin"
    avg_a = mean(data_a["traffic"][zone])
    avg_b = mean(data_b["traffic"][zone])

    assert avg_b < avg_a
