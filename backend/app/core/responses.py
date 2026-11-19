"""Standardized JSON response envelope with Decimal & Pydantic serialization."""

from typing import Any, Optional
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
    headers: Optional[dict[str, str]] = None,
) -> JSONResponse:
    content = {
        "success": True,
        "message": message,
        "data": jsonable_encoder(data),
        "errors": None,
    }
    return JSONResponse(status_code=status_code, content=content, headers=headers)


def error_response(
    message: str = "Error occurred",
    errors: Any = None,
    status_code: int = 400,
) -> JSONResponse:
    content = {
        "success": False,
        "message": message,
        "data": None,
        "errors": jsonable_encoder(errors if errors is not None else [message]),
    }
    return JSONResponse(status_code=status_code, content=content)
