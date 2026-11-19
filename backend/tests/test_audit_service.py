import asyncio
from decimal import Decimal
import pytest

from backend.app.schemas.common import MarginStatus
from backend.app.schemas.order_audit import OrderCompleteInput, OrderItemInput
from backend.app.services.audit_service import audit_service
from backend.app.repositories.order_repository import order_repo


def test_order_audit_safe_order():
    inp = OrderCompleteInput(
        order_id="TEST-SAFE-01",
        customer_name="Test Safe User",
        platform_id="direct",
        items=[
            OrderItemInput(
                product_id="demo_tart_coklat",
                quantity=1,
                selling_price=Decimal("155000.00"),
                hpp=Decimal("73000.00"),
            )
        ],
        discount_nominal=Decimal("0.00"),
    )
    result = asyncio.run(audit_service.complete_and_audit_order(inp))
    assert result.is_margin_leaked is False
    assert result.leakage_amount == Decimal("0.00")
    assert result.status in (MarginStatus.SAFE, MarginStatus.OPTIMAL)


def test_order_audit_leaked_order():
    # Selling price 100k, discount 40k -> price after 60k
    # GoFood platform 20% fee = 12,000. Net rev = 48,000.
    # Total HPP = 45,000. Actual profit = 3,000.
    # Margin = 3,000 / 60,000 = 5.00% (< 35% -> LEAKED!)
    inp = OrderCompleteInput(
        order_id="TEST-LEAK-01",
        customer_name="Test Leaked User",
        platform_id="gofood",
        items=[
            OrderItemInput(
                product_id="demo_brownies_fudge",
                quantity=1,
                selling_price=Decimal("100000.00"),
                hpp=Decimal("45000.00"),
            )
        ],
        discount_nominal=Decimal("40000.00"),
    )
    result = asyncio.run(audit_service.complete_and_audit_order(inp))
    assert result.is_margin_leaked is True
    assert result.status == MarginStatus.DANGER
    assert result.actual_margin_percent == Decimal("5.00")
    # Target min profit = 60,000 * 35% = 21,000
    # Leakage amount = 21,000 - 3,000 = 18,000
    assert result.leakage_amount == Decimal("18000.00")


def test_order_repository_filters():
    all_orders = order_repo.list_orders()
    assert len(all_orders) >= 5

    leaked_only = order_repo.list_orders(only_leaked=True)
    assert all(o.is_margin_leaked for o in leaked_only)
    assert len(leaked_only) >= 2
