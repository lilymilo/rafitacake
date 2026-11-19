from decimal import Decimal
from typing import List, Optional
import uuid
from fastapi import HTTPException, status

from backend.app.core.decimal_utils import (
    round_rupiah,
    safe_percentage,
    to_decimal,
)
from backend.app.schemas.common import MarginStatus, FeeBase
from backend.app.schemas.bundle import (
    BundleItemInput,
    BundleItemDetail,
    BundlePreviewInput,
    BundleCreate,
    BundleUpdate,
    BundleResponse,
)
from backend.app.schemas.calculator import MarginCalculationInput
from backend.app.repositories.product_repository import product_repo
from backend.app.repositories.platform_repository import platform_repo
from backend.app.repositories.bundle_repository import bundle_repo
from backend.app.services.calculator_service import calculator_service


class BundleService:
    def _evaluate_bundle(
        self,
        items: List[BundleItemInput],
        packaging_cost: Decimal,
        bundle_selling_price: Decimal,
        platform_preset_id: Optional[str] = None,
    ) -> tuple[List[BundleItemDetail], Decimal, Decimal, Decimal, Decimal, Decimal, Decimal, Decimal, MarginStatus, str]:
        detailed_items: List[BundleItemDetail] = []
        total_normal_price = Decimal("0.00")
        total_items_hpp = Decimal("0.00")

        for item in items:
            prod = product_repo.get_by_id(item.product_id)
            if not prod:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Produk kue dengan id '{item.product_id}' tidak ditemukan.",
                )
            subtotal_price = round_rupiah(prod.price * item.quantity)
            subtotal_hpp = round_rupiah((prod.hpp + prod.packaging) * item.quantity)

            total_normal_price += subtotal_price
            total_items_hpp += subtotal_hpp

            detailed_items.append(
                BundleItemDetail(
                    product_id=prod.id,
                    product_name=prod.name,
                    quantity=item.quantity,
                    unit_hpp=prod.hpp + prod.packaging,
                    unit_price=prod.price,
                    subtotal_hpp=subtotal_hpp,
                    subtotal_price=subtotal_price,
                )
            )

        total_combined_hpp = round_rupiah(total_items_hpp + packaging_cost)
        customer_savings_nominal = max(Decimal("0.00"), round_rupiah(total_normal_price - bundle_selling_price))
        customer_savings_percent = safe_percentage(customer_savings_nominal, total_normal_price)

        # Run margin check
        calc_res = calculator_service.calculate_margin(
            MarginCalculationInput(
                hpp=total_combined_hpp,
                selling_price=bundle_selling_price,
                discount_percent=Decimal("0.00"),
                discount_nominal=Decimal("0.00"),
                packaging_cost=Decimal("0.00"),
                platform_preset_id=platform_preset_id,
            )
        )

        return (
            detailed_items,
            total_normal_price,
            customer_savings_nominal,
            customer_savings_percent,
            total_combined_hpp,
            calc_res.total_platform_fees,
            calc_res.net_revenue,
            calc_res.net_profit,
            calc_res.margin_percent,
            calc_res.status,
            calc_res.alert_message,
        )

    def preview_bundle(self, inp: BundlePreviewInput) -> BundleResponse:
        (
            detailed_items,
            total_normal_price,
            customer_savings_nominal,
            customer_savings_percent,
            total_combined_hpp,
            total_platform_fees,
            net_revenue,
            net_profit,
            margin_percent,
            margin_status,
            alert_message,
        ) = self._evaluate_bundle(
            items=inp.items,
            packaging_cost=inp.packaging_cost,
            bundle_selling_price=inp.bundle_selling_price,
            platform_preset_id=inp.platform_preset_id,
        )

        return BundleResponse(
            id="preview",
            name="Bundle Preview",
            description="",
            items=detailed_items,
            packaging_cost=inp.packaging_cost,
            bundle_selling_price=inp.bundle_selling_price,
            total_normal_price=total_normal_price,
            customer_savings_nominal=customer_savings_nominal,
            customer_savings_percent=customer_savings_percent,
            total_combined_hpp=total_combined_hpp,
            total_platform_fees=total_platform_fees,
            net_revenue=net_revenue,
            net_profit=net_profit,
            margin_percent=margin_percent,
            status=margin_status,
            alert_message=alert_message,
            is_published=False,
        )

    def create_bundle(self, inp: BundleCreate) -> BundleResponse:
        (
            detailed_items,
            total_normal_price,
            customer_savings_nominal,
            customer_savings_percent,
            total_combined_hpp,
            total_platform_fees,
            net_revenue,
            net_profit,
            margin_percent,
            margin_status,
            alert_message,
        ) = self._evaluate_bundle(
            items=inp.items,
            packaging_cost=inp.packaging_cost,
            bundle_selling_price=inp.bundle_selling_price,
            platform_preset_id=inp.platform_preset_id,
        )

        # Danger guard
        if inp.is_published and margin_status == MarginStatus.DANGER and not inp.force_publish:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Paket bundling berada dalam status DANGER (margin {margin_percent:.2f}% < 35% atau rugi). "
                    f"Gunakan 'force_publish: true' jika Anda yakin ingin tetap mempublikasikannya."
                ),
            )

        bundle_id = inp.id.strip() if inp.id else f"bundle_{uuid.uuid4().hex[:8]}"
        response = BundleResponse(
            id=bundle_id,
            name=inp.name,
            description=inp.description,
            items=detailed_items,
            packaging_cost=inp.packaging_cost,
            bundle_selling_price=inp.bundle_selling_price,
            total_normal_price=total_normal_price,
            customer_savings_nominal=customer_savings_nominal,
            customer_savings_percent=customer_savings_percent,
            total_combined_hpp=total_combined_hpp,
            total_platform_fees=total_platform_fees,
            net_revenue=net_revenue,
            net_profit=net_profit,
            margin_percent=margin_percent,
            status=margin_status,
            alert_message=alert_message,
            is_published=inp.is_published,
        )
        return bundle_repo.save(response)

    def update_bundle(self, bundle_id: str, inp: BundleUpdate) -> BundleResponse:
        existing = bundle_repo.get_by_id(bundle_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Paket bundling dengan id '{bundle_id}' tidak ditemukan.",
            )

        items = inp.items if inp.items is not None else [
            BundleItemInput(product_id=it.product_id, quantity=it.quantity) for it in existing.items
        ]
        packaging_cost = inp.packaging_cost if inp.packaging_cost is not None else existing.packaging_cost
        bundle_selling_price = inp.bundle_selling_price if inp.bundle_selling_price is not None else existing.bundle_selling_price
        is_published = inp.is_published if inp.is_published is not None else existing.is_published
        name = inp.name if inp.name is not None else existing.name
        description = inp.description if inp.description is not None else existing.description

        (
            detailed_items,
            total_normal_price,
            customer_savings_nominal,
            customer_savings_percent,
            total_combined_hpp,
            total_platform_fees,
            net_revenue,
            net_profit,
            margin_percent,
            margin_status,
            alert_message,
        ) = self._evaluate_bundle(
            items=items,
            packaging_cost=packaging_cost,
            bundle_selling_price=bundle_selling_price,
            platform_preset_id=inp.platform_preset_id,
        )

        if is_published and margin_status == MarginStatus.DANGER and not inp.force_publish:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Paket bundling berada dalam status DANGER (margin {margin_percent:.2f}% < 35% atau rugi). "
                    f"Gunakan 'force_publish: true' jika Anda yakin ingin tetap mempublikasikannya."
                ),
            )

        updated = BundleResponse(
            id=bundle_id,
            name=name,
            description=description,
            items=detailed_items,
            packaging_cost=packaging_cost,
            bundle_selling_price=bundle_selling_price,
            total_normal_price=total_normal_price,
            customer_savings_nominal=customer_savings_nominal,
            customer_savings_percent=customer_savings_percent,
            total_combined_hpp=total_combined_hpp,
            total_platform_fees=total_platform_fees,
            net_revenue=net_revenue,
            net_profit=net_profit,
            margin_percent=margin_percent,
            status=margin_status,
            alert_message=alert_message,
            is_published=is_published,
        )
        return bundle_repo.save(updated)


bundle_service = BundleService()
