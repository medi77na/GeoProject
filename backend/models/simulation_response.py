"""Pydantic models representing simulation outputs."""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ZoneData(BaseModel):
    """Per-zone summary metrics ready for map rendering."""

    zone: str = Field(..., description="Zone identifier matching the GeoJSON name.")
    avg_pm25: float = Field(
        ..., description="Average PM2.5 during the simulation window."
    )
    traffic_rel: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Relative traffic intensity normalized across the simulated zones.",
    )


class PointData(BaseModel):
    """Representative sampled points for visualization."""

    lat: float = Field(..., description="Latitude of the sampled point.")
    lon: float = Field(..., description="Longitude of the sampled point.")
    pm25: float = Field(..., description="PM2.5 value at this location.")
    zone: str = Field(..., description="Zone associated to the point.")
    time_index: int = Field(
        ..., ge=0, description="Time index used to derive the sample."
    )


class SimulationResponse(BaseModel):
    scenario: str
    zones: List[str]
    time: List[int]
    traffic: Dict[str, List[float]]
    pollution: Dict[str, List[float]]
    zones_data: List[ZoneData] = Field(
        default_factory=list,
        description="Per-zone summary metrics ready for map rendering.",
    )
    points_data: List[PointData] = Field(
        default_factory=list,
        description="Synthetic point samples across zones with PM2.5 values.",
    )
    heatmap_data: List[List[float]] = Field(
        default_factory=list,
        description="Heatmap-friendly triplets [lat, lon, intensity] normalized to [0,1].",
    )


class SimulationCompareResponse(BaseModel):
    """Response payload aggregating two independent simulation runs."""

    result_a: SimulationResponse = Field(
        ...,
        description="Simulation output for scenario A.",
    )
    result_b: SimulationResponse = Field(
        ...,
        description="Simulation output for scenario B.",
    )
    label_a: Optional[str] = Field(
        default=None,
        description="Optional label returned for scenario A (mirrors request when provided).",
    )
    label_b: Optional[str] = Field(
        default=None,
        description="Optional label returned for scenario B (mirrors request when provided).",
    )
