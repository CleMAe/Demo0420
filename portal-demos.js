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

  window.PortalDemos = { mount: mount, sentimentMeta: sentimentMeta };
})();
