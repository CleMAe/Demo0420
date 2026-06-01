"""智能体 Demo 平台 API：SQLite + RBAC + JWT。"""

from __future__ import annotations

from dataclasses import dataclass
import io
import json
import os
import re
import sqlite3
import urllib.error
import urllib.request
import zipfile
import zlib
from functools import lru_cache
import xml.etree.ElementTree as ET

from dotenv import load_dotenv

load_dotenv()
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------

DB_PATH = Path(os.environ.get("SQLITE_PATH", "/data/portal.db"))
SECRET_KEY = os.environ.get("JWT_SECRET", "portal-dev-secret-change-in-prod")
PORTAL_BRAND_NAME = os.environ.get("PORTAL_BRAND_NAME", "智能体Demo平台")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")
CUSTOMER_SCRIPT_PRODUCT_NAME = "客服话术优化"
COPILOT_PRODUCT_NAME = "代码 Copilot 企业版"
ENTERPRISE_GPT_PRODUCT_NAME = "企业 GPT 助手"
COMPLIANCE_PRODUCT_NAME = "合规审查 AI"
CLINICAL_PATHWAY_PRODUCT_NAME = "临床路径建议引擎"
EMPLOYEE_TRAINING_PRODUCT_NAME = "员工自助：培训陪练"
SMART_OFFICE_PRODUCT_NAME = "智能办公智能体"
ADMIN_ROUTER_PRODUCT_NAME = "仅管理员：密钥与模型路由"
DIRECTOR_SANDBOX_PRODUCT_NAME = "行业总监专区：战略沙盘"
MODULE_PAGE_URLS: dict[str, str] = {
    "企业 GPT 助手": "enterprise-gpt.html",
    COPILOT_PRODUCT_NAME: "copilot.html",
    COMPLIANCE_PRODUCT_NAME: "compliance-review.html",
    "金融研报生成器": "fin-report.html",
    "信贷风控模型工作台": "credit-risk.html",
    "医疗影像辅助诊断": "medical-imaging.html",
    CLINICAL_PATHWAY_PRODUCT_NAME: "clinical-pathway.html",
    "DevOps 日志洞察": "devops-log-insight.html",
    CUSTOMER_SCRIPT_PRODUCT_NAME: "customer-script.html",
    ADMIN_ROUTER_PRODUCT_NAME: "admin-router.html",
    DIRECTOR_SANDBOX_PRODUCT_NAME: "director-sandbox.html",
    EMPLOYEE_TRAINING_PRODUCT_NAME: "employee-training.html",
    "问数智能体": "ask-data.html",
    "位置导航智能体": "navigation-agent.html",
    "目标检测智能体": "object-detection.html",
    SMART_OFFICE_PRODUCT_NAME: "smart-office.html",
    "智能体问答（长文本）": "long-context-qa.html",
}
SMART_OFFICE_SCENARIOS: dict[str, str] = {
    "expense": "报销单据",
    "resume": "简历筛选",
    "tender": "招标文件",
    "contract": "合同审核",
}
SMART_OFFICE_REVIEW_MAX_CHARS = 12000
SMART_OFFICE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024
PROJECT_ROOT = Path(__file__).resolve().parent
EMPLOYEE_HANDBOOK_PATH = PROJECT_ROOT / "docs" / "员工手册.md"
COMPLIANCE_LIBRARY_PATH = PROJECT_ROOT / "docs" / "compliance.md"
FRONTEND_ASSETS = {
    "": "index.html",
    "index.html": "index.html",
    "login.html": "login.html",
    "detail.html": "detail.html",
    "enterprise-gpt.html": "enterprise-gpt.html",
    "copilot.html": "copilot.html",
    "compliance-review.html": "compliance-review.html",
    "fin-report.html": "fin-report.html",
    "credit-risk.html": "credit-risk.html",
    "medical-imaging.html": "medical-imaging.html",
    "clinical-pathway.html": "clinical-pathway.html",
    "devops-log-insight.html": "devops-log-insight.html",
    "customer-script.html": "customer-script.html",
    "admin-router.html": "admin-router.html",
    "director-sandbox.html": "director-sandbox.html",
    "employee-training.html": "employee-training.html",
    "ask-data.html": "ask-data.html",
    "navigation-agent.html": "navigation-agent.html",
    "object-detection.html": "object-detection.html",
    "smart-office.html": "smart-office.html",
    "long-context-qa.html": "long-context-qa.html",
    "portal-brand.js": "portal-brand.js",
    "portal-demos.js": "portal-demos.js",
    "agent-workbench.js": "agent-workbench.js",
    "smart-office.js": "smart-office.js",
}
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

security = HTTPBearer(auto_error=False)
TRAINING_MEMORY_LIMIT = 24
TRAINING_MEMORY: dict[str, list["EmployeeTrainingTurn"]] = {}

ADMIN_ROUTER_DEMO_KEYS: list[dict[str, Any]] = [
    {
        "key_id": "key_finops_gateway",
        "provider": "统一模型网关（模拟）",
        "masked_key": "demo-key-****-finops",
        "owner": "平台组",
        "scope": ["费用估算", "路由编排", "审计写入"],
        "status": "健康",
        "expires_at": "2026-08-30",
        "rotation_days": 94,
        "monthly_quota": 1800000,
        "used_pct": 42,
    },
    {
        "key_id": "key_rag_private",
        "provider": "私有 RAG 模型池（模拟）",
        "masked_key": "demo-key-****-rag",
        "owner": "知识库组",
        "scope": ["内部文档问答", "长文本摘要"],
        "status": "观察",
        "expires_at": "2026-07-15",
        "rotation_days": 48,
        "monthly_quota": 900000,
        "used_pct": 67,
    },
    {
        "key_id": "key_training_sandbox",
        "provider": "培训陪练模型池（模拟）",
        "masked_key": "demo-key-****-train",
        "owner": "培训组",
        "scope": ["员工陪练", "评分复盘"],
        "status": "健康",
        "expires_at": "2026-09-20",
        "rotation_days": 115,
        "monthly_quota": 650000,
        "used_pct": 28,
    },
]

ADMIN_ROUTER_DEMO_ROUTES: list[dict[str, Any]] = [
    {
        "route_id": "route_customer_service",
        "application": "customer-service",
        "application_label": "客服话术优化",
        "department": "客户运营",
        "primary_model": "通用对话模型（模拟）",
        "fallback_model": "低成本对话模型（模拟）",
        "provider_key_id": "key_finops_gateway",
        "policy": "低风险优先成本；投诉升级时切高稳定路由",
        "region": "华东演示区",
        "max_rpm": 120,
        "status": "启用",
        "cost_per_1k_tokens": 0.012,
        "latency_ms": 780,
        "cost_tier": "标准",
    },
    {
        "route_id": "route_internal_rag",
        "application": "internal-rag",
        "application_label": "企业 GPT 助手",
        "department": "全员知识库",
        "primary_model": "私有知识库模型（模拟）",
        "fallback_model": "通用长文本模型（模拟）",
        "provider_key_id": "key_rag_private",
        "policy": "内部知识优先私有模型；引用缺失时降级人工复核",
        "region": "VPC 演示区",
        "max_rpm": 80,
        "status": "启用",
        "cost_per_1k_tokens": 0.018,
        "latency_ms": 960,
        "cost_tier": "私有",
    },
    {
        "route_id": "route_office_review",
        "application": "office-review",
        "application_label": "智能办公智能体",
        "department": "办公协同",
        "primary_model": "文档审查模型（模拟）",
        "fallback_model": "规则引擎复核队列（模拟）",
        "provider_key_id": "key_finops_gateway",
        "policy": "文档类任务先脱敏再路由；高风险进入复核队列",
        "region": "华北演示区",
        "max_rpm": 60,
        "status": "启用",
        "cost_per_1k_tokens": 0.021,
        "latency_ms": 1100,
        "cost_tier": "审查",
    },
    {
        "route_id": "route_training_coach",
        "application": "training-coach",
        "application_label": "员工自助：培训陪练",
        "department": "人才发展",
        "primary_model": "角色扮演模型（模拟）",
        "fallback_model": "复盘评分模型（模拟）",
        "provider_key_id": "key_training_sandbox",
        "policy": "多轮会话限流；复盘结果只保留演示记忆",
        "region": "华南演示区",
        "max_rpm": 90,
        "status": "启用",
        "cost_per_1k_tokens": 0.014,
        "latency_ms": 840,
        "cost_tier": "培训",
    },
]

ADMIN_ROUTER_AUDIT_EVENTS: list[dict[str, str]] = [
    {
        "time": "2026-05-28 09:30",
        "actor": "admin1",
        "action": "更新路由策略",
        "target": "route_office_review",
        "result": "高风险文档改为先脱敏后复核",
    },
    {
        "time": "2026-05-28 10:10",
        "actor": "admin2",
        "action": "查看密钥台账",
        "target": "key_rag_private",
        "result": "仅展示脱敏标识与配额状态",
    },
    {
        "time": "2026-05-28 11:00",
        "actor": "admin1",
        "action": "模拟熔断演练",
        "target": "route_customer_service",
        "result": "降级到低成本对话模型",
    },
]

ADMIN_ROUTER_POLICY: dict[str, Any] = {
    "secret_policy": "密钥只允许服务端托管，前端和日志仅展示脱敏标识",
    "routing_policy": "按应用、风险等级、配额水位和合规闸门选择模型",
    "quota_policy": "单应用超 80% 月配额进入观察，超 95% 自动限流",
    "data_policy": "演示请求不得携带真实个人、客户、企业、密钥或财务数据",
}

# 演示账号（与下方初始化数据一致）；用于在升级依赖后修复历史库里损坏的密码哈希
USERS_SEED: list[tuple[str, str, str | None]] = [
    ("admin1", "ADMIN", None),
    ("admin2", "ADMIN", None),
    ("director_fin", "Director", "金融"),
    ("director_health", "Director", "医疗"),
    ("director_tech", "Director", "科技"),
    ("user1", "USER", "金融"),
    ("user2", "USER", "医疗"),
    ("user3", "USER", "科技"),
    ("user4", "USER", None),
    ("user5", "USER", None),
]
DEFAULT_DEMO_PASSWORD = "P@ssw0rd"

