import React, { useMemo, useState } from "react";

import ComparisonView from "../map/comparison_view";
import UrbanMap from "../map";
import { fetchRecommendations } from "../api/recommendationApi";
import RecommendationsPanel from "../components/RecommendationsPanel";
import { apiFetch } from "../api/client";
import { buildRecommendationRequest } from "./recommendationMapper";

const DEFAULT_SIM_PAYLOAD = {
    scenario: "B",
    zones: ["Bello", "Medellin", "Envigado", "Itagui"],
    horizon: 24,
    traffic_level: "medium",
};

const DEFAULT_SCENARIO_A = {
    label: "Scenario A (baseline)",
    scenario: "A",
    traffic_level: "medium",
    horizon: DEFAULT_SIM_PAYLOAD.horizon,
    pico_placa_enabled: false,
    cargo_restriction_enabled: false,
};

const DEFAULT_SCENARIO_B = {
    label: "Scenario B (policy)",
    scenario: "B",
    traffic_level: "medium",
    horizon: DEFAULT_SIM_PAYLOAD.horizon,
    pico_placa_enabled: true,
    cargo_restriction_enabled: true,
};

function extractLastValues(seriesByZone = {}, zones = []) {
    const result = {};
    zones.forEach((zone) => {
        const values = seriesByZone[zone];
        if (Array.isArray(values) && values.length > 0) {
            result[zone] = values[values.length - 1];
        }
    });
    return result;
}

function ScenarioConfigForm({ title, config, onChange }) {
    return (
        <div
            style={{
                flex: "1 1 320px",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "14px",
                background: "#fff",
                minWidth: "280px",
            }}
        >
            <div style={{ fontWeight: 800, marginBottom: "10px", color: "#0f172a" }}>{title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <FieldLabel
                        label="Legend label"
                        hint="Displayed in the comparison legend."
                        htmlFor={`${title}-label`}
                        tooltip="Name each scenario so the comparison legend is clear."
                    />
                    <input
                        id={`${title}-label`}
                        type="text"
                        value={config.label}
                        onChange={(event) => onChange({ ...config, label: event.target.value })}
                        placeholder="Baseline / Mitigation"
                        style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}
                    />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", alignItems: "end" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FieldLabel label="Scenario" htmlFor={`${title}-scenario`} tooltip="Scenario A (baseline) vs Scenario B (intervention)" />
                        <select
                            id={`${title}-scenario`}
                            value={config.scenario}
                            onChange={(event) => onChange({ ...config, scenario: event.target.value })}
                            style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}
                        >
                            <option value="A">A</option>
                            <option value="B">B</option>
                        </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FieldLabel label="Traffic level" htmlFor={`${title}-traffic`} tooltip="Higher traffic increases baseline congestion." />
                        <select
                            id={`${title}-traffic`}
                            value={config.traffic_level}
                            onChange={(event) => onChange({ ...config, traffic_level: event.target.value })}
                            style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FieldLabel label="Horizon" htmlFor={`${title}-horizon`} hint="Time steps" tooltip="Minimum 1. Higher values increase runtime." />
                        <input
                            id={`${title}-horizon`}
                            type="number"
                            min="1"
                            value={config.horizon}
                            onChange={(event) => onChange({ ...config, horizon: event.target.value })}
                            style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}
                        />
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", color: "#0f172a" }} title="Toggle peak-hour restrictions for private vehicles.">
                        <input
                            type="checkbox"
                            checked={config.pico_placa_enabled}
                            onChange={(event) => onChange({ ...config, pico_placa_enabled: event.target.checked })}
                        />
                        Pico y placa enabled
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", color: "#0f172a" }} title="Restrict heavy-duty cargo circulation during the horizon.">
                        <input
                            type="checkbox"
                            checked={config.cargo_restriction_enabled}
                            onChange={(event) => onChange({
                                ...config,
                                cargo_restriction_enabled: event.target.checked,
                            })}
                        />
                        Cargo restriction enabled
                    </label>
                    <div style={{ color: "#475569", fontSize: "0.9rem" }}>Advanced policy toggles are optional and only affect the A/B comparison payload.</div>
                </div>
            </div>
        </div>
    );
}

