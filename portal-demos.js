/**
 * 详情页交互演示沙箱：纯前端模拟，与门户 Tailwind 风格一致。
 * 按产品 name 精确匹配；否则按 tech_stack 回退。
 */
(function () {
  function escapeHtml(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shell(title, innerHtml) {
    return (
      '<div class="mt-10 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-1">' +
      '<div class="rounded-xl bg-white p-5 shadow-sm sm:p-6">' +
      '<div class="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">' +
      '<div class="min-w-0">' +
      '<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">交互演示</p>' +
      '<h2 class="mt-1 text-lg font-semibold tracking-tight text-slate-900">' +
      escapeHtml(title) +
      "</h2>" +
      '<p class="mt-1 text-xs leading-relaxed text-slate-500">以下为前端模拟数据与流程，用于场景化预览，不代表线上真实模型与接口。</p>' +
      "</div>" +
      '<span class="shrink-0 rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">模拟沙箱</span>' +
      "</div>" +
      innerHtml +
      "</div></div>"
    );
  }

  function spinHtml() {
    return (
      '<span class="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" aria-hidden="true"></span>'
    );
  }

  function bind(root, selector, event, handler) {
    var el = root.querySelector(selector);
    if (el) el.addEventListener(event, handler);
  }

  function apiBase() {
    if (!window.location.host) return "http://127.0.0.1";
    return "";
  }

  function authHeaders(extra) {
    var headers = extra || {};
    var token = localStorage.getItem("portal_token");
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  // --- 按产品名称 ---

  function demoEnterpriseGpt(root, product) {
    root.innerHTML = shell("内部知识库问答与文档摘要", (
      '<p class="text-sm leading-relaxed text-slate-600">' +
      '面向企业内部的检索增强生成（RAG）场景，将分散在<strong class="text-slate-800">制度、工单与项目文档</strong>中的知识统一索引。' +
      '演示知识库来自 <code class="rounded bg-slate-100 px-1 text-xs">docs/员工手册.md</code>，回答附带引用片段便于核对。' +
      "</p>" +
      '<div class="mt-4 flex flex-wrap gap-2 text-xs" data-slot="sources"></div>' +
      '<div class="mt-4">' +
      '<label class="text-xs font-medium text-slate-600">知识条线</label>' +
      '<select data-field="line" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:max-w-md">' +
      "<option>人力 · 制度与休假</option>" +
      "<option>法务 · 保密与合规</option>" +
      "<option>运营 · 流程与报销</option>" +
      "</select></div>" +
      '<label class="mt-4 block text-xs font-medium text-slate-600">向内部知识库提问</label>' +
      '<div class="mt-1 flex flex-wrap gap-2" data-slot="presets"></div>' +
      '<div class="mt-2 flex flex-col gap-2 sm:flex-row">' +
      '<input type="text" data-field="q" placeholder="输入问题，例如：新员工如何申请年假？" ' +
      'class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none ring-orange-500/20 transition focus:border-orange-500 focus:bg-white focus:ring-4" />' +
      '<button type="button" data-action="ask" ' +
      'class="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300">' +
      "检索问答" +
      "</button></div>" +
      '<div data-slot="out" class="hidden rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700"></div>' +
      "</div>"
    ));

    function apiBase() {
      if (!window.location.host) return "http://127.0.0.1";
      return "";
    }

    var state = {
      presetQuestions: [
        "新员工如何申请年假？",
        "差旅报销要在多久内提交？",
        "员工能否把内部文档上传到外部大模型？"
      ],
      handbookAvailable: true
    };

    function renderCitationPanel(label, body) {
      return (
        '<details class="mt-2 rounded-lg border border-amber-200 bg-amber-50/80">' +
        '<summary class="cursor-pointer px-3 py-2 text-xs font-medium text-amber-900">' +
        escapeHtml(label) +
        "</summary>" +
        '<pre class="whitespace-pre-wrap border-t border-amber-200/80 px-3 py-2 font-sans text-xs leading-relaxed text-amber-950">' +
        escapeHtml(body) +
        "</pre></details>"
      );
    }

    function renderSourceTags(sources) {
      var slot = root.querySelector("[data-slot=\"sources\"]");
      if (!slot) return;
      var list = Array.isArray(sources) ? sources : [];
      if (!list.length) {
        slot.innerHTML = '<span class="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-600">制度 · 员工手册.md</span>';
        return;
      }
      slot.innerHTML = list.map(function (item) {
        return (
          '<span class="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-600">' +
          escapeHtml(item.label || "") +
          "</span>"
        );
      }).join("");
    }

    function renderPresetButtons() {
      var slot = root.querySelector("[data-slot=\"presets\"]");
      if (!slot) return;
      var labels = ["年假申请", "差旅报销", "保密义务"];
      slot.innerHTML = state.presetQuestions.map(function (q, index) {
        return (
          '<button type="button" data-preset="' + escapeHtml(q) + '" ' +
          'class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition hover:border-orange-300 hover:text-orange-700">' +
          escapeHtml(labels[index] || ("预设 " + (index + 1))) +
          "</button>"
        );
      }).join("");
      slot.querySelectorAll("[data-preset]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var inp = root.querySelector("[data-field=\"q\"]");
          if (inp) inp.value = btn.getAttribute("data-preset") || "";
        });
      });
    }

    function renderAnswer(data) {
      var citations = (data && data.citations) || [];
      var cites = citations.map(function (item) {
        if (!item || !item.title) return "";
        return renderCitationPanel(item.title, item.excerpt || "");
      }).join("");
      return (
        '<p class="font-medium text-slate-900">摘要回答</p>' +
        '<p class="mt-2 text-sm leading-relaxed text-slate-700">' + escapeHtml(data.summary || "") + "</p>" +
        '<p class="mt-3 text-xs text-slate-500">可见范围：' + escapeHtml(data.visibility_role || "") +
        " · 知识条线：" + escapeHtml(data.knowledge_line || "") + "</p>" +
        '<div class="mt-3">' + cites + "</div>" +
        '<p class="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">' +
        "可与现有 IM 或门户集成推送回答（演示占位）。问题：" + escapeHtml(data.question || "") +
        "</p>"
      );
    }

    function loadSources() {
      var token = localStorage.getItem("portal_token");
      var productId = product && product.id;
      if (!token || !productId) {
        renderSourceTags([]);
        renderPresetButtons();
        return Promise.resolve();
      }
      return fetch(apiBase() + "/api/enterprise-gpt/sources?product_id=" + encodeURIComponent(productId), {
        headers: { "Authorization": "Bearer " + token }
      })
        .then(function (res) {
          return res.json().then(function (body) {
            if (!res.ok) throw new Error((body && body.detail) || "加载知识库失败");
            return body;
          });
        })
        .then(function (body) {
          var data = body.data || {};
          if (Array.isArray(data.preset_questions) && data.preset_questions.length) {
            state.presetQuestions = data.preset_questions;
          }
          state.handbookAvailable = data.handbook_available !== false;
          renderSourceTags(data.sources || []);
          renderPresetButtons();
          var inp = root.querySelector("[data-field=\"q\"]");
          if (inp && !inp.value && state.presetQuestions[0]) {
            inp.value = state.presetQuestions[0];
          }
        })
        .catch(function () {
          renderSourceTags([]);
          renderPresetButtons();
        });
    }

    bind(root, "[data-action=\"ask\"]", "click", function () {
      var inp = root.querySelector("[data-field=\"q\"]");
      var out = root.querySelector("[data-slot=\"out\"]");
      var btn = root.querySelector("[data-action=\"ask\"]");
      var lineEl = root.querySelector("[data-field=\"line\"]");
      var token = localStorage.getItem("portal_token");
      var q = inp ? inp.value.trim() : "";
      var knowledgeLine = lineEl ? lineEl.value : "";

      out.classList.remove("hidden");
      if (!q) {
        out.innerHTML = '<p class="text-sm text-red-700">请输入问题或选择上方快捷问题。</p>';
        return;
      }
      if (!token || !(product && product.id)) {
        out.innerHTML = '<p class="text-sm text-red-700">未登录或缺少产品信息，无法调用问答接口。</p>';
        return;
      }
      if (!state.handbookAvailable) {
        out.innerHTML = '<p class="text-sm text-red-700">员工手册知识库文件不可用，请检查服务端 docs/员工手册.md 是否已部署。</p>';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = spinHtml() + " 检索中";
      out.innerHTML = '<p class="flex items-center gap-2 text-xs text-slate-500">' + spinHtml() + " 正在检索 docs/员工手册.md…</p>";

      fetch(apiBase() + "/api/enterprise-gpt/ask", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          product_id: product.id,
          question: q,
          knowledge_line: knowledgeLine
        })
      })
        .then(function (res) {
          return res.json().then(function (body) {
            if (!res.ok) throw new Error((body && body.detail) || "检索失败");
            return body;
          });
        })
        .then(function (body) {
          out.innerHTML = renderAnswer(body.data || {});
        })
        .catch(function (ex) {
          out.innerHTML = '<p class="text-sm text-red-700">' + escapeHtml(ex.message || "检索失败，请稍后重试。") + "</p>";
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "检索问答";
        });
    });

    loadSources();
  }

  function demoCopilot(root) {
    root.innerHTML = shell("IDE 内联补全（模拟）", (
      '<div class="rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs text-slate-100">' +
      "<pre class=\"whitespace-pre-wrap\">def fetch_user(uid: str) -&gt; dict:\n" +
      "    \"\"\"从缓存读取用户\"\"\"\n" +
      "    key = f\"user:{uid}\"\n" +
      "<span data-slot=\"ghost\" class=\"text-slate-500\"></span></pre>" +
      '<button type="button" data-action="complete" class="mt-3 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600">' +
      "生成补全" +
      "</button></div>"
    ));
    bind(root, "[data-action=\"complete\"]", "click", function () {
      var g = root.querySelector("[data-slot=\"ghost\"]");
      g.textContent = "    return cache.get(key) or load_from_db(uid)";
      g.className = "text-emerald-400/90";
    });
  }

  function demoCompliance(root, product) {
    root.innerHTML = shell("条款风险初筛", (
      '<p class="text-sm leading-relaxed text-slate-600">' +
      '对<strong class="text-slate-800">合同、采购与对外承诺</strong>类文档进行条款级扫描，' +
      '提示偏离模板的表述与常见风险点。演示条款库来自 <code class="rounded bg-slate-100 px-1 text-xs">docs/compliance.md</code>，' +
      '不替代律师结论，但可显著缩短初筛时间。' +
      "</p>" +
      '<div class="mt-4 flex flex-wrap gap-2 text-xs" data-slot="sources"></div>' +
      '<div class="mt-4 grid gap-4 sm:grid-cols-2">' +
      '<div><label class="text-xs font-medium text-slate-600">条款类别</label>' +
      '<select data-field="category" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">' +
      "<option>合同</option>" +
      "<option>采购</option>" +
      "<option>对外承诺</option>" +
      "</select></div>" +
      '<div><label class="text-xs font-medium text-slate-600">扫描模式</label>' +
      '<select data-field="mode" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">' +
      "<option>演示样例（3 条）</option>" +
      "<option>自定义粘贴</option>" +
      "</select></div></div>" +
      '<div data-slot="samples" class="mt-4 space-y-3"></div>' +
      '<div data-slot="custom" class="mt-4 hidden">' +
      '<label class="text-xs font-medium text-slate-600">粘贴待扫描条款（每行一条）</label>' +
      '<textarea data-field="custom-clauses" rows="5" class="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none ring-orange-500/20 transition focus:border-orange-500 focus:ring-4"></textarea>' +
      "</div>" +
      '<button type="button" data-action="scan" class="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300">' +
      "运行条款扫描" +
      "</button>" +
      '<div data-slot="out" class="hidden rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700"></div>' +
      '<p data-slot="disclaimer" class="mt-3 text-xs leading-relaxed text-slate-500"></p>'
    ));

    function apiBase() {
      if (!window.location.host) return "http://127.0.0.1";
      return "";
    }

    var state = {
      samples: [],
      disclaimer: "本演示数据不构成法律意见，正式使用前须经法务及合规部门复核。"
    };

    function renderSourceTags(categories) {
      var slot = root.querySelector("[data-slot=\"sources\"]");
      if (!slot) return;
      var list = Array.isArray(categories) ? categories : [];
      if (!list.length) {
        slot.innerHTML = '<span class="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-600">条款库 · compliance.md</span>';
        return;
      }
      slot.innerHTML = list.map(function (item) {
        return (
          '<span class="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-600">' +
          escapeHtml(item.label) + " · " + escapeHtml(String(item.risky_count)) + " 有风险 / " +
          escapeHtml(String(item.safe_count)) + " 无风险" +
          "</span>"
        );
      }).join("");
    }

    function renderSampleClauses() {
      var slot = root.querySelector("[data-slot=\"samples\"]");
      if (!slot) return;
      if (!state.samples.length) {
        slot.innerHTML = '<p class="text-xs text-slate-500">正在加载演示样例…</p>';
        return;
      }
      slot.innerHTML = state.samples.map(function (item, index) {
        return (
          '<div class="rounded-xl border border-slate-200 bg-white p-3" data-sample-index="' + index + '">' +
          '<p class="text-xs font-medium text-slate-500">' + escapeHtml(item.clause_id || ("样例-" + (index + 1))) +
          " · " + escapeHtml(item.title || "待扫描条款") + "</p>" +
          '<p class="mt-1 text-sm leading-relaxed text-slate-700">' + escapeHtml(item.text || "") + "</p>" +
          "</div>"
        );
      }).join("");
    }

    function renderCitationPanel(label, body) {
      return (
        '<details class="mt-2 rounded-lg border border-amber-200 bg-amber-50/80">' +
        '<summary class="cursor-pointer px-3 py-2 text-xs font-medium text-amber-900">' +
        escapeHtml(label) +
        "</summary>" +
        '<pre class="whitespace-pre-wrap border-t border-amber-200/80 px-3 py-2 font-sans text-xs leading-relaxed text-amber-950">' +
        escapeHtml(body) +
        "</pre></details>"
      );
    }

    function riskBadgeClass(level) {
      if (level === "无风险") return "bg-emerald-50 text-emerald-700";
      if (level === "待复核") return "bg-amber-50 text-amber-800";
      return "bg-red-50 text-red-700";
    }

    function renderScanResults(data) {
      var results = (data && data.results) || [];
      var summary =
        '<p class="font-medium text-slate-900">扫描摘要 · ' + escapeHtml(data.category || "") + "</p>" +
        '<p class="mt-2 text-sm text-slate-600">有风险 ' + escapeHtml(String(data.risky_count || 0)) +
        " 条 · 无风险 " + escapeHtml(String(data.safe_count || 0)) +
        " 条 · 待复核 " + escapeHtml(String(data.review_count || 0)) + " 条</p>";

      var items = results.map(function (item, index) {
        var tags = Array.isArray(item.risk_tags) ? item.risk_tags : [];
        var tagHtml = tags.map(function (tag) {
          return '<span class="mr-1 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">' +
            escapeHtml(tag) + "</span>";
        }).join("");
        var citation = item.citation_title && item.citation_excerpt
          ? renderCitationPanel(item.citation_title, item.citation_excerpt)
          : "";
        return (
          '<div class="mt-3 rounded-xl border border-slate-200 bg-white p-3">' +
          '<div class="flex flex-wrap items-center gap-2">' +
          '<span class="text-xs font-medium text-slate-500">条款 ' + (index + 1) + "</span>" +
          '<span class="inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ' + riskBadgeClass(item.risk_level) + '">' +
          escapeHtml(item.risk_level || "待复核") + "</span>" +
          (item.matched_clause_id ? '<span class="text-xs text-slate-500">' + escapeHtml(item.matched_clause_id) + "</span>" : "") +
          "</div>" +
          '<p class="mt-2 text-sm leading-relaxed text-slate-700">' + escapeHtml(item.input_text || "") + "</p>" +
          '<p class="mt-2 text-xs font-medium text-slate-600">' + escapeHtml(item.risk_summary || "") + "</p>" +
          (tagHtml ? '<div class="mt-2">' + tagHtml + "</div>" : "") +
          citation +
          "</div>"
        );
      }).join("");

      return summary + items +
        '<p class="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">' +
        escapeHtml(data.disclaimer || state.disclaimer) +
        "</p>";
    }

    function loadSources(category) {
      var token = localStorage.getItem("portal_token");
      var productId = product && product.id;
      if (!token || !productId) {
        renderSampleClauses();
        return Promise.resolve();
      }
      var query = "?product_id=" + encodeURIComponent(productId) +
        "&category=" + encodeURIComponent(category || "合同");
      return fetch(apiBase() + "/api/compliance/sources" + query, {
        headers: { "Authorization": "Bearer " + token }
      })
        .then(function (res) {
          return res.json().then(function (body) {
            if (!res.ok) throw new Error((body && body.detail) || "加载条款库失败");
            return body;
          });
        })
        .then(function (body) {
          var data = body.data || {};
          state.samples = data.preset_samples || [];
          state.disclaimer = data.disclaimer || state.disclaimer;
          renderSourceTags(data.categories || []);
          renderSampleClauses();
          var disclaimerEl = root.querySelector("[data-slot=\"disclaimer\"]");
          if (disclaimerEl) disclaimerEl.textContent = state.disclaimer;
        })
        .catch(function () {
          renderSourceTags([]);
          state.samples = [
            {
              clause_id: "合同-001",
              title: "单方调价权过宽",
              text: "甲方可在不事先通知的情况下，根据市场情况单方面调整本协议项下全部服务价格，乙方不得以此为由拒绝继续履行或要求解除协议。"
            },
            {
              clause_id: "合同-002",
              title: "不可抗力责任不对等",
              text: "因不可抗力导致本协议无法履行的，乙方对由此给甲方造成的全部直接及间接损失承担赔偿责任，甲方不承担任何补偿义务。"
            },
            {
              clause_id: "合同-003",
              title: "管辖条款单方指定",
              text: "因本协议产生的任何争议，均应提交甲方注册地人民法院专属管辖，乙方放弃对管辖法院提出异议的权利。"
            }
          ];
          renderSampleClauses();
        });
    }

    function collectClauses() {
      var modeEl = root.querySelector("[data-field=\"mode\"]");
      var mode = modeEl ? modeEl.value : "演示样例（3 条）";
      if (mode === "自定义粘贴") {
        var textarea = root.querySelector("[data-field=\"custom-clauses\"]");
        var raw = textarea ? textarea.value : "";
        return raw.split(/\n+/).map(function (line) { return line.trim(); }).filter(Boolean);
      }
      return state.samples.map(function (item) { return item.text; }).filter(Boolean);
    }

    bind(root, "[data-field=\"category\"]", "change", function () {
      var categoryEl = root.querySelector("[data-field=\"category\"]");
      loadSources(categoryEl ? categoryEl.value : "合同");
    });

    bind(root, "[data-field=\"mode\"]", "change", function () {
      var modeEl = root.querySelector("[data-field=\"mode\"]");
      var custom = root.querySelector("[data-slot=\"custom\"]");
      var samples = root.querySelector("[data-slot=\"samples\"]");
      var isCustom = modeEl && modeEl.value === "自定义粘贴";
      if (custom) custom.classList.toggle("hidden", !isCustom);
      if (samples) samples.classList.toggle("hidden", isCustom);
    });

    bind(root, "[data-action=\"scan\"]", "click", function () {
      var out = root.querySelector("[data-slot=\"out\"]");
      var btn = root.querySelector("[data-action=\"scan\"]");
      var categoryEl = root.querySelector("[data-field=\"category\"]");
      var token = localStorage.getItem("portal_token");
      var clauses = collectClauses();
      var category = categoryEl ? categoryEl.value : "合同";

      out.classList.remove("hidden");
      if (!clauses.length) {
        out.innerHTML = '<p class="text-sm text-red-700">请先选择演示样例或粘贴待扫描条款。</p>';
        return;
      }
      if (!token || !(product && product.id)) {
        out.innerHTML = '<p class="text-sm text-red-700">未登录或缺少产品信息，无法调用扫描接口。</p>';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = spinHtml() + " 扫描中";
      out.innerHTML = '<p class="flex items-center gap-2 text-xs text-slate-500">' + spinHtml() + " 正在匹配 docs/compliance.md 条款库…</p>";

      fetch(apiBase() + "/api/compliance/scan", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          product_id: product.id,
          category: category,
          clauses: clauses
        })
      })
        .then(function (res) {
          return res.json().then(function (body) {
            if (!res.ok) throw new Error((body && body.detail) || "扫描失败");
            return body;
          });
        })
        .then(function (body) {
          out.innerHTML = renderScanResults(body.data || {});
        })
        .catch(function (ex) {
          out.innerHTML = '<p class="text-sm text-red-700">' + escapeHtml(ex.message || "扫描失败，请稍后重试。") + "</p>";
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "运行条款扫描";
        });
    });

    loadSources("合同");
  }

  function demoFinReport(root) {
    root.innerHTML = shell("金融研报生成器（模拟 Demo）", (
      '<div class="grid gap-4 sm:grid-cols-3">' +
      '<div><label class="text-xs font-medium text-slate-600">主题</label>' +
      '<select data-field="topic" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">' +
      "<option>消费电子 · 季度景气</option>" +
      "<option>银行板块 · 息差展望</option>" +
      "<option>新能源 · 出海趋势</option>" +
      "<option>医药生物 · 创新管线</option>" +
      "</select></div>" +
      '<div><label class="text-xs font-medium text-slate-600">行业</label>' +
      '<select data-field="industry" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">' +
      "<option>消费电子</option>" +
      "<option>银行</option>" +
      "<option>新能源</option>" +
      "<option>医药生物</option>" +
      "</select></div>" +
      '<div><label class="text-xs font-medium text-slate-600">篇幅</label>' +
      '<select data-field="len" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">' +
      "<option>简版（3 段）</option>" +
      "<option>标准（6 段）</option>" +
      "<option>详细（10 段）</option>" +
      "</select></div></div>" +
      '<button type="button" data-action="gen" class="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">生成模拟草稿</button>' +
      '<div data-slot="doc" class="mt-4 hidden space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"></div>'
    ));
    bind(root, "[data-action=\"gen\"]", "click", function () {
      var doc = root.querySelector("[data-slot=\"doc\"]");
      var topic = root.querySelector("[data-field=\"topic\"]").value;
      var ind = root.querySelector("[data-field=\"industry\"]").value;
      var isLong = root.querySelector("[data-field=\"len\"]").value.indexOf("详细") >= 0;
      doc.classList.remove("hidden");
      doc.innerHTML = '<div class="flex items-center gap-2 text-xs text-slate-500"><div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-orange-500"></div>生成中…</div>';
      setTimeout(function () {
        var extra = isLong ? (
          '<p class="mt-3 rounded border-l-4 border-slate-300 bg-white py-2 pl-3 pr-2">' +
          '<span class="font-medium text-slate-900">[模拟段落 1 · 行业综述]</span><br>' +
          escapeHtml(ind) + "行业在报告期内保持稳健增长，头部企业集中度进一步提升。渠道库存水平回归健康区间，" +
          "成本端原材料价格回落为毛利改善提供了空间。展望下半年，需求端有望受政策与新品周期双重驱动。" +
          '</p>' +
          '<p class="mt-2 rounded border-l-4 border-slate-300 bg-white py-2 pl-3 pr-2">' +
          '<span class="font-medium text-slate-900">[模拟段落 2 · 竞争格局]</span><br>' +
          "市场集中度 CR3 约 42%（模拟），较去年同期提升 3 个百分点。头部企业在研发投入与渠道下沉方面持续加大力度，" +
          "中小厂商面临份额挤压。差异化竞争主要集中在产品定义、定价策略与售后服务三个维度。" +
          '</p>' +
          '<p class="mt-2 rounded border-l-4 border-slate-300 bg-white py-2 pl-3 pr-2">' +
          '<span class="font-medium text-slate-900">[模拟段落 3 · 风险与展望]</span><br>' +
          "需关注地缘政治对供应链的潜在扰动，以及终端需求复苏节奏不及预期的下行风险。海外关税政策调整可能影响出口业务毛利率。" +
          "建议维持标配评级，关注季度出货量拐点信号。" +
          '</p>'
        ) : (
          '<p class="mt-2">行业整体景气度温和回升，头部企业受益于成本改善与结构升级，盈利能力环比改善。' +
          "竞争格局方面集中度持续提升，尾部产能出清加速。" +
          "中期需关注海外需求韧性与汇率波动对出口业务的影响。</p>"
        );
        doc.innerHTML =
          '<div class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">' +
          '⚠ 模拟演示数据，不构成投资建议。所有数字与观点为 AI 模拟生成，仅供参考。' +
          '</div>' +
          '<p class="text-base font-semibold text-slate-900">' + escapeHtml(topic) + " · 模拟研报摘要</p>" +
          '<div><span class="font-medium text-slate-900">核心观点</span>' +
          '<p class="mt-1">需求端温和复苏，渠道库存回到健康区间；成本端原材料价格回落改善毛利空间。' +
          "行业集中度持续提升，头部企业有望进一步扩大份额。</p></div>" +
          '<div><span class="font-medium text-slate-900">关键数据占位</span>' +
          '<div class="mt-1 flex flex-wrap gap-2">' +
          '<span class="rounded bg-white px-2 py-0.5 font-mono text-xs text-slate-500">[图表: 营收同比增速]</span>' +
          '<span class="rounded bg-white px-2 py-0.5 font-mono text-xs text-slate-500">[表: 分业务毛利率对比]</span>' +
          '<span class="rounded bg-white px-2 py-0.5 font-mono text-xs text-slate-500">[图: 市场份额变化]</span>' +
          '<span class="rounded bg-white px-2 py-0.5 font-mono text-xs text-slate-500">[表: 期间费用率]</span>' +
          "</div></div>" +
          '<div><span class="font-medium text-red-700">风险提示</span>' +
          '<p class="mt-1">地缘政治扰动可能影响供应链稳定性；终端需求复苏节奏存在不确定性；' +
          "原材料价格若反弹将侵蚀毛利改善空间。</p></div>" +
          '<div><span class="font-medium text-orange-700">合规提示</span>' +
          '<p class="mt-1">本报告为 AI 模拟生成草稿，不构成投资建议。数据来源标注：Wind 样本区间 2019–2026（模拟）。' +
          "未经人工复核与合规审核，不得作为投资决策依据。</p></div>" +
          '<div class="border-t border-slate-200 pt-3">' +
          '<span class="font-medium text-slate-900">模拟研报段落</span>' +
          extra +
          "</div>";
      }, 800);
    });
  }

  function demoCreditRisk(root) {
    root.innerHTML = shell("信贷风控模型工作台（模拟 Demo）", (
      '<div class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 mb-4">' +
      '⚠ 演示用途，不用于真实信贷审批。所有评分与建议为模拟数据。' +
      '</div>' +
      '<div class="grid gap-4 lg:grid-cols-2">' +
      '<div class="rounded-xl border border-slate-200 bg-white p-4">' +
      '<p class="text-xs font-medium text-slate-600 mb-2">模拟客户画像</p>' +
      '<div class="grid grid-cols-2 gap-3">' +
      '<div><label class="text-[11px] text-slate-500">年龄</label>' +
      '<select data-field="age" class="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">' +
      "<option>25-35</option><option>36-45</option><option>46-55</option><option>55+</option>" +
      "</select></div>" +
      '<div><label class="text-[11px] text-slate-500">收入水平</label>' +
      '<select data-field="income" class="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">' +
      "<option>低（< 5K）</option><option>中（5K-15K）</option><option>高（> 15K）</option>" +
      "</select></div>" +
      '<div><label class="text-[11px] text-slate-500">职业类型</label>' +
      '<select data-field="job" class="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">' +
      "<option>稳定（公务员/国企）</option><option>一般（私企职员）</option><option>灵活（自由职业）</option>" +
      "</select></div>" +
      '<div><label class="text-[11px] text-slate-500">贷款用途</label>' +
      '<select data-field="purpose" class="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">' +
      "<option>消费贷</option><option>房贷</option><option>经营贷</option>" +
      "</select></div>" +
      "</div>" +
      '<button type="button" data-action="score" class="mt-3 w-full rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">模拟评分</button>' +
      "</div>" +
      '<div class="rounded-xl border border-slate-200 bg-white p-4">' +
      '<p class="text-xs font-medium text-slate-600 mb-2">风险评估结果</p>' +
      '<div data-slot="result" class="text-xs text-slate-400">点击「模拟评分」查看结果</div>' +
      "</div>" +
      "</div>" +
      '<div class="mt-4 grid gap-4 lg:grid-cols-2">' +
      '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">' +
      '<p class="text-xs font-medium text-slate-600">特征重要性（Top 5）</p>' +
      '<div data-bars class="mt-2 space-y-2"></div>' +
      '<p class="mt-2 text-[10px] text-slate-400">基于模拟样本的 SHAP 值计算，仅供参考</p>' +
      "</div>" +
      '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">' +
      '<p class="text-xs font-medium text-slate-600">模型漂移监控</p>' +
      '<div class="mt-3 space-y-2">' +
      '<div class="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">' +
      '<span class="text-slate-600">PSI（群体稳定性）</span>' +
      '<span data-slot="psi" class="font-medium text-emerald-600">0.02（正常）</span></div>' +
      '<div class="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">' +
      '<span class="text-slate-600">分箱漂移</span>' +
      '<span data-slot="drift" class="font-medium text-emerald-600">正常</span></div>' +
      '<div class="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">' +
      '<span class="text-slate-600">拒绝率</span>' +
      '<span data-slot="reject" class="font-medium text-emerald-600">12.3%（基线）</span></div>' +
      "</div>" +
      '<button type="button" data-action="simulate" class="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">' +
      "模拟异常注入 / 漂移预警" +
      "</button>" +
      '<p data-slot="alert" class="mt-2 hidden rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"></p>' +
      "</div>" +
      "</div>"
    ));
    var feats = [
      { n: "近 6 月逾期次数", v: 92 },
      { n: "负债收入比", v: 78 },
      { n: "征信查询次数", v: 65 },
      { n: "额度使用率", v: 54 },
      { n: "职业稳定性评分", v: 41 }
    ];
    var bars = root.querySelector("[data-bars]");
    bars.innerHTML = feats.map(function (f) {
      return (
        '<div class="flex w-full items-center gap-2 text-xs">' +
        '<span class="w-28 shrink-0 truncate text-slate-600" title="' + escapeHtml(f.n) + '">' + escapeHtml(f.n) + "</span>" +
        '<span class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">' +
        '<span class="block h-full rounded-full bg-orange-500" style="width:' + f.v + '%"></span></span>' +
        "<span class=\"w-8 text-right text-slate-500\">" + f.v + "%</span></div>"
      );
    }).join("");
    var driftStates = [
      { psi: "0.02（正常）", drift: "正常", reject: "12.3%（基线）", psiCls: "text-emerald-600", driftCls: "text-emerald-600", rejectCls: "text-emerald-600", alert: null },
      { psi: "0.08（关注）", drift: "近端偏移 +0.12", reject: "15.7%（上升）", psiCls: "text-amber-600", driftCls: "text-amber-600", rejectCls: "text-amber-600", alert: "⚠ 漂移预警：PSI 超过 0.05 阈值，建议检查近期客群结构与特征分布变化。" },
      { psi: "0.18（告警）", drift: "显著偏移 +0.31", reject: "21.4%（偏高）", psiCls: "text-red-600", driftCls: "text-red-600", rejectCls: "text-red-600", alert: "🚨 严重告警：PSI 超过 0.15 红线，模型需立即重训练。拒绝率异常攀升，建议暂停自动审批。" }
    ];
    var driftIdx = 0;
    bind(root, "[data-action=\"simulate\"]", "click", function () {
      driftIdx = (driftIdx + 1) % driftStates.length;
      var s = driftStates[driftIdx];
      root.querySelector("[data-slot=\"psi\"]").className = "font-medium " + s.psiCls;
      root.querySelector("[data-slot=\"psi\"]").textContent = s.psi;
      root.querySelector("[data-slot=\"drift\"]").className = "font-medium " + s.driftCls;
      root.querySelector("[data-slot=\"drift\"]").textContent = s.drift;
      root.querySelector("[data-slot=\"reject\"]").className = "font-medium " + s.rejectCls;
      root.querySelector("[data-slot=\"reject\"]").textContent = s.reject;
      var alertEl = root.querySelector("[data-slot=\"alert\"]");
      if (s.alert) {
        alertEl.classList.remove("hidden");
        alertEl.textContent = s.alert;
      } else {
        alertEl.classList.add("hidden");
      }
    });
    bind(root, "[data-action=\"score\"]", "click", function () {
      var age = root.querySelector("[data-field=\"age\"]").value;
      var income = root.querySelector("[data-field=\"income\"]").value;
      var job = root.querySelector("[data-field=\"job\"]").value;
      var purpose = root.querySelector("[data-field=\"purpose\"]").value;
      var score, level, levelCls, suggestion, topFeat;
      if (income.indexOf("高") >= 0 && job.indexOf("稳定") >= 0) {
        score = 752;
        level = "低风险";
        levelCls = "text-emerald-700 bg-emerald-50";
        suggestion = "建议通过，授信额度可适当放宽。";
        topFeat = "收入负债比（贡献 22%）、职业稳定性（贡献 18%）为正向主要驱动因素。";
      } else if (income.indexOf("低") >= 0 && job.indexOf("灵活") >= 0) {
        score = 428;
        level = "高风险";
        levelCls = "text-red-700 bg-red-50";
        suggestion = "建议拒绝，或要求提供担保/抵押。";
        topFeat = "近 6 月逾期次数（贡献 41%）、收入负债比（贡献 29%）为主要负向因素。";
      } else {
        score = 618;
        level = "中风险";
        levelCls = "text-amber-700 bg-amber-50";
        suggestion = "建议补充收入流水与征信报告后人工复核。";
        topFeat = "征信查询次数（贡献 18%）与额度使用率（贡献 15%）处于临界区间。";
      }
      var resultEl = root.querySelector("[data-slot=\"result\"]");
      resultEl.innerHTML =
        '<div class="flex items-center justify-between">' +
        '<div><span class="text-2xl font-bold text-slate-900">' + score + '</span>' +
        '<span class="ml-1 text-xs text-slate-400">/ 1000</span></div>' +
        '<span class="rounded-full px-3 py-1 text-xs font-medium ' + levelCls + '">' + level + "</span>" +
        "</div>" +
        '<div class="mt-3 space-y-2 border-t border-slate-100 pt-3">' +
        '<div class="flex justify-between text-xs"><span class="text-slate-500">客户画像</span>' +
        '<span class="text-slate-700">' + age + " · " + income + " · " + job + " · " + purpose + "</span></div>" +
        '<div class="flex justify-between text-xs"><span class="text-slate-500">审批建议</span>' +
        '<span class="text-slate-700">' + suggestion + "</span></div>" +
        '<div class="flex justify-between text-xs"><span class="text-slate-500">Top 特征解释</span>' +
        '<span class="text-slate-700 max-w-[200px] text-right">' + topFeat + "</span></div>" +
        "</div>";
    });
  }

  function demoMedImaging(root) {
    var cases = [
      {
        title: "胸部 CT · 肺窗复核",
        patient: "模拟患者 A · 52 岁",
        accession: "SIM-CT-0420-A",
        modality: "CT",
        body: "胸部",
        triage: "中优先级",
        triageCls: "border-amber-200 bg-amber-50 text-amber-800",
        confidence: "0.78",
        queue: "影像科待复核",
        series: ["肺窗", "纵隔窗", "MIP"],
        finding: "右上肺外周见磨玻璃密度候选区，边界较淡，建议结合薄层重建与既往片复核。",
        action: "24 小时内完成放射科医师复核，必要时安排随访影像。",
        impression: "右上肺磨玻璃密度影候选提示，建议结合薄层 CT 与既往片对比。",
        scanStyle: "background:radial-gradient(ellipse at 50% 54%, rgba(226,232,240,.45) 0 18%, transparent 19%), radial-gradient(ellipse at 36% 52%, rgba(148,163,184,.35) 0 11%, transparent 12%), radial-gradient(ellipse at 64% 52%, rgba(148,163,184,.32) 0 11%, transparent 12%), linear-gradient(135deg,#0f172a,#334155);",
        spots: [
          {
            label: "候选灶 A",
            cls: "border-orange-400 bg-orange-500/10",
            x: 62,
            y: 38,
            w: 16,
            h: 18,
            note: "右上肺外周磨玻璃影候选区，算法置信度 0.78。"
          },
          {
            label: "对照区",
            cls: "border-emerald-400 bg-emerald-500/10",
            x: 35,
            y: 48,
            w: 15,
            h: 16,
            note: "左肺对照区未见明显异常候选框。"
          }
        ]
      },
      {
        title: "头颅 MRI · 急诊筛查",
        patient: "模拟患者 B · 67 岁",
        accession: "SIM-MR-0420-B",
        modality: "MRI",
        body: "头颅",
        triage: "高优先级",
        triageCls: "border-red-200 bg-red-50 text-red-700",
        confidence: "0.86",
        queue: "急诊优先复核",
        series: ["DWI", "FLAIR", "T2"],
        finding: "左侧基底节区可疑高信号候选区，需结合临床症状与原始序列进一步判断。",
        action: "建议急诊影像医师优先复核，并同步提示临床团队关注时间窗。",
        impression: "左侧基底节区高信号候选提示，需排除急性缺血相关改变。",
        scanStyle: "background:radial-gradient(ellipse at 49% 50%, rgba(226,232,240,.58) 0 24%, transparent 25%), radial-gradient(ellipse at 42% 48%, rgba(100,116,139,.65) 0 7%, transparent 8%), radial-gradient(ellipse at 58% 51%, rgba(148,163,184,.45) 0 8%, transparent 9%), linear-gradient(135deg,#111827,#475569);",
        spots: [
          {
            label: "急性候选区",
            cls: "border-red-400 bg-red-500/10",
            x: 40,
            y: 42,
            w: 13,
            h: 15,
            note: "左侧基底节区高信号候选区，需优先人工复核。"
          },
          {
            label: "脑室定位",
            cls: "border-sky-300 bg-sky-500/10",
            x: 55,
            y: 48,
            w: 10,
            h: 12,
            note: "解剖定位参考区，用于辅助阅片方向判断。"
          }
        ]
      },
      {
        title: "膝关节 X 线 · 骨科初筛",
        patient: "模拟患者 C · 41 岁",
        accession: "SIM-XR-0420-C",
        modality: "X-Ray",
        body: "膝关节",
        triage: "低优先级",
        triageCls: "border-emerald-200 bg-emerald-50 text-emerald-700",
        confidence: "0.64",
        queue: "门诊常规复核",
        series: ["正位", "侧位", "髌骨轴位"],
        finding: "关节间隙轻度变窄候选提示，未见明确急性骨折候选框。",
        action: "建议门诊常规复核，结合体格检查评估退变程度。",
        impression: "膝关节退变候选提示，未见明确急性骨折候选框。",
        scanStyle: "background:linear-gradient(90deg, transparent 0 39%, rgba(226,232,240,.72) 40% 45%, transparent 46% 54%, rgba(203,213,225,.74) 55% 61%, transparent 62%), radial-gradient(ellipse at 50% 62%, rgba(148,163,184,.48) 0 18%, transparent 19%), linear-gradient(135deg,#1f2937,#64748b);",
        spots: [
          {
            label: "关节间隙",
            cls: "border-amber-300 bg-amber-500/10",
            x: 43,
            y: 56,
            w: 20,
            h: 10,
            note: "关节间隙轻度变窄候选提示，建议结合临床症状复核。"
          },
          {
            label: "骨皮质",
            cls: "border-emerald-400 bg-emerald-500/10",
            x: 34,
            y: 29,
            w: 12,
            h: 22,
            note: "骨皮质连续性候选检查未提示明确急性骨折。"
          }
        ]
      }
    ];
    var current = 0;
    var activeSpot = 0;
    var seriesIndex = 0;
    var reviewed = {};
    var reportReady = {};

    function render() {
      var item = cases[current];
      var spot = item.spots[activeSpot] || item.spots[0];
      var confPct = Math.round(Number(item.confidence) * 100);
      var reportHtml = reportReady[current] ? (
        '<div class="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600">' +
        '<p><span class="font-medium text-slate-900">检查号：</span>' + escapeHtml(item.accession) + '</p>' +
        '<p><span class="font-medium text-slate-900">影像所见：</span>' + escapeHtml(item.finding) + '</p>' +
        '<p><span class="font-medium text-slate-900">初筛印象：</span>' + escapeHtml(item.impression) + '</p>' +
        '<p><span class="font-medium text-slate-900">建议：</span>' + escapeHtml(item.action) + '</p>' +
        '<p class="border-t border-slate-100 pt-2 text-red-600">AI 草稿仅用于演示，需放射科医师签发后才可进入正式报告。</p>' +
        '</div>'
      ) : (
        '<p class="mt-3 text-xs leading-relaxed text-slate-500">生成后展示结构化报告草稿：检查号、影像所见、初筛印象、建议和免责声明。</p>'
      );
      root.innerHTML = shell("医疗影像初筛工作台", (
        '<div class="grid gap-4 lg:grid-cols-5">' +
        '<div class="space-y-3 lg:col-span-3">' +
        '<div class="relative aspect-video max-h-80 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-inner" style="' + item.scanStyle + '">' +
        '<div class="absolute inset-0 opacity-25" style="background-image:linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px);background-size:22px 22px"></div>' +
        '<div class="absolute left-3 top-3 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-medium text-white">' + escapeHtml(item.modality) + " · " + escapeHtml(item.series[seriesIndex]) + '</div>' +
        '<div class="absolute bottom-3 left-3 rounded-lg bg-black/50 px-2.5 py-1 text-xs text-white">DICOM Preview · 模拟影像</div>' +
        item.spots.map(function (s, i) {
          var active = i === activeSpot ? " ring-4 ring-white/50" : " opacity-75 hover:opacity-100";
          return (
            '<button type="button" data-spot="' + i + '" aria-label="' + escapeHtml(s.label) + '" ' +
            'class="absolute rounded-lg border-2 shadow-lg transition ' + s.cls + active + '" ' +
            'style="left:' + s.x + '%;top:' + s.y + '%;width:' + s.w + '%;height:' + s.h + '%;transform:translate(-50%,-50%)"></button>'
          );
        }).join("") +
        '</div>' +
        '<div class="grid gap-2 sm:grid-cols-3">' +
        '<div class="rounded-xl border border-slate-200 bg-white p-3"><p class="text-xs text-slate-400">模态</p><p class="mt-1 text-sm font-semibold text-slate-900">' + escapeHtml(item.modality) + '</p></div>' +
        '<div class="rounded-xl border border-slate-200 bg-white p-3"><p class="text-xs text-slate-400">部位</p><p class="mt-1 text-sm font-semibold text-slate-900">' + escapeHtml(item.body) + '</p></div>' +
        '<div class="rounded-xl border border-slate-200 bg-white p-3"><p class="text-xs text-slate-400">置信度</p><p class="mt-1 text-sm font-semibold text-slate-900">' + escapeHtml(item.confidence) + '</p><div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><span class="block h-full rounded-full bg-orange-500" style="width:' + confPct + '%"></span></div></div>' +
        '</div>' +
        '<div class="rounded-xl border border-slate-200 bg-white p-4">' +
        '<div class="flex flex-wrap items-center justify-between gap-2"><p class="text-sm font-semibold text-slate-900">质控清单</p><span class="text-xs text-slate-400">' + escapeHtml(item.accession) + '</span></div>' +
        '<div class="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">' +
        '<p class="rounded-lg bg-emerald-50 px-2.5 py-2 text-emerald-700">已脱敏模拟病例</p>' +
        '<p class="rounded-lg bg-emerald-50 px-2.5 py-2 text-emerald-700">影像质量可读</p>' +
        '<p class="rounded-lg bg-emerald-50 px-2.5 py-2 text-emerald-700">候选框可定位</p>' +
        '<p class="rounded-lg px-2.5 py-2 ' + (reviewed[current] ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700") + '">' + (reviewed[current] ? "人工复核已记录" : "等待人工复核") + '</p>' +
        '</div></div></div>' +
        '<div class="space-y-4 lg:col-span-2">' +
        '<label class="block text-xs font-medium text-slate-600">模拟病例</label>' +
        '<select data-field="case" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-orange-500/20 focus:border-orange-500 focus:ring-4">' +
        cases.map(function (c, i) {
          return '<option value="' + i + '"' + (i === current ? " selected" : "") + ">" + escapeHtml(c.title) + "</option>";
        }).join("") +
        '</select>' +
        '<div><p class="mb-2 text-xs font-medium text-slate-600">阅片序列</p><div class="flex flex-wrap gap-2">' +
        item.series.map(function (name, i) {
          var cls = i === seriesIndex ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
          return '<button type="button" data-series="' + i + '" class="rounded-lg border px-3 py-1.5 text-xs font-medium transition ' + cls + '">' + escapeHtml(name) + "</button>";
        }).join("") +
        '</div></div>' +
        '<div class="rounded-xl border border-slate-200 bg-white p-4">' +
        '<div class="flex flex-wrap items-center justify-between gap-2">' +
        '<p class="text-sm font-semibold text-slate-900">' + escapeHtml(item.patient) + '</p>' +
        '<span class="rounded-lg border px-2.5 py-1 text-xs font-medium ' + item.triageCls + '">' + escapeHtml(item.triage) + '</span>' +
        '</div>' +
        '<div class="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">' +
        '<p><span class="font-medium text-slate-900">队列状态：</span>' + escapeHtml(item.queue) + '</p>' +
        '<p><span class="font-medium text-slate-900">当前标注：</span>' + escapeHtml(spot.label) + '</p>' +
        '<p>' + escapeHtml(spot.note) + '</p>' +
        '<p class="border-t border-slate-100 pt-2"><span class="font-medium text-slate-900">初筛摘要：</span>' + escapeHtml(item.finding) + '</p>' +
        '</div></div>' +
        '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">' +
        '<p class="font-medium text-slate-900">复核建议</p>' +
        '<p class="mt-2">' + escapeHtml(item.action) + '</p>' +
        '<p data-slot="review-note" class="mt-3 text-xs text-slate-500">' + (reviewed[current] ? "已记录：等待放射科医师复核。" : "待处理：尚未记录人工复核。") + '</p>' +
        '<button type="button" data-action="review" class="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600">' +
        (reviewed[current] ? "更新复核记录" : "标记待医师复核") +
        '</button></div>' +
        '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">' +
        '<div class="flex flex-wrap items-center justify-between gap-2"><p class="text-sm font-semibold text-slate-900">结构化报告草稿</p><span class="rounded-lg bg-slate-200 px-2 py-0.5 text-xs text-slate-600">模拟</span></div>' +
        '<button type="button" data-action="report" class="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">' +
        (reportReady[current] ? "刷新报告草稿" : "生成报告草稿") +
        '</button>' +
        reportHtml +
        '</div>' +
        '<p class="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">演示数据不构成医疗诊断，所有候选提示均需执业医师结合完整病史和原始影像复核。</p>' +
        '</div></div>'
      ));

      bind(root, "[data-field=\"case\"]", "change", function (ev) {
        current = Number(ev.target.value) || 0;
        activeSpot = 0;
        seriesIndex = 0;
        render();
      });
      root.querySelectorAll("[data-series]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          seriesIndex = Number(btn.getAttribute("data-series")) || 0;
          render();
        });
      });
      root.querySelectorAll("[data-spot]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          activeSpot = Number(btn.getAttribute("data-spot")) || 0;
          render();
        });
      });
      bind(root, "[data-action=\"review\"]", "click", function () {
        reviewed[current] = true;
        var note = root.querySelector("[data-slot=\"review-note\"]");
        if (note) note.textContent = "已记录：等待放射科医师复核。";
        render();
      });
      bind(root, "[data-action=\"report\"]", "click", function () {
        reportReady[current] = true;
        render();
      });
    }

    render();
  }

  function demoClinicalPath(root, product) {
    root.innerHTML = shell("临床路径建议引擎（模拟 Demo）", (
      '<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">' +
      "演示数据不包含真实患者信息，输出仅用于课程 Demo，不构成医疗诊断或处方。" +
      "</div>" +
      '<div class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">' +
      '<div class="rounded-xl border border-slate-200 bg-white p-4">' +
      '<p class="mb-3 text-xs font-medium text-slate-600">模拟病程输入</p>' +
      '<div class="grid gap-3 sm:grid-cols-2">' +
      '<div><label class="text-[11px] text-slate-500">病种/场景</label>' +
      '<select data-field="condition" class="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">' +
      "<option>肺炎</option><option>糖尿病</option><option>急性腹痛</option><option>未分型专科问题</option>" +
      "</select></div>" +
      '<div><label class="text-[11px] text-slate-500">路径阶段</label>' +
      '<select data-field="stage" class="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">' +
      "<option>初诊评估</option><option>住院第 1 天</option><option>治疗复评</option><option>出院随访</option>" +
      "</select></div></div>" +
      '<label class="mt-3 block text-[11px] text-slate-500">症状与病程摘要（模拟）</label>' +
      '<textarea data-field="symptoms" rows="5" class="mt-0.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm leading-relaxed outline-none ring-orange-500/20 transition focus:border-orange-500 focus:bg-white focus:ring-4">发热 3 天，咳嗽咳痰，活动后气促，血氧略低。</textarea>' +
      '<button type="button" data-action="suggest-path" class="mt-3 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300">生成路径建议</button>' +
      "</div>" +
      '<div data-slot="path-out" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">填写模拟病程后生成路径建议。</div>' +
      "</div>"
    ));
    function apiBase() {
      if (!window.location.host) return "http://127.0.0.1";
      return "";
    }
    function renderItems(items, emptyText) {
      var list = Array.isArray(items) ? items : [];
      if (!list.length) return '<li>' + escapeHtml(emptyText) + '</li>';
      return list.map(function (item) {
        return '<li>' + escapeHtml(item) + '</li>';
      }).join("");
    }
    function renderInlineItems(items, emptyText) {
      var list = Array.isArray(items) ? items : [];
      if (!list.length) return escapeHtml(emptyText);
      return list.map(function (item) {
        return escapeHtml(item);
      }).join("；");
    }
    function riskClass(level) {
      if (level === "高危") return "bg-red-50 text-red-700 border-red-200";
      if (level === "中危") return "bg-amber-50 text-amber-700 border-amber-200";
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    bind(root, "[data-action=\"suggest-path\"]", "click", function () {
      var condition = root.querySelector("[data-field=\"condition\"]").value;
      var stage = root.querySelector("[data-field=\"stage\"]").value;
      var symptoms = root.querySelector("[data-field=\"symptoms\"]").value.trim();
      var out = root.querySelector("[data-slot=\"path-out\"]");
      var btn = root.querySelector("[data-action=\"suggest-path\"]");
      var token = localStorage.getItem("portal_token");
      if (!symptoms) {
        out.className = "rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700";
        out.textContent = "请先输入模拟症状与病程摘要。";
        return;
      }
      btn.disabled = true;
      btn.innerHTML = spinHtml() + " 生成中";
      out.className = "rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600";
      out.innerHTML = '<p class="flex items-center gap-2">' + spinHtml() + " 正在匹配临床路径规则库…</p>";
      fetch(apiBase() + "/api/clinical-pathway/suggest", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          product_id: product && product.id,
          condition: condition,
          stage: stage,
          symptoms: symptoms
        })
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error((data && data.detail) || "生成失败");
            return data;
          });
        })
        .then(function (body) {
          var data = body.data || {};
          out.className = "rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700";
          out.innerHTML =
            '<div class="flex flex-wrap items-start justify-between gap-2">' +
            '<div><p class="text-xs font-semibold text-slate-400">路径摘要</p>' +
            '<p class="mt-1 font-medium text-slate-900">' + escapeHtml(data.summary || "已生成模拟路径建议。") + '</p></div>' +
            '<span class="rounded-full border px-3 py-1 text-xs font-medium ' + riskClass(data.risk_level) + '">' +
            escapeHtml(data.risk_level || "常规") + "</span></div>" +
            '<div class="mt-4 grid gap-3 md:grid-cols-2">' +
            '<div class="rounded-xl bg-slate-50 p-3"><p class="text-xs font-semibold text-slate-500">下一步处置</p>' +
            '<ol class="mt-2 list-decimal space-y-1 pl-5">' + renderItems(data.next_steps, "补齐病程信息并人工复核") + '</ol></div>' +
            '<div class="rounded-xl bg-slate-50 p-3"><p class="text-xs font-semibold text-slate-500">建议检查</p>' +
            '<ul class="mt-2 list-disc space-y-1 pl-5">' + renderItems(data.checks, "基础检查组合") + '</ul></div>' +
            '<div class="rounded-xl bg-slate-50 p-3"><p class="text-xs font-semibold text-slate-500">用药注意</p>' +
            '<ul class="mt-2 list-disc space-y-1 pl-5">' + renderItems(data.medication_notes, "用药需医生复核") + '</ul></div>' +
            '<div class="rounded-xl bg-slate-50 p-3"><p class="text-xs font-semibold text-slate-500">预警信号</p>' +
            '<ul class="mt-2 list-disc space-y-1 pl-5">' + renderItems(data.warning_signs, "症状加重需及时复评") + '</ul></div></div>' +
            '<p class="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-800"><span class="font-semibold">会诊建议：</span>' +
            escapeHtml(data.consultation || "必要时发起专科会诊。") + "</p>" +
            '<p class="mt-3 text-xs text-slate-500">依据：' + renderInlineItems(data.references, "院内路径库（演示）") + "</p>" +
            '<p class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">' +
            escapeHtml(data.disclaimer || "本结果仅为演示，不构成医疗建议。") + "</p>";
        })
        .catch(function (ex) {
          out.className = "rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-700";
          out.textContent = ex.message || "生成失败，请稍后重试。";
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "生成路径建议";
        });
    });
  }

  function demoDevopsLogs(root, product) {
    root.innerHTML = shell("日志聚类与异常", (
      '<div class="grid gap-4 sm:grid-cols-[1fr_1.1fr]">' +
      '<div class="space-y-3">' +
      '<p class="text-xs leading-relaxed text-slate-500">粘贴一段容器 / 中间件日志（每行一条），点击分析后将返回模板聚类与异常候选（演示级启发式）。</p>' +
      '<label class="block text-xs font-medium text-slate-600">日志输入</label>' +
      '<textarea data-field="logs" rows="9" class="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-[12px] leading-relaxed outline-none ring-orange-500/20 transition focus:border-orange-500 focus:ring-4">' +
      escapeHtml([
        "2026-05-14T08:01:12Z ERROR payment-svc timeout upstream=db-primary",
        "2026-05-14T08:01:13Z ERROR payment-svc timeout upstream=db-primary",
        "2026-05-14T08:01:14Z WARN  cache-miss key=user:88421",
        "2026-05-14T08:01:18Z ERROR payment-svc timeout upstream=db-primary",
        "2026-05-14T08:02:03Z ERROR api-gw 502 upstream=inventory-svc req_id=3f0c1d9a-12ab-4cde-9f00-1a2b3c4d5e6f"
      ].join("\n")) +
      '</textarea>' +
      '<div class="flex flex-wrap items-center gap-2">' +
      '<button type="button" data-action="analyze" class="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300">分析日志</button>' +
      '<button type="button" data-action="fill" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">填充样例</button>' +
      "</div>" +
      "</div>" +
      '<div class="space-y-3">' +
      '<div data-slot="out" class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">' +
      '<p class="text-xs text-slate-500">点击“分析日志”查看聚类与异常结果。</p>' +
      "</div>" +
      "</div>" +
      "</div>"
    ));

    function splitLines(text) {
      return String(text || "")
        .split(/\r?\n/)
        .map(function (x) { return x.trim(); })
        .filter(Boolean)
        .slice(0, 2000);
    }

    function renderTokens(tokens) {
      var list = Array.isArray(tokens) ? tokens : [];
      if (!list.length) return "";
      return '<div class="mt-2 flex flex-wrap gap-1.5">' + list.map(function (t) {
        return '<span class="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">' + escapeHtml(t) + "</span>";
      }).join("") + "</div>";
    }

    function renderClusters(clusters) {
      var list = Array.isArray(clusters) ? clusters : [];
      if (!list.length) {
        return '<p class="text-sm text-slate-500">未形成聚类（可尝试降低最小聚类阈值或提供更多相似日志）。</p>';
      }
      return '<div class="space-y-3">' + list.map(function (c) {
        var examples = Array.isArray(c.examples) ? c.examples : [];
        return (
          '<div class="rounded-xl border border-slate-200 bg-white p-3">' +
          '<div class="flex items-start justify-between gap-2">' +
          '<p class="text-xs font-semibold text-slate-500">模板</p>' +
          '<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">x' + escapeHtml(String(c.count || 0)) + "</span>" +
          "</div>" +
          '<p class="mt-1 font-mono text-[12px] leading-relaxed text-slate-900">' + escapeHtml(c.template || "") + "</p>" +
          renderTokens(c.tokens) +
          (examples.length
            ? '<p class="mt-3 text-xs font-semibold text-slate-500">样例</p>' +
              '<ul class="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600">' +
              examples.slice(0, 3).map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") +
              "</ul>"
            : "") +
          "</div>"
        );
      }).join("") + "</div>";
    }

    function scoreBadge(score) {
      var s = Number(score);
      if (!Number.isFinite(s)) s = 0;
      if (s >= 60) return "border-red-200 bg-red-50 text-red-700";
      if (s >= 30) return "border-amber-200 bg-amber-50 text-amber-800";
      return "border-slate-200 bg-slate-50 text-slate-700";
    }

    function renderAnomalies(anomalies) {
      var list = Array.isArray(anomalies) ? anomalies : [];
      if (!list.length) {
        return '<p class="text-sm text-slate-500">未发现异常候选（演示算法）。</p>';
      }
      return '<div class="space-y-3">' + list.map(function (a) {
        return (
          '<div class="rounded-xl border border-slate-200 bg-white p-3">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
          '<p class="text-xs font-semibold text-slate-500">异常候选</p>' +
          '<span class="rounded-full border px-2.5 py-1 text-xs font-medium ' + scoreBadge(a.score) + '">' +
          "score " + escapeHtml(String(a.score || 0)) + "</span>" +
          "</div>" +
          '<p class="mt-1 text-xs text-slate-600">' + escapeHtml(a.reason || "") + "</p>" +
          '<p class="mt-2 font-mono text-[12px] leading-relaxed text-slate-900">' + escapeHtml(a.log || "") + "</p>" +
          '<details class="mt-2">' +
          '<summary class="cursor-pointer text-xs text-slate-500 hover:text-slate-700">查看模板</summary>' +
          '<p class="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-700">' + escapeHtml(a.template || "") + "</p>" +
          "</details>" +
          "</div>"
        );
      }).join("") + "</div>";
    }

    bind(root, "[data-action=\"fill\"]", "click", function () {
      var ta = root.querySelector("[data-field=\"logs\"]");
      if (!ta) return;
      ta.value = [
        "2026-05-14T08:01:12Z ERROR payment-svc timeout upstream=db-primary",
        "2026-05-14T08:01:13Z ERROR payment-svc timeout upstream=db-primary",
        "2026-05-14T08:01:14Z WARN  cache-miss key=user:88421",
        "2026-05-14T08:01:18Z ERROR payment-svc timeout upstream=db-primary",
        "2026-05-14T08:02:03Z ERROR api-gw 502 upstream=inventory-svc req_id=3f0c1d9a-12ab-4cde-9f00-1a2b3c4d5e6f",
        "2026-05-14T08:02:04Z ERROR inventory-svc connection refused host=10.0.0.8:5432"
      ].join("\n");
    });

    bind(root, "[data-action=\"analyze\"]", "click", function () {
      var ta = root.querySelector("[data-field=\"logs\"]");
      var out = root.querySelector("[data-slot=\"out\"]");
      var btn = root.querySelector("[data-action=\"analyze\"]");
      var token = localStorage.getItem("portal_token");
      if (!ta || !out || !btn) return;
      var logs = splitLines(ta.value);
      if (!logs.length) {
        out.className = "rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700";
        out.textContent = "请先输入日志（每行一条）。";
        return;
      }
      btn.disabled = true;
      btn.innerHTML = spinHtml() + " 分析中";
      out.className = "rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700";
      out.innerHTML = '<p class="flex items-center gap-2 text-sm text-slate-600">' + spinHtml() + " 正在调用后端接口进行聚类与异常检测…</p>";

      fetch(apiBase() + "/api/log-insight/analyze", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          product_id: product && product.id,
          logs: logs,
          top_k: 8,
          anomaly_k: 6,
          min_cluster_size: 2
        })
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error((data && data.detail) || "分析失败");
            return data;
          });
        })
        .then(function (body) {
          var data = (body && body.data) || {};
          out.className = "rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700";
          out.innerHTML =
            '<div class="flex flex-wrap items-center justify-between gap-2">' +
            '<p class="text-sm font-medium text-slate-900">分析结果</p>' +
            '<p class="text-xs text-slate-500">总日志 ' + escapeHtml(String(data.total || 0)) +
            " · 解析 " + escapeHtml(String(data.parsed || 0)) + "</p>" +
            "</div>" +
            '<div class="mt-4 grid gap-4">' +
            '<div><p class="text-xs font-semibold text-slate-500">聚类（Top）</p>' +
            '<div class="mt-2">' + renderClusters(data.clusters) + "</div></div>" +
            '<div><p class="text-xs font-semibold text-slate-500">异常候选</p>' +
            '<div class="mt-2">' + renderAnomalies(data.anomalies) + "</div></div>" +
            "</div>";
        })
        .catch(function (ex) {
          out.className = "rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm leading-relaxed text-red-700";
          out.textContent = ex.message || "分析失败，请稍后重试。";
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "分析日志";
        });
    });
  }

  function demoCxBot(root, product) {
    root.innerHTML = shell("坐席侧话术与情绪", (
      '<div class="grid gap-4 sm:grid-cols-[1fr_1.1fr]">' +
      '<div class="space-y-4">' +
      '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">' +
      '<div class="flex items-center justify-between gap-3">' +
      '<p class="text-xs font-medium text-slate-600">当前会话情绪倾向</p>' +
      '<span class="rounded-lg bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">DeepSeek</span>' +
      "</div>" +
      '<div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">' +
      '<div data-slot="meter" class="h-full w-0 rounded-full bg-gradient-to-r from-slate-300 to-slate-400"></div></div>' +
      '<p data-slot="sentiment-summary" class="mt-1 text-xs text-slate-500">等待生成 · 将随客户原话更新</p></div>' +
      '<label class="block text-xs font-medium text-slate-600">客户意图</label>' +
      '<select data-field="intent" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">' +
      "<option>投诉配送延迟</option>" +
      "<option>要求退费</option>" +
      "<option>态度投诉</option>" +
      "</select>" +
      '<label class="block text-xs font-medium text-slate-600">客户原话</label>' +
      '<textarea data-field="message" rows="5" class="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none ring-orange-500/20 transition focus:border-orange-500 focus:ring-4">等了一周还没送到，必须给我说法。</textarea>' +
      '<button type="button" data-action="suggest" class="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300">生成话术建议</button>' +
      "</div>" +
      '<div data-slot="sug" class="hidden rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950"></div>' +
      "</div>"
    ));
    function apiBase() {
      if (!window.location.host) return "http://127.0.0.1";
      return "";
    }
    function renderList(items, emptyText) {
      var list = Array.isArray(items) ? items : [];
      if (!list.length) return '<li>' + escapeHtml(emptyText) + '</li>';
      return list.map(function (item) {
        return '<li>' + escapeHtml(item) + '</li>';
      }).join("");
    }
    function updateSentimentCard(data) {
      var meta = sentimentMeta(data || {});
      var meter = root.querySelector("[data-slot=\"meter\"]");
      var summary = root.querySelector("[data-slot=\"sentiment-summary\"]");
      if (meter) {
        meter.style.width = meta.score + "%";
        meter.className = meta.barClass;
      }
      if (summary) {
        summary.textContent = meta.label + " " + meta.score + "% · " + meta.hint;
      }
    }
    bind(root, "[data-action=\"suggest\"]", "click", function () {
      var intent = root.querySelector("[data-field=\"intent\"]").value;
      var message = root.querySelector("[data-field=\"message\"]").value.trim();
      var out = root.querySelector("[data-slot=\"sug\"]");
      var btn = root.querySelector("[data-action=\"suggest\"]");
      var token = localStorage.getItem("portal_token");
      out.classList.remove("hidden");
      if (!message) {
        out.className = "rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700";
        out.textContent = "请先输入客户原话。";
        return;
      }
      btn.disabled = true;
      btn.innerHTML = spinHtml() + " 生成中";
      out.className = "rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700";
      out.innerHTML = '<p class="flex items-center gap-2 text-sm text-slate-600">' + spinHtml() + " 正在请求 DeepSeek 生成话术建议…</p>";
      updateSentimentCard({ sentiment_label: "分析中", sentiment_score: 18 });
      fetch(apiBase() + "/api/customer-script/suggest", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          product_id: product && product.id,
          intent: intent,
          customer_message: message
        })
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error((data && data.detail) || "生成失败");
            return data;
          });
        })
        .then(function (body) {
          var data = body.data || {};
          updateSentimentCard(data);
          out.className = "rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950";
          out.innerHTML =
            '<p class="text-xs font-semibold text-emerald-700">情绪判断</p>' +
            '<p class="mt-1 font-medium">' + escapeHtml(data.sentiment_label || data.sentiment || "需人工复核") + '</p>' +
            '<p class="mt-4 text-xs font-semibold text-emerald-700">推荐话术</p>' +
            '<p class="mt-1 leading-relaxed">' + escapeHtml(data.reply || "请先安抚客户情绪，并承诺核查后给出明确回访时间。") + '</p>' +
            '<p class="mt-4 text-xs font-semibold text-emerald-700">处理步骤</p>' +
            '<ol class="mt-1 list-decimal space-y-1 pl-5">' + renderList(data.steps, "确认问题并给出处理时限") + '</ol>' +
            '<p class="mt-4 text-xs font-semibold text-emerald-700">升级策略</p>' +
            '<p class="mt-1 leading-relaxed">' + escapeHtml(data.escalation || "若客户持续强烈投诉，升级给主管处理。") + '</p>' +
            '<p class="mt-4 text-xs font-semibold text-emerald-700">禁用词提醒</p>' +
            '<ul class="mt-1 list-disc space-y-1 pl-5">' + renderList(data.forbidden_words, "避免推诿和绝对化承诺") + '</ul>';
        })
        .catch(function (ex) {
          updateSentimentCard({ sentiment_label: "生成失败", sentiment_score: 0 });
          out.className = "rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm leading-relaxed text-red-700";
          out.textContent = ex.message || "生成失败，请稍后重试。";
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "生成话术建议";
        });
    });
  }

  function clampSentimentScore(value, fallback) {
    var score = Number(value);
    if (!Number.isFinite(score)) score = fallback;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function sentimentMeta(data) {
    var raw = data || {};
    var label = String(raw.sentiment_label || raw.sentiment || "需人工复核").trim();
    var text = label.toLowerCase();
    var score;
    var hint;
    var barClass;
    if (text.indexOf("高风险") >= 0 || text.indexOf("强烈") >= 0 || text.indexOf("愤怒") >= 0 || text.indexOf("angry") >= 0 || text.indexOf("severe") >= 0 || text.indexOf("high") >= 0) {
      label = "高风险负面";
      score = clampSentimentScore(raw.sentiment_score, 88);
      hint = "高风险负面，建议安抚并升级";
      barClass = "h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500";
    } else if (text.indexOf("负面") >= 0 || text.indexOf("投诉") >= 0 || text.indexOf("不满") >= 0 || text.indexOf("差评") >= 0 || text.indexOf("negative") >= 0 || text.indexOf("complaint") >= 0) {
      label = "偏负面";
      score = clampSentimentScore(raw.sentiment_score, 72);
      hint = "偏负面，优先安抚与解释";
      barClass = "h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500";
    } else if (text.indexOf("neutral") >= 0 || text.indexOf("中性") >= 0 || text.indexOf("一般") >= 0) {
      label = "中性";
      score = clampSentimentScore(raw.sentiment_score, 45);
      hint = "模型判断为中性，保持解释清晰";
      barClass = "h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500";
    } else if (text.indexOf("正向") >= 0 || text.indexOf("满意") >= 0 || text.indexOf("positive") >= 0 || text.indexOf("happy") >= 0) {
      label = "正向";
      score = clampSentimentScore(raw.sentiment_score, 24);
      hint = "正向，保持响应效率";
      barClass = "h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500";
    } else if (text.indexOf("分析中") >= 0) {
      score = clampSentimentScore(raw.sentiment_score, 18);
      hint = "正在分析客户原话";
      barClass = "h-full rounded-full bg-gradient-to-r from-slate-300 to-slate-400";
    } else if (text.indexOf("失败") >= 0) {
      score = clampSentimentScore(raw.sentiment_score, 0);
      hint = "本次未完成情绪判断";
      barClass = "h-full rounded-full bg-gradient-to-r from-slate-300 to-slate-400";
    } else {
      score = clampSentimentScore(raw.sentiment_score, 55);
      hint = "需人工复核情绪风险";
      barClass = "h-full rounded-full bg-gradient-to-r from-slate-400 to-slate-500";
    }
    return {
      label: label,
      score: score,
      hint: hint,
      barClass: barClass
    };
  }

  function demoAdminRouter(root, product) {
    root.innerHTML = shell("密钥与模型路由治理", (
      '<div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">' +
      '<section class="rounded-xl border border-slate-200 bg-white p-4">' +
      '<div class="flex flex-wrap items-center justify-between gap-2">' +
      '<h3 class="text-sm font-semibold text-slate-900">路由演练</h3>' +
      '<span class="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">仅管理员</span>' +
      "</div>" +
      '<div class="mt-4 grid gap-3 sm:grid-cols-2">' +
      '<label class="text-xs font-medium text-slate-600">应用模块' +
      '<select data-field="application" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">' +
      '<option value="customer-service">客服话术优化</option>' +
      '<option value="internal-rag">企业 GPT 助手</option>' +
      '<option value="office-review">智能办公智能体</option>' +
      '<option value="training-coach">员工自助：培训陪练</option>' +
      "</select></label>" +
      '<label class="text-xs font-medium text-slate-600">风险等级' +
      '<select data-field="risk" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">' +
      '<option value="medium">中风险</option><option value="low">低风险</option><option value="high">高风险</option>' +
      "</select></label>" +
      '<label class="text-xs font-medium text-slate-600">输入 Token' +
      '<input data-field="tokens" type="number" min="100" max="50000" value="2400" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />' +
      "</label>" +
      '<label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">' +
      '<input data-field="sensitive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />' +
      "包含敏感数据标记" +
      "</label></div>" +
      '<button type="button" data-action="simulate" class="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300">运行路由演练</button>' +
      '<div data-slot="simulation" class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">等待管理员发起演练。</div>' +
      "</section>" +
      '<section class="rounded-xl border border-slate-200 bg-white p-4">' +
      '<div class="flex flex-wrap items-center justify-between gap-2">' +
      '<h3 class="text-sm font-semibold text-slate-900">密钥轮换</h3>' +
      '<button type="button" data-action="refresh" class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-orange-300 hover:text-orange-700">刷新</button>' +
      "</div>" +
      '<label class="mt-4 block text-xs font-medium text-slate-600">密钥标识' +
      '<select data-field="key" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"></select></label>' +
      '<label class="mt-3 block text-xs font-medium text-slate-600">轮换原因' +
      '<input data-field="reason" value="定期轮换演练" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />' +
      "</label>" +
      '<button type="button" data-action="rotate" class="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-slate-400">模拟轮换</button>' +
      '<div data-slot="rotation" class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">未执行轮换演练。</div>' +
      "</section></div>" +
      '<div class="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">' +
      '<section class="rounded-xl border border-slate-200 bg-white p-4">' +
      '<h3 class="text-sm font-semibold text-slate-900">路由策略</h3>' +
      '<div data-slot="routes" class="mt-3 overflow-x-auto text-xs text-slate-600">加载中…</div>' +
      "</section>" +
      '<section class="rounded-xl border border-slate-200 bg-white p-4">' +
      '<h3 class="text-sm font-semibold text-slate-900">密钥台账</h3>' +
      '<div data-slot="keys" class="mt-3 space-y-2 text-xs text-slate-600">加载中…</div>' +
      "</section></div>" +
      '<div class="mt-4 grid gap-4 lg:grid-cols-2">' +
      '<section class="rounded-xl border border-slate-200 bg-white p-4">' +
      '<h3 class="text-sm font-semibold text-slate-900">治理告警</h3>' +
      '<div data-slot="warnings" class="mt-3 space-y-2 text-xs text-slate-600">加载中…</div>' +
      "</section>" +
      '<section class="rounded-xl border border-slate-200 bg-white p-4">' +
      '<h3 class="text-sm font-semibold text-slate-900">审计日志</h3>' +
      '<div data-slot="audit" class="mt-3 space-y-2 text-xs text-slate-600">加载中…</div>' +
      "</section></div>" +
      '<p data-slot="disclaimer" class="mt-3 text-xs leading-relaxed text-slate-500"></p>'
    ));

    var state = { keys: [] };

    function jsonResponse(res) {
      return res.text().then(function (text) {
        var body = {};
        if (text) {
          try {
            body = JSON.parse(text);
          } catch (e) {
            body = { detail: text };
          }
        }
        if (!res.ok) throw new Error((body && (body.detail || body.message)) || "请求失败");
        return body;
      });
    }

    function requireAdminContext(out) {
      var token = localStorage.getItem("portal_token");
      if (!token || !(product && product.id)) {
        out.innerHTML = '<p class="text-sm text-red-700">未登录或缺少产品信息，无法访问管理员模块。</p>';
        return null;
      }
      return token;
    }

    function statusClass(statusText) {
      if (statusText === "健康" || statusText === "启用") return "bg-emerald-50 text-emerald-700";
      if (statusText === "观察") return "bg-amber-50 text-amber-800";
      return "bg-slate-100 text-slate-600";
    }

    function renderRoutes(routes) {
      var rows = (routes || []).map(function (route) {
        return (
          '<tr class="border-b border-slate-100 last:border-0">' +
          '<td class="py-2 pr-3 font-medium text-slate-800">' + escapeHtml(route.application_label) + '</td>' +
          '<td class="py-2 pr-3">' + escapeHtml(route.primary_model) + '<br><span class="text-slate-400">兜底：' + escapeHtml(route.fallback_model) + '</span></td>' +
          '<td class="py-2 pr-3">' + escapeHtml(route.policy) + '</td>' +
          '<td class="py-2"><span class="rounded-lg px-2 py-0.5 ' + statusClass(route.status) + '">' + escapeHtml(route.status) + '</span></td>' +
          "</tr>"
        );
      }).join("");
      root.querySelector("[data-slot=\"routes\"]").innerHTML =
        '<table class="min-w-full text-left"><thead><tr class="border-b border-slate-200 text-slate-400">' +
        '<th class="py-2 pr-3">应用</th><th class="py-2 pr-3">模型</th><th class="py-2 pr-3">策略</th><th class="py-2">状态</th>' +
        "</tr></thead><tbody>" + rows + "</tbody></table>";
    }

    function renderKeys(keys) {
      state.keys = keys || [];
      var select = root.querySelector("[data-field=\"key\"]");
      select.innerHTML = state.keys.map(function (key) {
        return '<option value="' + escapeHtml(key.key_id) + '">' + escapeHtml(key.key_id) + '</option>';
      }).join("");
      root.querySelector("[data-slot=\"keys\"]").innerHTML = state.keys.map(function (key) {
        return (
          '<div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">' +
          '<div class="flex flex-wrap items-center justify-between gap-2">' +
          '<span class="font-mono text-slate-800">' + escapeHtml(key.masked_key) + '</span>' +
          '<span class="rounded-lg px-2 py-0.5 ' + statusClass(key.status) + '">' + escapeHtml(key.status) + '</span>' +
          "</div>" +
          '<p class="mt-1 text-slate-500">' + escapeHtml(key.provider) + ' · 负责人：' + escapeHtml(key.owner) + '</p>' +
          '<p class="mt-1 text-slate-500">配额 ' + escapeHtml(String(key.used_pct)) + '% · 距轮换 ' + escapeHtml(String(key.rotation_days)) + ' 天</p>' +
          "</div>"
        );
      }).join("");
    }

    function renderWarnings(warnings) {
      var list = warnings || [];
      root.querySelector("[data-slot=\"warnings\"]").innerHTML = list.length
        ? list.map(function (item) {
          return '<p class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">' + escapeHtml(item) + '</p>';
        }).join("")
        : '<p class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">当前没有演示告警。</p>';
    }

    function renderAudit(events) {
      root.querySelector("[data-slot=\"audit\"]").innerHTML = (events || []).map(function (event) {
        return (
          '<div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">' +
          '<p class="font-medium text-slate-800">' + escapeHtml(event.action) + ' · ' + escapeHtml(event.target) + '</p>' +
          '<p class="mt-1 text-slate-500">' + escapeHtml(event.time) + ' · ' + escapeHtml(event.actor) + ' · ' + escapeHtml(event.result) + '</p>' +
          "</div>"
        );
      }).join("");
    }

    function renderSimulation(data) {
      var guardrails = (data.guardrails || []).map(function (item) {
        return '<li>' + escapeHtml(item) + '</li>';
      }).join("");
      root.querySelector("[data-slot=\"simulation\"]").innerHTML =
        '<div class="flex flex-wrap items-start justify-between gap-3">' +
        '<div><p class="font-medium text-slate-900">' + escapeHtml(data.application_label) + '</p>' +
        '<p class="mt-1 text-slate-600">' + escapeHtml(data.decision) + '</p></div>' +
        '<span class="rounded-lg bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">' + escapeHtml(data.throttle) + '</span>' +
        "</div>" +
        '<dl class="mt-3 grid gap-2 text-xs sm:grid-cols-2">' +
        '<div><dt class="text-slate-400">选中模型</dt><dd class="font-medium text-slate-800">' + escapeHtml(data.selected_model) + '</dd></div>' +
        '<div><dt class="text-slate-400">密钥标识</dt><dd class="font-mono text-slate-800">' + escapeHtml(data.masked_key) + '</dd></div>' +
        '<div><dt class="text-slate-400">估算成本</dt><dd class="font-medium text-slate-800">' + escapeHtml(data.estimated_cost) + '</dd></div>' +
        '<div><dt class="text-slate-400">估算时延</dt><dd class="font-medium text-slate-800">' + escapeHtml(String(data.estimated_latency_ms)) + ' ms</dd></div>' +
        "</dl>" +
        '<ul class="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">' + guardrails + '</ul>' +
        '<p class="mt-3 text-xs text-slate-400">' + escapeHtml(data.disclaimer || "") + '</p>';
    }

    function loadStatus() {
      var routesSlot = root.querySelector("[data-slot=\"routes\"]");
      var token = requireAdminContext(routesSlot);
      if (!token) return Promise.resolve();
      return fetch(apiBase() + "/api/admin-router/status?product_id=" + encodeURIComponent(product.id), {
        headers: authHeaders()
      })
        .then(jsonResponse)
        .then(function (body) {
          var data = body.data || {};
          renderRoutes(data.routes || []);
          renderKeys(data.keys || []);
          renderWarnings(data.warnings || []);
          renderAudit(data.audit_events || []);
          root.querySelector("[data-slot=\"disclaimer\"]").textContent = data.disclaimer || "";
        })
        .catch(function (ex) {
          var html = '<p class="text-sm text-red-700">' + escapeHtml(ex.message || "加载管理员模块失败") + '</p>';
          root.querySelector("[data-slot=\"routes\"]").innerHTML = html;
          root.querySelector("[data-slot=\"keys\"]").innerHTML = html;
          root.querySelector("[data-slot=\"warnings\"]").innerHTML = html;
          root.querySelector("[data-slot=\"audit\"]").innerHTML = html;
        });
    }

    bind(root, "[data-action=\"simulate\"]", "click", function () {
      var out = root.querySelector("[data-slot=\"simulation\"]");
      var token = requireAdminContext(out);
      var btn = root.querySelector("[data-action=\"simulate\"]");
      if (!token) return;
      btn.disabled = true;
      btn.innerHTML = spinHtml() + " 演练中";
      out.innerHTML = '<p class="flex items-center gap-2 text-xs text-slate-500">' + spinHtml() + " 正在执行路由策略…</p>";
      fetch(apiBase() + "/api/admin-router/simulate", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          product_id: product.id,
          application: root.querySelector("[data-field=\"application\"]").value,
          risk_level: root.querySelector("[data-field=\"risk\"]").value,
          input_tokens: Number(root.querySelector("[data-field=\"tokens\"]").value || 2400),
          contains_sensitive_data: root.querySelector("[data-field=\"sensitive\"]").checked
        })
      })
        .then(jsonResponse)
        .then(function (body) { renderSimulation(body.data || {}); })
        .catch(function (ex) {
          out.innerHTML = '<p class="text-sm text-red-700">' + escapeHtml(ex.message || "路由演练失败") + '</p>';
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "运行路由演练";
        });
    });

    bind(root, "[data-action=\"rotate\"]", "click", function () {
      var out = root.querySelector("[data-slot=\"rotation\"]");
      var token = requireAdminContext(out);
      var btn = root.querySelector("[data-action=\"rotate\"]");
      if (!token) return;
      btn.disabled = true;
      btn.innerHTML = spinHtml() + " 轮换中";
      fetch(apiBase() + "/api/admin-router/rotate", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          product_id: product.id,
          key_id: root.querySelector("[data-field=\"key\"]").value,
          reason: root.querySelector("[data-field=\"reason\"]").value || "定期轮换演练"
        })
      })
        .then(jsonResponse)
        .then(function (body) {
          var data = body.data || {};
          out.innerHTML =
            '<p class="font-medium text-slate-900">' + escapeHtml(data.status || "轮换演练已记录") + '</p>' +
            '<p class="mt-2 text-xs text-slate-600">轮换编号：<span class="font-mono">' + escapeHtml(data.rotation_id || "") + '</span></p>' +
            '<p class="mt-1 text-xs text-slate-600">密钥标识：<span class="font-mono">' + escapeHtml(data.masked_key || "") + '</span></p>' +
            '<p class="mt-1 text-xs text-slate-600">下次轮换：' + escapeHtml(data.next_rotation_at || "") + '</p>' +
            '<p class="mt-3 text-xs text-slate-400">' + escapeHtml(data.disclaimer || "") + '</p>';
        })
        .catch(function (ex) {
          out.innerHTML = '<p class="text-sm text-red-700">' + escapeHtml(ex.message || "轮换演练失败") + '</p>';
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "模拟轮换";
        });
    });

    bind(root, "[data-action=\"refresh\"]", "click", loadStatus);
    loadStatus();
  }

  function demoDirectorSandbox(root) {
    root.innerHTML = shell("战略沙盘（演示）", (
      '<div class="grid gap-4 sm:grid-cols-3">' +
      '<div><label class="text-xs text-slate-600">销售弹性</label>' +
      '<input type="range" data-range="s" min="0" max="100" value="55" class="mt-1 w-full accent-orange-500" /></div>' +
      '<div><label class="text-xs text-slate-600">运营成本压力</label>' +
      '<input type="range" data-range="c" min="0" max="100" value="40" class="mt-1 w-full accent-orange-500" /></div>' +
      '<div><label class="text-xs text-slate-600">研发投入</label>' +
      '<input type="range" data-range="r" min="0" max="100" value="65" class="mt-1 w-full accent-orange-500" /></div></div>' +
      '<div class="mt-4 grid grid-cols-3 gap-3 text-center">' +
      '<div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs text-slate-500">营收增速</p>' +
      '<p data-kpi="rev" class="mt-1 text-xl font-semibold text-slate-900">—</p></div>' +
      '<div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs text-slate-500">毛利率</p>' +
      '<p data-kpi="margin" class="mt-1 text-xl font-semibold text-slate-900">—</p></div>' +
      '<div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs text-slate-500">现金流</p>' +
      '<p data-kpi="cash" class="mt-1 text-xl font-semibold text-slate-900">—</p></div></div>'
    ));
    function recalc() {
      var s = +root.querySelector("[data-range=\"s\"]").value;
      var c = +root.querySelector("[data-range=\"c\"]").value;
      var r = +root.querySelector("[data-range=\"r\"]").value;
      var rev = (8 + s * 0.12 - c * 0.05).toFixed(1);
      var margin = (32 - c * 0.08 + r * 0.04).toFixed(1);
      var cash = (s - c + r * 0.3).toFixed(0);
      root.querySelector("[data-kpi=\"rev\"]").textContent = rev + "%";
      root.querySelector("[data-kpi=\"margin\"]").textContent = margin + "%";
      root.querySelector("[data-kpi=\"cash\"]").textContent = (cash > 0 ? "+" : "") + cash + "（模拟）";
    }
    root.querySelectorAll("[data-range]").forEach(function (el) {
      el.addEventListener("input", recalc);
    });
    recalc();
  }

  function demoTrainBot(root, product) {
    var history = [];
    var round = 0;
    var opening = "你们比竞品贵 15%，凭什么？如果只能讲概念，我很难往下推进。";

    root.innerHTML = shell("合规陪练舱", (
      '<div class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 mb-4">' +
      "输入 <code class=\"rounded bg-white/70 px-1\">/end</code> 可结束演练并生成教练复盘。对话通过后端接口返回，便于统一权限与后续模型接入。" +
      "</div>" +
      '<div data-slot="chat" class="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"></div>' +
      '<div class="mt-3 flex flex-col gap-2 sm:flex-row">' +
      '<input type="text" data-field="reply" placeholder="输入你的回应…例如：我们先用 PoC 和合同指标验证效果" ' +
      'class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-orange-500/20 transition focus:border-orange-500 focus:ring-4" />' +
      '<button type="button" data-action="send" class="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">发送</button>' +
      '<button type="button" data-action="end" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">结束</button>' +
      "</div>" +
      '<p data-slot="status" class="mt-2 hidden text-xs text-slate-500"></p>' +
      '<div data-slot="coach" class="mt-3 hidden rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-relaxed text-slate-700"></div>'
    ));

    var chat = root.querySelector("[data-slot=\"chat\"]");
    var input = root.querySelector("[data-field=\"reply\"]");
    var send = root.querySelector("[data-action=\"send\"]");
    var end = root.querySelector("[data-action=\"end\"]");
    var coach = root.querySelector("[data-slot=\"coach\"]");
    var statusLine = root.querySelector("[data-slot=\"status\"]");
    var sessionId = "training-" + (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()));
    var locked = false;

    function append(role, text) {
      var label = role === "user" ? "我" : role === "coach" ? "教练" : "李总";
      var cls = role === "user" ? "bg-orange-50 text-slate-800" : role === "coach" ? "bg-emerald-50 text-slate-800" : "bg-white text-slate-700";
      var align = role === "user" ? "ml-auto" : "";
      chat.insertAdjacentHTML(
        "beforeend",
        '<p class="' + align + " max-w-[86%] rounded-lg p-2 shadow-sm " + cls + '">' +
        '<span class="text-xs text-slate-400">' + label + " · </span>" +
        escapeHtml(text).replace(/\n/g, "<br/>") +
        "</p>"
      );
      chat.scrollTop = chat.scrollHeight;
      history.push({ role: role === "user" ? "user" : "assistant", content: text });
    }

    function setBusy(busy) {
      input.disabled = busy;
      send.disabled = busy;
      end.disabled = busy;
      send.textContent = busy ? "生成中…" : "发送";
    }

    function setStatus(text) {
      if (!statusLine) return;
      statusLine.textContent = text || "";
      statusLine.classList.toggle("hidden", !text);
    }

    function showCoach(data) {
      locked = true;
      coach.classList.remove("hidden");
      coach.innerHTML =
        '<p class="mb-1 text-xs font-semibold text-emerald-700">AI 教练复盘</p>' +
        '<div>' + escapeHtml(data.reply).replace(/\n/g, "<br/>") + "</div>";
      input.disabled = true;
      send.disabled = true;
      end.disabled = true;
      send.textContent = "已结束";
      end.textContent = "已结束";
    }

    function handleStreamEvent(block) {
      var eventName = "message";
      var dataText = "";
      block.split(/\n/).forEach(function (line) {
        if (line.indexOf("event:") === 0) eventName = line.slice(6).trim();
        if (line.indexOf("data:") === 0) dataText += line.slice(5).trim();
      });
      if (!dataText) return;
      var payload = JSON.parse(dataText);
      if (eventName === "status") {
        setStatus(payload.message || "正在请求 DeepSeek…");
        return;
      }
      if (eventName === "error") {
        throw new Error(payload.message || "陪练接口调用失败");
      }
      if (eventName !== "result") return;
      var data = payload && payload.data;
      if (!data) throw new Error("陪练响应为空");
      setStatus("");
      if (data.phase === "report") {
        append("coach", data.reply);
        showCoach(data);
      } else {
        append("assistant", data.reply);
      }
    }

    function readEventStream(response) {
      if (!response.ok) {
        return response.json().then(function (data) {
          throw new Error((data && data.detail) || "陪练接口调用失败");
        });
      }
      if (!response.body || !window.TextDecoder) {
        return response.json().then(function (payload) {
          handleStreamEvent("event: result\ndata: " + JSON.stringify(payload));
        });
      }
      var reader = response.body.getReader();
      var decoder = new TextDecoder("utf-8");
      var buffer = "";
      function pump() {
        return reader.read().then(function (result) {
          buffer += decoder.decode(result.value || new Uint8Array(), { stream: !result.done });
          var parts = buffer.split(/\n\n/);
          buffer = parts.pop() || "";
          parts.forEach(handleStreamEvent);
          if (result.done) {
            if (buffer.trim()) handleStreamEvent(buffer);
            return;
          }
          return pump();
        });
      }
      return pump();
    }

    function sendMessage(text) {
      var value = text.trim();
      if (!value || send.disabled) return;
      round += 1;
      append("user", value);
      input.value = "";
      locked = false;
      setBusy(true);
      setStatus("正在连接 DeepSeek…");
      fetch(apiBase() + "/api/employee-training/respond/stream", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          product_id: product && product.id,
          user_message: value,
          round: round,
          session_id: sessionId,
          history: history.slice(-12)
        })
      })
        .then(readEventStream)
        .catch(function (ex) {
          setStatus("");
          append("coach", "接口暂不可用：" + (ex.message || "未知错误") + "。请确认已通过 Docker 服务地址访问并已登录。");
        })
        .finally(function () {
          if (!locked) setBusy(false);
        });
    }

    append("assistant", opening);
    bind(root, "[data-action=\"send\"]", "click", function () {
      sendMessage(input.value);
    });
    bind(root, "[data-action=\"end\"]", "click", function () {
      sendMessage("/end");
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage(input.value);
      }
    });
  }

  function demoAskData(root) {
    root.innerHTML = shell("问数 · NL → SQL（模拟）", (
      '<textarea data-field="nl" rows="2" class="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm" placeholder="用自然语言描述指标…">上月华东区订单金额按周趋势</textarea>' +
      '<button type="button" data-action="sql" class="mt-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">生成可审计 SQL（模拟）</button>' +
      '<pre data-slot="sql" class="mt-3 hidden overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-emerald-300"></pre>' +
      '<p data-slot="viz" class="mt-2 hidden text-xs text-slate-600"></p>'
    ));
    bind(root, "[data-action=\"sql\"]", "click", function () {
      var nl = root.querySelector("[data-field=\"nl\"]").value.trim();
      var pre = root.querySelector("[data-slot=\"sql\"]");
      var viz = root.querySelector("[data-slot=\"viz\"]");
      pre.classList.remove("hidden");
      pre.textContent = "SELECT week, SUM(order_amt) amt\nFROM dw.f_orders\nWHERE region = '华东' AND dt BETWEEN ...\nGROUP BY 1 ORDER BY 1;";
      viz.classList.remove("hidden");
      viz.innerHTML =
        "语义层映射：<code class=\"rounded bg-slate-100 px-1\">订单金额=含税成交额</code> · 图表建议：折线图（模拟）<br/>问题摘要：" +
        escapeHtml(nl);
    });
  }

  function demoNavigation(root) {
    root.innerHTML = shell("语义导航（网格模拟）", (
      '<p class="mb-2 text-xs text-slate-500">依次点击起点、终点，然后规划路线。</p>' +
      '<div data-grid class="grid max-w-xs grid-cols-5 gap-1"></div>' +
      '<button type="button" data-action="plan" class="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">规划路线</button>' +
      '<p data-slot="path" class="mt-2 text-xs text-slate-600"></p>'
    ));
    var grid = root.querySelector("[data-grid]");
    var cells = [];
    for (var i = 0; i < 25; i++) {
      cells.push("<button type=\"button\" data-cell=\"" + i + "\" class=\"h-9 rounded border border-slate-200 bg-white text-[10px] text-slate-400 hover:border-orange-300\">" + i + "</button>");
    }
    grid.innerHTML = cells.join("");
    var picks = [];
    root.querySelectorAll("[data-cell]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = +btn.getAttribute("data-cell");
        if (picks.length >= 2) picks = [];
        picks.push(idx);
        root.querySelectorAll("[data-cell]").forEach(function (b) {
          b.className = "h-9 rounded border border-slate-200 bg-white text-[10px] text-slate-400 hover:border-orange-300";
        });
        picks.forEach(function (p) {
          var b = root.querySelector("[data-cell=\"" + p + "\"]");
          b.className = "h-9 rounded border-2 border-orange-500 bg-orange-50 text-[10px] font-medium text-orange-800";
        });
      });
    });
    bind(root, "[data-action=\"plan\"]", "click", function () {
      if (picks.length < 2) {
        root.querySelector("[data-slot=\"path\"]").textContent = "请先选择起点与终点。";
        return;
      }
      var a = picks[0];
      var b = picks[1];
      var path = [];
      var x0 = a % 5, y0 = (a / 5) | 0, x1 = b % 5, y1 = (b / 5) | 0;
      var x = x0, y = y0;
      path.push(y * 5 + x);
      while (x !== x1) {
        x += x < x1 ? 1 : -1;
        path.push(y * 5 + x);
      }
      while (y !== y1) {
        y += y < y1 ? 1 : -1;
        path.push(y * 5 + x);
      }
      root.querySelectorAll("[data-cell]").forEach(function (el) {
        var i = +el.getAttribute("data-cell");
        if (path.indexOf(i) >= 0 && picks.indexOf(i) < 0) {
          el.className = "h-9 rounded border border-orange-200 bg-orange-100 text-[10px] text-orange-900";
        }
      });
      root.querySelector("[data-slot=\"path\"]").textContent =
        "模拟路径（曼哈顿距离）：经过 " + path.length + " 格，偏好无障碍主通道（演示）。";
    });
  }

  function demoObjectDetect(root) {
    root.innerHTML = shell("目标检测预览", (
      '<div class="relative aspect-video max-h-52 w-full overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-sky-100 to-slate-200">' +
      '<div data-box="1" class="absolute left-[12%] top-[28%] hidden h-[22%] w-[18%] rounded border-2 border-orange-500 bg-orange-500/10 shadow-sm">' +
      '<span class="absolute -top-5 left-0 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] text-white">person 0.91</span></div>' +
      '<div data-box="2" class="absolute left-[55%] top-[48%] hidden h-[16%] w-[24%] rounded border-2 border-orange-500 bg-orange-500/10">' +
      '<span class="absolute -top-5 left-0 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] text-white">pallet 0.84</span></div></div>' +
      '<button type="button" data-action="run" class="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">运行检测（模拟）</button>' +
      '<p data-slot="cnt" class="mt-2 text-xs text-slate-600"></p>'
    ));
    bind(root, "[data-action=\"run\"]", "click", function () {
      root.querySelector("[data-box=\"1\"]").classList.remove("hidden");
      root.querySelector("[data-box=\"2\"]").classList.remove("hidden");
      root.querySelector("[data-slot=\"cnt\"]").textContent = "计数：人员 1 · 托盘 1 · 推理耗时 42ms（模拟）";
    });
  }

  function demoSmartOffice(root, product) {
    var href = "smart-office.html";
    if (product && product.id) {
      href += "?id=" + encodeURIComponent(String(product.id));
    }
    root.innerHTML = shell("智能办公工作台（独立页面）", (
      '<p class="text-sm leading-relaxed text-slate-600">本模块提供独立工作台页面，通过服务端 DeepSeek 大模型完成报销、简历、招标、合同等多场景文档审查。</p>' +
      '<p class="mt-2 text-xs text-slate-500">请在 Docker 环境变量或项目根目录 <code class="rounded bg-slate-100 px-1">.env</code> 中配置 <code class="rounded bg-slate-100 px-1">DEEPSEEK_API_KEY</code> 后使用。</p>' +
      '<a href="' + href + '" class="mt-4 inline-flex items-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600">进入智能办公工作台</a>'
    ));
  }

  function demoLongContextQa(root) {
    var DOCS = {
      "服务合同": {
        title: "技术服务协议（模拟）",
        chapters: [
          { id: "art1", label: "第 1 条  定义与解释", text: "本协议中「服务」指乙方按照附件 A 所列技术规格提供的软件开发与运维支持。「交付物」包括源代码、编译产物、接口文档与部署说明。术语若无特别定义，则按照行业惯例解释。双方确认已充分理解并同意各条款含义。" },
          { id: "art2", label: "第 2 条  服务范围", text: "乙方应在项目启动后 90 日内完成核心模块开发并通过验收测试。服务范围包含需求分析、架构设计、编码实现、单元测试与集成测试。超出附件 A 范围的新增需求须另行签署补充协议并按人天报价。" },
          { id: "art3", label: "第 3 条  服务期限", text: "本协议自双方签署之日起生效，初始服务期为 24 个月。服务期届满前 60 日，任何一方均可书面提出续约意向，双方协商一致后签署续约协议。若未达成续约，协议到期自动终止。" },
          { id: "art4", label: "第 4 条  费用与结算", text: "项目总费用为人民币伍拾万元整，分四期支付：签约后 7 日内支付 30%，核心模块验收后支付 30%，整体验收后支付 30%，质保期满后支付 10%。每期付款前乙方应开具等额增值税专用发票。" },
          { id: "art5", label: "第 5 条  交付与验收", text: "乙方应在各里程碑节点提交交付物与测试报告。甲方应在收到交付物后 10 个工作日内完成验收或提出书面整改意见。逾期未提出视为验收通过。整改完成后重新进入验收流程。" },
          { id: "art6", label: "第 6 条  知识产权", text: "乙方为履行本协议所创作的代码、文档等知识产权在甲方付清全部费用后转让给甲方。乙方保留其通用工具、框架和预置组件的所有权，甲方获得不可撤销的永久使用许可。" },
          { id: "art7", label: "第 7 条  保密义务", text: "双方对在履行协议过程中获知的对方商业秘密、技术信息和客户数据承担保密义务。保密期限自获知之日起至信息公开后 3 年止。违反保密义务的一方应赔偿对方因此遭受的全部损失。" },
          { id: "art8", label: "第 8 条  数据安全", text: "乙方处理甲方数据时应遵守适用法律和附件 B 数据处理协议（DPA）。数据存储须位于中国境内服务器。乙方不得将数据用于协议约定之外的任何目的，并在协议终止后 30 日内删除或返还所有数据。" },
          { id: "art9", label: "第 9 条  质量保证", text: "乙方承诺交付的软件符合附件 A 所列功能规格与性能指标。验收通过后提供 12 个月免费质保，质保期内对程序错误提供免费修复。人为误操作、第三方组件固有缺陷不在质保范围内。" },
          { id: "art10", label: "第 10 条  违约责任", text: "任何一方违反协议条款给对方造成损失的，应承担赔偿责任。乙方延期交付超过 30 日的，每逾期一日按未交付部分对应金额的 0.05% 支付违约金。违约金总额累计不超过协议总金额的 20%。" },
          { id: "art11", label: "第 11 条  不可抗力", text: "因地震、洪水、疫情、战争或政府禁令等不可抗力导致无法履约的，受影响方应在 7 日内书面通知对方并提供证明。双方协商延期或终止协议，互不承担违约责任。" },
          { id: "art12", label: "第 12 条  协议终止", text: "任何一方提前 30 日书面通知可终止本协议，终止前已产生的费用仍应结算。一方严重违约且收到书面催告后 15 日内未纠正的，守约方可单方解除协议并要求赔偿。协议终止不影响已产生的权利义务。" },
          { id: "art13", label: "第 13 条  争议解决", text: "因本协议产生的争议，双方应首先友好协商。协商不成的，提交北京仲裁委员会按其仲裁规则进行仲裁。仲裁裁决为终局的，对双方均有约束力。" }
        ]
      },
      "制度手册": {
        title: "员工考勤与假期管理制度（模拟）",
        chapters: [
          { id: "sec1", label: "第 1 章  总则", text: "本制度依据《劳动法》及公司规章制度制定，适用于全体员工。制度旨在规范考勤管理、保障员工休息休假权利、维护正常生产经营秩序。各部门应严格执行并于每月 5 日前提交上月考勤汇总。" },
          { id: "sec2", label: "第 2 章  工作时间", text: "公司实行标准工时制，每周工作 5 天，每日工作 8 小时。核心工作时间为 9:00—18:00，含午休 12:00—13:00。特殊岗位可申请弹性工作制，经部门负责人和 HR 审批后执行。研发岗位默认弹性上下班。" },
          { id: "sec3", label: "第 3 章  年假管理", text: "累计工作满 1 年不满 10 年的，年假 5 天；满 10 年不满 20 年的，年假 10 天；满 20 年的，年假 15 天。年假按自然年度计算，须在次年 3 月底前休完。申请年假需提前 3 日在 OA 提交，经直属主管审批。" },
          { id: "sec4", label: "第 4 章  病假与事假", text: "病假凭二级以上医院证明申请，3 天以内由主管审批，超过 3 天由 HR 审批。病假期间工资按国家规定发放。事假须提前申请，全年累计不超过 15 天，事假期间无薪。" },
          { id: "sec5", label: "第 5 章  加班管理", text: "工作日加班按 1.5 倍计算加班费或调休，休息日加班按 2 倍计算，法定节假日加班按 3 倍计算。加班须事先经主管审批同意，未经审批的加班不计入考勤。优先安排调休，调休不得跨年使用。各部门严格控制加班时长，月人均加班不超过 36 小时。" },
          { id: "sec6", label: "第 6 章  婚假与产假", text: "员工结婚享受婚假 3 天，晚婚（男 25 岁、女 23 岁以上）增加 7 天。女员工产假 98 天（含产前 15 天），难产增加 15 天，多胞胎每多一胎增加 15 天。男员工陪产假 15 天。须提前 30 日凭有效证明申请。" },
          { id: "sec7", label: "第 7 章  迟到与旷工", text: "迟到超过 30 分钟计旷工半天。月累计迟到 3 次以上记书面警告。连续旷工 3 天或年累计旷工 7 天以上的，公司有权解除劳动合同。考勤异常应在 2 日内通过 OA 补办手续。" },
          { id: "sec8", label: "第 8 章  附则", text: "本制度由人力资源部负责解释和修订。制度如有更新以最新版本为准，更新后通过公司内网公告。本制度自发布之日起施行，原有考勤规定同时废止。" }
        ]
      },
      "行业研报": {
        title: "新能源行业季度景气报告（模拟）",
        chapters: [
          { id: "rep1", label: "一、宏观环境", text: "本季度国内 GDP 增速环比回升至 5.2%，制造业 PMI 连续三个月位于扩张区间。新能源汽车购置税减免政策延续至 2027 年底，储能补贴试点城市扩至 30 个。欧盟碳关税过渡期启动，对出口企业碳足迹核算提出新要求。" },
          { id: "rep2", label: "二、产业链分析", text: "上游锂电材料价格经历连续 6 个月下行后企稳，碳酸锂均价回落至 12 万元/吨。中游电池厂商产能利用率回升至 78%，头部企业毛利率改善 3—5 个百分点。下游整车端价格竞争加剧，渗透率突破 45%。" },
          { id: "rep3", label: "三、竞争格局", text: "行业集中度 CR5 约 58%，较去年同期提升 5 个百分点。龙头企业通过垂直整合与规模效应持续挤压中小厂商。二线企业聚焦细分市场如换电重卡、储能系统寻求差异化突围。外资品牌在华份额下滑至 12%。" },
          { id: "rep4", label: "四、技术趋势", text: "固态电池研发加速，半固态产品预计 2026 年下半年量产装车。800V 高压平台渗透率快速提升，推动碳化硅功率器件需求增长。钠离子电池储能项目落地加速，成本优势在储能场景逐步显现。" },
          { id: "rep5", label: "五、投资建议", text: "维持行业标配评级。锂电材料环节库存去化接近尾声，关注龙头企业估值修复机会。整车环节竞争烈度上行，优选有海外市场拓展能力与成本控制优势的公司。储能赛道景气度持续，设备与集成商值得关注。" },
          { id: "rep6", label: "六、风险提示", text: "产能过剩风险从材料向电芯环节传导，行业平均毛利率有持续下行压力。海外贸易壁垒升级可能影响出口业务。锂资源进口依赖度仍高，地缘政治扰动构成供应链风险。终端需求增速放缓可能引发新一轮价格战。" }
        ]
      },
      "技术白皮书": {
        title: "零信任安全架构白皮书（模拟）",
        chapters: [
          { id: "zt1", label: "1. 概述", text: "零信任（Zero Trust）是一种以「永不信任，始终验证」为核心原则的网络安全模型。与传统边界安全模型不同，零信任假定网络始终处于被攻陷状态，不对任何用户、设备或流量给予隐式信任。本白皮书阐述企业落地零信任架构的核心理念、技术组件与实施路径。" },
          { id: "zt2", label: "2. 核心理念", text: "零信任建立在三个核心原则上：一是显式验证，始终基于所有可用数据点进行身份认证与授权；二是最小权限，仅授予用户完成当前任务所需的最少访问权限；三是假定入侵，对每一次访问请求都当作来自被攻陷的网络来处理，做最小化爆炸半径的设计。" },
          { id: "zt3", label: "3. 身份与访问管理", text: "采用多因素认证（MFA）作为基础身份验证手段，结合生物特征、硬件令牌等增强认证强度。权限管理采用基于角色的访问控制（RBAC）与基于属性的访问控制（ABAC）结合，实现动态细粒度授权。建议与现有 LDAP/AD 和 IAM 系统集成。" },
          { id: "zt4", label: "4. 微隔离技术", text: "通过软件定义边界（SDP）在工作负载之间建立细粒度隔离策略，使攻击者在获得单一主机访问权限后无法横向移动。微隔离策略可基于标签（如环境、应用、合规等级）自动生成，并通过策略即代码方式纳入 CI/CD 流水线管理。" },
          { id: "zt5", label: "5. 持续监控与分析", text: "部署统一的遥测数据采集平台，收集网络流量、终端行为、身份认证和 API 调用日志。通过 UEBA（用户实体行为分析）和机器学习模型识别异常行为模式。建立 SOAR（安全编排自动化与响应）剧本，对高风险事件触发自动隔离、强制重认证等措施。" },
          { id: "zt6", label: "6. 数据安全", text: "零信任架构下的数据保护采用分类分级、加密与访问控制三层防护。敏感数据强制启用透明数据加密（TDE），传输过程使用 TLS 1.3，密钥管理通过硬件安全模块（HSM）集中托管。数据访问日志记录所有读取、修改和导出操作，满足审计与合规要求。" },
          { id: "zt7", label: "7. 实施路径建议", text: "建议采用分阶段渐进式路径：第一阶段梳理资产与敏感数据全貌，部署 MFA 与设备合规检查；第二阶段实施应用层微隔离，替代传统 VPN 访问；第三阶段引入 UEBA 分析能力，打通 SIEM/SOAR 联动；第四阶段实现自适应访问控制与策略自动化。" },
          { id: "zt8", label: "8. 常见误区与应对", text: "误区一：认为零信任就是单一产品。实际上零信任是体系化架构，需身份、设备、网络、数据多层面协同。误区二：一次性全量部署。应基于风险评估分批次推进，从最敏感的资产开始。误区三：忽视用户体验。策略过度收紧将降低生产力，需在安全与易用间取得平衡。" }
        ]
      }
    };

    var QA_PRESETS = {
      "服务合同": [
        { kw: ["终止", "提前", "通知", "解除"], answer: "根据<strong class=\"text-orange-600\">第 12 条</strong>，任何一方提前<strong>至少 30 日书面通知</strong>可终止本协议，终止前已产生的费用仍应结算。若一方严重违约且收到催告后<strong>15 日内未纠正</strong>，守约方可单方解除协议。", ref: { id: "art12", label: "第 12 条  协议终止" } },
        { kw: ["保密", "数据", "信息", "商业秘密"], answer: "根据<strong class=\"text-orange-600\">第 7 条</strong>和第<strong class=\"text-orange-600\">8 条</strong>，双方承担保密义务，保密期限至信息公开后 <strong>3 年</strong>。数据处理须遵守 DPA 附件 B，存储在中国境内，协议终止后 <strong>30 日内</strong>删除或返还数据。", ref: { id: "art7", label: "第 7 条  保密义务" } },
        { kw: ["费用", "支付", "结算", "金额", "多少钱"], answer: "根据<strong class=\"text-orange-600\">第 4 条</strong>，项目总费用为<strong>人民币伍拾万元整</strong>，分四期支付：签约后付 <strong>30%</strong>、核心验收后付 30%、整体验收后付 30%、质保期满后付 10%。每期付款前乙方应开具等额增值税专用发票。", ref: { id: "art4", label: "第 4 条  费用与结算" } },
        { kw: ["违约", "赔偿", "延期", "违约金"], answer: "根据<strong class=\"text-orange-600\">第 10 条</strong>，乙方延期交付超过 <strong>30 日</strong>的，每逾期一日按未交付部分 <strong>0.05%</strong> 支付违约金，累计上限不超过协议总额的 <strong>20%</strong>。任何违约方应赔偿对方实际损失。", ref: { id: "art10", label: "第 10 条  违约责任" } },
        { kw: ["知识产权", "代码", "归属", "专利", "著作权"], answer: "根据<strong class=\"text-orange-600\">第 6 条</strong>，甲方付清全部费用后获得代码和文档的知识产权。乙方保留通用工具和预置组件的所有权，甲方获得<strong>不可撤销的永久使用许可</strong>。", ref: { id: "art6", label: "第 6 条  知识产权" } },
        { kw: ["质量", "保证", "质保", "bug", "缺陷", "维护"], answer: "根据<strong class=\"text-orange-600\">第 9 条</strong>，验收通过后提供 <strong>12 个月免费质保</strong>，对程序错误提供免费修复。人为误操作和第三方组件固有缺陷不在质保范围内。", ref: { id: "art9", label: "第 9 条  质量保证" } }
      ],
      "制度手册": [
        { kw: ["年假", "请假", "休假", "假期"], answer: "根据<strong class=\"text-orange-600\">第 3 章</strong>，累计工作满 1 年不满 10 年的年假 <strong>5 天</strong>，满 10 年不满 20 年的年假 <strong>10 天</strong>，满 20 年的年假 <strong>15 天</strong>。须在次年 <strong>3 月底前</strong>休完，申请需提前 <strong>3 日</strong>在 OA 提交并获直属主管审批。", ref: { id: "sec3", label: "第 3 章  年假管理" } },
        { kw: ["加班", "调休", "加班费", "工时"], answer: "根据<strong class=\"text-orange-600\">第 5 章</strong>，工作日加班按 <strong>1.5 倍</strong>，休息日按 <strong>2 倍</strong>，法定节假日按 <strong>3 倍</strong>。优先安排调休（不可跨年），月人均加班不超过 <strong>36 小时</strong>。加班须事先经主管审批。", ref: { id: "sec5", label: "第 5 章  加班管理" } },
        { kw: ["病假", "事假", "医疗", "证明"], answer: "根据<strong class=\"text-orange-600\">第 4 章</strong>，病假凭<strong>二级以上医院证明</strong>申请，3 天以内主管审批，超过 3 天 HR 审批。事假全年累计不超过 <strong>15 天</strong>，事假期间无薪。病假期间工资按国家规定发放。", ref: { id: "sec4", label: "第 4 章  病假与事假" } },
        { kw: ["婚假", "产假", "陪产假", "结婚"], answer: "根据<strong class=\"text-orange-600\">第 6 章</strong>，婚假 <strong>3 天</strong>（晚婚增加 7 天），女员工产假 <strong>98 天</strong>（含产前 15 天），男员工陪产假 <strong>15 天</strong>。须提前 <strong>30 日</strong>凭有效证明申请。", ref: { id: "sec6", label: "第 6 章  婚假与产假" } },
        { kw: ["迟到", "旷工", "缺勤", "打卡"], answer: "根据<strong class=\"text-orange-600\">第 7 章</strong>，迟到超 <strong>30 分钟</strong>计旷工半天，月累计 <strong>3 次</strong>以上记书面警告。连续旷工 <strong>3 天</strong>或年累计旷工 <strong>7 天</strong>以上，公司有权解除劳动合同。", ref: { id: "sec7", label: "第 7 章  迟到与旷工" } }
      ],
      "行业研报": [
        { kw: ["趋势", "景气", "增速", "宏观", "环境"], answer: "根据报告<strong class=\"text-orange-600\">「宏观环境」</strong>部分，GDP 增速 <strong>5.2%</strong>，PMI 连续三个月扩张。新能源汽车购置税减免延续至 <strong>2027 年底</strong>，储能补贴试点城市扩至 <strong>30 个</strong>。欧盟碳关税过渡期启动，需关注出口核算要求。", ref: { id: "rep1", label: "一、宏观环境" } },
        { kw: ["锂", "材料", "电池", "价格", "上游", "成本"], answer: "根据报告<strong class=\"text-orange-600\">「产业链分析」</strong>部分，碳酸锂均价回落至 <strong>12 万元/吨</strong>，电池厂商产能利用率回升至 <strong>78%</strong>，头部企业毛利率改善 <strong>3—5 个百分点</strong>。下游整车端渗透率突破 <strong>45%</strong>。", ref: { id: "rep2", label: "二、产业链分析" } },
        { kw: ["竞争", "格局", "份额", "集中度", "龙头"], answer: "根据报告<strong class=\"text-orange-600\">「竞争格局」</strong>部分，行业集中度 CR5 约 <strong>58%</strong>（同比 +5pp），龙头企业通过垂直整合与规模效应挤压中小厂商。外资品牌在华份额下滑至 <strong>12%</strong>。", ref: { id: "rep3", label: "三、竞争格局" } },
        { kw: ["风险", "产能过剩", "贸易", "壁垒", "隐患"], answer: "根据报告<strong class=\"text-orange-600\">「风险提示」</strong>部分，产能过剩风险从材料向电芯传导，行业平均毛利率有持续下行压力。海外贸易壁垒升级、锂资源进口依赖度高、终端需求增速放缓均构成核心风险。", ref: { id: "rep6", label: "六、风险提示" } },
        { kw: ["投资", "建议", "推荐", "配置", "关注"], answer: "维持行业<strong class=\"text-orange-600\">标配评级</strong>。锂电材料库存去化尾声关注估值修复，整车环节优选有海外能力与成本优势的公司，储能赛道景气持续关注设备与集成商。", ref: { id: "rep5", label: "五、投资建议" } }
      ],
      "技术白皮书": [
        { kw: ["零信任", "定义", "概念", "是什么", "概述"], answer: "根据白皮书<strong class=\"text-orange-600\">「概述」</strong>部分，零信任（Zero Trust）核心理念是<strong>「永不信任，始终验证」</strong>。假定网络始终处于被攻陷状态，不对任何用户、设备或流量给予隐式信任。", ref: { id: "zt1", label: "1. 概述" } },
        { kw: ["原则", "核心", "理念", "三大原则"], answer: "根据白皮书<strong class=\"text-orange-600\">「核心理念」</strong>部分，零信任三大原则：一是<strong>显式验证</strong>，基于所有可用数据认证授权；二是<strong>最小权限</strong>，仅授予完成任务所需最少权限；三是<strong>假定入侵</strong>，最小化爆炸半径。", ref: { id: "zt2", label: "2. 核心理念" } },
        { kw: ["mfa", "认证", "身份", "登录", "权限", "iam"], answer: "根据白皮书<strong class=\"text-orange-600\">「身份与访问管理」</strong>部分，采用<strong>多因素认证（MFA）</strong>作为基础手段，结合 RBAC 与 ABAC 实现动态细粒度授权，建议与现有 LDAP/AD 和 IAM 系统集成。", ref: { id: "zt3", label: "3. 身份与访问管理" } },
        { kw: ["微隔离", "sdp", "横向移动", "网络"], answer: "根据白皮书<strong class=\"text-orange-600\">「微隔离技术」</strong>部分，通过<strong>SDP</strong>在工作负载间建立细粒度隔离，阻止攻击者横向移动。策略基于标签自动生成，通过策略即代码纳入 CI/CD 流水线管理。", ref: { id: "zt4", label: "4. 微隔离技术" } },
        { kw: ["实施", "路径", "部署", "落地", "阶段"], answer: "建议<strong>分四阶段</strong>渐进实施：第一阶段梳理资产并部署 MFA；第二阶段实施应用层微隔离替代 VPN；第三阶段引入 UEBA 与 SOAR 联动；第四阶段实现自适应访问控制与策略自动化。", ref: { id: "zt7", label: "7. 实施路径建议" } },
        { kw: ["误区", "错误", "注意", "坑", "避免"], answer: "常见误区有三：一是认为零信任是<strong>单一产品</strong>（实际是体系化架构）；二是<strong>一次性全量部署</strong>（应分批次从最敏感资产开始）；三是<strong>忽视用户体验</strong>（过度收紧策略将降低生产力）。", ref: { id: "zt8", label: "8. 常见误区与应对" } }
      ]
    };

    var EXTRACT_PRESETS = {
      "服务合同": {
        "全部条款": ["第 1 条  定义与解释", "第 2 条  服务范围", "第 4 条  费用与结算", "第 6 条  知识产权", "第 7 条  保密义务", "第 8 条  数据安全", "第 10 条  违约责任", "第 12 条  协议终止", "第 13 条  争议解决"],
        "核心义务": ["第 2 条  服务范围 — 乙方的核心交付义务", "第 4 条  费用与结算 — 甲方的付款义务", "第 5 条  交付与验收 — 双方的验收义务"],
        "风险条款": ["第 10 条  违约责任 — 延期违约金 0.05%/日", "第 11 条  不可抗力 — 免责情形", "第 12 条  协议终止 — 提前 30 日通知"]
      },
      "制度手册": {
        "全部要点": ["第 2 章  工作时间", "第 3 章  年假管理", "第 4 章  病假与事假", "第 5 章  加班管理", "第 6 章  婚假与产假", "第 7 章  迟到与旷工"],
        "员工权益": ["第 3 章  年假管理 — 5—15 天年假", "第 5 章  加班管理 — 1.5—3 倍加班费", "第 6 章  婚假与产假 — 婚假 3 天/产假 98 天"],
        "纪律条款": ["第 7 章  迟到与旷工 — 迟到 30 分钟计旷工半天", "第 7 章  旷工 — 连续 3 天可解除合同"]
      },
      "行业研报": {
        "全部要点": ["一、宏观环境 — GDP 5.2%，政策延续", "二、产业链分析 — 锂价企稳，产能利用率 78%", "三、竞争格局 — CR5 58%", "四、技术趋势 — 固态电池 2026H2 量产", "五、投资建议 — 标配评级", "六、风险提示 — 产能过剩/贸易壁垒"],
        "核心数据": ["GDP 增速 5.2%", "碳酸锂均价 12 万元/吨", "产能利用率 78%", "CR5 集中度 58%", "新能源渗透率 45%"],
        "风险因素": ["产能过剩从材料向电芯传导", "海外贸易壁垒升级", "锂资源进口依赖度高", "终端需求增速放缓"]
      },
      "技术白皮书": {
        "全部要点": ["概述 — 永不信任始终验证", "核心理念 — 三大原则", "身份与访问管理 — MFA+RBAC+ABAC", "微隔离技术 — SDP", "持续监控与分析 — UEBA+SOAR", "数据安全 — 加密+分类分级", "实施路径 — 四阶段渐进", "常见误区 — 非单一产品"],
        "关键技术": ["多因素认证 MFA", "软件定义边界 SDP", "用户实体行为分析 UEBA", "透明数据加密 TDE", "安全编排自动化与响应 SOAR"],
        "实施步骤": ["第一阶段: 资产梳理 + MFA 部署", "第二阶段: 微隔离替代 VPN", "第三阶段: UEBA + SOAR 联动", "第四阶段: 自适应访问控制"]
      }
    };

    var EXTRACT_OPTIONS = {
      "服务合同": ["全部条款", "核心义务", "风险条款"],
      "制度手册": ["全部要点", "员工权益", "纪律条款"],
      "行业研报": ["全部要点", "核心数据", "风险因素"],
      "技术白皮书": ["全部要点", "关键技术", "实施步骤"]
    };

    var currentDoc = "服务合同";
    var chatHistory = [];
    var chatVersion = 0;

    function renderDocView() {
      var doc = DOCS[currentDoc];
      var navEl = root.querySelector("[data-slot=\"nav-links\"]");
      var bodyEl = root.querySelector("[data-slot=\"doc-body\"]");
      var navHtml = "";
      var bodyHtml = '<p class="font-semibold text-slate-900 mb-2 text-xs">' + escapeHtml(doc.title) + '</p>';
      for (var i = 0; i < doc.chapters.length; i++) {
        var ch = doc.chapters[i];
        navHtml += '<button type="button" data-nav="' + ch.id + '" class="w-full text-left rounded-lg px-2 py-1.5 text-[11px] leading-relaxed text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition">' + escapeHtml(ch.label) + '</button>';
        bodyHtml += '<p data-sec="' + ch.id + '" class="rounded-lg transition-all ' + (i === 0 ? '' : 'mt-2') + '">' +
          '<strong class="text-slate-800">' + escapeHtml(ch.label) + '</strong><br/>' +
          escapeHtml(ch.text) + '</p>';
      }
      navEl.innerHTML = navHtml;
      bodyEl.innerHTML = bodyHtml;
      navEl.querySelectorAll("[data-nav]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-nav");
          var target = bodyEl.querySelector("[data-sec=\"" + id + "\"]");
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            target.classList.add("bg-amber-50");
            setTimeout(function () { target.classList.remove("bg-amber-50"); }, 1500);
          }
        });
      });
      renderExtractDropdown();
    }

    function renderExtractDropdown() {
      var sel = root.querySelector("[data-field=\"extract-type\"]");
      if (!sel) return;
      var options = EXTRACT_OPTIONS[currentDoc] || [];
      var html = '<option value="">-- 选择抽取类型 --</option>';
      for (var i = 0; i < options.length; i++) {
        html += '<option value="' + escapeHtml(options[i]) + '">' + escapeHtml(options[i]) + '</option>';
      }
      sel.innerHTML = html;
    }

    function matchQA(question, docType) {
      var presets = QA_PRESETS[docType] || [];
      var q = question.toLowerCase();
      for (var i = 0; i < presets.length; i++) {
        var p = presets[i];
        for (var j = 0; j < p.kw.length; j++) {
          if (q.indexOf(p.kw[j].toLowerCase()) >= 0) {
            return p;
          }
        }
      }
      var hints = {
        "服务合同": "建议围绕合同条款提问，例如：终止条件、费用结算、保密义务、知识产权归属、违约责任等。",
        "制度手册": "建议围绕考勤制度提问，例如：年假天数、加班政策、病假申请、婚假产假、迟到旷工处理等。",
        "行业研报": "建议围绕研报内容提问，例如：行业趋势、产业链分析、竞争格局、技术趋势、投资建议、风险提示等。",
        "技术白皮书": "建议围绕零信任架构提问，例如：核心理念、身份管理、微隔离、实施路径、常见误区等。"
      };
      return {
        answer: '该问题在「' + escapeHtml(DOCS[docType].title) + '」中未找到明确匹配的条款或段落。<br/><br/><span class="text-slate-500 text-xs">' + (hints[docType] || '') + '</span>',
        ref: null
      };
    }

    function addChatBubble(role, text, ref) {
      var chatEl = root.querySelector("[data-slot=\"chat\"]");
      var isUser = role === "user";
      var html = '<div class="flex ' + (isUser ? 'justify-end' : 'justify-start') + '">' +
        '<div class="max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ' + (isUser ? 'bg-orange-500 text-white' : 'bg-white text-slate-700 border border-slate-200') + '">' +
        text + '</div></div>';
      if (ref) {
        html += '<div class="flex justify-start mt-1"><button type="button" data-ref="' + ref.id + '" class="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 transition hover:bg-amber-100">定位到 ' + escapeHtml(ref.label) + '</button></div>';
      }
      var temp = document.createElement("div");
      temp.innerHTML = html;
      while (temp.firstChild) {
        chatEl.appendChild(temp.firstChild);
      }
      chatEl.querySelectorAll("[data-ref]:not([data-bound])").forEach(function (btn) {
        btn.setAttribute("data-bound", "1");
        var refId = btn.getAttribute("data-ref");
        btn.addEventListener("click", function () {
          var bodyEl = root.querySelector("[data-slot=\"doc-body\"]");
          var target = bodyEl.querySelector("[data-sec=\"" + refId + "\"]");
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.classList.add("bg-amber-100", "ring-2", "ring-orange-400");
            setTimeout(function () {
              target.classList.remove("bg-amber-100", "ring-2", "ring-orange-400");
            }, 2000);
          }
        });
      });
      chatEl.scrollTop = chatEl.scrollHeight;
    }

    function extractClauses(type) {
      var presets = EXTRACT_PRESETS[currentDoc];
      if (!presets || !presets[type]) {
        addChatBubble("ai", '当前文档类型不支持「' + escapeHtml(type) + '」抽取。请切换抽取类型后重试。', null);
        return;
      }
      var listHtml = '<div class="rounded-lg border border-amber-200 bg-amber-50 p-2 mb-2 text-xs text-amber-800">所抽取的关键条款来自「' + escapeHtml(DOCS[currentDoc].title) + '」· 类型：' + escapeHtml(type) + '</div>';
      listHtml += '<ul class="space-y-1">';
      var items = presets[type];
      for (var i = 0; i < items.length; i++) {
        listHtml += '<li class="flex items-center gap-1.5 text-xs text-slate-700"><span class="inline-flex h-1 w-1 rounded-full bg-orange-500 shrink-0"></span>' + escapeHtml(items[i]) + '</li>';
      }
      listHtml += '</ul>';
      addChatBubble("ai", listHtml, null);
      chatHistory.push({ role: "ai", text: listHtml });
    }

    root.innerHTML = shell("长文本问答与追溯", (
      '<div class="flex flex-wrap gap-2 mb-4">' +
      ["服务合同", "制度手册", "行业研报", "技术白皮书"].map(function (t) {
        return '<button type="button" data-tab="' + t + '" class="rounded-full px-3.5 py-1.5 text-xs font-medium transition ' + (t === currentDoc ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') + '">' + escapeHtml(t) + '</button>';
      }).join("") +
      '</div>' +
      '<div class="grid gap-4 lg:grid-cols-2">' +
      '<div>' +
      '<p class="text-xs font-medium text-slate-600 mb-2">文档预览与章节导航</p>' +
      '<div class="flex gap-3">' +
      '<div data-slot="nav-links" class="w-32 shrink-0 max-h-[420px] overflow-y-auto space-y-0.5 rounded-xl border border-slate-200 bg-slate-50/50 p-2"></div>' +
      '<div data-slot="doc-body" class="min-w-0 flex-1 max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600"></div>' +
      '</div>' +
      '</div>' +
      '<div>' +
      '<p class="text-xs font-medium text-slate-600 mb-2">多轮对话与关键条款抽取</p>' +
      '<div class="mb-3 flex items-center gap-2">' +
      '<select data-field="extract-type" class="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"></select>' +
      '<button type="button" data-action="extract" class="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100">抽取</button>' +
      '</div>' +
      '<div data-slot="chat" class="max-h-[300px] overflow-y-auto space-y-2 mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"></div>' +
      '<div class="flex gap-2">' +
      '<input type="text" data-field="question" placeholder="输入问题，例如：提前终止需要提前多久通知？" ' +
      'class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none ring-orange-500/20 transition focus:border-orange-500 focus:bg-white focus:ring-4" />' +
      '<button type="button" data-action="send" class="shrink-0 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-orange-500/25 hover:bg-orange-600">发送</button>' +
      '</div>' +
      '<div class="mt-2 flex items-center gap-2">' +
      '<button type="button" data-action="clear" class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">清空对话</button>' +
      '<span class="text-[10px] text-slate-400">上下文连续追问 · 模拟演示</span>' +
      '</div>' +
      '</div>' +
      '</div>'
    ));

    renderDocView();

    root.querySelectorAll("[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var newDoc = btn.getAttribute("data-tab");
        if (newDoc === currentDoc) return;
        currentDoc = newDoc;
        chatVersion++;
        root.querySelectorAll("[data-tab]").forEach(function (b) {
          b.className = "rounded-full px-3.5 py-1.5 text-xs font-medium transition " +
            (b.getAttribute("data-tab") === currentDoc ? "bg-orange-500 text-white shadow-sm shadow-orange-500/25" : "bg-slate-100 text-slate-600 hover:bg-slate-200");
        });
        chatHistory = [];
        root.querySelector("[data-slot=\"chat\"]").innerHTML = "";
        renderDocView();
      });
    });

    bind(root, "[data-action=\"send\"]", "click", function () {
      var inp = root.querySelector("[data-field=\"question\"]");
      var question = inp.value.trim();
      if (!question) return;
      var docAtAsk = currentDoc;
      var versionAtAsk = chatVersion;
      addChatBubble("user", escapeHtml(question), null);
      chatHistory.push({ role: "user", text: question });
      inp.value = "";
      var chatEl = root.querySelector("[data-slot=\"chat\"]");
      var loadingWrapper = document.createElement("div");
      loadingWrapper.className = "flex justify-start";
      loadingWrapper.setAttribute("data-loading", "1");
      loadingWrapper.innerHTML = '<div class="rounded-2xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-500">' + spinHtml() + ' 正在检索文档…</div>';
      chatEl.appendChild(loadingWrapper);
      chatEl.scrollTop = chatEl.scrollHeight;
      setTimeout(function () {
        var loader = chatEl.querySelector("[data-loading]");
        if (loader) loader.remove();
        if (versionAtAsk !== chatVersion || docAtAsk !== currentDoc) return;
        var result = matchQA(question, docAtAsk);
        addChatBubble("ai", result.answer, result.ref);
        chatHistory.push({ role: "ai", text: result.answer, ref: result.ref });
      }, 800);
    });

    bind(root, "[data-field=\"question\"]", "keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        root.querySelector("[data-action=\"send\"]").click();
      }
    });

    bind(root, "[data-action=\"extract\"]", "click", function () {
      var typeEl = root.querySelector("[data-field=\"extract-type\"]");
      var type = typeEl.value;
      if (!type) {
        addChatBubble("ai", '<span class="text-red-600">请先在左侧下拉框中选择要抽取的条款类型。</span>', null);
        return;
      }
      extractClauses(type);
      typeEl.value = "";
    });

    bind(root, "[data-action=\"clear\"]", "click", function () {
      chatVersion++;
      chatHistory = [];
      root.querySelector("[data-slot=\"chat\"]").innerHTML = "";
    });
  }

  // --- 按技术栈回退 ---

  function fallbackRag(root, product) {
    demoEnterpriseGpt(root, product);
  }

  function fallbackCode(root) {
    demoCopilot(root);
  }

  function fallbackNlp(root) {
    demoCompliance(root);
  }

  function fallbackMl(root) {
    demoCreditRisk(root);
  }

  function fallbackCv(root) {
    demoObjectDetect(root);
  }

  function fallbackAiops(root, product) {
    demoDevopsLogs(root, product);
  }

  function fallbackDialog(root) {
    root.innerHTML = shell("对话式流程（通用模拟）", (
      '<div data-slot="c" class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">' +
      "<p><span class=\"text-xs text-slate-400\">系统 · </span>您好，我可以帮您查询订单或转人工。</p></div>" +
      '<button type="button" data-action="go" class="mt-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white">模拟用户：查订单</button>'
    ));
    bind(root, "[data-action=\"go\"]", "click", function () {
      root.querySelector("[data-slot=\"c\"]").innerHTML +=
        '<p class="mt-2"><span class="text-xs text-orange-600">用户 · </span>我要查昨天下的订单。</p>' +
        '<p class="mt-2"><span class="text-xs text-slate-400">系统 · </span>已找到 1 笔待发货订单（模拟）。</p>';
    });
  }

  function fallbackGateway(root, product) {
    demoAdminRouter(root, product);
  }

  function fallbackDataViz(root) {
    demoDirectorSandbox(root);
  }

  function fallbackDefault(root) {
    fallbackDialog(root);
  }

  var BY_NAME = {
    "企业 GPT 助手": demoEnterpriseGpt,
    "代码 Copilot 企业版": demoCopilot,
    "合规审查 AI": demoCompliance,
    "金融研报生成器": demoFinReport,
    "信贷风控模型工作台": demoCreditRisk,
    "医疗影像辅助诊断": demoMedImaging,
    "临床路径建议引擎": demoClinicalPath,
    "DevOps 日志洞察": demoDevopsLogs,
    "客服话术优化": demoCxBot,
    "仅管理员：密钥与模型路由": demoAdminRouter,
    "行业总监专区：战略沙盘": demoDirectorSandbox,
    "员工自助：培训陪练": demoTrainBot,
    "问数智能体": demoAskData,
    "位置导航智能体": demoNavigation,
    "目标检测智能体": demoObjectDetect,
    "智能办公智能体": demoSmartOffice,
    "智能体问答（长文本）": demoLongContextQa
  };

  var BY_TECH = {
    "大模型与 RAG": fallbackRag,
    "代码与 IDE 智能": fallbackCode,
    "NLP 与文档智能": fallbackNlp,
    "机器学习与风控建模": fallbackMl,
    "计算机视觉": fallbackCv,
    "AIOps 与日志智能": fallbackAiops,
    "对话式 AI": fallbackDialog,
    "智能体编排与网关": fallbackGateway,
    "数据分析与可视化": fallbackDataViz,
    __default__: fallbackDefault
  };

  function mount(root, product) {
    if (!root) return;
    var name = (product && product.name) || "";
    var tech = (product && product.tech_stack) || "";
    var fn = BY_NAME[name] || BY_TECH[tech] || BY_TECH.__default__;
    try {
      fn(root, product || {});
    } catch (e) {
      root.innerHTML = shell("演示加载失败", '<p class="text-sm text-red-600">沙箱初始化异常，请刷新重试。</p>');
    }
  }

  window.PortalDemos = { mount: mount, sentimentMeta: sentimentMeta };
})();