# name, description, url, badge, allowed_roles, industry_scope, tech_stack, nav_industry, detail_intro
PRODUCTS_SEED: list[tuple[str, str, str, str | None, list[str], str | None, str, str, str]] = [
    (
        "企业 GPT 助手",
        "内部知识库问答与文档摘要",
        MODULE_PAGE_URLS["企业 GPT 助手"],
        "通用",
        ["ADMIN", "Director", "USER"],
        None,
        "大模型与 RAG",
        "跨行业通用",
        "面向企业内部的检索增强生成（RAG）场景，将分散在制度、工单与项目文档中的知识统一索引。\n\n"
        "支持按部门与角色配置可见范围，回答附带引用片段便于核对；适合人力、法务、运营等多条线降低重复答疑成本，并可与现有 IM 或门户集成。",
    ),
    (
        COPILOT_PRODUCT_NAME,
        "IDE 内联补全与评审建议",
        MODULE_PAGE_URLS[COPILOT_PRODUCT_NAME],
        "研发",
        ["ADMIN", "Director", "USER"],
        None,
        "代码与 IDE 智能",
        "研发与运维",
        "在受控仓库与私有模型上提供代码补全、重构建议与评审注释，减少低级错误与安全反模式。\n\n"
        "可对接企业代码规范与依赖白名单，审计补全与提交行为；适合中大型研发团队在合规前提下提升交付效率。",
    ),
    (
        "合规审查 AI",
        "合同与政策条款风险扫描",
        MODULE_PAGE_URLS[COMPLIANCE_PRODUCT_NAME],
        "风控",
        ["ADMIN", "Director"],
        None,
        "NLP 与文档智能",
        "跨行业通用",
        "对合同、采购与对外承诺类文档进行条款级扫描，提示偏离模板的表述与常见风险点。\n\n"
        "不替代律师结论，但可显著缩短初筛时间，并沉淀审查清单供法务与业务对齐口径。",
    ),
    (
        "金融研报生成器",
        "输入主题与行业，AI 模拟生成研报草稿与核心观点",
        MODULE_PAGE_URLS["金融研报生成器"],
        "金融",
        ["ADMIN", "Director", "USER"],
        "金融",
        "大模型与 RAG",
        "金融",
        "输入研报主题与目标行业，AI 自动生成结构化研报草稿，涵盖核心观点、数据占位与风险提示。\n\n"
        "支持简版/标准/详细三种篇幅，适配日报、周报与专题报告场景。所有输出均为模拟数据，"
        "不构成投资建议，需经人工复核与合规审核后使用。",
    ),
    (
        "信贷风控模型工作台",
        "模拟客户画像评分与风控模型漂移预警",
        MODULE_PAGE_URLS["信贷风控模型工作台"],
        "金融",
        ["ADMIN", "Director"],
        "金融",
        "机器学习与风控建模",
        "金融",
        "模拟客户画像输入与风险评分流程，展示评分卡输出、风险等级、审批建议与 Top 特征解释。\n\n"
        "内置模拟异常注入与分箱漂移预警功能，帮助风控团队理解模型退化信号。"
        "所有数据为演示用途，不用于真实信贷审批。",
    ),
    (
        "医疗影像辅助诊断",
        "影像标注与初筛提示（演示）",
        MODULE_PAGE_URLS["医疗影像辅助诊断"],
        "医疗",
        ["ADMIN", "Director"],
        "医疗",
        "计算机视觉",
        "医疗",
        "演示级影像浏览、标注与初筛提示流程，用于教学或 PoC，非医疗器械声明。\n\n"
        "内置胸部 CT、头颅 MRI、骨科 X 线等模拟病例，可展示窗宽/序列切换、异常候选框、置信度与复核建议。\n\n"
        "所有影像、病例和患者信息均为前端模拟数据，不接入真实 PACS 或病历系统；最终诊断必须由执业医师结合病史、检查结果和原始影像完成。",
    ),
    (
        "临床路径建议引擎",
        "基于指南的诊疗路径提示",
        MODULE_PAGE_URLS[CLINICAL_PATHWAY_PRODUCT_NAME],
        "医疗",
        ["ADMIN", "Director", "USER"],
        "医疗",
        "大模型与 RAG",
        "医疗",
        "依据公开临床指南与院内路径库，在问诊/病程记录中提示可遵循的检查与处置顺序。\n\n"
        "用于减少遗漏关键步骤、统一多学科协作口径；所有建议需经执业医师结合患者情况裁量。",
    ),
    (
        "DevOps 日志洞察",
        "集群日志聚类与异常检测",
        MODULE_PAGE_URLS["DevOps 日志洞察"],
        "运维",
        ["ADMIN", "Director", "USER"],
        "科技",
        "AIOps 与日志智能",
        "科技",
        "对容器与中间件日志做聚类、模板提取与异常片段高亮，缩短排障路径。\n\n"
        "可与现有 APM/告警联动，将「相似错误爆发」自动归并，适合平台与 SRE 团队做一线研判。",
    ),
    (
        "客服话术优化",
        "实时情绪与话术推荐",
        MODULE_PAGE_URLS[CUSTOMER_SCRIPT_PRODUCT_NAME],
        "客服",
        ["ADMIN", "Director", "USER"],
        None,
        "对话式 AI",
        "客户与增长",
        "在坐席侧实时提示情绪倾向、合规话术与知识库摘取答案，降低投诉升级率。\n\n"
        "支持按产品线配置禁用词与升级策略，便于质检抽样与培训闭环。",
    ),
    (
        "仅管理员：密钥与模型路由",
        "集中管理 API Key 与路由策略",
        MODULE_PAGE_URLS[ADMIN_ROUTER_PRODUCT_NAME],
        "管理",
        ["ADMIN"],
        None,
        "智能体编排与网关",
        "管理战略",
        "集中托管大模型与第三方 API 的密钥、配额与路由策略，按应用与部门隔离调用。\n\n"
        "提供审计日志与紧急熔断能力，适合平台管理员统一治理成本与安全边界。",
    ),
    (
        DIRECTOR_SANDBOX_PRODUCT_NAME,
        "多部门指标模拟（演示）",
        MODULE_PAGE_URLS[DIRECTOR_SANDBOX_PRODUCT_NAME],
        "战略",
        ["ADMIN", "Director"],
        None,
        "数据分析与可视化",
        "管理战略",
        "以演示为目的的多部门指标沙盘，支持假设调整与情景对比，辅助经营例会讨论。\n\n"
        "数据为模拟或脱敏样本，上线前需对接真实数仓与权限体系。",
    ),
    (
        "员工自助：培训陪练",
        "对话式销售/合规陪练",
        MODULE_PAGE_URLS[EMPLOYEE_TRAINING_PRODUCT_NAME],
        "培训",
        ["ADMIN", "USER"],
        None,
        "对话式 AI",
        "跨行业通用",
        "通过多轮对话模拟客户异议与合规考点，为员工提供可重复的陪练回合与评分要点。\n\n"
        "适合销售、客服与内控培训，降低对真人教练的依赖，并沉淀优秀话术样例。",
    ),
    (
        "问数智能体",
        "自然语言生成 SQL 与经营分析",
        MODULE_PAGE_URLS["问数智能体"],
        "数据",
        ["ADMIN", "Director", "USER"],
        None,
        "数据分析与可视化",
        "跨行业通用",
        "通过自然语言提问自动生成可审计 SQL，并返回指标解释、趋势洞察与可视化建议。\n\n"
        "支持语义层和口径管理，减少跨部门对数争议；适合业务、财务和运营快速自助分析。",
    ),
    (
        "位置导航智能体",
        "语义地点检索与路线规划",
        MODULE_PAGE_URLS["位置导航智能体"],
        "导航",
        ["ADMIN", "Director", "USER"],
        None,
        "对话式 AI",
        "客户与增长",
        "面向园区、医院、商场等复杂场景，支持自然语言地点检索、分层楼宇导航与最短路径推荐。\n\n"
        "可结合室内外地图、拥挤度和无障碍偏好，实现更准确的人群引导与服务分流。",
    ),
    (
        "目标检测智能体",
        "图像与视频中的目标识别与计数",
        MODULE_PAGE_URLS["目标检测智能体"],
        "视觉",
        ["ADMIN", "Director", "USER"],
        None,
        "计算机视觉",
        "科技",
        "对实时视频流或离线图像进行目标检测、类别识别与数量统计，可输出告警阈值事件。\n\n"
        "适用于安防巡检、产线质检与仓储盘点，支持模型版本切换与误报分析闭环。",
    ),
    (
        "智能办公智能体",
        "多流程文档审查与办公协同",
        MODULE_PAGE_URLS[SMART_OFFICE_PRODUCT_NAME],
        "办公",
        ["ADMIN", "Director", "USER"],
        None,
        "NLP 与文档智能",
        "跨行业通用",
        "统一覆盖出差报销单据自然语言审查、人事简历筛选、招采招标文件查重和法务合同文件审核。\n\n"
        "支持规则+模型双引擎，输出可解释审查依据与风险分级，帮助行政、人事、采购、法务协同提效。",
    ),
    (
        "智能体问答（长文本）",
        "万字级文档问答与要点追溯",
        MODULE_PAGE_URLS["智能体问答（长文本）"],
        "长文本",
        ["ADMIN", "Director", "USER"],
        None,
        "大模型与 RAG",
        "跨行业通用",
        "面向长合同、研报、制度手册和技术白皮书，支持跨章节问答、关键条款抽取与上下文连续追问。\n\n"
        "回答附带原文定位与引用片段，确保可追溯和可核验，适合知识密集型团队高频检索场景。",
    ),
]


def _product_column_names(conn: sqlite3.Connection) -> set[str]:
    return {r[1] for r in conn.execute("PRAGMA table_info(products)").fetchall()}


def _ensure_product_extra_columns(conn: sqlite3.Connection) -> None:
    cols = _product_column_names(conn)
    if "nav_industry" not in cols:
        conn.execute("ALTER TABLE products ADD COLUMN nav_industry TEXT DEFAULT '跨行业通用'")
    if "detail_intro" not in cols:
        conn.execute("ALTER TABLE products ADD COLUMN detail_intro TEXT DEFAULT ''")
    if "tech_stack" not in cols:
        conn.execute("ALTER TABLE products ADD COLUMN tech_stack TEXT DEFAULT '大模型与 RAG'")


def _backfill_product_content(conn: sqlite3.Connection) -> None:
    conn.execute("CREATE TABLE IF NOT EXISTS _meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)")
    if conn.execute("SELECT 1 FROM _meta WHERE k = ?", ("products_ext_v3",)).fetchone():
        return
    for name, _desc, _url, _badge, _roles, _scope, tech, nav, detail in PRODUCTS_SEED:
        conn.execute(
            "UPDATE products SET nav_industry = ?, detail_intro = ?, tech_stack = ? WHERE name = ?",
            (nav, detail, tech, name),
        )
    conn.execute(
        "INSERT OR REPLACE INTO _meta (k, v) VALUES (?, ?)",
        ("products_ext_v3", "1"),
    )


def _ensure_seed_products(conn: sqlite3.Connection) -> None:
    """增量补齐新产品到已有数据库，避免必须删库重建。"""
    for name, desc, url, badge, roles, industry_scope, tech_stack, nav_ind, detail in PRODUCTS_SEED:
        existing = conn.execute(
            "SELECT 1 FROM products WHERE name = ?",
            (name,),
        ).fetchone()
        if existing:
            continue
        conn.execute(
            """INSERT INTO products (name, description, url, badge, allowed_roles, industry_scope, tech_stack, nav_industry, detail_intro)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                name,
                desc,
                url,
                badge,
                json.dumps(roles),
                industry_scope,
                tech_stack,
                nav_ind,
                detail,
            ),
        )


def _ensure_med_imaging_content(conn: sqlite3.Connection) -> None:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS _meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)"
    )
    meta_key = "med_imaging_content_v1"
    if conn.execute("SELECT 1 FROM _meta WHERE k = ?", (meta_key,)).fetchone():
        return
    for name, desc, _url, badge, _roles, industry_scope, tech_stack, nav_ind, detail in PRODUCTS_SEED:
        if name != "医疗影像辅助诊断":
            continue
        conn.execute(
            """UPDATE products
               SET description = ?, badge = ?, industry_scope = ?, tech_stack = ?, nav_industry = ?, detail_intro = ?
               WHERE name = ?""",
            (desc, badge, industry_scope, tech_stack, nav_ind, detail, name),
        )
        conn.execute(
            "INSERT OR REPLACE INTO _meta (k, v) VALUES (?, ?)",
            (meta_key, "1"),
        )
        return


# -----------------------------------------------------------------------------
# DB
# -----------------------------------------------------------------------------


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db() -> Any:
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                industry TEXT
            );
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                url TEXT NOT NULL,
                badge TEXT,
                allowed_roles TEXT NOT NULL,
                industry_scope TEXT
            );
            """
        )
        _ensure_product_extra_columns(conn)
        _apply_demo_password_fix(conn)
        _ensure_demo_user_industries(conn)

        cur = conn.execute("SELECT COUNT(*) AS c FROM users")
        if cur.fetchone()["c"] == 0:
            for username, role, industry in USERS_SEED:
                conn.execute(
                    "INSERT INTO users (username, password_hash, role, industry) VALUES (?,?,?,?)",
                    (username, hash_password(DEFAULT_DEMO_PASSWORD), role, industry),
                )
            for name, desc, url, badge, roles, industry_scope, tech_stack, nav_ind, detail in PRODUCTS_SEED:
                conn.execute(
                    """INSERT INTO products (name, description, url, badge, allowed_roles, industry_scope, tech_stack, nav_industry, detail_intro)
                       VALUES (?,?,?,?,?,?,?,?,?)""",
                    (
                        name,
                        desc,
                        url,
                        badge,
                        json.dumps(roles),
                        industry_scope,
                        tech_stack,
                        nav_ind,
                        detail,
                    ),
                )

        _ensure_seed_products(conn)
        _ensure_med_imaging_content(conn)
        for product_name, product_url in MODULE_PAGE_URLS.items():
            conn.execute(
                "UPDATE products SET url = ? WHERE name = ?",
                (product_url, product_name),
            )
        _backfill_product_content(conn)


def _ensure_demo_user_industries(conn: sqlite3.Connection) -> None:
    """为已有库补齐演示账号的行业标签，便于不同用户登录后看到不同场景应用。"""
    conn.execute(
        "CREATE TABLE IF NOT EXISTS _meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)"
    )
    if conn.execute(
        "SELECT 1 FROM _meta WHERE k = ?",
        ("user_industry_demo_v1",),
    ).fetchone():
        return
    for username, _role, industry in USERS_SEED:
        if industry:
            conn.execute(
                "UPDATE users SET industry = ? WHERE username = ?",
                (industry, username),
            )
    conn.execute(
        "INSERT OR REPLACE INTO _meta (k, v) VALUES (?, ?)",
        ("user_industry_demo_v1", "1"),
    )


def _apply_demo_password_fix(conn: sqlite3.Connection) -> None:
    """把演示账号密码统一重置为 DEFAULT_DEMO_PASSWORD（bcrypt 重新哈希）；升级时 bump meta key 以触发全量更新。"""
    conn.execute(
        "CREATE TABLE IF NOT EXISTS _meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)"
    )
    if conn.execute(
        "SELECT 1 FROM _meta WHERE k = ?",
        ("portal_demo_pw_v4",),
    ).fetchone():
        return
    pw_hash = hash_password(DEFAULT_DEMO_PASSWORD)
    for username, _, _ in USERS_SEED:
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE username = ?",
            (pw_hash, username),
        )
    conn.execute(
        "INSERT OR REPLACE INTO _meta (k, v) VALUES (?, ?)",
        ("portal_demo_pw_v4", "1"),
    )


# -----------------------------------------------------------------------------
# Auth helpers
# -----------------------------------------------------------------------------


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: dict[str, Any]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {**subject, "exp": int(expire.timestamp())}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    token: str
    user: dict[str, Any]


class ProductOut(BaseModel):
    id: int
    name: str
    description: str
    url: str
    badge: str | None = None
    industry: str
    tech_stack: str


class ProductDetailOut(BaseModel):
    id: int
    name: str
    description: str
    url: str
    badge: str | None = None
    industry: str
    tech_stack: str
    detail_intro: str


class CustomerScriptRequest(BaseModel):
    product_id: int
    intent: str = Field(min_length=1, max_length=40)
    customer_message: str = Field(min_length=1, max_length=500)


class CustomerScriptSuggestion(BaseModel):
    sentiment: str
    sentiment_label: str
    sentiment_score: int = Field(ge=0, le=100)
    reply: str
    steps: list[str]
    escalation: str
    forbidden_words: list[str]


class CustomerScriptResponse(BaseModel):
    success: bool
    data: CustomerScriptSuggestion | None = None
    message: str = ""


class SmartOfficeReviewRequest(BaseModel):
    product_id: int
    scenario: Literal["expense", "resume", "tender", "contract"]
    content: str = Field(min_length=1, max_length=SMART_OFFICE_REVIEW_MAX_CHARS)


class SmartOfficeReviewResult(BaseModel):
    scenario: str
    scenario_label: str
    risk_level: str
    score: int = Field(ge=0, le=100)
    summary: str
    findings: list[str]
    suggestions: list[str]
    next_step: str


class SmartOfficeReviewResponse(BaseModel):
    success: bool
    data: SmartOfficeReviewResult | None = None
    message: str = ""


class SmartOfficeConfigOut(BaseModel):
    api_key_configured: bool
    model: str
    base_url: str
    hint: str


class SmartOfficeUploadData(BaseModel):
    filename: str
    file_type: str
    content: str
    chars: int
    truncated: bool


class SmartOfficeUploadResponse(BaseModel):
    success: bool
    data: SmartOfficeUploadData | None = None
    message: str = ""


class EnterpriseGptSourceOut(BaseModel):
    id: str
    label: str
    kind: str


class EnterpriseGptSourcesData(BaseModel):
    sources: list[EnterpriseGptSourceOut]
    preset_questions: list[str]
    handbook_available: bool


class EnterpriseGptSourcesResponse(BaseModel):
    success: bool
    data: EnterpriseGptSourcesData | None = None
    message: str = ""


class EnterpriseGptAskRequest(BaseModel):
    product_id: int
    question: str = Field(min_length=1, max_length=500)
    knowledge_line: str | None = Field(default=None, max_length=80)


class EnterpriseGptCitation(BaseModel):
    source_id: str
    title: str
    excerpt: str


class EnterpriseGptAnswerData(BaseModel):
    summary: str
    citations: list[EnterpriseGptCitation]
    visibility_role: str
    knowledge_line: str
    question: str


