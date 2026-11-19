from fastapi import APIRouter, HTTPException, status
from backend.app.core.responses import success_response
from backend.app.schemas.product import ProductCreate, ProductUpdate
from backend.app.repositories.product_repository import product_repo

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("")
def list_products():
    products = product_repo.list_all()
    return success_response(
        data=[p.model_dump() for p in products],
        message="Katalog produk berhasil diambil.",
    )


@router.get("/{product_id}")
def get_product(product_id: str):
    product = product_repo.get_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produk dengan id '{product_id}' tidak ditemukan.",
        )
    return success_response(data=product.model_dump(), message="Produk ditemukan.")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate):
    try:
        created = product_repo.create(payload)
        return success_response(
            data=created.model_dump(),
            message="Produk baru berhasil ditambahkan.",
            status_code=status.HTTP_201_CREATED,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{product_id}")
def update_product(product_id: str, payload: ProductUpdate):
    updated = product_repo.update(product_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produk dengan id '{product_id}' tidak ditemukan.",
        )
    return success_response(data=updated.model_dump(), message="Produk berhasil diperbarui.")


@router.delete("/{product_id}")
def delete_product(product_id: str):
    deleted = product_repo.delete(product_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produk dengan id '{product_id}' tidak ditemukan.",
        )
    return success_response(data={"id": product_id}, message="Produk berhasil dihapus.")
