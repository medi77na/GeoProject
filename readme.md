# Urban Traffic and Pollution Simulator – GeoProject

This repository contains the monorepo for the Urban Simulator MVP (Phase 1 – A/B synthetic scenarios).

## Structure

- `backend/` – FastAPI service exposing `/health` and the future `/simulate` endpoint.
- `frontend/` – Streamlit UI that will consume the backend and render charts and maps.
- `docs/` – Project documentation (including `architecture.md`).

## Getting started (dev)

1. Create and activate a Python virtual environment.
2. Install backend dependencies:
   ```bash
   pip install -r requirements.txt  # when available
3. Run de Backend
    ```bash
    uvicorn backend.main:app --reload
4. Run the Frontend
    ```bash
    streamlit run frontend/app.py
See docs/architecture.md for the detailed system design.
## Environment setup

1. Install Python 3.9+ and ensure `python --version` returns at least `3.9`.
2. Create a virtual environment named `.venv` with `python -m venv .venv`.
3. Activate the virtual environment:
   - On macOS/Linux: `source .venv/bin/activate`
   - On Windows PowerShell: `.\.venv\Scripts\Activate`
4. Install dependencies: `pip install -r requirements.txt`

## Running the project

- Start the backend via `./run_backend.sh` (macOS/Linux) or `run_backend.bat` (Windows). The API will run at `http://localhost:8000`.
- Start the frontend via `./run_frontend.sh` (macOS/Linux) or `run_frontend.bat` (Windows). The UI will be available at `http://localhost:8501`.

If something fails, double-check that the virtual environment is activated, dependencies installed, and you are using Python 3.9 or newer.

## Backend API overview

Available endpoints:

- `GET /health`
- `GET /api/v1/ping`

Run the backend locally with:

```bash
uvicorn backend.main:app --reload --port 8000
```

## `/api/v1/simulate` endpoint

- **Method & path:** `POST /api/v1/simulate`
- **Payload fields:**
  - `scenario`: `"A"` (baseline) or `"B"` (intervention).
  - `zones`: optional list of zone names. Defaults to Bello, Medellin, Envigado, Itagui.
  - `horizon`: simulation steps (int > 0).
  - `traffic_level`: `"low"`, `"medium"`, or `"high"` for the synthetic seed data.
  - `seed`: optional integer for deterministic synthetic generation.
  - Optional overrides: `alpha`, `beta`, `inertia`, `dispersion_factor` (tune simulation parameters).
- **Response:** JSON containing `scenario`, `zones`, `time`, `traffic`, and `pollution`, where `traffic`/`pollution` map each zone to a list over the time horizon.

Example:

```json
POST /api/v1/simulate
{
  "scenario": "B",
  "zones": ["Bello", "Medellin"],
  "horizon": 24,
  "traffic_level": "medium",
  "seed": 7
}
```

```json
{
  "scenario": "B",
  "zones": ["Bello", "Medellin"],
  "time": [0, 1, 2, "..."],
  "traffic": {"Bello": [0.4, 0.42, "..."], "Medellin": [...]},
  "pollution": {"Bello": [11.2, 11.8, "..."], "Medellin": [...]}
}
```

Scenario "B" reduces peak-hour traffic relative to "A", so the returned traffic/pollution curves will typically be lower during morning and evening peaks.

## Synthetic data generator

The module `backend/services/synthetic_data.py` provides `generate_synthetic_data(...)`, which returns a `SyntheticDataResult` containing time, traffic (rho), and pollution (C) series for each zone. Use it internally to mock scenarios before the real simulator is ready:

```python
from backend.services import generate_synthetic_data

result = generate_synthetic_data(
    zones=["Bello", "Medellin"],
    horizon=24,
    scenario="B",
    seed=7,
)
print(result.traffic["Bello"][:3], result.pollution["Bello"][:3])
```

Scenario "B" represents an intervention with reduced traffic and pollution during peaks compared to scenario "A".

## Simulation engine

The module `backend/services/simulation_engine.py` defines `SimulationParams`, `SimulationResult`, and `run_simulation(...)`. It takes a `SyntheticDataResult` as input and returns simulated traffic and pollution series per zone.

