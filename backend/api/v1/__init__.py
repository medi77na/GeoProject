from fastapi import APIRouter

from .simulate_router import router as simulate_router
from .system_router import router as system_router

router = APIRouter(prefix="/api/v1")
router.include_router(system_router)
router.include_router(simulate_router)

__all__ = ["router"]
