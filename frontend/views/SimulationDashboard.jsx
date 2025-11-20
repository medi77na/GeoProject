import React, { useMemo, useState } from "react";

import UrbanMap from "../map";

const DEFAULT_SIM_PAYLOAD = {
    scenario: "B",
    zones: ["Bello", "Medellin", "Envigado", "Itagui"],
    horizon: 24,
    traffic_level: "medium",
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

function SimulationDashboard({ backendUrl = "" }) {
    const [scenario, setScenario] = useState(DEFAULT_SIM_PAYLOAD.scenario);
    const [trafficLevel, setTrafficLevel] = useState(DEFAULT_SIM_PAYLOAD.traffic_level);
    const [horizon, setHorizon] = useState(DEFAULT_SIM_PAYLOAD.horizon);
    const [simulationResult, setSimulationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    const simulateUrl = useMemo(() => {
        const base = backendUrl?.replace(/\/$/, "") ?? "";
        return `${base}/api/v1/simulate`;
    }, [backendUrl]);

    const runSimulation = async () => {
        setError(null);
        setLoading(true);

        const payload = {
            ...DEFAULT_SIM_PAYLOAD,
            scenario,
            horizon: Number(horizon),
            traffic_level: trafficLevel,
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
        } catch (err) {
            setError(err.message);
            setSimulationResult(null);
        } finally {
            setLoading(false);
        }
    };

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
                    border: "1px solid #e5e7eb",
                    padding: "16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                }}
            >
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <label>
                        Scenario
                        <select
                            value={scenario}
                            onChange={(event) => setScenario(event.target.value)}
                            style={{ marginLeft: "8px" }}
                        >
                            <option value="A">A</option>
                            <option value="B">B</option>
                        </select>
                    </label>

                    <label>
                        Traffic level
                        <select
                            value={trafficLevel}
                            onChange={(event) => setTrafficLevel(event.target.value)}
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
                            value={horizon}
                            onChange={(event) => setHorizon(event.target.value)}
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
            </section>

            <section>
                <h2 style={{ margin: "0 0 8px 0" }}>Advanced Leaflet Map</h2>
                <UrbanMap
                    simulationResult={simulationResult}
                    pollutionByZone={latestPollution}
                    trafficByZone={latestTraffic}
                />
            </section>
        </div>
    );
}

export default SimulationDashboard;
