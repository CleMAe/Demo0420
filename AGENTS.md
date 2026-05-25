# AI 开发协作指南

本文件是项目默认提示词，供使用 Codex、Claude Code、Cursor 或类似 AI 编程工具的组员阅读。开始改代码前，请先阅读并遵守这里的约定。

## 项目背景

- 本仓库是一个轻量级智能体 Demo 门户。
- 后端入口：`main.py`
  - FastAPI API
  - SQLite 持久化
  - JWT 登录认证
  - 基于角色的产品可见性控制
  - 产品模块通过 `PRODUCTS_SEED` 初始化
- 前端入口：
  - `login.html`
  - `index.html`
  - `detail.html`
  - `portal-demos.js`
  - `portal-brand.js`
- 产品/模块名称必须以 `main.py` 中 `PRODUCTS_SEED` 的对象名为准。

## 命令环境

- 需要使用特定 Python 包运行命令时，必须通过 `lg` conda 环境执行。
- 推荐格式：

```bash
conda run -n lg python -m compileall main.py
```

- 不要全局安装依赖。
- 不要修改依赖文件，除非当前任务明确要求。

## Git 与 PR 规则

- 不要直接 push 到 `main`。
- 不要对共享分支 force push。
- 每个任务都从最新 `main` 新建功能分支。
- 所有要进入 `main` 的改动都必须通过 pull request。
- 每个 PR 只处理一个清晰的任务。
- 开始编辑前先检查：

```bash
git status -sb
git branch --show-current
```

- 不要覆盖或回滚其他组员的改动，除非对方明确同意。
- 如果本地存在与当前任务无关的改动，保持原样，不要纳入提交。

## 模块归属与冲突规避

- 将 `main.py` 中每个 `PRODUCTS_SEED` 条目视为一个独立模块。
- 不要随意重命名产品名称。产品名称是前端 Demo 注册和展示逻辑中的稳定模块标识。
- 如果修改了 `main.py` 中模块的名称、URL、标签、角色、行业或技术栈，需要同步检查 `portal-demos.js`、`index.html`、`detail.html` 中是否有匹配逻辑需要更新。
- 优先只编辑自己任务对应的模块。
- 避免对共享文件做大范围格式化或无关重构，尤其是：
  - `main.py`
  - `portal-demos.js`
  - `index.html`
  - `detail.html`
- 如果多个组员需要改同一个共享文件，按产品/模块分区拆分修改，并通过 PR 审查合并。

## 后端开发约定

- 初始化数据和迁移逻辑必须保持幂等。
- 除非任务明确涉及权限，否则不要改变现有 RBAC 行为。
- 新增产品字段时，需要同步更新：
  - 数据库 schema 创建逻辑
  - seed 插入逻辑
  - 历史数据回填逻辑
  - API 响应模型
  - 前端消费逻辑
- 尽量保持 API 响应向后兼容。

## 前端开发约定

- 遵循现有静态 HTML/CSS/JS 写法。
- 不要引入前端框架，除非任务明确要求。
- 模块特定的 Demo 行为应放在 `portal-demos.js`。
- 保持导航、筛选、角色可见性和详情页展示一致。
- 功能型 PR 中避免夹带无关视觉重设计。

## 验证清单

打开 PR 前，根据改动类型运行对应检查：

```bash
conda run -n lg python -m compileall main.py
```

- 后端改动：尽量启动 FastAPI 应用，并验证被修改的 API 路径。
- 前端改动：打开相关 HTML 页面，或启动本地服务后验证被修改页面。
- 文档改动：检查 Markdown 渲染效果或至少审阅 diff。

## PR 描述清单

每个 PR 需要说明：

- 改了什么
- 为什么改
- 涉及哪个模块或共享文件
- 做了哪些验证
- 是否有已知风险或后续事项
