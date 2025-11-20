from fastapi import APIRouter

from backend.core.versioning import API_V1_PREFIX

from .auth_router import router as auth_router
from .recommend_router import router as recommend_router
from .simulate_router import router as simulate_router

router = APIRouter(prefix=API_V1_PREFIX)
router.include_router(auth_router)
router.include_router(simulate_router)
router.include_router(recommend_router)

__all__ = ["router"]
