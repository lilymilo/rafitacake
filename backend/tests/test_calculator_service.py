from decimal import Decimal
import pytest

from backend.app.schemas.common import MarginStatus, FeeBase
from backend.app.schemas.calculator import (
    MarginCalculationInput,
    SliderCurveInput,
)
from backend.app.services.calculator_service import calculator_service


def test_smartmargin_guard_basic():
    # Selling price 100,000, HPP 50,000, 10% disc, platform 10% fee
    inp = MarginCalculationInput(
        hpp=Decimal("50000.00"),
        packaging_cost=Decimal("5000.00"),
        selling_price=Decimal("100000.00"),
        discount_percent=Decimal("10.00"),
        admin_fee_percent=Decimal("10.00"),
        service_fee_percent=Decimal("0.00"),
        fixed_fee=Decimal("0.00"),
    )
    res = calculator_service.calculate_margin(inp)

    # 100k - 10k disc = 90k after discount
    assert res.price_after_discount == Decimal("90000.00")
    # 10% fee on 90k = 9,000
    assert res.total_platform_fees == Decimal("9000.00")
    # Net rev = 90k - 9k = 81,000
    assert res.net_revenue == Decimal("81000.00")
    # Total cost = 50k + 5k = 55,000
    assert res.total_cost == Decimal("55000.00")
    # Net profit = 81k - 55k = 26,000
    assert res.net_profit == Decimal("26000.00")
    # Margin = 26,000 / 90,000 * 100 = 28.89% (< 35% -> DANGER)
    assert res.margin_percent == Decimal("28.89")
    assert res.status == MarginStatus.DANGER
    assert res.profit_shortfall > Decimal("0.00")


def test_margin_alert_safe_and_optimal():
    # SAFE case: Margin between 35% and 50%
    # Price 100k, HPP 50k, 0 disc, 0 fee -> profit 50k (50.00% -> SAFE)
    safe_inp = MarginCalculationInput(
        hpp=Decimal("55000.00"),
        selling_price=Decimal("100000.00"),
        admin_fee_percent=Decimal("5.00"),
    )
    # Price 100k, fee 5k -> rev 95k - 55k = 40k profit (40.00% -> SAFE)
    safe_res = calculator_service.calculate_margin(safe_inp)
    assert safe_res.margin_percent == Decimal("40.00")
    assert safe_res.status == MarginStatus.SAFE
    assert safe_res.profit_shortfall == Decimal("0.00")

    # OPTIMAL case: Margin > 50%
    optimal_inp = MarginCalculationInput(
        hpp=Decimal("30000.00"),
        selling_price=Decimal("100000.00"),
        admin_fee_percent=Decimal("0.00"),
    )
    optimal_res = calculator_service.calculate_margin(optimal_inp)
    assert optimal_res.margin_percent == Decimal("70.00")
    assert optimal_res.status == MarginStatus.OPTIMAL


def test_margin_alert_exact_boundary_35():
    # Exactly 35.00% margin should be SAFE
    # Let net price = 100,000, fee = 0. We need net profit = 35,000, so HPP = 65,000.
    inp = MarginCalculationInput(
        hpp=Decimal("65000.00"),
        selling_price=Decimal("100000.00"),
        admin_fee_percent=Decimal("0.00"),
        service_fee_percent=Decimal("0.00"),
        fixed_fee=Decimal("0.00"),
    )
    res = calculator_service.calculate_margin(inp)
    assert res.margin_percent == Decimal("35.00")
    assert res.status == MarginStatus.SAFE


def test_max_safe_discount_calculation():
    # HPP 40,000, selling price 100,000, fee 10%, min margin 35%
    # Denom = 1 - 0.10 - 0.35 = 0.55
    # P_net_min = 40,000 / 0.55 = 72,727.27
    # Max discount nominal = 100,000 - 72,727.27 = 27,272.73
    # Max discount percent = 27,272.73 / 100,000 * 100 = 27.27%
    inp = MarginCalculationInput(
        hpp=Decimal("40000.00"),
        selling_price=Decimal("100000.00"),
        admin_fee_percent=Decimal("10.00"),
    )
    res = calculator_service.calculate_margin(inp)
    assert res.minimum_required_price == Decimal("72727.27")
    assert res.max_safe_discount_nominal == Decimal("27272.73")
    assert res.max_safe_discount_percent == Decimal("27.27")


def test_max_safe_discount_when_already_danger():
    # If selling price is already below minimum required price, max safe discount must be 0%
    inp = MarginCalculationInput(
        hpp=Decimal("80000.00"),
        selling_price=Decimal("100000.00"),
        admin_fee_percent=Decimal("10.00"),
    )
    res = calculator_service.calculate_margin(inp)
    assert res.max_safe_discount_percent == Decimal("0.00")
    assert res.max_safe_discount_nominal == Decimal("0.00")
    assert res.minimum_required_price > Decimal("100000.00")


def test_multi_platform_simulation():
    inp = MarginCalculationInput(
        hpp=Decimal("30000.00"),
        selling_price=Decimal("80000.00"),
        discount_percent=Decimal("5.00"),
    )
    res = calculator_service.calculate_multi_platform(inp)
    assert len(res.platforms) >= 5
    # Must be ordered descending by margin_percent
    for i in range(len(res.platforms) - 1):
        assert res.platforms[i].margin_percent >= res.platforms[i + 1].margin_percent


def test_slider_curve():
    inp = SliderCurveInput(
        hpp=Decimal("25000.00"),
        selling_price=Decimal("60000.00"),
        min_discount=Decimal("0.00"),
        max_discount=Decimal("30.00"),
        step=Decimal("5.00"),
    )
    res = calculator_service.calculate_slider_curve(inp)
    # Discounts: 0, 5, 10, 15, 20, 25, 30 -> 7 points
    assert len(res.points) == 7
    assert res.points[0].discount_percent == Decimal("0.00")
    assert res.points[-1].discount_percent == Decimal("30.00")
    # Margin must decrease as discount increases
    assert res.points[0].margin_percent > res.points[-1].margin_percent


def test_edge_cases():
    # Zero selling price
    zero_price = MarginCalculationInput(
        hpp=Decimal("10000.00"),
        selling_price=Decimal("0.00"),
    )
    res_zero = calculator_service.calculate_margin(zero_price)
    assert res_zero.status == MarginStatus.DANGER
    assert res_zero.net_profit == Decimal("-10000.00")

    # 100% discount
    full_disc = MarginCalculationInput(
        hpp=Decimal("10000.00"),
        selling_price=Decimal("50000.00"),
        discount_percent=Decimal("100.00"),
    )
    res_full = calculator_service.calculate_margin(full_disc)
    assert res_full.price_after_discount == Decimal("0.00")
    assert res_full.status == MarginStatus.DANGER
