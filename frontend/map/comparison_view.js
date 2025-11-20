import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { LayerGroup, MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-side-by-side";

import { BaseTileLayer, TrafficMarkers } from "./leaflet_layers";
import { HeatmapLayer } from "./layers/heatmap_layer";
import { PointsLayer } from "./layers/points_layer";
import { ZonesLayer } from "./layers/zones_layer";
import {
    DEFAULT_ZOOM,
    LayerToggles,
    Legend,
    MapStatus,
    VALLE_CENTER,
} from "./index";
import {
    attachMetricsToGeoJson,
    computeLatestMetricsFromSimulation,
    deriveLegendData,
} from "./utils_geo";
import { useZonesGeoJson } from "./use_zones_geojson";

const BADGE_COLORS = {
    A: "#1d4ed8",
    B: "#b91c1c",
};

function ScenarioBadge({ label, variant }) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#0f172a",
                fontSize: "0.95rem",
                fontWeight: 600,
            }}
        >
            <span
                style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: BADGE_COLORS[variant] ?? "#475569",
                    display: "inline-block",
                }}
            />
            {label}
        </span>
    );
}

function prepareScenarioLayers(geojson, metrics) {
    if (!geojson || !metrics) return { preparedGeoJson: null, legend: null, hasData: false };

    const preparedGeoJson = attachMetricsToGeoJson(geojson, metrics);
    const legendModel = deriveLegendData({
        zonesData: metrics.zonesData,
        pointsData: metrics.pointsData,
        pollutionByZone: metrics.pollutionByZone,
    });

    const hasData = Boolean(
        (metrics.pollutionByZone && Object.keys(metrics.pollutionByZone).length > 0)
        || (metrics.trafficByZone && Object.keys(metrics.trafficByZone).length > 0)
    );

    return { preparedGeoJson, legend: legendModel.legend, hasData };
}

function SideBySideMaps({
    labelA,
    labelB,
    preparedGeoJsonA,
    preparedGeoJsonB,
    metricsA,
    metricsB,
    legendA,
    legendB,
    showZonesLayer,
    showPointsLayer,
    showHeatmapLayer,
    tileLayer,
    height,
}) {
    const mapARef = useRef(null);
    const mapBRef = useRef(null);
    const syncingRef = useRef(false);

    useEffect(() => {
        const mapA = mapARef.current;
        const mapB = mapBRef.current;
        if (!mapA || !mapB) return undefined;

        const sync = (source, target) => () => {
            if (syncingRef.current) return;
            syncingRef.current = true;
            target.setView(source.getCenter(), source.getZoom(), { animate: false });
            syncingRef.current = false;
        };

        const handlerA = sync(mapA, mapB);
        const handlerB = sync(mapB, mapA);
        mapA.on("moveend zoomend", handlerA);
        mapB.on("moveend zoomend", handlerB);

        return () => {
            mapA.off("moveend zoomend", handlerA);
            mapB.off("moveend zoomend", handlerB);
        };
    }, []);

    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
            }}
        >
            <div style={{ flex: "1 1 420px" }}>
                <div style={{ marginBottom: "6px", fontWeight: 700, color: "#0f172a" }}>
                    Scenario A • {labelA}
                </div>
                <div style={{ position: "relative" }}>
                    <MapContainer
                        center={VALLE_CENTER}
                        zoom={DEFAULT_ZOOM}
                        scrollWheelZoom
                        style={{ height, width: "100%", borderRadius: "8px", overflow: "hidden" }}
                        whenCreated={(map) => {
                            mapARef.current = map;
                        }}
                    >
                        <BaseTileLayer tileLayer={tileLayer} />
                        {preparedGeoJsonA && (
                            <>
                                {showZonesLayer && (
                                    <ZonesLayer geojson={preparedGeoJsonA} metrics={metricsA} />
                                )}
                                {showZonesLayer && (
                                    <TrafficMarkers
                                        features={preparedGeoJsonA.features}
                                        trafficByZone={metricsA.trafficByZone}
                                    />
                                )}
                            </>
                        )}
                        {metricsA.pointsData && metricsA.pointsData.length > 0 && showPointsLayer && (
                            <PointsLayer points={metricsA.pointsData} />
                        )}
                        {metricsA.heatmapData && metricsA.heatmapData.length > 0 && showHeatmapLayer && (
                            <HeatmapLayer heatmapData={metricsA.heatmapData} />
                        )}
                    </MapContainer>
                    <Legend items={legendA} />
                </div>
            </div>

            <div style={{ flex: "1 1 420px" }}>
                <div style={{ marginBottom: "6px", fontWeight: 700, color: "#0f172a" }}>
                    Scenario B • {labelB}
                </div>
                <div style={{ position: "relative" }}>
                    <MapContainer
                        center={VALLE_CENTER}
                        zoom={DEFAULT_ZOOM}
                        scrollWheelZoom
                        style={{ height, width: "100%", borderRadius: "8px", overflow: "hidden" }}
                        whenCreated={(map) => {
                            mapBRef.current = map;
                        }}
                    >
                        <BaseTileLayer tileLayer={tileLayer} />
                        {preparedGeoJsonB && (
                            <>
                                {showZonesLayer && (
                                    <ZonesLayer geojson={preparedGeoJsonB} metrics={metricsB} />
                                )}
                                {showZonesLayer && (
                                    <TrafficMarkers
                                        features={preparedGeoJsonB.features}
                                        trafficByZone={metricsB.trafficByZone}
                                    />
                                )}
                            </>
                        )}
                        {metricsB.pointsData && metricsB.pointsData.length > 0 && showPointsLayer && (
                            <PointsLayer points={metricsB.pointsData} />
                        )}
                        {metricsB.heatmapData && metricsB.heatmapData.length > 0 && showHeatmapLayer && (
                            <HeatmapLayer heatmapData={metricsB.heatmapData} />
                        )}
                    </MapContainer>
                    <Legend items={legendB} />
                </div>
            </div>
        </div>
    );
}

