# Arquitectura del Simulador Urbano – Fase 1 (MVP A/B)

## 1. Propósito

Definir la arquitectura base y el stack tecnológico del **Simulador Urbano** para la **Fase 1 – MVP A/B con datos sintéticos y mapas**.  
El objetivo es soportar un prototipo funcional que:

- Simule tráfico y contaminación con datos sintéticos para dos escenarios (A y B).
- Exponga la simulación vía una API REST (`/simulate`).
- Visualice resultados en una interfaz interactiva con gráficos y mapa del Valle de Aburrá.
- Sea fácilmente extensible hacia Fase 2 (IA simple) y Fase 3 (modelo numérico 1D).

---

## 2. Stack Tecnológico

### Backend

- Lenguaje: **Python 3.9+**
- Framework principal: **FastAPI**
- Ejecutor ASGI de desarrollo: **uvicorn**
- Librerías base:
  - `pydantic` para validación de datos.
  - `python-dotenv` o similar para manejo de configuración vía `.env`.

### Frontend / UI

- Framework: **Streamlit**
- Mapas: **streamlit-leaflet** (o wrapper equivalente sobre Leaflet).
- Gráficos:
  - `plotly` o `matplotlib` (se evaluará según simplicidad en Fase 1).

### Simulación y datos

- `numpy` para cálculo numérico básico.
- `pandas` para manejo de series de tiempo sintéticas (ρ(t) y C(t)).

---

## 3. Arquitectura Lógica

La solución se organiza en tres capas principales:

1. **Capa de Simulación (Dominio)**
   - Implementa la lógica para generar:
     - Curvas sintéticas de densidad vehicular **ρ(t)**.
     - Curvas sintéticas de contaminación **C(t)**.
   - Aplica la dinámica discreta Fase 1:
     - `ρ(t+1) = ρ(t) + Δρ`
     - `C(t+1) = C(t) + α·ρ(t) − β·viento`
   - Provee funciones puras reutilizables por la API.

2. **Capa de API (Backend – FastAPI)**
   - Expone endpoints REST para consumo por la UI.
   - Encapsula la lógica de simulación, validación de parámetros y cálculo de KPIs.
   - Mantiene contratos de entrada/salida en JSON.

3. **Capa de Presentación (Frontend – Streamlit)**
   - Provee la experiencia de usuario:
     - Selección de escenario (A/B).
     - Sliders de parámetros (tráfico base, viento/dispersion).
     - Visualización de series temporales.
     - Mapa con zonas coloreadas por nivel de contaminación.
     - Panel de KPIs.

---

## 4. Organización de Carpetas

Estructura base del proyecto:

```text
/backend
    main.py              # Punto de entrada FastAPI
    config.py            # Configuración (settings) basada en .env
    /api
        __init__.py
        routes.py        # Definición de endpoints (p.ej. /health, /simulate)
    /models
        __init__.py
        schemas.py       # Pydantic models para requests/responses
    /services
        __init__.py
        simulation.py    # Lógica de generación de datos sintéticos y KPIs
    /utils
        __init__.py
        logging.py       # Helpers, si se requieren en fases posteriores

/frontend
    app.py               # App principal de Streamlit
    /views
        __init__.py
        home.py          # Vista principal (selección de escenario A/B)
    /components
        __init__.py
        charts.py        # Funciones de gráficos
        map.py           # Componente de mapa Leaflet

/docs
    architecture.md      # Este documento
