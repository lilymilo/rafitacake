from enum import Enum
from typing import Generic, Optional, TypeVar, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class MarginStatus(str, Enum):
    DANGER = "DANGER"
    SAFE = "SAFE"
    OPTIMAL = "OPTIMAL"


class FeeBase(str, Enum):
    AFTER_DISCOUNT = "afterDiscount"
    BEFORE_DISCOUNT = "beforeDiscount"


class TargetMode(str, Enum):
    NOMINAL = "NOMINAL"
    PERCENT = "PERCENT"


class BaseResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Success"
    data: Optional[T] = None
    errors: Optional[Any] = None
