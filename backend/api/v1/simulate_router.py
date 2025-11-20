from fastapi import APIRouter, Body, HTTPException

from backend.models import KNOWN_ZONES, SimulationRequest, SimulationResponse
from backend.services import generate_synthetic_data, run_simulation
from backend.services.contamination_layers import derive_map_ready_layers

router = APIRouter(
    prefix="/simulate",
    tags=["Simulation"],
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


def handle_simulation_request(request: SimulationRequest) -> SimulationResponse:
    try:
        zones = request.resolved_zones(KNOWN_ZONES)
        steps = request.total_steps()

        synthetic = generate_synthetic_data(
            zones=zones,
            horizon=steps,
            scenario=request.scenario,
            traffic_level=request.traffic_level,
            seed=request.seed,
        )

        result = run_simulation(
            request=request,
            synthetic_data=synthetic,
        )
        zones_data, points_data, heatmap_data = derive_map_ready_layers(
            zones=result.traffic.keys(),
            pollution=result.pollution,
            traffic=result.traffic,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SimulationResponse(
        scenario=result.scenario,
        zones=list(result.traffic.keys()),
        time=result.time,
        traffic=result.traffic,
        pollution=result.pollution,
        zones_data=zones_data,
        points_data=points_data,
        heatmap_data=heatmap_data,
    )


@router.post(
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
) -> SimulationResponse:
    return handle_simulation_request(request)
