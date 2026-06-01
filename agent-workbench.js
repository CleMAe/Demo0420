(function () {
  var PAGE_ACCENTS = {
    "企业 GPT 助手": { tone: "orange", metricA: "12 个", labelA: "知识域", metricB: "秒级", labelB: "检索响应" },
    "代码 Copilot 企业版": { tone: "orange", metricA: "4 类", labelA: "研发辅助", metricB: "内联", labelB: "补全建议" },
    "合规审查 AI": { tone: "red", metricA: "4 类", labelA: "条款风险", metricB: "逐条", labelB: "引用溯源" },
    "金融研报生成器": { tone: "amber", metricA: "3 档", labelA: "报告篇幅", metricB: "模拟", labelB: "观点生成" },
    "信贷风控模型工作台": { tone: "emerald", metricA: "Top 5", labelA: "特征解释", metricB: "漂移", labelB: "监控预警" },
    "医疗影像辅助诊断": { tone: "sky", metricA: "3 类", labelA: "模拟病例", metricB: "候选框", labelB: "异常提示" },
    "临床路径建议引擎": { tone: "cyan", metricA: "指南", labelA: "路径依据", metricB: "分层", labelB: "风险建议" },
    "DevOps 日志洞察": { tone: "indigo", metricA: "模板", labelA: "日志聚类", metricB: "异常", labelB: "启发式评分" },
    "客服话术优化": { tone: "pink", metricA: "情绪", labelA: "实时判断", metricB: "话术", labelB: "合规推荐" },
    "仅管理员：密钥与模型路由": { tone: "slate", metricA: "脱敏", labelA: "密钥台账", metricB: "路由", labelB: "策略演练" },
    "行业总监专区：战略沙盘": { tone: "teal", metricA: "3 组", labelA: "经营假设", metricB: "实时", labelB: "指标联动" },
    "员工自助：培训陪练": { tone: "violet", metricA: "多轮", labelA: "角色对话", metricB: "评分", labelB: "复盘建议" },
    "问数智能体": { tone: "teal", metricA: "NL", labelA: "自然语言", metricB: "SQL", labelB: "可审计生成" },
    "位置导航智能体": { tone: "lime", metricA: "语义", labelA: "地点检索", metricB: "路径", labelB: "分层规划" },
    "目标检测智能体": { tone: "fuchsia", metricA: "视觉", labelA: "识别计数", metricB: "阈值", labelB: "事件告警" },
    "智能办公智能体": { tone: "sky", metricA: "4 类", labelA: "文档场景", metricB: "结构化", labelB: "审查输出" },
    "智能体问答（长文本）": { tone: "blue", metricA: "长文", labelA: "跨章节问答", metricB: "引用", labelB: "要点追溯" }
  };

  var TONE_CLASS = {
    orange: { bg: "bg-orange-500", text: "text-orange-600", soft: "bg-orange-50 text-orange-700", ring: "ring-orange-500/20", border: "border-orange-200" },
    red: { bg: "bg-red-500", text: "text-red-600", soft: "bg-red-50 text-red-700", ring: "ring-red-500/20", border: "border-red-200" },
    amber: { bg: "bg-amber-500", text: "text-amber-700", soft: "bg-amber-50 text-amber-800", ring: "ring-amber-500/20", border: "border-amber-200" },
    emerald: { bg: "bg-emerald-500", text: "text-emerald-700", soft: "bg-emerald-50 text-emerald-700", ring: "ring-emerald-500/20", border: "border-emerald-200" },
    sky: { bg: "bg-sky-500", text: "text-sky-700", soft: "bg-sky-50 text-sky-700", ring: "ring-sky-500/20", border: "border-sky-200" },
    cyan: { bg: "bg-cyan-500", text: "text-cyan-700", soft: "bg-cyan-50 text-cyan-700", ring: "ring-cyan-500/20", border: "border-cyan-200" },
    indigo: { bg: "bg-indigo-500", text: "text-indigo-700", soft: "bg-indigo-50 text-indigo-700", ring: "ring-indigo-500/20", border: "border-indigo-200" },
    pink: { bg: "bg-pink-500", text: "text-pink-700", soft: "bg-pink-50 text-pink-700", ring: "ring-pink-500/20", border: "border-pink-200" },
    slate: { bg: "bg-slate-900", text: "text-slate-700", soft: "bg-slate-100 text-slate-700", ring: "ring-slate-400/20", border: "border-slate-300" },
    violet: { bg: "bg-violet-500", text: "text-violet-700", soft: "bg-violet-50 text-violet-700", ring: "ring-violet-500/20", border: "border-violet-200" },
    teal: { bg: "bg-teal-500", text: "text-teal-700", soft: "bg-teal-50 text-teal-700", ring: "ring-teal-500/20", border: "border-teal-200" },
    lime: { bg: "bg-lime-500", text: "text-lime-700", soft: "bg-lime-50 text-lime-800", ring: "ring-lime-500/20", border: "border-lime-200" },
    fuchsia: { bg: "bg-fuchsia-500", text: "text-fuchsia-700", soft: "bg-fuchsia-50 text-fuchsia-700", ring: "ring-fuchsia-500/20", border: "border-fuchsia-200" },
    blue: { bg: "bg-blue-500", text: "text-blue-700", soft: "bg-blue-50 text-blue-700", ring: "ring-blue-500/20", border: "border-blue-200" }
  };

  function escapeHtml(value) {
    if (!value) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function apiBase() {
    if (!window.location.host) return "http://127.0.0.1";
    return "";
  }

  function productNameFromPage() {
    var explicit = document.body.getAttribute("data-product-name");
    if (explicit) return explicit;
    var params = new URLSearchParams(window.location.search);
    return params.get("name") || "";
  }

  function splitIntro(text) {
    return String(text || "")
      .split(/\n\n+/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function readUser() {
    try {
      return JSON.parse(localStorage.getItem("portal_user") || "{}");
    } catch (e) {
      return {};
    }
  }

  function renderShell(product) {
    var meta = PAGE_ACCENTS[product.name] || { tone: "orange", metricA: "Demo", labelA: "交互演示", metricB: "RBAC", labelB: "权限可见" };
    var tone = TONE_CLASS[meta.tone] || TONE_CLASS.orange;
    var user = readUser();
    var roleLine = user.username ? escapeHtml(user.username + (user.role ? " · " + user.role : "") + (user.industry ? " · " + user.industry : "")) : "已登录";
    var paragraphs = splitIntro(product.detail_intro || product.description);
    var introHtml = paragraphs.slice(0, 2).map(function (part) {
      return '<p class="text-sm leading-relaxed text-slate-600">' + escapeHtml(part).replace(/\n/g, "<br/>") + "</p>";
    }).join("");

    document.title = product.name + " · 智能体Demo平台";
    document.body.innerHTML =
      '<header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">' +
      '<div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">' +
      '<div class="flex min-w-0 items-center gap-3">' +
      '<a href="index.html" class="shrink-0 text-sm font-medium ' + tone.text + ' hover:opacity-80">← 工作台</a>' +
      '<div class="hidden h-6 w-px bg-slate-200 sm:block"></div>' +
      '<div class="min-w-0">' +
      '<p id="portal-brand-name" class="truncate text-sm font-semibold text-slate-900">智能体Demo平台</p>' +
      '<p class="truncate text-xs text-slate-500">' + roleLine + '</p>' +
      '</div></div>' +
      '<button id="btn-logout" type="button" class="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">退出</button>' +
      '</div></header>' +
      '<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">' +
      '<section class="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_360px]">' +
      '<div class="min-w-0">' +
      '<div class="flex flex-wrap gap-2">' +
      '<span class="rounded-lg px-2.5 py-1 text-xs font-medium ' + tone.soft + '">' + escapeHtml(product.badge || "Demo") + '</span>' +
      '<span class="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">' + escapeHtml(product.industry || "跨行业通用") + '</span>' +
      '<span class="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">' + escapeHtml(product.tech_stack || "") + '</span>' +
      '</div>' +
      '<h1 class="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">' + escapeHtml(product.name) + '</h1>' +
      '<p class="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">' + escapeHtml(product.description || "") + '</p>' +
      '<div class="mt-6 grid gap-3 sm:grid-cols-2">' +
      '<div class="rounded-2xl border ' + tone.border + ' bg-white p-5 shadow-sm">' +
      '<p class="text-2xl font-semibold tracking-tight text-slate-950">' + escapeHtml(meta.metricA) + '</p>' +
      '<p class="mt-1 text-xs font-medium text-slate-500">' + escapeHtml(meta.labelA) + '</p></div>' +
      '<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">' +
      '<p class="text-2xl font-semibold tracking-tight text-slate-950">' + escapeHtml(meta.metricB) + '</p>' +
      '<p class="mt-1 text-xs font-medium text-slate-500">' + escapeHtml(meta.labelB) + '</p></div>' +
      '</div></div>' +
      '<aside class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">' +
      '<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">模块概览</p>' +
      '<div class="mt-4 space-y-3">' + introHtml + '</div>' +
      '<div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">' +
      '<p class="text-xs font-medium text-slate-500">当前页面</p>' +
      '<p class="mt-1 break-all font-mono text-xs text-slate-700">' + escapeHtml(window.location.pathname.replace("/", "") || "index.html") + '</p>' +
      '</div></aside>' +
      '</section>' +
      '<section id="module-demo" class="mt-8"></section>' +
      '</main>';

    document.getElementById("btn-logout").addEventListener("click", function () {
      localStorage.removeItem("portal_token");
      localStorage.removeItem("portal_user");
      window.location.href = "login.html";
    });

    var mount = document.getElementById("module-demo");
    if (window.PortalDemos && typeof window.PortalDemos.mount === "function") {
      window.PortalDemos.mount(mount, product);
    } else {
      mount.innerHTML = '<div class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">交互演示脚本未加载。</div>';
    }
  }

  function boot() {
    var token = localStorage.getItem("portal_token");
    if (!token) {
      window.location.href = "login.html";
      return;
    }
    var expectedName = productNameFromPage();
    if (!expectedName) {
      document.body.innerHTML = '<main class="mx-auto max-w-xl px-4 py-12 text-sm text-red-700">缺少模块名称。</main>';
      return;
    }
    fetch(apiBase() + "/api/products", {
      headers: { Authorization: "Bearer " + token }
    })
      .then(function (res) {
        if (res.status === 401) {
          localStorage.removeItem("portal_token");
          localStorage.removeItem("portal_user");
          window.location.href = "login.html";
          return Promise.reject(new Error("unauthorized"));
        }
        return res.json().then(function (data) {
          if (!res.ok) throw new Error((data && data.detail) || "加载失败");
          return data;
        });
      })
      .then(function (products) {
        var product = (products || []).find(function (item) {
          return item.name === expectedName;
        });
        if (!product) {
          window.location.href = "index.html";
          return;
        }
        return fetch(apiBase() + "/api/products/" + encodeURIComponent(product.id), {
          headers: { Authorization: "Bearer " + token }
        }).then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error((data && data.detail) || "加载失败");
            return data;
          });
        });
      })
      .then(function (product) {
        if (product) renderShell(product);
      })
      .catch(function (ex) {
        if (ex.message === "unauthorized") return;
        document.body.innerHTML = '<main class="mx-auto max-w-xl px-4 py-12 text-sm text-red-700">' + escapeHtml(ex.message || "加载失败") + "</main>";
      });
  }

  boot();
})();
