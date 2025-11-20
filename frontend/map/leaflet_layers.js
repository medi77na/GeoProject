import React from "react";
import {
    CircleMarker,
    GeoJSON,
    LayerGroup,
    Popup,
    TileLayer,
    Tooltip,
} from "react-leaflet";

import { getZoneStyle } from "./zone_styles";
import { featureCentroid } from "./utils_geo";

export const DEFAULT_TILE_LAYER = {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

export function BaseTileLayer({ tileLayer }) {
    const layer = tileLayer ?? DEFAULT_TILE_LAYER;
    return <TileLayer attribution={layer.attribution} url={layer.url} />;
}

export function ZoneLayer({ geojson, metrics }) {
    if (!geojson) return null;

    const handleEachFeature = (feature, layer) => {
        const props = feature.properties ?? {};
        const name = props.name ?? "Zone";

        const pollution = props.pollution;
        const traffic = props.traffic;

        const pollutionLabel = typeof pollution === "number"
            ? `${pollution.toFixed(1)} μg/m³`
            : "n/a";
        const trafficLabel = typeof traffic === "number"
            ? `${traffic.toFixed(2)} (rel.)`
            : "n/a";

        const content = `
            <div>
                <strong>${name}</strong><br/>
                PM2.5: ${pollutionLabel}<br/>
                Traffic: ${trafficLabel}
            </div>
        `;
        layer.bindTooltip(`${name} • PM2.5: ${pollutionLabel} • Traffic: ${trafficLabel}`);
        layer.bindPopup(content);
    };

    return (
        <GeoJSON
            data={geojson}
            style={(feature) => getZoneStyle(feature, metrics)}
            onEachFeature={handleEachFeature}
        />
    );
}

export function TrafficMarkers({ features, trafficByZone }) {
    if (!features || !trafficByZone) return null;

    const entries = features
        .map((feature) => {
            const name = feature.properties?.name;
            if (!name) return null;
            const trafficValue = trafficByZone[name];
            const centroid = feature.properties?.centroid ?? featureCentroid(feature);
            if (!centroid) return null;
            const radius = 6 + Math.min(12, Math.abs(trafficValue ?? 0) * 12);

            return {
                name,
                centroid,
                value: trafficValue,
                radius,
            };
        })
        .filter(Boolean);

    if (entries.length === 0) return null;

    return (
        <LayerGroup>
            {entries.map((entry) => (
                <CircleMarker
                    key={entry.name}
                    center={entry.centroid}
                    radius={entry.radius}
                    pathOptions={{
                        color: "#2563eb",
                        opacity: 0.8,
                        fillOpacity: 0.15,
                    }}
                >
                    <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                        {`${entry.name} • Traffic: ${
                            typeof entry.value === "number"
                                ? entry.value.toFixed(2)
                                : "n/a"
                        }`}
                    </Tooltip>
                    <Popup>
                        <div>
                            <strong>{entry.name}</strong>
                            <div>
                                Traffic level:{" "}
                                {typeof entry.value === "number"
                                    ? entry.value.toFixed(2)
                                    : "n/a"}
                            </div>
                        </div>
                    </Popup>
                </CircleMarker>
            ))}
        </LayerGroup>
    );
}
