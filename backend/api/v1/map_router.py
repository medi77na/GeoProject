from fastapi import APIRouter

from backend.services import get_zones_geojson

router = APIRouter(
    prefix="/map",
    tags=["Map"],
)


@router.get(
    "/zones",
    summary="Base geometries for Valle de Aburrá zones",
    description=(
        "Returns simplified GeoJSON polygons for the core simulation zones. "
        "Intended for frontend mapping layers; geometries are not survey-grade."
    ),
)
def list_zones():
    return get_zones_geojson()
