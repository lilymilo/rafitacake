from decimal import Decimal
from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "RAFITACAKE SmartMargin API"
    app_version: str = "1.0.0"
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    # Default margin thresholds
    default_min_margin_percent: Decimal = Decimal("35.00")
    default_max_margin_percent: Decimal = Decimal("50.00")
    default_rounding_step: Decimal = Decimal("500")


settings = Settings()
