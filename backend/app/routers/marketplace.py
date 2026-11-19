from fastapi import APIRouter
from backend.app.core.responses import success_response
from backend.app.schemas.marketplace import MarketplaceSyncPreviewInput
from backend.app.services.marketplace_service import marketplace_service

router = APIRouter(prefix="/marketplace", tags=["Marketplace Sync Adapter"])


@router.post("/sync-preview")
def preview_marketplace_sync(payload: MarketplaceSyncPreviewInput):
    result = marketplace_service.preview_sync(payload)
    message = (
        "Sinkronisasi marketplace siap diproses."
        if result.can_sync
        else "Sinkronisasi marketplace DIBLOKIR oleh SmartMargin Guard karena terdapat produk DANGER."
    )
    return success_response(
        data=result.model_dump(),
        message=message,
    )
