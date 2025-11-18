from statistics import mean

from backend.services import (
    SimulationParams,
    generate_synthetic_data,
    run_simulation,
)

ZONES = ["Bello", "Medellin"]


def _base_synthetic():
    return generate_synthetic_data(
        zones=ZONES,
        horizon=24,
        scenario="A",
        traffic_level="medium",
        seed=42,
    )


def test_simulation_shapes():
    synthetic = _base_synthetic()
    steps = 24

    result = run_simulation(synthetic_data=synthetic, steps=steps, scenario="A")

    assert len(result.time) == steps
    for zone in ZONES:
        assert len(result.traffic[zone]) == steps
        assert len(result.pollution[zone]) == steps


def test_simulation_is_deterministic():
    synthetic = _base_synthetic()
    params = SimulationParams(alpha=0.7, beta=0.3, inertia=0.4)

    r1 = run_simulation(synthetic, steps=24, scenario="A", params=params)
    r2 = run_simulation(synthetic, steps=24, scenario="A", params=params)

    assert r1.time == r2.time
    assert r1.traffic == r2.traffic
    assert r1.pollution == r2.pollution


def test_higher_alpha_increases_pollution():
    synthetic = _base_synthetic()

    low_alpha = SimulationParams(alpha=0.2, beta=0.3)
    high_alpha = SimulationParams(alpha=1.0, beta=0.3)

    sim_low = run_simulation(synthetic, steps=24, scenario="A", params=low_alpha)
    sim_high = run_simulation(synthetic, steps=24, scenario="A", params=high_alpha)

    zone = "Medellin"
    avg_low = mean(sim_low.pollution[zone])
    avg_high = mean(sim_high.pollution[zone])

    assert avg_high > avg_low


def test_scenario_a_vs_b_differs():
    synthetic = _base_synthetic()
    params = SimulationParams()

    sim_a = run_simulation(synthetic, steps=24, scenario="A", params=params)
    sim_b = run_simulation(synthetic, steps=24, scenario="B", params=params)

    zone = "Medellin"
    avg_a = mean(sim_a.traffic[zone])
    avg_b = mean(sim_b.traffic[zone])

    # In scenario B, peak-hour traffic should be lower on average.
    assert avg_b < avg_a
