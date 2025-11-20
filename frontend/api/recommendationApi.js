import { apiFetch } from "./client";

export async function fetchRecommendations(payload, backendUrl = "") {
    const base = (backendUrl ?? "").replace(/\/$/, "");
    const url = `${base}/api/v1/recommend`;

    const response = await apiFetch(
        url,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );

    if (!response.ok) {
        const detail = await response.text();
        const message = detail || `Recommend request failed with status ${response.status}`;
        throw new Error(message);
    }

    return response.json();
}
