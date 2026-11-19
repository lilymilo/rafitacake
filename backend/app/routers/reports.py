from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Response, Query

from backend.app.core.responses import success_response
from backend.app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Reports & Export"])


@router.get("/daily")
def get_daily_report(
    date: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    platform_id: Optional[str] = Query(None),
):
    result = report_service.generate_daily_report(
        date=date,
        start_date=start_date,
        end_date=end_date,
        platform_id=platform_id,
    )
    return success_response(
        data=result.model_dump(),
        message="Laporan rekap harian berhasil di-generate.",
    )


@router.get("/daily/export-csv")
def export_daily_report_csv(
    date: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    platform_id: Optional[str] = Query(None),
):
    csv_content = report_service.export_csv(
        date=date,
        start_date=start_date,
        end_date=end_date,
        platform_id=platform_id,
    )
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"daily-promo-report-{today_str}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
