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


def enterprise_gpt_product_id(client, headers):
    response = client.get("/api/products", headers=headers)
    assert response.status_code == 200
    for product in response.json():
        if product["name"] == "企业 GPT 助手":
            return product["id"]
    raise AssertionError("企业 GPT 助手 product not found")


def test_employee_handbook_path_points_to_docs(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    assert app_module.EMPLOYEE_HANDBOOK_PATH.name == "员工手册.md"
    assert app_module.EMPLOYEE_HANDBOOK_PATH.parent.name == "docs"
    assert app_module.EMPLOYEE_HANDBOOK_PATH.is_file()


def test_load_employee_handbook_from_docs(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    app_module._load_employee_handbook.cache_clear()
    handbook = app_module._load_employee_handbook()
    assert "3.2.1" in handbook
    assert "带薪年假" in handbook


def test_enterprise_gpt_sources(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = enterprise_gpt_product_id(client, headers)
        response = client.get(
            f"/api/enterprise-gpt/sources?product_id={product_id}",
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["handbook_available"] is True
    assert app_module.EMPLOYEE_HANDBOOK_PATH.is_file()
    assert len(body["data"]["sources"]) == 3
    assert "新员工如何申请年假？" in body["data"]["preset_questions"]


def test_enterprise_gpt_ask_leave_question(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = enterprise_gpt_product_id(client, headers)
        response = client.post(
            "/api/enterprise-gpt/ask",
            headers=headers,
            json={
                "product_id": product_id,
                "question": "新员工如何申请年假？",
                "knowledge_line": "人力 · 制度与休假",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "3.2" in body["data"]["summary"] or "年假" in body["data"]["summary"]
    assert len(body["data"]["citations"]) == 2
    assert body["data"]["citations"][0]["title"].startswith("引用 · 员工手册")
    assert body["data"]["knowledge_line"] == "人力 · 制度与休假"
    assert body["data"]["visibility_role"] == "普通员工（USER）"


def test_enterprise_gpt_ask_requires_handbook(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    monkeypatch.setattr(
        app_module,
        "EMPLOYEE_HANDBOOK_PATH",
        tmp_path / "docs" / "missing-handbook.md",
    )
    app_module._load_employee_handbook.cache_clear()

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = enterprise_gpt_product_id(client, headers)
        response = client.post(
            "/api/enterprise-gpt/ask",
            headers=headers,
            json={
                "product_id": product_id,
                "question": "新员工如何申请年假？",
            },
        )

    assert response.status_code == 503
    assert response.json()["detail"] == "员工手册知识库文件不可用"


def test_enterprise_gpt_build_answer_expense(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    answer = app_module.build_enterprise_gpt_answer(
        "差旅报销要在多久内提交？",
        None,
        "全员（ADMIN）",
    )
    assert "10 个工作日" in answer.summary
    assert answer.knowledge_line == "运营 · 流程与报销"
    assert any("4.2" in c.title for c in answer.citations)


def test_enterprise_gpt_ask_confidentiality_question(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = enterprise_gpt_product_id(client, headers)
        response = client.post(
            "/api/enterprise-gpt/ask",
            headers=headers,
            json={
                "product_id": product_id,
                "question": "员工能否把内部文档上传到外部大模型？",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "5.2" in body["data"]["summary"] or "外部大模型" in body["data"]["summary"]
    assert body["data"]["knowledge_line"] == "法务 · 保密与合规"
    assert any(c["source_id"] == "cross-compliance" for c in body["data"]["citations"])


def test_enterprise_gpt_ask_unknown_question_fallback(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = enterprise_gpt_product_id(client, headers)
        response = client.post(
            "/api/enterprise-gpt/ask",
            headers=headers,
            json={
                "product_id": product_id,
                "question": "公司食堂开放时间？",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "模拟" in body["data"]["summary"]
    assert len(body["data"]["citations"]) == 1
    assert body["data"]["citations"][0]["source_id"] == "handbook-toc"


def test_enterprise_gpt_requires_auth(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        response = client.get("/api/enterprise-gpt/sources?product_id=1")

    assert response.status_code == 401


def test_enterprise_gpt_wrong_product_returns_404(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        products = client.get("/api/products", headers=headers).json()
        other_id = next(
            p["id"] for p in products if p["name"] != "企业 GPT 助手"
        )
        response = client.post(
            "/api/enterprise-gpt/ask",
            headers=headers,
            json={"product_id": other_id, "question": "测试"},
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "产品不存在或无权访问"


def test_extract_markdown_section(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    sample = (
        "## 第三章\n"
        "### 3.2 带薪年假\n"
        "3.2.1 申请方式：提前在 OA 提交。\n"
        "### 3.3 病假\n"
        "3.3.1 病假须提供证明。\n"
    )
    section = app_module._extract_markdown_section(sample, "### 3.2 带薪年假")
    assert "3.2.1 申请方式" in section
    assert "3.3.1" not in section


def test_default_knowledge_line(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    assert app_module._default_knowledge_line("差旅报销流程") == "运营 · 流程与报销"
    assert app_module._default_knowledge_line("能否上传到大模型") == "法务 · 保密与合规"
    assert app_module._default_knowledge_line("年假怎么休") == "人力 · 制度与休假"


def test_visibility_role_label(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    assert app_module._visibility_role_label("ADMIN") == "全员（ADMIN）"
    assert app_module._visibility_role_label("Director") == "部门总监（Director）"
    assert app_module._visibility_role_label("USER") == "普通员工（USER）"
    assert app_module._visibility_role_label("Guest") == "Guest"
