from time import perf_counter

from backend.models import KNOWN_ZONES, SimulationRequest
from backend.services import generate_synthetic_data, run_simulation


def test_simulation_engine_stays_under_two_seconds():
    request = SimulationRequest(
        scenario="A",
        zones=list(KNOWN_ZONES[:3]),
        duration_minutes=180,
        time_step_minutes=5,
        traffic_level="medium",
    )
    synthetic = generate_synthetic_data(
        zones=request.resolved_zones(KNOWN_ZONES),
        horizon=request.total_steps(),
        scenario=request.scenario,
        traffic_level=request.traffic_level,
        seed=request.seed,
    )

    start = perf_counter()
    run_simulation(request=request, synthetic_data=synthetic)
    elapsed = perf_counter() - start

    assert (
        elapsed < 0.5
    ), f"Simulation should stay fast for default scenarios (elapsed={elapsed:.4f}s)"
