/* 云同步：GitHub 登录由 Cloudflare Worker 完成，进度存 Cloudflare KV。
   没有配置 Worker 时完全不发请求，站点仍然是纯本地、可离线使用。 */
(function () {
  'use strict';

  var TOKEN_KEY = 'interview.sync.token.v1';
  var WORKER_KEY = 'interview.sync.worker.v1';
  var META_KEY = 'interview.sync.meta.v1';
  var DEFAULT_WORKER = String((window.SYNC_CONFIG && window.SYNC_CONFIG.workerUrl) || '').replace(/\/+$/, '');

  var workerUrl = '';
  var token = '';
  var user = null;
  var revision = 0;
  var status = 'disabled';
  var lastError = '';
  var lastSyncAt = 0;
  var running = false;
  var pending = false;
  var timer = null;
  var callbacks = { getLocal: null, applyRemote: null, onStatus: null };

  function now() { return Date.now(); }

  function stateSnapshot() {
    return {
      status: status,
      configured: !!workerUrl,
      workerUrl: workerUrl,
      user: user,
      lastSyncAt: lastSyncAt,
      error: lastError,
      revision: revision
    };
  }

  function setStatus(s, detail) {
    status = s;
    lastError = detail || '';
    if (s === 'synced') {
      lastSyncAt = now();
      try { localStorage.setItem(META_KEY, String(lastSyncAt)); } catch (e) {}
    }
    if (callbacks.onStatus) callbacks.onStatus(stateSnapshot());
  }

  function clearSession() {
    token = '';
    user = null;
    revision = 0;
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  function captureToken() {
    try {
      var u = new URL(location.href);
      var t = u.searchParams.get('sync_token');
      var err = u.searchParams.get('sync_error');
      if (t) {
        token = t;
        localStorage.setItem(TOKEN_KEY, t);
      }
      if (err) lastError = err;
      if (t || err) {
        u.searchParams.delete('sync_token');
        u.searchParams.delete('sync_error');
        u.searchParams.delete('sync');
        history.replaceState(null, '', u.pathname + u.search + u.hash);
      }
    } catch (e) {}
  }

  async function api(path, options) {
    options = options || {};
    var headers = { Accept: 'application/json' };
    if (options.headers) {
      Object.keys(options.headers).forEach(function (k) { headers[k] = options.headers[k]; });
    }
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options.body) headers['Content-Type'] = 'application/json';

    var res = await fetch(workerUrl + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body,
      cache: 'no-store'
    });
    var text = await res.text();
    var data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (e) {}
    }
    if (!res.ok) {
      var err = new Error((data && (data.error || data.message)) || ('HTTP ' + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function getLocal() {
    return callbacks.getLocal ? callbacks.getLocal() : null;
  }

  async function pushWithRetry(data, base, depth) {
    depth = depth || 0;
    try {
      var res = await api('/api/progress', {
        method: 'PUT',
        body: JSON.stringify({ baseRevision: base, data: data })
      });
      revision = Number(res && res.revision) || revision;
      setStatus('synced');
      return res;
    } catch (e) {
      if (e.status === 409 && e.data && e.data.data && depth < 3) {
        var merged = window.Progress.merge(data, e.data.data);
        revision = Number(e.data.revision) || 0;
        if (callbacks.applyRemote) callbacks.applyRemote(merged);
        return pushWithRetry(merged, revision, depth + 1);
      }
      throw e;
    }
  }

  async function pull() {
    if (!token) return;
    var remote = await api('/api/progress');
    revision = Number(remote && remote.revision) || 0;
    var local = getLocal();
    if (!local) return;

    if (!remote.data) {
      await pushWithRetry(local, 0);
      return;
    }

    var merged = window.Progress.merge(local, remote.data);
    var mergedPrint = window.Progress.fingerprint(merged);
    if (mergedPrint !== window.Progress.fingerprint(local)) {
      if (callbacks.applyRemote) callbacks.applyRemote(merged);
    }
    if (mergedPrint !== window.Progress.fingerprint(remote.data)) {
      await pushWithRetry(merged, revision);
    } else {
      setStatus('synced');
    }
  }

  async function syncNow() {
    if (!workerUrl || !token) return;
    if (running) { pending = true; return; }
    if (navigator.onLine === false) {
      setStatus('error', '当前网络不可用，恢复后会自动重试');
      return;
    }
    running = true;
    pending = false;
    setStatus('syncing');
    try {
      await pull();
    } catch (e) {
      if (e.status === 401) {
        clearSession();
        setStatus('logged-out', '登录已过期，请重新登录');
      } else {
        setStatus('error', e.message || '同步失败');
      }
    } finally {
      running = false;
      if (pending) { pending = false; syncNow(); }
    }
  }

  function schedule() {
    if (!workerUrl || !token) return;
    clearTimeout(timer);
    timer = setTimeout(syncNow, 1200);
  }

  async function init(opts) {
    if (opts) {
      if (opts.getLocal) callbacks.getLocal = opts.getLocal;
      if (opts.applyRemote) callbacks.applyRemote = opts.applyRemote;
      if (opts.onStatus) callbacks.onStatus = opts.onStatus;
    }

    try {
      workerUrl = String(localStorage.getItem(WORKER_KEY) || DEFAULT_WORKER || '').replace(/\/+$/, '');
      token = localStorage.getItem(TOKEN_KEY) || '';
      lastSyncAt = Number(localStorage.getItem(META_KEY) || 0);
    } catch (e) {}

    captureToken();

    if (!workerUrl) { setStatus('disabled'); return; }
    if (!token) { setStatus('logged-out', lastError); return; }

    setStatus('connecting');
    try {
      var me = await api('/api/me');
      user = me.user || null;
      await pull();
    } catch (e) {
      if (e.status === 401) {
        clearSession();
        setStatus('logged-out', '登录已过期，请重新登录');
      } else {
        setStatus('error', e.message || '连接同步服务失败');
      }
    }
  }

  function login() {
    if (!workerUrl) { setStatus('disabled'); return; }
    if (location.protocol === 'file:') {
      setStatus('error', '当前是本地文件方式打开，浏览器会拦截跨域登录。请用 GitHub Pages 或本地 http 服务器访问。');
      return;
    }
    var redirect = location.origin + location.pathname;
    location.href = workerUrl + '/auth/login?redirect=' + encodeURIComponent(redirect);
  }

  function logout() {
    var old = token;
    clearSession();
    setStatus('logged-out');
    if (workerUrl && old) {
      fetch(workerUrl + '/auth/logout', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + old }
      }).catch(function () {});
    }
  }

  function setWorkerUrl(url) {
    url = String(url || '').trim().replace(/\/+$/, '');
    if (url && !/^https?:\/\//i.test(url)) {
      throw new Error('地址必须以 http:// 或 https:// 开头');
    }
    try {
      if (url) localStorage.setItem(WORKER_KEY, url);
      else localStorage.removeItem(WORKER_KEY);
    } catch (e) {}
    workerUrl = url;
    clearSession();
    setStatus(url ? 'logged-out' : 'disabled');
  }

  window.addEventListener('focus', function () {
    if (token && now() - lastSyncAt > 30000) syncNow();
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && token && now() - lastSyncAt > 30000) syncNow();
  });
  window.addEventListener('online', function () {
    if (token) syncNow();
  });

  window.Sync = {
    init: init,
    login: login,
    logout: logout,
    syncNow: syncNow,
    schedule: schedule,
    setWorkerUrl: setWorkerUrl,
    getState: stateSnapshot,
    getToken: function () { return token; }
  };
})();
