import time
from typing import Dict

from fastapi import APIRouter, Body, Depends, HTTPException, Request

from backend.core.logging_config import get_logger, log_error, log_request, log_result
from backend.core.security import API_KEY_HEADER_NAME, get_api_key
from backend.models import (
    SimulationCompareRequest,
    SimulationCompareResponse,
    SimulationRequest,
    SimulationResponse,
)
from backend.services import (
    compare_simulations,
    execute_simulation,
    get_zones_geojson,
)

logger = get_logger(__name__)

simulation_router = APIRouter(
    prefix="/simulate",
    tags=["Simulation"],
    dependencies=[Depends(get_api_key)],
)

SIMULATION_REQUEST_EXAMPLES = {
    "phase1Minimal": {
        "summary": "Minimal Phase 1 payload",
        "description": "Baseline scenario with explicit zones and default configuration.",
        "value": {"scenario": "A", "zones": ["Bello", "Medellin"]},
    },
    "phase2Advanced": {
        "summary": "Advanced Phase 2 payload",
        "description": "Customized simulation with traffic, environmental, and policy inputs.",
        "value": {
            "scenario": "B",
            "zones_enabled": ["Bello", "Envigado"],
            "duration_minutes": 180,
            "time_step_minutes": 10,
            "traffic_level": "high",
            "traffic_base_level": 0.72,
            "peak_hours": ["06:30-09:30", "16:00-19:30"],
            "traffic_variation_by_hour": {"07:00": 1.3, "18:00": 1.2},
            "heavy_vehicle_percentage": 0.18,
            "incident_factor": 1.05,
            "wind_speed": 7.5,
            "wind_direction": "SW",
            "temperature": 27.0,
            "humidity": 0.7,
            "pico_placa_enabled": True,
            "pico_placa_restriction_factor": 0.8,
            "cargo_restriction_enabled": True,
            "speed_limit_factor": 0.9,
        },
    },
}

SIMULATION_RESPONSE_EXAMPLE = {
    "scenario": "B",
    "zones": ["Bello", "Envigado"],
    "time": [0, 5, 10, 15],
    "traffic": {
        "Bello": [0.42, 0.47, 0.51, 0.55],
        "Envigado": [0.38, 0.43, 0.48, 0.5],
    },
    "pollution": {
        "Bello": [24.0, 24.8, 25.1, 25.4],
        "Envigado": [21.5, 22.0, 22.4, 22.6],
    },
    "zones_data": [
        {"zone": "Bello", "avg_pm25": 24.8, "traffic_rel": 0.95},
        {"zone": "Envigado", "avg_pm25": 22.1, "traffic_rel": 0.87},
    ],
    "points_data": [
        {"lat": 6.338, "lon": -75.554, "pm25": 24.8, "zone": "Bello", "time_index": 0},
        {"lat": 6.3425, "lon": -75.5515, "pm25": 25.3, "zone": "Bello", "time_index": 1},
        {"lat": 6.167, "lon": -75.583, "pm25": 22.2, "zone": "Envigado", "time_index": 0},
    ],
    "heatmap_data": [
        [6.338, -75.554, 0.98],
        [6.3425, -75.5515, 1.0],
        [6.167, -75.583, 0.88],
    ],
}

