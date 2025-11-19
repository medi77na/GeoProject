from dataclasses import dataclass
from statistics import mean
from typing import Dict, List

from .simulation_engine import SimulationResult


@dataclass
class KPIResult:
    scenario: str
    zones: List[str]
    traffic_index: Dict[str, float]
    pollution_avg: Dict[str, float]
    pollution_max: Dict[str, float]
    congestion_index: Dict[str, float]


def compute_kpis(
    simulation: SimulationResult,
    congestion_threshold: float = 0.7,
) -> KPIResult:
    """
    Compute simple KPIs per zone from a SimulationResult.

    KPIs:
        - traffic_index: temporal average of traffic (rho) per zone, in [0, 1].
        - pollution_avg: temporal average of pollution C(t) per zone.
        - pollution_max: maximum pollution C(t) per zone.
        - congestion_index: fraction of time steps with traffic >= congestion_threshold.

    Args:
        simulation: SimulationResult produced by the simulation engine.
        congestion_threshold: threshold in [0, 1] used to count "congested" time steps.

    Returns:
        KPIResult with scenario, zones and per-zone KPI dictionaries.
    """

    if congestion_threshold <= 0.0 or congestion_threshold > 1.0:
        raise ValueError("congestion_threshold must be in (0, 1].")

    zones = sorted(simulation.traffic.keys())
    traffic_index: Dict[str, float] = {}
    pollution_avg: Dict[str, float] = {}
    pollution_max: Dict[str, float] = {}
    congestion_idx: Dict[str, float] = {}

    for zone in zones:
        if zone not in simulation.pollution:
            raise ValueError(f"Zone {zone!r} missing in pollution data")

        t_series = simulation.traffic[zone]
        c_series = simulation.pollution[zone]

        if len(t_series) == 0 or len(c_series) == 0:
            raise ValueError(f"Empty time series for zone {zone!r}")

        if len(t_series) != len(c_series):
            raise ValueError(f"Inconsistent lengths for zone {zone!r}")

        traffic_avg = float(mean(t_series))
        poll_avg = float(mean(c_series))
        poll_max = float(max(c_series))

        congested_steps = sum(1 for v in t_series if v >= congestion_threshold)
        congestion = float(congested_steps) / float(len(t_series))

        traffic_index[zone] = traffic_avg
        pollution_avg[zone] = poll_avg
        pollution_max[zone] = poll_max
        congestion_idx[zone] = congestion

    return KPIResult(
        scenario=simulation.scenario,
        zones=zones,
        traffic_index=traffic_index,
        pollution_avg=pollution_avg,
        pollution_max=pollution_max,
        congestion_index=congestion_idx,
    )
