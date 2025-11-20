import { useEffect, useState } from "react";

import { apiFetch } from "../services/api_client";
import { UI_TEXTS_ES } from "../constants/texts_es";

export function useZonesGeoJson() {
    const [geojson, setGeojson] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        apiFetch("/api/v1/map/zones")
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(UI_TEXTS_ES.messages.failedLoadZones(response.status));
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
