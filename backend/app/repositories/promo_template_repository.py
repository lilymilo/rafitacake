from decimal import Decimal
from threading import Lock
from typing import Dict, List, Optional
import uuid

from backend.app.schemas.promo_template import (
    PromoTemplateResponse,
    PromoTemplateCreate,
    PromoTemplateUpdate,
    PromoDiscountType,
)


class PromoTemplateRepository:
    def __init__(self) -> None:
        self._lock = Lock()
        self._templates: Dict[str, PromoTemplateResponse] = {}
        self._seed_default_templates()

    def _seed_default_templates(self) -> None:
        seeds = [
            PromoTemplateResponse(
                id="promo_flash_10",
                name="Flash Sale 10%",
                description="Diskon kilat 10% untuk event promo harian",
                platform_preset_id=None,
                discount_type=PromoDiscountType.PERCENT,
                discount_value=Decimal("10.00"),
            ),
            PromoTemplateResponse(
                id="promo_gajian_15k",
                name="Voucher Gajian Rp 15.000",
                description="Potongan langsung Rp 15.000",
                platform_preset_id=None,
                discount_type=PromoDiscountType.NOMINAL,
                discount_value=Decimal("15000.00"),
            ),
            PromoTemplateResponse(
                id="promo_weekend_15",
                name="Weekend Sweet Treat 15%",
                description="Diskon 15% khusus pesanan akhir pekan",
                platform_preset_id=None,
                discount_type=PromoDiscountType.PERCENT,
                discount_value=Decimal("15.00"),
            ),
            PromoTemplateResponse(
                id="promo_bundle_20",
                name="Spesial Akhir Bulan 20%",
                description="Diskon 20% untuk dorongan omzet akhir bulan",
                platform_preset_id=None,
                discount_type=PromoDiscountType.PERCENT,
                discount_value=Decimal("20.00"),
            ),
        ]
        for t in seeds:
            self._templates[t.id] = t

    def list_all(self) -> List[PromoTemplateResponse]:
        with self._lock:
            return list(self._templates.values())

    def get_by_id(self, template_id: str) -> Optional[PromoTemplateResponse]:
        with self._lock:
            return self._templates.get(template_id)

    def create(self, data: PromoTemplateCreate) -> PromoTemplateResponse:
        with self._lock:
            tid = data.id.strip() if data.id else f"promo_{uuid.uuid4().hex[:8]}"
            if tid in self._templates:
                raise ValueError(f"Promo template with id '{tid}' already exists.")
            new_item = PromoTemplateResponse(
                id=tid,
                name=data.name,
                description=data.description,
                platform_preset_id=data.platform_preset_id,
                discount_type=data.discount_type,
                discount_value=data.discount_value,
            )
            self._templates[tid] = new_item
            return new_item

    def update(self, template_id: str, data: PromoTemplateUpdate) -> Optional[PromoTemplateResponse]:
        with self._lock:
            existing = self._templates.get(template_id)
            if not existing:
                return None
            updates = {k: v for k, v in data.model_dump().items() if v is not None}
            updated = existing.model_copy(update=updates)
            self._templates[template_id] = updated
            return updated

    def delete(self, template_id: str) -> bool:
        with self._lock:
            if template_id not in self._templates:
                return False
            del self._templates[template_id]
            return True


promo_template_repo = PromoTemplateRepository()
