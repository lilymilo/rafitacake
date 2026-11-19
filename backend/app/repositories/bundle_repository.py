from decimal import Decimal
from threading import Lock
from typing import Dict, List, Optional
import uuid

from backend.app.schemas.bundle import (
    BundleResponse,
    BundleItemDetail,
)


class BundleRepository:
    def __init__(self) -> None:
        self._lock = Lock()
        self._bundles: Dict[str, BundleResponse] = {}

    def list_all(self) -> List[BundleResponse]:
        with self._lock:
            return list(self._bundles.values())

    def get_by_id(self, bundle_id: str) -> Optional[BundleResponse]:
        with self._lock:
            return self._bundles.get(bundle_id)

    def save(self, bundle: BundleResponse) -> BundleResponse:
        with self._lock:
            self._bundles[bundle.id] = bundle
            return bundle

    def delete(self, bundle_id: str) -> bool:
        with self._lock:
            if bundle_id not in self._bundles:
                return False
            del self._bundles[bundle_id]
            return True


bundle_repo = BundleRepository()
