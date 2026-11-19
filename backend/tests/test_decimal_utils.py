from decimal import Decimal
import pytest

from backend.app.core.decimal_utils import (
    to_decimal,
    round_rupiah,
    round_to_step,
    safe_divide,
    safe_percentage,
)


def test_to_decimal_conversions():
    assert to_decimal(100) == Decimal("100")
    assert to_decimal("25000.50") == Decimal("25000.50")
    assert to_decimal(None, Decimal("0")) == Decimal("0")
    assert to_decimal("invalid", Decimal("99")) == Decimal("99")


def test_round_rupiah_half_up():
    # 0.005 should round up to 0.01
    assert round_rupiah(Decimal("100.005")) == Decimal("100.01")
    # 0.004 should round down to 0.00
    assert round_rupiah(Decimal("100.004")) == Decimal("100.00")
    # Exact integer rounding
    assert round_rupiah(Decimal("15000.40"), places=0) == Decimal("15000")
    assert round_rupiah(Decimal("15000.50"), places=0) == Decimal("15001")


def test_round_to_step():
    assert round_to_step(Decimal("12300"), Decimal("500")) == Decimal("12500")
    assert round_to_step(Decimal("12200"), Decimal("500")) == Decimal("12000")
    assert round_to_step(Decimal("12500"), Decimal("1000")) == Decimal("13000")


def test_safe_divide():
    assert safe_divide(Decimal("100"), Decimal("0")) == Decimal("0.00")
    assert safe_divide(Decimal("100"), Decimal("4")) == Decimal("25")
    assert safe_divide(Decimal("100"), Decimal("0"), fallback=Decimal("-1")) == Decimal("-1")


def test_safe_percentage():
    assert safe_percentage(Decimal("25"), Decimal("100")) == Decimal("25.00")
    assert safe_percentage(Decimal("1"), Decimal("3")) == Decimal("33.33")
    assert safe_percentage(Decimal("50"), Decimal("0")) == Decimal("0.00")
