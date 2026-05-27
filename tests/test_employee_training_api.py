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
    captured = {}

    def fake_training_reply(user_message, round_no, history):
        captured["user_message"] = user_message
        captured["round_no"] = round_no
        captured["history"] = history
        return app_module.EmployeeTrainingReply(
            phase="roleplay",
            role="customer",
            reply="你们比竞品贵 15%，凭什么？",
            signals=["价值锚点"],
            suggestions=["补充 PoC 成功指标"],
        )

    monkeypatch.setattr(
        app_module,
        "request_deepseek_employee_training",
        fake_training_reply,
        raising=False,
    )

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
    assert captured["round_no"] == 1
    assert captured["user_message"].startswith("我们可以先用 PoC")


def test_employee_training_api_returns_coach_report(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    def fake_training_reply(user_message, round_no, history):
        return app_module.EmployeeTrainingReply(
            phase="report",
            role="coach",
            reply="合规风险：绿灯\n综合评分：95 / 100",
            score=95,
            signals=["明确拒绝私下承诺"],
            suggestions=[],
        )

    monkeypatch.setattr(
        app_module,
        "request_deepseek_employee_training",
        fake_training_reply,
        raising=False,
    )

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


def test_employee_training_keeps_session_memory(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    captured_history = []

    def fake_training_reply(user_message, round_no, history):
        captured_history.append([turn.content for turn in history])
        return app_module.EmployeeTrainingReply(
            phase="roleplay",
            role="customer",
            reply=f"收到：{user_message}",
        )

    monkeypatch.setattr(
        app_module,
        "request_deepseek_employee_training",
        fake_training_reply,
        raising=False,
    )

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = employee_training_product_id(client, headers)
        for message in ("第一轮回应", "第二轮回应"):
            response = client.post(
                "/api/employee-training/respond",
                headers=headers,
                json={
                    "product_id": product_id,
                    "user_message": message,
                    "round": 1,
                    "session_id": "memory-test",
                    "history": [],
                },
            )
            assert response.status_code == 200

    assert captured_history[0] == []
    assert "第一轮回应" in captured_history[1]
    assert "收到：第一轮回应" in captured_history[1]


def test_employee_training_stream_returns_sse(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    def fake_training_reply(user_message, round_no, history):
        return app_module.EmployeeTrainingReply(
            phase="roleplay",
            role="customer",
            reply="这是流式返回的客户追问。",
        )

    monkeypatch.setattr(
        app_module,
        "request_deepseek_employee_training",
        fake_training_reply,
        raising=False,
    )

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = employee_training_product_id(client, headers)
        with client.stream(
            "POST",
            "/api/employee-training/respond/stream",
            headers=headers,
            json={
                "product_id": product_id,
                "user_message": "开始流式陪练",
                "round": 1,
                "session_id": "sse-test",
                "history": [],
            },
        ) as response:
            body = "".join(response.iter_text())

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert "event: status" in body
    assert "event: result" in body
    assert "这是流式返回的客户追问" in body


def test_employee_training_api_requires_deepseek_key(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = employee_training_product_id(client, headers)
        response = client.post(
            "/api/employee-training/respond",
            headers=headers,
            json={
                "product_id": product_id,
                "user_message": "请开始陪练",
                "round": 1,
                "history": [],
            },
        )

    assert response.status_code == 503
    assert response.json()["detail"] == "未配置 DeepSeek API Key"


def test_employee_training_normalizes_deepseek_payload(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    reply = app_module._normalize_employee_training_reply(
        {
            "phase": "report",
            "role": "coach",
            "reply": "复盘完成",
            "score": 120,
            "signals": ["合规边界"],
            "suggestions": ["补充价值锚点"],
        }
    )

    assert reply.phase == "report"
    assert reply.role == "coach"
    assert reply.score == 100
    assert reply.signals == ["合规边界"]
