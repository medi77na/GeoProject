from typing import Any, Dict, List


def get_zones_geojson() -> Dict[str, Any]:
    """
    Return a lightweight GeoJSON FeatureCollection for the Valle de Aburrá zones.

    The polygons are simplified outlines meant for visualization only (no GIS precision).
    Each feature exposes a `name` property matching the simulation zones so that
    frontend layers can merge pollution/traffic metrics by zone.
    """
    features: List[Dict[str, Any]] = [
        {
            "type": "Feature",
            "properties": {
                "name": "Bello",
                "center": [6.338, -75.554],
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [-75.57, 6.355],
                        [-75.55, 6.355],
                        [-75.54, 6.325],
                        [-75.57, 6.325],
                        [-75.57, 6.355],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Medellin",
                "center": [6.244, -75.581],
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [-75.62, 6.30],
                        [-75.54, 6.30],
                        [-75.53, 6.26],
                        [-75.60, 6.19],
                        [-75.64, 6.21],
                        [-75.62, 6.30],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Envigado",
                "center": [6.167, -75.583],
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [-75.60, 6.20],
                        [-75.55, 6.20],
                        [-75.54, 6.16],
                        [-75.59, 6.12],
                        [-75.63, 6.14],
                        [-75.60, 6.20],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Itagui",
                "center": [6.173, -75.611],
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [-75.64, 6.20],
                        [-75.60, 6.20],
                        [-75.58, 6.16],
                        [-75.62, 6.12],
                        [-75.66, 6.14],
                        [-75.64, 6.20],
                    ]
                ],
            },
        },
    ]

    return {"type": "FeatureCollection", "features": features}
