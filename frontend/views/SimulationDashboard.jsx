import React, { useMemo, useState } from "react";

import ComparisonView from "../map/comparison_view";
import UrbanMap from "../map";
import { fetchRecommendations } from "../api/recommendationApi";
import RecommendationsPanel from "../components/RecommendationsPanel";
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
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "12px",
                background: "#fff",
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: "10px", color: "#0f172a" }}>{title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    Label (legend)
                    <input
                        type="text"
                        value={config.label}
                        onChange={(event) => onChange({ ...config, label: event.target.value })}
                        placeholder="Baseline / Mitigation"
                        style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #e5e7eb" }}
                    />
                </label>
                <label>
                    Scenario
                    <select
                        value={config.scenario}
                        onChange={(event) => onChange({ ...config, scenario: event.target.value })}
                        style={{ marginLeft: "8px" }}
                    >
                        <option value="A">A</option>
                        <option value="B">B</option>
                    </select>
                </label>
                <label>
                    Traffic level
                    <select
                        value={config.traffic_level}
                        onChange={(event) => onChange({ ...config, traffic_level: event.target.value })}
                        style={{ marginLeft: "8px" }}
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </label>
                <label>
                    Horizon
                    <input
                        type="number"
                        min="1"
                        value={config.horizon}
                        onChange={(event) => onChange({ ...config, horizon: event.target.value })}
                        style={{ marginLeft: "8px", width: "100px" }}
                    />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="checkbox"
                        checked={config.pico_placa_enabled}
                        onChange={(event) => onChange({ ...config, pico_placa_enabled: event.target.checked })}
                    />
                    Pico y placa enabled
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
    const [activeView, setActiveView] = useState("single");
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
        setError(null);
        setLoading(true);
        setActiveView("single");
        resetRecommendationState();

        const payload = {
            ...DEFAULT_SIM_PAYLOAD,
            scenario: singleScenario,
            horizon: resolveHorizon(singleHorizon),
            traffic_level: singleTrafficLevel,
        };

        try {
            const response = await fetch(simulateUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Simulation failed (status ${response.status})`);
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
            const response = await fetch(compareUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Comparison failed (status ${response.status})`);
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
        <div className="simulation-dashboard">
            <header style={{ marginBottom: "16px" }}>
                <h1 style={{ margin: 0 }}>Urban Simulator – Phase 2 Dashboard</h1>
                <p style={{ margin: "6px 0 0 0", color: "#4b5563" }}>
                    Run simulations and visualize the Valle de Aburrá map with dynamic zone styling.
                </p>
            </header>

            <section
                style={{
                    background: "#f8fafc",
                    border: "1px solid #e5e5eb",
                    padding: "16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                }}
            >
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <label>
                        Scenario
                        <select
                            value={singleScenario}
                            onChange={(event) => setSingleScenario(event.target.value)}
                            style={{ marginLeft: "8px" }}
                        >
                            <option value="A">A</option>
                            <option value="B">B</option>
                        </select>
                    </label>

                    <label>
                        Traffic level
                        <select
                            value={singleTrafficLevel}
                            onChange={(event) => setSingleTrafficLevel(event.target.value)}
                            style={{ marginLeft: "8px" }}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </label>

                    <label>
                        Horizon
                        <input
                            type="number"
                            min="1"
                            value={singleHorizon}
                            onChange={(event) => setSingleHorizon(event.target.value)}
                            style={{ marginLeft: "8px", width: "80px" }}
                        />
                    </label>

                    <button
                        type="button"
                        onClick={runSimulation}
                        disabled={loading}
                        style={{
                            padding: "8px 14px",
                            background: "#2563eb",
                            color: "white",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        {loading ? "Running..." : "Run simulation"}
                    </button>
                </div>
                {error && (
                    <div
                        style={{
                            marginTop: "10px",
                            color: "#b91c1c",
                            border: "1px solid #fecdd3",
                            background: "#fff1f2",
                            padding: "8px",
                            borderRadius: "6px",
                        }}
                    >
                        {error}
                    </div>
                )}
                {simulationResult && (
                    <div style={{ marginTop: "10px", color: "#0f172a" }}>
                        Latest run:
                        {" "}
                        {simulationResult.scenario}
                        {" "}
                        |
                        {" "}
                        Zones:
                        {" "}
                        {simulationResult.zones?.join(", ")}
                        {" "}
                        |
                        {" "}
                        Steps:
                        {" "}
                        {simulationResult.time?.length ?? 0}
                    </div>
                )}
                <div style={{ marginTop: "14px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                            type="checkbox"
                            checked={useLlm}
                            onChange={(event) => setUseLlm(event.target.checked)}
                        />
                        Use AI commentary (LLM)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                            type="checkbox"
                            checked={autoRecommend}
                            onChange={(event) => setAutoRecommend(event.target.checked)}
                        />
                        Simulate and recommend automatically
                    </label>
                    <button
                        type="button"
                        onClick={() => generateRecommendation()}
                        disabled={recommendationStatus === "loading" || !simulationResult}
                        style={{
                            padding: "8px 14px",
                            background: "#0f172a",
                            color: "white",
                            borderRadius: "6px",
                            border: "none",
                            cursor: recommendationStatus === "loading" || !simulationResult ? "not-allowed" : "pointer",
                            opacity: recommendationStatus === "loading" || !simulationResult ? 0.7 : 1,
                        }}
                    >
                        {recommendationStatus === "loading" ? "Generating..." : "Generate recommendation"}
                    </button>
                </div>
            </section>

            <section
                style={{
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    padding: "16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: "4px" }}>Scenario comparison</div>
                        <div style={{ color: "#475569" }}>Configure two payloads and run the A/B comparison endpoint.</div>
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
                                padding: "8px 14px",
                                background: "#0ea5e9",
                                color: "white",
                                borderRadius: "6px",
                                border: "none",
                                cursor: "pointer",
                            }}
                        >
                            {comparisonLoading ? "Running..." : "Run comparison"}
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
                    <div
                        style={{
                            marginTop: "10px",
                            color: "#b91c1c",
                            border: "1px solid #fecdd3",
                            background: "#fff1f2",
                            padding: "8px",
                            borderRadius: "6px",
                        }}
                    >
                        {comparisonError}
                    </div>
                )}
                {comparisonResult && (
                    <div style={{ marginTop: "12px", color: "#0f172a" }}>
                        Comparison ready: A = {resolvedLabelA} • B = {resolvedLabelB} (steps {comparisonResult.result_a?.time?.length ?? "?"})
                    </div>
                )}
            </section>

            <section
                style={{
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    padding: "16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                }}
            >
                <div style={{ marginBottom: "10px" }}>
                    <h2 style={{ margin: 0 }}>Recommendations</h2>
                    <p style={{ margin: "4px 0 0 0", color: "#475569" }}>
                        Transform the latest simulation KPIs into rule-based actions. Severity is driven by PM2.5 and congestion.
                    </p>
                </div>
                <RecommendationsPanel
                    recommendation={recommendation}
                    status={recommendationStatus}
                    error={recommendationError}
                />
            </section>

            <section>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <h2 style={{ margin: 0 }}>Visualization</h2>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button
                            type="button"
                            onClick={() => setActiveView("single")}
                            style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: activeView === "single" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                                background: activeView === "single" ? "#eff6ff" : "#fff",
                                cursor: "pointer",
                            }}
                        >
                            Single simulation
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveView("comparison")}
                            style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: activeView === "comparison" ? "2px solid #0ea5e9" : "1px solid #cbd5e1",
                                background: activeView === "comparison" ? "#e0f2fe" : "#fff",
                                cursor: "pointer",
                            }}
                        >
                            Comparison view
                        </button>
                    </div>
                </div>

                {activeView === "comparison" ? (
                    <ComparisonView
                        resultA={comparisonResult?.result_a}
                        resultB={comparisonResult?.result_b}
                        labelA={resolvedLabelA}
                        labelB={resolvedLabelB}
                        mode={comparisonMode}
                    />
                ) : (
                    <UrbanMap
                        simulationResult={simulationResult}
                        pollutionByZone={latestPollution}
                        trafficByZone={latestTraffic}
                    />
                )}
            </section>
        </div>
    );
}

export default SimulationDashboard;
