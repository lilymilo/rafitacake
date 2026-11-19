from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    hpp: Decimal = Field(..., ge=0)
    packaging: Decimal = Field(default=Decimal("0.00"), ge=0)
    price: Decimal = Field(..., gt=0)
    discount_pct: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    platform_id: Optional[str] = None
    is_demo: bool = False


class ProductCreate(ProductBase):
    id: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    hpp: Optional[Decimal] = Field(None, ge=0)
    packaging: Optional[Decimal] = Field(None, ge=0)
    price: Optional[Decimal] = Field(None, gt=0)
    discount_pct: Optional[Decimal] = Field(None, ge=0, le=100)
    discount_amount: Optional[Decimal] = Field(None, ge=0)
    platform_id: Optional[str] = None


class ProductResponse(ProductBase):
    id: str
    created_at: str
    updated_at: str
