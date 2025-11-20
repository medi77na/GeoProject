# API Key Authentication (F2-HU11)

This project protects critical v1 endpoints with a simple header-based API Key. Requests must include `X-API-Key`, which is validated against the `API_KEY` environment variable configured on the backend server.

## Configuration
- Backend reads `API_KEY` from the process environment (see `.env.example`).
- Set `API_KEY` in your deployment environment (container, VM, CI) or in a local `.env` file for development.
- The React frontend forwards the key via the `X-API-Key` header. Set `REACT_APP_API_KEY` (default: `change_me_in_production`) when running the UI.

## Protected endpoints
- `POST /api/v1/simulate`
- `POST /api/v1/simulate/compare`
- `POST /api/v1/recommend`

Health and map endpoints remain public.

## Using the key
- Add the header: `X-API-Key: <your_key>`.
- In Swagger UI (`/docs`), click the lock icon, enter the key, and execute requests.

## Operational best practices
- Do not commit real keys to version control.
- Use environment variables or secret managers for deployments.
- Rotate the key immediately if it is exposed or shared unintentionally.
- Use different keys per environment (dev/stage/prod) and distribute them minimally.
