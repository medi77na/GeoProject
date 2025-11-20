export async function fetchRecommendations(payload, backendUrl = "") {
    const base = (backendUrl ?? "").replace(/\/$/, "");
    const url = `${base}/api/v1/recommend`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const detail = await response.text();
        const message = detail || `Recommend request failed with status ${response.status}`;
        throw new Error(message);
    }

    return response.json();
}