SIMULATION_COMPARE_REQUEST_EXAMPLES = {
    "abTest": {
        "summary": "Baseline vs pico y placa + cargo restriction",
        "description": (
            "Runs two simulations at once. Scenario A keeps mild peak hours, "
            "scenario B enables combined restrictions with adjusted traffic inputs."
        ),
        "value": {
            "label_a": "Baseline A",
            "label_b": "Mitigation B",
            "scenario_a": {
                "scenario": "A",
                "zones_enabled": ["Bello", "Medellin"],
                "duration_minutes": 180,
                "time_step_minutes": 15,
                "traffic_level": "medium",
                "peak_hours": ["07:00-09:00", "17:00-19:00"],
                "traffic_variation_by_hour": {"07:00": 1.15, "18:00": 1.05},
            },
            "scenario_b": {
                "scenario": "B",
                "zones_enabled": ["Bello", "Medellin"],
                "duration_minutes": 180,
                "time_step_minutes": 15,
                "traffic_level": "medium",
                "pico_placa_enabled": True,
                "pico_placa_restriction_factor": 0.82,
                "cargo_restriction_enabled": True,
                "traffic_variation_by_hour": {"07:00": 1.05, "18:00": 0.98},
            },
        },
    },
    "heavyVsLight": {
        "summary": "Compare heavy vehicle policy impacts",
        "description": "Scenario B increases heavy vehicle share to contrast pollution footprints.",
        "value": {
            "scenario_a": {"scenario": "A", "zones": ["Envigado", "Itagui"], "traffic_level": "low"},
            "scenario_b": {
                "scenario": "B",
                "zones": ["Envigado", "Itagui"],
                "traffic_level": "high",
                "heavy_vehicle_percentage": 0.25,
                "wind_speed": 9.0,
                "wind_direction": "SW",
            },
        },
    },
}

SIMULATION_COMPARE_RESPONSE_EXAMPLE = {
    "label_a": "Baseline A",
    "label_b": "Mitigation B",
    "result_a": {
        "scenario": "A",
        "zones": ["Bello", "Medellin"],
        "time": [0, 15, 30, 45],
        "traffic": {
            "Bello": [0.38, 0.41, 0.44, 0.48],
            "Medellin": [0.51, 0.55, 0.58, 0.6],
        },
        "pollution": {
            "Bello": [22.1, 22.6, 23.0, 23.4],
            "Medellin": [25.5, 26.2, 26.8, 27.1],
        },
        "zones_data": [
            {"zone": "Bello", "avg_pm25": 22.8, "traffic_rel": 0.82},
            {"zone": "Medellin", "avg_pm25": 26.4, "traffic_rel": 0.94},
        ],
        "points_data": [
            {"lat": 6.338, "lon": -75.554, "pm25": 22.6, "zone": "Bello", "time_index": 1},
            {"lat": 6.244, "lon": -75.581, "pm25": 26.2, "zone": "Medellin", "time_index": 1},
        ],
        "heatmap_data": [
            [6.338, -75.554, 0.82],
            [6.244, -75.581, 0.94],
        ],
    },
    "result_b": {
        "scenario": "B",
        "zones": ["Bello", "Medellin"],
        "time": [0, 15, 30, 45],
        "traffic": {
            "Bello": [0.34, 0.36, 0.39, 0.41],
            "Medellin": [0.46, 0.49, 0.52, 0.55],
        },
        "pollution": {
            "Bello": [20.2, 20.6, 20.9, 21.1],
            "Medellin": [23.4, 23.9, 24.3, 24.7],
        },
        "zones_data": [
            {"zone": "Bello", "avg_pm25": 20.7, "traffic_rel": 0.74},
            {"zone": "Medellin", "avg_pm25": 24.1, "traffic_rel": 0.86},
        ],
        "points_data": [
            {"lat": 6.338, "lon": -75.554, "pm25": 20.5, "zone": "Bello", "time_index": 1},
            {"lat": 6.244, "lon": -75.581, "pm25": 23.9, "zone": "Medellin", "time_index": 1},
        ],
        "heatmap_data": [
            [6.338, -75.554, 0.74],
            [6.244, -75.581, 0.86],
        ],
    },
}



