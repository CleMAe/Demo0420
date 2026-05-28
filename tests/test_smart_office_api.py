import importlib

from fastapi.testclient import TestClient


def load_app(monkeypatch, tmp_path):
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "portal-test.db"))
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    import main

    return importlib.reload(main)


def auth_headers(client):
    response = client.post(
        "/auth/login",
        json={"username": "user4", "password": "P@ssw0rd"},
    )
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["token"]}


def smart_office_product_id(client, headers):
    response = client.get("/api/products", headers=headers)
    assert response.status_code == 200
    for product in response.json():
        if product["name"] == "智能办公智能体":
            return product["id"]
    raise AssertionError("智能办公智能体 product not found")


def customer_script_product_id(client, headers):
    response = client.get("/api/products", headers=headers)
    assert response.status_code == 200
    for product in response.json():
        if product["name"] == "客服话术优化":
            return product["id"]
    raise AssertionError("客服话术优化 product not found")


def test_smart_office_config_reports_api_key_status(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-test")

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        response = client.get("/api/smart-office/config", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["api_key_configured"] is True
    assert body["model"]
    assert "DEEPSEEK" in body["hint"] or "已" in body["hint"]


def test_smart_office_review_requires_deepseek_key(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = smart_office_product_id(client, headers)
        response = client.post(
            "/api/smart-office/review",
            headers=headers,
            json={
                "product_id": product_id,
                "scenario": "expense",
                "content": "差旅餐费超标，缺少说明。",
            },
        )

    assert response.status_code == 503
    assert response.json()["detail"] == "未配置 DeepSeek API Key"


def test_smart_office_review_returns_llm_structured_result(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-test")
    captured = {}

    def fake_review(scenario, content):
        captured["scenario"] = scenario
        captured["content"] = content
        return app_module.SmartOfficeReviewResult(
            scenario=scenario,
            scenario_label="报销单据",
            risk_level="中",
            score=68,
            summary="存在费用超标与说明缺失风险。",
            findings=["差旅餐费超过标准 12%"],
            suggestions=["补充招待对象与事由说明"],
            next_step="退回申请人补充材料后重新提交",
        )

    monkeypatch.setattr(
        app_module,
        "request_deepseek_smart_office_review",
        fake_review,
        raising=False,
    )

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = smart_office_product_id(client, headers)
        response = client.post(
            "/api/smart-office/review",
            headers=headers,
            json={
                "product_id": product_id,
                "scenario": "expense",
                "content": "差旅餐费 3200 元，超过标准 12%，未填写招待对象说明。",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["scenario"] == "expense"
    assert data["risk_level"] == "中"
    assert data["findings"] == ["差旅餐费超过标准 12%"]
    assert captured["scenario"] == "expense"


def test_smart_office_review_rejects_other_product(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-test")

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        wrong_id = customer_script_product_id(client, headers)
        response = client.post(
            "/api/smart-office/review",
            headers=headers,
            json={
                "product_id": wrong_id,
                "scenario": "contract",
                "content": "责任上限条款与模板不一致。",
            },
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "产品不存在或无权访问"


def test_smart_office_standalone_page_is_served(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        response = client.get("/smart-office.html")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "DEEPSEEK_API_KEY" in response.text
    assert "开始审查" in response.text
