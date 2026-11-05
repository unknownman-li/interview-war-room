/* 面试作战室 · 前端逻辑（无依赖） */
(function () {
  'use strict';

  var MODULES = (window.MODULES || []).slice().sort(function (a, b) { return a.order - b.order; });
  var QUIZ = window.QUIZ || [];
  var LS_MASTER = 'interview.mastered.v1';
  var LS_THEME = 'interview.theme.v2';
  var LS_BEST = 'interview.quiz.best.v1';

  var state = {
    mastered: loadSet(LS_MASTER),
    query: '',
    theme: localStorage.getItem(LS_THEME) || 'light',
    quiz: null
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function loadSet(key) {
    try {
      var raw = JSON.parse(localStorage.getItem(key) || '[]');
      return new Set(Array.isArray(raw) ? raw : []);
    } catch (e) { return new Set(); }
  }
  function saveMastered() {
    try { localStorage.setItem(LS_MASTER, JSON.stringify(Array.from(state.mastered))); } catch (e) {}
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function strip(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || '';
  }
  function itemKey(m, i) { return m.id + '::' + i; }
  function totalItems() { return MODULES.reduce(function (n, m) { return n + m.items.length; }, 0); }
  function masteredCount() { return state.mastered.size; }
  function starHtml(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '<i>★</i>';
    return '<span class="stars" title="面试频率 ' + n + '/5">' + s + '</span>';
  }
  function modById(id) {
    for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i];
    return null;
  }

  /* ---------------- 主题 ---------------- */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    $('#themeBtn').textContent = state.theme === 'dark' ? '☀' : '☾';
  }
  $('#themeBtn').addEventListener('click', function () {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(LS_THEME, state.theme);
    applyTheme();
  });

  /* ---------------- 进度 ---------------- */
  function updateProgress() {
    var total = totalItems();
    var done = Math.min(masteredCount(), total);
    var pct = total ? Math.round((done / total) * 100) : 0;
    $('#ringText').textContent = pct + '%';
    $('#ringFg').style.strokeDashoffset = String(97.4 * (1 - pct / 100));
    $('#statMastered').textContent = done;
    $('#statTotal').textContent = total;
    $('#footTotal').textContent = total + QUIZ.length;
    $$('.nav-item', $('#sideNav')).forEach(function (el) {
      var m = modById(el.getAttribute('data-id'));
      if (!m) return;
      var c = m.items.filter(function (_, i) { return state.mastered.has(itemKey(m, i)); }).length;
      var bar = $('.nav-bar i', el);
      if (bar) bar.style.width = (m.items.length ? (c / m.items.length) * 100 : 0) + '%';
      var cnt = $('.nav-count', el);
      if (cnt) cnt.textContent = c + '/' + m.items.length;
    });
    var mp = $('#modProgressBar');
    if (mp) {
      var m = modById(mp.getAttribute('data-id'));
      if (m) {
        var c = m.items.filter(function (_, i) { return state.mastered.has(itemKey(m, i)); }).length;
        mp.style.width = (m.items.length ? (c / m.items.length) * 100 : 0) + '%';
        var label = $('#modProgressText');
        if (label) label.textContent = c + ' / ' + m.items.length + ' 已掌握';
      }
    }
  }

  /* ---------------- 侧边栏 ---------------- */
  function renderSidebar(activeId) {
    var html = '<div class="nav-label">学习模块</div>';
    html += '<a class="nav-item' + (activeId === 'home' ? ' active' : '') + '" href="#/home" data-id="home">' +
      '<span class="nav-num">00</span><span class="nav-title">总览与学习路线</span><span class="nav-count"></span></a>';
    MODULES.forEach(function (m, idx) {
      var c = m.items.filter(function (_, i) { return state.mastered.has(itemKey(m, i)); }).length;
      html += '<a class="nav-item' + (activeId === m.id ? ' active' : '') + '" href="#/m/' + m.id + '" data-id="' + m.id + '">' +
        '<span class="nav-num">' + String(idx + 1).padStart(2, '0') + '</span>' +
        '<span class="nav-title">' + esc(m.title) + '</span>' +
        '<span class="nav-count">' + c + '/' + m.items.length + '</span>' +
        '<span class="nav-bar"><i style="width:' + (m.items.length ? (c / m.items.length) * 100 : 0) + '%"></i></span>' +
        '</a>';
    });
    html += '<div class="nav-label" style="margin-top:8px">自测</div>';
    html += '<a class="nav-item' + (activeId === 'quiz' ? ' active' : '') + '" href="#/quiz" data-id="quiz">' +
      '<span class="nav-num">✓</span><span class="nav-title">随机测验</span><span class="nav-count">' + QUIZ.length + ' 题</span></a>';
    $('#sideNav').innerHTML = html;
    updateProgress();
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    var total = totalItems();
    var highFreq = 0;
    MODULES.forEach(function (m) { m.items.forEach(function (it) { if (it.star >= 5) highFreq++; }); });
    var best = localStorage.getItem(LS_BEST);

    var h = '';
    h += '<section class="hero">' +
      '<span class="eyebrow">● 简历项目 01 · 八股作战地图</span>' +
      '<h1>把「本地生活点评平台」<br>讲成<em>一场高并发实战</em></h1>' +
      '<p class="lead">这不是一份通用八股清单。每个知识点都从你简历上的四条 bullet 反向拆解：<b>秒杀四级防线、缓存三件套、登录滑动窗口限流、BitMap/HLL 统计</b>，再向外扩展到 Redis、RabbitMQ、MySQL、并发、JVM、Spring 的必问底层。目标只有一个：面试官问到的每一个「为什么」，你都能接住。</p>' +
      '<div class="hero-actions"><a class="btn" href="#/m/project">从项目总览开始 →</a>' +
      '<a class="btn ghost" href="#/quiz">先测测水平</a>' +
      '<button class="btn ghost" id="heroRandom">🎲 随机抽一题</button></div>' +
      '<div class="hero-meta">' +
      '<div><b>' + MODULES.length + '</b>个知识模块</div>' +
      '<div><b>' + total + '</b>道问答 / 面试题</div>' +
      '<div><b>' + highFreq + '</b>道高频必背</div>' +
      '<div><b>' + (best ? best + ' 分' : '—') + '</b>测验最佳成绩</div>' +
      '</div></section>';

    h += '<section class="section"><div class="section-head"><h2>模块地图</h2><p>按面试出现频率排序，建议 1 → 6 精学，7 → 11 查漏</p><div class="line"></div></div><div class="grid cols-3">';
    MODULES.forEach(function (m, idx) {
      var c = m.items.filter(function (_, i) { return state.mastered.has(itemKey(m, i)); }).length;
      h += '<a class="mod-card" href="#/m/' + m.id + '">' +
        '<div class="mc-top"><span class="mc-icon">' + m.icon + '</span><h3>' + esc(m.title) + '</h3></div>' +
        '<div class="mc-desc">' + esc(m.desc) + '</div>' +
        '<div>' + (m.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<div class="mc-bottom"><span>MODULE ' + String(idx + 1).padStart(2, '0') + '</span><span>' + c + '/' + m.items.length + ' 掌握</span></div>' +
        '</a>';
    });
    h += '</div></section>';

    h += '<section class="section"><div class="section-head"><h2>简历逐条对照</h2><p>面试官会顺着简历往下挖，点右侧标签直接跳到对应答案</p><div class="line"></div></div><div class="resume-map">';
    var map = [
      ['秒杀四级防线', 'Guava 令牌桶 → Redis Lua 原子校验 → RabbitMQ 削峰 → CAS 防超卖，压测零超卖', ['seckill', 'mq', 'redis']],
      ['通用缓存封装 CacheClient', '穿透：空值缓存 + 互斥锁重建；击穿：逻辑过期 + 异步重建', ['redis', 'cache-design']],
      ['登录限流', 'Redis ZSet 滑动窗口 1 分钟 1 次 / 1 分钟 5 次，超限分级封禁', ['auth', 'redis']],
      ['统计方案', '签到 BitMap 月存 + BITFIELD 连续天数；UV 用 HyperLogLog', ['stats']],
      ['技术栈与工程化', 'Spring Boot / MyBatis-Plus / MySQL / JWT / 拦截器 / 全局异常', ['mysql', 'spring', 'java']]
    ];
    map.forEach(function (row) {
      h += '<div class="rm-row"><p><b>' + row[0] + '</b> · ' + row[1] + '</p><div class="rm-links">' +
        row[2].map(function (id) { var m = modById(id); return m ? '<a href="#/m/' + id + '">' + esc(m.title) + '</a>' : ''; }).join('') +
        '</div></div>';
    });
    h += '</div></section>';

    h += '<section class="section"><div class="section-head"><h2>7 天冲刺计划</h2><p>每天 60–90 分钟：先自己答，再展开对照，最后点「掌握」</p><div class="line"></div></div><div class="plan">';
    var plan = [
      ['DAY 1', '<b>项目总览 + 秒杀主线</b>：能脱稿画请求链路，讲清四道防线为什么缺一不可', 'project'],
      ['DAY 2', '<b>Redis 深挖</b>：缓存三件套、Lua 原子性、分布式锁、持久化与集群', 'redis'],
      ['DAY 3', '<b>RabbitMQ + 缓存一致性</b>：可靠性三段式、幂等、积压、延迟队列', 'mq'],
      ['DAY 4', '<b>MySQL</b>：B+ 树、回表、最左前缀、MVCC、锁、慢 SQL 优化', 'mysql'],
      ['DAY 5', '<b>Java 并发 + JVM</b>：线程池、AQS、CAS、ThreadLocal、GC 与排查', 'java'],
      ['DAY 6', '<b>Spring + 登录限流</b>：事务失效、循环依赖、JWT、四种限流算法', 'spring'],
      ['DAY 7', '<b>统计 + 系统设计 + 模拟面试</b>：BitMap/HLL、幂等、容量评估，做 2 轮随机测验', 'stats']
    ];
    plan.forEach(function (p) {
      h += '<div class="plan-row"><span class="day">' + p[0] + '</span><span class="task">' + p[1] + '</span><a href="#/m/' + p[2] + '">去复习 →</a></div>';
    });
    h += '</div></section>';

    h += '<section class="section"><div class="section-head"><h2>怎么用这个站</h2><p>三个动作，把「看过」变成「讲得出」</p><div class="line"></div></div><div class="grid cols-3">' +
      '<div class="mod-card"><div class="mc-top"><span class="mc-icon">①</span><h3>先答后看</h3></div><div class="mc-desc">看到问题先在心里（或开口）讲 30 秒，再展开答案对照。直接读答案会产生「我都会了」的错觉。</div></div>' +
      '<div class="mod-card"><div class="mc-top"><span class="mc-icon">②</span><h3>标记掌握</h3></div><div class="mc-desc">能用自己的话讲清「是什么 + 为什么 + 项目里怎么用」，再点「掌握」。进度存在本地，随时继续。</div></div>' +
      '<div class="mod-card"><div class="mc-top"><span class="mc-icon">③</span><h3>随机自测</h3></div><div class="mc-desc">每天做一轮 10 题测验，错题回到对应模块重读。面试前只刷标星 ★★★★★ 的高频题。</div></div>' +
      '</div></section>';

    $('#main').innerHTML = h;
    bindHeroRandom();
  }

  function bindHeroRandom() {
    var b = $('#heroRandom');
    if (b) b.addEventListener('click', openRandom);
  }

  /* ---------------- 模块页 ---------------- */
  function renderModule(id) {
    var m = modById(id);
    if (!m) { renderNotFound(); return; }
    var idx = MODULES.indexOf(m);
    var done = m.items.filter(function (_, i) { return state.mastered.has(itemKey(m, i)); }).length;
    var h = '';
    h += '<div class="mod-head">' +
      '<div class="crumb"><a href="#/home">总览</a> / 模块 ' + String(idx + 1).padStart(2, '0') + '</div>' +
      '<h1><span>' + m.icon + '</span>' + esc(m.title) + '</h1>' +
      '<p class="desc">' + esc(m.desc) + '</p>' +
      '<div class="meta">' + (m.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') +
      '<span class="count">' + m.items.length + ' 道题 · 高频 ' + m.items.filter(function (x) { return x.star >= 5; }).length + ' 道</span></div>' +
      '<div class="mod-progress"><div class="bar"><i id="modProgressBar" data-id="' + m.id + '" style="width:' + (m.items.length ? (done / m.items.length) * 100 : 0) + '%"></i></div><span id="modProgressText">' + done + ' / ' + m.items.length + ' 已掌握</span></div>' +
      '</div>';

    h += '<div class="qlist">';
    m.items.forEach(function (it, i) {
      h += renderQCard(m, it, i);
    });
    h += '</div>';

    h += '<div class="section" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
      (idx > 0 ? '<a class="btn ghost" href="#/m/' + MODULES[idx - 1].id + '">← ' + esc(MODULES[idx - 1].title) + '</a>' : '<span></span>') +
      (idx < MODULES.length - 1 ? '<a class="btn" href="#/m/' + MODULES[idx + 1].id + '">' + esc(MODULES[idx + 1].title) + ' →</a>' : '<a class="btn" href="#/quiz">去自测 →</a>') +
      '</div>';

    $('#main').innerHTML = h;
    updateProgress();
  }

  function renderQCard(m, it, i) {
    var key = itemKey(m, i);
    var isDone = state.mastered.has(key);
    return '<article class="qcard' + (isDone ? ' mastered' : '') + '" data-key="' + key + '">' +
      '<div class="qhead" role="button" tabindex="0" aria-expanded="false">' +
      '<span class="qnum">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span class="qtitle">' + it.q + '</span>' +
      starHtml(it.star || 3) +
      '<span class="master-btn" role="button" tabindex="0" data-master="' + key + '">' + (isDone ? '已掌握' : '标记掌握') + '</span>' +
      '<span class="chev">▾</span>' +
      '</div>' +
      '<div class="qbody">' + it.a + '</div>' +
      '</article>';
  }

  /* ---------------- 搜索 ---------------- */
  function highlight(text, q) {
    var safe = esc(text);
    if (!q) return safe;
    var safeQ = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try { return safe.replace(new RegExp('(' + safeQ + ')', 'gi'), '<mark>$1</mark>'); }
    catch (e) { return safe; }
  }

  function renderSearch(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    var groups = [];
    MODULES.forEach(function (m) {
      var hits = [];
      m.items.forEach(function (it, i) {
        var hay = (it.q + ' ' + strip(it.a)).toLowerCase();
        if (terms.every(function (t) { return hay.indexOf(t) >= 0; })) {
          hits.push({ it: it, i: i });
        }
      });
      if (hits.length) groups.push({ m: m, hits: hits });
    });
    var n = groups.reduce(function (a, g) { return a + g.hits.length; }, 0);

    var h = '<div class="search-head">搜索 <b>' + esc(q) + '</b> · 命中 <b>' + n + '</b> 道题' +
      (n ? ' · 点击题目展开答案' : '') + '</div>';
    if (!n) {
      h += '<div class="empty">没有找到相关题目，试试更短的关键词，比如「击穿」「事务」「线程池」。</div>';
    } else {
      groups.forEach(function (g) {
        h += '<section class="section" style="margin-top:26px"><div class="section-head"><h2><a href="#/m/' + g.m.id + '">' + g.m.icon + ' ' + esc(g.m.title) + ' →</a></h2><span class="count" style="font-size:11px;color:var(--muted)">' + g.hits.length + ' 条</span><div class="line"></div></div><div class="qlist">';
        g.hits.forEach(function (hit) {
          var plain = strip(hit.it.a);
          var low = plain.toLowerCase();
          var pos = low.indexOf(terms[0]);
          var start = Math.max(0, pos - 40);
          var snippet = plain.slice(start, start + 110);
          if (start > 0) snippet = '…' + snippet;
          if (start + 110 < plain.length) snippet += '…';
          h += '<article class="qcard" data-key="' + itemKey(g.m, hit.i) + '">' +
            '<div class="qhead" role="button" tabindex="0" aria-expanded="false"><span class="qnum">' + String(hit.i + 1).padStart(2, '0') + '</span>' +
            '<span class="qtitle">' + highlight(hit.it.q, q) + '<span style="display:block;font-weight:400;font-size:11.5px;color:var(--muted);margin-top:3px">' + highlight(snippet, q) + '</span></span>' +
            starHtml(hit.it.star || 3) +
            '<span class="master-btn" role="button" tabindex="0" data-master="' + itemKey(g.m, hit.i) + '">' + (state.mastered.has(itemKey(g.m, hit.i)) ? '已掌握' : '标记掌握') + '</span>' +
            '<span class="chev">▾</span></div>' +
            '<div class="qbody">' + hit.it.a + '</div></article>';
        });
        h += '</div></section>';
      });
    }
    $('#main').innerHTML = h;
  }

  /* ---------------- 测验 ---------------- */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function startQuiz() {
    var pool = shuffle(QUIZ).slice(0, 10);
    state.quiz = { list: pool, idx: 0, answered: false, picked: null, correct: 0, wrong: [] };
    renderQuiz();
  }

  function renderQuiz() {
    var qz = state.quiz;
    if (!qz) { startQuiz(); return; }

    if (qz.idx >= qz.list.length) {
      var score = Math.round((qz.correct / qz.list.length) * 100);
      var best = Number(localStorage.getItem(LS_BEST) || 0);
      if (score > best) { localStorage.setItem(LS_BEST, String(score)); best = score; }
      var comment = score >= 90 ? '稳了，这就是能拿 offer 的手感。' : score >= 70 ? '主线已经通了，把错题对应模块再刷一遍。' : score >= 50 ? '基础有了，但「为什么」还没讲透，建议回炉。' : '别慌，先按首页 7 天计划走一轮再来测。';
      $('#main').innerHTML = '<div class="quiz-shell"><div class="quiz-card result">' +
        '<div class="score-big">' + score + '</div>' +
        '<h2>' + (score >= 70 ? '表现不错' : '继续打磨') + '</h2>' +
        '<p>' + comment + ' · 本轮答对 ' + qz.correct + ' / ' + qz.list.length + ' 题 · 历史最佳 ' + best + ' 分</p>' +
        '<div class="result-actions"><button class="btn" id="quizAgain">再测一轮</button><a class="btn ghost" href="#/home">回到首页</a></div>' +
        '</div>';
      if (qz.wrong.length) {
        var wh = '<div class="section"><div class="section-head"><h2>错题回顾</h2><p>点开重读，别让同一个坑摔两次</p><div class="line"></div></div><div class="qlist">';
        qz.wrong.forEach(function (w) {
          wh += '<article class="qcard open"><button class="qhead" type="button"><span class="qnum">✕</span><span class="qtitle">' + w.q + '</span>' + starHtml(5) + '<span class="master-btn">错题</span><span class="chev">▾</span></button>' +
            '<div class="qbody"><p><strong>正确答案：</strong>' + esc(w.options[w.answer]) + '</p><p>' + w.explain + '</p><p style="font-size:12px;color:var(--muted)">来源：' + esc(w.modTitle) + '</p></div></article>';
        });
        wh += '</div></div>';
        $('#main').insertAdjacentHTML('beforeend', wh);
      }
      $('#quizAgain').addEventListener('click', startQuiz);
      return;
    }

    var cur = qz.list[qz.idx];
    var h = '<div class="quiz-shell"><div class="quiz-card">' +
      '<div class="quiz-top"><span class="pill">随机测验 · ' + (qz.idx + 1) + ' / ' + qz.list.length + '</span><span>当前答对 ' + qz.correct + ' 题</span></div>' +
      '<div class="quiz-bar"><i style="width:' + (qz.idx / qz.list.length) * 100 + '%"></i></div>' +
      '<h2 class="quiz-q">' + cur.q + '</h2><div class="quiz-opts">';
    cur.options.forEach(function (opt, i) {
      var cls = 'opt';
      if (qz.answered) {
        if (i === cur.answer) cls += ' correct';
        else if (i === qz.picked) cls += ' wrong';
        else cls += ' dim';
      }
      h += '<button class="' + cls + '" data-opt="' + i + '"' + (qz.answered ? ' disabled' : '') + '><span class="key">' + String.fromCharCode(65 + i) + '</span><span>' + opt + '</span></button>';
    });
    h += '</div>';
    if (qz.answered) {
      h += '<div class="quiz-explain"><b>解析：</b>' + cur.explain + (qz.picked === cur.answer ? ' <span style="color:var(--accent-3)">✓ 回答正确</span>' : ' <span style="color:var(--danger)">✕ 正确答案是 ' + String.fromCharCode(65 + cur.answer) + '</span>') + '</div>';
    }
    h += '<div class="quiz-foot"><span class="quiz-score">' + (qz.answered ? '已作答' : '选择一个答案') + '</span>' +
      '<button class="btn" id="nextQ"' + (qz.answered ? '' : ' disabled style="opacity:.4"') + '>' + (qz.idx === qz.list.length - 1 ? '查看结果' : '下一题') + ' →</button></div>';
    h += '</div></div>';
    $('#main').innerHTML = h;
    updateProgress();
  }

  function bindQuiz() {
    $('#main').addEventListener('click', function (e) {
      var opt = e.target.closest('[data-opt]');
      if (opt && state.quiz && !state.quiz.answered) {
        var i = Number(opt.getAttribute('data-opt'));
        var qz = state.quiz;
        var cur = qz.list[qz.idx];
        qz.answered = true;
        qz.picked = i;
        if (i === cur.answer) qz.correct++;
        else qz.wrong.push(cur);
        renderQuiz();
        return;
      }
      if (e.target.closest('#nextQ') && state.quiz && state.quiz.answered) {
        state.quiz.idx++;
        state.quiz.answered = false;
        state.quiz.picked = null;
        renderQuiz();
      }
    });
  }

  /* ---------------- 随机抽题 ---------------- */
  function openRandom() {
    var all = [];
    MODULES.forEach(function (m) { m.items.forEach(function (it, i) { all.push({ m: m, it: it, i: i }); }); });
    if (!all.length) return;
    var pick = all[Math.floor(Math.random() * all.length)];
    $('#randomBody').innerHTML = '<div class="meta-line">' + pick.m.icon + ' ' + esc(pick.m.title) + ' · 第 ' + (pick.i + 1) + ' 题</div>' +
      '<h3>' + pick.it.q + '</h3><div class="qbody">' + pick.it.a + '</div>';
    $('#randomModal').classList.add('show');
    $('#randomModal').setAttribute('aria-hidden', 'false');
  }
  $('#randomBtn').addEventListener('click', openRandom);
  $('#anotherBtn').addEventListener('click', openRandom);
  $('#closeRandom').addEventListener('click', closeRandom);
  function closeRandom() {
    $('#randomModal').classList.remove('show');
    $('#randomModal').setAttribute('aria-hidden', 'true');
  }
  $('#randomModal').addEventListener('click', function (e) { if (e.target === $('#randomModal')) closeRandom(); });

  /* ---------------- 交互委托 ---------------- */
  $('#main').addEventListener('click', function (e) {
    var mb = e.target.closest('[data-master]');
    if (mb) {
      e.preventDefault();
      e.stopPropagation();
      var key = mb.getAttribute('data-master');
      if (state.mastered.has(key)) state.mastered.delete(key); else state.mastered.add(key);
      saveMastered();
      var card = mb.closest('.qcard');
      if (card) {
        card.classList.toggle('mastered', state.mastered.has(key));
        mb.textContent = state.mastered.has(key) ? '已掌握' : '标记掌握';
      }
      updateProgress();
      return;
    }
    var head = e.target.closest('.qhead');
    if (head) {
      var c = head.closest('.qcard');
      var open = c.classList.toggle('open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  });

  $('#main').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var mb = e.target.closest('[data-master]');
    if (mb) { e.preventDefault(); mb.click(); return; }
    var head = e.target.closest('.qhead');
    if (head) { e.preventDefault(); head.click(); }
  });

  /* ---------------- 搜索框 ---------------- */
  var searchEl = $('#search');
  var searchTimer = null;
  searchEl.addEventListener('input', function () {
    clearTimeout(searchTimer);
    var v = searchEl.value.trim();
    searchTimer = setTimeout(function () {
      state.query = v;
      if (v) {
        renderSearch(v);
        window.scrollTo({ top: 0 });
      } else {
        route();
      }
    }, 120);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== searchEl) {
      e.preventDefault();
      searchEl.focus();
      searchEl.select();
    }
    if (e.key === 'Escape') {
      closeRandom();
      if (document.activeElement === searchEl && searchEl.value) {
        searchEl.value = '';
        state.query = '';
        route();
        searchEl.blur();
      }
    }
  });

  $('#resetBtn').addEventListener('click', function () {
    if (!confirm('确定清空所有「已掌握」标记吗？此操作不可撤销。')) return;
    state.mastered.clear();
    saveMastered();
    route();
  });

  /* ---------------- 路由 ---------------- */
  function parseHash() {
    var raw = (location.hash || '#/home').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(Boolean);
    if (parts[0] === 'm' && parts[1]) return { view: 'module', id: decodeURIComponent(parts[1]) };
    if (parts[0] === 'quiz') return { view: 'quiz' };
    return { view: 'home' };
  }

  function route() {
    var r = parseHash();
    if (state.query && searchEl.value.trim()) {
      renderSidebar(r.view === 'module' ? r.id : r.view);
      renderSearch(state.query);
      return;
    }
    if (r.view === 'module') {
      renderSidebar(r.id);
      renderModule(r.id);
    } else if (r.view === 'quiz') {
      renderSidebar('quiz');
      state.quiz = null;
      renderQuiz();
    } else {
      renderSidebar('home');
      renderHome();
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function renderNotFound() {
    $('#main').innerHTML = '<div class="empty">模块不存在，<a href="#/home" style="color:var(--accent-2)">回到首页</a>。</div>';
  }

  window.addEventListener('hashchange', function () {
    searchEl.value = '';
    state.query = '';
    route();
  });

  /* ---------------- 启动 ---------------- */
  applyTheme();
  bindQuiz();
  if (!location.hash) location.hash = '#/home';
  route();
})();
