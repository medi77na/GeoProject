# Simulation Performance Notes

## Methodology
- Measurements use `time.perf_counter()` in a short snippet that instantiates a `SimulationRequest`, generates matching synthetic data, and calls `backend.services.run_simulation`.
- Same workstation, Python 3.13 inside the existing `.venv`.
- Two representative inputs:
  1. **Default day run:** Scenario **B**, 4 metro zones, `duration_minutes=1440`, `time_step_minutes=1`, `traffic_level="high"`.
  2. **Stress test:** Scenario **B**, 4 zones, `duration_minutes=7200`, `time_step_minutes=1`, `traffic_level="high"`.

## Results
| Scenario | Steps | Before (s) | After (s) |
| --- | --- | --- | --- |
| Default day | 1 440 | 0.0065 | 0.0040 |
| Stress (5 days) | 7 200 | 0.0348 | 0.0170 |

Both cases now stay far under the RNF1 limit of ~2 seconds, even with ample headroom for shared CI runners.

## Hot Path Changes
- Cached deterministic time grids + peak masks and reuse them for default requests.
- Precompute global multipliers (policy, heavy vehicles, incidents) and emission factors once per request.
- Flatten per-zone loops by preparing traffic series upfront, reducing repeated `min()` checks and branching.
- Added a guarded fast path for Phase‑1 style requests (no advanced overrides) so the cached modifiers are used for common payloads.

These micro-optimizations eliminate redundant work in the inner loop while keeping the physics and public API untouched.
