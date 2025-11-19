from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    scenario: Literal["A", "B"] = "A"
    zones: Optional[List[str]] = None
    horizon: int = Field(24, gt=0)
    traffic_level: Literal["low", "medium", "high"] = "medium"
    seed: Optional[int] = None

    # Optional overrides for SimulationParams
    alpha: Optional[float] = None
    beta: Optional[float] = None
    inertia: Optional[float] = None
    dispersion_factor: Optional[float] = None


class SimulationResponse(BaseModel):
    scenario: str
    zones: List[str]
    time: List[int]
    traffic: Dict[str, List[float]]
    pollution: Dict[str, List[float]]
