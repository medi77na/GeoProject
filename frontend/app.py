import os
from typing import Any, Dict, Optional

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

    if st.session_state["simulation_result"]:
        result = st.session_state["simulation_result"]
        st.subheader("Last simulation summary")
        st.write(f"Scenario: {result.get('scenario')}")
        st.write(f"Zones: {', '.join(result.get('zones', []))}")
        st.write(f"Time steps: {len(result.get('time', []))}")


if __name__ == "__main__":
    main()
