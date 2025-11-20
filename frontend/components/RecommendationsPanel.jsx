import React from "react";

import { UI_TEXTS_ES } from "../constants/texts_es";

const T = UI_TEXTS_ES;

const severityStyles = {
    low: { label: T.severity.low, color: "#16a34a", background: "#dcfce7" },
    moderate: { label: T.severity.moderate, color: "#ca8a04", background: "#fef9c3" },
    high: { label: T.severity.high, color: "#f97316", background: "#ffedd5" },
    critical: { label: T.severity.critical, color: "#dc2626", background: "#fee2e2" },
};

function SeverityBadge({ severity }) {
    if (!severity) return null;
    const style = severityStyles[severity] ?? severityStyles.low;
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "999px",
                background: style.background,
                color: style.color,
                fontWeight: 700,
                textTransform: "capitalize",
            }}
        >
            {style.label}
        </span>
    );
}

function RecommendationList({ items = [] }) {
    if (!items || items.length === 0) return (
        <div style={{ color: "#475569" }}>{T.recommendations.listEmpty}</div>
    );
    return (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {items.map((item) => (
                <li
                    key={item.code}
                    style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "12px",
                        background: "#fff",
                    }}
                >
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{item.title}</div>
                    <div style={{ color: "#475569", marginTop: "4px", fontSize: "0.95rem" }}>{item.description}</div>
                    <div style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "6px" }}>{`${T.recommendations.codeLabel}: ${item.code}`}</div>
                </li>
            ))}
        </ul>
    );
}

function KpiSummary({ summary = {} }) {
    const entries = Object.entries(summary ?? {});
    if (entries.length === 0) {
        return <div style={{ color: "#94a3b8" }}>{T.recommendations.kpiSummaryUnavailable}</div>;
    }

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "10px",
        }}
        >
            {entries.map(([key, value]) => (
                <div
                    key={key}
                    style={{
                        padding: "10px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                    }}
                >
                    <div style={{ color: "#64748b", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                        {T.kpiLabels[key] ?? key.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "1.1rem" }}>{Number.isFinite(value) ? value.toFixed(2) : String(value)}</div>
                </div>
            ))}
        </div>
    );
}

function Commentary({ text }) {
    if (!text) return null;
    return (
        <div
            style={{
                marginTop: "12px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px dashed #cbd5e1",
                background: "#f8fafc",
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: "6px", color: "#0f172a" }}>{T.recommendations.aiCommentary}</div>
            <div style={{ color: "#475569" }}>{text}</div>
        </div>
    );
}

function StatusMessage({ status, error }) {
    if (status === "loading") {
        return <div style={{ color: "#2563eb", fontSize: "0.95rem" }}>{T.recommendations.statuses.loading}</div>;
    }
    if (status === "error") {
        const normalizedError = (error || "").toLowerCase();
        const is401 = normalizedError.includes("401") || error === T.errors.error401;
        const friendlyError = is401
            ? T.recommendations.statuses.error401
            : (error || T.recommendations.statuses.errorGeneric);
        return (
            <div
                style={{
                    color: "#b91c1c",
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    padding: "10px",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                }}
            >
                {friendlyError}
            </div>
        );
    }
    if (status === "idle") {
        return <div style={{ color: "#475569", fontSize: "0.95rem" }}>{T.recommendations.statuses.idle}</div>;
    }
    if (status === "empty") {
        return (
            <div
                style={{
                    color: "#15803d",
                    background: "#ecfdf3",
                    border: "1px solid #bbf7d0",
                    padding: "10px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                }}
            >
                {T.recommendations.statuses.empty}
            </div>
        );
    }
    return null;
}

function RecommendationsPanel({
    recommendation,
    status = "idle",
    error,
}) {
    const showContent = status === "ready" || status === "empty";
    return (
        <div
            style={{
                border: "1px solid #e2e8f0",
                background: "#fff",
                borderRadius: "10px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>{T.recommendations.heading}</div>
                    <div style={{ color: "#475569" }}>{T.recommendations.subtitle}</div>
                </div>
                {showContent && <SeverityBadge severity={recommendation?.severity} />}
            </div>

            {status !== "ready" && <StatusMessage status={status} error={error} />}

            {status === "ready" && recommendation && (
                <>
                    <RecommendationList items={recommendation.recommendations} />

                    <div>
                        <div style={{ fontWeight: 700, marginBottom: "6px", color: "#0f172a" }}>{T.recommendations.justification}</div>
                        <div style={{ color: "#475569" }}>{recommendation.justification}</div>
                    </div>

                    <div>
                        <div style={{ fontWeight: 700, marginBottom: "6px", color: "#0f172a" }}>{T.recommendations.kpiSummary}</div>
                        <KpiSummary summary={recommendation.kpi_summary} />
                    </div>

                    <Commentary text={recommendation.llm_commentary} />
                </>
            )}
        </div>
    );
}

export default RecommendationsPanel;
