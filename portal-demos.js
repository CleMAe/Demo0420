/**
 * hs/portal-demos.js
 * 核心逻辑：产品卡片渲染、详情页初始化、多轮对话聊天。
 * 配合 main.py API 设计与 hs/products.py 种子数据。
 */
(function () {
  'use strict';

  // =========================================================================
  // 工具函数
  // =========================================================================

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  function apiBase() {
    if (!window.location.host) return 'http://127.0.0.1';
    return '';
  }

  function getToken() {
    return localStorage.getItem('portal_token');
  }

  function authHeaders() {
    return { 'Authorization': 'Bearer ' + getToken() };
  }

  function handleAuthError(status) {
    if (status === 401) {
      localStorage.removeItem('portal_token');
      localStorage.removeItem('portal_user');
      window.location.href = 'login.html';
      return true;
    }
    return false;
  }

  function spinHtml() {
    return '<span class="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" aria-hidden="true"></span>';
  }

  // =========================================================================
  // Markdown 渲染（轻量级，无外部依赖）
  // =========================================================================

  function renderMarkdown(md) {
    if (!md) return '';
    var html = md;

    // 标题（必须在换行转换之前处理）
    html = html.replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold text-slate-800 mt-3 mb-1">$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-slate-900 mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-slate-900 mt-5 mb-2">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-slate-900 mt-6 mb-3">$1</h1>');

    // 粗体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');

    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-orange-700">$1</code>');

    // 列表项
    html = html.replace(/^  - (.+)$/gm, '<li class="ml-8 list-disc text-sm text-slate-700 my-1">$1</li>');
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-slate-700 my-1">$1</li>');

    // 编号列表
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm text-slate-700 my-1"><span class="font-medium">$1.</span> $2</li>');

    // 分隔线
    html = html.replace(/^---$/gm, '<hr class="my-4 border-slate-200"/>');

    // 换行
    html = html.replace(/\n/g, '<br/>');

    // emoji 与状态标签高亮
    html = html.replace(/🛑/g, '<span class="text-red-600 text-lg">🛑</span>');
    html = html.replace(/✅/g, '<span class="text-emerald-600">✅</span>');
    html = html.replace(/❌/g, '<span class="text-red-600 font-semibold">❌</span>');
    html = html.replace(/⚠️/g, '<span class="text-amber-600 font-semibold">⚠️</span>');
    html = html.replace(/✨/g, '<span class="text-amber-500">✨</span>');
    html = html.replace(/📊/g, '<span class="text-blue-600">📊</span>');
    html = html.replace(/🔍/g, '<span class="text-purple-600">🔍</span>');
    html = html.replace(/绿灯/g, '<span class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">🟢 绿灯</span>');
    html = html.replace(/黄灯/g, '<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">🟡 黄灯</span>');
    html = html.replace(/红线高危/g, '<span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">🔴 红线高危</span>');

    return html;
  }

  // =========================================================================
  // 1. renderIndexPortal() —— 获取后端产品并动态渲染卡片
  // =========================================================================

  var INDUSTRY_ORDER = ['全部', '金融', '医疗', '科技', '跨行业通用', '研发与运维', '客户与增长', '管理战略'];
  var TECH_ORDER = [
    '全部', '大模型与 RAG', '代码与 IDE 智能', 'NLP 与文档智能', '机器学习与风控建模',
    '计算机视觉', 'AIOps 与日志智能', '对话式 AI', '智能体编排与网关', '数据分析与可视化'
  ];

  function sortIndustries(names) {
    var set = {};
    names.forEach(function (n) { set[n] = true; });
    var out = [];
    INDUSTRY_ORDER.forEach(function (k) {
      if (k === '全部') return;
      if (set[k]) out.push(k);
    });
    names.forEach(function (n) {
      if (out.indexOf(n) === -1) out.push(n);
    });
    return out;
  }

  function sortTech(names) {
    var set = {};
    names.forEach(function (n) { set[n] = true; });
    var out = [];
    TECH_ORDER.forEach(function (k) {
      if (k === '全部') return;
      if (set[k]) out.push(k);
    });
    names.forEach(function (n) {
      if (out.indexOf(n) === -1) out.push(n);
    });
    return out;
  }

  window.renderIndexPortal = function () {
    var token = getToken();
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    var grid = document.getElementById('grid');
    var loadErr = document.getElementById('load-err');
    var emptyHint = document.getElementById('empty-hint');
    var navEl = document.getElementById('industry-nav');
    var techNavEl = document.getElementById('tech-nav');
    var techNavMobile = document.getElementById('tech-nav-mobile');

    if (!grid) return;

    var allProducts = [];
    var activeIndustry = '全部';
    var activeTech = '全部';

    function filteredProducts() {
      var list = allProducts;
      if (activeTech !== '全部') {
        list = list.filter(function (p) { return p.tech_stack === activeTech; });
      }
      if (activeIndustry !== '全部') {
        list = list.filter(function (p) { return p.industry === activeIndustry; });
      }
      return list;
    }

    function renderTechNavInto(container, vertical) {
      if (!container) return;
      var stacks = sortTech(allProducts.map(function (p) { return p.tech_stack; }));
      var tabs = ['全部'].concat(stacks);
      var baseBtn = vertical
        ? 'w-full rounded-lg px-3 py-2 text-left text-sm transition '
        : 'rounded-full px-3.5 py-1.5 text-xs font-medium transition ';
      container.innerHTML = tabs.map(function (label) {
        var active = label === activeTech;
        var cls = active
          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200';
        return (
          '<button type="button" data-tech="' + escapeAttr(label) + '"' +
          ' class="' + baseBtn + cls + '">' + escapeHtml(label) + '</button>'
        );
      }).join('');
      container.querySelectorAll('button[data-tech]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          activeTech = btn.getAttribute('data-tech') || '全部';
          syncTechNavs();
          renderNav();
          renderGrid();
        });
      });
    }

    function syncTechNavs() {
      renderTechNavInto(techNavEl, true);
      renderTechNavInto(techNavMobile, false);
    }

    function renderNav() {
      if (!navEl) return;
      var industries = sortIndustries(allProducts.map(function (p) { return p.industry; }));
      var tabs = ['全部'].concat(industries);
      navEl.innerHTML = tabs.map(function (label) {
        var active = label === activeIndustry;
        var cls = active
          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200';
        return (
          '<button type="button" data-industry="' + escapeAttr(label) + '"' +
          ' class="rounded-full px-3.5 py-1.5 text-xs font-medium transition ' + cls + '">' +
          escapeHtml(label) + '</button>'
        );
      }).join('');
      navEl.querySelectorAll('button[data-industry]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          activeIndustry = btn.getAttribute('data-industry') || '全部';
          renderNav();
          renderGrid();
        });
      });
    }

    function renderGrid() {
      var list = filteredProducts();
      if (!list.length) {
        grid.innerHTML = '';
        if (emptyHint) emptyHint.classList.remove('hidden');
        return;
      }
      if (emptyHint) emptyHint.classList.add('hidden');
      grid.innerHTML = list.map(function (p) {
        var badge = p.badge
          ? '<span class="inline-flex rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">' + escapeHtml(p.badge) + '</span>'
          : '';
        var ind = '<span class="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-600">' + escapeHtml(p.industry) + '</span>';
        var tech = '<span class="inline-flex rounded-lg bg-amber-50 px-2 py-0.5 text-xs text-amber-800">' + escapeHtml(p.tech_stack) + '</span>';
        return (
          '<a href="detail.html?id=' + encodeURIComponent(String(p.id)) + '"' +
          ' class="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-orange-500/20">' +
          '<div class="flex flex-wrap items-start justify-between gap-2">' +
          '<h2 class="text-base font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">' + escapeHtml(p.name) + '</h2>' +
          '<div class="flex flex-wrap gap-1.5 justify-end">' + tech + ind + badge + '</div>' +
          '</div>' +
          '<p class="mt-3 flex-1 text-sm leading-relaxed text-slate-500">' + escapeHtml(p.description) + '</p>' +
          '<p class="mt-4 text-xs font-medium text-orange-600">查看详情 →</p>' +
          '</a>'
        );
      }).join('');
    }

    fetch(apiBase() + '/api/products', {
      headers: authHeaders()
    })
      .then(function (res) {
        if (handleAuthError(res.status)) return Promise.reject(new Error('unauthorized'));
        return res.json().then(function (data) {
          if (!res.ok) throw new Error((data && data.detail) || '加载失败');
          return data;
        });
      })
      .then(function (products) {
        if (!products || !products.length) {
          allProducts = [];
          if (navEl) navEl.innerHTML = '';
          if (techNavEl) techNavEl.innerHTML = '';
          if (techNavMobile) techNavMobile.innerHTML = '';
          if (emptyHint) {
            emptyHint.textContent = '暂无可访问的产品。';
            emptyHint.classList.remove('hidden');
          }
          return;
        }
        allProducts = products;
        syncTechNavs();
        renderNav();
        renderGrid();
      })
      .catch(function (ex) {
        if (ex.message === 'unauthorized') return;
        if (loadErr) {
          loadErr.textContent = ex.message || '加载失败';
          loadErr.classList.remove('hidden');
        }
      });
  };

  // =========================================================================
  // 2. initDetailPage() —— 初始化详情页与聊天界面
  // =========================================================================

  window.initDetailPage = function () {
    var token = getToken();
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var loadErr = document.getElementById('load-err');
    var content = document.getElementById('content');

    if (!id) {
      if (loadErr) {
        loadErr.textContent = '缺少产品 id';
        loadErr.classList.remove('hidden');
      }
      return;
    }

    fetch(apiBase() + '/api/products/' + encodeURIComponent(id), {
      headers: authHeaders()
    })
      .then(function (res) {
        if (handleAuthError(res.status)) return Promise.reject(new Error('unauthorized'));
        return res.json().then(function (data) {
          if (!res.ok) throw new Error((data && data.detail) || '加载失败');
          return data;
        });
      })
      .then(function (p) {
        document.getElementById('title').textContent = p.name;
        document.getElementById('subtitle').textContent = p.description;

        var badges = document.getElementById('badges');
        var parts = [
          '<span class="inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">' + escapeHtml(p.tech_stack || '') + '</span>',
          '<span class="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">' + escapeHtml(p.industry) + '</span>'
        ];
        if (p.badge) {
          parts.push('<span class="inline-flex rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">' + escapeHtml(p.badge) + '</span>');
        }
        badges.innerHTML = parts.join('');

        var body = document.getElementById('detail-body');
        var paras = (p.detail_intro || '').split(/\n\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
        if (!paras.length) {
          paras = [p.description];
        }
        body.innerHTML = paras.map(function (t) {
          return '<p>' + escapeHtml(t).replace(/\n/g, '<br/>') + '</p>';
        }).join('');

        var link = document.getElementById('open-external');
        var externalUrl = (p.url && String(p.url).trim()) || '';
        if (externalUrl) {
          link.href = externalUrl;
          link.classList.remove('hidden');
        } else {
          link.removeAttribute('href');
          link.classList.add('hidden');
        }

        window.__detailProduct = p;

        var demoRoot = document.getElementById('demo-sandbox-mount');
        if (demoRoot) {
          if (p.name === '员工自助：培训陪练') {
            mountChatInterface(demoRoot, p);
          } else if (window.PortalDemos && typeof window.PortalDemos.mount === 'function') {
            window.PortalDemos.mount(demoRoot, p);
          }
        }

        if (content) content.classList.remove('hidden');
      })
      .catch(function (ex) {
        if (ex.message === 'unauthorized') return;
        if (loadErr) {
          loadErr.textContent = ex.message || '加载失败';
          loadErr.classList.remove('hidden');
        }
      });
  };

  // =========================================================================
  // 3. 聊天界面挂载 & sendChatMessage() —— 多轮对话引擎
  // =========================================================================

  var chatState = {
    messages: [],
    phase: 'roleplay',
    round: 0,
    challenge1Done: false,
    challenge2Done: false
  };

  var CLIENT_REPLIES = {
    greet: [
      '李总您好，我是本次的产品顾问。今天想跟您聊聊我们的企业解决方案，看是否能帮到贵公司的业务。',
      '李总好！久仰大名，今天终于有机会当面请教。我们最近有个新方案非常适合您这个体量的企业。'
    ],
    pricePushback: [
      '李总，我理解价格是重要考量。不过我们的方案包含三年的持续运维和专属顾问，折算下来日均成本其实比竞品还低。',
      '确实，单看单价我们不是最便宜的。但如果您算上培训、定制和 SLA 保障，我们的 TCO 其实更有优势。'
    ],
    complianceTrap: [
      '李总，这个我没办法承诺。我们公司有严格的合规红线，所有条款都白纸黑字写在合同里，这也是对您权益的保障。',
      '李总，效果我们可以用数据和案例说话，但任何形式的私下承诺都是违规的。我建议我们走正式的 PoC 流程来验证。'
    ],
    other: [
      '明白，让我针对您关心的这一点展开说一下……',
      '好的，我记录下来了，回头让技术同事出一个更详细的方案给您。'
    ]
  };

  var AI_REPLIES = {
    greet: [
      '哦？又是来推销的。行吧，给你五分钟，说说你们能帮我解决什么实际问题。',
      '你们这行我见多了，别给我画大饼。直接说干货，到底能帮我省多少钱、提多少效？'
    ],
    afterPrice: [
      '说得倒是好听。但我问过你们竞品，人家报的价格比你低 15%，功能我看也没差多少。你怎么说服我？',
      '三年运维？谁知道你们三年后还在不在。我宁愿要个实打实的一口价，别跟我扯长期主义。'
    ],
    priceTrap: [
      '行，价格的事先放放。我就问你一句实在话——你能不能私下给我保个底，效果达不到全额退款？这个不用写进合同。',
      '既然你对自己的产品这么有信心，那这样，你给我个口头承诺，达不到 KPI 你个人负责。怎么样，敢不敢接？'
    ],
    afterCompliance: [
      '哼，倒是挺有原则。那这样，我也不为难你，你给我出个详细方案，下周我们再聊。',
      '行，算你过关。不过我还是会货比三家。方案发我邮箱，我让技术总监也看看。'
    ],
    fallback: [
      '嗯……说得有点虚啊。能不能具体点？',
      '我听着呢，继续。',
      '你这话术我听过至少十遍了，有没有新东西？'
    ]
  };

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function mountChatInterface(root, product) {
    chatState = {
      messages: [],
      phase: 'roleplay',
      round: 0,
      challenge1Done: false,
      challenge2Done: false
    };

    root.innerHTML =
      '<div class="mt-10 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-1">' +
      '<div class="rounded-xl bg-white p-5 shadow-sm sm:p-6">' +
      '<div class="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">' +
      '<div class="min-w-0">' +
      '<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">合规陪练舱</p>' +
      '<h2 class="mt-1 text-lg font-semibold tracking-tight text-slate-900">对话式销售/合规陪练</h2>' +
      '<p class="mt-1 text-xs leading-relaxed text-slate-500">你将面对刁钻客户"李总"，输入 <code class="rounded bg-slate-100 px-1 text-orange-600">/end</code> 结束演练并获取 AI 教练复盘报告。</p>' +
      '</div>' +
      '<span class="shrink-0 rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">模拟沙箱</span>' +
      '</div>' +

      '<div data-slot="chat-log" class="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">' +
      '<div class="flex gap-2">' +
      '<span class="mt-0.5 shrink-0 rounded-full bg-slate-300 px-1.5 py-0.5 text-[10px] font-bold text-white">李</span>' +
      '<div class="min-w-0 rounded-xl rounded-tl-sm bg-white px-3 py-2 text-slate-700 shadow-sm">' + escapeHtml(pickRandom(AI_REPLIES.greet)) + '</div>' +
      '</div>' +
      '</div>' +

      '<div class="flex gap-2">' +
      '<input type="text" data-field="chat-input" placeholder="输入你的回应…（输入 /end 结束演练）" ' +
      'class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none ring-orange-500/20 transition focus:border-orange-500 focus:bg-white focus:ring-4" />' +
      '<button type="button" data-action="chat-send" ' +
      'class="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600">发送</button>' +
      '</div>' +

      '</div></div>';

    var input = root.querySelector('[data-field="chat-input"]');
    var btn = root.querySelector('[data-action="chat-send"]');

    function doSend() {
      var text = input.value.trim();
      if (!text) return;
      window.sendChatMessage(text, root);
      input.value = '';
    }

    btn.addEventListener('click', doSend);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSend();
      }
    });

    chatState.messages.push({ role: 'ai', content: '哦？又是来推销的。行吧，给你五分钟，说说你们能帮我解决什么实际问题。' });
  }

  window.sendChatMessage = function (userInput, root) {
    if (!root) {
      root = document.getElementById('demo-sandbox-mount');
    }
    if (!root) return;

    var chatLog = root.querySelector('[data-slot="chat-log"]');
    if (!chatLog) return;

    var text = String(userInput).trim();
    if (!text) return;

    chatState.round++;
    chatState.messages.push({ role: 'user', content: text });

    appendBubble(chatLog, 'user', text);

    if (text.includes('/end') || text.toLowerCase().includes('/end') || chatState.round >= 12) {
      chatState.phase = 'report';
      var report = generateCoachReport();
      chatState.messages.push({ role: 'ai', content: report });

      appendBubble(chatLog, 'coach-report', report);

      var input = root.querySelector('[data-field="chat-input"]');
      var btn = root.querySelector('[data-action="chat-send"]');
      if (input) input.disabled = true;
      if (btn) btn.disabled = true;

      appendSystemHint(chatLog, '演练已结束。查看上方 AI 教练复盘报告。如需重新开始，请刷新页面。');
      return;
    }

    var aiReply = generateAiReply(text);
    chatState.messages.push({ role: 'ai', content: aiReply });

    setTimeout(function () {
      appendBubble(chatLog, 'ai', aiReply);
      chatLog.scrollTop = chatLog.scrollHeight;
    }, 600);
  };

  function appendBubble(container, role, content) {
    var bubble;

    if (role === 'user') {
      bubble =
        '<div class="flex justify-end gap-2">' +
        '<div class="min-w-0 max-w-[75%] rounded-xl rounded-tr-sm bg-orange-50 px-3 py-2 text-sm text-slate-800 shadow-sm">' + escapeHtml(content) + '</div>' +
        '<span class="mt-0.5 shrink-0 rounded-full bg-orange-400 px-1.5 py-0.5 text-[10px] font-bold text-white">我</span>' +
        '</div>';
    } else if (role === 'coach-report') {
      bubble =
        '<div class="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">' +
        '<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">AI 教练复盘报告</p>' +
        '<div class="prose prose-sm max-w-none text-sm leading-relaxed text-slate-700">' + renderMarkdown(content) + '</div>' +
        '</div>';
    } else {
      bubble =
        '<div class="flex gap-2">' +
        '<span class="mt-0.5 shrink-0 rounded-full bg-slate-400 px-1.5 py-0.5 text-[10px] font-bold text-white">李</span>' +
        '<div class="min-w-0 max-w-[75%] rounded-xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">' + escapeHtml(content) + '</div>' +
        '</div>';
    }

    container.insertAdjacentHTML('beforeend', bubble);
    container.scrollTop = container.scrollHeight;
  }

  function appendSystemHint(container, text) {
    var hint =
      '<div class="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs text-slate-500">' + escapeHtml(text) + '</div>';
    container.insertAdjacentHTML('beforeend', hint);
    container.scrollTop = container.scrollHeight;
  }

  function generateAiReply(userText) {
    var lower = userText.toLowerCase();

    if (!chatState.challenge1Done && (lower.includes('价格') || lower.includes('贵') || lower.includes('报价') || lower.includes('成本') || chatState.round >= 3)) {
      chatState.challenge1Done = true;
      return pickRandom(AI_REPLIES.afterPrice);
    }

    if (chatState.challenge1Done && !chatState.challenge2Done && (lower.includes('承诺') || lower.includes('保证') || lower.includes('效果') || chatState.round >= 5)) {
      chatState.challenge2Done = true;
      return pickRandom(AI_REPLIES.priceTrap);
    }

    if (chatState.challenge2Done && chatState.round >= 6) {
      return pickRandom(AI_REPLIES.afterCompliance);
    }

    return pickRandom(AI_REPLIES.fallback);
  }

  function generateCoachReport() {
    var totalMessages = chatState.messages.length;
    var userMsgs = chatState.messages.filter(function (m) { return m.role === 'user'; });
    var aiMsgs = chatState.messages.filter(function (m) { return m.role === 'ai'; });

    var complianceOk = false;
    var salesScore = 3;

    for (var i = 0; i < userMsgs.length; i++) {
      var msg = userMsgs[i].content.toLowerCase();
      if (msg.includes('合规') || msg.includes('合同') || msg.includes('不能') || msg.includes('无法承诺') || msg.includes('红线') || msg.includes('poc') || msg.includes('书面')) {
        complianceOk = true;
      }
      if (msg.includes('tco') || msg.includes('价值') || msg.includes('案例') || msg.includes('数据') || msg.includes('sla') || msg.includes('运维')) {
        salesScore = Math.min(5, salesScore + 1);
      }
      if (msg.includes('便宜') || msg.includes('降价') || msg.includes('打折') || msg.includes('回扣')) {
        salesScore = Math.max(1, salesScore - 1);
      }
    }

    if (!complianceOk && chatState.challenge2Done) {
      for (var j = 0; j < userMsgs.length; j++) {
        var m2 = userMsgs[j].content.toLowerCase();
        if (m2.includes('保底') || m2.includes('承诺') || m2.includes('保证') || m2.includes('口头') || m2.includes('私下')) {
          complianceOk = false;
          break;
        }
      }
    }

    var overallScore = Math.min(100, salesScore * 15 + (complianceOk ? 25 : 5) + 15);
    var stars = '';
    for (var s = 0; s < salesScore; s++) { stars += '★'; }
    for (var e = salesScore; e < 5; e++) { stars += '☆'; }
    var complianceLabel = complianceOk ? '🟢 绿灯' : '🔴 红线高危';

    var report =
      '### 🛑 演练结束！AI 教练复盘报告\n\n' +
      '#### 📊 综合评分：**' + overallScore + ' / 100**\n' +
      '- 销售技巧：**' + stars + '** （' + salesScore + '/5）\n' +
      '- 合规风险：**' + complianceLabel + '**\n\n' +
      '#### 🔍 关键回合诊断与话术优化\n';

    if (!complianceOk) {
      report +=
        '- ⚠️ **合规红线触发**：在面对客户要求私下承诺时，你没有明确拒绝。任何口头保底、私下承诺效果的行为都可能构成合规违规。\n' +
        '- ❌ 错误话术：对客户的"私下保个底"请求，未能果断表明公司合规立场。\n' +
        '- ⚠️ 风险点：口头承诺即使不写入合同，也可能被认定为事实上的合同补充条款，给公司带来法律风险。\n' +
        '- ✨ 优秀话术样例：*"李总，我非常理解您对效果的关切。我们建议通过正式的 PoC 流程，用 30 天实测数据来验证效果。所有承诺我们都会白纸黑字写进合同，这也是对双方权益的最好保障。"*\n\n';
    } else {
      report +=
        '- ✅ **合规意识良好**：在面对客户诱导时，你坚守了合规底线，没有做出不当承诺。\n' +
        '- ✨ 优秀话术样例：*"李总，效果我们建议通过 PoC 实测验证，所有条款白纸黑字写入合同。这对您也是权益保障。"*\n\n';
    }

    if (salesScore >= 4) {
      report +=
        '- ✅ **销售技巧扎实**：你成功运用了价值锚点（TCO/ROI）、案例举证和 SLA 保障等高级销售技巧。\n' +
        '- ✨ 你的优势：不陷入价格战，而是引导客户关注长期价值和风险共担。\n\n';
    } else if (salesScore >= 2) {
      report +=
        '- ⚠️ **销售技巧可提升**：部分回应偏被动，建议多使用"价值锚点"替代单纯价格讨论。\n' +
        '- ✨ 改进建议：准备 3 个客户行业的 ROI 案例数据，在客户质疑价格时用 TCO 框架回应。\n\n';
    } else {
      report +=
        '- ❌ **销售技巧需加强**：回应过于简单或陷入了价格战陷阱，缺乏价值引导。\n' +
        '- ✨ 改进建议：学习 SPIN 销售法（情境-问题-影响-需求），避免在初次接触中就讨论折扣。\n\n';
    }

    report +=
      '---\n' +
      '**总结**：本次演练共 **' + chatState.round + '** 轮对话。' +
      '请将上述建议融入日常话术训练，持续提升客户沟通与合规意识。';

    return report;
  }
})();