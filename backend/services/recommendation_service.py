"""Recommendation orchestration that wraps the rule engine."""

import logging
import os

from fastapi import HTTPException

from backend.models import KPIResult
from backend.models.recommendation_model import (
    RecommendationKpis,
    RecommendationRequest,
    RecommendationResponse,
    RecommendationResult,
)
from backend.models.simulation_response import SimulationResponse
from backend.services.rules_engine import generate_recommendations
from backend.utils import clamp_unit

logger = logging.getLogger(__name__)


def _build_simulation_from_kpis(
    kpis: RecommendationKpis, scenario_name: str
) -> SimulationResponse:
    time = [0, 8 * 60, 18 * 60]
    zones = [zone.name for zone in kpis.zones] or ["Overall"]
    pollution = {}
    traffic = {}

    for zone in kpis.zones:
        pollution_series = [
            float(zone.pm25),
            float(max(zone.pm25, kpis.pm25_max)),
            float(zone.pm25),
        ]
        traffic_series = [clamp_unit(zone.congestion)] * len(time)
        pollution[zone.name] = pollution_series[: len(time)]
        traffic[zone.name] = traffic_series

    if not pollution:
        pollution["Overall"] = [
            float(kpis.pm25_avg),
            float(kpis.pm25_max),
            float(kpis.pm25_avg),
        ]
        traffic["Overall"] = [clamp_unit(kpis.congestion_index)] * len(time)

    return SimulationResponse(
        scenario=scenario_name or "A",
        zones=zones,
        time=time,
        traffic=traffic,
        pollution=pollution,
    )


def _build_kpi_result(kpis: RecommendationKpis, scenario_name: str) -> KPIResult:
    traffic_index = {}
    pollution_avg = {}
    pollution_max = {}
    congestion_index = {}

    zones = [zone.name for zone in kpis.zones] or ["Overall"]

    for zone in kpis.zones:
        name = zone.name
        pollution_avg[name] = float(zone.pm25)
        pollution_max[name] = float(max(zone.pm25, kpis.pm25_max))
        congestion = clamp_unit(zone.congestion)
        traffic_index[name] = congestion
        congestion_index[name] = congestion

    if not kpis.zones:
        pollution_avg["Overall"] = float(kpis.pm25_avg)
        pollution_max["Overall"] = float(kpis.pm25_max)
        congestion_index["Overall"] = clamp_unit(kpis.congestion_index)
        traffic_index["Overall"] = clamp_unit(kpis.congestion_index)

    return KPIResult(
        scenario=scenario_name or "A",
        zones=zones,
        traffic_index=traffic_index,
        pollution_avg=pollution_avg,
        pollution_max=pollution_max,
        congestion_index=congestion_index,
    )


def _maybe_get_ai_client():
    try:
        from backend.services import ai_client  # type: ignore
    except Exception:
        return None
    return ai_client


def build_recommendation_response(
    request: RecommendationRequest,
    enable_llm: bool = True,
) -> RecommendationResponse:
    context = request.context
    scenario_name = context.scenario_name if context and context.scenario_name else "A"

    simulation = _build_simulation_from_kpis(request.kpis, scenario_name=scenario_name)
    kpi_result = _build_kpi_result(request.kpis, scenario_name=scenario_name)

    try:
        recommendation_result: RecommendationResult = generate_recommendations(
            simulation=simulation,
            kpis=kpi_result,
            wind_speed=context.wind_speed if context else None,
        )
    except Exception as exc:
        logger.exception("Failed to generate recommendations from KPIs")
        raise HTTPException(
            status_code=500, detail="Internal recommendation error"
        ) from exc

    llm_commentary = None
    api_key = os.getenv("OPENROUTER_API_KEY")
    ai_client = _maybe_get_ai_client()
    if enable_llm and request.use_llm and api_key and ai_client is not None:
        try:
            llm_commentary = ai_client.get_explanation(  # type: ignore[attr-defined]
                result=recommendation_result,
                request=request,
            )
        except Exception:
            logger.exception(
                "AI commentary generation failed; skipping optional commentary."
            )

    return RecommendationResponse(
        severity=recommendation_result.severity,
        recommendations=recommendation_result.recommendations,
        justification=recommendation_result.justification,
        kpi_summary=recommendation_result.kpi_summary,
        llm_commentary=llm_commentary,
    )
