const API_KEY_HEADER = "X-API-Key";
const API_KEY = process.env.REACT_APP_API_KEY || "change_me_in_production";

export async function apiFetch(url, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        [API_KEY_HEADER]: API_KEY,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        throw new Error("Invalid or missing API Key. Please contact the system administrator.");
    }

    return response;
}

export function getApiKeyHeaderName() {
    return API_KEY_HEADER;
}
