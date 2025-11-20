import { useEffect, useState } from "react";

export function useZonesGeoJson() {
    const [geojson, setGeojson] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

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

    return { geojson, loading, error };
}
