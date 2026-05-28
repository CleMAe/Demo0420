import importlib

from fastapi.testclient import TestClient


def load_app(monkeypatch, tmp_path):
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "portal-test.db"))
    monkeypatch.setenv("JWT_SECRET", "test-secret")
    import main

    return importlib.reload(main)


def admin_headers(client):
    response = client.post(
        "/auth/login",
        json={"username": "admin1", "password": "P@ssw0rd"},
    )
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["token"]}


def director_headers(client):
    response = client.post(
        "/auth/login",
        json={"username": "director_fin", "password": "P@ssw0rd"},
    )
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["token"]}


def user_headers(client):
    response = client.post(
        "/auth/login",
        json={"username": "user4", "password": "P@ssw0rd"},
    )
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["token"]}


def compliance_product_id(client, headers):
    response = client.get("/api/products", headers=headers)
    assert response.status_code == 200
    for product in response.json():
        if product["name"] == "合规审查 AI":
            return product["id"]
    raise AssertionError("合规审查 AI product not found")


def sample_clause_texts(app_module, category):
    library = app_module._load_compliance_clauses()
    samples = app_module._compliance_preset_samples(library, category)
    return [item.text for item in samples]


# -----------------------------------------------------------------------------
# API 集成测试
# -----------------------------------------------------------------------------


