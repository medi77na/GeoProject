from dataclasses import dataclass
from typing import Dict, List, Optional

from .synthetic_data import SyntheticDataResult


@dataclass
class SimulationParams:
    alpha: float = 0.6  # emission factor: how strongly traffic increases pollution
    beta: float = 0.3  # dispersion factor: how strongly pollution decays
    inertia: float = 0.5  # how much the previous traffic state influences the new one
    dispersion_factor: float = 1.0  # base dispersion term in pollution update


@dataclass
class SimulationResult:
    time: List[int]
    traffic: Dict[str, List[float]]
    pollution: Dict[str, List[float]]
    scenario: str


def run_simulation(
    synthetic_data: SyntheticDataResult,
    steps: Optional[int] = None,
    scenario: str = "A",
    params: Optional[SimulationParams] = None,
) -> SimulationResult:
    """
    Run a simple discrete-time simulation of traffic and pollution per zone.

    Args:
        synthetic_data: base synthetic series (rho and C) per zone.
        steps: number of simulation steps. If None, uses len(synthetic_data.time).
        scenario: "A" for baseline, "B" for an intervention with reduced traffic in peak hours.
        params: simulation parameters; default values are reasonable for Phase 1.

    Returns:
        SimulationResult with time, simulated traffic and pollution, and scenario label.
    """
    if scenario not in {"A", "B"}:
        raise ValueError('scenario must be "A" or "B"')

    if params is None:
        params = SimulationParams()

    if steps is None:
        steps = len(synthetic_data.time)

    if steps <= 0:
        raise ValueError("steps must be positive")

    time = list(range(steps))
    sim_traffic: Dict[str, List[float]] = {}
    sim_pollution: Dict[str, List[float]] = {}

    for zone, base_traffic_series in synthetic_data.traffic.items():
        if zone not in synthetic_data.pollution:
            raise ValueError(f"Zone {zone!r} missing in pollution series")

        base_pollution_series = synthetic_data.pollution[zone]
        if len(base_traffic_series) == 0 or len(base_pollution_series) == 0:
            raise ValueError(f"Empty series for zone {zone!r}")

        rho_prev = float(base_traffic_series[0])
        c_prev = float(base_pollution_series[0])

        zone_traffic: List[float] = []
        zone_pollution: List[float] = []

        for t in time:
            base_idx = min(t, len(base_traffic_series) - 1)
            base_rho = float(base_traffic_series[base_idx])

            # Scenario B reduces traffic during typical peak hours.
            if scenario == "B" and (6 <= t <= 9 or 17 <= t <= 20):
                base_rho *= 0.8

            # Discrete update for traffic: mix previous state and base value.
            rho_t = (1.0 - params.inertia) * base_rho + params.inertia * rho_prev
            rho_t = max(0.0, min(1.0, rho_t))

            # Discrete update for pollution.
            c_t = c_prev + params.alpha * rho_t - params.beta * params.dispersion_factor
            c_t = max(0.0, c_t)

            zone_traffic.append(float(rho_t))
            zone_pollution.append(float(c_t))

            rho_prev = rho_t
            c_prev = c_t

        sim_traffic[zone] = zone_traffic
        sim_pollution[zone] = zone_pollution

    return SimulationResult(
        time=time, traffic=sim_traffic, pollution=sim_pollution, scenario=scenario
    )
