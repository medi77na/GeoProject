# Urban Traffic and Pollution Simulator – GeoProject

This repository contains the monorepo for the Urban Simulator MVP (Phase 1 – A/B synthetic scenarios).

## Structure

- `backend/` – FastAPI service exposing `/health` and the future `/simulate` endpoint.
- `frontend/` – Streamlit UI that will consume the backend and render charts and maps.
- `docs/` – Project documentation (including `architecture.md`).

## Getting started (dev)

1. Create and activate a Python virtual environment.
2. Install backend dependencies:
   ```bash
   pip install -r requirements.txt  # when available
3. Run de Backend
    ```bash
    uvicorn backend.main:app --reload
4. Run the Frontend
    ```bash
    streamlit run frontend/app.py
See docs/architecture.md for the detailed system design.
## Environment setup

1. Install Python 3.9+ and ensure `python --version` returns at least `3.9`.
2. Create a virtual environment named `.venv` with `python -m venv .venv`.
3. Activate the virtual environment:
   - On macOS/Linux: `source .venv/bin/activate`
   - On Windows PowerShell: `.\.venv\Scripts\Activate`
4. Install dependencies: `pip install -r requirements.txt`

## Running the project

- Start the backend via `./run_backend.sh` (macOS/Linux) or `run_backend.bat` (Windows). The API will run at `http://localhost:8000`.
- Start the frontend via `./run_frontend.sh` (macOS/Linux) or `run_frontend.bat` (Windows). The UI will be available at `http://localhost:8501`.

If something fails, double-check that the virtual environment is activated, dependencies installed, and you are using Python 3.9 or newer.

## Backend API overview

Available endpoints:

- `GET /health`
- `GET /api/v1/ping`

Run the backend locally with:

```bash
uvicorn backend.main:app --reload --port 8000
```

## Code quality

We use `ruff` for linting, `black` for formatting, `isort` for import ordering, and `pytest` for automated tests. Run all of them locally before pushing changes:

```bash
ruff .
black .
isort .
pytest
```

If the GitHub Actions CI fails, run the same commands locally, fix any reported issues, and push the updates again.
