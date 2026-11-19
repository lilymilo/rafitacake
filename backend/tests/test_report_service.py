from decimal import Decimal
import pytest

from backend.app.services.report_service import report_service


def test_generate_daily_report():
    report = report_service.generate_daily_report()
    assert report.summary.total_orders >= 5
    assert report.summary.total_gross_revenue > Decimal("0.00")
    assert report.summary.safe_order_count + report.summary.leaked_order_count == report.summary.total_orders
    assert report.summary.total_leakage_amount > Decimal("0.00")


def test_export_csv():
    csv_text = report_service.export_csv()
    assert "Order ID,Tanggal,Pelanggan,Platform" in csv_text
    assert "Nominal Kebocoran (Rp)" in csv_text
    lines = csv_text.strip().split("\n")
    # Header + at least 5 orders
    assert len(lines) >= 6
