"""Rule-based recommendation engine for policy actions.

This module consumes simulation outputs and optional KPIs to produce
deterministic recommendations. It does not perform any I/O and is meant
to be reused by API routes without side effects.
"""

from statistics import mean
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from backend.models import (
    RecommendationItem,
    RecommendationResult,
    SeverityLevel,
    SimulationResponse,
)
from .kpi_calculator import KPIResult

# Order used to compare severity levels.
SeverityOrder: Dict[SeverityLevel, int] = {
    "low": 0,
    "moderate": 1,
    "high": 2,
    "critical": 3,
}

PEAK_WINDOWS: Tuple[Tuple[int, int], ...] = ((7 * 60, 9 * 60), (17 * 60, 19 * 60))
LOW_WIND_THRESHOLD = 2.0
CONGESTION_HIGH = 0.8
CONGESTION_MODERATE = 0.6
PM25_THRESHOLDS = (20.0, 35.0, 55.0)  # low->moderate->high->critical boundaries


def _severity_from_value(value: float) -> SeverityLevel:
    if value > PM25_THRESHOLDS[2]:
        return "critical"
    if value > PM25_THRESHOLDS[1]:
        return "high"
    if value > PM25_THRESHOLDS[0]:
        return "moderate"
    return "low"


def _compute_pm25_metrics(
    simulation: SimulationResponse, kpis: Optional[KPIResult]
) -> Dict[str, object]:
    if kpis:
        zone_avg = dict(kpis.pollution_avg)
        zone_max = dict(kpis.pollution_max)
    else:
        zone_avg = {
            zone: float(mean(values)) for zone, values in simulation.pollution.items()
        }
        zone_max = {zone: float(max(values)) for zone, values in simulation.pollution.items()}

    overall_avg = float(mean(zone_avg.values())) if zone_avg else 0.0
    overall_max = float(max(zone_max.values())) if zone_max else 0.0
    return {
        "zone_avg": zone_avg,
        "zone_max": zone_max,
        "overall_avg": overall_avg,
        "overall_max": overall_max,
    }


def _compute_congestion(
    simulation: SimulationResponse,
    kpis: Optional[KPIResult],
    threshold: float = 0.7,
) -> Dict[str, object]:
    if kpis:
        congestion = dict(kpis.congestion_index)
    else:
        congestion: Dict[str, float] = {}
        for zone, series in simulation.traffic.items():
            if not series:
                continue
            congested = sum(1 for value in series if value >= threshold)
            congestion[zone] = float(congested) / float(len(series))

    max_congestion = max(congestion.values()) if congestion else 0.0
    return {"per_zone": congestion, "max": max_congestion}


def _indices_in_windows(time_series: Sequence[int], windows: Iterable[Tuple[int, int]]) -> List[int]:
    indices: List[int] = []
    for idx, minute in enumerate(time_series):
        minute_of_day = minute % (24 * 60)
        for start, end in windows:
            if start <= minute_of_day < end:
                indices.append(idx)
                break
    return indices


def _peak_window_congestion(
    simulation: SimulationResponse, window_indices: Sequence[int]
) -> Dict[str, float]:
    peak_congestion: Dict[str, float] = {}
    if not window_indices:
        return peak_congestion
    for zone, series in simulation.traffic.items():
        window_values = [series[idx] for idx in window_indices if idx < len(series)]
        if window_values:
            peak_congestion[zone] = float(mean(window_values))
    return peak_congestion


def _add_recommendation(
    collection: List[RecommendationItem], code: str, title: str, description: str
) -> None:
    collection.append(
        RecommendationItem(
            code=code,
            title=title,
            description=description,
        )
    )


