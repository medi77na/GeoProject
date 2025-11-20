import { UI_TEXTS_ES } from "../constants/texts_es";

const API_KEY_HEADER = "X-API-Key";
const API_KEY = process.env.REACT_APP_API_KEY || "change_me_in_production";

function buildUrl(baseUrl = "", path = "") {
    const base = (baseUrl ?? "").replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
}

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
        throw new Error(UI_TEXTS_ES.errors.error401);
    }

    return response;
}

async function postJson(path, payload, backendUrl = "") {
    const url = buildUrl(backendUrl, path);
    const response = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const detail = await response.text();
        if (response.status === 401) {
            throw new Error(UI_TEXTS_ES.errors.error401);
        }
        if (response.status === 400) {
            throw new Error(UI_TEXTS_ES.errors.invalidParameters);
        }
        const generic = `${UI_TEXTS_ES.errors.serverError} (estado ${response.status})`;
        const message = detail || generic;
        throw new Error(message);
    }

    return response.json();
}

export function getApiKeyHeaderName() {
    return API_KEY_HEADER;
}

export function fetchSimulation(payload, backendUrl = "") {
    return postJson("/api/v1/simulate", payload, backendUrl);
}

export function fetchSimulationComparison(payload, backendUrl = "") {
    return postJson("/api/v1/simulate/compare", payload, backendUrl);
}

export function fetchRecommendations(payload, backendUrl = "") {
    return postJson("/api/v1/recommend", payload, backendUrl);
}