@simulation_router.post(
    "",
    response_model=SimulationResponse,
    summary="Run a traffic and pollution simulation for a given scenario.",
    description=(
        "Executes the simulation engine for Phase 1 and Phase 2 payloads, "
        "including advanced traffic, environmental, and policy parameters. "
        "Returns per-zone time series for traffic density and pollution plus map-ready "
        "summaries (zones_data, points_data, heatmap_data) for the advanced Leaflet view."
    ),
    responses={
        200: {
            "description": "Simulation executed successfully.",
            "content": {"application/json": {"example": SIMULATION_RESPONSE_EXAMPLE}},
        },
        400: {
            "description": "Simulation failed due to invalid configuration.",
            "content": {
                "application/json": {
                    "example": {"detail": "steps must be positive"}
                }
            },
        },
        422: {
            "description": "Validation error in request payload.",
        },
    },
)
def simulate(
    request: SimulationRequest = Body(..., examples=SIMULATION_REQUEST_EXAMPLES),
    fastapi_request: Request,
) -> SimulationResponse:
    start = time.perf_counter()
    endpoint_name = "/api/v1/simulate"
    params_dict = request.model_dump(exclude_none=True)
    api_key = fastapi_request.headers.get(API_KEY_HEADER_NAME)
    log_request(logger, endpoint_name, params_dict, api_key)

    try:
        response = execute_simulation(request)
    except ValueError as exc:
        log_error(logger, endpoint_name, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        log_error(logger, endpoint_name, exc)
        raise

    execution_ms = int((time.perf_counter() - start) * 1000)
    summary: Dict[str, float | int | str] = {
        "scenario": response.scenario,
        "zones_count": len(response.zones),
        "steps": len(response.time),
    }
    if response.pollution:
        max_pm25 = max((max(values) for values in response.pollution.values()), default=0.0)
        summary["max_pm25"] = round(max_pm25, 4)
    log_result(logger, endpoint_name, execution_ms, summary)
    return response


map_router = APIRouter(
    prefix="/map",
    tags=["Map"],
)


@map_router.get(
    "/zones",
    summary="Base geometries for Valle de Aburrá zones",
    description=(
        "Returns simplified GeoJSON polygons for the core simulation zones. "
        "Intended for frontend mapping layers; geometries are not survey-grade."
    ),
)
def list_zones():
    return get_zones_geojson()


router = APIRouter()
router.include_router(simulation_router)
router.include_router(map_router)


@simulation_router.post(
    "/compare",
    response_model=SimulationCompareResponse,
    summary="Run two simulations and return both results for comparison.",
    description=(
        "Executes the simulation engine twice using the same logic as `/api/v1/simulate`, "
        "allowing the frontend to render side-by-side or overlay map comparisons for scenarios A and B."
    ),
    responses={
        200: {
            "description": "Comparison executed successfully.",
            "content": {
                "application/json": {
                    "example": SIMULATION_COMPARE_RESPONSE_EXAMPLE
                }
            },
        },
        400: {
            "description": "Simulation failed due to invalid configuration in one of the scenarios.",
            "content": {
                "application/json": {
                    "example": {"detail": "time_step_minutes must be smaller than duration_minutes."}
                }
            },
        },
        422: {
            "description": "Validation error in request payload.",
        },
    },
)
def simulate_compare(
    request: SimulationCompareRequest = Body(..., examples=SIMULATION_COMPARE_REQUEST_EXAMPLES),
    fastapi_request: Request,
) -> SimulationCompareResponse:
    start = time.perf_counter()
    endpoint_name = "/api/v1/simulate/compare"
    params_dict = request.model_dump(exclude_none=True)
    api_key = fastapi_request.headers.get(API_KEY_HEADER_NAME)
    log_request(logger, endpoint_name, params_dict, api_key)

    try:
        response = compare_simulations(request)
    except ValueError as exc:
        log_error(logger, endpoint_name, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        log_error(logger, endpoint_name, exc)
        raise

    execution_ms = int((time.perf_counter() - start) * 1000)
    summary: Dict[str, Dict[str, float | int | str]] = {}
    for label, result in (("a", response.result_a), ("b", response.result_b)):
        entry: Dict[str, float | int | str] = {
            "scenario": result.scenario,
            "zones_count": len(result.zones),
            "steps": len(result.time),
        }
        if result.pollution:
            entry["max_pm25"] = round(
                max((max(values) for values in result.pollution.values()), default=0.0),
                4,
            )
        summary[label] = entry
    log_result(logger, endpoint_name, execution_ms, summary)
    return response
