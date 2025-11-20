from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_map_zones_geojson_contains_core_zones():
    response = client.get("/api/v1/map/zones")
    assert response.status_code == 200

    data = response.json()
    assert data["type"] == "FeatureCollection"

    features = data.get("features", [])
    assert isinstance(features, list)
    assert len(features) >= 4

    names = {f.get("properties", {}).get("name") for f in features}
    for zone in ("Bello", "Medellin", "Envigado", "Itagui"):
        assert zone in names
