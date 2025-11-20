"""Public service exports used by API routers and tests."""

from .ai_client import get_explanation
from .kpi_engine import compute_kpis
from .map_layers import derive_map_ready_layers, get_zones_geojson
from .recommendation_service import build_recommendation_response
from .rules_engine import generate_recommendations
from .simulation_engine import (
    SimulationParams,
    SimulationResult,
    SyntheticDataResult,
    compare_simulations,
    execute_simulation,
    generate_synthetic_data,
    run_simulation,
)

__all__ = [
    "compute_kpis",
    "SimulationParams",
    "SimulationResult",
    "SyntheticDataResult",
    "run_simulation",
    "generate_synthetic_data",
    "execute_simulation",
    "compare_simulations",
    "get_zones_geojson",
    "derive_map_ready_layers",
    "generate_recommendations",
    "build_recommendation_response",
    "get_explanation",
]
