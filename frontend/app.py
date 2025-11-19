import os
from typing import Any, Dict, Optional

import folium
import pandas as pd
import plotly.express as px
import requests
import streamlit as st
from streamlit_folium import st_folium

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
    can_plot_time_series = True

    if not result:
        st.info("Run a simulation to display the time series.")
        can_plot_time_series = False

    if can_plot_time_series:
        scenario = result.get("scenario")
        zones = result.get("zones", [])
        time = result.get("time", [])
        traffic = result.get("traffic", {})
        pollution = result.get("pollution", {})

        if not scenario or not zones or not time or not traffic or not pollution:
            st.error("Simulation data is incomplete. Run a new simulation.")
            can_plot_time_series = False

    if can_plot_time_series:
        selected_zones = st.multiselect(
            "Zones to display",
            options=zones,
            default=zones,
        )

        if not selected_zones:
            st.warning("Select at least one zone to display.")
            can_plot_time_series = False

    if can_plot_time_series:
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
            can_plot_time_series = False

    if can_plot_time_series:
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

    st.header("Pollution map – Valle de Aburrá")
    result = st.session_state.get("simulation_result")

    if not result:
        st.info("Run a simulation to display the pollution map.")
    else:
        scenario = result.get("scenario")
        zones = result.get("zones", [])
        time = result.get("time", [])
        pollution = result.get("pollution", {})

        if not zones or not pollution or not time:
            st.error("Simulation result is incomplete. Cannot render the map.")
        else:
            zone_pollution_avg: Dict[str, float] = {}
            for z in zones:
                series_c = pollution.get(z)
                if not series_c:
                    continue
                avg_c = float(sum(series_c) / len(series_c))
                zone_pollution_avg[z] = avg_c

            if not zone_pollution_avg:
                st.warning("No pollution data available to render on the map.")
            else:
                max_val = max(zone_pollution_avg.values())

                def classify_level(value: float):
                    if max_val <= 0.0:
                        return "Low", "#95a5a6"
                    ratio = value / max_val
                    if ratio < 0.33:
                        return "Low", "#2ecc71"
                    if ratio < 0.66:
                        return "Medium", "#f1c40f"
                    return "High", "#e74c3c"

                ZONE_COORDS = {
                    "Bello": (6.338, -75.554),
                    "Medellin": (6.244, -75.581),
                    "Envigado": (6.167, -75.583),
                    "Itagui": (6.173, -75.611),
                }

                m = folium.Map(location=[6.24, -75.58], zoom_start=11)

                for zone_name, value in zone_pollution_avg.items():
                    coords = ZONE_COORDS.get(zone_name)
                    if not coords:
                        continue

                    level, color = classify_level(value)
                    popup_text = f"{zone_name} – avg C = {value:.1f} ({level})"
                    tooltip_text = f"{zone_name}: {value:.1f} ({level})"

                    folium.Circle(
                        location=coords,
                        radius=3000,
                        color=color,
                        fill=True,
                        fill_opacity=0.6,
                        popup=popup_text,
                        tooltip=tooltip_text,
                    ).add_to(m)

                st_folium(m, width=None, height=500)


if __name__ == "__main__":
    main()
