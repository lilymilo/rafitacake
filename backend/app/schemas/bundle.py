from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from backend.app.schemas.common import MarginStatus


class BundleItemInput(BaseModel):
    product_id: str
    quantity: int = Field(default=1, gt=0)


class BundleItemDetail(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_hpp: Decimal
    unit_price: Decimal
    subtotal_hpp: Decimal
    subtotal_price: Decimal


class BundlePreviewInput(BaseModel):
    items: List[BundleItemInput] = Field(..., min_length=1)
    packaging_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    bundle_selling_price: Decimal = Field(..., gt=0)
    platform_preset_id: Optional[str] = None


class BundleCreate(BundlePreviewInput):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=150)
    description: str = Field(default="", max_length=255)
    is_published: bool = False
    force_publish: bool = False


class BundleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    items: Optional[List[BundleItemInput]] = Field(None, min_length=1)
    packaging_cost: Optional[Decimal] = Field(None, ge=0)
    bundle_selling_price: Optional[Decimal] = Field(None, gt=0)
    platform_preset_id: Optional[str] = None
    is_published: Optional[bool] = None
    force_publish: Optional[bool] = False


class BundleResponse(BaseModel):
    id: str
    name: str
    description: str
    items: List[BundleItemDetail]
    packaging_cost: Decimal
    bundle_selling_price: Decimal
    total_normal_price: Decimal
    customer_savings_nominal: Decimal
    customer_savings_percent: Decimal
    total_combined_hpp: Decimal
    total_platform_fees: Decimal
    net_revenue: Decimal
    net_profit: Decimal
    margin_percent: Decimal
    status: MarginStatus
    alert_message: str
    is_published: bool