function OverlayMap({
    labelA,
    labelB,
    preparedGeoJsonA,
    preparedGeoJsonB,
    metricsA,
    metricsB,
    combinedLegend,
    showZonesLayer,
    showPointsLayer,
    showHeatmapLayer,
    tileLayer,
    height,
}) {
    const mapRef = useRef(null);
    const leftGroupRef = useRef(null);
    const rightGroupRef = useRef(null);
    const controlRef = useRef(null);
    const [layerVersion, setLayerVersion] = useState(0);

    useEffect(() => {
        if (!mapRef.current || !leftGroupRef.current || !rightGroupRef.current) return undefined;
        if (controlRef.current) {
            controlRef.current.remove();
            controlRef.current = null;
        }
        controlRef.current = L.control.sideBySide(
            leftGroupRef.current,
            rightGroupRef.current,
        );
        controlRef.current.addTo(mapRef.current);

        return () => {
            if (controlRef.current) {
                controlRef.current.remove();
                controlRef.current = null;
            }
        };
    }, [layerVersion]);

    const registerLeftGroup = (layer) => {
        leftGroupRef.current = layer;
        setLayerVersion((value) => value + 1);
    };

    const registerRightGroup = (layer) => {
        rightGroupRef.current = layer;
        setLayerVersion((value) => value + 1);
    };

    return (
        <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                <ScenarioBadge label={`A • ${labelA}`} variant="A" />
                <ScenarioBadge label={`B • ${labelB}`} variant="B" />
            </div>
            <MapContainer
                key="overlay-compare"
                center={VALLE_CENTER}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom
                style={{ height, width: "100%", borderRadius: "8px", overflow: "hidden" }}
                whenCreated={(map) => {
                    mapRef.current = map;
                }}
            >
                <BaseTileLayer tileLayer={tileLayer} />
                <LayerGroup ref={registerLeftGroup}>
                    <BaseTileLayer tileLayer={tileLayer} />
                    {preparedGeoJsonA && showZonesLayer && (
                        <ZonesLayer geojson={preparedGeoJsonA} metrics={metricsA} />
                    )}
                    {preparedGeoJsonA && showZonesLayer && (
                        <TrafficMarkers
                            features={preparedGeoJsonA.features}
                            trafficByZone={metricsA.trafficByZone}
                        />
                    )}
                    {metricsA.pointsData && metricsA.pointsData.length > 0 && showPointsLayer && (
                        <PointsLayer points={metricsA.pointsData} />
                    )}
                    {metricsA.heatmapData && metricsA.heatmapData.length > 0 && showHeatmapLayer && (
                        <HeatmapLayer heatmapData={metricsA.heatmapData} />
                    )}
                </LayerGroup>

                <LayerGroup ref={registerRightGroup}>
                    <BaseTileLayer tileLayer={tileLayer} />
                    {preparedGeoJsonB && showZonesLayer && (
                        <ZonesLayer geojson={preparedGeoJsonB} metrics={metricsB} />
                    )}
                    {preparedGeoJsonB && showZonesLayer && (
                        <TrafficMarkers
                            features={preparedGeoJsonB.features}
                            trafficByZone={metricsB.trafficByZone}
                        />
                    )}
                    {metricsB.pointsData && metricsB.pointsData.length > 0 && showPointsLayer && (
                        <PointsLayer points={metricsB.pointsData} />
                    )}
                    {metricsB.heatmapData && metricsB.heatmapData.length > 0 && showHeatmapLayer && (
                        <HeatmapLayer heatmapData={metricsB.heatmapData} />
                    )}
                </LayerGroup>
            </MapContainer>
            <Legend items={combinedLegend} />
        </div>
    );
}

