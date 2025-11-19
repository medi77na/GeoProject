import os
from typing import Any, Dict, Optional

import pandas as pd
import plotly.express as px
import requests
import streamlit as st

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
SIMULATE_PATH = "/api/v1/simulate"


def call_simulate_api(payload: Dict[str, Any]) -> Dict[str, Any]:
    url = BACKEND_URL.rstrip("/") + SIMULATE_PATH
    response = requests.post(url, json=payload, timeout=15)
    response.raise_for_status()
    return response.json()


if "simulation_result" not in st.session_state:
    st.session_state["simulation_result"] = None


def main() -> None:
    st.title("Urban Simulator – Scenario Runner")
    st.write(
        "Select a scenario and parameters to trigger the backend simulation. "
        "Results are stored in session state for later visualization steps."
    )

    scenario = st.radio("Scenario", options=["A", "B"], index=0, help="Baseline vs intervention")
    horizon = st.slider("Horizon (time steps)", min_value=12, max_value=72, value=24, step=1)
    traffic_level = st.selectbox(
        "Traffic level", options=["low", "medium", "high"], index=1
    )
    dispersion_factor = st.slider(
        "Dispersion factor", min_value=0.5, max_value=2.0, value=1.0, step=0.1
    )

    use_seed = st.checkbox("Provide a custom seed", value=False)
    seed_value: Optional[int] = None
    if use_seed:
        seed_value = int(
            st.number_input(
                "Seed (optional)",
                min_value=0,
                step=1,
                value=0,
                format="%d",
                help="Leave unchecked to let the backend pick a random seed.",
            )
        )

    if st.button("Run simulation"):
        if horizon <= 0:
            st.error("Horizon must be greater than zero.")
        else:
            payload = {
                "scenario": scenario,
                "horizon": int(horizon),
                "traffic_level": traffic_level,
                "seed": seed_value,
                "dispersion_factor": float(dispersion_factor),
            }

            with st.spinner("Running simulation..."):
                try:
                    result = call_simulate_api(payload)
                except requests.exceptions.RequestException as exc:
                    status = getattr(exc.response, "status_code", "unknown")
                    st.error(f"Simulation failed (status: {status}). Details: {exc}")
                else:
                    st.session_state["simulation_result"] = result
                    st.success("Simulation completed successfully.")
                    st.write(
                        f"Scenario: {result.get('scenario')} | "
                        f"Zones: {', '.join(result.get('zones', []))} | "
                        f"Horizon: {len(result.get('time', []))}"
                    )

    result = st.session_state.get("simulation_result")

    if result:
        st.subheader("Last simulation summary")
        st.write(f"Scenario: {result.get('scenario')}")
        st.write(f"Zones: {', '.join(result.get('zones', []))}")
        st.write(f"Time steps: {len(result.get('time', []))}")

    st.header("Time series of traffic and pollution")

    if not result:
        st.info("Run a simulation to display the time series.")
        return

    scenario = result.get("scenario")
    zones = result.get("zones", [])
    time = result.get("time", [])
    traffic = result.get("traffic", {})
    pollution = result.get("pollution", {})

    if not scenario or not zones or not time or not traffic or not pollution:
        st.error("Simulation data is incomplete. Run a new simulation.")
        return

    selected_zones = st.multiselect(
        "Zones to display",
        options=zones,
        default=zones,
    )

    if not selected_zones:
        st.warning("Select at least one zone to display.")
        return

    rows_traffic = []
    rows_pollution = []

    for z in selected_zones:
        series_t = traffic.get(z, [])
        series_c = pollution.get(z, [])
        if len(series_t) != len(time) or len(series_c) != len(time):
            st.error(f"Inconsistent series length for zone {z!r}.")
            continue

        for t, rho_val, c_val in zip(time, series_t, series_c):
            rows_traffic.append({"time": t, "zone": z, "traffic": rho_val})
            rows_pollution.append({"time": t, "zone": z, "pollution": c_val})

    df_traffic = pd.DataFrame(rows_traffic)
    df_pollution = pd.DataFrame(rows_pollution)

    if df_traffic.empty or df_pollution.empty:
        st.warning("No data available for the selected zones.")
        return

    fig_traffic = px.line(
        df_traffic,
        x="time",
        y="traffic",
        color="zone",
        markers=True,
        title=f"Traffic density ρ(t) – scenario {scenario}",
    )
    fig_traffic.update_layout(
        xaxis_title="Time step",
        yaxis_title="Traffic density ρ(t)",
    )
    st.plotly_chart(fig_traffic, use_container_width=True)

    fig_pollution = px.line(
        df_pollution,
        x="time",
        y="pollution",
        color="zone",
        markers=True,
        title=f"Pollution C(t) – scenario {scenario}",
    )
    fig_pollution.update_layout(
        xaxis_title="Time step",
        yaxis_title="Pollution level C(t)",
    )
    st.plotly_chart(fig_pollution, use_container_width=True)


if __name__ == "__main__":
    main()
