import React from "react";
import { CircleMarker, LayerGroup, Popup, Tooltip } from "react-leaflet";

import { getZoneColor } from "./zone_styles";

const formatPm = (value) => (typeof value === "number" ? `${value.toFixed(1)} μg/m³` : "n/a");

export function PointsLayer({ points }) {
    if (!points || points.length === 0) return null;

    return (
        <LayerGroup>
            {points.map((point, idx) => {
                const radius = 6 + Math.min(10, Math.abs(point.pm25 ?? 0) / 4);
                const color = getZoneColor(point.pm25);
                const label = `PM2.5: ${formatPm(point.pm25)} • ${point.zone ?? ""} • t=${point.time_index ?? 0}`;
                return (
                    <CircleMarker
                        key={`${point.zone ?? "point"}-${idx}`}
                        center={[point.lat, point.lon]}
                        radius={radius}
                        pathOptions={{
                            color,
                            weight: 1,
                            fillColor: color,
                            fillOpacity: 0.6,
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -4]} opacity={0.9}>
                            {label}
                        </Tooltip>
                        <Popup>
                            <div>
                                <strong>{point.zone ?? "Zone point"}</strong>
                                <div>{formatPm(point.pm25)}</div>
                                <div>Time index: {point.time_index ?? 0}</div>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </LayerGroup>
    );
}