class EnterpriseGptAskResponse(BaseModel):
    success: bool
    data: EnterpriseGptAnswerData | None = None
    message: str = ""


class ComplianceCategoryOut(BaseModel):
    id: str
    label: str
    risky_count: int
    safe_count: int


class ComplianceSampleClauseOut(BaseModel):
    clause_id: str
    title: str
    text: str


class ComplianceSourcesData(BaseModel):
    categories: list[ComplianceCategoryOut]
    preset_samples: list[ComplianceSampleClauseOut]
    library_available: bool
    disclaimer: str


class ComplianceSourcesResponse(BaseModel):
    success: bool
    data: ComplianceSourcesData | None = None
    message: str = ""


class ComplianceScanRequest(BaseModel):
    product_id: int
    category: str = Field(min_length=1, max_length=20)
    clauses: list[str] = Field(min_length=1, max_length=20)


class ComplianceScanResultOut(BaseModel):
    input_text: str
    matched_clause_id: str | None
    matched_title: str | None
    risk_level: str
    risk_tags: list[str]
    risk_summary: str
    citation_title: str | None
    citation_excerpt: str | None


class ComplianceScanData(BaseModel):
    category: str
    results: list[ComplianceScanResultOut]
    risky_count: int
    safe_count: int
    review_count: int
    disclaimer: str


class ComplianceScanResponse(BaseModel):
    success: bool
    data: ComplianceScanData | None = None
    message: str = ""


class EmployeeTrainingTurn(BaseModel):
    role: str = Field(min_length=1, max_length=20)
    content: str = Field(min_length=1, max_length=800)


class EmployeeTrainingRequest(BaseModel):
    product_id: int
    user_message: str = Field(min_length=1, max_length=800)
    round: int = Field(default=0, ge=0, le=30)
    session_id: str | None = Field(default=None, max_length=80)
    history: list[EmployeeTrainingTurn] = Field(default_factory=list)


class EmployeeTrainingReply(BaseModel):
    phase: str
    role: str
    reply: str
    score: int | None = None
    signals: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class EmployeeTrainingResponse(BaseModel):
    success: bool
    data: EmployeeTrainingReply | None = None
    message: str = ""


class ClinicalPathwayRequest(BaseModel):
    product_id: int
    condition: str = Field(min_length=1, max_length=40)
    stage: str = Field(min_length=1, max_length=40)
    symptoms: str = Field(min_length=1, max_length=500)


class ClinicalPathwaySuggestion(BaseModel):
    condition: str
    stage: str
    risk_level: str
    summary: str
    next_steps: list[str]
    checks: list[str]
    medication_notes: list[str]
    consultation: str
    warning_signs: list[str]
    references: list[str]
    disclaimer: str


class ClinicalPathwayResponse(BaseModel):
    success: bool
    data: ClinicalPathwaySuggestion | None = None
    message: str = ""


class AdminRouterKeyOut(BaseModel):
    key_id: str
    provider: str
    masked_key: str
    owner: str
    scope: list[str]
    status: str
    expires_at: str
    rotation_days: int
    monthly_quota: int
    used_pct: int = Field(ge=0, le=100)


class AdminRouterRouteOut(BaseModel):
    route_id: str
    application: str
    application_label: str
    department: str
    primary_model: str
    fallback_model: str
    provider_key_id: str
    policy: str
    region: str
    max_rpm: int
    status: str
    cost_tier: str


class AdminRouterAuditEventOut(BaseModel):
    time: str
    actor: str
    action: str
    target: str
    result: str


class AdminRouterStatusData(BaseModel):
    routes: list[AdminRouterRouteOut]
    keys: list[AdminRouterKeyOut]
    audit_events: list[AdminRouterAuditEventOut]
    policy: dict[str, Any]
    warnings: list[str]
    disclaimer: str


class AdminRouterStatusResponse(BaseModel):
    success: bool
    data: AdminRouterStatusData | None = None
    message: str = ""


class AdminRouterSimulateRequest(BaseModel):
    product_id: int
    application: Literal["customer-service", "internal-rag", "office-review", "training-coach"]
    risk_level: Literal["low", "medium", "high"] = "medium"
    input_tokens: int = Field(default=2400, ge=100, le=50000)
    contains_sensitive_data: bool = False


class AdminRouterSimulationData(BaseModel):
    route_id: str
    application_label: str
    selected_model: str
    fallback_model: str
    provider_key_id: str
    masked_key: str
    decision: str
    guardrails: list[str]
    estimated_cost: str
    estimated_latency_ms: int
    throttle: str
    audit_event: AdminRouterAuditEventOut
    disclaimer: str


class AdminRouterSimulationResponse(BaseModel):
    success: bool
    data: AdminRouterSimulationData | None = None
    message: str = ""


class AdminRouterRotateRequest(BaseModel):
    product_id: int
    key_id: str = Field(min_length=1, max_length=80)
    reason: str = Field(default="定期轮换演练", min_length=1, max_length=120)


class AdminRouterRotateData(BaseModel):
    key_id: str
    masked_key: str
    rotation_id: str
    status: str
    next_rotation_at: str
    audit_event: AdminRouterAuditEventOut
    disclaimer: str


class AdminRouterRotateResponse(BaseModel):
    success: bool
    data: AdminRouterRotateData | None = None
    message: str = ""


class DeepSeekConfigError(RuntimeError):
    """DeepSeek integration is not configured for this deployment."""


class DeepSeekResponseError(RuntimeError):
    """DeepSeek returned an unusable response."""


# -----------------------------------------------------------------------------
# Dependencies
# -----------------------------------------------------------------------------


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登录或 Token 无效",
        )
    try:
        payload = decode_token(creds.credentials)
        username = payload.get("sub")
        role = payload.get("role")
        if not username or not role:
            raise JWTError()
        return {
            "username": username,
            "role": role,
            "industry": payload.get("industry"),
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 无效或已过期",
        ) from None


def product_visible_for_user(row: sqlite3.Row, user: dict[str, Any]) -> bool:
    role = user["role"]
    if role == "ADMIN":
        return True
    allowed = set(json.loads(row["allowed_roles"]))
    if role not in allowed:
        return False
    scope = row["industry_scope"]
    # 产品若绑定行业场景，仅同行业的 USER / Director 可见；未绑定行业表示跨场景通用
    if scope and role in ("Director", "USER"):
        return user.get("industry") == scope
    return True


def _require_admin_router_product(
    product_id: int,
    user: dict[str, Any],
) -> sqlite3.Row:
    with db() as conn:
        row = conn.execute(
            """SELECT id, name, allowed_roles, industry_scope
               FROM products WHERE id = ?""",
            (product_id,),
        ).fetchone()
    if row is None or row["name"] != ADMIN_ROUTER_PRODUCT_NAME:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="产品不存在或无权访问")
    if user["role"] != "ADMIN" or not product_visible_for_user(row, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅管理员可访问该模块")
    return row


def _admin_router_route(application: str) -> dict[str, Any]:
    for route in ADMIN_ROUTER_DEMO_ROUTES:
        if route["application"] == application:
            return route
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="路由应用无效")


def _admin_router_key(key_id: str) -> dict[str, Any]:
    for key in ADMIN_ROUTER_DEMO_KEYS:
        if key["key_id"] == key_id:
            return key
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="密钥标识不存在")


def build_admin_router_status() -> AdminRouterStatusData:
    warnings: list[str] = []
    for key in ADMIN_ROUTER_DEMO_KEYS:
        if int(key["used_pct"]) >= 60:
            warnings.append(f"{key['key_id']} 配额使用率 {key['used_pct']}%，建议关注限流阈值")
        if int(key["rotation_days"]) <= 60:
            warnings.append(f"{key['key_id']} 距离轮换 {key['rotation_days']} 天，建议排期演练")
    return AdminRouterStatusData(
        routes=[AdminRouterRouteOut(**route) for route in ADMIN_ROUTER_DEMO_ROUTES],
        keys=[AdminRouterKeyOut(**key) for key in ADMIN_ROUTER_DEMO_KEYS],
        audit_events=[AdminRouterAuditEventOut(**event) for event in ADMIN_ROUTER_AUDIT_EVENTS],
        policy=dict(ADMIN_ROUTER_POLICY),
        warnings=warnings,
        disclaimer="本模块仅使用演示台账与模拟路由，不读取、不展示、不存储任何真实 API Key。",
    )


def build_admin_router_simulation(
    body: AdminRouterSimulateRequest,
    user: dict[str, Any],
) -> AdminRouterSimulationData:
    route = _admin_router_route(body.application)
    key = _admin_router_key(str(route["provider_key_id"]))
    high_risk = body.risk_level == "high"
    quota_pressure = int(key["used_pct"]) >= 80
    guardrails = [
        "校验调用方产品 ID 与 ADMIN 权限",
        "仅展示密钥脱敏标识，禁止下发真实凭据",
        "记录演示审计事件，便于追溯路由决策",
    ]

    if body.contains_sensitive_data:
        selected_model = "阻断：敏感数据复核队列（模拟）"
        decision = "检测到敏感数据标记，未进入模型调用，转人工复核"
        estimated_cost = "0.0000 演示币"
        latency = 120
        throttle = "阻断"
        guardrails.append("敏感数据闸门触发：请求内容需先脱敏")
    elif high_risk:
        selected_model = str(route["fallback_model"])
        decision = "高风险任务进入稳态兜底路由，并要求人工复核结论"
        estimated_cost = f"{body.input_tokens / 1000 * float(route['cost_per_1k_tokens']) * 1.2:.4f} 演示币"
        latency = int(route["latency_ms"]) + 260
        throttle = "复核限流"
        guardrails.append("高风险输出添加人工复核要求")
    else:
        selected_model = str(route["primary_model"])
        decision = "按应用策略选择主路由"
        estimated_cost = f"{body.input_tokens / 1000 * float(route['cost_per_1k_tokens']):.4f} 演示币"
        latency = int(route["latency_ms"])
        throttle = "观察" if quota_pressure else "正常"
        if quota_pressure:
            guardrails.append("配额水位较高，进入观察限流")

    event = AdminRouterAuditEventOut(
        time=datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=8))).strftime("%Y-%m-%d %H:%M"),
        actor=str(user["username"]),
        action="模拟模型路由",
        target=str(route["route_id"]),
        result=decision,
    )
    return AdminRouterSimulationData(
        route_id=str(route["route_id"]),
        application_label=str(route["application_label"]),
        selected_model=selected_model,
        fallback_model=str(route["fallback_model"]),
        provider_key_id=str(key["key_id"]),
        masked_key=str(key["masked_key"]),
        decision=decision,
        guardrails=guardrails,
        estimated_cost=estimated_cost,
        estimated_latency_ms=latency,
        throttle=throttle,
        audit_event=event,
        disclaimer="结果为演示估算，不代表真实模型价格、时延或路由配置。",
    )


def build_admin_router_rotation(
    body: AdminRouterRotateRequest,
    user: dict[str, Any],
) -> AdminRouterRotateData:
    key = _admin_router_key(body.key_id.strip())
    now = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=8)))
    rotation_id = f"rot-{now.strftime('%Y%m%d%H%M')}-{key['key_id'][-4:]}"
    event = AdminRouterAuditEventOut(
        time=now.strftime("%Y-%m-%d %H:%M"),
        actor=str(user["username"]),
        action="模拟密钥轮换",
        target=str(key["key_id"]),
        result=f"{body.reason.strip()}；新密钥仍仅以脱敏标识展示",
    )
    return AdminRouterRotateData(
        key_id=str(key["key_id"]),
        masked_key=str(key["masked_key"]),
        rotation_id=rotation_id,
        status="轮换演练已记录",
        next_rotation_at=(now + timedelta(days=90)).strftime("%Y-%m-%d"),
        audit_event=event,
        disclaimer="轮换为演示记录，不创建、不替换任何真实 API Key。",
    )


