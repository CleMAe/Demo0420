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


def customer_script_product_id(client, headers):
    response = client.get("/api/products", headers=headers)
    assert response.status_code == 200
    for product in response.json():
        if product["name"] == "客服话术优化":
            return product["id"]
    raise AssertionError("客服话术优化 product not found")


def test_customer_script_api_requires_deepseek_key(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = customer_script_product_id(client, headers)
        response = client.post(
            "/api/customer-script/suggest",
            headers=headers,
            json={
                "product_id": product_id,
                "intent": "投诉配送延迟",
                "customer_message": "等了一周还没送到，必须给我说法。",
            },
        )

    assert response.status_code == 503
    assert response.json()["detail"] == "未配置 DeepSeek API Key"


def test_customer_script_api_returns_structured_suggestion(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-test")
    monkeypatch.setenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
    captured = {}

    def fake_deepseek_suggestion(intent, customer_message):
        captured["intent"] = intent
        captured["customer_message"] = customer_message
        return {
            "sentiment": "高风险负面",
            "reply": "非常抱歉让您久等了，我会立即帮您核查配送节点。",
            "steps": ["先表达歉意", "核查物流节点", "给出回访时间"],
            "escalation": "若客户继续强烈投诉，转交主管并标记加急工单。",
            "forbidden_words": ["这不是我们的问题", "你再等等"],
        }

    monkeypatch.setattr(
        app_module,
        "request_deepseek_customer_script",
        fake_deepseek_suggestion,
        raising=False,
    )

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = customer_script_product_id(client, headers)
        response = client.post(
            "/api/customer-script/suggest",
            headers=headers,
            json={
                "product_id": product_id,
                "intent": "投诉配送延迟",
                "customer_message": "等了一周还没送到，必须给我说法。",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["sentiment"] == "高风险负面"
    assert body["data"]["reply"].startswith("非常抱歉")
    assert body["data"]["steps"] == ["先表达歉意", "核查物流节点", "给出回访时间"]
    assert body["data"]["escalation"].startswith("若客户继续强烈投诉")
    assert body["data"]["forbidden_words"] == ["这不是我们的问题", "你再等等"]
    assert body["message"] == ""
    assert captured == {
        "intent": "投诉配送延迟",
        "customer_message": "等了一周还没送到，必须给我说法。",
    }


def test_customer_script_normalizes_model_sentiment(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    suggestion = app_module._normalize_customer_script_suggestion(
        {
            "sentiment": "neutral",
            "reply": "我理解您的顾虑，会先核实情况再给出处理方案。",
            "steps": ["安抚客户", "核实问题"],
            "escalation": "如客户继续不满，升级主管处理。",
            "forbidden_words": ["你自己看"],
        }
    )

    assert suggestion.sentiment == "neutral"
    assert suggestion.sentiment_label == "中性"
    assert suggestion.sentiment_score == 45


def test_uvicorn_serves_login_page_for_local_preview(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        response = client.get("/login.html")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "login-form" in response.text
