from statistics import mean

from backend.models import SimulationRequest
from backend.services import SimulationParams, generate_synthetic_data, run_simulation

ZONES = ["Bello", "Medellin"]


def _build_request(**overrides) -> SimulationRequest:
    base_payload = {
        "scenario": "A",
        "zones": ZONES,
        "traffic_level": "medium",
        "seed": 42,
    }
    base_payload.update(overrides)
    return SimulationRequest(**base_payload)


def _base_synthetic(request: SimulationRequest):
    return generate_synthetic_data(
        zones=request.zones or ZONES,
        horizon=request.total_steps(),
        scenario=request.scenario,
        traffic_level=request.traffic_level,
        seed=request.seed,
    )


def test_simulation_shapes():
    request = _build_request()
    synthetic = _base_synthetic(request)
    steps = request.total_steps()

    result = run_simulation(request=request, synthetic_data=synthetic)

    assert len(result.time) == steps
    for zone in ZONES:
        assert len(result.traffic[zone]) == steps
        assert len(result.pollution[zone]) == steps


def test_simulation_is_deterministic():
    request = _build_request()
    synthetic = _base_synthetic(request)
    params = SimulationParams(alpha=0.7, beta=0.3, inertia=0.4)

    r1 = run_simulation(request=request, synthetic_data=synthetic, params=params)
    r2 = run_simulation(request=request, synthetic_data=synthetic, params=params)

    assert r1.time == r2.time
    assert r1.traffic == r2.traffic
    assert r1.pollution == r2.pollution


def test_higher_alpha_increases_pollution():
    request = _build_request()
    synthetic = _base_synthetic(request)

    low_alpha = SimulationParams(alpha=0.2, beta=0.3)
    high_alpha = SimulationParams(alpha=1.0, beta=0.3)

    sim_low = run_simulation(
        request=request, synthetic_data=synthetic, params=low_alpha
    )
    sim_high = run_simulation(
        request=request, synthetic_data=synthetic, params=high_alpha
    )

    zone = "Medellin"
    avg_low = mean(sim_low.pollution[zone])
    avg_high = mean(sim_high.pollution[zone])

    assert avg_high > avg_low


def test_scenario_a_vs_b_differs():
    request_a = _build_request(scenario="A")
    request_b = _build_request(scenario="B")
    synthetic_a = _base_synthetic(request_a)
    synthetic_b = _base_synthetic(request_b)
    params = SimulationParams()

    sim_a = run_simulation(request=request_a, synthetic_data=synthetic_a, params=params)
    sim_b = run_simulation(request=request_b, synthetic_data=synthetic_b, params=params)

    zone = "Medellin"
    avg_a = mean(sim_a.traffic[zone])
    avg_b = mean(sim_b.traffic[zone])

    # In scenario B, peak-hour traffic should be lower on average.
    assert avg_b < avg_a
