# Quick Usage Guide – Phase 1 MVP

## Purpose of the simulator

The Urban Simulator Phase 1 MVP is an educational tool that generates synthetic traffic (ρ) and pollution (C) data for the Valle de Aburrá. It illustrates how different policy scenarios (baseline A vs. intervention B) affect congestion and air quality. The simulator combines synthetic data, a lightweight simulation engine, and visual dashboards so educators and stakeholders can discuss trends without requiring access to production SIATA datasets.

Built on FastAPI and Streamlit, the MVP focuses on transparency and reproducibility. Every simulation run can be recreated by selecting the same scenario, parameters, and random seed, making it ideal for classroom demos and exploratory workshops.

## Typical demo flow

1. Start the backend (`uvicorn backend.main:app --reload --port 8000`) and frontend (`streamlit run frontend/app.py --server.port 8501`).
2. Open http://localhost:8501 and confirm the UI loads.
3. Choose **Scenario A** in the sidebar controls.
4. Adjust parameters if desired:
   - **Horizon** (time steps),
   - **Traffic level** (low/medium/high synthetic seed),
   - **Dispersion factor** (affects pollution decay),
   - **Seed** (optional for deterministic runs).
5. Click **Run simulation** and wait for the success notification.
6. Inspect the traffic and pollution time series (multi-select lets you focus on specific zones).
7. Scroll to the pollution map to review spatial patterns and qualitative levels.
8. Review the KPI panel to compare zones across traffic index, pollution averages/maxima, and congestion levels.
9. Switch to **Scenario B**, tweak parameters (e.g., longer horizon or higher traffic level), rerun, and discuss the differences versus Scenario A across charts, map, and KPIs.

## Key concepts

- **ρ(t):** Traffic density per zone, normalized to the [0, 1] interval to represent relative congestion.
- **C(t):** Pollution level (arbitrary units) driven by traffic dynamics and dispersion; lower is better.
- **Traffic index:** Temporal average of ρ(t) for a zone; indicates typical congestion.
- **Pollution average / max:** Mean and peak C(t) values, used to compare chronic vs. acute pollution exposure.
- **Congestion index:** Fraction of time steps where ρ(t) exceeds the configurable congestion threshold (default 0.7), highlighting how often a zone operates in stressed conditions.

## Known limitations (Phase 1)

- Synthetic inputs instead of real SIATA or Waze data (Phase 2+ will incorporate richer feeds).
- Simplified discrete-time dynamics; no full atmospheric or mesoscale modeling yet.
- Map visualization uses basic circular markers instead of shapefiles or heatmaps.
- No authentication, user management, or persistence beyond Streamlit session state.
- Mobile layout is basic; optimized primarily for desktop classroom demos.

## Phase 1 – MVP closure

Phase 1 covers the committed functional scope: synthetic scenario simulation (A/B), time-series visualization, pollution map, and KPI panel within the Streamlit UI. All blocking bugs have been resolved, so the app can be reliably demoed in workshops and classes. Remaining limitations are captured in `docs/known_issues.md`, providing a transparent baseline for Phase 2 initiatives (e.g., richer APIs, actionable recommendations, improved visuals, and hardened security).

