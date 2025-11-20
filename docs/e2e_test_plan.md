# End-to-end Test Plan – Phase 1 MVP

This document describes the manual end-to-end functional tests for the Phase 1 MVP of the Urban Simulator. Each case validates how the Streamlit UI, FastAPI backend, and simulation services interact under realistic demo conditions.

## Test cases

### TC-01 – Scenario A with default parameters
- **Preconditions:** Backend (`uvicorn backend.main:app --reload --port 8000`) and frontend (`streamlit run frontend/app.py --server.port 8501`) are running locally.
- **Steps:**
  1. Open the UI at http://localhost:8501.
  2. Select **Scenario A**.
  3. Keep the default values for horizon, traffic level, dispersion factor, and seed.
  4. Click **Run simulation**.
  5. Inspect the time-series charts, pollution map, and KPI panel.
- **Expected results:**
  - `/api/v1/simulate` responds with HTTP 200 and a JSON payload.
  - Charts render traffic and pollution per zone without errors.
  - Pollution map shows the expected zones with color coding.
  - KPI panel displays one row per zone with numerical and qualitative levels.

### TC-02 – Scenario B with adjusted parameters
- **Preconditions:** Same as TC-01.
- **Steps:**
  1. Open the UI at http://localhost:8501.
  2. Select **Scenario B**.
  3. Change at least one parameter (e.g., increase horizon to 36 or set traffic level to "high").
  4. Click **Run simulation**.
  5. Compare charts, map, and KPIs against the previous Scenario A run.
- **Expected results:**
  - Backend returns HTTP 200 with data reflecting the new parameters.
  - Traffic and pollution curves differ from Scenario A (typically lower congestion/pollution during peaks).
  - Map colors and KPI metrics show noticeable differences (e.g., reduced congestion index).

### TC-03 – Invalid parameters
- **Preconditions:** Backend and frontend are running.
- **Steps:**
  1. In the UI, select any scenario.
  2. Enter an invalid parameter combination (e.g., horizon = 0 or manually craft a request with an unsupported traffic level).
  3. Click **Run simulation**.
- **Expected results:**
  - UI displays a validation message (e.g., "Horizon must be greater than zero") without crashing.
  - If the request reaches the backend, it responds with 4xx (422/400) and the UI shows an error banner describing the issue.

### TC-04 – Backend unavailable
- **Preconditions:** Frontend is running; backend is stopped or `BACKEND_URL` points to an unreachable address.
- **Steps:**
  1. Open the UI.
  2. Attempt to run a simulation with any scenario/parameters.
- **Expected results:**
  - Request fails quickly with a connection error.
  - Streamlit displays a clear error (e.g., "Simulation failed...") and remains responsive.
  - No partial charts/maps/KPIs are rendered until a successful run occurs.

### TC-05 – Full demo flow A → B
- **Preconditions:** Backend and frontend running; clean session state (refresh UI).
- **Steps:**
  1. Run Scenario A with default parameters and observe charts, map, KPIs.
  2. Immediately run Scenario B with different parameters (e.g., higher horizon, different dispersion).
  3. Use the UI to compare results (time-series filters, map tooltips, KPI table).
- **Expected results:**
  - Both runs succeed without errors.
  - Session state holds the latest simulation for visualization.
  - Users can narrate the differences between scenarios using charts, map, and KPIs.

## Summary table

| ID    | Name                               | Status | Notes |
|-------|------------------------------------|--------|-------|
| TC-01 | Scenario A with default parameters | To do |       |
| TC-02 | Scenario B with adjusted params    | To do |       |
| TC-03 | Invalid parameters handling        | To do |       |
| TC-04 | Backend unavailable                | To do |       |
| TC-05 | Full demo flow A → B               | To do |       |

