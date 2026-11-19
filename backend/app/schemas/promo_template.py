from decimal import Decimal
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field
from backend.app.schemas.common import MarginStatus


class PromoDiscountType(str, Enum):
    PERCENT = "PERCENT"
    NOMINAL = "NOMINAL"


class PromoTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str = Field(default="", max_length=255)
    platform_preset_id: Optional[str] = None
    discount_type: PromoDiscountType = Field(default=PromoDiscountType.PERCENT)
    discount_value: Decimal = Field(..., gt=0)


class PromoTemplateCreate(PromoTemplateBase):
    id: Optional[str] = None


class PromoTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = None
    platform_preset_id: Optional[str] = None
    discount_type: Optional[PromoDiscountType] = None
    discount_value: Optional[Decimal] = Field(None, gt=0)


class PromoTemplateResponse(PromoTemplateBase):
    id: str


class ApplyPromoInput(BaseModel):
    product_id: Optional[str] = None
    product_ids: Optional[List[str]] = None


class ApplyPromoProductItem(BaseModel):
    product_id: str
    product_name: str
    original_price: Decimal
    discount_nominal: Decimal
    price_after_discount: Decimal
    net_profit: Decimal
    margin_percent: Decimal
    status: MarginStatus
    alert_message: str


class ApplyPromoResult(BaseModel):
    template_id: str
    template_name: str
    discount_type: PromoDiscountType
    discount_value: Decimal
    total_evaluated: int
    safe_count: int
    danger_count: int
    products: List[ApplyPromoProductItem]
