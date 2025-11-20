from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from backend.api import api_router
from backend.core.logging_config import setup_logging
from backend.core.security import API_KEY_HEADER_NAME

setup_logging()

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


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=tags_metadata,
    )

    security_schemes = openapi_schema.setdefault("components", {}).setdefault("securitySchemes", {})
    security_schemes.setdefault(
        "APIKeyHeader",
        {
            "type": "apiKey",
            "in": "header",
            "name": API_KEY_HEADER_NAME,
        },
    )

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
