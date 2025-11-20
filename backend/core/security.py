import os

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader

API_KEY_HEADER_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_HEADER_NAME, auto_error=False)


def get_api_key(x_api_key: str | None = Depends(api_key_header)) -> str:
    """Validate the incoming API key header against the configured value."""
    expected_key = os.getenv("API_KEY")
    if expected_key is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API Key not configured on server.",
        )

    if not x_api_key or x_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key.",
        )

    return x_api_key
