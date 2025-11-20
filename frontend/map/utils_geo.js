import { buildPollutionLegend, getZoneColor } from "./zone_styles";

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

export function buildZoneDataLookup(zonesData = []) {
    return (zonesData ?? []).reduce((acc, entry) => {
        if (!entry || !entry.zone) return acc;
        const key = normalizeZoneName(entry.zone);
        acc[key] = entry;
        return acc;
    }, {});
}

export function computeLatestMetricsFromSimulation(simulationResult) {
    if (!simulationResult) {
        return {
            pollutionByZone: {},
            trafficByZone: {},
            zones: [],
            zonesData: [],
            pointsData: [],
            heatmapData: [],
            zoneDataByZone: {},
        };
    }

    const zones = simulationResult.zones ?? [];
    const pollutionSeries = simulationResult.pollution ?? {};
    const trafficSeries = simulationResult.traffic ?? {};
    const zonesData = simulationResult.zones_data ?? [];
    const pointsData = simulationResult.points_data ?? [];
    const heatmapData = simulationResult.heatmap_data ?? [];

    const zoneDataByZone = buildZoneDataLookup(zonesData);
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

    Object.entries(zoneDataByZone).forEach(([normalizedZone, entry]) => {
        if (typeof entry.avg_pm25 === "number") {
            pollutionByZone[normalizedZone] = entry.avg_pm25;
        }
        if (
            typeof entry.traffic_rel === "number"
            && !Number.isNaN(entry.traffic_rel)
        ) {
            trafficByZone[normalizedZone] = entry.traffic_rel;
        }
    });

    return {
        zones,
        pollutionByZone,
        trafficByZone,
        zonesData,
        pointsData,
        heatmapData,
        zoneDataByZone,
    };
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
    zoneDataByZone = {},
) {
    return (features ?? []).map((feature) => {
        const name = feature?.properties?.name;
        const normalized = normalizeZoneName(name);
        const zoneData = zoneDataByZone[normalized] ?? {};
        const pollutionValue = zoneData.avg_pm25 ?? pollutionByZone[normalized];
        const trafficValue = zoneData.traffic_rel ?? trafficByZone[normalized];

        return {
            ...feature,
            properties: {
                ...(feature.properties ?? {}),
                name,
                pollution: pollutionValue,
                avg_pm25: pollutionValue,
                traffic: trafficValue,
                traffic_rel: zoneData.traffic_rel,
                centroid: featureCentroid(feature),
            },
        };
    });
}

export function attachMetricsToGeoJson(geojson, metrics) {
    if (!geojson) return null;
    const {
        pollutionByZone = {},
        trafficByZone = {},
        zoneDataByZone = {},
    } = metrics ?? {};
    return {
        ...geojson,
        features: mergeMetricsIntoFeatures(
            geojson.features,
            pollutionByZone,
            trafficByZone,
            zoneDataByZone,
        ),
    };
}

export function deriveLegendData({
    zonesData = [],
    pointsData = [],
    pollutionByZone = {},
} = {}) {
    const values = [];
    (zonesData ?? []).forEach((entry) => {
        if (entry && typeof entry.avg_pm25 === "number") {
            values.push(entry.avg_pm25);
        }
    });

    if (values.length === 0) {
        (pointsData ?? []).forEach((entry) => {
            if (entry && typeof entry.pm25 === "number") {
                values.push(entry.pm25);
            }
        });
    }

    if (values.length === 0) {
        Object.values(pollutionByZone ?? {}).forEach((value) => {
            if (typeof value === "number") {
                values.push(value);
            }
        });
    }

    const hasData = values.length > 0;
    return {
        legend: buildPollutionLegend(values),
        hasData,
        min: hasData ? Math.min(...values) : null,
        max: hasData ? Math.max(...values) : null,
    };
}
