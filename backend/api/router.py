from fastapi import APIRouter

router = APIRouter(prefix="/api/v1")


@router.get("/ping")
def ping():
    return {"message": "pong", "scope": "api/v1"}
