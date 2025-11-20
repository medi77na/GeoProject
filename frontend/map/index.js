import React, { useEffect, useMemo, useState } from "react";
import { MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { BaseTileLayer, TrafficMarkers } from "./leaflet_layers";
import { HeatmapLayer } from "./layers/heatmap_layer";
import { PointsLayer } from "./layers/points_layer";
import { ZonesLayer } from "./layers/zones_layer";
import { attachMetricsToGeoJson, computeLatestMetricsFromSimulation, deriveLegendData } from "./utils_geo";

const VALLE_CENTER = [6.24, -75.58];
const DEFAULT_ZOOM = 11;

function Legend({ items }) {
    if (!items || items.length === 0) return null;
    return (
        <div
            style={{
                position: "absolute",
                bottom: "12px",
                right: "12px",
                background: "rgba(255,255,255,0.9)",
                padding: "10px",
                borderRadius: "6px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                fontSize: "0.9rem",
                lineHeight: "1.4",
                color: "#1f2937",
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: "6px" }}>Pollution</div>
            {items.map((item) => (
                <div
                    key={item.label}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                    <span
                        style={{
                            display: "inline-block",
                            width: "14px",
                            height: "14px",
                            backgroundColor: item.color,
                            borderRadius: "3px",
                            border: "1px solid #111827",
                        }}
                    />
                    <span>{item.label}</span>
                    <span style={{ color: "#6b7280" }}>{item.rangeLabel}</span>
                </div>
            ))}
        </div>
    );
}

function MapStatus({ message }) {
    return (
        <div
            style={{
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                color: "#374151",
                padding: "10px 12px",
                borderRadius: "6px",
                marginBottom: "10px",
            }}
        >
            {message}
        </div>
    );
}

function LayerToggles({
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
                background: "rgba(255,255,255,0.95)",
                padding: "10px",
                borderRadius: "6px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                fontSize: "0.9rem",
                color: "#111827",
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: "6px" }}>Layers</div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input type="checkbox" checked={showZonesLayer} onChange={onToggleZones} />
                Zones
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input type="checkbox" checked={showPointsLayer} onChange={onTogglePoints} />
                Points
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                    type="checkbox"
                    checked={showHeatmapLayer}
                    onChange={onToggleHeatmap}
                />
                Heatmap
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
    const [geojson, setGeojson] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showZonesLayer, setShowZonesLayer] = useState(true);
    const [showPointsLayer, setShowPointsLayer] = useState(true);
    const [showHeatmapLayer, setShowHeatmapLayer] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch("/api/v1/map/zones")
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load zones (status ${response.status})`);
                }
                return response.json();
            })
            .then((data) => {
                if (!cancelled) {
                    setGeojson(data);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

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
        return <MapStatus message={`Advanced map unavailable: ${error}`} />;
    }

    return (
        <div style={{ position: "relative" }}>
            {!hasSimulationResult && (
                <MapStatus message="Run a simulation to display the advanced layers." />
            )}
            {loading && <MapStatus message="Loading zones for the map..." />}
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
