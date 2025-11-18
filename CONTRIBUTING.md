# Contributing Guidelines

## Branching model

- `main`: stable, demo-ready code.
- `dev`: integration branch for ongoing development.
- `feature/*`: new features or user stories (e.g. `feature/F1-HU03-simulation-engine`).
- `hotfix/*`: urgent fixes on `main`.

Workflow:

1. Branch from `dev`:
   ```bash
   git checkout dev
   git checkout -b feature/F1-HUXX-short-description
2. Commit your changes using clear messages (see below).

3. Push the branch and open a Pull Request into dev.

4. At least one code review is required before merging.

##  Commit Messages (Conventional Style)

Usa mensajes cortos en modo imperativo con uno de los siguientes prefijos:

- `feat:` Nueva funcionalidad o historia de usuario  
- `fix:` Corrección de errores  
- `docs:` Cambios en la documentación  
- `chore:` Mantenimiento o cambios en herramientas  
- `refactor:` Refactorización interna sin cambio de comportamiento  
- `test:` Adición o actualización de pruebas  

### Ejemplos

```bash
feat: add basic traffic simulation service
fix: handle invalid scenario in simulate endpoint
docs: update architecture diagram link
```

---

## Code Style and Structure

Sigue la arquitectura descrita en `docs/architecture.md`.

### Organización de carpetas

- **Lógica de negocio:** `backend/services/`
- **Modelos de API (request/response):** `backend/models/`
- **Vistas de UI:** `frontend/views/`
- **Componentes reutilizables:** `frontend/components/`
- **Pruebas:** `backend/tests/` (y más adelante `frontend/tests/` si es necesario)

---

## Code quality and CI

Para mantener la calidad del código, el proyecto usa las siguientes herramientas:

- `ruff` para linting.
- `black` para formateo.
- `isort` para ordenar imports.
- `pytest` para la suite de pruebas.

Antes de enviar un Pull Request, ejecuta localmente:

```bash
ruff .
black .
isort .
pytest
```

El workflow de GitHub Actions en `.github/workflows/ci.yml` corre los mismos comandos y debe pasar antes de poder fusionar cualquier PR.
