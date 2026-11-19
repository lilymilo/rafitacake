from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.app.schemas.common import MarginStatus


class MarketplaceSyncItemInput(BaseModel):
    product_id: str
    proposed_price: Decimal = Field(..., gt=0)
    proposed_discount_percent: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    proposed_discount_nominal: Decimal = Field(default=Decimal("0.00"), ge=0)


class MarketplaceSyncPreviewInput(BaseModel):
    platform_id: str
    items: List[MarketplaceSyncItemInput] = Field(..., min_length=1)
    allow_danger: bool = False


class MarketplaceSyncItemResult(BaseModel):
    product_id: str
    product_name: str
    proposed_price: Decimal
    price_after_discount: Decimal
    net_profit: Decimal
    margin_percent: Decimal
    status: MarginStatus
    is_safe_to_sync: bool
    rejection_reason: Optional[str] = None


class MarketplaceSyncResult(BaseModel):
    platform_id: str
    platform_name: str
    can_sync: bool
    total_items: int
    safe_items_count: int
    danger_items_count: int
    items: List[MarketplaceSyncItemResult]
    mock_marketplace_payload: Dict[str, Any]
