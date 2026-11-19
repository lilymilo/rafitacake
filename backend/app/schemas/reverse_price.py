from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import TargetMode, MarginStatus
from backend.app.schemas.calculator import FeeBreakdown


class ReversePriceInput(BaseModel):
    hpp: Optional[Decimal] = Field(None, ge=0)
    product_id: Optional[str] = None
    packaging_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    target_mode: TargetMode = Field(..., description="NOMINAL (Rp) or PERCENT (%)")
    target_value: Decimal = Field(..., gt=0, description="Target profit nominal or target margin %")
    platform_preset_id: Optional[str] = None
    admin_fee_percent: Decimal = Field(default=Decimal("0.00"), ge=0, lt=100)
    service_fee_percent: Decimal = Field(default=Decimal("0.00"), ge=0, lt=100)
    fixed_fee: Decimal = Field(default=Decimal("0.00"), ge=0)
    planned_discount_percent: Decimal = Field(default=Decimal("0.00"), ge=0, lt=100)


class ReversePriceResult(BaseModel):
    recommended_final_price: Decimal
    recommended_base_price: Decimal
    rounded_base_price: Decimal
    planned_discount_percent: Decimal
    planned_discount_nominal: Decimal
    max_safe_discount_percent: Decimal
    projected_net_revenue: Decimal
    projected_net_profit: Decimal
    projected_margin_percent: Decimal
    fees: FeeBreakdown
    status: MarginStatus
