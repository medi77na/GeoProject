import React from "react";
import { GeoJSON } from "react-leaflet";

import { UI_TEXTS_ES } from "../constants/texts_es";
import { getZoneStyle } from "./zone_styles";

const T = UI_TEXTS_ES;

const formatNumber = (value, decimals = 1, fallback = T.sections.kpis.notAvailable) => {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    return value.toFixed(decimals);
};

export function ZonesLayer({ geojson, metrics }) {
    if (!geojson) return null;

    const handleEachFeature = (feature, layer) => {
        const props = feature.properties ?? {};
        const name = props.name ?? T.map.zoneFallback;
        const avgPm25 = props.avg_pm25 ?? props.pollution;
        const trafficRel = props.traffic_rel ?? props.traffic;

        const pollutionLabel = `${formatNumber(avgPm25, 1)} μg/m³`;
        const trafficLabel = `${formatNumber(trafficRel, 2)} ${T.metrics.relative}`;
        const tooltip = `${name} • ${T.metrics.pm}: ${pollutionLabel} • ${T.metrics.traffic}: ${trafficLabel}`;

        layer.bindTooltip(tooltip);
        layer.bindPopup(
            `
            <div>
                <strong>${name}</strong><br/>
                ${T.metrics.pm} (prom.): ${pollutionLabel}<br/>
                ${T.metrics.traffic} ${T.metrics.relative}: ${trafficLabel}
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