def generate_recommendations(
    simulation: SimulationResponse,
    kpis: Optional[KPIResult] = None,
    wind_speed: Optional[float] = None,
) -> RecommendationResult:
    """Generate policy recommendations given simulation outputs and KPIs."""

    pm25_metrics = _compute_pm25_metrics(simulation, kpis)
    congestion_metrics = _compute_congestion(simulation, kpis)
    pm25_overall_max = pm25_metrics["overall_max"]  # type: ignore[assignment]
    base_severity = _severity_from_value(pm25_overall_max)

    congestion_max = congestion_metrics["max"]  # type: ignore[assignment]
    if congestion_max > CONGESTION_HIGH:
        congestion_severity: SeverityLevel = "high"
    elif congestion_max > CONGESTION_MODERATE:
        congestion_severity = "moderate"
    else:
        congestion_severity = "low"

    severity_rank = max(SeverityOrder[base_severity], SeverityOrder[congestion_severity])

    pollution_high_zones = [
        zone
        for zone, value in pm25_metrics["zone_max"].items()  # type: ignore[union-attr]
        if value > PM25_THRESHOLDS[1]
    ]
    severe_congestion_zones = [
        zone
        for zone, value in congestion_metrics["per_zone"].items()  # type: ignore[union-attr]
        if value > CONGESTION_HIGH
    ]
    combined_zones = set(pollution_high_zones).intersection(severe_congestion_zones)
    if combined_zones:
        severity_rank = max(severity_rank, SeverityOrder["critical"])

    env_escalation = False
    if wind_speed is not None and wind_speed < LOW_WIND_THRESHOLD:
        env_escalation = True
        severity_rank = min(SeverityOrder["critical"], severity_rank + 1)

    final_severity: SeverityLevel = next(
        level for level, value in SeverityOrder.items() if value == severity_rank
    )

    recommendations: List[RecommendationItem] = []

    if base_severity == "critical":
        _add_recommendation(
            recommendations,
            "ENV_ALERT",
            "Activate environmental alert",
            "PM2.5 exceeds 55 ug/m3; activate emergency protocols city-wide.",
        )
        _add_recommendation(
            recommendations,
            "FREIGHT_RESTRICTION",
            "Restrict freight vehicles",
            "Limit heavy freight activity in critical corridors to reduce emissions quickly.",
        )
        _add_recommendation(
            recommendations,
            "PICO_PLACA_EXTENDED",
            "Extend pico y placa hours",
            "Extend restrictive hours for private vehicles until air quality recovers.",
        )
    elif base_severity == "high":
        _add_recommendation(
            recommendations,
            "PICO_PLACA_INTENSIFY",
            "Intensify pico y placa",
            "Increase enforcement and coverage during the day to curb vehicular load.",
        )
        _add_recommendation(
            recommendations,
            "PUBLIC_ALERT",
            "Issue public alert",
            "Communicate air quality risks and voluntary reduction of car usage.",
        )
        _add_recommendation(
            recommendations,
            "SIGNAL_OPTIMIZATION",
            "Optimize traffic signals",
            "Prioritize circulation to dissipate localized congestion and discourage idling.",
        )
    elif base_severity == "moderate":
        _add_recommendation(
            recommendations,
            "MOBILITY_ADJUSTMENTS",
            "Light mobility adjustments",
            "Encourage staggered commutes and minor circulation changes to avoid escalation.",
        )
        _add_recommendation(
            recommendations,
            "INFORMATION_CAMPAIGN",
            "Informative campaign",
            "Share guidance on keeping pollution low without restrictive measures.",
        )
    else:
        _add_recommendation(
            recommendations,
            "MAINTAIN_MONITORING",
            "Maintain monitoring",
            "Keep normal operations while maintaining sensors and readiness to react.",
        )

    moderate_congestion_zones = [
        zone
        for zone, value in congestion_metrics["per_zone"].items()  # type: ignore[union-attr]
        if CONGESTION_MODERATE < value <= CONGESTION_HIGH
    ]

    for zone in severe_congestion_zones:
        _add_recommendation(
            recommendations,
            f"CONGESTION_REDIRECT_{zone.upper()}",
            f"Redirect traffic in {zone}",
            f"Severe congestion detected in {zone}; reroute flows and adjust signal plans.",
        )
        _add_recommendation(
            recommendations,
            f"SIGNAL_TIMING_{zone.upper()}",
            f"Adjust traffic lights in {zone}",
            f"Update adaptive signal timing in {zone} to reduce queues above 0.80 congestion.",
        )

    for zone in moderate_congestion_zones:
        _add_recommendation(
            recommendations,
            f"FLOW_OPTIMIZATION_{zone.upper()}",
            f"Optimize circulation in {zone}",
            f"Congestion is above 0.60 in {zone}; deploy reversible lanes or soft measures.",
        )

    for zone in pollution_high_zones:
        if zone in severe_congestion_zones:
            _add_recommendation(
                recommendations,
                f"PICO_PLACA_STRONG_{zone.upper()}",
                f"Strengthen pico y placa in {zone}",
                f"High pollution and congestion overlap in {zone}; enforce stronger restrictions.",
            )
            _add_recommendation(
                recommendations,
                f"FREIGHT_LIMIT_{zone.upper()}",
                f"Limit freight access in {zone}",
                f"Restrict freight during peak hours in {zone} to curb combined impacts.",
            )

    peak_indices = _indices_in_windows(simulation.time, PEAK_WINDOWS)
    peak_congestion = _peak_window_congestion(simulation, peak_indices)
    if any(value >= 0.65 for value in peak_congestion.values()):
        _add_recommendation(
            recommendations,
            "SHIFT_ADJUSTMENTS",
            "Adjust work shifts",
            "Traffic peaks between 07:00-09:00 or 17:00-19:00; promote staggered hours.",
        )
        _add_recommendation(
            recommendations,
            "PICO_PLACA_PEAK",
            "Extend peak-hour pico y placa",
            "Extend restrictions specifically in peak windows to flatten demand spikes.",
        )

    if env_escalation:
        _add_recommendation(
            recommendations,
            "LOW_WIND_ESCALATION",
            "Escalate due to low wind",
            "Wind speed below 2.0 m/s reduces dispersion; keep enhanced restrictions active.",
        )

    justification_parts: List[str] = [
        f"Max PM2.5: {pm25_overall_max:.1f} ug/m3",
        f"Max congestion index: {congestion_max:.2f}",
    ]
    if severe_congestion_zones:
        justification_parts.append(f"Severe congestion in: {', '.join(severe_congestion_zones)}")
    if combined_zones:
        justification_parts.append(
            f"High pollution and congestion overlap in: {', '.join(sorted(combined_zones))}"
        )
    if env_escalation:
        justification_parts.append("Severity escalated due to low wind dispersion")

    justification = "; ".join(justification_parts)

    summary = {
        "pm25_avg": pm25_metrics["overall_avg"],
        "pm25_max": pm25_overall_max,
        "max_congestion": congestion_max,
        "zones_high_pm25": float(len(pollution_high_zones)),
        "zones_high_congestion": float(len(severe_congestion_zones)),
    }

    return RecommendationResult(
        severity=final_severity,
        recommendations=recommendations,
        justification=justification,
        kpi_summary=summary,
    )
