import importlib
import json

from fastapi.testclient import TestClient


def load_app(monkeypatch, tmp_path):
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "portal-test.db"))
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    import main

    return importlib.reload(main)


def auth_headers(client, username="admin1"):
    response = client.post(
        "/auth/login",
        json={"username": username, "password": "P@ssw0rd"},
    )
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["token"]}


def admin_router_product_id(client, headers):
    response = client.get("/api/products", headers=headers)
    assert response.status_code == 200
    for product in response.json():
        if product["name"] == "仅管理员：密钥与模型路由":
            return product["id"]
    raise AssertionError("仅管理员：密钥与模型路由 product not found")


def test_admin_router_status_is_admin_only_and_masked(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        admin_headers = auth_headers(client, "admin1")
        product_id = admin_router_product_id(client, admin_headers)
        response = client.get(
            f"/api/admin-router/status?product_id={product_id}",
            headers=admin_headers,
        )

        user_headers = auth_headers(client, "user4")
        forbidden = client.get(
            f"/api/admin-router/status?product_id={product_id}",
            headers=user_headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["routes"]
    assert body["data"]["keys"]
    serialized = json.dumps(body, ensure_ascii=False)
    assert "demo-key-****" in serialized
    assert "sk-" not in serialized
    assert "真实 API Key" in body["data"]["disclaimer"]
    assert forbidden.status_code == 403
    assert forbidden.json()["detail"] == "仅管理员可访问该模块"


def test_admin_router_simulation_returns_route_decision(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client, "admin1")
        product_id = admin_router_product_id(client, headers)
        response = client.post(
            "/api/admin-router/simulate",
            headers=headers,
            json={
                "product_id": product_id,
                "application": "office-review",
                "risk_level": "high",
                "input_tokens": 3600,
                "contains_sensitive_data": False,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["route_id"] == "route_office_review"
    assert data["application_label"] == "智能办公智能体"
    assert data["selected_model"] == "规则引擎复核队列（模拟）"
    assert data["masked_key"].startswith("demo-key-****")
    assert "人工复核" in data["decision"]
    assert data["audit_event"]["actor"] == "admin1"


def test_admin_router_sensitive_data_is_blocked_before_model(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client, "admin1")
        product_id = admin_router_product_id(client, headers)
        response = client.post(
            "/api/admin-router/simulate",
            headers=headers,
            json={
                "product_id": product_id,
                "application": "internal-rag",
                "risk_level": "medium",
                "input_tokens": 1200,
                "contains_sensitive_data": True,
            },
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["selected_model"] == "阻断：敏感数据复核队列（模拟）"
    assert data["estimated_cost"] == "0.0000 演示币"
    assert data["throttle"] == "阻断"
    assert any("敏感数据" in item for item in data["guardrails"])


def test_admin_router_rotate_records_masked_demo_event(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client, "admin1")
        product_id = admin_router_product_id(client, headers)
        response = client.post(
            "/api/admin-router/rotate",
            headers=headers,
            json={
                "product_id": product_id,
                "key_id": "key_rag_private",
                "reason": "组长季度治理演练",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["key_id"] == "key_rag_private"
    assert data["masked_key"] == "demo-key-****-rag"
    assert data["rotation_id"].startswith("rot-")
    assert "不创建、不替换任何真实 API Key" in data["disclaimer"]
    assert data["audit_event"]["target"] == "key_rag_private"


def test_admin_router_wrong_product_returns_404(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client, "admin1")
        response = client.post(
            "/api/admin-router/simulate",
            headers=headers,
            json={
                "product_id": 99999,
                "application": "customer-service",
            },
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "产品不存在或无权访问"
