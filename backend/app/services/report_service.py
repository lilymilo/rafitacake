import csv
import io
from decimal import Decimal
from typing import Optional

from backend.app.core.decimal_utils import (
    round_rupiah,
    safe_percentage,
)
from backend.app.schemas.report import DailyReportResult, DailyReportSummary
from backend.app.repositories.order_repository import order_repo


class ReportService:
    def generate_daily_report(
        self,
        date: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        platform_id: Optional[str] = None,
    ) -> DailyReportResult:
        s_date = start_date or date or ""
        e_date = end_date or date or ""

        orders = order_repo.list_orders(
            platform_id=platform_id,
            start_date=s_date if s_date else None,
            end_date=e_date if e_date else None,
        )

        total_orders = len(orders)
        total_gross_revenue = Decimal("0.00")
        total_discount_amount = Decimal("0.00")
        total_platform_fees = Decimal("0.00")
        total_hpp = Decimal("0.00")
        total_net_profit = Decimal("0.00")
        safe_order_count = 0
        leaked_order_count = 0
        total_leakage_amount = Decimal("0.00")

        for ord_item in orders:
            total_gross_revenue += ord_item.gross_revenue
            total_discount_amount += ord_item.discount_amount
            total_platform_fees += ord_item.total_platform_fees
            total_hpp += ord_item.total_hpp
            total_net_profit += ord_item.actual_net_profit
            total_leakage_amount += ord_item.leakage_amount
            if ord_item.is_margin_leaked:
                leaked_order_count += 1
            else:
                safe_order_count += 1

        effective_turnover = max(Decimal("0.00"), total_gross_revenue - total_discount_amount)
        average_margin_percent = safe_percentage(total_net_profit, effective_turnover)

        summary = DailyReportSummary(
            start_date=s_date if s_date else "ALL",
            end_date=e_date if e_date else "ALL",
            total_orders=total_orders,
            total_gross_revenue=round_rupiah(total_gross_revenue),
            total_discount_amount=round_rupiah(total_discount_amount),
            total_platform_fees=round_rupiah(total_platform_fees),
            total_hpp=round_rupiah(total_hpp),
            total_net_profit=round_rupiah(total_net_profit),
            average_margin_percent=average_margin_percent,
            safe_order_count=safe_order_count,
            leaked_order_count=leaked_order_count,
            total_leakage_amount=round_rupiah(total_leakage_amount),
        )

        return DailyReportResult(summary=summary, orders=orders)

    def export_csv(
        self,
        date: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        platform_id: Optional[str] = None,
    ) -> str:
        report = self.generate_daily_report(
            date=date,
            start_date=start_date,
            end_date=end_date,
            platform_id=platform_id,
        )

        output = io.StringIO()
        writer = csv.writer(output, lineterminator="\n")

        # Headers
        writer.writerow([
            "Order ID",
            "Tanggal",
            "Pelanggan",
            "Platform",
            "Omzet Kotor (Rp)",
            "Diskon Promo (Rp)",
            "Biaya Platform (Rp)",
            "Total HPP (Rp)",
            "Laba Bersih (Rp)",
            "Margin (%)",
            "Status Margin",
            "Bocor Margin",
            "Nominal Kebocoran (Rp)",
        ])

        for o in report.orders:
            writer.writerow([
                o.order_id,
                o.order_date,
                o.customer_name,
                o.platform_name,
                f"{o.gross_revenue:.2f}",
                f"{o.discount_amount:.2f}",
                f"{o.total_platform_fees:.2f}",
                f"{o.total_hpp:.2f}",
                f"{o.actual_net_profit:.2f}",
                f"{o.actual_margin_percent:.2f}",
                o.status.value,
                "YA" if o.is_margin_leaked else "TIDAK",
                f"{o.leakage_amount:.2f}",
            ])

        return output.getvalue()


report_service = ReportService()
