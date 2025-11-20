import React, { useMemo, useState } from "react";
import { MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { BaseTileLayer, TrafficMarkers } from "./leaflet_layers";
import { HeatmapLayer } from "./heatmap_layer";
import { PointsLayer } from "./points_layer";
import { ZonesLayer } from "./zones_layer";
import { attachMetricsToGeoJson, computeLatestMetricsFromSimulation, deriveLegendData } from "./utils_geo";
import { useZonesGeoJson } from "./use_zones_geojson";
import { UI_TEXTS_ES } from "../constants/texts_es";

export const VALLE_CENTER = [6.24, -75.58];
export const DEFAULT_ZOOM = 11;
const T = UI_TEXTS_ES;

export function Legend({ items }) {
    if (!items || items.length === 0) return null;
    return (
        <div
            style={{
                position: "absolute",
                bottom: "12px",
                right: "12px",
                background: "rgba(255,255,255,0.95)",
                padding: "12px 14px",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                fontSize: "0.95rem",
                lineHeight: "1.5",
                color: "#0f172a",
                border: "1px solid #e2e8f0",
            }}
            aria-label={T.legend.ariaLabel}
        >
            <div style={{ fontWeight: 800, marginBottom: "2px" }}>{T.legend.title}</div>
            <div style={{ color: "#475569", fontSize: "0.9rem", marginBottom: "8px" }}>
                {T.legend.subtitle}
            </div>
            {items.map((item) => (
                <div
                    key={item.label}
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}
                >
                    <span
                        style={{
                            display: "inline-block",
                            width: "16px",
                            height: "16px",
                            backgroundColor: item.color,
                            borderRadius: "4px",
                            border: "1px solid #0f172a",
                        }}
                    />
                    <span>{item.label}</span>
                    <span style={{ color: "#334155", fontWeight: 600 }}>{item.rangeLabel}</span>
                </div>
            ))}
        </div>
    );
}

export function MapStatus({ message }) {
    return (
        <div
            style={{
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                color: "#0f172a",
                padding: "12px 14px",
                borderRadius: "10px",
                marginBottom: "12px",
                fontSize: "0.95rem",
                lineHeight: "1.5",
            }}
        >
            {message}
        </div>
    );
}

export function LayerToggles({
    showZonesLayer,
    showPointsLayer,
    showHeatmapLayer,
    onToggleZones,
    onTogglePoints,
    onToggleHeatmap,
}) {
    return (
        <div
            style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                zIndex: 900,
                background: "rgba(255,255,255,0.96)",
                padding: "12px",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.14)",
                fontSize: "0.95rem",
                color: "#0f172a",
                border: "1px solid #e2e8f0",
            }}
        >
            <div style={{ fontWeight: 800, marginBottom: "6px" }}>{T.legend.layersTitle}</div>
            <div style={{ color: "#475569", marginBottom: "8px", fontSize: "0.9rem" }}>
                {T.legend.layersDescription}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "2px 0" }} title={T.legend.zonesTooltip}>
                <input type="checkbox" checked={showZonesLayer} onChange={onToggleZones} aria-label={T.legend.zones} />
                {T.legend.zones}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "2px 0" }} title={T.legend.pointsTooltip}>
                <input type="checkbox" checked={showPointsLayer} onChange={onTogglePoints} aria-label={T.legend.points} />
                {T.legend.points}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "2px 0" }} title={T.legend.heatmapTooltip}>
                <input
                    type="checkbox"
                    checked={showHeatmapLayer}
                    onChange={onToggleHeatmap}
                    aria-label={T.legend.heatmap}
                />
                {T.legend.heatmap}
            </label>
        </div>
    );
}

function UrbanMap({
    simulationResult,
    pollutionByZone,
    trafficByZone,
    tileLayer,
    height = 520,
}) {
    const [showZonesLayer, setShowZonesLayer] = useState(true);
    const [showPointsLayer, setShowPointsLayer] = useState(true);
    const [showHeatmapLayer, setShowHeatmapLayer] = useState(false);

    const { geojson, loading, error } = useZonesGeoJson();

    const latestFromSimulation = useMemo(
        () => computeLatestMetricsFromSimulation(simulationResult),
        [simulationResult],
    );

    const metrics = useMemo(() => {
        return {
            pollutionByZone: pollutionByZone ?? latestFromSimulation.pollutionByZone,
            trafficByZone: trafficByZone ?? latestFromSimulation.trafficByZone,
            zoneDataByZone: latestFromSimulation.zoneDataByZone,
        };
    }, [pollutionByZone, trafficByZone, latestFromSimulation]);

    const preparedGeoJson = useMemo(() => {
        if (!geojson) return null;
        return attachMetricsToGeoJson(geojson, metrics);
    }, [geojson, metrics]);

    const legendModel = useMemo(
        () => deriveLegendData({
            zonesData: latestFromSimulation.zonesData,
            pointsData: latestFromSimulation.pointsData,
            pollutionByZone: metrics.pollutionByZone,
        }),
        [latestFromSimulation, metrics],
    );

    const hasSimulationData = useMemo(() => {
        return (
            (metrics.pollutionByZone && Object.keys(metrics.pollutionByZone).length > 0)
            || (metrics.trafficByZone && Object.keys(metrics.trafficByZone).length > 0)
        );
    }, [metrics]);
    const hasSimulationResult = Boolean(simulationResult);

    if (error) {
        return <MapStatus message={`${T.messages.mapUnavailablePrefix}${error}`} />;
    }

    return (
        <div style={{ position: "relative" }}>
            {!hasSimulationResult && (
                <MapStatus message={T.map.statusNeedsSimulation} />
            )}
            {loading && <MapStatus message={T.messages.loadingZones} />}
            <MapContainer
                center={VALLE_CENTER}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom
                style={{ height, width: "100%", borderRadius: "8px", overflow: "hidden" }}
            >
                <BaseTileLayer tileLayer={tileLayer} />
                <LayerToggles
                    showZonesLayer={showZonesLayer}
                    showPointsLayer={showPointsLayer}
                    showHeatmapLayer={showHeatmapLayer}
                    onToggleZones={() => setShowZonesLayer((value) => !value)}
                    onTogglePoints={() => setShowPointsLayer((value) => !value)}
                    onToggleHeatmap={() => setShowHeatmapLayer((value) => !value)}
                />
                {preparedGeoJson && (
                    <>
                        {showZonesLayer && (
                            <ZonesLayer geojson={preparedGeoJson} metrics={metrics} />
                        )}
                        {showZonesLayer && (
                            <TrafficMarkers
                                features={preparedGeoJson.features}
                                trafficByZone={metrics.trafficByZone}
                            />
                        )}
                    </>
                )}
                {hasSimulationData && showPointsLayer && (
                    <PointsLayer points={latestFromSimulation.pointsData} />
                )}
                {hasSimulationData && showHeatmapLayer && (
                    <HeatmapLayer heatmapData={latestFromSimulation.heatmapData} />
                )}
            </MapContainer>
            <Legend items={legendModel.legend} />
        </div>
    );
}

export default UrbanMap;
