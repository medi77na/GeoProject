import sys
import os

# Add project root to the path to resolve 'backend' module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.services import generate_synthetic_data


def test_synthetic_data_shapes():
    zones = ["Bello", "Medellin"]
    result = generate_synthetic_data(zones=zones, horizon=24, scenario="A", seed=42)

    assert len(result.time) == 24
    for zone in zones:
        assert len(result.traffic[zone]) == 24
        assert len(result.pollution[zone]) == 24


def test_synthetic_data_scenarios_different():
    zones = ["Bello", "Medellin"]
    base = generate_synthetic_data(zones=zones, horizon=24, scenario="A", seed=123)
    intervention = generate_synthetic_data(
        zones=zones, horizon=24, scenario="B", seed=123
    )

    base_avg = sum(base.traffic["Medellin"]) / len(base.traffic["Medellin"])
    intervention_avg = sum(intervention.traffic["Medellin"]) / len(
        intervention.traffic["Medellin"]
    )

    assert base_avg != intervention_avg
    assert intervention_avg < base_avg


def test_synthetic_data_reproducible_with_seed():
    params = dict(
        zones=["Bello", "Medellin", "Envigado"],
        horizon=12,
        scenario="B",
        traffic_level="low",
        seed=999,
    )
    first = generate_synthetic_data(**params)
    second = generate_synthetic_data(**params)

    assert first.time == second.time
    assert first.traffic == second.traffic
    assert first.pollution == second.pollution
