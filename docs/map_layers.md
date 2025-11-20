# Map layers (F2-HU06)

This HU adds three contamination-focused layers to the advanced Leaflet map without changing the `/api/v1/simulate` path or removing any legacy fields.

## Backend data shapes
- `zones_data`: list of `{ zone, avg_pm25, traffic_rel }` summarizing each simulated zone.
- `points_data`: list of `{ lat, lon, pm25, zone, time_index }` sampled around zone centroids for discrete markers.
- `heatmap_data`: list of `[lat, lon, intensity]` entries derived from `points_data` and normalized to `[0, 1]`.

`derive_map_ready_layers` (in `backend/services/contamination_layers.py`) builds these structures from the simulation result right before returning `SimulationResponse`. All new fields are optional with empty-list defaults to stay backward compatible.

## Frontend wiring
- `frontend/map/layers/` contains presentational React Leaflet layers:
  - `zones_layer.js`: colors polygons by `avg_pm25` and shows PM2.5 + traffic popups.
  - `points_layer.js`: small circle markers for `points_data` with PM2.5/zone/time tooltips.
  - `heatmap_layer.js`: Leaflet.heat overlay from `heatmap_data`.
- `frontend/map/index.js` (`<UrbanMap />`) keeps fetching `/api/v1/map/zones`, merges `zones_data` into the GeoJSON, and adds toggle controls (`Zones`, `Points`, `Heatmap`) plus a dynamic legend that reacts to the latest simulation payload.

## Extensibility notes
- To add extra per-zone fields, extend `ZoneData` in `backend/models/simulation.py` and include them in the merge inside `attachMetricsToGeoJson`.
- To change the color scale, edit `POLLUTION_BUCKETS` in `frontend/map/zone_styles.js`; the legend will rebuild automatically from live values.
- Keep `points_data` small (handful per zone) so that toggling layers remains instant and doesn’t introduce UI lag.
