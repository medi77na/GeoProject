import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

import { HEATMAP_GRADIENT } from "./zone_styles";

export function HeatmapLayer({ heatmapData }) {
    const map = useMap();

    useEffect(() => {
        if (!map || !heatmapData || heatmapData.length === 0) {
            return undefined;
        }

        const layer = L.heatLayer(heatmapData, {
            radius: 28,
            blur: 18,
            maxZoom: 16,
            minOpacity: 0.3,
            gradient: HEATMAP_GRADIENT,
        });
        layer.addTo(map);

        return () => {
            map.removeLayer(layer);
        };
    }, [map, heatmapData]);

    return null;
}
