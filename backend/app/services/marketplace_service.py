from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Any
from fastapi import HTTPException, status

from backend.app.schemas.common import MarginStatus
from backend.app.schemas.calculator import MarginCalculationInput
from backend.app.schemas.marketplace import (
    MarketplaceSyncPreviewInput,
    MarketplaceSyncResult,
    MarketplaceSyncItemResult,
)
from backend.app.repositories.platform_repository import platform_repo
from backend.app.repositories.product_repository import product_repo
from backend.app.services.calculator_service import calculator_service


class MarketplaceService:
    def preview_sync(self, inp: MarketplaceSyncPreviewInput) -> MarketplaceSyncResult:
        plat = platform_repo.get_by_id(inp.platform_id)
        if not plat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Platform dengan id '{inp.platform_id}' tidak ditemukan.",
            )

        items_result: List[MarketplaceSyncItemResult] = []
        safe_count = 0
        danger_count = 0

        marketplace_item_payloads = []

        for it in inp.items:
            prod = product_repo.get_by_id(it.product_id)
            if not prod:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Produk kue dengan id '{it.product_id}' tidak ditemukan.",
                )

            calc_res = calculator_service.calculate_margin(
                MarginCalculationInput(
                    hpp=prod.hpp,
                    packaging_cost=prod.packaging,
                    selling_price=it.proposed_price,
                    discount_percent=it.proposed_discount_percent,
                    discount_nominal=it.proposed_discount_nominal,
                    platform_preset_id=plat.id,
                )
            )

            is_safe = calc_res.status != MarginStatus.DANGER
            rejection_reason = None
            if not is_safe:
                danger_count += 1
                rejection_reason = (
                    f"Margin ({calc_res.margin_percent:.2f}%) berada di bawah ambang batas aman 35% "
                    f"atau laba bersih minus (Rp {calc_res.net_profit:,.0f})."
                )
            else:
                safe_count += 1

            items_result.append(
                MarketplaceSyncItemResult(
                    product_id=prod.id,
                    product_name=prod.name,
                    proposed_price=it.proposed_price,
                    price_after_discount=calc_res.price_after_discount,
                    net_profit=calc_res.net_profit,
                    margin_percent=calc_res.margin_percent,
                    status=calc_res.status,
                    is_safe_to_sync=is_safe,
                    rejection_reason=rejection_reason,
                )
            )

            marketplace_item_payloads.append({
                "item_id": prod.id,
                "item_name": prod.name,
                "original_price": float(it.proposed_price),
                "promotion_price": float(calc_res.price_after_discount),
                "discount_percentage": float(it.proposed_discount_percent),
                "status": "APPROVED_FOR_SYNC" if (is_safe or inp.allow_danger) else "BLOCKED_BY_SMARTMARGIN",
            })

        can_sync = (danger_count == 0) or inp.allow_danger

        mock_payload: Dict[str, Any] = {
            "platform_target": plat.name,
            "platform_id": plat.id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "sync_status": "READY" if can_sync else "BLOCKED_GUARD_TRIGGERED",
            "total_items": len(inp.items),
            "payload_data": {
                "sync_batch_id": f"SYNC-{plat.id.upper()}-{int(datetime.now(timezone.utc).timestamp())}",
                "items": marketplace_item_payloads,
            },
        }

        return MarketplaceSyncResult(
            platform_id=plat.id,
            platform_name=plat.name,
            can_sync=can_sync,
            total_items=len(inp.items),
            safe_items_count=safe_count,
            danger_items_count=danger_count,
            items=items_result,
            mock_marketplace_payload=mock_payload,
        )


marketplace_service = MarketplaceService()
