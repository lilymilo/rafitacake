from decimal import Decimal
import pytest
from fastapi import HTTPException

from backend.app.schemas.common import MarginStatus
from backend.app.schemas.bundle import (
    BundleItemInput,
    BundlePreviewInput,
    BundleCreate,
)
from backend.app.services.bundle_service import bundle_service


def test_bundle_preview_and_savings():
    # Brownies fudge (price 68k, hpp+pack 32.5k) + Roti sisir (price 38k, hpp+pack 21k)
    # Total normal price = 106,000. Combined HPP = 53,500 + packaging 5,000 = 58,500.
    # Bundle selling price: 90,000
    # Customer savings: 106k - 90k = 16,000 (15.09%)
    inp = BundlePreviewInput(
        items=[
            BundleItemInput(product_id="demo_brownies_fudge", quantity=1),
            BundleItemInput(product_id="demo_roti_sisir", quantity=1),
        ],
        packaging_cost=Decimal("5000.00"),
        bundle_selling_price=Decimal("90000.00"),
        platform_preset_id="direct",
    )
    res = bundle_service.preview_bundle(inp)
    assert res.total_normal_price == Decimal("106000.00")
    assert res.customer_savings_nominal == Decimal("16000.00")
    assert res.customer_savings_percent == Decimal("15.09")
    assert res.total_combined_hpp == Decimal("58500.00")
    assert res.net_profit == Decimal("31500.00")
    assert res.margin_percent == Decimal("35.00")
    assert res.status == MarginStatus.SAFE


def test_bundle_create_danger_publish_protection():
    # Price 60,000 when combined HPP is 58,500 -> net profit 1,500 -> margin ~2.5% (DANGER)
    danger_bundle = BundleCreate(
        name="Paket Terlalu Murah",
        description="Bundling rugi",
        items=[
            BundleItemInput(product_id="demo_brownies_fudge", quantity=1),
            BundleItemInput(product_id="demo_roti_sisir", quantity=1),
        ],
        packaging_cost=Decimal("5000.00"),
        bundle_selling_price=Decimal("60000.00"),
        is_published=True,
        force_publish=False,
    )
    # Must raise 422 because status is DANGER and force_publish is False
    with pytest.raises(HTTPException) as exc_info:
        bundle_service.create_bundle(danger_bundle)
    assert exc_info.value.status_code == 422
    assert "DANGER" in exc_info.value.detail


def test_bundle_create_danger_with_force_publish():
    # With force_publish: True, it should succeed
    danger_bundle = BundleCreate(
        name="Paket Promo Rugi Tapi Dipaksa",
        items=[
            BundleItemInput(product_id="demo_brownies_fudge", quantity=1),
            BundleItemInput(product_id="demo_roti_sisir", quantity=1),
        ],
        packaging_cost=Decimal("5000.00"),
        bundle_selling_price=Decimal("60000.00"),
        is_published=True,
        force_publish=True,
    )
    res = bundle_service.create_bundle(danger_bundle)
    assert res.status == MarginStatus.DANGER
    assert res.is_published is True
