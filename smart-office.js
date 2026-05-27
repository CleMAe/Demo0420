(function () {
  var SCENARIOS = [
    {
      key: "expense",
      label: "报销单据",
      sample: "差旅餐费 3200 元，超过标准 12%，未填写招待对象说明，发票齐全。"
    },
    {
      key: "resume",
      label: "简历筛选",
      sample: "候选人 5 年后端经验，但缺少目标行业背景，岗位匹配度一般。"
    },
    {
      key: "tender",
      label: "招标文件",
      sample: "与历史中标方案相似度 18%，未发现明显串标片段，评分项含排他资质要求。"
    },
    {
      key: "contract",
      label: "合同审核",
      sample: "责任上限条款与模板不一致，付款周期 90 天，建议法务复核。"
    }
  ];
  var PRODUCT_NAME = "智能办公智能体";
  var activeScenario = SCENARIOS[0];
  var productId = null;

  function apiBase() {
    if (!window.location.host) return "http://127.0.0.1";
    return "";
  }

  function escapeHtml(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function spinHtml() {
    return (
      '<span class="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" aria-hidden="true"></span>'
    );
  }

  function token() {
    return localStorage.getItem("portal_token");
  }

  function authHeaders() {
    return {
      Authorization: "Bearer " + token(),
      "Content-Type": "application/json"
    };
  }

  function showError(msg) {
    var el = document.getElementById("load-err");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function renderTabs() {
    var root = document.getElementById("scenario-tabs");
    root.innerHTML = SCENARIOS.map(function (item, i) {
      var on = item.key === activeScenario.key;
      return (
        '<button type="button" data-scenario="' + item.key + '" class="rounded-full px-3 py-1 text-xs font-medium ' +
        (on ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200") +
        '">' + escapeHtml(item.label) + "</button>"
      );
    }).join("");
    root.querySelectorAll("[data-scenario]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-scenario");
        SCENARIOS.forEach(function (s) {
          if (s.key === key) activeScenario = s;
        });
        document.getElementById("review-content").value = activeScenario.sample;
        renderTabs();
      });
    });
  }

  function renderList(items, emptyText) {
    var list = Array.isArray(items) ? items : [];
    if (!list.length) return "<li>" + escapeHtml(emptyText) + "</li>";
    return list.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");
  }

  function riskBadgeClass(level) {
    if (level === "高") return "bg-red-50 text-red-700";
    if (level === "中") return "bg-amber-50 text-amber-800";
    return "bg-emerald-50 text-emerald-700";
  }

  function loadConfig() {
    return fetch(apiBase() + "/api/smart-office/config", { headers: authHeaders() })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error((data && data.detail) || "配置加载失败");
          return data;
        });
      })
      .then(function (cfg) {
        var status = document.getElementById("key-status");
        if (cfg.api_key_configured) {
          status.textContent = "API Key 已配置";
          status.className = "rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700";
        } else {
          status.textContent = "API Key 未配置";
          status.className = "rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700";
        }
        document.getElementById("cfg-model").textContent = cfg.model || "—";
        document.getElementById("cfg-base").textContent = cfg.base_url || "—";
        document.getElementById("cfg-hint").textContent = cfg.hint || "";
      });
  }

  function resolveProductId() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    if (id) return Promise.resolve(id);
    return fetch(apiBase() + "/api/products", { headers: authHeaders() })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error((data && data.detail) || "产品列表加载失败");
          return data;
        });
      })
      .then(function (products) {
        for (var i = 0; i < products.length; i++) {
          if (products[i].name === PRODUCT_NAME) return products[i].id;
        }
        throw new Error("未找到「" + PRODUCT_NAME + "」产品或无访问权限");
      });
  }

  function runReview() {
    var content = document.getElementById("review-content").value.trim();
    var out = document.getElementById("review-result");
    var btn = document.getElementById("btn-review");
    out.classList.remove("hidden");
    if (!content) {
      out.className = "mt-4 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700";
      out.textContent = "请先输入待审查内容。";
      return;
    }
    if (!productId) {
      out.className = "mt-4 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700";
      out.textContent = "产品信息未就绪，请刷新页面。";
      return;
    }
    btn.disabled = true;
    btn.innerHTML = spinHtml() + " 审查中";
    out.className = "mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700";
    out.innerHTML =
      '<p class="flex items-center gap-2">' + spinHtml() + " 正在调用 DeepSeek 大模型审查…</p>";
    fetch(apiBase() + "/api/smart-office/review", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        product_id: productId,
        scenario: activeScenario.key,
        content: content
      })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error((data && data.detail) || "审查失败");
          return data;
        });
      })
      .then(function (body) {
        var data = body.data || {};
        var risk = data.risk_level || "中";
        out.className = "mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800";
        out.innerHTML =
          '<div class="flex flex-wrap items-center gap-2">' +
          '<span class="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">' +
          escapeHtml(data.scenario_label || activeScenario.label) + "</span>" +
          '<span class="rounded-lg px-2 py-1 text-xs font-medium ' + riskBadgeClass(risk) + '">风险 ' +
          escapeHtml(risk) + "</span>" +
          '<span class="text-xs text-slate-500">评分 ' + escapeHtml(String(data.score == null ? "--" : data.score)) +
          "/100</span></div>" +
          '<p class="mt-3 font-medium text-slate-900">' + escapeHtml(data.summary || "审查完成") + "</p>" +
          '<p class="mt-4 text-xs font-semibold text-slate-600">风险点</p>' +
          '<ul class="mt-1 list-disc space-y-1 pl-5">' + renderList(data.findings, "暂无显著风险点") + "</ul>" +
          '<p class="mt-4 text-xs font-semibold text-slate-600">处理建议</p>' +
          '<ul class="mt-1 list-disc space-y-1 pl-5">' + renderList(data.suggestions, "按标准流程复核") + "</ul>" +
          '<p class="mt-4 text-xs font-semibold text-slate-600">下一步</p>' +
          '<p class="mt-1 leading-relaxed">' + escapeHtml(data.next_step || "按流程提交复核") + "</p>";
      })
      .catch(function (ex) {
        out.className = "mt-4 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm leading-relaxed text-red-700";
        out.textContent = ex.message || "审查失败，请稍后重试。";
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "开始审查（DeepSeek）";
      });
  }

  function init() {
    if (!token()) {
      window.location.href = "login.html";
      return;
    }
    document.getElementById("btn-logout").addEventListener("click", function () {
      localStorage.removeItem("portal_token");
      localStorage.removeItem("portal_user");
      window.location.href = "login.html";
    });
    document.getElementById("review-content").value = activeScenario.sample;
    renderTabs();
    document.getElementById("btn-review").addEventListener("click", runReview);

    Promise.all([loadConfig(), resolveProductId()])
      .then(function (results) {
        productId = results[1];
      })
      .catch(function (ex) {
        if (ex.message === "unauthorized") return;
        showError(ex.message || "初始化失败");
      });
  }

  init();
})();
