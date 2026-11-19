from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field
from backend.app.schemas.common import MarginStatus


class OrderItemInput(BaseModel):
    product_id: str
    quantity: int = Field(default=1, gt=0)
    selling_price: Decimal = Field(..., gt=0)
    hpp: Optional[Decimal] = Field(None, ge=0)


class OrderCompleteInput(BaseModel):
    order_id: Optional[str] = None
    customer_name: str = Field(default="Pelanggan Toko")
    platform_id: str = Field(..., min_length=1)
    items: List[OrderItemInput] = Field(..., min_length=1)
    discount_nominal: Decimal = Field(default=Decimal("0.00"), ge=0)
    order_date: Optional[str] = None


class OrderAuditResult(BaseModel):
    order_id: str
    order_date: str
    customer_name: str
    platform_id: str
    platform_name: str
    gross_revenue: Decimal
    discount_amount: Decimal
    net_revenue: Decimal
    total_platform_fees: Decimal
    total_hpp: Decimal
    actual_net_profit: Decimal
    actual_margin_percent: Decimal
    target_min_margin_percent: Decimal
    is_margin_leaked: bool
    leakage_amount: Decimal
    status: MarginStatus
