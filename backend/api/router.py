from fastapi import APIRouter, HTTPException

from backend.models import SimulationRequest, SimulationResponse
from backend.services import SimulationParams, generate_synthetic_data, run_simulation

router = APIRouter(prefix="/api/v1")
DEFAULT_ZONES = ["Bello", "Medellin", "Envigado", "Itagui"]


@router.get("/ping")
def ping():
    return {"message": "pong", "scope": "api/v1"}


@router.post("/simulate", response_model=SimulationResponse)
def simulate(request: SimulationRequest) -> SimulationResponse:
    try:
        zones = request.zones or DEFAULT_ZONES

        synthetic = generate_synthetic_data(
            zones=zones,
            horizon=request.horizon,
            scenario=request.scenario,
            traffic_level=request.traffic_level,
            seed=request.seed,
        )

        base_params = SimulationParams()
        params = SimulationParams(
            alpha=request.alpha if request.alpha is not None else base_params.alpha,
            beta=request.beta if request.beta is not None else base_params.beta,
            inertia=(
                request.inertia if request.inertia is not None else base_params.inertia
            ),
            dispersion_factor=(
                request.dispersion_factor
                if request.dispersion_factor is not None
                else base_params.dispersion_factor
            ),
        )

        result = run_simulation(
            synthetic_data=synthetic,
            steps=request.horizon,
            scenario=request.scenario,
            params=params,
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
