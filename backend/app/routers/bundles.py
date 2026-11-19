from fastapi import APIRouter, HTTPException, status
from backend.app.core.responses import success_response
from backend.app.schemas.bundle import (
    BundlePreviewInput,
    BundleCreate,
    BundleUpdate,
)
from backend.app.repositories.bundle_repository import bundle_repo
from backend.app.services.bundle_service import bundle_service

router = APIRouter(prefix="/bundles", tags=["Bundle Calculator"])


@router.get("")
def list_bundles():
    bundles = bundle_repo.list_all()
    return success_response(
        data=[b.model_dump() for b in bundles],
        message="Daftar paket bundling berhasil diambil.",
    )


@router.get("/{bundle_id}")
def get_bundle(bundle_id: str):
    bundle = bundle_repo.get_by_id(bundle_id)
    if not bundle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paket bundling dengan id '{bundle_id}' tidak ditemukan.",
        )
    return success_response(data=bundle.model_dump(), message="Paket bundling ditemukan.")


@router.post("/preview")
def preview_bundle(payload: BundlePreviewInput):
    result = bundle_service.preview_bundle(payload)
    return success_response(
        data=result.model_dump(),
        message="Kalkulasi preview bundling berhasil dihitung.",
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_bundle(payload: BundleCreate):
    created = bundle_service.create_bundle(payload)
    return success_response(
        data=created.model_dump(),
        message="Paket bundling berhasil disimpan.",
        status_code=status.HTTP_201_CREATED,
    )


@router.put("/{bundle_id}")
def update_bundle(bundle_id: str, payload: BundleUpdate):
    updated = bundle_service.update_bundle(bundle_id, payload)
    return success_response(
        data=updated.model_dump(),
        message="Paket bundling berhasil diperbarui.",
    )


@router.delete("/{bundle_id}")
def delete_bundle(bundle_id: str):
    deleted = bundle_repo.delete(bundle_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paket bundling dengan id '{bundle_id}' tidak ditemukan.",
        )
    return success_response(data={"id": bundle_id}, message="Paket bundling berhasil dihapus.")
