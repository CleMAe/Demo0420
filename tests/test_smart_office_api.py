import importlib
import io
import zipfile
import zlib

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


def docx_bytes(paragraphs):
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        + "".join(
            "<w:p><w:r><w:t>" + paragraph + "</w:t></w:r></w:p>"
            for paragraph in paragraphs
        )
        + "</w:body></w:document>"
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("word/document.xml", document_xml)
    return buffer.getvalue()


def simple_pdf_bytes(text):
    stream = ("BT /F1 12 Tf 72 720 Td (" + text + ") Tj ET").encode("latin1")
    compressed = zlib.compress(stream)
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Length "
        + str(len(compressed)).encode("ascii")
        + b" /Filter /FlateDecode >>\nstream\n"
        + compressed
        + b"\nendstream\nendobj\n%%EOF"
    )


def tounicode_pdf_bytes():
    cmap = (
        "/CIDInit /ProcSet findresource begin\n"
        "12 dict begin\n"
        "begincmap\n"
        "1 beginbfchar\n"
        "<01> <4E2D6587>\n"
        "endbfchar\n"
        "1 beginbfrange\n"
        "<02> <03> <7B80>\n"
        "endbfrange\n"
        "endcmap\n"
        "CMapName currentdict /CMap defineresource pop\n"
        "end end"
    ).encode("latin1")
    content = b"BT /F1 12 Tf 72 720 Td <010203> Tj ET"
    cmap_stream = zlib.compress(cmap)
    content_stream = zlib.compress(content)
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Length "
        + str(len(cmap_stream)).encode("ascii")
        + b" /Filter /FlateDecode >>\nstream\n"
        + cmap_stream
        + b"\nendstream\nendobj\n"
        b"2 0 obj\n<< /Length "
        + str(len(content_stream)).encode("ascii")
        + b" /Filter /FlateDecode >>\nstream\n"
        + content_stream
        + b"\nendstream\nendobj\n%%EOF"
    )


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


def test_smart_office_upload_reads_markdown(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = smart_office_product_id(client, headers)
        response = client.post(
            "/api/smart-office/upload",
            params={"product_id": product_id, "filename": "review.md"},
            headers=headers,
            content="# 合同审核\n责任上限条款与模板不一致。",
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["file_type"] == "Markdown"
    assert "责任上限条款" in body["data"]["content"]


def test_smart_office_upload_reads_docx(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = smart_office_product_id(client, headers)
        response = client.post(
            "/api/smart-office/upload",
            params={"product_id": product_id, "filename": "resume.docx"},
            headers=headers,
            content=docx_bytes(["候选人 5 年后端经验", "缺少目标行业背景"]),
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["file_type"] == "Word"
    assert "候选人 5 年后端经验" in data["content"]
    assert "缺少目标行业背景" in data["content"]


def test_smart_office_upload_reads_pdf(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = smart_office_product_id(client, headers)
        response = client.post(
            "/api/smart-office/upload",
            params={"product_id": product_id, "filename": "tender.pdf"},
            headers=headers,
            content=simple_pdf_bytes("Tender risk requires review"),
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["file_type"] == "PDF"
    assert "Tender risk requires review" in data["content"]


def test_smart_office_upload_pdf_ignores_non_octal_escapes(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = smart_office_product_id(client, headers)
        response = client.post(
            "/api/smart-office/upload",
            params={"product_id": product_id, "filename": "resume.pdf"},
            headers=headers,
            content=simple_pdf_bytes("Resume risk \\³ requires review"),
        )

    assert response.status_code == 200
    assert "Resume risk" in response.json()["data"]["content"]


def test_smart_office_upload_pdf_repairs_shift_encoded_ascii(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = smart_office_product_id(client, headers)
        response = client.post(
            "/api/smart-office/upload",
            params={"product_id": product_id, "filename": "resume.pdf"},
            headers=headers,
            content=simple_pdf_bytes("JPDLO\\021FRP 3\\\\WKRQ &DUQHJLH 0HOORQ 8QLYHUVLW\\\\"),
        )

    assert response.status_code == 200
    content = response.json()["data"]["content"]
    assert "gmail.com" in content
    assert "Python" in content
    assert "Carnegie Mellon University" in content


def test_smart_office_upload_pdf_uses_tounicode_cmap(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = smart_office_product_id(client, headers)
        response = client.post(
            "/api/smart-office/upload",
            params={"product_id": product_id, "filename": "resume.pdf"},
            headers=headers,
            content=tounicode_pdf_bytes(),
        )

    assert response.status_code == 200
    assert "中文简" in response.json()["data"]["content"]


def test_smart_office_upload_reads_legacy_doc_best_effort(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = auth_headers(client)
        product_id = smart_office_product_id(client, headers)
        response = client.post(
            "/api/smart-office/upload",
            params={"product_id": product_id, "filename": "legacy.doc"},
            headers=headers,
            content="旧版 Word 合同审核内容，付款周期 90 天。".encode("utf-16le"),
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["file_type"] == "Word"
    assert "付款周期" in data["content"]


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
