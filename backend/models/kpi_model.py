"""Data structures representing KPI aggregations derived from simulations."""

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class KPIResult:
    """Container for KPI summaries computed from simulation outputs."""

    scenario: str
    zones: List[str]
    traffic_index: Dict[str, float]
    pollution_avg: Dict[str, float]
    pollution_max: Dict[str, float]
    congestion_index: Dict[str, float]
