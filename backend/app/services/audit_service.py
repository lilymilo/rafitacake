from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
import uuid

from backend.app.core.decimal_utils import (
    round_rupiah,
    safe_percentage,
    to_decimal,
)
from backend.app.core.events import event_bus
from backend.app.schemas.common import MarginStatus, FeeBase
from backend.app.schemas.order_audit import OrderCompleteInput, OrderAuditResult
from backend.app.repositories.platform_repository import platform_repo
from backend.app.repositories.product_repository import product_repo
from backend.app.repositories.config_repository import config_repo
from backend.app.repositories.order_repository import order_repo


class AuditService:
    async def complete_and_audit_order(self, inp: OrderCompleteInput) -> OrderAuditResult:
        order_date = inp.order_date or datetime.now(timezone.utc).date().isoformat()
        order_id = inp.order_id or f"ORD-{uuid.uuid4().hex[:6].upper()}"

        plat = platform_repo.get_by_id(inp.platform_id)
        plat_name = plat.name if plat else inp.platform_id
        admin_fee_pct = plat.commission_pct if plat else Decimal("0.00")
        service_fee_pct = plat.service_pct if plat else Decimal("0.00")
        fixed_fee = plat.fixed_fee if plat else Decimal("0.00")
        fee_base = plat.fee_base if plat else FeeBase.AFTER_DISCOUNT

        gross_revenue = Decimal("0.00")
        total_hpp = Decimal("0.00")

        for item in inp.items:
            subtotal_price = round_rupiah(item.selling_price * item.quantity)
            gross_revenue += subtotal_price

            item_hpp = item.hpp
            if item_hpp is None:
                p = product_repo.get_by_id(item.product_id)
                if p:
                    item_hpp = p.hpp + p.packaging
                else:
                    item_hpp = Decimal("0.00")

            total_hpp += round_rupiah(to_decimal(item_hpp) * item.quantity)

        # Discount & net price
        discount_amount = min(gross_revenue, round_rupiah(inp.discount_nominal))
        price_after_discount = max(Decimal("0.00"), gross_revenue - discount_amount)

        # Platform fees
        fee_base_amount = price_after_discount if fee_base == FeeBase.AFTER_DISCOUNT else gross_revenue
        admin_fee = round_rupiah(fee_base_amount * (admin_fee_pct / Decimal("100.00")))
        service_fee = round_rupiah(fee_base_amount * (service_fee_pct / Decimal("100.00")))
        total_platform_fees = round_rupiah(admin_fee + service_fee + fixed_fee)

        net_revenue = round_rupiah(price_after_discount - total_platform_fees)
        actual_net_profit = round_rupiah(net_revenue - total_hpp)
        actual_margin_percent = safe_percentage(actual_net_profit, price_after_discount)

        # Check leakage against target margin
        cfg = config_repo.get_config()
        target_min = cfg.target_min_margin_percent
        target_max = cfg.target_max_margin_percent

        is_margin_leaked = (actual_margin_percent < target_min) or (actual_net_profit <= Decimal("0.00"))

        if is_margin_leaked:
            status = MarginStatus.DANGER
            target_min_profit = round_rupiah(price_after_discount * (target_min / Decimal("100.00")))
            leakage_amount = max(Decimal("0.00"), round_rupiah(target_min_profit - actual_net_profit))
        elif actual_margin_percent <= target_max:
            status = MarginStatus.SAFE
            leakage_amount = Decimal("0.00")
        else:
            status = MarginStatus.OPTIMAL
            leakage_amount = Decimal("0.00")

        audit_result = OrderAuditResult(
            order_id=order_id,
            order_date=order_date,
            customer_name=inp.customer_name,
            platform_id=inp.platform_id,
            platform_name=plat_name,
            gross_revenue=gross_revenue,
            discount_amount=discount_amount,
            net_revenue=net_revenue,
            total_platform_fees=total_platform_fees,
            total_hpp=total_hpp,
            actual_net_profit=actual_net_profit,
            actual_margin_percent=actual_margin_percent,
            target_min_margin_percent=target_min,
            is_margin_leaked=is_margin_leaked,
            leakage_amount=leakage_amount,
            status=status,
        )

        order_repo.add_order(audit_result)

        # Broadcast SSE event on margin leakage
        if is_margin_leaked:
            await event_bus.publish(
                "MARGIN_LEAKAGE",
                {
                    "order_id": order_id,
                    "platform_name": plat_name,
                    "actual_margin": str(actual_margin_percent),
                    "leakage_amount": str(leakage_amount),
                    "status": "DANGER",
                },
            )

        return audit_result


audit_service = AuditService()
