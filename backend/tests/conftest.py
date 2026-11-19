import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.repositories.config_repository import config_repo
from backend.app.repositories.platform_repository import platform_repo
from backend.app.repositories.product_repository import product_repo
from backend.app.repositories.promo_template_repository import promo_template_repo
from backend.app.repositories.bundle_repository import bundle_repo
from backend.app.repositories.order_repository import order_repo


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_stores():
    # Ensures a clean state before each test if needed
    yield
