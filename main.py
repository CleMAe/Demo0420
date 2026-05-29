"""智能体 Demo 平台 API：SQLite + RBAC + JWT。"""

from __future__ import annotations

import json
import os
import sqlite3
import urllib.error
import urllib.request

from dotenv import load_dotenv

load_dotenv()
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
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
CLINICAL_PATHWAY_PRODUCT_NAME = "临床路径建议引擎"
PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_ASSETS = {
    "": "index.html",
    "index.html": "index.html",
    "login.html": "login.html",
    "detail.html": "detail.html",
    "portal-brand.js": "portal-brand.js",
    "portal-demos.js": "portal-demos.js",
}
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

security = HTTPBearer(auto_error=False)

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
        "https://example.com/gpt-assistant",
        "通用",
        ["ADMIN", "Director", "USER"],
        None,
        "大模型与 RAG",
        "跨行业通用",
        "面向企业内部的检索增强生成（RAG）场景，将分散在制度、工单与项目文档中的知识统一索引。\n\n"
        "支持按部门与角色配置可见范围，回答附带引用片段便于核对；适合人力、法务、运营等多条线降低重复答疑成本，并可与现有 IM 或门户集成。",
    ),
    (
        "代码 Copilot 企业版",
        "IDE 内联补全与评审建议",
        "copilot.html",
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
        "https://example.com/compliance",
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
        "#fin-report-demo",
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
        "#credit-risk-demo",
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
        "https://example.com/med-imaging",
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
        "https://example.com/clinical-path",
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
        "https://example.com/log-insight",
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
        "https://example.com/cx-bot",
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
        "https://example.com/admin-router",
        "管理",
        ["ADMIN"],
        None,
        "智能体编排与网关",
        "管理战略",
        "集中托管大模型与第三方 API 的密钥、配额与路由策略，按应用与部门隔离调用。\n\n"
        "提供审计日志与紧急熔断能力，适合平台管理员统一治理成本与安全边界。",
    ),
    (
        "行业总监专区：战略沙盘",
        "多部门指标模拟（演示）",
        "https://example.com/director-sandbox",
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
        "https://example.com/train-bot",
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
        "",
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
        "https://example.com/navigation-agent",
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
        "https://example.com/object-detection-agent",
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
        "https://example.com/smart-office-agent",
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
        "https://example.com/long-context-qa-agent",
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
        conn.execute(
            "UPDATE products SET url = ? WHERE name = ?",
            ("", "问数智能体"),
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
