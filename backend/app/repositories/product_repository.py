from datetime import datetime, timezone
from decimal import Decimal
from threading import Lock
from typing import Dict, List, Optional
import uuid

from backend.app.schemas.product import ProductResponse, ProductCreate, ProductUpdate


class ProductRepository:
    def __init__(self) -> None:
        self._lock = Lock()
        self._products: Dict[str, ProductResponse] = {}
        self._seed_default_products()

    def _seed_default_products(self) -> None:
        now = datetime.now(timezone.utc).isoformat()
        seeds = [
            ProductResponse(
                id="demo_tart_coklat",
                name="Kue Tart Coklat Klasik (20cm)",
                hpp=Decimal("65000.00"),
                packaging=Decimal("8000.00"),
                price=Decimal("155000.00"),
                discount_pct=Decimal("10.00"),
                discount_amount=Decimal("0.00"),
                platform_id="gofood",
                is_demo=True,
                created_at=now,
                updated_at=now,
            ),
            ProductResponse(
                id="demo_brownies_fudge",
                name="Fudge Brownies Box (Isi 12)",
                hpp=Decimal("28000.00"),
                packaging=Decimal("4500.00"),
                price=Decimal("68000.00"),
                discount_pct=Decimal("15.00"),
                discount_amount=Decimal("0.00"),
                platform_id="tokopedia",
                is_demo=True,
                created_at=now,
                updated_at=now,
            ),
            ProductResponse(
                id="demo_roti_sisir",
                name="Roti Sisir Mentega (Pack 6)",
                hpp=Decimal("18000.00"),
                packaging=Decimal("3000.00"),
                price=Decimal("38000.00"),
                discount_pct=Decimal("20.00"),
                discount_amount=Decimal("2000.00"),
                platform_id="grabfood",
                is_demo=True,
                created_at=now,
                updated_at=now,
            ),
            ProductResponse(
                id="demo_red_velvet",
                name="Red Velvet Slice Box",
                hpp=Decimal("22000.00"),
                packaging=Decimal("3500.00"),
                price=Decimal("55000.00"),
                discount_pct=Decimal("0.00"),
                discount_amount=Decimal("0.00"),
                platform_id="gofood",
                is_demo=True,
                created_at=now,
                updated_at=now,
            ),
            ProductResponse(
                id="demo_cupcake_set",
                name="Cupcake Assorted Box (Isi 6)",
                hpp=Decimal("32000.00"),
                packaging=Decimal("5000.00"),
                price=Decimal("75000.00"),
                discount_pct=Decimal("5.00"),
                discount_amount=Decimal("0.00"),
                platform_id="direct",
                is_demo=True,
                created_at=now,
                updated_at=now,
            ),
        ]
        for p in seeds:
            self._products[p.id] = p

    def list_all(self) -> List[ProductResponse]:
        with self._lock:
            return list(self._products.values())

    def get_by_id(self, product_id: str) -> Optional[ProductResponse]:
        with self._lock:
            return self._products.get(product_id)

    def create(self, data: ProductCreate) -> ProductResponse:
        with self._lock:
            pid = data.id.strip() if data.id else f"prod_{uuid.uuid4().hex[:8]}"
            if pid in self._products:
                raise ValueError(f"Product with id '{pid}' already exists.")
            now = datetime.now(timezone.utc).isoformat()
            new_prod = ProductResponse(
                id=pid,
                name=data.name,
                hpp=data.hpp,
                packaging=data.packaging,
                price=data.price,
                discount_pct=data.discount_pct,
                discount_amount=data.discount_amount,
                platform_id=data.platform_id,
                is_demo=data.is_demo,
                created_at=now,
                updated_at=now,
            )
            self._products[pid] = new_prod
            return new_prod

    def update(self, product_id: str, data: ProductUpdate) -> Optional[ProductResponse]:
        with self._lock:
            existing = self._products.get(product_id)
            if not existing:
                return None
            updates = {k: v for k, v in data.model_dump().items() if v is not None}
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            updated = existing.model_copy(update=updates)
            self._products[product_id] = updated
            return updated

    def delete(self, product_id: str) -> bool:
        with self._lock:
            if product_id not in self._products:
                return False
            del self._products[product_id]
            return True


product_repo = ProductRepository()
