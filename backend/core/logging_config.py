import json
import logging
import os
import sys
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class JsonFormatter(logging.Formatter):
    """Format log records as compact JSON."""

    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
        }

        message = record.msg if record.msg is not None else record.getMessage()
        if isinstance(message, dict):
            log_payload.update(message)
        else:
            log_payload["message"] = str(record.getMessage())

        if record.exc_info:
            log_payload["stack_trace"] = self.formatException(record.exc_info)

        return json.dumps(log_payload, ensure_ascii=True)


def _console_formatter() -> logging.Formatter:
    return logging.Formatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )


def _json_formatter() -> logging.Formatter:
    return JsonFormatter()


def setup_logging() -> None:
    """Configure application-wide logging."""
    log_format = os.getenv("LOG_FORMAT", "console").strip().lower()
    handler = logging.StreamHandler(sys.stdout)
    formatter = _json_formatter() if log_format == "json" else _console_formatter()
    handler.setFormatter(formatter)

    logging.basicConfig(
        level=logging.INFO,
        handlers=[handler],
        force=True,
    )


def get_logger(name: str) -> logging.Logger:
    """Return a logger configured with the application format."""
    return logging.getLogger(name)


def _hash_api_key(api_key: Optional[str]) -> Optional[str]:
    if not api_key:
        return None

    import hashlib

    return hashlib.sha256(api_key.encode()).hexdigest()[:8]


def log_request(logger: logging.Logger, endpoint: str, params: Dict[str, Any], api_key: Optional[str]) -> None:
    logger.info(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": "request",
            "endpoint": endpoint,
            "params": params,
            "api_key_hash": _hash_api_key(api_key),
        }
    )


def log_result(
    logger: logging.Logger,
    endpoint: str,
    execution_ms: int,
    summary: Dict[str, Any],
) -> None:
    logger.info(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": "result",
            "endpoint": endpoint,
            "execution_ms": execution_ms,
            "summary": summary,
        }
    )


def log_error(logger: logging.Logger, endpoint: str, error: Exception) -> None:
    logger.error(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": "error",
            "endpoint": endpoint,
            "error_message": str(error),
            "stack_trace": traceback.format_exc(),
        }
    )
