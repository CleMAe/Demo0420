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

  // --- 按产品名称 ---

  function demoEnterpriseGpt(root) {
    root.innerHTML = shell("企业知识检索（RAG）", (
      '<div class="space-y-4">' +
      '<label class="block text-xs font-medium text-slate-600">向内部知识库提问</label>' +
      '<div class="flex flex-col gap-2 sm:flex-row">' +
      '<input type="text" data-field="q" value="新员工如何申请年假？" ' +
      'class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none ring-orange-500/20 transition focus:border-orange-500 focus:bg-white focus:ring-4" />' +
      '<button type="button" data-action="ask" ' +
      'class="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600">' +
      "模拟检索" +
      "</button></div>" +
      '<div data-slot="out" class="hidden rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700"></div>' +
      "</div>"
    ));
    bind(root, "[data-action=\"ask\"]", "click", function () {
      var inp = root.querySelector("[data-field=\"q\"]");
      var out = root.querySelector("[data-slot=\"out\"]");
      var q = inp ? inp.value.trim() : "";
      out.classList.remove("hidden");
      out.innerHTML =
        '<p class="mb-3 flex items-center gap-2 text-xs text-slate-500">' + spinHtml() + " 正在检索制度库…</p>";
      setTimeout(function () {
        out.innerHTML =
          '<p class="font-medium text-slate-900">摘要回答</p>' +
          '<p class="mt-2">根据《员工手册》<strong class="font-medium text-orange-600">第 3.2 节</strong>，年假需提前在 OA 提交申请，' +
          "经直属主管审批；当年额度按司龄折算。以下引用片段可点击展开核对（模拟）。</p>" +
          '<div class="mt-3 flex flex-wrap gap-2">' +
          '<button type="button" class="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100">引用 · 员工手册 3.2</button>' +
          '<button type="button" class="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100">引用 · OA 流程说明</button>' +
          "</div>" +
          '<p class="mt-3 text-xs text-slate-500">问题：' + escapeHtml(q || "（空）") + "</p>";
      }, 700);
    });
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

  function demoCompliance(root) {
    root.innerHTML = shell("条款风险初筛", (
      '<ul class="space-y-3 text-sm">' +
      '<li class="rounded-xl border border-slate-200 bg-white p-3" data-clause="1">甲方可在<strong class="text-slate-900">不事先通知</strong>的情况下调整服务价格。</li>' +
      '<li class="rounded-xl border border-slate-200 bg-white p-3" data-clause="2">乙方对因不可抗力造成的损失<strong class="text-slate-900">承担全部赔偿责任</strong>。</li>' +
      '<li class="rounded-xl border border-slate-200 bg-white p-3" data-clause="3">争议提交<strong class="text-slate-900">甲方所在地</strong>法院专属管辖。</li>' +
      "</ul>" +
      '<button type="button" data-action="scan" class="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600">' +
      "运行模拟扫描" +
      "</button>"
    ));
    bind(root, "[data-action=\"scan\"]", "click", function () {
      var items = root.querySelectorAll("[data-clause]");
      items.forEach(function (li, i) {
        var risks = ["偏离模板：单方调价权过宽", "权责不对等：不可抗力全赔", "管辖条款：需复核是否可接受"];
        li.innerHTML =
          li.textContent +
          ' <span class="mt-2 inline-flex rounded-lg bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">' +
          escapeHtml(risks[i]) +
          "</span>";
      });
    });
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
    root.innerHTML = shell("影像浏览与初筛（演示）", (
      '<div class="relative aspect-video max-h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-800 to-slate-600">' +
      '<div class="absolute inset-0 opacity-40" style="background-image:radial-gradient(circle at 30% 40%,#fff 0.5px,transparent 0.5px);background-size:8px 8px"></div>' +
      '<button type="button" data-action="pin" class="absolute left-[38%] top-[42%] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-orange-400 bg-orange-500/90 text-xs font-bold text-white shadow-lg">' +
      "!" +
      "</button>" +
      '<p class="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white">DICOM 预览 · 模拟</p></div>' +
      '<p data-slot="note" class="mt-3 text-xs text-slate-500">点击热点查看模拟提示（非诊断结论）。</p>'
    ));
    bind(root, "[data-action=\"pin\"]", "click", function () {
      root.querySelector("[data-slot=\"note\"]").innerHTML =
        '<span class="font-medium text-orange-700">初筛提示：</span>局部密度增高影，建议由执业医师结合病史进一步评估（模拟）。';
    });
  }

  function demoClinicalPath(root) {
    root.innerHTML = shell("临床路径提示", (
      '<ol class="space-y-2 text-sm">' +
      ["入院评估与生命体征", "实验室检查组合", "影像/专科会诊", "处置与随访计划"].map(function (t, i) {
        return (
          '<li class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3" data-step="' + i + '">' +
          '<span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xs font-medium text-slate-500">' +
          (i + 1) + "</span><span>" + escapeHtml(t) + "</span></li>"
        );
      }).join("") +
      "</ol>" +
      '<button type="button" data-action="next" class="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">标记完成下一步（模拟）</button>'
    ));
    var step = 0;
    bind(root, "[data-action=\"next\"]", "click", function () {
      var lis = root.querySelectorAll("[data-step]");
      if (step < lis.length) {
        var li = lis[step];
        li.className = "flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3";
        li.querySelector("span:first-child").className =
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-medium text-white";
        li.querySelector("span:first-child").textContent = "✓";
        step++;
      }
    });
  }

  function demoDevopsLogs(root) {
    root.innerHTML = shell("日志聚类与异常", (
      '<div class="max-h-48 overflow-y-auto rounded-xl border border-slate-900 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300">' +
      '<p data-log="1">2026-05-14T08:01:12Z ERROR payment-svc timeout upstream=db-primary</p>' +
      '<p data-log="2">2026-05-14T08:01:13Z ERROR payment-svc timeout upstream=db-primary</p>' +
      '<p data-log="3">2026-05-14T08:01:14Z WARN  cache-miss key=user:88421</p>' +
      '<p data-log="4">2026-05-14T08:01:18Z ERROR payment-svc timeout upstream=db-primary</p>' +
      "</div>" +
      '<button type="button" data-action="cluster" class="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">聚类分析（模拟）</button>'
    ));
    bind(root, "[data-action=\"cluster\"]", "click", function () {
      [1, 2, 4].forEach(function (id) {
        var p = root.querySelector("[data-log=\"" + id + "\"]");
        if (p) {
          p.className = "rounded bg-orange-950/50 text-orange-200";
        }
      });
    });
  }

  function demoCxBot(root) {
    root.innerHTML = shell("坐席侧话术与情绪", (
      '<div class="rounded-xl border border-slate-200 bg-slate-50 p-4">' +
      '<p class="text-xs font-medium text-slate-600">当前会话情绪倾向（模拟）</p>' +
      '<div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">' +
      '<div data-slot="meter" class="h-full w-[72%] rounded-full bg-gradient-to-r from-amber-400 to-orange-500"></div></div>' +
      '<p class="mt-1 text-xs text-slate-500">偏负面 72% · 建议安抚与升级策略</p></div>' +
      '<label class="mt-4 block text-xs font-medium text-slate-600">客户意图</label>' +
      '<select data-field="intent" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">' +
      "<option>投诉配送延迟</option>" +
      "<option>要求退费</option>" +
      "</select>" +
      '<button type="button" data-action="suggest" class="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">生成话术建议</button>' +
      '<div data-slot="sug" class="mt-3 hidden rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-900"></div>'
    ));
    bind(root, "[data-action=\"suggest\"]", "click", function () {
      var intent = root.querySelector("[data-field=\"intent\"]").value;
      var out = root.querySelector("[data-slot=\"sug\"]");
      out.classList.remove("hidden");
      out.textContent =
        "建议话术：非常抱歉让您久等了。我已为您加急查询运单，预计今日内回复处理方案；同时可申请一张心意补偿券（模拟）。" +
        " 场景：" + intent;
    });
  }

  function demoAdminRouter(root) {
    root.innerHTML = shell("密钥与路由（模拟）", (
      '<table class="w-full text-left text-xs">' +
      "<thead><tr class=\"border-b border-slate-200 text-slate-500\">" +
      "<th class=\"py-2\">应用</th><th class=\"py-2\">路由策略</th><th class=\"py-2\">状态</th></tr></thead><tbody>" +
      '<tr class="border-b border-slate-100"><td class="py-2 font-medium">客服机器人</td><td class="py-2">gpt-4.1-mini · 华东</td>' +
      '<td class="py-2"><button type="button" data-toggle="1" class="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">启用</button></td></tr>' +
      '<tr class="border-b border-slate-100"><td class="py-2 font-medium">内部 RAG</td><td class="py-2">私有模型 · VPC</td>' +
      '<td class="py-2"><button type="button" data-toggle="2" class="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">启用</button></td></tr>' +
      "</tbody></table>" +
      '<p class="mt-3 text-xs text-slate-500">API Key：<span class="font-mono">sk-••••••••8f2a</span>（脱敏模拟）</p>'
    ));
    root.querySelectorAll("[data-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var on = btn.textContent === "启用";
        btn.textContent = on ? "熔断" : "启用";
        btn.className = on
          ? "rounded-full bg-red-100 px-2 py-0.5 text-red-800"
          : "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800";
      });
    });
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

  function demoTrainBot(root) {
    root.innerHTML = shell("销售陪练回合", (
      '<div data-slot="chat" class="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">' +
      '<p class="rounded-lg bg-white p-2 text-slate-700"><span class="text-xs text-slate-400">客户 · </span>你们比竞品贵 15%，凭什么？</p></div>' +
      '<div class="mt-2 flex gap-2">' +
      '<input type="text" data-field="reply" placeholder="输入你的回应…" ' +
      'class="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />' +
      '<button type="button" data-action="send" class="rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600">发送</button></div>' +
      '<p data-slot="score" class="mt-2 hidden text-xs text-slate-600"></p>'
    ));
    bind(root, "[data-action=\"send\"]", "click", function () {
      var chat = root.querySelector("[data-slot=\"chat\"]");
      var inp = root.querySelector("[data-field=\"reply\"]");
      var v = inp.value.trim() || "（未输入，使用默认回应）";
      chat.innerHTML +=
        '<p class="rounded-lg bg-orange-50 p-2 text-slate-800"><span class="text-xs text-orange-600">坐席 · </span>' + escapeHtml(v) + "</p>" +
        '<p class="rounded-lg bg-white p-2 text-slate-700"><span class="text-xs text-slate-400">教练 · </span>可补充价值锚点与风险共担条款，避免单纯降价（模拟）。</p>';
      inp.value = "";
      var sc = root.querySelector("[data-slot=\"score\"]");
      sc.classList.remove("hidden");
      sc.textContent = "本轮要点命中：共情 ✓  价值陈述 △  下一步承诺 ✓（模拟评分）";
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

  function demoSmartOffice(root) {
    root.innerHTML = shell("多流程文档审查", (
      '<div class="flex flex-wrap gap-2 border-b border-slate-100 pb-3">' +
      ["报销单据", "简历筛选", "招标文件", "合同审核"].map(function (t, i) {
        return (
          '<button type="button" data-tab="' + i + '" class="rounded-full px-3 py-1 text-xs font-medium ' +
          (i === 0 ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200") + '">' +
          escapeHtml(t) + "</button>"
        );
      }).join("") +
      "</div>" +
      '<div data-panel="0" class="mt-3 text-sm text-slate-700">差旅餐费超标 12%，缺少招待对象说明（模拟规则命中）。</div>' +
      '<div data-panel="1" class="mt-3 hidden text-sm text-slate-700">简历与 JD 匹配度 76%：后端经验充分，行业经验偏弱（模拟）。</div>' +
      '<div data-panel="2" class="mt-3 hidden text-sm text-slate-700">与历史中标方案相似度 18%，未发现明显串标片段（模拟）。</div>' +
      '<div data-panel="3" class="mt-3 hidden text-sm text-slate-700">责任上限条款与模板不一致，建议法务复核（模拟）。</div>'
    ));
    root.querySelectorAll("[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = btn.getAttribute("data-tab");
        root.querySelectorAll("[data-tab]").forEach(function (b) {
          b.className = "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200";
        });
        btn.className = "rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white";
        root.querySelectorAll("[data-panel]").forEach(function (p) {
          p.classList.toggle("hidden", p.getAttribute("data-panel") !== i);
        });
      });
    });
  }

  function demoLongContextQa(root) {
    root.innerHTML = shell("长文本问答与追溯", (
      '<div class="grid gap-4 lg:grid-cols-2">' +
      '<div class="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">' +
      "<p><strong class=\"text-slate-800\">第 7 条</strong> 服务期限自双方签署之日起生效，除非依第 12 条提前终止…</p>" +
      "<p class=\"mt-2\"><strong class=\"text-slate-800\">第 12 条</strong> 任何一方提前 30 日书面通知可终止本协议，终止前已产生的费用仍应结算…</p>" +
      "<p class=\"mt-2\"><strong class=\"text-slate-800\">附件 A</strong> 数据出境须遵守适用法律法规及双方 DPA…</p></div>" +
      '<div><label class="text-xs font-medium text-slate-600">追问</label>' +
      '<input type="text" data-field="qq" value="提前终止需要提前多久通知？" ' +
      'class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />' +
      '<button type="button" data-action="qa" class="mt-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">生成回答（模拟）</button>' +
      '<div data-slot="ans" class="mt-3 hidden rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700"></div></div></div>'
    ));
    bind(root, "[data-action=\"qa\"]", "click", function () {
      var out = root.querySelector("[data-slot=\"ans\"]");
      out.classList.remove("hidden");
      out.innerHTML =
        "根据<strong class=\"text-orange-600\">第 12 条</strong>，提前终止需<strong>至少 30 日书面通知</strong>；" +
        '终止前已发生费用仍需结算。引用：<button type="button" class="text-xs text-orange-600 underline">定位到原文 L128-L131</button>（模拟）';
    });
  }

  // --- 按技术栈回退 ---

  function fallbackRag(root) {
    demoEnterpriseGpt(root);
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

  function fallbackAiops(root) {
    demoDevopsLogs(root);
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

  function fallbackGateway(root) {
    demoAdminRouter(root);
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

  window.PortalDemos = { mount: mount };
})();
