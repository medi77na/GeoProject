from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import api_router

tags_metadata = [
    {
        "name": "Simulation",
        "description": "Run traffic and pollution simulations for urban scenarios.",
    },
    {
        "name": "KPIs",
        "description": "Access key performance indicators derived from simulations.",
    },
    {
        "name": "Recommendations",
        "description": "Retrieve rule-based or AI-assisted scenario recommendations.",
    },
    {
        "name": "Authentication",
        "description": "Authentication and security related endpoints.",
    },
    {
        "name": "System",
        "description": "Health checks and system-level endpoints.",
    },
    {
        "name": "Map",
        "description": "Read-only endpoints that expose base geometries for UI layers.",
    },
]

app = FastAPI(
    title="Urban Simulator API",
    version="1.0.0",
    description="API del Simulador Urbano de Tráfico y Contaminación.",
    openapi_tags=tags_metadata,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/health",
    tags=["System"],
    summary="Service health status",
    description="Returns a quick status payload to confirm that the Urban Simulator service is running.",
)
def health():
    return {"status": "ok", "service": "urban-simulator", "phase": "F1-MVP"}


app.include_router(api_router)