const alertTone = {
    info: { background: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
    success: { background: "#ecfdf3", border: "#bbf7d0", color: "#15803d" },
    warning: { background: "#fffbeb", border: "#fef3c7", color: "#92400e" },
    error: { background: "#fef2f2", border: "#fee2e2", color: "#b91c1c" },
    muted: { background: "#f8fafc", border: "#e2e8f0", color: "#475569" },
};

function InlineAlert({ tone = "info", title, message }) {
    const palette = alertTone[tone] ?? alertTone.info;
    return (
        <div
            style={{
                background: palette.background,
                border: `1px solid ${palette.border}`,
                color: palette.color,
                padding: "10px 12px",
                borderRadius: "10px",
                fontSize: "0.95rem",
            }}
        >
            {title && <div style={{ fontWeight: 700, marginBottom: "4px" }}>{title}</div>}
            <div>{message}</div>
        </div>
    );
}

function SectionCard({ step, title, subtitle, children }) {
    return (
        <section
            style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                padding: "16px",
                borderRadius: "12px",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", color: "#2563eb", fontWeight: 700 }}>
                        {step ? `Section ${step}` : "Section"}
                        <span style={{ display: "inline-block", height: "12px", width: "1px", background: "#cbd5e1" }} />
                        <span style={{ color: "#0f172a" }}>{title}</span>
                    </div>
                    {subtitle && <div style={{ color: "#475569", marginTop: "4px", fontSize: "0.95rem" }}>{subtitle}</div>}
                </div>
            </div>
            {children}
        </section>
    );
}

function FieldLabel({ label, hint, htmlFor, tooltip }) {
    return (
        <label htmlFor={htmlFor} style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: 600, color: "#0f172a", fontSize: "0.95rem" }} title={tooltip}>
            <span>{label}</span>
            {hint && <span style={{ color: "#475569", fontWeight: 400, fontSize: "0.9rem" }}>{hint}</span>}
        </label>
    );
}

