from fastapi import APIRouter, HTTPException, status
from backend.app.core.responses import success_response
from backend.app.schemas.platform import PlatformFeeCreate, PlatformFeeUpdate
from backend.app.repositories.platform_repository import platform_repo

router = APIRouter(prefix="/platforms", tags=["Platforms"])


@router.get("")
def list_platforms():
    platforms = platform_repo.list_all()
    return success_response(
        data=[p.model_dump() for p in platforms],
        message="Daftar platform berhasil diambil.",
    )


@router.get("/{platform_id}")
def get_platform(platform_id: str):
    platform = platform_repo.get_by_id(platform_id)
    if not platform:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Platform dengan id '{platform_id}' tidak ditemukan.",
        )
    return success_response(data=platform.model_dump(), message="Platform ditemukan.")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_platform(payload: PlatformFeeCreate):
    try:
        created = platform_repo.create(payload)
        return success_response(
            data=created.model_dump(),
            message="Platform baru berhasil ditambahkan.",
            status_code=status.HTTP_201_CREATED,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{platform_id}")
def update_platform(platform_id: str, payload: PlatformFeeUpdate):
    updated = platform_repo.update(platform_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Platform dengan id '{platform_id}' tidak ditemukan.",
        )
    return success_response(data=updated.model_dump(), message="Platform berhasil diperbarui.")


@router.delete("/{platform_id}")
def delete_platform(platform_id: str):
    try:
        deleted = platform_repo.delete(platform_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Platform dengan id '{platform_id}' tidak ditemukan.",
            )
        return success_response(data={"id": platform_id}, message="Platform berhasil dihapus.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
