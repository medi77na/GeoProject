from fastapi import APIRouter

from backend.api.v1 import router as api_v1_router
from backend.models import SimulationRequest, SimulationResponse
from backend.services import execute_simulation

router = APIRouter()
router.include_router(api_v1_router)

legacy_router = APIRouter(tags=["Simulation"])


@legacy_router.post(
    "/simulate",
    response_model=SimulationResponse,
    deprecated=True,
    summary="(Deprecated) Run simulation via legacy path",
    description="Use `/api/v1/simulate` instead. This shim exists for backward compatibility.",
)
def simulate_legacy(request: SimulationRequest) -> SimulationResponse:
    return execute_simulation(request)


router.include_router(legacy_router)
