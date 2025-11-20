# Comparison view (F2-HU07)

## Backend
- `/api/v1/simulate/compare` accepts `SimulationCompareRequest` with `scenario_a` and `scenario_b` (each a `SimulationRequest`) plus optional labels. It returns `SimulationCompareResponse` with `result_a`, `result_b`, and mirrored labels.
- The endpoint reuses the existing simulation engine twice (same contract as `/simulate`) and keeps the original endpoint unchanged.

## Frontend data flow
- `SimulationDashboard.jsx` builds the comparison payload from two scenario forms, posts it to `/api/v1/simulate/compare`, and stores `comparisonResult` without touching the single-simulation state.
- `ComparisonView` consumes `resultA`/`resultB`, pulls base geometries via `useZonesGeoJson`, and derives map metrics through `computeLatestMetricsFromSimulation` + `attachMetricsToGeoJson`.
- Layer toggles are shared across both scenarios; labels from the form are forwarded for legends/badges.

## Modes
- **Side-by-side:** two `MapContainer` instances with synchronized pan/zoom; each renders the same stack of layers (zones, traffic markers, points, heatmap) for its scenario.
- **Overlay:** one `MapContainer` with two `LayerGroup`s wired into the `leaflet-side-by-side` control so the slider reveals scenario A vs B over the same basemap and view.

## Extending to new layers
- Add the layer component into both `SideBySideMaps` maps and both `LayerGroup`s inside `OverlayMap`, guarding with the existing visibility toggles or a new toggle if needed.
- If the layer requires extra metrics, extend `computeLatestMetricsFromSimulation`/`prepareScenarioLayers` to surface them; ensure both scenarios receive the same shape for a clean comparison.
- Update the dashboard forms/build payload step if the new layer depends on additional simulation parameters.
