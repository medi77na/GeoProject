import pytest
from pydantic import ValidationError

from backend.models import SimulationRequest
from backend.models.simulation_request import (
    DEFAULT_DURATION_MINUTES,
    DEFAULT_TIME_STEP_MINUTES,
)


def test_simulation_request_accepts_minimal_payload():
    request = SimulationRequest(scenario="A")

    assert request.duration_minutes == DEFAULT_DURATION_MINUTES
    assert request.time_step_minutes == DEFAULT_TIME_STEP_MINUTES
    assert request.peak_hours  # defaults preserved


def test_simulation_request_rejects_non_positive_duration():
    with pytest.raises(ValidationError):
        SimulationRequest(scenario="A", duration_minutes=0)


def test_simulation_request_rejects_non_positive_time_step():
    with pytest.raises(ValidationError):
        SimulationRequest(scenario="A", time_step_minutes=0)


def test_simulation_request_requires_time_step_less_than_duration():
    with pytest.raises(ValidationError):
        SimulationRequest(
            scenario="A",
            duration_minutes=60,
            time_step_minutes=60,
        )


def test_simulation_request_rejects_invalid_wind_direction_range():
    with pytest.raises(ValidationError):
        SimulationRequest(scenario="A", wind_direction=400)


def test_simulation_request_rejects_malformed_peak_hours():
    with pytest.raises(ValidationError):
        SimulationRequest(
            scenario="A",
            peak_hours=["7-9"],
        )


def test_simulation_request_rejects_unknown_zones_enabled():
    with pytest.raises(ValidationError):
        SimulationRequest(
            scenario="A",
            zones_enabled=["Bello", "UnknownZone"],
        )