function KpiPanel({ simulationResult, pollutionByZone, trafficByZone }) {
    if (!simulationResult) {
        return (
            <InlineAlert
                tone="muted"
                message="No results yet. Run the simulation to populate KPIs for each sector."
            />
        );
    }

    const zones = simulationResult.zones ?? [];
    if (!zones.length) {
        return (
            <InlineAlert
                tone="warning"
                title="Missing zones"
                message="The backend did not return any zones for this run."
            />
        );
    }

    const horizon = simulationResult.time?.length ?? 0;
    const scenarioLabel = simulationResult.scenario ? `Scenario ${simulationResult.scenario}` : "Scenario";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc", color: "#0f172a", minWidth: "180px" }}>
                    <div style={{ fontWeight: 700 }}>{scenarioLabel}</div>
                    <div style={{ color: "#475569", fontSize: "0.95rem" }}>Horizon: {horizon} steps</div>
                </div>
                <div style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc", color: "#0f172a", minWidth: "180px" }}>
                    <div style={{ fontWeight: 700 }}>Traffic level</div>
                    <div style={{ color: "#475569", fontSize: "0.95rem" }}>{simulationResult.traffic_level ?? "n/a"}</div>
                </div>
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                }}
            >
                {zones.map((zone) => {
                    const pollution = pollutionByZone?.[zone] ?? pollutionByZone?.[zone?.toLowerCase()] ?? null;
                    const traffic = trafficByZone?.[zone] ?? trafficByZone?.[zone?.toLowerCase()] ?? null;
                    return (
                        <div
                            key={zone}
                            style={{
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                padding: "12px",
                                background: "#fff",
                            }}
                        >
                            <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>{zone}</div>
                            <div style={{ color: "#475569", fontSize: "0.95rem" }}>
                                PM2.5 (last step):{" "}
                                <strong>{Number.isFinite(pollution) ? `${pollution.toFixed(1)} μg/m³` : "n/a"}</strong>
                            </div>
                            <div style={{ color: "#475569", fontSize: "0.95rem", marginTop: "4px" }}>
                                Traffic (rel.):{" "}
                                <strong>{Number.isFinite(traffic) ? traffic.toFixed(2) : "n/a"}</strong>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SimulationDashboard({ backendUrl = "" }) {
    const [singleScenario, setSingleScenario] = useState(DEFAULT_SIM_PAYLOAD.scenario);
    const [singleTrafficLevel, setSingleTrafficLevel] = useState(DEFAULT_SIM_PAYLOAD.traffic_level);
    const [singleHorizon, setSingleHorizon] = useState(DEFAULT_SIM_PAYLOAD.horizon);
    const [simulationResult, setSimulationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [scenarioA, setScenarioA] = useState(DEFAULT_SCENARIO_A);
    const [scenarioB, setScenarioB] = useState(DEFAULT_SCENARIO_B);
    const [comparisonMode, setComparisonMode] = useState("side-by-side");
    const [comparisonResult, setComparisonResult] = useState(null);
    const [comparisonLoading, setComparisonLoading] = useState(false);
    const [comparisonError, setComparisonError] = useState(null);
    const [recommendation, setRecommendation] = useState(null);
    const [recommendationStatus, setRecommendationStatus] = useState("idle");
    const [recommendationError, setRecommendationError] = useState(null);
    const [useLlm, setUseLlm] = useState(false);
    const [autoRecommend, setAutoRecommend] = useState(false);

    const resolveHorizon = (value) => {
        const numeric = Number(value ?? DEFAULT_SIM_PAYLOAD.horizon);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return DEFAULT_SIM_PAYLOAD.horizon;
        }
        return numeric;
    };

    const latestPollution = useMemo(() => {
        if (!simulationResult) return {};
        return extractLastValues(
            simulationResult.pollution,
            simulationResult.zones,
        );
    }, [simulationResult]);

    const latestTraffic = useMemo(() => {
        if (!simulationResult) return {};
        return extractLastValues(
            simulationResult.traffic,
            simulationResult.zones,
        );
    }, [simulationResult]);

    const baseApiUrl = useMemo(
        () => (backendUrl ?? "").replace(/\/$/, ""),
        [backendUrl],
    );

    const simulateUrl = useMemo(
        () => `${baseApiUrl}/api/v1/simulate`,
        [baseApiUrl],
    );

    const compareUrl = useMemo(
        () => `${baseApiUrl}/api/v1/simulate/compare`,
        [baseApiUrl],
    );

    const buildScenarioPayload = (config) => ({
        ...DEFAULT_SIM_PAYLOAD,
        scenario: config.scenario,
        horizon: resolveHorizon(config.horizon),
        traffic_level: config.traffic_level,
        pico_placa_enabled: Boolean(config.pico_placa_enabled),
        cargo_restriction_enabled: Boolean(config.cargo_restriction_enabled),
    });

    const resetRecommendationState = () => {
        setRecommendation(null);
        setRecommendationStatus("idle");
        setRecommendationError(null);
    };

    const generateRecommendation = async (resultOverride = null) => {
        const sourceResult = resultOverride ?? simulationResult;
        if (!sourceResult) {
            setRecommendationStatus("idle");
            setRecommendationError("Run a simulation first to generate recommendations.");
            return;
        }

        const payload = buildRecommendationRequest(sourceResult, useLlm);
        if (!payload) {
            setRecommendationStatus("idle");
            setRecommendationError("Simulation data is incomplete for recommendations.");
            return;
        }

        setRecommendationStatus("loading");
        setRecommendationError(null);
        try {
            const data = await fetchRecommendations(payload, baseApiUrl);
            setRecommendation(data);
            const hasActions = Array.isArray(data.recommendations) && data.recommendations.length > 0;
            setRecommendationStatus(hasActions ? "ready" : "empty");
        } catch (err) {
            setRecommendationStatus("error");
            setRecommendationError(err.message || "Failed to generate recommendations.");
        }
    };

    const runSimulation = async () => {
        const horizonValue = resolveHorizon(singleHorizon);
        if (!Number.isFinite(horizonValue) || horizonValue < 1) {
            setSimulationResult(null);
            resetRecommendationState();
            setError("Please provide a horizon of at least 1 time step to run the simulation.");
            return;
        }

        setError(null);
        setLoading(true);
        setActiveView("single");
        resetRecommendationState();

        const payload = {
            ...DEFAULT_SIM_PAYLOAD,
            scenario: singleScenario,
            horizon: horizonValue,
            traffic_level: singleTrafficLevel,
        };

        try {
            const response = await apiFetch(simulateUrl, {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const friendly = response.status === 401
                    ? "Simulation failed: API key missing or invalid (401)."
                    : `Simulation failed (status ${response.status}). Please retry.`;
                throw new Error(friendly);
            }

            const data = await response.json();
            setSimulationResult(data);
            if (autoRecommend) {
                await generateRecommendation(data);
            }
        } catch (err) {
            setError(err.message);
            setSimulationResult(null);
            resetRecommendationState();
        } finally {
            setLoading(false);
        }
    };

    const runComparison = async () => {
        setComparisonError(null);
        setComparisonLoading(true);

        const payload = {
            label_a: scenarioA.label || undefined,
            label_b: scenarioB.label || undefined,
            scenario_a: buildScenarioPayload(scenarioA),
            scenario_b: buildScenarioPayload(scenarioB),
        };

        try {
            const response = await apiFetch(compareUrl, {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const friendly = response.status === 401
                    ? "Comparison failed: API key missing or invalid (401)."
                    : `Comparison failed (status ${response.status}). Please check the parameters.`;
                throw new Error(friendly);
            }

            const data = await response.json();
            setComparisonResult(data);
            setActiveView("comparison");
        } catch (err) {
            setComparisonError(err.message);
            setComparisonResult(null);
        } finally {
            setComparisonLoading(false);
        }
    };

    const resolvedLabelA = comparisonResult?.label_a || scenarioA.label || "Scenario A";
    const resolvedLabelB = comparisonResult?.label_b || scenarioB.label || "Scenario B";

    return (
        <div className="simulation-dashboard" style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px" }}>
            <header style={{ marginBottom: "4px" }}>
                <h1 style={{ margin: 0 }}>Urban Simulator – Phase 2 Dashboard</h1>
                <p style={{ margin: "6px 0 0 0", color: "#4b5563", fontSize: "0.98rem" }}>
                    Follow the ordered steps to configure parameters, run scenario A, explore the map layers, compare A/B, and request recommendations.
                </p>
            </header>

            <SectionCard
                step="1"
                title="Simulation parameters"
                subtitle="Set scenario A inputs before sending them to the /api/v1/simulate endpoint."
            >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FieldLabel label="Scenario" htmlFor="single-scenario" tooltip="Choose A for baseline or B for intervention." />
                        <select
                            id="single-scenario"
                            value={singleScenario}
                            onChange={(event) => setSingleScenario(event.target.value)}
                            style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}
                        >
                            <option value="A">A</option>
                            <option value="B">B</option>
                        </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FieldLabel
                            label="Traffic level"
                            htmlFor="single-traffic"
                            hint="Advanced: baseline congestion level."
                            tooltip="Adjusts starting congestion across the network."
                        />
                        <select
                            id="single-traffic"
                            value={singleTrafficLevel}
                            onChange={(event) => setSingleTrafficLevel(event.target.value)}
                            style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FieldLabel
                            label="Horizon"
                            htmlFor="single-horizon"
                            hint="Time steps (>= 1)"
                            tooltip="Longer horizons simulate more time steps and may slow responses."
                        />
                        <input
                            id="single-horizon"
                            type="number"
                            min="1"
                            value={singleHorizon}
                            onChange={(event) => setSingleHorizon(event.target.value)}
                            style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}
                        />
                    </div>
                </div>
                <InlineAlert
                    tone="info"
                    message="Tip: keep horizons between 12–72 steps for fast, stable runs. Traffic level and restrictions are validated before sending."
                />
            </SectionCard>

            <SectionCard
                step="2"
                title="Run Simulation (A)"
                subtitle="Send the configured parameters to the backend and wait for the latest KPIs."
            >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                    <button
                        type="button"
                        onClick={runSimulation}
                        disabled={loading}
                        style={{
                            padding: "10px 16px",
                            background: "#2563eb",
                            color: "white",
                            borderRadius: "10px",
                            border: "none",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            minWidth: "160px",
                            fontSize: "0.95rem",
                        }}
                        aria-busy={loading}
                    >
                        {loading ? "Running simulation..." : "Run Simulation"}
                    </button>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#0f172a", fontSize: "0.95rem" }} title="Adds AI-generated context to the recommended actions.">
                            <input
                                type="checkbox"
                                checked={useLlm}
                                onChange={(event) => setUseLlm(event.target.checked)}
                            />
                            Use AI commentary
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#0f172a", fontSize: "0.95rem" }} title="Automatically request recommendations after each successful run.">
                            <input
                                type="checkbox"
                                checked={autoRecommend}
                                onChange={(event) => setAutoRecommend(event.target.checked)}
                            />
                            Auto-generate recommendations
                        </label>
                    </div>
                </div>
                {loading && (
                    <InlineAlert
                        tone="info"
                        message="Waiting for the backend... this may take a few seconds depending on the horizon."
                    />
                )}
                {error && <InlineAlert tone="error" title="Validation or API issue" message={error} />}
                {!loading && !simulationResult && !error && (
                    <InlineAlert tone="muted" message="No results yet. Configure parameters above and click Run Simulation." />
                )}
                {simulationResult && (
                    <InlineAlert
                        tone="success"
                        title="Latest run"
                        message={`Scenario ${simulationResult.scenario} • Zones: ${simulationResult.zones?.join(", ") ?? "n/a"} • Steps: ${simulationResult.time?.length ?? 0}`}
                    />
                )}
            </SectionCard>

            <SectionCard
                step="3"
                title="Map visualization"
                subtitle="Explore the Valle de Aburrá map. Layers: sectors, monitoring points, and heatmap."
            >
                {!simulationResult && <InlineAlert tone="muted" message="Run a simulation to see the styled sectors, points, and heatmap on the map." />}
                <UrbanMap
                    simulationResult={simulationResult}
                    pollutionByZone={latestPollution}
                    trafficByZone={latestTraffic}
                />
            </SectionCard>

            <SectionCard
                step="4"
                title="KPIs"
                subtitle="Per-sector indicators based on the latest time step from the simulation."
            >
                <KpiPanel
                    simulationResult={simulationResult}
                    pollutionByZone={latestPollution}
                    trafficByZone={latestTraffic}
                />
            </SectionCard>

            <SectionCard
                step="5"
                title="Comparison A/B"
                subtitle="Construct two scenarios and compare them visually (side-by-side or overlay slider)."
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ color: "#475569", fontSize: "0.95rem" }}>
                        Fill the A and B cards with traffic and policy toggles, then run the comparison request.
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input
                                type="radio"
                                value="side-by-side"
                                checked={comparisonMode === "side-by-side"}
                                onChange={(event) => setComparisonMode(event.target.value)}
                            />
                            Side-by-side
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input
                                type="radio"
                                value="overlay"
                                checked={comparisonMode === "overlay"}
                                onChange={(event) => setComparisonMode(event.target.value)}
                            />
                            Overlay (slider)
                        </label>
                        <button
                            type="button"
                            onClick={runComparison}
                            disabled={comparisonLoading}
                            style={{
                                padding: "10px 14px",
                                background: "#0ea5e9",
                                color: "white",
                                borderRadius: "10px",
                                border: "none",
                                cursor: comparisonLoading ? "not-allowed" : "pointer",
                                fontWeight: 700,
                                minWidth: "170px",
                                fontSize: "0.95rem",
                            }}
                        >
                            {comparisonLoading ? "Comparing..." : "Compare Scenarios"}
                        </button>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
                    <ScenarioConfigForm
                        title="Scenario A"
                        config={scenarioA}
                        onChange={setScenarioA}
                    />
                    <ScenarioConfigForm
                        title="Scenario B"
                        config={scenarioB}
                        onChange={setScenarioB}
                    />
                </div>

                {comparisonError && (
                    <InlineAlert tone="error" title="Comparison error" message={comparisonError} />
                )}
                {comparisonResult && (
                    <InlineAlert
                        tone="success"
                        title="Comparison ready"
                        message={`A = ${resolvedLabelA} • B = ${resolvedLabelB} (steps ${comparisonResult.result_a?.time?.length ?? "?"})`}
                    />
                )}

                <ComparisonView
                    resultA={comparisonResult?.result_a}
                    resultB={comparisonResult?.result_b}
                    labelA={resolvedLabelA}
                    labelB={resolvedLabelB}
                    mode={comparisonMode}
                />
            </SectionCard>

            <SectionCard
                step="6"
                title="Recommendations"
                subtitle="Request rule-based mitigation actions, with optional AI commentary."
            >
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                        type="button"
                        onClick={() => generateRecommendation()}
                        disabled={recommendationStatus === "loading" || !simulationResult}
                        style={{
                            padding: "10px 14px",
                            background: "#0f172a",
                            color: "white",
                            borderRadius: "10px",
                            border: "none",
                            cursor: recommendationStatus === "loading" || !simulationResult ? "not-allowed" : "pointer",
                            opacity: recommendationStatus === "loading" || !simulationResult ? 0.7 : 1,
                            fontWeight: 700,
                            minWidth: "180px",
                            fontSize: "0.95rem",
                        }}
                    >
                        {recommendationStatus === "loading" ? "Loading..." : "Get Recommendations"}
                    </button>
                    {!simulationResult && (
                        <span style={{ color: "#475569", fontSize: "0.95rem" }}>
                            Run Simulation first to populate KPIs and unlock this button.
                        </span>
                    )}
                </div>
                <RecommendationsPanel
                    recommendation={recommendation}
                    status={recommendationStatus}
                    error={recommendationError}
                />
            </SectionCard>
        </div>
    );
}

export default SimulationDashboard;
