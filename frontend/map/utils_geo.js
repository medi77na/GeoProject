import { getZoneColor } from "./zone_styles";

const ZONE_ALIASES = {
    bello: "Bello",
    medellin: "Medellin",
    "medellín": "Medellin",
    envigado: "Envigado",
    itagui: "Itagui",
    "itagüí": "Itagui",
};

export function normalizeZoneName(zoneName) {
    if (!zoneName) return zoneName;
    const key = zoneName.toString().trim().toLowerCase();
    return ZONE_ALIASES[key] ?? zoneName;
}

export function computeLatestMetricsFromSimulation(simulationResult) {
    if (!simulationResult) {
        return { pollutionByZone: {}, trafficByZone: {}, zones: [] };
    }

    const zones = simulationResult.zones ?? [];
    const pollutionSeries = simulationResult.pollution ?? {};
    const trafficSeries = simulationResult.traffic ?? {};

    const pollutionByZone = {};
    const trafficByZone = {};

    zones.forEach((zone) => {
        const key = normalizeZoneName(zone);
        const pollutionValues = pollutionSeries[zone] ?? pollutionSeries[key] ?? [];
        const trafficValues = trafficSeries[zone] ?? trafficSeries[key] ?? [];

        if (Array.isArray(pollutionValues) && pollutionValues.length > 0) {
            pollutionByZone[key] = pollutionValues[pollutionValues.length - 1];
        }
        if (Array.isArray(trafficValues) && trafficValues.length > 0) {
            trafficByZone[key] = trafficValues[trafficValues.length - 1];
        }
    });

    return { zones, pollutionByZone, trafficByZone };
}

export function featureCentroid(feature) {
    if (!feature) return null;
    const propertiesCenter = feature.properties?.center;
    if (
        propertiesCenter
        && Array.isArray(propertiesCenter)
        && propertiesCenter.length === 2
    ) {
        return propertiesCenter;
    }

    const ring = feature.geometry?.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length === 0) {
        return null;
    }

    let sumLat = 0;
    let sumLng = 0;
    ring.forEach((coord) => {
        if (!Array.isArray(coord) || coord.length !== 2) {
            return;
        }
        const [lng, lat] = coord;
        sumLat += lat;
        sumLng += lng;
    });

    return [sumLat / ring.length, sumLng / ring.length];
}

export function mergeMetricsIntoFeatures(
    features,
    pollutionByZone = {},
    trafficByZone = {},
) {
    return (features ?? []).map((feature) => {
        const name = feature?.properties?.name;
        const normalized = normalizeZoneName(name);
        const pollutionValue = pollutionByZone[normalized];
        const trafficValue = trafficByZone[normalized];

        return {
            ...feature,
            properties: {
                ...(feature.properties ?? {}),
                name,
                pollution: pollutionValue,
                traffic: trafficValue,
                centroid: featureCentroid(feature),
            },
        };
    });
}

export function attachMetricsToGeoJson(geojson, metrics) {
    if (!geojson) return null;
    const { pollutionByZone = {}, trafficByZone = {} } = metrics ?? {};
    return {
        ...geojson,
        features: mergeMetricsIntoFeatures(
            geojson.features,
            pollutionByZone,
            trafficByZone,
        ),
    };
}

export function deriveLegendData(pollutionByZone) {
    const values = Object.values(pollutionByZone ?? {});
    const hasData = values.length > 0;
    return {
        legend: [
            { label: "Low", color: getZoneColor(10) },
            { label: "Medium", color: getZoneColor(25) },
            { label: "High", color: getZoneColor(40) },
            { label: "Critical", color: getZoneColor(60) },
        ],
        hasData,
    };
}
