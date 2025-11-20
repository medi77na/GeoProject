import re
from math import ceil
from typing import Dict, List, Literal, Optional, Sequence, Tuple, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


DEFAULT_TIME_STEP_MINUTES = 60
DEFAULT_DURATION_MINUTES = 24 * DEFAULT_TIME_STEP_MINUTES
DEFAULT_TRAFFIC_BASE_LEVEL = 0.6
DEFAULT_PEAK_HOURS = ("07:00-09:00", "17:00-19:00")
DEFAULT_HEAVY_VEHICLE_PERCENTAGE = 0.12
DEFAULT_INCIDENT_FACTOR = 1.0
DEFAULT_WIND_SPEED = 5.0
DEFAULT_WIND_DIRECTION: Union[str, float] = "N"
DEFAULT_ENV_DISPERSION_FACTOR = 1.0
DEFAULT_TEMPERATURE = 22.0
DEFAULT_HUMIDITY = 0.65
DEFAULT_PICO_PLACA_ENABLED = False
DEFAULT_PICO_PLACA_RESTRICTION_FACTOR = 0.85
DEFAULT_CARGO_RESTRICTION_ENABLED = False
DEFAULT_SPEED_LIMIT_FACTOR = 1.0

KNOWN_ZONES: Tuple[str, ...] = ("Bello", "Medellin", "Envigado", "Itagui")
PEAK_WINDOW_PATTERN = re.compile(
    r"^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$"
)
TIME_OF_DAY_PATTERN = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")


def _time_label_to_minutes(label: str) -> int:
    hours, minutes = label.split(":")
    return int(hours) * 60 + int(minutes)


