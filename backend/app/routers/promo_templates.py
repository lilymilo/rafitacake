from decimal import Decimal
from typing import List
from fastapi import APIRouter, HTTPException, status

from backend.app.core.responses import success_response
from backend.app.schemas.common import MarginStatus
from backend.app.schemas.promo_template import (
    PromoTemplateCreate,
    PromoTemplateUpdate,
    ApplyPromoInput,
    ApplyPromoResult,
    ApplyPromoProductItem,
    PromoDiscountType,
)
from backend.app.schemas.calculator import MarginCalculationInput
from backend.app.repositories.promo_template_repository import promo_template_repo
from backend.app.repositories.product_repository import product_repo
from backend.app.services.calculator_service import calculator_service

router = APIRouter(prefix="/promo-templates", tags=["1-Click Promo Templates"])


@router.get("")
def list_promo_templates():
    templates = promo_template_repo.list_all()
    return success_response(
        data=[t.model_dump() for t in templates],
        message="Daftar template promo berhasil diambil.",
    )


@router.get("/{template_id}")
def get_promo_template(template_id: str):
    template = promo_template_repo.get_by_id(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template promo dengan id '{template_id}' tidak ditemukan.",
        )
    return success_response(data=template.model_dump(), message="Template promo ditemukan.")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_promo_template(payload: PromoTemplateCreate):
    try:
        created = promo_template_repo.create(payload)
        return success_response(
            data=created.model_dump(),
            message="Template promo baru berhasil disimpan.",
            status_code=status.HTTP_201_CREATED,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{template_id}")
def update_promo_template(template_id: str, payload: PromoTemplateUpdate):
    updated = promo_template_repo.update(template_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template promo dengan id '{template_id}' tidak ditemukan.",
        )
    return success_response(data=updated.model_dump(), message="Template promo berhasil diperbarui.")


@router.delete("/{template_id}")
def delete_promo_template(template_id: str):
    deleted = promo_template_repo.delete(template_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template promo dengan id '{template_id}' tidak ditemukan.",
        )
    return success_response(data={"id": template_id}, message="Template promo berhasil dihapus.")


@router.post("/{template_id}/apply")
def apply_promo_template(template_id: str, payload: ApplyPromoInput):
    template = promo_template_repo.get_by_id(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template promo dengan id '{template_id}' tidak ditemukan.",
        )

    # Determine products to apply
    target_product_ids: List[str] = []
    if payload.product_ids:
        target_product_ids = payload.product_ids
    elif payload.product_id:
        target_product_ids = [payload.product_id]
    else:
        # If neither provided, apply to all products in catalog
        target_product_ids = [p.id for p in product_repo.list_all()]

    items_result: List[ApplyPromoProductItem] = []
    safe_count = 0
    danger_count = 0

    for pid in target_product_ids:
        product = product_repo.get_by_id(pid)
        if not product:
            continue

        if template.discount_type == PromoDiscountType.PERCENT:
            disc_pct = template.discount_value
            disc_nom = Decimal("0.00")
        else:
            disc_pct = Decimal("0.00")
            disc_nom = template.discount_value

        calc = calculator_service.calculate_margin(
            MarginCalculationInput(
                hpp=product.hpp,
                packaging_cost=product.packaging,
                selling_price=product.price,
                discount_percent=disc_pct,
                discount_nominal=disc_nom,
                platform_preset_id=template.platform_preset_id or product.platform_id,
            )
        )

        if calc.status == MarginStatus.DANGER:
            danger_count += 1
        else:
            safe_count += 1

        items_result.append(
            ApplyPromoProductItem(
                product_id=product.id,
                product_name=product.name,
                original_price=product.price,
                discount_nominal=calc.total_discount_nominal,
                price_after_discount=calc.price_after_discount,
                net_profit=calc.net_profit,
                margin_percent=calc.margin_percent,
                status=calc.status,
                alert_message=calc.alert_message,
            )
        )

    result = ApplyPromoResult(
        template_id=template.id,
        template_name=template.name,
        discount_type=template.discount_type,
        discount_value=template.discount_value,
        total_evaluated=len(items_result),
        safe_count=safe_count,
        danger_count=danger_count,
        products=items_result,
    )

    return success_response(
        data=result.model_dump(),
        message="Simulasi 1-Click Promo berhasil diterapkan.",
    )
