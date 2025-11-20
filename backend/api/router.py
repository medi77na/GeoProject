from fastapi import APIRouter, HTTPException

from backend.models import KNOWN_ZONES, SimulationRequest, SimulationResponse
from backend.services import generate_synthetic_data, run_simulation

router = APIRouter(prefix="/api/v1")


@router.get("/ping")
def ping():
    return {"message": "pong", "scope": "api/v1"}


@router.post("/simulate", response_model=SimulationResponse)
def simulate(request: SimulationRequest) -> SimulationResponse:
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

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SimulationResponse(
        scenario=result.scenario,
        zones=list(result.traffic.keys()),
        time=result.time,
        traffic=result.traffic,
        pollution=result.pollution,
    )
