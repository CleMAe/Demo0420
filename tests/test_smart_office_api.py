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


def test_smart_office_review_returns_structured_result(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = smart_office_product_id(client, headers)
        response = client.post(
            "/api/smart-office/review",
            headers=headers,
            json={
                "product_id": product_id,
                "scenario": "expense",
                "content": "差旅餐费 3200 元，超过标准 12%，未填写招待对象说明，发票齐全。",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["scenario"] == "expense"
    assert data["scenario_label"] == "报销单据"
    assert data["risk_level"] in ("低", "中", "高")
    assert 0 <= data["score"] <= 100
    assert data["summary"]
    assert isinstance(data["findings"], list) and data["findings"]
    assert isinstance(data["suggestions"], list) and data["suggestions"]
    assert data["next_step"]


def test_smart_office_review_rejects_other_product(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

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


def test_smart_office_review_scenario_labels(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = smart_office_product_id(client, headers)
        response = client.post(
            "/api/smart-office/review",
            headers=headers,
            json={
                "product_id": product_id,
                "scenario": "resume",
                "content": "候选人 5 年后端经验，但缺少目标行业背景，岗位匹配度一般。",
            },
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["scenario_label"] == "简历筛选"
    assert any("匹配" in item or "经验" in item or "行业" in item for item in data["findings"])
