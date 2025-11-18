from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
def ping():
    return {"message": "pong"}


# /simulate will be implemented here in a future iteration.
