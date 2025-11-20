# API Versioning Strategy

## Why version the API?
The Urban Simulator API evolves as new features (advanced inputs, KPIs, recommendations) are added. To keep existing clients working while we iterate, every public endpoint is exposed under an explicit version. Consumers pin to `/api/v1/...` and can upgrade when a future `/api/v2` becomes available.

## `/api/v1` layout
```
backend/api/
├── v1/
│   ├── __init__.py          # Aggregates the versioned router
│   ├── simulate_router.py   # /api/v1/simulate
│   └── system_router.py     # /api/v1/ping and related health checks
├── router.py                # Root router that mounts v1 and deprecated shims
└── __init__.py
```

- The FastAPI application (`backend/main.py`) includes the aggregated router with the prefix `/api/v1`.
- Additional routers (KPIs, recommendations, auth) should live in `backend/api/v1/` and be registered there.

## Moving towards future versions
- **Backward compatibility:** `/api/v1` must remain stable. Fixes and additive, backward-compatible fields are allowed; breaking changes require a new versioned namespace.
- **New versions:** When a breaking change is necessary, create `backend/api/v2/` with its own routers and mount it as `/api/v2`.
- **Deprecation:** Legacy, unversioned routes (e.g., `/simulate`) are kept only as thin, deprecated shims that internally call their `/api/v1/...` counterparts. They appear in the OpenAPI schema marked as deprecated and can be removed after dependents migrate.
- **Documentation:** Both `/docs` and `/redoc` describe the currently active versions. Any deprecation notices should mention the planned removal timeline and recommend the latest versioned path.

Following this structure keeps clients resilient while enabling the backend team to iterate quickly on new capabilities.
