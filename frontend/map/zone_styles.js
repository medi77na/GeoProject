export const POLLUTION_BUCKETS = [
    { key: "low", label: "Low", min: 0, max: 20, color: "#0ea5e9" },
    { key: "moderate", label: "Moderate", min: 20, max: 35, color: "#22c55e" },
    { key: "high", label: "High", min: 35, max: 50, color: "#f59e0b" },
    { key: "critical", label: "Critical", min: 50, max: Infinity, color: "#dc2626" },
];

export const HEATMAP_GRADIENT = {
    0.15: "#0ea5e9",
    0.35: "#22c55e",
    0.65: "#f59e0b",
    1: "#dc2626",
};

export function getZoneColor(pollutionValue) {
    if (pollutionValue === undefined || pollutionValue === null) {
        return "#9ca3af";
    }

    const bucket = POLLUTION_BUCKETS.find(
        (range) => pollutionValue >= range.min && pollutionValue < range.max,
    );
    return bucket ? bucket.color : "#9ca3af";
}

export function getZoneStyle(feature, metrics) {
    const zoneName = feature?.properties?.name;
    const pollutionByZone = metrics?.pollutionByZone ?? {};
    const featurePollution = feature?.properties?.avg_pm25 ?? feature?.properties?.pollution;
    const pollutionValue = featurePollution ?? (zoneName ? pollutionByZone[zoneName] : undefined);

    return {
        fillColor: getZoneColor(pollutionValue),
        weight: 1,
        opacity: 1,
        color: "#1f2937",
        dashArray: "2",
        fillOpacity: 0.65,
    };
}

function formatRangeLabel(bucket, minValue, maxValue) {
    const hasValues = typeof minValue === "number" && typeof maxValue === "number";
    if (!hasValues) {
        const suffix = bucket.max === Infinity ? "+" : `–${bucket.max}`;
        return `${bucket.min}${suffix} μg/m³`;
    }

    const lower = Math.max(bucket.min, minValue);
    const upperBound = bucket.max === Infinity ? maxValue : Math.min(bucket.max, maxValue);
    if (upperBound < lower) {
        const suffix = bucket.max === Infinity ? "+" : `–${bucket.max}`;
        return `${bucket.min}${suffix} μg/m³`;
    }
    if (bucket.max === Infinity) {
        return `${lower.toFixed(1)}+ μg/m³`;
    }
    return `${lower.toFixed(1)}–${upperBound.toFixed(1)} μg/m³`;
}

export function buildPollutionLegend(values = []) {
    const hasValues = Array.isArray(values) && values.length > 0;
    const minValue = hasValues ? Math.min(...values) : undefined;
    const maxValue = hasValues ? Math.max(...values) : undefined;

    return POLLUTION_BUCKETS.map((bucket) => {
        return {
            label: bucket.label,
            color: bucket.color,
            rangeLabel: formatRangeLabel(bucket, minValue, maxValue),
        };
    });
}
