from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel
from backend.app.schemas.order_audit import OrderAuditResult


class DailyReportSummary(BaseModel):
    start_date: str
    end_date: str
    total_orders: int
    total_gross_revenue: Decimal
    total_discount_amount: Decimal
    total_platform_fees: Decimal
    total_hpp: Decimal
    total_net_profit: Decimal
    average_margin_percent: Decimal
    safe_order_count: int
    leaked_order_count: int
    total_leakage_amount: Decimal


class DailyReportResult(BaseModel):
    summary: DailyReportSummary
    orders: List[OrderAuditResult]
