"""Lightweight geospatial helpers for map-related services."""

from typing import Any, Dict, Tuple

PointLike = Tuple[float, float]


def extract_zone_centers(geojson: Dict[str, Any]) -> Dict[str, PointLike]:
    """
    Build a mapping of zone name -> (lat, lon) center from a GeoJSON FeatureCollection.
    """
    centers: Dict[str, PointLike] = {}
    for feature in geojson.get("features", []):
        properties = feature.get("properties") or {}
        name = properties.get("name")
        center = properties.get("center")
        if not name or not isinstance(center, (list, tuple)) or len(center) != 2:
            continue
        centers[name] = (float(center[0]), float(center[1]))
    return centers
