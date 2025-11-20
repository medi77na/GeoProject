"""Helpers to expose static map layers and derive map-ready simulation data."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Sequence, Tuple

from backend.models import PointData, ZoneData
from backend.utils import clamp_unit, extract_zone_centers, safe_average

PointLike = Tuple[float, float]


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


POINT_OFFSETS: Tuple[PointLike, ...] = (
    (0.0, 0.0),
    (0.0045, 0.0025),
    (-0.0045, -0.0025),
    (0.0035, -0.0035),
    (-0.0035, 0.0035),
    (0.0055, -0.0015),
    (-0.0055, 0.0015),
    (0.0, -0.0045),
)


def _normalize_time_index(total_steps: int, sample_idx: int, total_samples: int) -> int:
    if total_steps <= 1:
        return 0
    stride = max(1, total_steps // max(1, total_samples))
    idx = min(total_steps - 1, sample_idx * stride)
    return idx


def build_zone_summaries(
    zones: Iterable[str],
    pollution: Dict[str, List[float]],
    traffic: Dict[str, List[float]],
) -> List[ZoneData]:
    zones_list = list(zones)
    traffic_averages = [
        safe_average(traffic.get(zone, [])) for zone in zones_list if traffic.get(zone)
    ]
    max_traffic_avg = max(traffic_averages) if traffic_averages else 0.0

    summaries: List[ZoneData] = []
    for zone in zones_list:
        pollution_values = pollution.get(zone, [])
        traffic_values = traffic.get(zone, [])
        avg_pm25 = safe_average(pollution_values)
        avg_traffic = safe_average(traffic_values)

        traffic_rel = (
            clamp_unit(avg_traffic / max_traffic_avg) if max_traffic_avg > 0 else 0.0
        )
        summaries.append(
            ZoneData(zone=zone, avg_pm25=avg_pm25, traffic_rel=traffic_rel)
        )
    return summaries


def build_point_samples(
    zones: Iterable[str],
    pollution: Dict[str, List[float]],
    centers: Dict[str, PointLike],
    max_points_per_zone: int = 6,
) -> List[PointData]:
    points: List[PointData] = []
    offsets = POINT_OFFSETS[:max_points_per_zone]

    for zone in zones:
        base_center = centers.get(zone)
        if not base_center:
            continue

        pollution_values = pollution.get(zone, [])
        if not pollution_values:
            continue

        total_steps = len(pollution_values)
        samples_to_generate = max(
            3, min(len(offsets), total_steps, max_points_per_zone)
        )

        for idx in range(samples_to_generate):
            lat_offset, lon_offset = offsets[idx]
            time_index = _normalize_time_index(total_steps, idx, samples_to_generate)
            pm_value = float(pollution_values[time_index])
            pm_value *= 0.98 + 0.02 * ((idx % 3) + 1) / 3.0

            lat = base_center[0] + lat_offset
            lon = base_center[1] + lon_offset
            points.append(
                PointData(
                    lat=lat,
                    lon=lon,
                    pm25=pm_value,
                    zone=zone,
                    time_index=time_index,
                )
            )

    return points


def build_heatmap(points: Sequence[PointData]) -> List[List[float]]:
    if not points:
        return []

    max_pm = max(point.pm25 for point in points)
    if max_pm <= 0:
        return []

    heatmap: List[List[float]] = []
    for point in points:
        intensity = clamp_unit(point.pm25 / max_pm)
        heatmap.append([point.lat, point.lon, float(intensity)])
    return heatmap


def derive_map_ready_layers(
    zones: Iterable[str],
    pollution: Dict[str, List[float]],
    traffic: Dict[str, List[float]],
) -> Tuple[List[ZoneData], List[PointData], List[List[float]]]:
    zones_list = list(zones)
    centers = extract_zone_centers(get_zones_geojson())
    zones_data = build_zone_summaries(zones_list, pollution, traffic)
    points_data = build_point_samples(zones_list, pollution, centers)
    heatmap_data = build_heatmap(points_data)
    return zones_data, points_data, heatmap_data
