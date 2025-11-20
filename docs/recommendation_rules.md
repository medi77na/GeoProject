# Recommendation Rules (F2-HU08)

- **PM2.5 severity**: `<20` ug/m3 → low; `20-35` → moderate; `35-55` → high; `>55` → critical. Critical/high add alerts, freight limits, and stronger pico y placa.
- **Congestion**: per-zone congestion index `>0.80` triggers redirect + signal retiming; `>0.60` uses softer flow optimizations. Severity escalates to critical when high pollution and congestion overlap in a zone.
- **Time windows**: traffic between `07:00-09:00` and `17:00-19:00` above ~0.65 prompts staggered shift suggestions and peak-hour pico y placa extension.
- **Environmental factor**: wind speed `<2 m/s` bumps severity up one level and adds a dispersion warning.
- **RecommendationResult**: `{severity, recommendations[], justification, kpi_summary}` where `kpi_summary` tracks `pm25_avg`, `pm25_max`, `max_congestion`, and counts of high-PM2.5 / high-congestion zones.
