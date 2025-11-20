# Advanced Map (Phase 2)

This repo now includes a Leaflet-based advanced map for the Phase 2 React UI while keeping the Streamlit (Phase 1) frontend intact.

## Data sources
- `GET /api/v1/map/zones` returns simplified GeoJSON polygons for **Bello**, **Medellin**, **Envigado**, and **Itagui**. The service is read-only, ships from `backend/services/map_layers.py`, and is exposed via `backend/api/v1/map_router.py`.
- `POST /api/v1/simulate` keeps its existing contract and now extends the payload with map-ready contamination layers: `zones_data`, `points_data`, and `heatmap_data` (all optional, default empty lists).

## Frontend structure (`frontend/map/`)
- `zone_styles.js` – color buckets and Leaflet styles driven by pollution values.
- `utils_geo.js` – maps simulation metrics to GeoJSON properties, normalizes zone names, and adds centroids for markers.
- `leaflet_layers.js` – base Leaflet helpers (OSM tile layer + traffic markers).
- `map/layers/` – presentational layers for zones (polygons), point samples, and the heatmap.
- `index.js` – `<UrbanMap />` component that fetches `/api/v1/map/zones`, merges the latest simulation metrics, and renders the map + legend + layer toggles.

### Usage
In the Phase 2 React screen (`frontend/views/SimulationDashboard.jsx`), `UrbanMap` is imported and receives the latest simulation payload:

```jsx
<UrbanMap
  simulationResult={simulationResult}
  pollutionByZone={latestPollution}
  trafficByZone={latestTraffic}
/>
```

When there is no simulation yet, the component shows a prompt and keeps the map neutral; once metrics arrive it recolors zones, adds tooltips/popups (name, PM2.5, traffic), and overlays simple traffic markers.

## Extensibility notes
- **Heatmaps (F2-HU06):** add a new layer in `leaflet_layers.js` fed by the same GeoJSON/features; reuse `utils_geo.attachMetricsToGeoJson` to compute intensities.
- **A/B comparisons (F2-HU07):** keep two `UrbanMap` instances side by side or add a prop to switch between metric sets; the component already separates geometry fetch from metric overlays.
- **Base map providers:** swap `DEFAULT_TILE_LAYER` in `leaflet_layers.js` if Mapbox credentials become available.
