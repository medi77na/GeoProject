const POLLUTION_BUCKETS = [
    { label: "Low", min: 0, max: 20, color: "#4caf50" },
    { label: "Medium", min: 20, max: 35, color: "#f0c040" },
    { label: "High", min: 35, max: 50, color: "#f57c00" },
    { label: "Critical", min: 50, max: Infinity, color: "#c0392b" },
];

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
    const pollutionValue = zoneName ? pollutionByZone[zoneName] : undefined;

    return {
        fillColor: getZoneColor(pollutionValue),
        weight: 1,
        opacity: 1,
        color: "#1f2937",
        dashArray: "2",
        fillOpacity: 0.65,
    };
}

export function buildPollutionLegend() {
    return POLLUTION_BUCKETS.map((bucket) => {
        const suffix = bucket.max === Infinity ? "+" : `–${bucket.max}`;
        return {
            label: bucket.label,
            color: bucket.color,
            rangeLabel: `${bucket.min}${suffix} μg/m³`,
        };
    });
}
