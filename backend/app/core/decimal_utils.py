"""Core financial Decimal utilities with ROUND_HALF_UP precision."""

from decimal import Decimal, ROUND_HALF_UP
from typing import Union

NumberLike = Union[Decimal, int, float, str]

TWO_PLACES = Decimal("0.01")
ZERO = Decimal("0.00")
HUNDRED = Decimal("100.00")


def to_decimal(value: Union[NumberLike, None], default: Decimal = ZERO) -> Decimal:
    """Safely converts input to Decimal without floating point inaccuracy."""
    if value is None:
        return default
    if isinstance(value, Decimal):
        return value
    try:
        # String conversion prevents binary float artifacts
        return Decimal(str(value).strip())
    except Exception:
        return default


def round_rupiah(value: NumberLike, places: int = 2) -> Decimal:
    """Rounds to fixed decimal places using ROUND_HALF_UP."""
    dec = to_decimal(value)
    exponent = Decimal("10") ** -places
    return dec.quantize(exponent, rounding=ROUND_HALF_UP)


def round_to_step(value: NumberLike, step: NumberLike = Decimal("500")) -> Decimal:
    """Rounds value up to the nearest multiple (e.g. 500, 1000)."""
    val_dec = to_decimal(value)
    step_dec = to_decimal(step)
    if step_dec <= Decimal("0"):
        return round_rupiah(val_dec, 0)
    units = (val_dec / step_dec).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return units * step_dec


def safe_divide(numerator: NumberLike, denominator: NumberLike, fallback: Decimal = ZERO) -> Decimal:
    """Guards against division by zero."""
    num = to_decimal(numerator)
    denom = to_decimal(denominator)
    if denom == Decimal("0"):
        return fallback
    return num / denom


def safe_percentage(part: NumberLike, total: NumberLike, fallback: Decimal = ZERO) -> Decimal:
    """Computes (part / total) * 100 safely."""
    ratio = safe_divide(part, total, fallback=Decimal("0"))
    if ratio == Decimal("0"):
        return fallback
    return round_rupiah(ratio * Decimal("100"), 2)
