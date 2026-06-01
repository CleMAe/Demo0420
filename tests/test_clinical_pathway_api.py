import importlib

from fastapi.testclient import TestClient


def load_app(monkeypatch, tmp_path):
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "portal-test.db"))
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    import main

    return importlib.reload(main)


def auth_headers(client, username="user2"):
    response = client.post(
        "/auth/login",
        json={"username": username, "password": "P@ssw0rd"},
    )
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["token"]}


def clinical_pathway_product_id(client, headers):
    response = client.get("/api/products", headers=headers)
    assert response.status_code == 200
    for product in response.json():
        if product["name"] == "临床路径建议引擎":
            return product["id"]
    raise AssertionError("临床路径建议引擎 product not found")


def test_clinical_pathway_api_returns_structured_plan(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = clinical_pathway_product_id(client, headers)
        response = client.post(
            "/api/clinical-pathway/suggest",
            headers=headers,
            json={
                "product_id": product_id,
                "condition": "肺炎",
                "stage": "初诊评估",
                "symptoms": "发热 3 天，咳嗽咳痰，存在低氧表现。",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["message"] == ""
    assert body["data"]["condition"] == "肺炎"
    assert body["data"]["risk_level"] == "高危"
    assert "胸部影像复核" in body["data"]["checks"]
    assert body["data"]["disclaimer"].startswith("本结果为课程 Demo")


def test_clinical_pathway_requires_visible_medical_product(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        medical_headers = auth_headers(client, "user2")
        product_id = clinical_pathway_product_id(client, medical_headers)
        non_medical_headers = auth_headers(client, "user1")
        response = client.post(
            "/api/clinical-pathway/suggest",
            headers=non_medical_headers,
            json={
                "product_id": product_id,
                "condition": "糖尿病",
                "stage": "治疗复评",
                "symptoms": "空腹血糖偏高，近期口渴明显。",
            },
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "产品不存在或无权访问"


def test_clinical_pathway_rule_marks_high_risk(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    suggestion = app_module.build_clinical_pathway_suggestion(
        "急性腹痛",
        "初诊评估",
        "腹痛加重伴意识障碍，血压下降。",
    )

    assert suggestion.risk_level == "高危"
    assert suggestion.next_steps[0].startswith("立即复核")
    assert "腹膜刺激征或持续性剧痛" in suggestion.warning_signs
