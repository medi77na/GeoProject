from backend.models import SimulationRequest
from backend.services import (
    KPIResult,
    SimulationParams,
    SimulationResult,
    compute_kpis,
    generate_synthetic_data,
    run_simulation,
)


def test_kpis_basic_stats():
    # Simple handcrafted simulation result with known values
    time = [0, 1, 2]
    traffic = {"Zone": [0.0, 0.5, 1.0]}
    pollution = {"Zone": [10.0, 20.0, 30.0]}
    sim = SimulationResult(
        time=time,
        traffic=traffic,
        pollution=pollution,
        scenario="A",
    )

    kpis = compute_kpis(simulation=sim, congestion_threshold=0.5)

    assert isinstance(kpis, KPIResult)
    assert kpis.scenario == "A"
    assert kpis.zones == ["Zone"]

    # traffic_index = mean([0.0, 0.5, 1.0]) = 0.5
    assert abs(kpis.traffic_index["Zone"] - 0.5) < 1e-6

    # pollution_avg = mean([10, 20, 30]) = 20
    assert abs(kpis.pollution_avg["Zone"] - 20.0) < 1e-6

    # pollution_max = 30
    assert abs(kpis.pollution_max["Zone"] - 30.0) < 1e-6

    # congestion_index with threshold 0.5:
    # values >= 0.5 are [0.5, 1.0] -> 2 / 3
    assert abs(kpis.congestion_index["Zone"] - (2.0 / 3.0)) < 1e-6


def test_kpis_scenario_a_vs_b_congestion():
    zones = ["Bello", "Medellin"]
    request_a = SimulationRequest(
        scenario="A", zones=zones, traffic_level="medium", seed=123
    )
    request_b = request_a.copy(update={"scenario": "B"})
    synthetic_a = generate_synthetic_data(
        zones=zones,
        horizon=request_a.total_steps(),
        scenario=request_a.scenario,
        traffic_level=request_a.traffic_level,
        seed=request_a.seed,
    )
    synthetic_b = generate_synthetic_data(
        zones=zones,
        horizon=request_b.total_steps(),
        scenario=request_b.scenario,
        traffic_level=request_b.traffic_level,
        seed=request_b.seed,
    )

    params = SimulationParams()

    sim_a = run_simulation(
        request=request_a,
        synthetic_data=synthetic_a,
        params=params,
    )
    sim_b = run_simulation(
        request=request_b,
        synthetic_data=synthetic_b,
        params=params,
    )

    kpi_a = compute_kpis(simulation=sim_a, congestion_threshold=0.7)
    kpi_b = compute_kpis(simulation=sim_b, congestion_threshold=0.7)

    zone = "Medellin"
    # With scenario B, congestion index should be lower (due to lower peak-hour traffic)
    assert kpi_b.congestion_index[zone] < kpi_a.congestion_index[zone]


def test_kpis_invalid_threshold_raises():
    time = [0, 1]
    traffic = {"Zone": [0.1, 0.2]}
    pollution = {"Zone": [5.0, 6.0]}
    sim = SimulationResult(
        time=time,
        traffic=traffic,
        pollution=pollution,
        scenario="A",
    )

    # invalid thresholds should raise ValueError
    for threshold in (0.0, -0.1, 1.5):
        try:
            compute_kpis(simulation=sim, congestion_threshold=threshold)
            assert False, "Expected ValueError for invalid congestion_threshold"
        except ValueError:
            pass
