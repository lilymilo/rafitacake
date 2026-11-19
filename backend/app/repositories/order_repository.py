from decimal import Decimal
from threading import Lock
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta

from backend.app.schemas.order_audit import OrderAuditResult
from backend.app.schemas.common import MarginStatus


class OrderRepository:
    def __init__(self) -> None:
        self._lock = Lock()
        self._orders: Dict[str, OrderAuditResult] = {}
        self._seed_default_orders()

    def _seed_default_orders(self) -> None:
        today = datetime.now(timezone.utc).date()
        yesterday = today - timedelta(days=1)
        today_str = today.isoformat()
        yesterday_str = yesterday.isoformat()

        seeds = [
            OrderAuditResult(
                order_id="ORD-1001",
                order_date=yesterday_str,
                customer_name="Siti Rahma",
                platform_id="direct",
                platform_name="Website Direct",
                gross_revenue=Decimal("155000.00"),
                discount_amount=Decimal("0.00"),
                net_revenue=Decimal("155000.00"),
                total_platform_fees=Decimal("0.00"),
                total_hpp=Decimal("73000.00"),
                actual_net_profit=Decimal("82000.00"),
                actual_margin_percent=Decimal("52.90"),
                target_min_margin_percent=Decimal("35.00"),
                is_margin_leaked=False,
                leakage_amount=Decimal("0.00"),
                status=MarginStatus.OPTIMAL,
            ),
            OrderAuditResult(
                order_id="ORD-1002",
                order_date=yesterday_str,
                customer_name="Budi Santoso",
                platform_id="tokopedia",
                platform_name="Tokopedia",
                gross_revenue=Decimal("68000.00"),
                discount_amount=Decimal("5000.00"),
                net_revenue=Decimal("56330.00"),
                total_platform_fees=Decimal("6670.00"),
                total_hpp=Decimal("32500.00"),
                actual_net_profit=Decimal("23830.00"),
                actual_margin_percent=Decimal("37.83"),
                target_min_margin_percent=Decimal("35.00"),
                is_margin_leaked=False,
                leakage_amount=Decimal("0.00"),
                status=MarginStatus.SAFE,
            ),
            OrderAuditResult(
                order_id="ORD-1003",
                order_date=yesterday_str,
                customer_name="Ahmad Dani",
                platform_id="gofood",
                platform_name="GoFood",
                gross_revenue=Decimal("55000.00"),
                discount_amount=Decimal("15000.00"),
                net_revenue=Decimal("32000.00"),
                total_platform_fees=Decimal("8000.00"),
                total_hpp=Decimal("25500.00"),
                actual_net_profit=Decimal("6500.00"),
                actual_margin_percent=Decimal("16.25"),
                target_min_margin_percent=Decimal("35.00"),
                is_margin_leaked=True,
                leakage_amount=Decimal("7500.00"),
                status=MarginStatus.DANGER,
            ),
            OrderAuditResult(
                order_id="ORD-1004",
                order_date=today_str,
                customer_name="Dewi Lestari",
                platform_id="grabfood",
                platform_name="GrabFood",
                gross_revenue=Decimal("38000.00"),
                discount_amount=Decimal("12000.00"),
                net_revenue=Decimal("20800.00"),
                total_platform_fees=Decimal("5200.00"),
                total_hpp=Decimal("21000.00"),
                actual_net_profit=Decimal("-200.00"),
                actual_margin_percent=Decimal("-0.77"),
                target_min_margin_percent=Decimal("35.00"),
                is_margin_leaked=True,
                leakage_amount=Decimal("9300.00"),
                status=MarginStatus.DANGER,
            ),
            OrderAuditResult(
                order_id="ORD-1005",
                order_date=today_str,
                customer_name="Rian Pratama",
                platform_id="shopee",
                platform_name="Shopee",
                gross_revenue=Decimal("75000.00"),
                discount_amount=Decimal("0.00"),
                net_revenue=Decimal("66500.00"),
                total_platform_fees=Decimal("8500.00"),
                total_hpp=Decimal("37000.00"),
                actual_net_profit=Decimal("29500.00"),
                actual_margin_percent=Decimal("39.33"),
                target_min_margin_percent=Decimal("35.00"),
                is_margin_leaked=False,
                leakage_amount=Decimal("0.00"),
                status=MarginStatus.SAFE,
            ),
            OrderAuditResult(
                order_id="ORD-1006",
                order_date=today_str,
                customer_name="Linda Kartika",
                platform_id="shopee",
                platform_name="Shopee",
                gross_revenue=Decimal("68000.00"),
                discount_amount=Decimal("20000.00"),
                net_revenue=Decimal("42200.00"),
                total_platform_fees=Decimal("5800.00"),
                total_hpp=Decimal("32500.00"),
                actual_net_profit=Decimal("9700.00"),
                actual_margin_percent=Decimal("20.21"),
                target_min_margin_percent=Decimal("35.00"),
                is_margin_leaked=True,
                leakage_amount=Decimal("7100.00"),
                status=MarginStatus.DANGER,
            ),
        ]
        for ord_item in seeds:
            self._orders[ord_item.order_id] = ord_item

    def list_orders(
        self,
        platform_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        only_leaked: bool = False,
    ) -> List[OrderAuditResult]:
        with self._lock:
            results = list(self._orders.values())
            if platform_id:
                results = [o for o in results if o.platform_id == platform_id]
            if start_date:
                results = [o for o in results if o.order_date >= start_date]
            if end_date:
                results = [o for o in results if o.order_date <= end_date]
            if only_leaked:
                results = [o for o in results if o.is_margin_leaked]
            # Order newest first
            results.sort(key=lambda x: x.order_date, reverse=True)
            return results

    def get_by_id(self, order_id: str) -> Optional[OrderAuditResult]:
        with self._lock:
            return self._orders.get(order_id)

    def add_order(self, order: OrderAuditResult) -> OrderAuditResult:
        with self._lock:
            self._orders[order.order_id] = order
            return order


order_repo = OrderRepository()
