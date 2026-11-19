from decimal import Decimal
import pytest
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["status"] == "online"


# 1. SmartMargin Guard
def test_api_calculator_margin(client: TestClient):
    # SAFE test case: Margin 40%
    payload_safe = {
        "hpp": 50000,
        "packaging_cost": 5000,
        "selling_price": 100000,
        "discount_percent": 0,
        "discount_nominal": 0,
        "admin_fee_percent": 5,
        "service_fee_percent": 0,
        "fixed_fee": 0,
    }
    resp = client.post("/api/v1/calculator/margin", json=payload_safe)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    data = body["data"]
    assert float(data["price_after_discount"]) == 100000.0
    assert float(data["net_revenue"]) == 95000.0
    assert float(data["net_profit"]) == 40000.0
    assert float(data["margin_percent"]) == 40.0
    assert data["status"] == "SAFE"

    # DANGER test case: Margin 28.89% (< 35%)
    payload_danger = {
        "hpp": 50000,
        "packaging_cost": 5000,
        "selling_price": 100000,
        "discount_percent": 10,
        "admin_fee_percent": 10,
    }
    resp_danger = client.post("/api/v1/calculator/margin", json=payload_danger)
    assert resp_danger.status_code == 200
    danger_data = resp_danger.json()["data"]
    assert danger_data["status"] == "DANGER"
    assert float(danger_data["profit_shortfall"]) > 0


# 2. Dynamic Margin Config
def test_api_config_margin(client: TestClient):
    # Get config
    get_res = client.get("/api/v1/config/margin")
    assert get_res.status_code == 200
    assert float(get_res.json()["data"]["target_min_margin_percent"]) == 35.0

    # Update config
    put_res = client.put(
        "/api/v1/config/margin",
        json={"target_min_margin_percent": 30.0, "target_max_margin_percent": 55.0},
    )
    assert put_res.status_code == 200
    assert float(put_res.json()["data"]["target_min_margin_percent"]) == 30.0

    # Reset back to 35
    client.put("/api/v1/config/margin", json={"target_min_margin_percent": 35.0, "target_max_margin_percent": 50.0})


# 3. Max Safe Discount Recommendation
def test_api_max_discount(client: TestClient):
    payload = {
        "hpp": 50000,
        "selling_price": 120000,
        "admin_fee_percent": 10,
    }
    resp = client.post("/api/v1/calculator/max-discount", json=payload)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert float(data["max_safe_discount_percent"]) > 0
    assert float(data["minimum_required_price"]) < 120000


# 4. ReversePrice Planner & Guard 100%
def test_api_reverse_price(client: TestClient):
    payload = {
        "hpp": 50000,
        "packaging_cost": 5000,
        "target_mode": "PERCENT",
        "target_value": 40,
        "admin_fee_percent": 10,
        "planned_discount_percent": 15,
    }
    resp = client.post("/api/v1/reverse-price/calculate", json=payload)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert float(data["recommended_final_price"]) > 0
    assert float(data["recommended_base_price"]) > float(data["recommended_final_price"])

    # Guard clause: fee (15%) + margin (86%) > 100% -> must return 422
    invalid_payload = {
        "hpp": 50000,
        "target_mode": "PERCENT",
        "target_value": 86,
        "admin_fee_percent": 15,
    }
    err_resp = client.post("/api/v1/reverse-price/calculate", json=invalid_payload)
    assert err_resp.status_code == 422
    assert err_resp.json()["success"] is False


# 5. Multi-Platform Simulation & Platform CRUD
def test_api_multi_platform(client: TestClient):
    payload = {
        "hpp": 30000,
        "selling_price": 75000,
        "discount_percent": 5,
    }
    resp = client.post("/api/v1/calculator/multi-platform", json=payload)
    assert resp.status_code == 200
    platforms = resp.json()["data"]["platforms"]
    assert len(platforms) >= 5
    # Check descending order
    margins = [float(p["margin_percent"]) for p in platforms]
    assert margins == sorted(margins, reverse=True)


# 6. Real-Time Slider & Curve
def test_api_slider_and_curve(client: TestClient):
    slider_payload = {
        "hpp": 30000,
        "selling_price": 75000,
        "discount_percent": 12,
    }
    resp_slider = client.post("/api/v1/calculator/slider", json=slider_payload)
    assert resp_slider.status_code == 200

    curve_payload = {
        "hpp": 30000,
        "selling_price": 75000,
        "min_discount": 0,
        "max_discount": 40,
        "step": 10,
    }
    resp_curve = client.post("/api/v1/calculator/slider-curve", json=curve_payload)
    assert resp_curve.status_code == 200
    points = resp_curve.json()["data"]["points"]
    assert len(points) == 5  # 0, 10, 20, 30, 40