function ComparisonView({
    resultA,
    resultB,
    labelA = "Scenario A",
    labelB = "Scenario B",
    mode = "side-by-side",
    tileLayer,
    height = 520,
}) {
    const { geojson, loading, error } = useZonesGeoJson();
    const [showZonesLayer, setShowZonesLayer] = useState(true);
    const [showPointsLayer, setShowPointsLayer] = useState(true);
    const [showHeatmapLayer, setShowHeatmapLayer] = useState(false);

    const metricsA = useMemo(
        () => computeLatestMetricsFromSimulation(resultA),
        [resultA],
    );
    const metricsB = useMemo(
        () => computeLatestMetricsFromSimulation(resultB),
        [resultB],
    );

    const scenarioAData = useMemo(
        () => prepareScenarioLayers(geojson, metricsA),
        [geojson, metricsA],
    );
    const scenarioBData = useMemo(
        () => prepareScenarioLayers(geojson, metricsB),
        [geojson, metricsB],
    );

    const combinedLegendModel = useMemo(() => {
        const mergedZonesData = [
            ...(metricsA.zonesData ?? []),
            ...(metricsB.zonesData ?? []),
        ];
        const mergedPoints = [
            ...(metricsA.pointsData ?? []),
            ...(metricsB.pointsData ?? []),
        ];
        return deriveLegendData({
            zonesData: mergedZonesData,
            pointsData: mergedPoints,
            pollutionByZone: {
                ...(metricsA.pollutionByZone ?? {}),
                ...(metricsB.pollutionByZone ?? {}),
            },
        });
    }, [metricsA, metricsB]);

    const hasComparisonData = Boolean(resultA && resultB);

    if (error) {
        return <MapStatus message={`Comparison map unavailable: ${error}`} />;
    }

    if (!hasComparisonData) {
        return (
            <MapStatus message="Configure scenarios A and B, then run a comparison to see the maps." />
        );
    }

    return (
        <div style={{ position: "relative" }}>
            {loading && <MapStatus message="Loading base zones for comparison..." />}
            <LayerToggles
                showZonesLayer={showZonesLayer}
                showPointsLayer={showPointsLayer}
                showHeatmapLayer={showHeatmapLayer}
                onToggleZones={() => setShowZonesLayer((value) => !value)}
                onTogglePoints={() => setShowPointsLayer((value) => !value)}
                onToggleHeatmap={() => setShowHeatmapLayer((value) => !value)}
            />

            {mode === "overlay" ? (
                <OverlayMap
                    labelA={labelA}
                    labelB={labelB}
                    preparedGeoJsonA={scenarioAData.preparedGeoJson}
                    preparedGeoJsonB={scenarioBData.preparedGeoJson}
                    metricsA={metricsA}
                    metricsB={metricsB}
                    combinedLegend={combinedLegendModel.legend}
                    showZonesLayer={showZonesLayer}
                    showPointsLayer={showPointsLayer}
                    showHeatmapLayer={showHeatmapLayer}
                    tileLayer={tileLayer}
                    height={height}
                />
            ) : (
                <SideBySideMaps
                    labelA={labelA}
                    labelB={labelB}
                    preparedGeoJsonA={scenarioAData.preparedGeoJson}
                    preparedGeoJsonB={scenarioBData.preparedGeoJson}
                    metricsA={metricsA}
                    metricsB={metricsB}
                    legendA={scenarioAData.legend}
                    legendB={scenarioBData.legend}
                    showZonesLayer={showZonesLayer}
                    showPointsLayer={showPointsLayer}
                    showHeatmapLayer={showHeatmapLayer}
                    tileLayer={tileLayer}
                    height={height}
                />
            )}
        </div>
    );
}

export default ComparisonView;