```python
from backend.services import (
    SimulationParams,
    generate_synthetic_data,
    run_simulation,
)

synthetic = generate_synthetic_data(["Bello", "Medellin"], horizon=24, seed=3)
params = SimulationParams(alpha=0.7, beta=0.4)
simulation = run_simulation(synthetic, steps=24, scenario="B", params=params)
print(simulation.traffic["Bello"][:3])
```

Scenario "B" reduces peak-hour traffic compared to scenario "A", resulting in lower pollution in those intervals.

## Frontend – scenario selection UI

`frontend/app.py` contains the Streamlit interface for selecting scenarios and simulation parameters. It lets you:

- Choose scenario A or B.
- Configure the horizon, traffic level, dispersion factor, and an optional seed.
- Trigger the `POST /api/v1/simulate` call and stores the JSON response in `st.session_state["simulation_result"]` for later views (time series, maps, KPIs).

Run it locally with:

```bash
streamlit run frontend/app.py --server.port 8501
```

## Time series visualization

The Streamlit page also includes a **“Time series of traffic and pollution”** section. It reads the latest simulation stored in `st.session_state["simulation_result"]` (populated when `/api/v1/simulate` is called) and renders two Plotly line charts:

- Traffic density ρ(t) per zone.
- Pollution level C(t) per zone.

Each zone is color-coded, and a multiselect lets you pick which ones to display. If no simulation has been run yet, an info message reminds you to execute one before the charts appear.

## Pollution map (Valle de Aburrá)

The frontend now includes a **“Pollution map – Valle de Aburrá”** section rendered with `streamlit-folium` (Leaflet). It centers the map on Valle de Aburrá and draws simple circular markers for the four MVP zones (Bello, Medellin, Envigado, Itagui). Each circle color reflects the average pollution C(t) for that zone over the simulation horizon relative to the maximum zone value (low/medium/high buckets). Popups and tooltips repeat the zone name, average pollution value, and qualitative level so stakeholders can quickly compare conditions. The view automatically refreshes whenever `/api/v1/simulate` updates `st.session_state["simulation_result"]`; if no simulation has been run yet, the UI shows an info callout asking the user to run one before the map appears.

## KPIs (traffic and pollution)

The module `backend/services/kpi_calculator.py` exposes `compute_kpis(simulation: SimulationResult) -> KPIResult`, which summarizes:

- average traffic per zone (`traffic_index`),
- average and max pollution per zone (`pollution_avg`, `pollution_max`),
- congestion index per zone (fraction of time where traffic exceeds a threshold).

These metrics feed the frontend KPI panel for comparing scenarios A and B.

```python
from backend.services import (
    KPIResult,
    SimulationParams,
    compute_kpis,
    generate_synthetic_data,
    run_simulation,
)

zones = ["Bello", "Medellin", "Envigado", "Itagui"]

synthetic = generate_synthetic_data(
    zones=zones,
    horizon=24,
    scenario="A",
    traffic_level="medium",
    seed=123,
)
params = SimulationParams()
sim_result = run_simulation(
    synthetic_data=synthetic, steps=24, scenario="A", params=params
)
kpis = compute_kpis(simulation=sim_result)

print(kpis.traffic_index)
print(kpis.pollution_avg)
print(kpis.congestion_index)
```

## KPI panel

The Streamlit UI now renders a **“Indicadores Clave del Escenario”** section fed directly by the backend KPI service. The helper `compute_kpis_from_result(...)` in `frontend/app.py` wraps the JSON stored in `st.session_state["simulation_result"]` into a `SimulationResult` and calls `compute_kpis`, ensuring formulas stay centralized in `backend/services/kpi_calculator.py`.

Each zone appears as a row showing:

- traffic index (average traffic density ρ),
- pollution average,
- pollution maximum,
- congestion index (fraction of time steps above the congestion threshold).

The panel also adds qualitative levels (`Low`, `Medium`, `High`) for pollution and congestion, color-coded for quick scanning (green = low, yellow = medium, red = high). Whenever a new simulation completes, the KPI table refreshes automatically; if no simulation has run yet or KPI data is missing, the UI displays an informative message instead of an empty table.

## Code quality

We use `ruff` for linting, `black` for formatting, `isort` for import ordering, and `pytest` for automated tests. Run all of them locally before pushing changes:

```bash
ruff .
black .
isort .
pytest
```

If the GitHub Actions CI fails, run the same commands locally, fix any reported issues, and push the updates again.
