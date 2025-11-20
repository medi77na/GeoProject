"""API versioning helpers used by routers."""

API_V1_PREFIX = "/api/v1"


def get_api_prefix(version: str = "v1") -> str:
    """Return the API prefix for a given semantic version token."""
    normalized = version.lstrip("/").lower()
    return f"/api/{normalized}"
