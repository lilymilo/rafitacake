from typing import Optional
from fastapi import APIRouter, HTTPException, status, Query

from backend.app.core.responses import success_response
from backend.app.schemas.order_audit import OrderCompleteInput
from backend.app.repositories.order_repository import order_repo
from backend.app.services.audit_service import audit_service

router = APIRouter(tags=["Order Audit & Margin Leakage"])


@router.post("/orders/complete", status_code=status.HTTP_201_CREATED)
async def complete_order(payload: OrderCompleteInput):
    result = await audit_service.complete_and_audit_order(payload)
    return success_response(
        data=result.model_dump(),
        message="Pesanan berhasil diselesaikan dan diaudit.",
        status_code=status.HTTP_201_CREATED,
    )


@router.post("/audits/run", status_code=status.HTTP_201_CREATED)
async def run_audit(payload: OrderCompleteInput):
    result = await audit_service.complete_and_audit_order(payload)
    return success_response(
        data=result.model_dump(),
        message="Audit pesanan berhasil dijalankan.",
        status_code=status.HTTP_201_CREATED,
    )


@router.get("/audits")
def list_audits(
    platform_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    only_leaked: bool = Query(False),
):
    orders = order_repo.list_orders(
        platform_id=platform_id,
        start_date=start_date,
        end_date=end_date,
        only_leaked=only_leaked,
    )
    return success_response(
        data=[o.model_dump() for o in orders],
        message="Data audit transaksi berhasil diambil.",
    )


@router.get("/audits/{order_id}")
def get_audit(order_id: str):
    ord_item = order_repo.get_by_id(order_id)
    if not ord_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data audit untuk order '{order_id}' tidak ditemukan.",
        )
    return success_response(data=ord_item.model_dump(), message="Data audit order ditemukan.")