def test_compliance_sources(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.get(
            f"/api/compliance/sources?product_id={product_id}&category=合同",
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["library_available"] is True
    assert len(body["data"]["categories"]) == 3
    assert len(body["data"]["preset_samples"]) == 3
    assert body["data"]["preset_samples"][0]["clause_id"] == "合同-001"
    assert body["data"]["disclaimer"]


def test_compliance_sources_default_category(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.get(
            f"/api/compliance/sources?product_id={product_id}",
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["preset_samples"][0]["clause_id"] == "合同-001"


def test_compliance_sources_procurement_category(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.get(
            f"/api/compliance/sources?product_id={product_id}&category=采购",
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["preset_samples"][0]["clause_id"] == "采购-001"


def test_compliance_sources_commitment_category(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.get(
            f"/api/compliance/sources?product_id={product_id}&category=对外承诺",
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["preset_samples"][0]["clause_id"] == "承诺-001"


def test_compliance_sources_library_unavailable(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    monkeypatch.setattr(
        app_module,
        "COMPLIANCE_LIBRARY_PATH",
        tmp_path / "missing-compliance.md",
    )
    app_module._load_compliance_clauses.cache_clear()

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.get(
            f"/api/compliance/sources?product_id={product_id}",
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["library_available"] is False
    assert body["data"]["preset_samples"] == []


def test_compliance_scan_contract_samples(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    clauses = sample_clause_texts(app_module, "合同")

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.post(
            "/api/compliance/scan",
            headers=headers,
            json={
                "product_id": product_id,
                "category": "合同",
                "clauses": clauses,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["risky_count"] == 3
    assert body["data"]["safe_count"] == 0
    assert body["data"]["review_count"] == 0
    assert body["data"]["results"][0]["matched_clause_id"] == "合同-001"
    assert body["data"]["results"][0]["risk_level"] == "有风险"
    assert "compliance.md" in body["data"]["results"][0]["citation_title"]


def test_compliance_scan_procurement_samples(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    clauses = sample_clause_texts(app_module, "采购")

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.post(
            "/api/compliance/scan",
            headers=headers,
            json={
                "product_id": product_id,
                "category": "采购",
                "clauses": clauses,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["risky_count"] == 3
    assert body["data"]["results"][0]["matched_clause_id"] == "采购-001"


def test_compliance_scan_commitment_samples(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    clauses = sample_clause_texts(app_module, "对外承诺")

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.post(
            "/api/compliance/scan",
            headers=headers,
            json={
                "product_id": product_id,
                "category": "对外承诺",
                "clauses": clauses,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["risky_count"] == 3
    assert body["data"]["results"][0]["matched_clause_id"] == "承诺-001"


def test_compliance_scan_safe_clause(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    library = app_module._load_compliance_clauses()
    safe_clause = next(
        clause for clause in library if clause.clause_id == "合同-018"
    )

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.post(
            "/api/compliance/scan",
            headers=headers,
            json={
                "product_id": product_id,
                "category": "合同",
                "clauses": [safe_clause.text],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["safe_count"] == 1
    assert body["data"]["results"][0]["risk_level"] == "无风险"
    assert body["data"]["results"][0]["matched_clause_id"] == "合同-018"


def test_compliance_scan_unmatched_clause(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.post(
            "/api/compliance/scan",
            headers=headers,
            json={
                "product_id": product_id,
                "category": "合同",
                "clauses": ["这是一条完全不在演示条款库中的虚构条款。"],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["review_count"] == 1
    assert body["data"]["results"][0]["risk_level"] == "待复核"
    assert body["data"]["results"][0]["matched_clause_id"] is None
    assert body["data"]["results"][0]["citation_title"] is None


def test_compliance_scan_mixed_results(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    library = app_module._load_compliance_clauses()
    risky = next(clause for clause in library if clause.clause_id == "合同-001")
    safe = next(clause for clause in library if clause.clause_id == "合同-018")

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.post(
            "/api/compliance/scan",
            headers=headers,
            json={
                "product_id": product_id,
                "category": "合同",
                "clauses": [
                    risky.text,
                    safe.text,
                    "无法匹配的条款文本",
                ],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["risky_count"] == 1
    assert body["data"]["safe_count"] == 1
    assert body["data"]["review_count"] == 1
    assert len(body["data"]["results"]) == 3


def test_compliance_scan_requires_library(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    monkeypatch.setattr(
        app_module,
        "COMPLIANCE_LIBRARY_PATH",
        tmp_path / "missing-compliance.md",
    )
    app_module._load_compliance_clauses.cache_clear()

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.post(
            "/api/compliance/scan",
            headers=headers,
            json={
                "product_id": product_id,
                "category": "合同",
                "clauses": ["测试条款"],
            },
        )

    assert response.status_code == 503
    assert response.json()["detail"] == "合规条款库文件不可用"


def test_compliance_scan_invalid_category(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.post(
            "/api/compliance/scan",
            headers=headers,
            json={
                "product_id": product_id,
                "category": "无效类别",
                "clauses": ["测试条款"],
            },
        )

    assert response.status_code == 422
    assert response.json()["detail"] == "条款类别无效"


def test_compliance_scan_empty_clauses(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        product_id = compliance_product_id(client, headers)
        response = client.post(
            "/api/compliance/scan",
            headers=headers,
            json={
                "product_id": product_id,
                "category": "合同",
                "clauses": ["   ", ""],
            },
        )

    assert response.status_code == 422
    assert response.json()["detail"] == "请至少提供一条待扫描条款"


def test_compliance_requires_auth(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        sources = client.get("/api/compliance/sources?product_id=1")
        scan = client.post(
            "/api/compliance/scan",
            json={"product_id": 1, "category": "合同", "clauses": ["测试"]},
        )

    assert sources.status_code == 401
    assert scan.status_code == 401


def test_compliance_user_role_denied(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = user_headers(client)
        products = client.get("/api/products", headers=headers).json()
        assert all(product["name"] != "合规审查 AI" for product in products)

        admin = admin_headers(client)
        product_id = compliance_product_id(client, admin)
        response = client.post(
            "/api/compliance/scan",
            headers=headers,
            json={
                "product_id": product_id,
                "category": "合同",
                "clauses": ["测试条款"],
            },
        )

    assert response.status_code == 404


def test_compliance_director_can_access(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = director_headers(client)
        products = client.get("/api/products", headers=headers).json()
        assert any(product["name"] == "合规审查 AI" for product in products)
        product_id = compliance_product_id(client, headers)
        response = client.get(
            f"/api/compliance/sources?product_id={product_id}",
            headers=headers,
        )

    assert response.status_code == 200
    assert response.json()["success"] is True


def test_compliance_wrong_product_returns_404(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)

    with TestClient(app_module.app) as client:
        headers = admin_headers(client)
        products = client.get("/api/products", headers=headers).json()
        other_id = next(
            product["id"]
            for product in products
            if product["name"] != "合规审查 AI"
        )
        response = client.post(
            "/api/compliance/scan",
            headers=headers,
            json={
                "product_id": other_id,
                "category": "合同",
                "clauses": ["测试条款"],
            },
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "产品不存在或无权访问"


# -----------------------------------------------------------------------------
# 纯函数单元测试
# -----------------------------------------------------------------------------


def test_parse_compliance_library(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    library = app_module._load_compliance_clauses()
    assert len(library) == 100
    contract_risky = [
        clause for clause in library
        if clause.category == "合同" and clause.risk_level == "有风险"
    ]
    assert len(contract_risky) == 17


def test_parse_compliance_library_from_sample_text(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    sample = (
        "#### 合同-001 · 单方调价权过宽\n"
        "**风险标注：** 有风险 · 偏离模板 · 价格条款\n"
        "**条款文本：** 甲方可单方面调整价格。\n"
        "#### 采购-002 · 验收期过长\n"
        "**风险标注：** 有风险 · 验收条款 · 对买方不利\n"
        "**条款文本：** 采购方应在收到货物后 90 日内完成验收。\n"
    )
    clauses = app_module._parse_compliance_library(sample)
    assert len(clauses) == 2
    assert clauses[0].clause_id == "合同-001"
    assert clauses[0].category == "合同"
    assert clauses[0].risk_tags == ["偏离模板", "价格条款"]
    assert clauses[1].clause_id == "采购-002"
    assert clauses[1].category == "采购"


def test_compliance_category_from_clause_id(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    assert app_module._compliance_category_from_clause_id("合同-001") == "合同"
    assert app_module._compliance_category_from_clause_id("采购-001") == "采购"
    assert app_module._compliance_category_from_clause_id("承诺-001") == "对外承诺"


def test_parse_compliance_risk_annotation(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    level, tags = app_module._parse_compliance_risk_annotation(
        "有风险 · 偏离模板 · 价格条款"
    )
    assert level == "有风险"
    assert tags == ["偏离模板", "价格条款"]

    empty_level, empty_tags = app_module._parse_compliance_risk_annotation("")
    assert empty_level == "待复核"
    assert empty_tags == []


def test_compliance_category_counts(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    library = app_module._load_compliance_clauses()
    counts = app_module._compliance_category_counts(library)
    assert counts["合同"] == (17, 17)
    assert counts["采购"] == (17, 16)
    assert counts["对外承诺"] == (16, 17)


def test_compliance_risk_summary(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    risky = app_module.ComplianceClause(
        clause_id="合同-001",
        title="单方调价权过宽",
        category="合同",
        risk_level="有风险",
        risk_tags=["偏离模板", "价格条款"],
        text="示例文本",
    )
    safe = app_module.ComplianceClause(
        clause_id="合同-018",
        title="价格调整需协商",
        category="合同",
        risk_level="无风险",
        risk_tags=["价格条款", "符合模板"],
        text="示例文本",
    )
    assert app_module._compliance_risk_summary(risky) == "偏离模板：单方调价权过宽"
    assert app_module._compliance_risk_summary(safe) == "价格条款：价格调整需协商"


def test_compliance_citation(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    clause = app_module.ComplianceClause(
        clause_id="合同-001",
        title="单方调价权过宽",
        category="合同",
        risk_level="有风险",
        risk_tags=["偏离模板"],
        text="甲方可单方面调整价格。",
    )
    title, excerpt = app_module._compliance_citation(clause)
    assert title == "引用 · compliance.md · 合同-001"
    assert "合同-001 · 单方调价权过宽" in excerpt
    assert "甲方可单方面调整价格。" in excerpt


def test_normalize_clause_text(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    assert app_module._normalize_clause_text("  甲 方 可  ") == "甲方可"
    assert app_module._normalize_clause_text("甲，方可。") == "甲方可"


def test_clause_overlap_score(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    assert app_module._clause_overlap_score("abc", "abc") == 1.0
    assert app_module._clause_overlap_score("abc", "abcdef") == 0.5
    assert app_module._clause_overlap_score("", "abc") == 0.0


def test_match_compliance_clause(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    library = app_module._load_compliance_clauses()
    matched = app_module._match_compliance_clause(
        "甲方可在不事先通知的情况下，根据市场情况单方面调整本协议项下全部服务价格，"
        "乙方不得以此为由拒绝继续履行或要求解除协议。",
        library,
        "合同",
    )
    assert matched is not None
    assert matched.clause_id == "合同-001"


def test_match_compliance_clause_wrong_category(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    library = app_module._load_compliance_clauses()
    contract_text = next(
        clause.text for clause in library if clause.clause_id == "合同-001"
    )
    matched = app_module._match_compliance_clause(
        contract_text,
        library,
        "采购",
    )
    assert matched is None


def test_build_compliance_scan(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    library = app_module._load_compliance_clauses()
    risky = next(clause for clause in library if clause.clause_id == "合同-001")
    data = app_module.build_compliance_scan("合同", [risky.text, "未知条款"])
    assert data.category == "合同"
    assert data.risky_count == 1
    assert data.review_count == 1
    assert data.disclaimer


def test_build_compliance_sources(monkeypatch, tmp_path):
    app_module = load_app(monkeypatch, tmp_path)
    data = app_module.build_compliance_sources("采购")
    assert data.library_available is True
    assert len(data.categories) == 3
    assert data.preset_samples[0].clause_id == "采购-001"
