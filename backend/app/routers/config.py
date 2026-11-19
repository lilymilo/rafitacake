from fastapi import APIRouter
from backend.app.core.responses import success_response
from backend.app.schemas.config import MarginConfigUpdate
from backend.app.repositories.config_repository import config_repo

router = APIRouter(prefix="/config", tags=["Configuration"])


@router.get("/margin")
def get_margin_config():
    cfg = config_repo.get_config()
    return success_response(data=cfg.model_dump(), message="Konfigurasi margin berhasil dimuat.")


@router.put("/margin")
def update_margin_config(payload: MarginConfigUpdate):
    updated = config_repo.update_config(payload)
    return success_response(data=updated.model_dump(), message="Konfigurasi margin berhasil diperbarui.")