class SimulationRequest(BaseModel):
    """Incoming payload used by /simulate."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "scenario": "A",
                    "zones": ["Medellin"],
                    "traffic_level": "medium",
                },
                {
                    "scenario": "B",
                    "zones_enabled": ["Bello", "Envigado"],
                    "duration_minutes": 180,
                    "time_step_minutes": 10,
                    "traffic_level": "high",
                    "traffic_base_level": 0.7,
                    "peak_hours": ["06:30-09:30", "16:00-20:00"],
                    "traffic_variation_by_hour": {"07:00": 1.3, "18:00": 1.25},
                    "heavy_vehicle_percentage": 0.18,
                    "incident_factor": 1.1,
                    "wind_speed": 8.0,
                    "wind_direction": "SW",
                    "dispersion_factor": 1.2,
                    "temperature": 28.0,
                    "humidity": 0.7,
                    "pico_placa_enabled": True,
                    "pico_placa_restriction_factor": 0.8,
                    "cargo_restriction_enabled": True,
                    "speed_limit_factor": 0.9,
                },
            ]
        }
    )

    scenario: Literal["A", "B"] = Field(
        default="A",
        description="Scenario toggle between baseline (A) and mitigation (B).",
        examples=["A"],
    )
    zones: Optional[List[str]] = Field(
        default=None,
        description="Explicit list of zones to simulate (Phase 1 behavior).",
        examples=[["Bello", "Medellin"]],
    )
    zones_enabled: Optional[List[str]] = Field(
        default=None,
        description="Subset of known zones enabled via the configuration UI.",
        examples=[["Bello", "Envigado"]],
    )
    horizon: Optional[int] = Field(
        default=None,
        gt=0,
        description="Override number of simulation steps (takes precedence over time window).",
        examples=[24],
    )
    duration_minutes: int = Field(
        default=DEFAULT_DURATION_MINUTES,
        gt=0,
        description="Duration of the simulation window in minutes.",
        examples=[180],
    )
    time_step_minutes: int = Field(
        default=DEFAULT_TIME_STEP_MINUTES,
        gt=0,
        description="Size of each simulation step in minutes.",
        examples=[5],
    )
    traffic_level: Literal["low", "medium", "high"] = Field(
        default="medium",
        description="Baseline demand profile used when no advanced traffic overrides are provided.",
    )
    seed: Optional[int] = Field(
        default=None,
        description="Optional seed to keep stochastic components reproducible.",
    )

    # Optional overrides for SimulationParams
    alpha: Optional[float] = Field(
        default=None,
        description="Optional congestion responsiveness parameter override.",
        examples=[0.7],
    )
    beta: Optional[float] = Field(
        default=None,
        description="Optional traffic dissipation parameter override.",
        examples=[0.2],
    )
    inertia: Optional[float] = Field(
        default=None,
        description="Optional smoothing parameter override for traffic time series.",
        examples=[0.4],
    )
    dispersion_factor: float = Field(
        default=DEFAULT_ENV_DISPERSION_FACTOR,
        gt=0.0,
        description="Base pollution dispersion factor applied across time.",
        examples=[1.15],
    )

    # Advanced Phase 2 parameters
    traffic_base_level: float = Field(
        default=DEFAULT_TRAFFIC_BASE_LEVEL,
        ge=0.0,
        le=1.0,
        description="Normalized base traffic level before modifiers.",
        examples=[0.65],
    )
    peak_hours: List[str] = Field(
        default_factory=lambda: list(DEFAULT_PEAK_HOURS),
        description="List of HH:MM-HH:MM windows that intensify demand.",
    )
    traffic_variation_by_hour: Dict[str, float] = Field(
        default_factory=dict,
        description="Mapping of HH:MM entries to multiplicative traffic factors (> 0).",
        examples=[{"07:00": 1.3, "18:00": 1.15}],
    )
    heavy_vehicle_percentage: float = Field(
        default=DEFAULT_HEAVY_VEHICLE_PERCENTAGE,
        ge=0.0,
        le=1.0,
        description="Share of heavy vehicles in the fleet (0 to 1).",
    )
    incident_factor: float = Field(
        default=DEFAULT_INCIDENT_FACTOR,
        ge=0.0,
        description="Multiplier applied to congestion when an incident occurs.",
    )
    wind_speed: float = Field(
        default=DEFAULT_WIND_SPEED,
        ge=0.0,
        description="Wind speed in meters per second influencing dispersion.",
        examples=[5.5],
    )
    wind_direction: Union[str, float, None] = Field(
        default=DEFAULT_WIND_DIRECTION,
        description="Wind direction either as cardinal (N, SW) or degrees (0-360).",
        examples=["NE"],
    )
    temperature: float = Field(
        default=DEFAULT_TEMPERATURE,
        description="Ambient temperature in Celsius.",
        examples=[26.0],
    )
    humidity: float = Field(
        default=DEFAULT_HUMIDITY,
        ge=0.0,
        le=1.0,
        description="Relative humidity (0 to 1).",
        examples=[0.65],
    )
    pico_placa_enabled: bool = Field(
        default=DEFAULT_PICO_PLACA_ENABLED,
        description="Whether pico y placa restrictions are enforced.",
    )
    pico_placa_restriction_factor: float = Field(
        default=DEFAULT_PICO_PLACA_RESTRICTION_FACTOR,
        gt=0.0,
        le=1.0,
        description="Reduction applied to traffic when pico y placa is active.",
    )
    cargo_restriction_enabled: bool = Field(
        default=DEFAULT_CARGO_RESTRICTION_ENABLED,
        description="Toggle for cargo restriction policies.",
    )
    speed_limit_factor: float = Field(
        default=DEFAULT_SPEED_LIMIT_FACTOR,
        gt=0.0,
        description="Multiplier applied to nominal speed limits.",
        examples=[0.9],
    )

    @field_validator("peak_hours")
    @classmethod
    def validate_peak_hours(cls, value: List[str]) -> List[str]:
        for window in value:
            if not PEAK_WINDOW_PATTERN.match(window):
                raise ValueError(
                    "Each entry in peak_hours must follow HH:MM-HH:MM using 24h time."
                )
            start, end = window.split("-")
            if _time_label_to_minutes(start) >= _time_label_to_minutes(end):
                raise ValueError("peak_hours ranges must have a start earlier than the end.")
        return value

    @field_validator("traffic_variation_by_hour")
    @classmethod
    def validate_variation(cls, value: Dict[str, float]) -> Dict[str, float]:
        for label, factor in value.items():
            if not TIME_OF_DAY_PATTERN.match(label):
                raise ValueError(
                    "traffic_variation_by_hour keys must follow HH:MM using 24h time."
                )
            if factor <= 0.0:
                raise ValueError("traffic_variation_by_hour values must be > 0.")
        return value

    @field_validator("wind_direction")
    @classmethod
    def validate_wind_direction(
        cls, value: Union[str, float, None]
    ) -> Union[str, float, None]:
        if value is None:
            return value
        if isinstance(value, (int, float)):
            numeric = float(value)
            if not 0.0 <= numeric <= 360.0:
                raise ValueError("wind_direction in degrees must be between 0 and 360.")
            return numeric
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("wind_direction string cannot be empty.")
        return cleaned

    @field_validator("zones_enabled")
    @classmethod
    def validate_zones_enabled(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return value
        unknown = sorted({zone for zone in value if zone not in KNOWN_ZONES})
        if unknown:
            raise ValueError(
                f"zones_enabled contains unknown zones: {', '.join(unknown)}. "
                f"Allowed zones: {', '.join(KNOWN_ZONES)}."
            )
        return value

    @model_validator(mode="after")
    def validate_time_config(self) -> "SimulationRequest":
        if self.duration_minutes and self.time_step_minutes:
            if self.time_step_minutes >= self.duration_minutes:
                raise ValueError("time_step_minutes must be smaller than duration_minutes.")
        return self

    def total_steps(self) -> int:
        if self.horizon:
            return self.horizon
        return max(1, ceil(self.duration_minutes / self.time_step_minutes))

    def resolved_zones(self, fallback: Sequence[str]) -> List[str]:
        if self.zones_enabled:
            return list(self.zones_enabled)
        if self.zones:
            return list(self.zones)
        return list(fallback)


class SimulationResponse(BaseModel):
    scenario: str
    zones: List[str]
    time: List[int]
    traffic: Dict[str, List[float]]
    pollution: Dict[str, List[float]]
    zones_data: List["ZoneData"] = Field(
        default_factory=list,
        description="Per-zone summary metrics ready for map rendering.",
    )
    points_data: List["PointData"] = Field(
        default_factory=list,
        description="Synthetic point samples across zones with PM2.5 values.",
    )
    heatmap_data: List[List[float]] = Field(
        default_factory=list,
        description="Heatmap-friendly triplets [lat, lon, intensity] normalized to [0,1].",
    )


class ZoneData(BaseModel):
    zone: str = Field(..., description="Zone identifier matching the GeoJSON name.")
    avg_pm25: float = Field(..., description="Average PM2.5 during the simulation window.")
    traffic_rel: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Relative traffic intensity normalized across the simulated zones.",
    )


class PointData(BaseModel):
    lat: float = Field(..., description="Latitude of the sampled point.")
    lon: float = Field(..., description="Longitude of the sampled point.")
    pm25: float = Field(..., description="PM2.5 value at this location.")
    zone: str = Field(..., description="Zone associated to the point.")
    time_index: int = Field(..., ge=0, description="Time index used to derive the sample.")


class SimulationCompareRequest(BaseModel):
    """Incoming payload used by /simulate/compare."""

    scenario_a: SimulationRequest = Field(
        ...,
        description="Configuration for scenario A.",
        examples=[SimulationRequest.model_config["json_schema_extra"]["examples"][0]],
    )
    scenario_b: SimulationRequest = Field(
        ...,
        description="Configuration for scenario B.",
        examples=[SimulationRequest.model_config["json_schema_extra"]["examples"][1]],
    )
    label_a: Optional[str] = Field(
        default=None,
        description="Optional label to display for scenario A in comparison views.",
        examples=["Baseline"],
    )
    label_b: Optional[str] = Field(
        default=None,
        description="Optional label to display for scenario B in comparison views.",
        examples=["Pico y placa + cargo restriction"],
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


SimulationResponse.model_rebuild()