def _json_object_from_text(text: str) -> dict[str, Any]:
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`").strip()
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start < 0 or end <= start:
            raise DeepSeekResponseError("模型未返回有效 JSON") from None
        data = json.loads(cleaned[start : end + 1])
    if not isinstance(data, dict):
        raise DeepSeekResponseError("模型响应格式不是 JSON 对象")
    return data


def _string_list(value: Any, fallback: list[str]) -> list[str]:
    if isinstance(value, list):
        items = [str(item).strip() for item in value if str(item).strip()]
        return items or fallback
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return fallback


def _clamp_score(value: Any, fallback: int) -> int:
    try:
        score = int(value)
    except (TypeError, ValueError):
        score = fallback
    return max(0, min(100, score))


def _sentiment_label_and_score(raw: dict[str, Any]) -> tuple[str, int]:
    raw_label = str(raw.get("sentiment_label") or raw.get("sentiment") or "").strip()
    text = raw_label.lower()
    if any(word in text for word in ("高风险", "强烈", "愤怒", "angry", "severe", "high")):
        label, fallback = "高风险负面", 88
    elif any(word in text for word in ("负面", "投诉", "不满", "差评", "negative", "complaint")):
        label, fallback = "偏负面", 72
    elif any(word in text for word in ("neutral", "中性", "一般")):
        label, fallback = "中性", 45
    elif any(word in text for word in ("正向", "满意", "positive", "happy")):
        label, fallback = "正向", 24
    else:
        label, fallback = raw_label or "需人工复核", 55
    return label, _clamp_score(raw.get("sentiment_score"), fallback)


def _normalize_customer_script_suggestion(raw: dict[str, Any]) -> CustomerScriptSuggestion:
    sentiment_label, sentiment_score = _sentiment_label_and_score(raw)
    return CustomerScriptSuggestion(
        sentiment=str(raw.get("sentiment") or "需人工复核").strip(),
        sentiment_label=sentiment_label,
        sentiment_score=sentiment_score,
        reply=str(raw.get("reply") or "请先安抚客户情绪，并承诺核查后给出明确回访时间。").strip(),
        steps=_string_list(raw.get("steps"), ["确认问题", "表达歉意", "给出处理时限"]),
        escalation=str(raw.get("escalation") or "若客户持续强烈投诉，升级给主管处理。").strip(),
        forbidden_words=_string_list(raw.get("forbidden_words"), ["这不是我们的问题", "你自己看规则"]),
    )


def build_employee_training_reply(
    user_message: str,
    round_no: int,
    history: list[EmployeeTrainingTurn],
) -> EmployeeTrainingReply:
    text = user_message.strip()
    lower = text.lower()
    history_text = " ".join(turn.content for turn in history[-8:])
    combined = f"{history_text} {text}".lower()

    compliance_ok = any(
        word in combined
        for word in ("合规", "合同", "书面", "不能", "无法承诺", "不私下", "poc", "正式流程")
    )
    value_signal = any(
        word in combined
        for word in ("价值", "roi", "tco", "案例", "数据", "sla", "运维", "风险共担")
    )
    price_only = any(word in combined for word in ("降价", "打折", "便宜", "回扣"))

    if "/end" in lower:
        score = 55
        signals: list[str] = []
        suggestions: list[str] = []
        if value_signal:
            score += 20
            signals.append("使用价值锚点回应价格异议")
        else:
            suggestions.append("价格异议中补充 ROI/TCO、客户案例或 SLA 保障")
        if compliance_ok:
            score += 20
            signals.append("明确拒绝私下承诺并回到正式流程")
        else:
            suggestions.append("遇到保底、回扣、口头承诺时先明确合规边界")
        if price_only:
            score -= 15
            suggestions.append("避免把谈判带入单纯降价或回扣表达")
        score = max(0, min(100, score))
        risk = "绿灯" if compliance_ok else "红线高危"
        reply = (
            "### 演练结束！AI 教练复盘报告\n"
            f"- 综合评分：{score} / 100\n"
            f"- 合规风险：{risk}\n"
            f"- 命中要点：{'、'.join(signals) if signals else '暂未识别到关键优势话术'}\n"
            f"- 优化建议：{'；'.join(suggestions) if suggestions else '继续保持价值表达和合规边界'}\n"
            "- 推荐话术：李总，效果我们建议通过正式 PoC 和合同条款验证，所有承诺都写入书面文件，"
            "这既保护贵司权益，也保证双方合作边界清晰。"
        )
        return EmployeeTrainingReply(
            phase="report",
            role="coach",
            reply=reply,
            score=score,
            signals=signals,
            suggestions=suggestions,
        )

    if round_no <= 1:
        reply = "你们方案听起来不错，但竞品报价比你们低 15%。如果你只能讲概念，我很难往下推进。"
    elif not compliance_ok and any(word in combined for word in ("效果", "保证", "承诺", "保底", "kpi")):
        reply = "那你私下给我保个底吧，效果达不到就全额退款，这个不用写合同里。你能不能点头？"
    elif compliance_ok:
        reply = "行，至少你没有乱承诺。那你把 PoC 验证范围、成功指标和合同条款边界整理出来，我再让团队评估。"
    elif value_signal:
        reply = "价值账我听懂了一点，但你还没解释清楚失败风险怎么兜底。别只讲好处，讲讲边界。"
    else:
        reply = "这回答还是偏虚。你得具体说清楚能省多少钱、怎么验证，以及哪些承诺不能做。"

    suggestions = ["用客户业务指标表达价值", "把效果验证落到 PoC 或书面合同", "遇到私下承诺要明确拒绝"]
    return EmployeeTrainingReply(
        phase="roleplay",
        role="customer",
        reply=reply,
        signals=[signal for signal, ok in (("价值锚点", value_signal), ("合规边界", compliance_ok)) if ok],
        suggestions=suggestions,
    )


def _normalize_employee_training_reply(raw: dict[str, Any]) -> EmployeeTrainingReply:
    phase = str(raw.get("phase") or "").strip()
    if phase not in {"roleplay", "report"}:
        phase = "report" if raw.get("score") is not None else "roleplay"
    role = str(raw.get("role") or "").strip()
    if not role:
        role = "coach" if phase == "report" else "customer"
    return EmployeeTrainingReply(
        phase=phase,
        role=role,
        reply=str(raw.get("reply") or "我需要更具体的信息，才能继续推进这轮陪练。").strip(),
        score=None if raw.get("score") is None else _clamp_score(raw.get("score"), 60),
        signals=_string_list(raw.get("signals"), []),
        suggestions=_string_list(raw.get("suggestions"), []),
    )


def _training_memory_key(user: dict[str, Any], session_id: str | None) -> str | None:
    clean_session = (session_id or "").strip()
    if not clean_session:
        return None
    return f"{user['username']}:{clean_session}"


def _employee_training_history(
    body: EmployeeTrainingRequest,
    user: dict[str, Any],
) -> tuple[str | None, list[EmployeeTrainingTurn]]:
    key = _training_memory_key(user, body.session_id)
    if key and key in TRAINING_MEMORY:
        return key, list(TRAINING_MEMORY[key])
    return key, list(body.history[-TRAINING_MEMORY_LIMIT:])


def _remember_employee_training_turn(
    key: str | None,
    user_message: str,
    reply: EmployeeTrainingReply,
) -> None:
    if not key:
        return
    turns = TRAINING_MEMORY.setdefault(key, [])
    turns.append(EmployeeTrainingTurn(role="user", content=user_message))
    turns.append(EmployeeTrainingTurn(role=reply.role, content=reply.reply))
    del turns[:-TRAINING_MEMORY_LIMIT]


def _sse_event(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _clinical_pathway_risk_level(text: str) -> str:
    high_risk_words = ("休克", "意识障碍", "呼吸困难", "胸痛", "低氧", "抽搐", "昏迷", "大出血")
    medium_risk_words = ("高热", "持续呕吐", "脱水", "黄疸", "剧痛", "感染", "血压升高")
    if any(word in text for word in high_risk_words):
        return "高危"
    if any(word in text for word in medium_risk_words):
        return "中危"
    return "常规"


def build_clinical_pathway_suggestion(
    condition: str,
    stage: str,
    symptoms: str,
) -> ClinicalPathwaySuggestion:
    condition_text = condition.strip()
    stage_text = stage.strip()
    symptom_text = symptoms.strip()
    risk_level = _clinical_pathway_risk_level(f"{condition_text} {stage_text} {symptom_text}")

    templates: dict[str, dict[str, list[str] | str]] = {
        "肺炎": {
            "checks": ["血常规与 CRP/PCT", "胸部影像复核", "血氧饱和度监测", "病原学采样（痰培养/核酸按院内规范）"],
            "steps": ["评估 CURB-65 或同类风险分层", "确认氧疗与液体管理需求", "根据院内抗感染路径选择经验治疗", "48-72 小时复评症状、体温和影像趋势"],
            "meds": ["抗感染用药需结合过敏史、肝肾功能和本院耐药谱", "避免在未评估病原与严重程度时机械升级抗生素"],
            "consult": "出现低氧、休克或多器官受累时，建议呼吸科/重症医学科会诊。",
            "refs": ["社区获得性肺炎诊疗指南（演示引用）", "院内抗菌药物分级管理路径（演示引用）"],
        },
        "糖尿病": {
            "checks": ["空腹/餐后血糖与 HbA1c", "尿酮体或血酮（必要时）", "肾功能与尿微量白蛋白", "足部与眼底风险筛查"],
            "steps": ["确认血糖控制目标和低血糖风险", "梳理饮食、运动、用药依从性", "按分层路径调整降糖方案", "安排随访并记录居家监测频率"],
            "meds": ["降糖药调整需结合肾功能、体重和低血糖风险", "胰岛素方案必须由医生结合监测结果个体化确定"],
            "consult": "疑似酮症酸中毒、严重低血糖或慢性并发症进展时，建议内分泌专科会诊。",
            "refs": ["2 型糖尿病基层诊疗指南（演示引用）", "慢病随访管理规范（演示引用）"],
        },
        "急性腹痛": {
            "checks": ["生命体征与腹部体征复查", "血常规、肝肾功能、电解质与淀粉酶/脂肪酶", "尿常规及妊娠相关筛查（适用时）", "腹部超声或 CT 按急诊规范评估"],
            "steps": ["先排除外科急腹症和失血性风险", "建立禁食、补液与疼痛评估记录", "依据定位体征推进影像和专科评估", "明确观察节点与复诊/留观标准"],
            "meds": ["镇痛和抗感染处理应避免掩盖需急诊手术的体征", "用药前确认过敏史、妊娠可能和肝肾功能"],
            "consult": "腹膜刺激征、进行性加重或生命体征不稳时，建议普外科/急诊外科立即评估。",
            "refs": ["急性腹痛急诊处理路径（演示引用）", "围手术期评估规范（演示引用）"],
        },
    }
    template = templates.get(condition_text) or {
        "checks": ["生命体征复核", "基础实验室检查", "关键症状结构化记录", "必要时完善影像或专科检查"],
        "steps": ["确认主诉、病程和既往史", "按严重程度进行分层", "匹配院内标准路径并标记缺失信息", "制定随访和复评时间点"],
        "meds": ["所有用药建议需由执业医师结合禁忌证确认", "避免仅凭单一症状给出处方结论"],
        "consult": "如存在诊断不清、病情进展或跨专科问题，建议发起专科会诊。",
        "refs": ["院内临床路径库（演示引用）", "公开诊疗指南摘要（演示引用）"],
    }

    next_steps = list(template["steps"])
    if risk_level == "高危":
        next_steps.insert(0, "立即复核 ABCDE、生命体征与抢救资源可用性")
    elif risk_level == "中危":
        next_steps.insert(0, "优先补齐风险分层所需的关键检查与复评时间点")

    warning_signs = ["生命体征不稳定", "症状短时间快速加重", "出现意识改变或低氧表现"]
    if condition_text == "急性腹痛":
        warning_signs.append("腹膜刺激征或持续性剧痛")
    elif condition_text == "肺炎":
        warning_signs.append("血氧下降或呼吸频率明显增快")
    elif condition_text == "糖尿病":
        warning_signs.append("血糖极端异常、酮体阳性或反复低血糖")

    return ClinicalPathwaySuggestion(
        condition=condition_text,
        stage=stage_text,
        risk_level=risk_level,
        summary=f"已基于“{condition_text} / {stage_text}”和当前症状摘要生成演示路径，风险分层为{risk_level}。",
        next_steps=next_steps,
        checks=list(template["checks"]),
        medication_notes=list(template["meds"]),
        consultation=str(template["consult"]),
        warning_signs=warning_signs,
        references=list(template["refs"]),
        disclaimer="本结果为课程 Demo 模拟建议，不构成医疗诊断或处方，必须由执业医师结合患者实际情况复核。",
    )


def request_deepseek_customer_script(intent: str, customer_message: str) -> CustomerScriptSuggestion:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise DeepSeekConfigError("未配置 DeepSeek API Key")

    base_url = os.environ.get("DEEPSEEK_BASE_URL", DEEPSEEK_BASE_URL).rstrip("/")
    model = os.environ.get("DEEPSEEK_MODEL", DEEPSEEK_MODEL).strip() or DEEPSEEK_MODEL
    timeout = float(os.environ.get("DEEPSEEK_TIMEOUT", "20"))
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是电商/物流客服质检专家。根据客户原话和客户意图，生成坐席可直接使用的中文话术。"
                    "只输出 JSON 对象，不要输出 Markdown。字段必须包含：sentiment、sentiment_label、"
                    "sentiment_score、reply、steps、escalation、forbidden_words。"
                    "sentiment_label 使用 正向/中性/偏负面/高风险负面 之一；sentiment_score 是 0-100 整数。"
                    "steps 和 forbidden_words 必须是字符串数组。"
                    "话术要先安抚，再确认动作和时限，避免承诺无法兑现的赔付。"
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "intent": intent,
                        "customer_message": customer_message,
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        "temperature": 0.3,
        "max_tokens": 700,
        "response_format": {"type": "json_object"},
    }
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")[:300]
        raise DeepSeekResponseError(f"DeepSeek API 返回错误：{exc.code} {detail}") from exc
    except urllib.error.URLError as exc:
        raise DeepSeekResponseError(f"DeepSeek API 请求失败：{exc.reason}") from exc
    except TimeoutError as exc:
        raise DeepSeekResponseError("DeepSeek API 请求超时") from exc

    try:
        data = json.loads(body)
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise DeepSeekResponseError("DeepSeek API 响应结构异常") from exc
    return _normalize_customer_script_suggestion(_json_object_from_text(content))


def _normalize_smart_office_review(raw: dict[str, Any], scenario: str) -> SmartOfficeReviewResult:
    scenario_label = str(raw.get("scenario_label") or SMART_OFFICE_SCENARIOS.get(scenario, scenario)).strip()
    risk_level = str(raw.get("risk_level") or "中").strip()
    if risk_level not in ("低", "中", "高"):
        risk_level = "中"
    return SmartOfficeReviewResult(
        scenario=scenario,
        scenario_label=scenario_label,
        risk_level=risk_level,
        score=_clamp_score(raw.get("score"), 55),
        summary=str(raw.get("summary") or "审查完成，请结合业务规则复核。").strip(),
        findings=_string_list(raw.get("findings"), ["未发现显著风险点，建议按常规流程处理"]),
        suggestions=_string_list(raw.get("suggestions"), ["按标准清单完成复核并留存审批记录"]),
        next_step=str(raw.get("next_step") or "提交相关负责人复核").strip(),
    )


def request_deepseek_smart_office_review(scenario: str, content: str) -> SmartOfficeReviewResult:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise DeepSeekConfigError("未配置 DeepSeek API Key")

    scenario_label = SMART_OFFICE_SCENARIOS[scenario]
    base_url = os.environ.get("DEEPSEEK_BASE_URL", DEEPSEEK_BASE_URL).rstrip("/")
    model = os.environ.get("DEEPSEEK_MODEL", DEEPSEEK_MODEL).strip() or DEEPSEEK_MODEL
    timeout = float(os.environ.get("DEEPSEEK_TIMEOUT", "20"))
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是企业智能办公文档审查专家，覆盖报销单据、简历筛选、招标文件、合同审核。"
                    "根据场景与待审查文本输出结构化审查结论。只输出 JSON 对象，不要 Markdown。"
                    "字段必须包含：scenario_label、risk_level、score、summary、findings、suggestions、next_step。"
                    "risk_level 只能是 低/中/高 之一；score 为 0-100 整数；findings 与 suggestions 为字符串数组。"
                    "结论需可解释、可执行，避免空泛表述。"
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "scenario": scenario,
                        "scenario_label": scenario_label,
                        "content": content,
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        "temperature": 0.2,
        "max_tokens": 900,
        "response_format": {"type": "json_object"},
    }
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")[:300]
        raise DeepSeekResponseError(f"DeepSeek API 返回错误：{exc.code} {detail}") from exc
    except urllib.error.URLError as exc:
        raise DeepSeekResponseError(f"DeepSeek API 请求失败：{exc.reason}") from exc
    except TimeoutError as exc:
        raise DeepSeekResponseError("DeepSeek API 请求超时") from exc

    try:
        data = json.loads(body)
        llm_content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise DeepSeekResponseError("DeepSeek API 响应结构异常") from exc
    return _normalize_smart_office_review(_json_object_from_text(llm_content), scenario)


def smart_office_runtime_config() -> SmartOfficeConfigOut:
    configured = bool(os.environ.get("DEEPSEEK_API_KEY", "").strip())
    model = os.environ.get("DEEPSEEK_MODEL", DEEPSEEK_MODEL).strip() or DEEPSEEK_MODEL
    base_url = os.environ.get("DEEPSEEK_BASE_URL", DEEPSEEK_BASE_URL).rstrip("/")
    hint = (
        "已在服务端配置 DEEPSEEK_API_KEY，可直接发起大模型审查。"
        if configured
        else "未检测到 DEEPSEEK_API_KEY。请在项目根目录 .env 中配置后，执行 docker compose up 重启 API 服务。"
    )
    return SmartOfficeConfigOut(
        api_key_configured=configured,
        model=model,
        base_url=base_url,
        hint=hint,
    )


def _require_smart_office_product(
    product_id: int,
    user: dict[str, Any],
) -> sqlite3.Row:
    with db() as conn:
        row = conn.execute(
            """SELECT id, name, allowed_roles, industry_scope
               FROM products WHERE id = ?""",
            (product_id,),
        ).fetchone()
    if (
        row is None
        or row["name"] != SMART_OFFICE_PRODUCT_NAME
        or not product_visible_for_user(row, user)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="产品不存在或无权访问")
    return row


def _decode_text_bytes(raw: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "gb18030"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def _clean_uploaded_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _truncate_smart_office_content(text: str) -> tuple[str, bool]:
    cleaned = _clean_uploaded_text(text)
    if len(cleaned) <= SMART_OFFICE_REVIEW_MAX_CHARS:
        return cleaned, False
    return cleaned[:SMART_OFFICE_REVIEW_MAX_CHARS].rstrip(), True


def _extract_docx_text(raw: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            xml_body = archive.read("word/document.xml")
    except (KeyError, zipfile.BadZipFile) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="无法读取 docx 文档内容，请确认文件未损坏",
        ) from exc

    try:
        root = ET.fromstring(xml_body)
    except ET.ParseError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="docx 文档结构异常，无法解析",
        ) from exc

    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []
    for paragraph in root.findall(".//w:p", ns):
        text = "".join(node.text or "" for node in paragraph.findall(".//w:t", ns))
        if text.strip():
            paragraphs.append(text.strip())
    return "\n".join(paragraphs)


def _extract_legacy_doc_text(raw: bytes) -> str:
    candidates: list[str] = []
    for encoding in ("utf-16le", "gb18030", "latin1"):
        decoded = raw.decode(encoding, errors="ignore")
        spans = re.findall(r"[\u4e00-\u9fffA-Za-z0-9，。！？；：、（）()《》“”‘’%/._\-\s]{4,}", decoded)
        cleaned = _clean_uploaded_text("\n".join(span.strip() for span in spans if span.strip()))
        if cleaned:
            candidates.append(cleaned)
    text = max(candidates, key=len, default="")
    if len(text) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="未能从旧版 .doc 文件中提取有效文本，请另存为 .docx 后重试",
        )
    return text


def _decode_pdf_literal(value: str) -> str:
    return _decode_pdf_literal_bytes(value).decode("latin1", errors="ignore")


def _decode_pdf_literal_bytes(value: str) -> bytes:
    out = bytearray()
    i = 0
    while i < len(value):
        char = value[i]
        if char != "\\":
            out.append(ord(char) & 0xFF)
            i += 1
            continue
        i += 1
        if i >= len(value):
            break
        escaped = value[i]
        mapped = {
            "n": "\n",
            "r": "\n",
            "t": "\t",
            "b": "",
            "f": "",
            "(": "(",
            ")": ")",
            "\\": "\\",
        }
        if escaped in mapped:
            out.extend(mapped[escaped].encode("latin1", errors="ignore"))
            i += 1
        elif escaped in "01234567":
            octal = escaped
            i += 1
            while i < len(value) and len(octal) < 3 and value[i] in "01234567":
                octal += value[i]
                i += 1
            try:
                out.append(int(octal, 8) & 0xFF)
            except ValueError:
                out.extend(octal.encode("latin1", errors="ignore"))
        else:
            out.append(ord(escaped) & 0xFF)
            i += 1
    return bytes(out)


def _decode_pdf_hex(value: str) -> str:
    data = _pdf_hex_to_bytes(value)
    if not data:
        return ""
    if data.startswith(b"\xfe\xff"):
        return data[2:].decode("utf-16-be", errors="ignore")
    return data.decode("utf-8", errors="ignore") or data.decode("latin1", errors="ignore")


def _pdf_hex_to_bytes(value: str) -> bytes:
    cleaned = re.sub(r"\s+", "", value)
    if len(cleaned) % 2:
        cleaned += "0"
    try:
        return bytes.fromhex(cleaned)
    except ValueError:
        return b""


def _decode_pdf_unicode_hex(value: str) -> str:
    data = _pdf_hex_to_bytes(value)
    if not data:
        return ""
    if data.startswith(b"\xfe\xff"):
        data = data[2:]
    if len(data) >= 2:
        decoded = data.decode("utf-16-be", errors="ignore")
        if decoded:
            return decoded
    return data.decode("utf-8", errors="ignore") or data.decode("latin1", errors="ignore")


def _pdf_streams(raw: bytes) -> list[tuple[bytes, bytes]]:
    streams: list[tuple[bytes, bytes]] = []
    for match in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", raw, flags=re.DOTALL):
        stream = match.group(1).strip(b"\r\n")
        prefix = raw[max(0, match.start() - 500):match.start()]
        if b"FlateDecode" in prefix:
            try:
                stream = zlib.decompress(stream)
            except zlib.error:
                continue
        streams.append((prefix, stream))
    return streams


def _parse_pdf_tounicode_maps(raw: bytes) -> dict[bytes, str]:
    cmap: dict[bytes, str] = {}
    for _, stream in _pdf_streams(raw):
        if b"beginbfchar" not in stream and b"beginbfrange" not in stream:
            continue
        text = stream.decode("latin1", errors="ignore")
        for block in re.findall(r"beginbfchar(.*?)endbfchar", text, flags=re.DOTALL):
            for src, dst in re.findall(r"<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]+)>", block):
                src_bytes = _pdf_hex_to_bytes(src)
                dst_text = _decode_pdf_unicode_hex(dst)
                if src_bytes and dst_text:
                    cmap[src_bytes] = dst_text
        for block in re.findall(r"beginbfrange(.*?)endbfrange", text, flags=re.DOTALL):
            for start, end, dst in re.findall(
                r"<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]+)>",
                block,
            ):
                start_bytes = _pdf_hex_to_bytes(start)
                end_bytes = _pdf_hex_to_bytes(end)
                dst_bytes = _pdf_hex_to_bytes(dst)
                if not start_bytes or not end_bytes or not dst_bytes:
                    continue
                start_int = int.from_bytes(start_bytes, "big")
                end_int = int.from_bytes(end_bytes, "big")
                dst_int = int.from_bytes(dst_bytes, "big")
                width = len(start_bytes)
                for offset, code in enumerate(range(start_int, end_int + 1)):
                    src_bytes = code.to_bytes(width, "big")
                    unicode_bytes = (dst_int + offset).to_bytes(len(dst_bytes), "big")
                    cmap[src_bytes] = _decode_pdf_unicode_hex(unicode_bytes.hex())
            for start, end, values in re.findall(
                r"<([0-9A-Fa-f\s]+)>\s*<([0-9A-Fa-f\s]+)>\s*\[(.*?)\]",
                block,
                flags=re.DOTALL,
            ):
                start_bytes = _pdf_hex_to_bytes(start)
                if not start_bytes:
                    continue
                start_int = int.from_bytes(start_bytes, "big")
                width = len(start_bytes)
                for offset, dst in enumerate(re.findall(r"<([0-9A-Fa-f\s]+)>", values)):
                    cmap[(start_int + offset).to_bytes(width, "big")] = _decode_pdf_unicode_hex(dst)
    return cmap


def _apply_pdf_cmap(data: bytes, cmap: dict[bytes, str]) -> str:
    if not cmap:
        return ""
    max_width = max(len(key) for key in cmap)
    out: list[str] = []
    i = 0
    while i < len(data):
        matched = False
        for width in range(max_width, 0, -1):
            token = data[i:i + width]
            if token in cmap:
                out.append(cmap[token])
                i += width
                matched = True
                break
        if not matched:
            out.append(chr(data[i]))
            i += 1
    return "".join(out)


def _pdf_text_score(text: str) -> int:
    lowered = text.lower()
    keywords = (
        "gmail", "email", "linkedin", "python", "sql", "java", "github",
        "carnegie", "university", "experience", "education", "project",
        "agent", "resume", "machine learning", "javascript", "typescript",
    )
    score = sum(3 for keyword in keywords if keyword in lowered)
    score += len(re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)) * 8
    score += len(re.findall(r"https?://|linkedin\.com|github\.com", lowered)) * 4
    score -= len(re.findall(r"[\x00-\x08\x0b-\x1f]", text)) * 2
    return score


def _repair_pdf_shift_encoding(text: str) -> str:
    best_text = text
    best_score = _pdf_text_score(text)
    for shift in range(1, 41):
        chars: list[str] = []
        for char in text:
            code = ord(char)
            shifted = code + shift
            if code != 32 and 1 <= code <= 126 and 32 <= shifted <= 126:
                chars.append(chr(shifted))
            else:
                chars.append(char)
        candidate = "".join(chars)
        score = _pdf_text_score(candidate)
        if score > best_score:
            best_text = candidate
            best_score = score
    return best_text


def _extract_text_from_pdf_stream(stream: bytes, cmap: dict[bytes, str] | None = None) -> str:
    decoded = stream.decode("latin1", errors="ignore")
    pieces: list[str] = []
    for match in re.finditer(r"\((?:\\.|[^\\()])*\)", decoded):
        literal = match.group(0)[1:-1]
        literal_bytes = _decode_pdf_literal_bytes(literal)
        if cmap:
            pieces.append(_apply_pdf_cmap(literal_bytes, cmap))
        else:
            pieces.append(literal_bytes.decode("latin1", errors="ignore"))
    for match in re.finditer(r"<([0-9A-Fa-f\s]{4,})>", decoded):
        hex_bytes = _pdf_hex_to_bytes(match.group(1))
        text = _apply_pdf_cmap(hex_bytes, cmap) if cmap else _decode_pdf_hex(match.group(1))
        if text:
            pieces.append(text)
    return " ".join(piece.strip() for piece in pieces if piece.strip())


def _extract_pdf_text(raw: bytes) -> str:
    pieces: list[str] = []
    cmap = _parse_pdf_tounicode_maps(raw)
    for _, stream in _pdf_streams(raw):
        if b"beginbfchar" in stream or b"beginbfrange" in stream:
            continue
        text = _extract_text_from_pdf_stream(stream, cmap)
        if text:
            pieces.append(text)

    if not pieces:
        text = _extract_text_from_pdf_stream(raw, cmap)
        if text:
            pieces.append(text)

    extracted = _clean_uploaded_text(_repair_pdf_shift_encoding("\n".join(pieces)))
    if not extracted:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="未能从 PDF 中提取文本，请确认 PDF 不是纯扫描图片",
        )
    return extracted


def _extract_smart_office_upload(filename: str, raw: bytes) -> tuple[str, str, bool]:
    safe_name = Path(filename or "").name
    suffix = Path(safe_name).suffix.lower()
    if not safe_name or not suffix:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="缺少文件名或文件类型",
        )
    if len(raw) > SMART_OFFICE_UPLOAD_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="文件过大，请上传 8MB 以内的文档",
        )
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="上传文件为空",
        )

    if suffix in (".md", ".markdown"):
        text = _decode_text_bytes(raw)
        file_type = "Markdown"
    elif suffix == ".txt":
        text = _decode_text_bytes(raw)
        file_type = "Text"
    elif suffix == ".docx":
        text = _extract_docx_text(raw)
        file_type = "Word"
    elif suffix == ".doc":
        text = _extract_legacy_doc_text(raw)
        file_type = "Word"
    elif suffix == ".pdf":
        text = _extract_pdf_text(raw)
        file_type = "PDF"
    else:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="仅支持 md、txt、doc、docx、pdf 文件",
        )

    content, truncated = _truncate_smart_office_content(text)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="未能从文件中提取有效文本",
        )
    return content, file_type, truncated


ENTERPRISE_GPT_SOURCES: list[tuple[str, str, str]] = [
    ("handbook", "制度 · 员工手册.md", "policy"),
    ("ticket-hr", "工单 · HR-0420", "ticket"),
    ("project-portal", "项目文档 · 门户集成说明", "project"),
]

ENTERPRISE_GPT_PRESET_QUESTIONS: list[str] = [
    "新员工如何申请年假？",
    "差旅报销要在多久内提交？",
    "员工能否把内部文档上传到外部大模型？",
]

OA_FLOW_CITATIONS: dict[str, tuple[str, str]] = {
    "leave": (
        "oa-flow-leave",
        "引用 · OA 流程说明（附录）",
        "流程名称：休假申请 · 适用场景：年假、调休 · 审批节点：直属主管。",
    ),
    "expense": (
        "oa-flow-expense",
        "引用 · OA 流程说明（附录）",
        "流程名称：费用报销 · 适用场景：差旅及业务招待 · 审批节点：直属主管 → 财务",
    ),
}


@lru_cache(maxsize=1)
def _load_employee_handbook() -> str:
    if not EMPLOYEE_HANDBOOK_PATH.is_file():
        return ""
    return EMPLOYEE_HANDBOOK_PATH.read_text(encoding="utf-8")


def _extract_markdown_section(text: str, heading: str) -> str:
    lines = text.splitlines()
    start: int | None = None
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped == heading or stripped.startswith(heading + " "):
            start = index + 1
            break
    if start is None:
        return ""
    body: list[str] = []
    for line in lines[start:]:
        stripped = line.strip()
        if stripped.startswith("### ") or (
            stripped.startswith("## ") and not stripped.startswith("### ")
        ):
            break
        if stripped == "---":
            break
        if stripped:
            body.append(re.sub(r"\*\*", "", line.rstrip()))
    return "\n".join(body).strip()


def _visibility_role_label(role: str) -> str:
    return {
        "ADMIN": "全员（ADMIN）",
        "Director": "部门总监（Director）",
        "USER": "普通员工（USER）",
    }.get(role, role)


def _default_knowledge_line(question: str) -> str:
    if re.search(r"报销|差旅|费用", question):
        return "运营 · 流程与报销"
    if re.search(r"保密|上传|大模型|文档", question):
        return "法务 · 保密与合规"
    return "人力 · 制度与休假"


def _require_enterprise_gpt_product(
    product_id: int,
    user: dict[str, Any],
) -> sqlite3.Row:
    with db() as conn:
        row = conn.execute(
            """SELECT id, name, allowed_roles, industry_scope
               FROM products WHERE id = ?""",
            (product_id,),
        ).fetchone()
    if (
        row is None
        or row["name"] != ENTERPRISE_GPT_PRODUCT_NAME
        or not product_visible_for_user(row, user)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="产品不存在或无权访问",
        )
    return row


def _handbook_citation(section_key: str, title: str, fallback: str) -> EnterpriseGptCitation:
    handbook = _load_employee_handbook()
    excerpt = ""
    if section_key == "3.2":
        excerpt = _extract_markdown_section(handbook, "### 3.2 带薪年假")
    elif section_key == "4.2":
        for line in handbook.splitlines():
            stripped = line.strip()
            if stripped.startswith("4.2 "):
                excerpt = re.sub(r"\*\*", "", stripped)
                break
    elif section_key == "5.2":
        for line in handbook.splitlines():
            stripped = line.strip()
            if stripped.startswith("5.2 "):
                excerpt = re.sub(r"\*\*", "", stripped)
                break
    if not excerpt:
        excerpt = fallback
    return EnterpriseGptCitation(
        source_id=f"handbook-{section_key}",
        title=title,
        excerpt=excerpt,
    )


def _oa_flow_citation(flow_key: str) -> EnterpriseGptCitation:
    source_id, title, excerpt = OA_FLOW_CITATIONS[flow_key]
    return EnterpriseGptCitation(source_id=source_id, title=title, excerpt=excerpt)


def build_enterprise_gpt_answer(
    question: str,
    knowledge_line: str | None,
    visibility_role: str,
) -> EnterpriseGptAnswerData:
    line = (knowledge_line or "").strip() or _default_knowledge_line(question)
    citations: list[EnterpriseGptCitation] = []

    if re.search(r"年假|休假|请假", question):
        summary = (
            "根据《员工手册》第 3.2 节（带薪年假）：年假须提前在 OA 提交「休假申请」，"
            "经直属主管审批后方可休假；当年额度按司龄折算（满 1 年不满 10 年为 5 天/年，以此类推）。"
            "未休完年假最多可顺延至次年 3 月 31 日。"
        )
        citations = [
            _handbook_citation(
                "3.2",
                "引用 · 员工手册.md §3.2",
                "3.2.1 申请方式：员工休带薪年假，须提前在 OA 提交「休假申请」。"
                "3.2.2 审批流程：申请经直属主管审批后方可休假。"
                "3.2.3 额度计算：当年年假额度按司龄折算。",
            ),
            _oa_flow_citation("leave"),
        ]
    elif re.search(r"报销|差旅|费用", question):
        summary = (
            "根据《员工手册》第 4.2 节：差旅报销须在出差结束后 10 个工作日内，"
            "在 OA「费用报销」流程提交发票与行程说明，经直属主管及财务审核。"
        )
        citations = [
            _handbook_citation(
                "4.2",
                "引用 · 员工手册.md §4.2",
                "4.2 差旅报销须在出差结束后 10 个工作日内，在 OA「费用报销」流程中提交发票与行程说明，"
                "经直属主管及财务审核。",
            ),
            _oa_flow_citation("expense"),
        ]
    elif re.search(r"保密|上传|大模型|文档", question):
        summary = (
            "根据《员工手册》第 5.2 节：禁止将公司内部文档、代码仓库、客户名单上传至个人网盘或"
            "外部大模型公共服务；经信息安全部审批的私有化部署除外。"
            "对外宣传涉及公司业务须经品牌与公关部门书面同意。"
        )
        citations = [
            _handbook_citation(
                "5.2",
                "引用 · 员工手册.md §5.2",
                "5.2 禁止将公司内部文档、代码仓库、客户名单上传至个人网盘或外部大模型公共服务"
                "（经信息安全部审批的私有化部署除外）。",
            ),
            EnterpriseGptCitation(
                source_id="cross-compliance",
                title="引用 · 合规审查 AI（交叉索引 · 模拟）",
                excerpt=(
                    "与合同及政策条款风险扫描模块联动时，可标注「数据出境 / 第三方 AI 服务」类风险提示（演示占位）。"
                ),
            ),
        ]
    else:
        summary = (
            "已在制度库、工单库与项目文档索引中检索到相关片段（模拟）。"
            "建议缩小问题范围，或从预设问题中选择人力/法务/运营常见场景。"
        )
        citations = [
            EnterpriseGptCitation(
                source_id="handbook-toc",
                title="引用 · 员工手册.md（目录）",
                excerpt="第三章 考勤与休假 · 第四章 薪酬福利 · 第五章 行为规范与保密",
            )
        ]

    return EnterpriseGptAnswerData(
        summary=summary,
        citations=citations,
        visibility_role=visibility_role,
        knowledge_line=line,
        question=question,
    )


COMPLIANCE_CATEGORIES: list[tuple[str, str]] = [
    ("contract", "合同"),
    ("procurement", "采购"),
    ("commitment", "对外承诺"),
]

COMPLIANCE_DEMO_CLAUSE_IDS: dict[str, list[str]] = {
    "合同": ["合同-001", "合同-002", "合同-003"],
    "采购": ["采购-001", "采购-002", "采购-003"],
    "对外承诺": ["承诺-001", "承诺-002", "承诺-003"],
}

COMPLIANCE_DISCLAIMER = (
    "本演示系统使用的合同、采购及承诺样例均为虚构模拟数据，不构成法律意见、"
    "投资建议或商业决策依据；正式使用前须经法务及合规部门复核。"
)

COMPLIANCE_CLAUSE_BLOCK_RE = re.compile(
    r"^#### ((?:合同|采购|承诺)-\d+) · (.+)\n"
    r"\*\*风险标注：\*\* ([^\n]+)\n"
    r"\*\*条款文本：\*\* ([^\n]+)",
    re.MULTILINE,
)


@dataclass(frozen=True)
class ComplianceClause:
    clause_id: str
    title: str
    category: str
    risk_level: str
    risk_tags: list[str]
    text: str


def _compliance_category_from_clause_id(clause_id: str) -> str:
    if clause_id.startswith("合同-"):
        return "合同"
    if clause_id.startswith("采购-"):
        return "采购"
    return "对外承诺"


def _parse_compliance_risk_annotation(raw: str) -> tuple[str, list[str]]:
    parts = [part.strip() for part in raw.split("·") if part.strip()]
    if not parts:
        return "待复核", []
    risk_level = parts[0]
    tags = parts[1:]
    return risk_level, tags


def _parse_compliance_library(text: str) -> list[ComplianceClause]:
    clauses: list[ComplianceClause] = []
    for match in COMPLIANCE_CLAUSE_BLOCK_RE.finditer(text):
        clause_id, title, risk_raw, clause_text = match.groups()
        risk_level, risk_tags = _parse_compliance_risk_annotation(risk_raw)
        clauses.append(
            ComplianceClause(
                clause_id=clause_id.strip(),
                title=title.strip(),
                category=_compliance_category_from_clause_id(clause_id.strip()),
                risk_level=risk_level,
                risk_tags=risk_tags,
                text=clause_text.strip(),
            )
        )
    return clauses


@lru_cache(maxsize=1)
def _load_compliance_clauses() -> tuple[ComplianceClause, ...]:
    if not COMPLIANCE_LIBRARY_PATH.is_file():
        return ()
    text = COMPLIANCE_LIBRARY_PATH.read_text(encoding="utf-8")
    return tuple(_parse_compliance_library(text))


def _normalize_clause_text(text: str) -> str:
    cleaned = re.sub(r"\s+", "", (text or "").strip())
    cleaned = re.sub(r"[，。；：、（）()「」\"'“”‘’\-\*]", "", cleaned)
    return cleaned


def _clause_overlap_score(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    if left in right or right in left:
        return min(len(left), len(right)) / max(len(left), len(right))
    left_chars = set(left)
    right_chars = set(right)
    if not left_chars or not right_chars:
        return 0.0
    return len(left_chars & right_chars) / len(left_chars | right_chars)


def _match_compliance_clause(
    input_text: str,
    library: tuple[ComplianceClause, ...],
    category: str,
) -> ComplianceClause | None:
    normalized_input = _normalize_clause_text(input_text)
    if not normalized_input:
        return None

    candidates = [clause for clause in library if clause.category == category]
    if not candidates:
        return None

    for clause in candidates:
        if _normalize_clause_text(clause.text) == normalized_input:
            return clause

    best: ComplianceClause | None = None
    best_score = 0.0
    for clause in candidates:
        score = _clause_overlap_score(normalized_input, _normalize_clause_text(clause.text))
        if score > best_score:
            best_score = score
            best = clause

    if best is not None and best_score >= 0.45:
        return best
    return None


def _compliance_risk_summary(clause: ComplianceClause) -> str:
    if clause.risk_level == "无风险":
        primary = clause.risk_tags[0] if clause.risk_tags else "符合模板"
        return f"{primary}：{clause.title}"
    primary = clause.risk_tags[0] if clause.risk_tags else clause.risk_level
    return f"{primary}：{clause.title}"


def _compliance_citation(clause: ComplianceClause) -> tuple[str, str]:
    tags = " · ".join(clause.risk_tags) if clause.risk_tags else clause.risk_level
    excerpt = (
        f"{clause.clause_id} · {clause.title}\n"
        f"风险标注：{clause.risk_level} · {tags}\n"
        f"条款文本：{clause.text}"
    )
    return f"引用 · compliance.md · {clause.clause_id}", excerpt


def _compliance_category_counts(
    library: tuple[ComplianceClause, ...],
) -> dict[str, tuple[int, int]]:
    counts: dict[str, tuple[int, int]] = {
        label: (0, 0) for _, label in COMPLIANCE_CATEGORIES
    }
    for clause in library:
        risky, safe = counts.get(clause.category, (0, 0))
        if clause.risk_level == "无风险":
            counts[clause.category] = (risky, safe + 1)
        else:
            counts[clause.category] = (risky + 1, safe)
    return counts


def _compliance_clause_map(
    library: tuple[ComplianceClause, ...],
) -> dict[str, ComplianceClause]:
    return {clause.clause_id: clause for clause in library}


def _compliance_preset_samples(
    library: tuple[ComplianceClause, ...],
    category: str,
) -> list[ComplianceSampleClauseOut]:
    clause_map = _compliance_clause_map(library)
    samples: list[ComplianceSampleClauseOut] = []
    for clause_id in COMPLIANCE_DEMO_CLAUSE_IDS.get(category, []):
        clause = clause_map.get(clause_id)
        if clause is None:
            continue
        samples.append(
            ComplianceSampleClauseOut(
                clause_id=clause.clause_id,
                title=clause.title,
                text=clause.text,
            )
        )
    return samples


def _require_compliance_product(
    product_id: int,
    user: dict[str, Any],
) -> sqlite3.Row:
    with db() as conn:
        row = conn.execute(
            """SELECT id, name, allowed_roles, industry_scope
               FROM products WHERE id = ?""",
            (product_id,),
        ).fetchone()
    if (
        row is None
        or row["name"] != COMPLIANCE_PRODUCT_NAME
        or not product_visible_for_user(row, user)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="产品不存在或无权访问",
        )
    return row


def build_compliance_sources(category: str | None = None) -> ComplianceSourcesData:
    library = _load_compliance_clauses()
    counts = _compliance_category_counts(library)
    selected = (category or "合同").strip() or "合同"
    if selected not in counts:
        selected = "合同"
    return ComplianceSourcesData(
        categories=[
            ComplianceCategoryOut(
                id=category_id,
                label=label,
                risky_count=counts.get(label, (0, 0))[0],
                safe_count=counts.get(label, (0, 0))[1],
            )
            for category_id, label in COMPLIANCE_CATEGORIES
        ],
        preset_samples=_compliance_preset_samples(library, selected),
        library_available=bool(library),
        disclaimer=COMPLIANCE_DISCLAIMER,
    )


def build_compliance_scan(
    category: str,
    clauses: list[str],
) -> ComplianceScanData:
    library = _load_compliance_clauses()
    results: list[ComplianceScanResultOut] = []
    risky_count = 0
    safe_count = 0
    review_count = 0

    for raw_clause in clauses:
        input_text = raw_clause.strip()
        if not input_text:
            continue
        matched = _match_compliance_clause(input_text, library, category)
        if matched is None:
            review_count += 1
            results.append(
                ComplianceScanResultOut(
                    input_text=input_text,
                    matched_clause_id=None,
                    matched_title=None,
                    risk_level="待复核",
                    risk_tags=["未命中条款库"],
                    risk_summary="未在演示条款库中命中，建议人工复核",
                    citation_title=None,
                    citation_excerpt=None,
                )
            )
            continue

        citation_title, citation_excerpt = _compliance_citation(matched)
        risk_summary = _compliance_risk_summary(matched)
        if matched.risk_level == "无风险":
            safe_count += 1
        elif matched.risk_level == "有风险":
            risky_count += 1
        else:
            review_count += 1

        results.append(
            ComplianceScanResultOut(
                input_text=input_text,
                matched_clause_id=matched.clause_id,
                matched_title=matched.title,
                risk_level=matched.risk_level,
                risk_tags=list(matched.risk_tags),
                risk_summary=risk_summary,
                citation_title=citation_title,
                citation_excerpt=citation_excerpt,
            )
        )

    return ComplianceScanData(
        category=category,
        results=results,
        risky_count=risky_count,
        safe_count=safe_count,
        review_count=review_count,
        disclaimer=COMPLIANCE_DISCLAIMER,
    )

def request_deepseek_employee_training(
    user_message: str,
    round_no: int,
    history: list[EmployeeTrainingTurn],
) -> EmployeeTrainingReply:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise DeepSeekConfigError("未配置 DeepSeek API Key")

    base_url = os.environ.get("DEEPSEEK_BASE_URL", DEEPSEEK_BASE_URL).rstrip("/")
    model = os.environ.get("DEEPSEEK_MODEL", DEEPSEEK_MODEL).strip() or DEEPSEEK_MODEL
    timeout = float(os.environ.get("DEEPSEEK_TIMEOUT", "20"))
    history_payload = [
        {"role": turn.role, "content": turn.content}
        for turn in history[-12:]
    ]
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是企业员工培训陪练系统，负责销售和合规场景演练。"
                    "默认扮演刁钻客户李总，回复要像真实商务聊天，每次 2-3 句话。"
                    "你需要在多轮对话中制造价格异议、竞品压价、效果承诺、私下保底或回扣等合规陷阱。"
                    "当用户消息包含 /end 时，切换为 AI 教练，输出复盘报告。"
                    "只输出 JSON 对象，不要输出 Markdown 代码块。字段必须包含："
                    "phase、role、reply、score、signals、suggestions。"
                    "phase 只能是 roleplay 或 report；role 使用 customer 或 coach；"
                    "reply 是中文回复；score 在 report 阶段为 0-100 整数，roleplay 阶段可为 null；"
                    "signals 和 suggestions 必须是字符串数组。"
                    "复盘必须评估销售技巧和合规风险，明确指出是否踩中口头承诺、私下保底、回扣等红线。"
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "round": round_no,
                        "history": history_payload,
                        "user_message": user_message,
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        "temperature": 0.6,
        "max_tokens": 900,
        "response_format": {"type": "json_object"},
    }
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")[:300]
        raise DeepSeekResponseError(f"DeepSeek API 返回错误：{exc.code} {detail}") from exc
    except urllib.error.URLError as exc:
        raise DeepSeekResponseError(f"DeepSeek API 请求失败：{exc.reason}") from exc
    except TimeoutError as exc:
        raise DeepSeekResponseError("DeepSeek API 请求超时") from exc

    try:
        data = json.loads(body)
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise DeepSeekResponseError("DeepSeek API 响应结构异常") from exc
    return _normalize_employee_training_reply(_json_object_from_text(content))


# -----------------------------------------------------------------------------
# App
# -----------------------------------------------------------------------------

app = FastAPI(title=f"{PORTAL_BRAND_NAME} API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ASK_DATA_PRODUCT_NAME = "问数智能体"
ASK_DATA_SQL_BLOCKED_KEYWORDS = (
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "truncate",
    "create",
    "grant",
    "revoke",
    "merge",
    "replace",
    "into outfile",
)
ASK_DATA_DEFAULT_LIMIT = 50
ASK_DATA_MAX_LIMIT = 200


class AskDataGenerateRequest(BaseModel):
    product_id: int
    question: str = Field(min_length=1, max_length=500)


class AskDataSemanticMapping(BaseModel):
    metric: str
    dimensions: list[str]
    filters: list[str]
    grain: str


class AskDataGenerateData(BaseModel):
    question: str
    sql: str
    explain: str
    chart_hint: str
    semantic_mapping: AskDataSemanticMapping
    guardrails: list[str]
    generated_at: str


class AskDataGenerateResponse(BaseModel):
    success: bool
    data: AskDataGenerateData | None = None
    message: str = ""


class AskDataExecuteRequest(BaseModel):
    product_id: int
    sql: str = Field(min_length=1, max_length=3000)
    limit: int = Field(default=ASK_DATA_DEFAULT_LIMIT, ge=1, le=ASK_DATA_MAX_LIMIT)


class AskDataExecuteData(BaseModel):
    sql: str
    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int
    result_note: str
    executed_at: str


class AskDataExecuteResponse(BaseModel):
    success: bool
    data: AskDataExecuteData | None = None
    message: str = ""


def _require_ask_data_product(
    product_id: int,
    user: dict[str, Any],
) -> sqlite3.Row:
    with db() as conn:
        row = conn.execute(
            """SELECT id, name, allowed_roles, industry_scope
               FROM products WHERE id = ?""",
            (product_id,),
        ).fetchone()
    if row is None or row["name"] != ASK_DATA_PRODUCT_NAME or not product_visible_for_user(row, user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="产品不存在或无权访问")
    return row


def _utc8_now() -> str:
    return datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=8))).strftime("%Y-%m-%d %H:%M:%S")


def _ask_data_semantic_parse(question: str) -> AskDataSemanticMapping:
    q = question.lower()
    metric = "SUM(order_amt) AS order_amt"
    metric_label = "订单金额"
    if any(word in q for word in ("订单数", "单量", "order count", "count")):
        metric = "COUNT(1) AS order_cnt"
        metric_label = "订单数"
    elif any(word in q for word in ("客单价", "aov", "avg")):
        metric = "ROUND(SUM(order_amt) / NULLIF(COUNT(1), 0), 2) AS aov"
        metric_label = "客单价"

    dims: list[str] = ["week"]
    grain = "周"
    if any(word in q for word in ("按天", "每日", "day", "日趋势")):
        dims = ["dt"]
        grain = "日"
    elif any(word in q for word in ("按月", "月度", "month", "月趋势")):
        dims = ["month"]
        grain = "月"

    filters: list[str] = []
    if "华东" in question:
        filters.append("region = '华东'")
    elif "华南" in question:
        filters.append("region = '华南'")
    elif "华北" in question:
        filters.append("region = '华北'")
    elif "全国" in question:
        filters.append("1 = 1")
    else:
        filters.append("region = '华东'")

    if any(word in question for word in ("上月", "上个月")):
        filters.append("dt >= date('now', 'start of month', '-1 month')")
        filters.append("dt < date('now', 'start of month')")
    elif any(word in question for word in ("本月", "这个月")):
        filters.append("dt >= date('now', 'start of month')")
        filters.append("dt < date('now', 'start of month', '+1 month')")
    else:
        filters.append("dt >= date('now', '-28 day')")
        filters.append("dt <= date('now')")

    return AskDataSemanticMapping(
        metric=metric_label,
        dimensions=dims,
        filters=filters,
        grain=grain,
    )


def _build_ask_data_sql(mapping: AskDataSemanticMapping) -> str:
    dim = mapping.dimensions[0] if mapping.dimensions else "week"
    dim_select = dim
    where_sql = " AND ".join(mapping.filters) if mapping.filters else "1 = 1"
    metric_expr = "SUM(order_amt) AS order_amt"
    if mapping.metric == "订单数":
        metric_expr = "COUNT(1) AS order_cnt"
    elif mapping.metric == "客单价":
        metric_expr = "ROUND(SUM(order_amt) / NULLIF(COUNT(1), 0), 2) AS aov"
    return (
        f"SELECT {dim_select}, {metric_expr}\n"
        "FROM dw.f_orders\n"
        f"WHERE {where_sql}\n"
        f"GROUP BY {dim_select}\n"
        f"ORDER BY {dim_select}\n"
        f"LIMIT {ASK_DATA_DEFAULT_LIMIT};"
    )


def _ensure_safe_readonly_sql(sql: str) -> str:
    cleaned = (sql or "").strip()
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="SQL 不能为空")
    lowered = cleaned.lower()
    if not lowered.startswith("select "):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="仅允许执行 SELECT 语句")
    for keyword in ASK_DATA_SQL_BLOCKED_KEYWORDS:
        if keyword in lowered:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"检测到高风险 SQL 关键字：{keyword}")
    if "dw.f_orders" not in lowered:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="仅允许访问演示语义层表 dw.f_orders")
    if ";" in cleaned[:-1]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="仅允许单条 SQL 语句")
    return cleaned


def _ask_data_preview_rows(limit: int, metric: str) -> tuple[list[str], list[dict[str, Any]]]:
    safe_limit = max(1, min(limit, ASK_DATA_MAX_LIMIT))
    columns = ["week", metric]
    rows: list[dict[str, Any]] = []
    for i in range(safe_limit):
        week = f"2026-W{(i % 12) + 1:02d}"
        if metric == "order_cnt":
            value = 120 + (i * 3) % 37
        elif metric == "aov":
            value = round(188.0 + (i * 1.7) % 26, 2)
        else:
            value = 52000 + (i * 2300) % 18000
        rows.append({"week": week, metric: value})
    return columns, rows


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/config.js")
def portal_config_js() -> Response:
    payload = json.dumps({"brandName": PORTAL_BRAND_NAME}, ensure_ascii=False)
    body = f"window.PORTAL_CONFIG = {payload};"
    return Response(
        content=body.encode("utf-8"),
        media_type="application/javascript; charset=utf-8",
        headers={"Cache-Control": "no-store"},
    )


@app.post("/auth/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    with db() as conn:
        row = conn.execute(
            "SELECT username, password_hash, role, industry FROM users WHERE username = ?",
            (body.username,),
        ).fetchone()
    if row is None or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")

    token = create_access_token(
        {
            "sub": row["username"],
            "role": row["role"],
            "industry": row["industry"],
        }
    )
    return LoginResponse(
        token=token,
        user={
            "username": row["username"],
            "role": row["role"],
            "industry": row["industry"],
        },
    )


@app.get("/api/products", response_model=list[ProductOut])
def list_products(user: dict[str, Any] = Depends(get_current_user)) -> list[ProductOut]:
    with db() as conn:
        rows = conn.execute(
            "SELECT id, name, description, url, badge, allowed_roles, industry_scope, nav_industry, tech_stack FROM products ORDER BY id"
        ).fetchall()

    out: list[ProductOut] = []
    for r in rows:
        if not product_visible_for_user(r, user):
            continue
        out.append(
            ProductOut(
                id=r["id"],
                name=r["name"],
                description=r["description"],
                url=r["url"],
                badge=r["badge"],
                industry=r["nav_industry"] or "跨行业通用",
                tech_stack=r["tech_stack"] or "大模型与 RAG",
            )
        )
    return out


@app.get("/api/products/{product_id}", response_model=ProductDetailOut)
def get_product(
    product_id: int,
    user: dict[str, Any] = Depends(get_current_user),
) -> ProductDetailOut:
    with db() as conn:
        row = conn.execute(
            """SELECT id, name, description, url, badge, allowed_roles, industry_scope, nav_industry, detail_intro, tech_stack
               FROM products WHERE id = ?""",
            (product_id,),
        ).fetchone()
    if row is None or not product_visible_for_user(row, user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="产品不存在或无权访问")
    detail_text = (row["detail_intro"] or "").strip() or row["description"]
    return ProductDetailOut(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        url=row["url"],
        badge=row["badge"],
        industry=row["nav_industry"] or "跨行业通用",
        tech_stack=row["tech_stack"] or "大模型与 RAG",
        detail_intro=detail_text,
    )


@app.get("/api/admin-router/status", response_model=AdminRouterStatusResponse)
def admin_router_status(
    product_id: int,
    user: dict[str, Any] = Depends(get_current_user),
) -> AdminRouterStatusResponse:
    _require_admin_router_product(product_id, user)
    return AdminRouterStatusResponse(success=True, data=build_admin_router_status())


@app.post("/api/admin-router/simulate", response_model=AdminRouterSimulationResponse)
def simulate_admin_router(
    body: AdminRouterSimulateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> AdminRouterSimulationResponse:
    _require_admin_router_product(body.product_id, user)
    return AdminRouterSimulationResponse(
        success=True,
        data=build_admin_router_simulation(body, user),
    )


@app.post("/api/admin-router/rotate", response_model=AdminRouterRotateResponse)
def rotate_admin_router_key(
    body: AdminRouterRotateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> AdminRouterRotateResponse:
    _require_admin_router_product(body.product_id, user)
    return AdminRouterRotateResponse(
        success=True,
        data=build_admin_router_rotation(body, user),
    )


@app.post("/api/customer-script/suggest", response_model=CustomerScriptResponse)
def suggest_customer_script(
    body: CustomerScriptRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> CustomerScriptResponse:
    with db() as conn:
        row = conn.execute(
            """SELECT id, name, allowed_roles, industry_scope
               FROM products WHERE id = ?""",
            (body.product_id,),
        ).fetchone()
    if (
        row is None
        or row["name"] != CUSTOMER_SCRIPT_PRODUCT_NAME
        or not product_visible_for_user(row, user)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="产品不存在或无权访问")

    try:
        suggestion = request_deepseek_customer_script(body.intent, body.customer_message)
    except DeepSeekConfigError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except DeepSeekResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    if not isinstance(suggestion, CustomerScriptSuggestion):
        suggestion = _normalize_customer_script_suggestion(suggestion)
    return CustomerScriptResponse(success=True, data=suggestion)


@app.get("/api/smart-office/config", response_model=SmartOfficeConfigOut)
def get_smart_office_config(
    user: dict[str, Any] = Depends(get_current_user),
) -> SmartOfficeConfigOut:
    _ = user
    return smart_office_runtime_config()


@app.post("/api/smart-office/upload", response_model=SmartOfficeUploadResponse)
async def upload_smart_office_document(
    product_id: int,
    filename: str,
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
) -> SmartOfficeUploadResponse:
    _require_smart_office_product(product_id, user)
    content, file_type, truncated = _extract_smart_office_upload(
        filename,
        await request.body(),
    )
    return SmartOfficeUploadResponse(
        success=True,
        data=SmartOfficeUploadData(
            filename=Path(filename).name,
            file_type=file_type,
            content=content,
            chars=len(content),
            truncated=truncated,
        ),
    )


@app.post("/api/smart-office/review", response_model=SmartOfficeReviewResponse)
def review_smart_office(
    body: SmartOfficeReviewRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> SmartOfficeReviewResponse:
    _require_smart_office_product(body.product_id, user)

    try:
        result = request_deepseek_smart_office_review(body.scenario, body.content.strip())
    except DeepSeekConfigError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except DeepSeekResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return SmartOfficeReviewResponse(success=True, data=result)


@app.get("/api/enterprise-gpt/sources", response_model=EnterpriseGptSourcesResponse)
def enterprise_gpt_sources(
    product_id: int,
    user: dict[str, Any] = Depends(get_current_user),
) -> EnterpriseGptSourcesResponse:
    _require_enterprise_gpt_product(product_id, user)
    return EnterpriseGptSourcesResponse(
        success=True,
        data=EnterpriseGptSourcesData(
            sources=[
                EnterpriseGptSourceOut(id=source_id, label=label, kind=kind)
                for source_id, label, kind in ENTERPRISE_GPT_SOURCES
            ],
            preset_questions=list(ENTERPRISE_GPT_PRESET_QUESTIONS),
            handbook_available=EMPLOYEE_HANDBOOK_PATH.is_file(),
        ),
    )


@app.post("/api/enterprise-gpt/ask", response_model=EnterpriseGptAskResponse)
def enterprise_gpt_ask(
    body: EnterpriseGptAskRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> EnterpriseGptAskResponse:
    _require_enterprise_gpt_product(body.product_id, user)
    if not EMPLOYEE_HANDBOOK_PATH.is_file():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="员工手册知识库文件不可用",
        )
    answer = build_enterprise_gpt_answer(
        body.question.strip(),
        body.knowledge_line,
        _visibility_role_label(user["role"]),
    )
    return EnterpriseGptAskResponse(success=True, data=answer)


@app.post("/api/compliance/scan", response_model=ComplianceScanResponse)
def compliance_scan(
    body: ComplianceScanRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> ComplianceScanResponse:
    _require_compliance_product(body.product_id, user)
    if not COMPLIANCE_LIBRARY_PATH.is_file():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="合规条款库文件不可用",
        )
    category = body.category.strip()
    allowed = {label for _, label in COMPLIANCE_CATEGORIES}
    if category not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="条款类别无效",
        )
    clauses = [clause.strip() for clause in body.clauses if clause.strip()]
    if not clauses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="请至少提供一条待扫描条款",
        )
    data = build_compliance_scan(category, clauses)
    return ComplianceScanResponse(success=True, data=data)


@app.get("/api/compliance/sources", response_model=ComplianceSourcesResponse)
def compliance_sources(
    product_id: int,
    category: str | None = None,
    user: dict[str, Any] = Depends(get_current_user),
) -> ComplianceSourcesResponse:
    _require_compliance_product(product_id, user)
    return ComplianceSourcesResponse(
        success=True,
        data=build_compliance_sources(category),
    )


@app.post("/api/employee-training/respond", response_model=EmployeeTrainingResponse)
def respond_employee_training(
    body: EmployeeTrainingRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> EmployeeTrainingResponse:
    with db() as conn:
        row = conn.execute(
            """SELECT id, name, allowed_roles, industry_scope
               FROM products WHERE id = ?""",
            (body.product_id,),
        ).fetchone()
    if (
        row is None
        or row["name"] != EMPLOYEE_TRAINING_PRODUCT_NAME
        or not product_visible_for_user(row, user)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="产品不存在或无权访问")

    memory_key, history = _employee_training_history(body, user)
    try:
        reply = request_deepseek_employee_training(body.user_message, body.round, history)
    except DeepSeekConfigError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except DeepSeekResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    _remember_employee_training_turn(memory_key, body.user_message, reply)
    return EmployeeTrainingResponse(success=True, data=reply)


@app.post("/api/employee-training/respond/stream")
def stream_employee_training(
    body: EmployeeTrainingRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> StreamingResponse:
    with db() as conn:
        row = conn.execute(
            """SELECT id, name, allowed_roles, industry_scope
               FROM products WHERE id = ?""",
            (body.product_id,),
        ).fetchone()
    if (
        row is None
        or row["name"] != EMPLOYEE_TRAINING_PRODUCT_NAME
        or not product_visible_for_user(row, user)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="产品不存在或无权访问")

    def event_stream() -> Any:
        memory_key, history = _employee_training_history(body, user)
        yield _sse_event(
            "status",
            {"message": "已读取会话记忆，正在请求 DeepSeek", "memory_turns": len(history)},
        )
        try:
            reply = request_deepseek_employee_training(body.user_message, body.round, history)
            _remember_employee_training_turn(memory_key, body.user_message, reply)
            yield _sse_event(
                "result",
                EmployeeTrainingResponse(success=True, data=reply).model_dump(),
            )
        except DeepSeekConfigError as exc:
            yield _sse_event("error", {"message": str(exc), "status_code": 503})
        except DeepSeekResponseError as exc:
            yield _sse_event("error", {"message": str(exc), "status_code": 502})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@app.post("/api/clinical-pathway/suggest", response_model=ClinicalPathwayResponse)
def suggest_clinical_pathway(
    body: ClinicalPathwayRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> ClinicalPathwayResponse:
    with db() as conn:
        row = conn.execute(
            """SELECT id, name, allowed_roles, industry_scope
               FROM products WHERE id = ?""",
            (body.product_id,),
        ).fetchone()
    if (
        row is None
        or row["name"] != CLINICAL_PATHWAY_PRODUCT_NAME
        or not product_visible_for_user(row, user)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="产品不存在或无权访问")

    suggestion = build_clinical_pathway_suggestion(
        body.condition,
        body.stage,
        body.symptoms,
    )
    return ClinicalPathwayResponse(success=True, data=suggestion)


@app.post("/api/ask-data/generate", response_model=AskDataGenerateResponse)
def generate_ask_data_sql(
    body: AskDataGenerateRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> AskDataGenerateResponse:
    _require_ask_data_product(body.product_id, user)
    question = body.question.strip()
    mapping = _ask_data_semantic_parse(question)
    sql = _build_ask_data_sql(mapping)
    _ = _ensure_safe_readonly_sql(sql)
    explain = (
        f"已将问题映射为「{mapping.metric}」指标，按{mapping.grain}粒度聚合；"
        "先走语义层口径，再输出可审计 SQL。"
    )
    chart_hint = "趋势分析优先使用折线图；需要对比区域时改为分组柱状图。"
    guardrails = [
        "仅允许读取演示语义层表 dw.f_orders",
        "仅允许单条 SELECT 语句，拦截写入和 DDL/DCL 关键字",
        "结果用于演示，不可替代真实经营报表",
    ]
    return AskDataGenerateResponse(
        success=True,
        data=AskDataGenerateData(
            question=question,
            sql=sql,
            explain=explain,
            chart_hint=chart_hint,
            semantic_mapping=mapping,
            guardrails=guardrails,
            generated_at=_utc8_now(),
        ),
    )


@app.post("/api/ask-data/execute", response_model=AskDataExecuteResponse)
def execute_ask_data_sql(
    body: AskDataExecuteRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> AskDataExecuteResponse:
    _require_ask_data_product(body.product_id, user)
    safe_sql = _ensure_safe_readonly_sql(body.sql)
    lowered = safe_sql.lower()
    metric = "order_amt"
    if " as order_cnt" in lowered or "count(" in lowered:
        metric = "order_cnt"
    elif " as aov" in lowered:
        metric = "aov"
    columns, rows = _ask_data_preview_rows(body.limit, metric)
    return AskDataExecuteResponse(
        success=True,
        data=AskDataExecuteData(
            sql=safe_sql,
            columns=columns,
            rows=rows,
            row_count=len(rows),
            result_note="当前为演示数据执行通道，结果来自受控样本集。",
            executed_at=_utc8_now(),
        ),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/{asset_path:path}", include_in_schema=False)
def frontend_asset(asset_path: str) -> FileResponse:
    filename = FRONTEND_ASSETS.get(asset_path)
    if filename is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    path = PROJECT_ROOT / filename
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    return FileResponse(path)


# -----------------------------------------------------------------------------
# Product module: DevOps 日志洞察（仅追加实现；禁止改动现有代码）
# -----------------------------------------------------------------------------


from fastapi import Body
import re
from collections import Counter, defaultdict


LOG_INSIGHT_PRODUCT_NAME = "DevOps 日志洞察"


class LogInsightAnalyzeRequest(BaseModel):
    product_id: int
    logs: list[str] = Field(default_factory=list, max_length=2000)
    top_k: int = Field(default=8, ge=1, le=30)
    anomaly_k: int = Field(default=6, ge=0, le=30)
    min_cluster_size: int = Field(default=2, ge=1, le=2000)


class LogInsightClusterOut(BaseModel):
    template: str
    count: int
    examples: list[str]
    tokens: list[str] = Field(default_factory=list)


class LogInsightAnomalyOut(BaseModel):
    log: str
    reason: str
    template: str
    score: float = Field(ge=0)


class LogInsightAnalyzeData(BaseModel):
    total: int
    parsed: int
    clusters: list[LogInsightClusterOut]
    anomalies: list[LogInsightAnomalyOut]


class LogInsightAnalyzeResponse(BaseModel):
    success: bool
    data: LogInsightAnalyzeData | None = None
    message: str = ""


_LOG_TEMPLATE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b[0-9a-f]{8,}\b", re.IGNORECASE), "<HEX>"),
    (re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.IGNORECASE), "<UUID>"),
    (re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b"), "<IP>"),
    (re.compile(r"\b\d+\b"), "<NUM>"),
    (re.compile(r"\b(?:/[\w\-.]+)+\b"), "<PATH>"),
    (re.compile(r"\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b"), "<EMAIL>"),
]


def _log_template(line: str) -> str:
    s = (line or "").strip()
    if not s:
        return ""
    for pat, rep in _LOG_TEMPLATE_PATTERNS:
        s = pat.sub(rep, s)
    s = re.sub(r"\s+", " ", s).strip()
    # 限制模板长度，避免超长日志拖垮前端展示
    if len(s) > 220:
        s = s[:217] + "..."
    return s


def _template_tokens(tpl: str) -> list[str]:
    words = re.findall(r"[A-Za-z_]{3,}", tpl)
    stop = {
        "the",
        "and",
        "for",
        "with",
        "from",
        "this",
        "that",
        "error",
        "warn",
        "info",
        "failed",
        "failure",
        "request",
        "response",
        "timeout",
        "exception",
    }
    out: list[str] = []
    for w in words:
        lw = w.lower()
        if lw in stop:
            continue
        out.append(lw)
    # 去重但保持相对稳定顺序
    seen: set[str] = set()
    uniq: list[str] = []
    for t in out:
        if t in seen:
            continue
        seen.add(t)
        uniq.append(t)
    return uniq[:12]


def _require_log_insight_product(product_id: int, user: dict[str, Any]) -> sqlite3.Row:
    with db() as conn:
        row = conn.execute(
            """SELECT id, name, allowed_roles, industry_scope
               FROM products WHERE id = ?""",
            (product_id,),
        ).fetchone()
    if (
        row is None
        or row["name"] != LOG_INSIGHT_PRODUCT_NAME
        or not product_visible_for_user(row, user)
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="产品不存在或无权访问")
    return row


def _build_log_insight_analysis(
    logs: list[str],
    top_k: int,
    anomaly_k: int,
    min_cluster_size: int,
) -> LogInsightAnalyzeData:
    cleaned = [str(x).strip() for x in (logs or []) if str(x).strip()]
    templates = [_log_template(x) for x in cleaned]
    pairs = [(raw, tpl) for raw, tpl in zip(cleaned, templates, strict=False) if tpl]
    tpl_counts = Counter([tpl for _raw, tpl in pairs])

    # 聚类：按模板计数
    tpl_examples: dict[str, list[str]] = defaultdict(list)
    for raw, tpl in pairs:
        if len(tpl_examples[tpl]) < 3:
            tpl_examples[tpl].append(raw[:260] if len(raw) > 260 else raw)

    clusters: list[LogInsightClusterOut] = []
    for tpl, c in tpl_counts.most_common():
        if c < min_cluster_size:
            continue
        clusters.append(
            LogInsightClusterOut(
                template=tpl,
                count=int(c),
                examples=tpl_examples.get(tpl, [])[:3],
                tokens=_template_tokens(tpl),
            )
        )
        if len(clusters) >= top_k:
            break

    # 异常：用“稀有模板 + 关键字”做启发式打分（演示用，非生产算法）
    anomaly_keywords = (
        "panic",
        "fatal",
        "segfault",
        "oom",
        "out of memory",
        "connection refused",
        "refused",
        "deadline exceeded",
        "timeout",
        "rate limit",
        "throttl",
        "denied",
        "unauthorized",
        "forbidden",
        "traceback",
        "exception",
        "crash",
        "killed",
        "evicted",
        "disk full",
        "i/o error",
        "broken pipe",
        "504",
        "502",
        "503",
    )

    anomalies_scored: list[tuple[float, LogInsightAnomalyOut]] = []
    total = max(1, len(pairs))
    for raw, tpl in pairs:
        freq = tpl_counts.get(tpl, 0)
        rarity = 1.0 - min(1.0, freq / max(1, int(total * 0.25)))
        low_freq_boost = 1.0 if freq <= 2 else 0.0
        text = raw.lower()
        hits = [k for k in anomaly_keywords if k in text]
        kw_score = min(1.0, 0.22 * len(hits)) if hits else 0.0
        score = max(0.0, 0.55 * rarity + 0.30 * kw_score + 0.15 * low_freq_boost)
        if score <= 0:
            continue
        reason = "稀有模板"
        if hits:
            reason = f"关键字命中：{', '.join(hits[:3])}"
        anomalies_scored.append(
            (
                score,
                LogInsightAnomalyOut(
                    log=raw[:400] if len(raw) > 400 else raw,
                    reason=reason,
                    template=tpl,
                    score=float(round(score * 100, 2)),
                ),
            )
        )

    anomalies_scored.sort(key=lambda x: x[0], reverse=True)
    anomalies = [a for _s, a in anomalies_scored[:anomaly_k]]
    return LogInsightAnalyzeData(
        total=len(cleaned),
        parsed=len(pairs),
        clusters=clusters,
        anomalies=anomalies,
    )


def log_insight_analyze(
    body: LogInsightAnalyzeRequest = Body(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> LogInsightAnalyzeResponse:
    _require_log_insight_product(body.product_id, user)
    data = _build_log_insight_analysis(
        logs=body.logs,
        top_k=body.top_k,
        anomaly_k=body.anomaly_k,
        min_cluster_size=body.min_cluster_size,
    )
    return LogInsightAnalyzeResponse(success=True, data=data)


def _add_priority_api_route(path: str, endpoint: Any, **kwargs: Any) -> None:
    """
    由于 main.py 末尾已有 `/{asset_path:path}` 兜底路由，追加的装饰器路由会被其抢先匹配。
    这里通过“追加后再把 route 插到最前”确保新 API 可用，且不改动任何既有定义顺序。
    """
    app.add_api_route(path, endpoint, **kwargs)
    try:
        route = app.router.routes.pop()
        app.router.routes.insert(0, route)
    except Exception:
        # 回退：即便插入失败，也至少注册了路由（极端情况下会被兜底路由覆盖）
        pass


_add_priority_api_route(
    "/api/log-insight/analyze",
    log_insight_analyze,
    methods=["POST"],
    response_model=LogInsightAnalyzeResponse,
)
