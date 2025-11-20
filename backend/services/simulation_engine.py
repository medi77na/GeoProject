from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple, Union

from backend.models import SimulationRequest

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


def _parse_time_token(token: str) -> Optional[int]:
    try:
        hours_str, minutes_str = token.split(":", 1)
        hours = int(hours_str)
        minutes = int(minutes_str)
    except (ValueError, AttributeError):
        return None
    if hours < 0 or minutes < 0:
        return None
    return hours * 60 + minutes


def _parse_peak_windows(windows: Sequence[str]) -> List[Tuple[int, int]]:
    parsed: List[Tuple[int, int]] = []
    for window in windows:
        if "-" not in window:
            continue
        start_token, end_token = window.split("-", 1)
        start = _parse_time_token(start_token.strip())
        end = _parse_time_token(end_token.strip())
        if start is None or end is None:
            continue
        parsed.append((start, end))
    return parsed


def _in_window(minute_of_day: int, windows: Sequence[Tuple[int, int]]) -> bool:
    for start, end in windows:
        if start <= end:
            if start <= minute_of_day < end:
                return True
        else:
            # Window crosses midnight.
            if minute_of_day >= start or minute_of_day < end:
                return True
    return False


def _normalize_hour_variation(raw: Dict[str, float]) -> Dict[int, float]:
    normalized: Dict[int, float] = {}
    for key, factor in raw.items():
        token = key.strip()
        if not token:
            continue
        if ":" in token:
            token = token.split(":", 1)[0]
        try:
            hour = int(token)
        except ValueError:
            continue
        hour = max(0, min(23, hour))
        normalized[hour] = factor
    return normalized


def _direction_factor(direction: Union[str, float, None]) -> float:
    if isinstance(direction, (int, float)):
        normalized = float(direction) % 360.0
        return 1.0 + (normalized - 180.0) / 720.0
    if isinstance(direction, str):
        code = direction.strip().upper()
        mapping = {
            "N": 1.05,
            "NE": 1.0,
            "E": 0.95,
            "SE": 0.9,
            "S": 1.0,
            "SW": 1.1,
            "W": 1.15,
            "NW": 1.08,
        }
        return mapping.get(code, 1.0)
    return 1.0


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


def _normalize_humidity(humidity: float) -> float:
    value = humidity
    if value > 1.0:
        value /= 100.0
    return max(0.0, min(1.0, value))


def run_simulation(
    *,
    request: SimulationRequest,
    synthetic_data: SyntheticDataResult,
    params: Optional[SimulationParams] = None,
) -> SimulationResult:
    """
    Run a simple discrete-time simulation of traffic and pollution per zone.

    Args:
        synthetic_data: base synthetic series (rho and C) per zone.
        request: SimulationRequest with configuration and advanced parameters.
        params: optional overrides for alpha/beta/inertia/dispersion_factor.

    Returns:
        SimulationResult with time, simulated traffic and pollution, and scenario label.
    """
    scenario = request.scenario
    if scenario not in {"A", "B"}:
        raise ValueError('scenario must be "A" or "B"')

    if params is None:
        params = SimulationParams()

    tuned_params = SimulationParams(
        alpha=request.alpha if request.alpha is not None else params.alpha,
        beta=request.beta if request.beta is not None else params.beta,
        inertia=request.inertia if request.inertia is not None else params.inertia,
        dispersion_factor=request.dispersion_factor
        if request.dispersion_factor is not None
        else params.dispersion_factor,
    )

    steps = min(request.total_steps(), len(synthetic_data.time))
    if steps <= 0:
        raise ValueError("steps must be positive")

    time_step_minutes = request.time_step_minutes
    time = [idx * time_step_minutes for idx in range(steps)]

    peak_windows = _parse_peak_windows(request.peak_hours)
    hour_variation = _normalize_hour_variation(request.traffic_variation_by_hour)
    heavy_vehicle_factor = 1.0 + max(0.0, request.heavy_vehicle_percentage)
    incident_factor = max(request.incident_factor, 0.1)
    policy_factor = max(0.2, request.speed_limit_factor)
    if request.pico_placa_enabled:
        policy_factor *= request.pico_placa_restriction_factor
    if request.cargo_restriction_enabled:
        policy_factor *= max(
            0.5, 1.0 - 0.5 * min(1.0, request.heavy_vehicle_percentage)
        )
    policy_factor = max(0.2, policy_factor)

    humidity_ratio = _normalize_humidity(request.humidity)
    wind_dispersion = 1.0 + min(request.wind_speed, 30.0) / 30.0
    direction_dispersion = _direction_factor(request.wind_direction)
    humidity_dispersion = 1.0 + (1.0 - humidity_ratio) * 0.3
    temperature_factor = 1.0 + (request.temperature - 22.0) / 120.0

    pollution_dispersion_factor = (
        tuned_params.beta
        * tuned_params.dispersion_factor
        * wind_dispersion
        * direction_dispersion
        * humidity_dispersion
    )
    pollution_accumulation_base = tuned_params.alpha * temperature_factor

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

        for idx in range(steps):
            minute = time[idx] % (24 * 60)
            hour = (minute // 60) % 24
            base_idx = min(idx, len(base_traffic_series) - 1)
            base_rho = float(base_traffic_series[base_idx])

            # Blend base synthetic series with explicit base level.
            base_rho = 0.7 * base_rho + 0.3 * request.traffic_base_level

            # Hourly modulation using provided dictionary.
            base_rho *= hour_variation.get(hour, 1.0)

            # Scenario and peak-hour modifiers.
            if peak_windows and _in_window(minute, peak_windows):
                peak_multiplier = 1.15 if scenario == "A" else 0.85
                base_rho *= peak_multiplier

            base_rho *= heavy_vehicle_factor
            base_rho *= incident_factor
            base_rho *= policy_factor
            base_rho = _clamp_unit(base_rho)

            # Discrete update for traffic: mix previous state and base value.
            rho_t = (1.0 - tuned_params.inertia) * base_rho + tuned_params.inertia * rho_prev
            rho_t = _clamp_unit(rho_t)

            # Discrete update for pollution.
            emission_multiplier = heavy_vehicle_factor * incident_factor
            if request.pico_placa_enabled:
                emission_multiplier *= request.pico_placa_restriction_factor
            if request.cargo_restriction_enabled:
                emission_multiplier *= 0.9
            emission_multiplier *= max(0.5, request.speed_limit_factor)
            c_t = (
                c_prev
                + pollution_accumulation_base * rho_t * emission_multiplier
                - pollution_dispersion_factor
            )
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
