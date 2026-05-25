"""智能体 Demo 平台 API：SQLite + RBAC + JWT。"""

from __future__ import annotations

import json
import os
import sqlite3

from dotenv import load_dotenv

load_dotenv()
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
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
        "https://example.com/copilot",
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
        "市场数据驱动的报告草稿",
        "https://example.com/fin-report",
        "金融",
        ["ADMIN", "Director", "USER"],
        "金融",
        "大模型与 RAG",
        "金融",
        "将行情、财报要点与内部观点模板组合成研报初稿，支持图表占位与数据来源标注。\n\n"
        "适合研究、资管与投行团队在合规披露框架下加速日报/周报产出，人工复核后再对外发布。",
    ),
    (
        "信贷风控模型工作台",
        "特征工程与模型监控",
        "https://example.com/credit-risk",
        "金融",
        ["ADMIN", "Director"],
        "金融",
        "机器学习与风控建模",
        "金融",
        "提供特征筛选、样本管理与模型版本对比，监控线上分箱漂移与拒绝率异常。\n\n"
        "面向信贷审批与贷后管理场景，帮助风控团队与建模团队协作，满足内部模型治理要求。",
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
        "可对接院内 PACS 的只读副本做离线分析，强调人机协同与最终诊断由执业医师负责。",
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
