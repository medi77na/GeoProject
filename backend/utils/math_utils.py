"""Small math helpers shared across services."""

from typing import Sequence


def clamp_unit(value: float) -> float:
    """Clamp a numeric value to the [0, 1] interval."""
    return max(0.0, min(1.0, float(value)))


def safe_average(values: Sequence[float]) -> float:
    """Return the arithmetic mean or 0.0 when the sequence is empty."""
    if not values:
        return 0.0
    return float(sum(values) / len(values))
