from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import FeeBase


class PlatformFeeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    commission_pct: Decimal = Field(default=Decimal("0.00"), ge=0, lt=100)
    service_pct: Decimal = Field(default=Decimal("0.00"), ge=0, lt=100)
    fixed_fee: Decimal = Field(default=Decimal("0.00"), ge=0)
    fee_base: FeeBase = Field(default=FeeBase.AFTER_DISCOUNT)
    configured: bool = True
    note: str = ""


class PlatformFeeCreate(PlatformFeeBase):
    id: Optional[str] = None


class PlatformFeeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    commission_pct: Optional[Decimal] = Field(None, ge=0, lt=100)
    service_pct: Optional[Decimal] = Field(None, ge=0, lt=100)
    fixed_fee: Optional[Decimal] = Field(None, ge=0)
    fee_base: Optional[FeeBase] = None
    configured: Optional[bool] = None
    note: Optional[str] = None


class PlatformFeeResponse(PlatformFeeBase):
    id: str
    built_in: bool = False
