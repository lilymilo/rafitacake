from decimal import Decimal
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from backend.app.schemas.common import TargetMode
from backend.app.schemas.reverse_price import ReversePriceInput
from backend.app.services.reverse_price_service import reverse_price_service


def test_reverse_price_nominal_target():
    # HPP 40,000, target profit 20,000, platform fee 0%
    inp = ReversePriceInput(
        hpp=Decimal("40000.00"),
        target_mode=TargetMode.NOMINAL,
        target_value=Decimal("20000.00"),
        admin_fee_percent=Decimal("0.00"),
    )
    res = reverse_price_service.calculate_reverse_price(inp)
    assert res.recommended_final_price == Decimal("60000.00")
    assert res.projected_net_profit == Decimal("20000.00")


def test_reverse_price_percent_target():
    # HPP 50,000, packaging 5,000 = total 55,000
    # Target margin 45%, platform fee 10%
    # Denom = 1 - 0.10 - 0.45 = 0.45
    # Recommended final price = 55,000 / 0.45 = 122,222.22
    inp = ReversePriceInput(
        hpp=Decimal("50000.00"),
        packaging_cost=Decimal("5000.00"),
        target_mode=TargetMode.PERCENT,
        target_value=Decimal("45.00"),
        admin_fee_percent=Decimal("10.00"),
    )
    res = reverse_price_service.calculate_reverse_price(inp)
    assert res.recommended_final_price == Decimal("122222.22")
    assert res.projected_margin_percent == Decimal("45.00")


def test_reverse_price_strikethrough_planned_discount():
    # HPP 50,000, target nominal 50,000 -> final price 100,000
    # Planned discount 20% -> base price = 100,000 / 0.8 = 125,000
    inp = ReversePriceInput(
        hpp=Decimal("50000.00"),
        target_mode=TargetMode.NOMINAL,
        target_value=Decimal("50000.00"),
        planned_discount_percent=Decimal("20.00"),
    )
    res = reverse_price_service.calculate_reverse_price(inp)
    assert res.recommended_final_price == Decimal("100000.00")
    assert res.recommended_base_price == Decimal("125000.00")
    assert res.planned_discount_nominal == Decimal("25000.00")


def test_reverse_price_guard_100_percent():
    # Guard clause: fee (15%) + target margin (85%) = 100% -> must raise 422
    inp = ReversePriceInput(
        hpp=Decimal("50000.00"),
        target_mode=TargetMode.PERCENT,
        target_value=Decimal("85.00"),
        admin_fee_percent=Decimal("15.00"),
    )
    with pytest.raises(HTTPException) as exc_info:
        reverse_price_service.calculate_reverse_price(inp)
    assert exc_info.value.status_code == 422
    assert "100%" in exc_info.value.detail


def test_reverse_price_guard_discount_100_percent():
    # 100% discount is rejected at Pydantic schema validation level
    with pytest.raises(ValidationError):
        ReversePriceInput(
            hpp=Decimal("50000.00"),
            target_mode=TargetMode.NOMINAL,
            target_value=Decimal("20000.00"),
            planned_discount_percent=Decimal("100.00"),
        )
