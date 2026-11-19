from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from backend.app.schemas.common import MarginStatus, FeeBase


class FeeBreakdown(BaseModel):
    fee_base_amount: Decimal
    admin_fee: Decimal
    service_fee: Decimal
    fixed_fee: Decimal
    total_platform_fees: Decimal


class MarginCalculationInput(BaseModel):
    hpp: Optional[Decimal] = Field(None, ge=0)
    product_id: Optional[str] = None
    selling_price: Decimal = Field(..., ge=0)
    discount_percent: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    discount_nominal: Decimal = Field(default=Decimal("0.00"), ge=0)
    packaging_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    platform_preset_id: Optional[str] = None
    admin_fee_percent: Decimal = Field(default=Decimal("0.00"), ge=0, lt=100)
    service_fee_percent: Decimal = Field(default=Decimal("0.00"), ge=0, lt=100)
    fixed_fee: Decimal = Field(default=Decimal("0.00"), ge=0)
    fee_base: FeeBase = Field(default=FeeBase.AFTER_DISCOUNT)


class MarginResult(BaseModel):
    selling_price: Decimal
    total_discount_nominal: Decimal
    price_after_discount: Decimal
    fees: FeeBreakdown
    total_platform_fees: Decimal
    total_cost: Decimal
    net_revenue: Decimal
    net_profit: Decimal
    margin_percent: Decimal
    markup_percent: Optional[Decimal] = None
    status: MarginStatus
    alert_message: str
    profit_shortfall: Decimal
    max_safe_discount_percent: Decimal
    max_safe_discount_nominal: Decimal
    minimum_required_price: Decimal


class MultiPlatformItemResult(BaseModel):
    platform_id: str
    platform_name: str
    admin_fee_percent: Decimal
    service_fee_percent: Decimal
    fixed_fee: Decimal
    total_platform_fees: Decimal
    net_revenue: Decimal
    net_profit: Decimal
    margin_percent: Decimal
    status: MarginStatus
    alert_message: str


class MultiPlatformCalculationResult(BaseModel):
    selling_price: Decimal
    price_after_discount: Decimal
    hpp: Decimal
    packaging_cost: Decimal
    platforms: List[MultiPlatformItemResult]


class SliderCurveInput(BaseModel):
    hpp: Optional[Decimal] = Field(None, ge=0)
    product_id: Optional[str] = None
    selling_price: Decimal = Field(..., gt=0)
    packaging_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    platform_preset_id: Optional[str] = None
    admin_fee_percent: Decimal = Field(default=Decimal("0.00"), ge=0, lt=100)
    service_fee_percent: Decimal = Field(default=Decimal("0.00"), ge=0, lt=100)
    fixed_fee: Decimal = Field(default=Decimal("0.00"), ge=0)
    fee_base: FeeBase = Field(default=FeeBase.AFTER_DISCOUNT)
    min_discount: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    max_discount: Decimal = Field(default=Decimal("50.00"), ge=0, le=100)
    step: Decimal = Field(default=Decimal("1.00"), gt=0, le=50)


class SliderCurvePoint(BaseModel):
    discount_percent: Decimal
    price_after_discount: Decimal
    net_revenue: Decimal
    net_profit: Decimal
    margin_percent: Decimal
    status: MarginStatus
    is_danger: bool


class SliderCurveResult(BaseModel):
    points: List[SliderCurvePoint]
    max_safe_discount_percent: Decimal
    minimum_required_price: Decimal
