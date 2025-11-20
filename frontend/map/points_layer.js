import React from "react";
import { CircleMarker, LayerGroup, Popup, Tooltip } from "react-leaflet";

import { UI_TEXTS_ES } from "../constants/texts_es";
import { getZoneColor } from "./zone_styles";

const T = UI_TEXTS_ES;

const formatPm = (value) => (typeof value === "number" ? `${value.toFixed(1)} μg/m³` : T.sections.kpis.notAvailable);

export function PointsLayer({ points }) {
    if (!points || points.length === 0) return null;

    return (
        <LayerGroup>
            {points.map((point, idx) => {
                const radius = 6 + Math.min(10, Math.abs(point.pm25 ?? 0) / 4);
                const color = getZoneColor(point.pm25);
                const label = `${T.metrics.pm}: ${formatPm(point.pm25)} • ${point.zone ?? T.map.pointFallback} • ${T.metrics.timeIndex}: ${point.time_index ?? 0}`;
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
                                <strong>{point.zone ?? T.map.pointFallback}</strong>
                                <div>{formatPm(point.pm25)}</div>
                                <div>{`${T.metrics.timeIndex}: ${point.time_index ?? 0}`}</div>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </LayerGroup>
    );
}
