import { buildZoneDataLookup, normalizeZoneName } from "../map/utils_geo";

function average(values = []) {
    const numeric = (values ?? []).filter((value) => Number.isFinite(value));
    if (numeric.length === 0) return null;
    const total = numeric.reduce((acc, value) => acc + value, 0);
    return total / numeric.length;
}

function maxValue(values = []) {
    const numeric = (values ?? []).filter((value) => Number.isFinite(value));
    if (numeric.length === 0) return null;
    return Math.max(...numeric);
}

function clampUnit(value) {
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(1, value));
}

export function buildRecommendationRequest(simulationResult, useLlm = false) {
    if (!simulationResult) return null;

    const zones = simulationResult.zones ?? [];
    if (!Array.isArray(zones) || zones.length === 0) return null;

    const zoneDataByZone = buildZoneDataLookup(simulationResult.zones_data ?? []);
    const pollutionSeries = simulationResult.pollution ?? {};
    const trafficSeries = simulationResult.traffic ?? {};

    const perZoneEntries = [];
    const pm25Averages = [];
    const congestionValues = [];
    let pm25Max = 0;

    zones.forEach((zone) => {
        const normalized = normalizeZoneName(zone) || zone;
        const zoneData = zoneDataByZone[normalized] ?? {};

        const pollution = pollutionSeries[zone] ?? pollutionSeries[normalized] ?? [];
        const traffic = trafficSeries[zone] ?? trafficSeries[normalized] ?? [];

        const seriesPmAvg = average(pollution);
        const seriesPmMax = maxValue(pollution);
        const pm25Value = Number.isFinite(zoneData.avg_pm25)
            ? zoneData.avg_pm25
            : seriesPmAvg ?? seriesPmMax;

        const pm25Peak = Number.isFinite(seriesPmMax)
            ? seriesPmMax
            : Number.isFinite(zoneData.avg_pm25)
                ? zoneData.avg_pm25
                : null;

        const congestionFromData = Number.isFinite(zoneData.traffic_rel)
            ? clampUnit(zoneData.traffic_rel)
            : null;
        const congestionFromSeries = clampUnit(maxValue(traffic));
        const congestion = congestionFromData ?? congestionFromSeries;

        if (Number.isFinite(pm25Value)) {
            pm25Averages.push(pm25Value);
        }
        if (Number.isFinite(pm25Peak)) {
            pm25Max = Math.max(pm25Max, pm25Peak);
        }
        if (congestion !== null) {
            congestionValues.push(congestion);
        }

        perZoneEntries.push({
            name: zoneData.zone ?? zone,
            pm25: Number.isFinite(pm25Value) ? pm25Value : 0,
            congestion: congestion ?? 0,
        });
    });

    const overallAvg = pm25Averages.length > 0 ? average(pm25Averages) : pm25Max;
    const overallCongestion = congestionValues.length > 0 ? Math.max(...congestionValues) : 0;

    return {
        kpis: {
            pm25_max: pm25Max,
            pm25_avg: overallAvg ?? 0,
            congestion_index: overallCongestion,
            zones: perZoneEntries,
        },
        context: {
            scenario_name: simulationResult.scenario ?? null,
        },
        use_llm: Boolean(useLlm),
    };
}
