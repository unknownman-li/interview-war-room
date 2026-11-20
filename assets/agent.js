/* AI 问答：全局悬浮入口，点开即可对话。
   只读：不修改学习进度，只解释 / 追问 / 出题。
   依赖 sync.js 提供 Worker 地址和 GitHub 会话。 */
(function () {
  'use strict';

  var LS_HISTORY = 'interview.ai.history.v1';
  var MAX_HISTORY = 40;
  var MAX_SEND = 4000;

  var state = {
    open: false,
    busy: false,
    messages: [],
    context: null,
    quote: '',
    quota: null,
    controller: null,
    renderTimer: null
  };

  var msgSeq = 0;
  function nextId() { msgSeq += 1; return 'm' + Date.now().toString(36) + msgSeq; }
  function newMsg(obj) {
    obj.id = obj.id || nextId();
    return obj;
  }

  function $(sel) { return document.querySelector(sel); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function syncState() {
    return window.Sync ? window.Sync.getState() : { configured: false, workerUrl: '', user: null, status: 'disabled' };
  }

  function token() {
    return window.Sync && window.Sync.getToken ? window.Sync.getToken() : '';
  }

  /* ---------------- Markdown（先转义再拼标签） ---------------- */
  function inlineMd(s) {
    return s
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  }

  function renderMd(src, msgIdx) {
    var text = String(src || '');
    var blocks = [];
    text = text.replace(/```[a-zA-Z0-9+#._-]*\n?([\s\S]*?)```/g, function (_, code) {
      blocks.push('<pre class="ai-code"><code>' + esc(code.replace(/\n$/, '')) + '</code></pre>');
      return '\u0001' + (blocks.length - 1) + '\u0001';
    });

    var lines = esc(text).split('\n');
    var out = [];
    var para = [];
    var list = null;

    function flushPara() {
      if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; }
    }
    function closeList() {
      if (list) { out.push('</' + list + '>'); list = null; }
    }

    lines.forEach(function (line) {
      var t = line.trim();
      if (!t) { flushPara(); closeList(); return; }
      if (/^\u0001\d+\u0001$/.test(t)) { flushPara(); closeList(); out.push(t); return; }

      var h = t.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        flushPara(); closeList();
        var lv = Math.min(4, h[1].length + 2);
        out.push('<h' + lv + '>' + inlineMd(h[2]) + '</h' + lv + '>');
        return;
      }
      if (/^>\s?/.test(t)) {
        flushPara(); closeList();
        out.push('<blockquote>' + inlineMd(t.replace(/^>\s?/, '')) + '</blockquote>');
        return;
      }
      var ul = t.match(/^[-*]\s+(.*)$/);
      if (ul) {
        flushPara();
        if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
        out.push('<li>' + inlineMd(ul[1]) + '</li>');
        return;
      }
      var ol = t.match(/^\d+[.)]\s+(.*)$/);
      if (ol) {
        flushPara();
        if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
        out.push('<li>' + inlineMd(ol[1]) + '</li>');
        return;
      }
      closeList();
      para.push(inlineMd(t));
    });
    flushPara();
    closeList();

    var html = out.join('');
    html = html.replace(/\[(\d{1,2})\]/g, function (_, n) {
      return '<button type="button" class="ai-cite" data-cite="' + n + '"' +
        (msgIdx == null ? '' : ' data-msg="' + esc(msgIdx) + '"') + '>' + n + '</button>';
    });
    html = html.replace(/<p>(\u0001\d+\u0001)<\/p>/g, '$1');
    html = html.replace(/\u0001(\d+)\u0001/g, function (_, i) { return blocks[+i] || ''; });
    return html;
  }

  /* ---------------- 历史 ---------------- */
  function loadHistory() {
    try {
      var raw = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (m) {
        return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
      }).slice(-MAX_HISTORY).map(newMsg);
    } catch (e) { return []; }
  }

  function saveHistory() {
    try {
      var list = state.messages.filter(function (m) {
        return (m.role === 'user' || m.role === 'assistant') && m.content;
      }).slice(-MAX_HISTORY);
      localStorage.setItem(LS_HISTORY, JSON.stringify(list));
    } catch (e) {}
  }

  /* ---------------- 渲染 ---------------- */
  function citationChips(citations, msgId) {
    if (!citations || !citations.length) return '';
    return citations.map(function (c) {
      return '<button type="button" class="ai-cite-chip" data-cite="' + c.n + '"' +
        (msgId ? ' data-msg="' + esc(msgId) + '"' : '') + '>' +
        '[' + c.n + '] ' + esc(c.modTitle) + ' · 第' + (c.idx + 1) + '题</button>';
    }).join('');
  }

  function rowHtml(msg) {
    if (msg.role === 'note') {
      return '<div class="ai-note' + (msg.tone ? ' ' + msg.tone : '') + '">' + msg.content + '</div>';
    }
    if (msg.role === 'user') {
      return '<div class="ai-row user"><div class="ai-bubble">' + esc(msg.content).replace(/\n/g, '<br>') + '</div></div>';
    }
    var body = msg.content
      ? renderMd(msg.content, msg.id)
      : '<span class="ai-typing">思考中<span>.</span><span>.</span><span>.</span></span>';
    var chips = citationChips(msg.citations, msg.id);
    return '<div class="ai-row bot">' +
      '<div class="ai-bubble">' + body + '</div>' +
      (chips ? '<div class="ai-cites">' + chips + '</div>' : '') +
      (msg.content ? '<div class="ai-row-tools"><button type="button" class="ai-copy" data-copy="' + esc(msg.id) + '">复制</button></div>' : '') +
      '</div>';
  }

  function renderMessages() {
    var box = $('#aiMessages');
    if (!box) return;
    var stick = wasNearBottom();
    var html = state.messages.map(rowHtml).join('');
    if (!state.messages.length) {
      html = '<div class="ai-empty">' +
        '<b>有什么不懂的，直接问。</b>' +
        '<p>可以问概念、让它追问你、帮你把答案改得更像面试时说的话。回答会标注题库出处。</p>' +
        '</div>';
    }
    box.innerHTML = html;
    if (stick) box.scrollTop = box.scrollHeight;
  }

  function wasNearBottom() {
    var box = $('#aiMessages');
    if (!box) return true;
    return box.scrollHeight - box.scrollTop - box.clientHeight < 140;
  }

  function scheduleRender() {
    if (state.renderTimer) return;
    state.renderTimer = setTimeout(function () {
      state.renderTimer = null;
      renderMessages();
    }, 80);
  }

  function renderQuota() {
    var el = $('#aiQuota');
    if (!el) return;
    if (state.quota) el.textContent = '今日 ' + state.quota.used + '/' + state.quota.limit;
    else el.textContent = '';
  }

  function renderContext() {
    var el = $('#aiContext');
    if (!el) return;
    var parts = [];
    if (state.context) {
      parts.push('<span class="ai-chip-label">引用</span>' +
        '<span class="ai-chip-text">' + esc(state.context.title) + ' · 第' + (state.context.i + 1) + '题</span>');
    }
    if (state.quote) {
      var q = state.quote.length > 48 ? state.quote.slice(0, 48) + '…' : state.quote;
      parts.push('<span class="ai-chip-label">选中</span><span class="ai-chip-text">「' + esc(q) + '」</span>');
    }
    if (!parts.length) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    el.hidden = false;
    el.innerHTML = '<div class="ai-chip">' + parts.join('') +
      '<button type="button" class="ai-chip-x" data-act="clear-context" title="移除引用">✕</button></div>';
  }

  function setBusy(busy) {
    state.busy = busy;
    var send = $('#aiSend');
    var stop = $('#aiStop');
    var input = $('#aiInput');
    if (send) send.hidden = busy;
    if (stop) stop.hidden = !busy;
    if (input) input.disabled = busy;
    var fab = $('#aiFab');
    if (fab) fab.classList.toggle('busy', busy);
  }

  /* ---------------- 上下文 ---------------- */
  function moduleById(id) {
    var list = window.MODULES || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function cardContext(card) {
    if (!card) return null;
    var mod = moduleById(card.getAttribute('data-mod'));
    var idx = Number(card.getAttribute('data-idx'));
    if (!mod || !isFinite(idx) || !mod.items[idx]) return null;
    return { m: mod.id, i: idx, title: mod.title, q: mod.items[idx].q };
  }

  function currentContext() {
    var main = $('#main');
    if (!main) return null;
    var open = main.querySelector('.qcard.open');
    if (open) return cardContext(open);
    var hash = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    if (hash[0] === 'm' && hash[1]) {
      var mod = moduleById(decodeURIComponent(hash[1]));
      if (mod && mod.items.length) return { m: mod.id, i: 0, title: mod.title, q: mod.items[0].q, weak: true };
    }
    return null;
  }

  function refreshContext() {
    if (state.quote) return;
    var ctx = currentContext();
    state.context = ctx;
    renderContext();
  }

  /* ---------------- 提示 / 错误 ---------------- */
  function notice(kind, text) {
    var html = esc(text || '');
    if (kind === 'config') {
      html = '<b>AI 还没启用</b><p>先在 Worker 上配置 DEEPSEEK_API_KEY，再把 Worker 地址填进云同步。</p>' +
        '<button type="button" class="ai-action" data-act="config">去配置</button>';
    } else if (kind === 'login') {
      html = '<b>登录后才能使用 AI 问答</b><p>用 GitHub 登录，Worker 会校验会话并限制每日次数。</p>' +
        '<button type="button" class="ai-action" data-act="login">使用 GitHub 登录</button>';
    } else if (kind === 'quota') {
      html = '<b>今日次数已用完</b><p>' + esc(text || '明天再来，或临时调高 CHAT_DAILY_LIMIT。') + '</p>';
    }
    state.messages.push(newMsg({ role: 'note', content: html, tone: kind === 'quota' ? 'warn' : '' }));
    renderMessages();
    saveHistory();
  }

  function errorText(code, data) {
    if (code === 'ai_not_configured') return 'Worker 还没配置 DEEPSEEK_API_KEY。';
    if (code === 'chat_quota_exceeded') return '今日次数已用完' + (data && data.limit ? '（' + data.used + '/' + data.limit + '）' : '') + '，明天再来。';
    if (code === 'ai_unreachable') return '连不上模型服务，检查 DEEPSEEK_BASE 或稍后重试。';
    if (code === 'ai_upstream_error') return '模型服务返回错误，稍后重试。';
    if (code === 'bad_messages') return '消息太长或格式不对，缩短后再试。';
    return '请求失败：' + (code || 'unknown');
  }

  /* ---------------- 发送 ---------------- */
  function buildApiMessages() {
    var list = state.messages.filter(function (m) {
      return (m.role === 'user' || m.role === 'assistant') && m.content;
    });
    var out = list.slice(-8).map(function (m) {
      return { role: m.role, content: m.content.slice(0, MAX_SEND) };
    });
    while (out.length && out[0].role === 'assistant') out.shift();
    return out;
  }

  function parseEvent(chunk, assistant) {
    var line = String(chunk || '').trim();
    if (!line || line.indexOf('data:') !== 0) return;
    var obj;
    try { obj = JSON.parse(line.slice(5).trim()); } catch (e) { return; }
    if (obj.type === 'meta') {
      assistant.citations = obj.citations || [];
      if (obj.quota) { state.quota = obj.quota; renderQuota(); }
      scheduleRender();
    } else if (obj.type === 'delta') {
      assistant.content += obj.text || '';
      scheduleRender();
    } else if (obj.type === 'error') {
      assistant.content += '\n\n（回答中断，请重试）';
      scheduleRender();
    }
  }

  async function readStream(res, assistant) {
    var reader = res.body.getReader();
    var dec = new TextDecoder();
    var buf = '';
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buf += dec.decode(chunk.value, { stream: true });
      var idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        var part = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        parseEvent(part, assistant);
      }
    }
    if (buf.trim()) parseEvent(buf, assistant);
  }

  async function send(text) {
    text = String(text || '').trim();
    if (!text || state.busy) return;
    if (text.length > MAX_SEND) text = text.slice(0, MAX_SEND);

    var s = syncState();
    if (!s.configured) { notice('config'); return; }
    if (!token()) { notice('login'); return; }

    state.messages.push(newMsg({ role: 'user', content: text }));
    var assistant = newMsg({ role: 'assistant', content: '', citations: [] });
    state.messages.push(assistant);
    saveHistory();
    renderMessages();

    var box = $('#aiMessages');
    if (box) box.scrollTop = box.scrollHeight;

    setBusy(true);
    state.controller = new AbortController();

    try {
      var res = await fetch(s.workerUrl + '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: 'Bearer ' + token()
        },
        body: JSON.stringify({
          messages: buildApiMessages(),
          context: state.context ? { m: state.context.m, i: state.context.i } : null,
          quote: state.quote || ''
        }),
        signal: state.controller.signal,
        cache: 'no-store'
      });

      if (!res.ok) {
        var data = null;
        try { data = await res.json(); } catch (e) {}
        var code = (data && data.error) || ('HTTP ' + res.status);
        var i = state.messages.indexOf(assistant);
        if (i > -1) state.messages.splice(i, 1);
        if (code === 'unauthorized') {
          notice('login');
        } else if (code === 'chat_quota_exceeded') {
          notice('quota', errorText(code, data));
        } else {
          state.messages.push(newMsg({ role: 'note', tone: 'error', content: esc(errorText(code, data)) }));
        }
        if (res.status === 429 && data && data.limit) {
          state.quota = { used: data.used, limit: data.limit };
          renderQuota();
        }
        renderMessages();
        saveHistory();
        return;
      }

      await readStream(res, assistant);
      if (!assistant.content) assistant.content = '（没有返回内容，换个问法试试）';
      renderMessages();
      saveHistory();
    } catch (e) {
      if (e && e.name === 'AbortError') {
        if (!assistant.content) assistant.content = '（已停止）';
        else assistant.content += '\n\n（已停止）';
      } else {
        var j = state.messages.indexOf(assistant);
        if (j > -1 && !assistant.content) state.messages.splice(j, 1);
        state.messages.push(newMsg({ role: 'note', tone: 'error', content: esc('网络错误：' + (e && e.message ? e.message : '请求失败')) }));
      }
      renderMessages();
      saveHistory();
    } finally {
      state.controller = null;
      setBusy(false);
      state.quote = '';
      renderContext();
    }
  }

  /* ---------------- 跳转 ---------------- */
  function jumpTo(cite) {
    if (!cite) return;
    if (window.innerWidth <= 720) closePanel();
    location.hash = '#/m/' + encodeURIComponent(cite.mod);
    var mod = cite.mod;
    var idx = cite.idx;
    setTimeout(function () {
      var card = document.querySelector('.qcard[data-mod="' + mod + '"][data-idx="' + idx + '"]');
      if (!card) return;
      if (!card.classList.contains('open')) {
        var head = card.querySelector('.qhead');
        if (head) head.click();
      }
      card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 90);
  }

  function findCitation(n, msgId) {
    if (msgId) {
      for (var i = 0; i < state.messages.length; i++) {
        var mm = state.messages[i];
        if (String(mm.id) !== String(msgId) || !mm.citations) continue;
        for (var k = 0; k < mm.citations.length; k++) {
          if (String(mm.citations[k].n) === String(n)) return mm.citations[k];
        }
      }
    }
    for (var j = state.messages.length - 1; j >= 0; j--) {
      var m = state.messages[j];
      if (m.role !== 'assistant' || !m.citations) continue;
      for (var l = 0; l < m.citations.length; l++) {
        if (String(m.citations[l].n) === String(n)) return m.citations[l];
      }
    }
    return null;
  }

  /* ---------------- 面板 ---------------- */
  function openPanel(opts) {
    opts = opts || {};
    if (opts.context !== undefined) state.context = opts.context;
    else refreshContext();
    if (opts.quote !== undefined) state.quote = opts.quote || '';
    renderContext();
    renderQuota();

    state.open = true;
    var panel = $('#aiPanel');
    if (panel) {
      panel.classList.add('show');
      panel.setAttribute('aria-hidden', 'false');
    }
    var fab = $('#aiFab');
    if (fab) fab.classList.add('active');
    hideSelection();

    if (!state.messages.length) state.messages = loadHistory();
    renderMessages();
    var box = $('#aiMessages');
    if (box) box.scrollTop = box.scrollHeight;

    var s = syncState();
    var existing = state.messages.some(function (m) { return m.role === 'note' && /AI 还没启用|登录后才能/.test(m.content); });
    if (!s.configured && !existing) notice('config');
    else if (s.configured && !token() && !existing) notice('login');

    setTimeout(function () {
      var input = $('#aiInput');
      if (input && !state.busy) input.focus();
    }, 60);
  }

  function closePanel() {
    state.open = false;
    var panel = $('#aiPanel');
    if (panel) {
      panel.classList.remove('show');
      panel.setAttribute('aria-hidden', 'true');
    }
    var fab = $('#aiFab');
    if (fab) fab.classList.remove('active');
    hideSelection();
  }

  /* ---------------- 选中文字气泡 ---------------- */
  var selTimer = null;

  function hideSelection() {
    var btn = $('#aiSelection');
    if (btn) btn.hidden = true;
  }

  function showSelection(sel) {
    var btn = $('#aiSelection');
    if (!btn) return;
    var text = String(sel.toString() || '').trim();
    if (text.length < 6 || text.length > 600) { btn.hidden = true; return; }
    var range = sel.getRangeAt(0);
    var node = range.commonAncestorContainer;
    var el = node.nodeType === 1 ? node : node.parentElement;
    var card = el ? el.closest('.qcard') : null;
    if (!card || (el.closest && el.closest('#aiPanel'))) { btn.hidden = true; return; }

    var rect = range.getBoundingClientRect();
    if (!rect.width || !rect.height) { btn.hidden = true; return; }

    btn.dataset.quote = text;
    btn.hidden = false;
    var left = Math.min(window.innerWidth - 96, Math.max(8, rect.left + rect.width / 2 - 44));
    var top = rect.top - 42;
    if (top < 8) top = rect.bottom + 10;
    btn.style.left = left + 'px';
    btn.style.top = Math.max(8, top) + 'px';
    btn._card = card;
  }

  function maybeSelection() {
    clearTimeout(selTimer);
    selTimer = setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { hideSelection(); return; }
      showSelection(sel);
    }, 60);
  }

  /* ---------------- 初始化 ---------------- */
  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(140, el.scrollHeight) + 'px';
  }

  function init() {
    var fab = $('#aiFab');
    if (fab) fab.addEventListener('click', function () {
      if (state.open) closePanel(); else openPanel();
    });

    var close = $('#aiClose');
    if (close) close.addEventListener('click', closePanel);

    var clear = $('#aiClear');
    if (clear) clear.addEventListener('click', function () {
      if (!state.messages.length) return;
      if (!confirm('清空当前对话记录？')) return;
      state.messages = [];
      state.quote = '';
      state.quota = null;
      renderQuota();
      renderContext();
      saveHistory();
      renderMessages();
    });

    var form = $('#aiForm');
    var input = $('#aiInput');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input ? input.value : '';
      if (!v.trim()) return;
      if (input) { input.value = ''; autoGrow(input); }
      send(v);
    });
    if (input) {
      input.addEventListener('input', function () { autoGrow(input); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          if (form) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      });
    }

    var stop = $('#aiStop');
    if (stop) stop.addEventListener('click', function () {
      if (state.controller) state.controller.abort();
    });

    var suggest = $('#aiSuggest');
    if (suggest) suggest.addEventListener('click', function (e) {
      var b = e.target.closest('[data-suggest]');
      if (!b) return;
      send(b.getAttribute('data-suggest'));
    });

    var panel = $('#aiPanel');
    if (panel) panel.addEventListener('click', function (e) {
      var c = e.target.closest('[data-cite]');
      if (c) {
        jumpTo(findCitation(c.getAttribute('data-cite'), c.getAttribute('data-msg')));
        return;
      }

      var copy = e.target.closest('[data-copy]');
      if (copy) {
        var cid = copy.getAttribute('data-copy');
        var msg = null;
        for (var mi = 0; mi < state.messages.length; mi++) {
          if (String(state.messages[mi].id) === String(cid)) { msg = state.messages[mi]; break; }
        }
        if (msg && msg.content && navigator.clipboard) {
          navigator.clipboard.writeText(msg.content).then(function () {
            copy.textContent = '已复制';
            setTimeout(function () { copy.textContent = '复制'; }, 1500);
          }).catch(function () {});
        }
        return;
      }

      var act = e.target.closest('[data-act]');
      if (act) {
        var name = act.getAttribute('data-act');
        if (name === 'clear-context') {
          state.context = null;
          state.quote = '';
          refreshContext();
          renderContext();
        } else if (name === 'config') {
          closePanel();
          var syncBtn = $('#syncBtn');
          if (syncBtn) syncBtn.click();
        } else if (name === 'login') {
          if (window.Sync) window.Sync.login();
        }
      }
    });

    var selBtn = $('#aiSelection');
    if (selBtn) selBtn.addEventListener('click', function () {
      var quote = selBtn.dataset.quote || '';
      var card = selBtn._card || null;
      hideSelection();
      var sel = window.getSelection();
      if (sel) sel.removeAllRanges();
      openPanel({ context: cardContext(card), quote: quote });
      var inputEl = $('#aiInput');
      if (inputEl) inputEl.focus();
    });

    document.addEventListener('mouseup', function (e) {
      if (e.target && e.target.closest && e.target.closest('#aiPanel')) return;
      maybeSelection();
    });
    document.addEventListener('selectionchange', function () {
      if (document.activeElement && document.activeElement.id === 'aiInput') return;
      maybeSelection();
    });
    window.addEventListener('scroll', hideSelection, true);
    window.addEventListener('hashchange', function () {
      if (state.open) refreshContext();
      hideSelection();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.open) {
        closePanel();
      }
    });

    if (state.messages.length === 0) state.messages = loadHistory();
    renderMessages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