# 7. 1-Click Promo Templates
def test_api_promo_templates(client: TestClient):
    # List templates
    list_res = client.get("/api/v1/promo-templates")
    assert list_res.status_code == 200
    templates = list_res.json()["data"]
    assert len(templates) >= 4

    # Apply template 1
    t_id = templates[0]["id"]
    apply_res = client.post(f"/api/v1/promo-templates/{t_id}/apply", json={})
    assert apply_res.status_code == 200
    apply_data = apply_res.json()["data"]
    assert apply_data["total_evaluated"] >= 4
    assert "products" in apply_data


# 8. Bundling Calculator & Danger Protection
def test_api_bundle_protection(client: TestClient):
    # Preview bundle
    preview_res = client.post(
        "/api/v1/bundles/preview",
        json={
            "items": [
                {"product_id": "demo_brownies_fudge", "quantity": 1},
                {"product_id": "demo_roti_sisir", "quantity": 1},
            ],
            "packaging_cost": 5000,
            "bundle_selling_price": 95000,
        },
    )
    assert preview_res.status_code == 200

    # Try creating danger bundle without force_publish
    danger_res = client.post(
        "/api/v1/bundles",
        json={
            "name": "Paket Rugi",
            "items": [{"product_id": "demo_brownies_fudge", "quantity": 1}],
            "bundle_selling_price": 10000,  # below HPP
            "is_published": True,
            "force_publish": False,
        },
    )
    assert danger_res.status_code == 422
    assert "DANGER" in danger_res.json()["message"]

    # Create danger bundle with force_publish
    forced_res = client.post(
        "/api/v1/bundles",
        json={
            "name": "Paket Rugi Dipaksa",
            "items": [{"product_id": "demo_brownies_fudge", "quantity": 1}],
            "bundle_selling_price": 10000,
            "is_published": True,
            "force_publish": True,
        },
    )
    assert forced_res.status_code == 201
    assert forced_res.json()["success"] is True


# 9. Order Completion Audit & Leakage
def test_api_orders_and_audits(client: TestClient):
    order_payload = {
        "customer_name": "API Test Customer",
        "platform_id": "tokopedia",
        "items": [
            {
                "product_id": "demo_red_velvet",
                "quantity": 2,
                "selling_price": 55000,
                "hpp": 25500,
            }
        ],
        "discount_nominal": 5000,
    }
    comp_res = client.post("/api/v1/orders/complete", json=order_payload)
    assert comp_res.status_code == 201
    assert comp_res.json()["success"] is True

    # List audits
    audit_list = client.get("/api/v1/audits")
    assert audit_list.status_code == 200
    assert len(audit_list.json()["data"]) >= 6

    # List leaked only
    leaked_list = client.get("/api/v1/audits?only_leaked=true")
    assert leaked_list.status_code == 200
    for it in leaked_list.json()["data"]:
        assert it["is_margin_leaked"] is True


# 10. Daily Reports, CSV Export & Marketplace Sync
def test_api_reports_and_sync(client: TestClient):
    # Daily Report
    rep_res = client.get("/api/v1/reports/daily")
    assert rep_res.status_code == 200
    summary = rep_res.json()["data"]["summary"]
    assert summary["total_orders"] >= 6
    assert float(summary["total_gross_revenue"]) > 0

    # CSV Export
    csv_res = client.get("/api/v1/reports/daily/export-csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "attachment; filename=" in csv_res.headers["content-disposition"]
    assert "Order ID,Tanggal" in csv_res.text

    # Marketplace Sync Preview (blocked by default if DANGER exists)
    sync_payload = {
        "platform_id": "shopee",
        "items": [
            {
                "product_id": "demo_tart_coklat",
                "proposed_price": 75000,  # below safe price for HPP 73k
                "proposed_discount_percent": 0,
            }
        ],
        "allow_danger": False,
    }
    sync_res = client.post("/api/v1/marketplace/sync-preview", json=sync_payload)
    assert sync_res.status_code == 200
    assert sync_res.json()["data"]["can_sync"] is False
    assert sync_res.json()["data"]["danger_items_count"] == 1
