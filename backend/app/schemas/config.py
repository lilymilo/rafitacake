from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class MarginConfigUpdate(BaseModel):
    target_min_margin_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    target_max_margin_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    rounding_step: Optional[Decimal] = Field(None, gt=0)


class MarginConfigResponse(BaseModel):
    target_min_margin_percent: Decimal
    target_max_margin_percent: Decimal
    rounding_step: Decimal
