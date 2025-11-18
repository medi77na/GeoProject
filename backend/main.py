from fastapi import FastAPI

from backend.api import api_router

app = FastAPI(title="Urban Simulator", version="0.1.0")

app.include_router(api_router, prefix="/api")


@app.get("/health")
def health():
    """Bounds check for the service."""
    return {"status": "ok", "service": "urban-simulator", "phase": "F1-MVP"}


# TODO: implement the /simulate endpoint in a future iteration.
