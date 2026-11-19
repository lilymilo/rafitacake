from decimal import Decimal
from threading import Lock
from typing import Dict, List, Optional
import uuid

from backend.app.schemas.platform import PlatformFeeResponse, PlatformFeeCreate, PlatformFeeUpdate
from backend.app.schemas.common import FeeBase


class PlatformRepository:
    def __init__(self) -> None:
        self._lock = Lock()
        self._platforms: Dict[str, PlatformFeeResponse] = {}
        self._seed_default_platforms()

    def _seed_default_platforms(self) -> None:
        seeds = [
            PlatformFeeResponse(
                id="direct",
                name="Website Direct",
                commission_pct=Decimal("0.00"),
                service_pct=Decimal("0.00"),
                fixed_fee=Decimal("0.00"),
                fee_base=FeeBase.AFTER_DISCOUNT,
                configured=True,
                note="Penjualan langsung via website resmi",
                built_in=True,
            ),
            PlatformFeeResponse(
                id="shopee",
                name="Shopee",
                commission_pct=Decimal("8.00"),
                service_pct=Decimal("2.00"),
                fixed_fee=Decimal("1000.00"),
                fee_base=FeeBase.AFTER_DISCOUNT,
                configured=True,
                note="Tarif estimasi merchant Shopee reguler",
                built_in=True,
            ),
            PlatformFeeResponse(
                id="tokopedia",
                name="Tokopedia",
                commission_pct=Decimal("7.50"),
                service_pct=Decimal("1.50"),
                fixed_fee=Decimal("1000.00"),
                fee_base=FeeBase.AFTER_DISCOUNT,
                configured=True,
                note="Tarif estimasi merchant Tokopedia Power Merchant",
                built_in=True,
            ),
            PlatformFeeResponse(
                id="gofood",
                name="GoFood",
                commission_pct=Decimal("20.00"),
                service_pct=Decimal("0.00"),
                fixed_fee=Decimal("0.00"),
                fee_base=FeeBase.AFTER_DISCOUNT,
                configured=True,
                note="Komisi GoBiz GoFood standar 20%",
                built_in=True,
            ),
            PlatformFeeResponse(
                id="grabfood",
                name="GrabFood",
                commission_pct=Decimal("20.00"),
                service_pct=Decimal("0.00"),
                fixed_fee=Decimal("0.00"),
                fee_base=FeeBase.AFTER_DISCOUNT,
                configured=True,
                note="Komisi GrabMerchant GrabFood standar 20%",
                built_in=True,
            ),
        ]
        for p in seeds:
            self._platforms[p.id] = p

    def list_all(self) -> List[PlatformFeeResponse]:
        with self._lock:
            return list(self._platforms.values())

    def get_by_id(self, platform_id: str) -> Optional[PlatformFeeResponse]:
        with self._lock:
            return self._platforms.get(platform_id)

    def create(self, data: PlatformFeeCreate) -> PlatformFeeResponse:
        with self._lock:
            pid = data.id.strip().lower() if data.id else f"plat_{uuid.uuid4().hex[:8]}"
            if pid in self._platforms:
                raise ValueError(f"Platform with id '{pid}' already exists.")
            new_platform = PlatformFeeResponse(
                id=pid,
                name=data.name,
                commission_pct=data.commission_pct,
                service_pct=data.service_pct,
                fixed_fee=data.fixed_fee,
                fee_base=data.fee_base,
                configured=data.configured,
                note=data.note,
                built_in=False,
            )
            self._platforms[pid] = new_platform
            return new_platform

    def update(self, platform_id: str, data: PlatformFeeUpdate) -> Optional[PlatformFeeResponse]:
        with self._lock:
            existing = self._platforms.get(platform_id)
            if not existing:
                return None
            updated = existing.model_copy(update={k: v for k, v in data.model_dump().items() if v is not None})
            self._platforms[platform_id] = updated
            return updated

    def delete(self, platform_id: str) -> bool:
        with self._lock:
            existing = self._platforms.get(platform_id)
            if not existing:
                return False
            if existing.built_in:
                raise ValueError("Platform bawaan sistem tidak dapat dihapus.")
            del self._platforms[platform_id]
            return True


platform_repo = PlatformRepository()
