from math import ceil
from typing import Dict, List, Literal, Optional, Sequence, Union

from pydantic import BaseModel, Field


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


class SimulationRequest(BaseModel):
    scenario: Literal["A", "B"] = "A"
    zones: Optional[List[str]] = None
    zones_enabled: Optional[List[str]] = None
    horizon: Optional[int] = Field(None, gt=0)
    duration_minutes: int = Field(DEFAULT_DURATION_MINUTES, gt=0)
    time_step_minutes: int = Field(DEFAULT_TIME_STEP_MINUTES, gt=0)
    traffic_level: Literal["low", "medium", "high"] = "medium"
    seed: Optional[int] = None

    # Optional overrides for SimulationParams
    alpha: Optional[float] = None
    beta: Optional[float] = None
    inertia: Optional[float] = None
    dispersion_factor: float = Field(
        DEFAULT_ENV_DISPERSION_FACTOR, gt=0.0, description="Base dispersion term"
    )

    # Advanced Phase 2 parameters
    traffic_base_level: float = Field(DEFAULT_TRAFFIC_BASE_LEVEL, ge=0.0)
    peak_hours: List[str] = Field(
        default_factory=lambda: list(DEFAULT_PEAK_HOURS),
        description="List of HH:MM-HH:MM windows for intensified demand",
    )
    traffic_variation_by_hour: Dict[str, float] = Field(
        default_factory=dict, description="Hour-string (00-23) → multiplicative factor"
    )
    heavy_vehicle_percentage: float = Field(DEFAULT_HEAVY_VEHICLE_PERCENTAGE, ge=0.0)
    incident_factor: float = Field(DEFAULT_INCIDENT_FACTOR, ge=0.0)
    wind_speed: float = Field(DEFAULT_WIND_SPEED, ge=0.0)
    wind_direction: Union[str, float, None] = DEFAULT_WIND_DIRECTION
    temperature: float = DEFAULT_TEMPERATURE
    humidity: float = Field(DEFAULT_HUMIDITY, ge=0.0)
    pico_placa_enabled: bool = DEFAULT_PICO_PLACA_ENABLED
    pico_placa_restriction_factor: float = Field(
        DEFAULT_PICO_PLACA_RESTRICTION_FACTOR, gt=0.0
    )
    cargo_restriction_enabled: bool = DEFAULT_CARGO_RESTRICTION_ENABLED
    speed_limit_factor: float = Field(DEFAULT_SPEED_LIMIT_FACTOR, gt=0.0)

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

    class Config:
        schema_extra = {
            "examples": [
                {
                    "scenario": "A",
                    "zones": ["Bello", "Medellin"],
                    "horizon": 24,
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
                    "traffic_variation_by_hour": {"07": 1.3, "18": 1.25},
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


class SimulationResponse(BaseModel):
    scenario: str
    zones: List[str]
    time: List[int]
    traffic: Dict[str, List[float]]
    pollution: Dict[str, List[float]]
