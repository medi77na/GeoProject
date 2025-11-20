import React, { useEffect, useMemo, useState } from "react";
import { MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { BaseTileLayer, TrafficMarkers, ZoneLayer } from "./leaflet_layers";
import { buildPollutionLegend } from "./zone_styles";
import {
    attachMetricsToGeoJson,
    computeLatestMetricsFromSimulation,
} from "./utils_geo";

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
        };
    }, [pollutionByZone, trafficByZone, latestFromSimulation]);

    const preparedGeoJson = useMemo(() => {
        if (!geojson) return null;
        return attachMetricsToGeoJson(geojson, metrics);
    }, [geojson, metrics]);

    const legendModel = useMemo(() => buildPollutionLegend(), []);

    const hasSimulationData = useMemo(() => {
        return (
            (metrics.pollutionByZone && Object.keys(metrics.pollutionByZone).length > 0)
            || (metrics.trafficByZone && Object.keys(metrics.trafficByZone).length > 0)
        );
    }, [metrics]);

    if (error) {
        return <MapStatus message={`Advanced map unavailable: ${error}`} />;
    }

    return (
        <div style={{ position: "relative" }}>
            {!hasSimulationData && (
                <MapStatus message="Run a simulation to display the advanced map." />
            )}
            {loading && <MapStatus message="Loading zones for the map..." />}
            <MapContainer
                center={VALLE_CENTER}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom
                style={{ height, width: "100%", borderRadius: "8px", overflow: "hidden" }}
            >
                <BaseTileLayer tileLayer={tileLayer} />
                {preparedGeoJson && (
                    <>
                        <ZoneLayer geojson={preparedGeoJson} metrics={metrics} />
                        <TrafficMarkers
                            features={preparedGeoJson.features}
                            trafficByZone={metrics.trafficByZone}
                        />
                    </>
                )}
            </MapContainer>
            <Legend items={legendModel} />
        </div>
    );
}

export default UrbanMap;
