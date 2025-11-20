import React, { useMemo, useState } from "react";

import ComparisonView from "../map/comparison_view";
import UrbanMap from "../map";
import RecommendationsPanel from "../components/RecommendationsPanel";
import { UI_TEXTS_ES } from "../constants/texts_es";
import {
    fetchRecommendations,
    fetchSimulation,
    fetchSimulationComparison,
} from "../services/api_client";
import { buildRecommendationRequest } from "./recommendationMapper";

const T = UI_TEXTS_ES;

const DEFAULT_SIM_PAYLOAD = {
    scenario: "B",
    zones: ["Bello", "Medellin", "Envigado", "Itagui"],
    horizon: 24,
    traffic_level: "medium",
};

const DEFAULT_SCENARIO_A = {
    label: T.options.scenarios.defaultLabelA,
    scenario: "A",
    traffic_level: "medium",
    horizon: DEFAULT_SIM_PAYLOAD.horizon,
    pico_placa_enabled: false,
    cargo_restriction_enabled: false,
};

const DEFAULT_SCENARIO_B = {
    label: T.options.scenarios.defaultLabelB,
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
                        label={T.form.legendLabel}
                        hint={T.form.legendHint}
                        htmlFor={`${title}-label`}
                        tooltip={T.form.legendTooltip}
                    />
                    <input
                        id={`${title}-label`}
                        type="text"
                        value={config.label}
                        onChange={(event) => onChange({ ...config, label: event.target.value })}
                        placeholder={T.form.legendPlaceholder}
                        style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}
                    />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", alignItems: "end" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FieldLabel label={T.form.scenario} htmlFor={`${title}-scenario`} tooltip={T.form.scenarioTooltip} />
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
                        <FieldLabel label={T.form.trafficLevel} htmlFor={`${title}-traffic`} tooltip={T.form.trafficTooltip} />
                        <select
                            id={`${title}-traffic`}
                            value={config.traffic_level}
                            onChange={(event) => onChange({ ...config, traffic_level: event.target.value })}
                            style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}
                        >
                            <option value="low">{T.options.traffic.low}</option>
                            <option value="medium">{T.options.traffic.medium}</option>
                            <option value="high">{T.options.traffic.high}</option>
                        </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FieldLabel label={T.form.horizon} htmlFor={`${title}-horizon`} hint={T.form.horizonHint} tooltip={T.form.horizonTooltip} />
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
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", color: "#0f172a" }} title={T.form.picoYPlacaTooltip}>
                        <input
                            type="checkbox"
                            checked={config.pico_placa_enabled}
                            onChange={(event) => onChange({ ...config, pico_placa_enabled: event.target.checked })}
                        />
                        {T.form.picoYPlaca}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", color: "#0f172a" }} title={T.form.cargoRestrictionTooltip}>
                        <input
                            type="checkbox"
                            checked={config.cargo_restriction_enabled}
                            onChange={(event) => onChange({
                                ...config,
                                cargo_restriction_enabled: event.target.checked,
                            })}
                        />
                        {T.form.cargoRestriction}
                    </label>
                    <div style={{ color: "#475569", fontSize: "0.9rem" }}>{T.form.advancedNote}</div>
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
                        {step ? `${T.sections.sectionLabel} ${step}` : T.sections.sectionLabel}
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
                message={T.sections.kpis.noResults}
            />
        );
    }

    const zones = simulationResult.zones ?? [];
    if (!zones.length) {
        return (
            <InlineAlert
                tone="warning"
                title={T.sections.kpis.missingZonesTitle}
                message={T.sections.kpis.missingZonesMessage}
            />
        );
    }

    const horizon = simulationResult.time?.length ?? 0;
    const scenarioLabel = simulationResult.scenario
        ? `${T.sections.kpis.scenarioLabel} ${simulationResult.scenario}`
        : T.sections.kpis.scenarioLabel;
    const trafficLevelLabel = T.options.traffic[simulationResult.traffic_level] ?? simulationResult.traffic_level ?? T.sections.kpis.notAvailable;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc", color: "#0f172a", minWidth: "180px" }}>
                    <div style={{ fontWeight: 700 }}>{scenarioLabel}</div>
                    <div style={{ color: "#475569", fontSize: "0.95rem" }}>{`${T.sections.kpis.horizonLabel}: ${horizon} ${T.sections.kpis.horizonSteps}`}</div>
                </div>
                <div style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc", color: "#0f172a", minWidth: "180px" }}>
                    <div style={{ fontWeight: 700 }}>{T.sections.kpis.trafficLabel}</div>
                    <div style={{ color: "#475569", fontSize: "0.95rem" }}>{trafficLevelLabel}</div>
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
                                {T.sections.kpis.pollutionLatest}{" "}
                                <strong>{Number.isFinite(pollution) ? `${pollution.toFixed(1)} μg/m³` : T.sections.kpis.notAvailable}</strong>
                            </div>
                            <div style={{ color: "#475569", fontSize: "0.95rem", marginTop: "4px" }}>
                                {T.sections.kpis.trafficRelative}{" "}
                                <strong>{Number.isFinite(traffic) ? traffic.toFixed(2) : T.sections.kpis.notAvailable}</strong>
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
    const [activeView, setActiveView] = useState("single");

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
            setRecommendationError(T.messages.runFirstForRecommendation);
            return;
        }

        const payload = buildRecommendationRequest(sourceResult, useLlm);
        if (!payload) {
            setRecommendationStatus("idle");
            setRecommendationError(T.messages.incompleteForRecommendation);
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
            setRecommendationError(err.message || T.recommendations.statuses.errorGeneric);
        }
    };

    const runSimulation = async () => {
        const horizonValue = resolveHorizon(singleHorizon);
        if (!Number.isFinite(horizonValue) || horizonValue < 1) {
            setSimulationResult(null);
            resetRecommendationState();
            setError(T.messages.horizonInvalid);
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
            const data = await fetchSimulation(payload, baseApiUrl);
            setSimulationResult(data);
            if (autoRecommend) {
                await generateRecommendation(data);
            }
        } catch (err) {
            setError(err.message || T.messages.simulationFailed);
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
            const data = await fetchSimulationComparison(payload, baseApiUrl);
            setComparisonResult(data);
            setActiveView("comparison");
        } catch (err) {
            setComparisonError(err.message || T.messages.comparisonFailed);
            setComparisonResult(null);
        } finally {
            setComparisonLoading(false);
        }
    };

    const resolvedLabelA = comparisonResult?.label_a || scenarioA.label || T.options.scenarios.labelA;
    const resolvedLabelB = comparisonResult?.label_b || scenarioB.label || T.options.scenarios.labelB;

    return (
        <div className="simulation-dashboard" style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px" }}>
            <header style={{ marginBottom: "4px" }}>
                <h1 style={{ margin: 0 }}>{T.app.title}</h1>
                <p style={{ margin: "6px 0 0 0", color: "#4b5563", fontSize: "0.98rem" }}>
                    {T.app.intro}
                </p>
            </header>

            <SectionCard
                step="1"
                title={T.sections.simulationParams.title}
                subtitle={T.sections.simulationParams.subtitle}
            >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FieldLabel label={T.form.scenario} htmlFor="single-scenario" tooltip={T.form.scenarioTooltip} />
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
                            label={T.form.trafficLevel}
                            htmlFor="single-traffic"
                            hint={T.form.trafficTooltip}
                            tooltip={T.form.trafficTooltip}
                        />
                        <select
                            id="single-traffic"
                            value={singleTrafficLevel}
                            onChange={(event) => setSingleTrafficLevel(event.target.value)}
                            style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}
                        >
                            <option value="low">{T.options.traffic.low}</option>
                            <option value="medium">{T.options.traffic.medium}</option>
                            <option value="high">{T.options.traffic.high}</option>
                        </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FieldLabel
                            label={T.form.horizon}
                            htmlFor="single-horizon"
                            hint={T.form.horizonHint}
                            tooltip={T.form.horizonTooltip}
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
                    message={T.sections.runSimulation.tip}
                />
            </SectionCard>

            <SectionCard
                step="2"
                title={T.sections.runSimulation.title}
                subtitle={T.sections.runSimulation.subtitle}
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
                        {loading ? T.buttons.runningSimulation : T.buttons.runSimulation}
                    </button>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#0f172a", fontSize: "0.95rem" }} title={T.toggles.useAiTooltip}>
                            <input
                                type="checkbox"
                                checked={useLlm}
                                onChange={(event) => setUseLlm(event.target.checked)}
                            />
                            {T.toggles.useAi}
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#0f172a", fontSize: "0.95rem" }} title={T.toggles.autoRecommendTooltip}>
                            <input
                                type="checkbox"
                                checked={autoRecommend}
                                onChange={(event) => setAutoRecommend(event.target.checked)}
                            />
                            {T.toggles.autoRecommend}
                        </label>
                    </div>
                </div>
                {loading && (
                    <InlineAlert
                        tone="info"
                        message={T.messages.waitingBackend}
                    />
                )}
                {error && <InlineAlert tone="error" title={T.messages.validationOrApi} message={error} />}
                {!loading && !simulationResult && !error && (
                    <InlineAlert tone="muted" message={T.messages.noResultsYet} />
                )}
                {simulationResult && (
                    <InlineAlert
                        tone="success"
                        title={T.messages.latestRunTitle}
                        message={`${T.sections.kpis.scenarioLabel} ${simulationResult.scenario} • Zonas: ${simulationResult.zones?.join(", ") ?? T.sections.kpis.notAvailable} • Pasos: ${simulationResult.time?.length ?? 0}`}
                    />
                )}
            </SectionCard>

            <SectionCard
                step="3"
                title={T.sections.mapVisualization.title}
                subtitle={T.sections.mapVisualization.subtitle}
            >
                {!simulationResult && <InlineAlert tone="muted" message={T.sections.mapVisualization.empty} />}
                <UrbanMap
                    simulationResult={simulationResult}
                    pollutionByZone={latestPollution}
                    trafficByZone={latestTraffic}
                />
            </SectionCard>

            <SectionCard
                step="4"
                title={T.sections.kpis.title}
                subtitle={T.sections.kpis.subtitle}
            >
                <KpiPanel
                    simulationResult={simulationResult}
                    pollutionByZone={latestPollution}
                    trafficByZone={latestTraffic}
                />
            </SectionCard>

            <SectionCard
                step="5"
                title={T.sections.comparison.title}
                subtitle={T.sections.comparison.subtitle}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ color: "#475569", fontSize: "0.95rem" }}>{T.sections.comparison.instructions}</div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input
                                type="radio"
                                value="side-by-side"
                                checked={comparisonMode === "side-by-side"}
                                onChange={(event) => setComparisonMode(event.target.value)}
                            />
                            {T.sections.comparison.sideBySide}
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <input
                                type="radio"
                                value="overlay"
                                checked={comparisonMode === "overlay"}
                                onChange={(event) => setComparisonMode(event.target.value)}
                            />
                            {T.sections.comparison.overlay}
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
                            {comparisonLoading ? T.buttons.comparing : T.buttons.compareScenarios}
                        </button>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
                    <ScenarioConfigForm
                        title={T.options.scenarios.labelA}
                        config={scenarioA}
                        onChange={setScenarioA}
                    />
                    <ScenarioConfigForm
                        title={T.options.scenarios.labelB}
                        config={scenarioB}
                        onChange={setScenarioB}
                    />
                </div>

                {comparisonError && (
                    <InlineAlert tone="error" title={T.sections.comparison.errorTitle} message={comparisonError} />
                )}
                {comparisonResult && (
                    <InlineAlert
                        tone="success"
                        title={T.sections.comparison.successTitle}
                        message={T.sections.comparison.successMessage(
                            resolvedLabelA,
                            resolvedLabelB,
                            comparisonResult.result_a?.time?.length ?? "?",
                        )}
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
                title={T.sections.recommendations.title}
                subtitle={T.sections.recommendations.subtitle}
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
                        {recommendationStatus === "loading" ? T.buttons.loadingRecommendations : T.buttons.getRecommendations}
                    </button>
                    {!simulationResult && (
                        <span style={{ color: "#475569", fontSize: "0.95rem" }}>
                            {T.sections.recommendations.locked}
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
