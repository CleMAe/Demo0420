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


def employee_training_product_id(client, headers):
    response = client.get("/api/products", headers=headers)
    assert response.status_code == 200
    for product in response.json():
        if product["name"] == "员工自助：培训陪练":
            return product["id"]
    raise AssertionError("员工自助：培训陪练 product not found")


def test_employee_training_api_returns_roleplay_reply(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = employee_training_product_id(client, headers)
        response = client.post(
            "/api/employee-training/respond",
            headers=headers,
            json={
                "product_id": product_id,
                "user_message": "我们可以先用 PoC 验证 ROI，并把指标写进合同。",
                "round": 1,
                "history": [],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["phase"] == "roleplay"
    assert body["data"]["role"] == "customer"
    assert "竞品" in body["data"]["reply"]


def test_employee_training_api_returns_coach_report(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = employee_training_product_id(client, headers)
        response = client.post(
            "/api/employee-training/respond",
            headers=headers,
            json={
                "product_id": product_id,
                "user_message": "/end",
                "round": 3,
                "history": [
                    {
                        "role": "user",
                        "content": "我们不能私下承诺效果，建议用 PoC 数据和合同书面条款验证。",
                    }
                ],
            },
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["phase"] == "report"
    assert data["role"] == "coach"
    assert data["score"] >= 90
    assert "合规风险：绿灯" in data["reply"]
