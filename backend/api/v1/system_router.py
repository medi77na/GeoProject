from fastapi import APIRouter

router = APIRouter(tags=["System"])


@router.get(
    "/ping",
    summary="API heartbeat",
    description="Simple heartbeat endpoint to verify that the Urban Simulator API v1 is reachable.",
)
def ping():
    return {"message": "pong", "scope": "api/v1"}
