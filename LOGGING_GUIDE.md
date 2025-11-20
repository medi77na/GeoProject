# Urban Simulator Logging Guide

The backend emits structured logs for simulation and recommendation endpoints to aid observability and incident response.

## Formats
- `LOG_FORMAT=console`: human-readable console formatter with timestamp, level, logger, and message.
- `LOG_FORMAT=json`: strict JSON lines suitable for aggregators (one JSON object per log entry).

## Configuration
Set `LOG_FORMAT` in your environment or `.env` file before starting the backend:

```env
LOG_FORMAT=console
```

or

```env
LOG_FORMAT=json
```

## Logged fields
- `timestamp`: ISO-8601 time in UTC.
- `event`: `request`, `result`, or `error`.
- `endpoint`: Logical endpoint name (e.g., `/api/v1/simulate`).
- `params`: Sanitized request parameters (Pydantic models dumped with `exclude_none=True`).
- `api_key_hash`: First 8 chars of the API key SHA-256 hash; the full key is never logged.
- `execution_ms`: Rounded execution time in milliseconds.
- `summary`: KPI-style rollups (scenario, zone counts, max PM2.5, severity, recommendation counts).
- `error_message` and `stack_trace`: Included on failures to aid debugging.

## Examples
Console:
```text
2025-11-20T12:34:56+0000 | INFO | backend.api.v1.simulate_router | {'timestamp': '2025-11-20T12:34:56.123456+00:00', 'event': 'request', 'endpoint': '/api/v1/simulate', 'params': {'scenario': 'A', 'zones': ['Bello']}, 'api_key_hash': 'a1b2c3d4'}
```

JSON:
```json
{"timestamp": "2025-11-20T12:34:58.456789+00:00", "level": "INFO", "logger": "backend.api.v1.recommend_router", "event": "result", "endpoint": "/api/v1/recommend", "execution_ms": 142, "summary": {"severity": "critical", "recommendations_count": 3, "kpi_summary": {"pm25_avg": 58.2}}}
```

Error:
```json
{"timestamp": "2025-11-20T12:35:02.789012+00:00", "level": "ERROR", "logger": "backend.api.v1.simulate_router", "event": "error", "endpoint": "/api/v1/simulate", "error_message": "time_step_minutes must be smaller than duration_minutes.", "stack_trace": "..."}
```

## Safety notes
- Never log full API keys, tokens, or secrets. Only truncated SHA-256 hashes are emitted.
- Request parameters are sanitized (no `None` fields) but still avoid sending sensitive data in API calls.
- Error stack traces are recorded for debugging; HTTP responses remain unchanged for clients.
