import React from "react";
import { GeoJSON } from "react-leaflet";

import { getZoneStyle } from "./zone_styles";

const formatNumber = (value, decimals = 1, fallback = "n/a") => {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    return value.toFixed(decimals);
};

export function ZonesLayer({ geojson, metrics }) {
    if (!geojson) return null;

    const handleEachFeature = (feature, layer) => {
        const props = feature.properties ?? {};
        const name = props.name ?? "Zone";
        const avgPm25 = props.avg_pm25 ?? props.pollution;
        const trafficRel = props.traffic_rel ?? props.traffic;

        const pollutionLabel = `${formatNumber(avgPm25, 1)} μg/m³`;
        const trafficLabel = `${formatNumber(trafficRel, 2)} rel.`;
        const tooltip = `${name} • PM2.5: ${pollutionLabel} • Traffic: ${trafficLabel}`;

        layer.bindTooltip(tooltip);
        layer.bindPopup(
            `
            <div>
                <strong>${name}</strong><br/>
                PM2.5 (avg): ${pollutionLabel}<br/>
                Traffic (rel.): ${trafficLabel}
            </div>
        `,
        );
    };

    return (
        <GeoJSON
            data={geojson}
            style={(feature) => getZoneStyle(feature, metrics)}
            onEachFeature={handleEachFeature}
        />
    );
}
