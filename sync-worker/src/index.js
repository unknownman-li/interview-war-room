/*
 * 面试作战室 · 云同步 Worker
 * GitHub OAuth + Cloudflare KV，只存当前 GitHub 用户的学习进度。
 *
 * 环境变量 / Secret：
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *   SESSION_SECRET        随机 32 字节以上
 *   ALLOWED_ORIGINS       逗号分隔，例如 https://unknownman-li.github.io
 * KV 绑定：
 *   PROGRESS_KV
 */

const SESSION_TTL = 30 * 24 * 60 * 60;
const STATE_TTL = 10 * 60;
const MAX_BODY = 1024 * 1024;
const encoder = new TextEncoder();

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!origin || allowedOrigins(env).indexOf(origin) === -1) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function json(data, status, request, env) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  const cors = corsHeaders(request, env);
  Object.keys(cors).forEach(function (k) { headers[k] = cors[k]; });
  return new Response(JSON.stringify(data), { status: status || 200, headers: headers });
}

function htmlError(message, status) {
  const safe = String(message || '登录失败').replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
  return new Response(
    '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>登录失败</title>' +
    '<body style="font-family:system-ui;padding:40px;line-height:1.7">' +
    '<h2>登录失败</h2><p>' + safe + '</p><p><a href="javascript:history.back()">返回</a></p></body></html>',
    { status: status || 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function b64url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function b64urlJson(obj) {
  return b64url(encoder.encode(JSON.stringify(obj)));
}

function parseB64urlJson(str) {
  return JSON.parse(new TextDecoder().decode(b64urlDecode(str)));
}

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return b64url(sig);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function signPayload(payload, env) {
  const body = b64urlJson(payload);
  return body + '.' + await hmac(body, env.SESSION_SECRET);
}

async function verifyPayload(token, env) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = await hmac(body, env.SESSION_SECRET);
  if (!timingSafeEqual(sig, expect)) return null;
  let payload;
  try { payload = parseB64urlJson(body); } catch (e) { return null; }
  if (!payload || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function bearer(request) {
  const h = request.headers.get('Authorization') || '';
  return h.indexOf('Bearer ') === 0 ? h.slice(7).trim() : '';
}

async function readJson(request) {
  const text = await request.text();
  if (!text || text.length > MAX_BODY) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

async function getAuth(request, env) {
  return verifyPayload(bearer(request), env);
}

async function handleLogin(request, url, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET) {
    return json({ error: 'worker_not_configured' }, 500, request, env);
  }

  const redirect = url.searchParams.get('redirect') || '';
  let target;
  try { target = new URL(redirect); } catch (e) { return json({ error: 'bad_redirect' }, 400, request, env); }
  if (allowedOrigins(env).indexOf(target.origin) === -1) {
    return json({ error: 'origin_not_allowed' }, 403, request, env);
  }

  const state = await signPayload({
    redirect: target.toString(),
    exp: Math.floor(Date.now() / 1000) + STATE_TTL,
    nonce: crypto.randomUUID()
  }, env);

  const callback = new URL('/auth/callback', url.origin).toString();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', callback);
  authorize.searchParams.set('scope', 'read:user');
  authorize.searchParams.set('state', state);

  return Response.redirect(authorize.toString(), 302);
}

async function handleCallback(request, url, env) {
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  const payload = await verifyPayload(state, env);
  if (!payload || !payload.redirect) return htmlError('登录状态已过期，请回到站点重新点击登录。', 400);
  if (!code) return htmlError('GitHub 没有返回授权码，请重新登录。', 400);

  const callback = new URL('/auth/callback', url.origin).toString();
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'interview-war-room-sync'
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code,
      redirect_uri: callback
    })
  });
  const tokenData = await tokenRes.json().catch(function () { return {}; });
  if (!tokenData.access_token) {
    return htmlError('GitHub 授权失败：' + (tokenData.error_description || tokenData.error || 'unknown'), 400);
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: 'Bearer ' + tokenData.access_token,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'interview-war-room-sync'
    }
  });
  if (!userRes.ok) return htmlError('读取 GitHub 用户信息失败，请重试。', 502);
  const ghUser = await userRes.json();

  const session = await signPayload({
    uid: String(ghUser.id),
    login: ghUser.login,
    name: ghUser.name || ghUser.login,
    avatar: ghUser.avatar_url || '',
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL
  }, env);

  const dest = new URL(payload.redirect);
  dest.searchParams.set('sync_token', session);
  dest.searchParams.set('sync', '1');
  return Response.redirect(dest.toString(), 302);
}

async function handleProgress(request, env, auth) {
  const key = 'progress:' + auth.uid;

  if (request.method === 'GET') {
    const raw = await env.PROGRESS_KV.get(key);
    if (!raw) return json({ revision: 0, data: null, updatedAt: null }, 200, request, env);
    let rec;
    try { rec = JSON.parse(raw); } catch (e) { rec = null; }
    if (!rec) return json({ revision: 0, data: null, updatedAt: null }, 200, request, env);
    return json({
      revision: Number(rec.revision) || 0,
      data: rec.data || null,
      updatedAt: rec.updatedAt || null
    }, 200, request, env);
  }

  if (request.method === 'PUT') {
    const body = await readJson(request);
    if (!body || typeof body !== 'object') return json({ error: 'bad_json' }, 400, request, env);
    const data = body.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return json({ error: 'bad_data' }, 400, request, env);
    }
    const text = JSON.stringify(data);
    if (text.length > MAX_BODY) return json({ error: 'payload_too_large' }, 413, request, env);

    const currentRaw = await env.PROGRESS_KV.get(key);
    let current = null;
    if (currentRaw) {
      try { current = JSON.parse(currentRaw); } catch (e) { current = null; }
    }
    const currentRevision = current ? (Number(current.revision) || 0) : 0;
    const baseRevision = Number(body.baseRevision) || 0;

    if (baseRevision !== currentRevision) {
      return json({
        error: 'conflict',
        revision: currentRevision,
        data: current ? current.data || null : null,
        updatedAt: current ? current.updatedAt || null : null
      }, 409, request, env);
    }

    const revision = currentRevision + 1;
    const updatedAt = new Date().toISOString();
    await env.PROGRESS_KV.put(key, JSON.stringify({ revision: revision, updatedAt: updatedAt, data: data }));
    return json({ revision: revision, updatedAt: updatedAt }, 200, request, env);
  }

  return json({ error: 'method_not_allowed' }, 405, request, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (url.pathname === '/health') {
      return json({
        ok: true,
        configured: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.SESSION_SECRET && env.PROGRESS_KV)
      }, 200, request, env);
    }

    if (url.pathname === '/auth/login' && request.method === 'GET') {
      return handleLogin(request, url, env);
    }

    if (url.pathname === '/auth/callback' && request.method === 'GET') {
      return handleCallback(request, url, env);
    }

    if (url.pathname === '/auth/logout' && request.method === 'POST') {
      return json({ ok: true }, 200, request, env);
    }

    if (url.pathname === '/api/me' && request.method === 'GET') {
      const auth = await getAuth(request, env);
      if (!auth) return json({ error: 'unauthorized' }, 401, request, env);
      return json({
        user: { login: auth.login || '', name: auth.name || auth.login || '', avatar: auth.avatar || '' }
      }, 200, request, env);
    }

    if (url.pathname === '/api/progress' && (request.method === 'GET' || request.method === 'PUT')) {
      const auth = await getAuth(request, env);
      if (!auth) return json({ error: 'unauthorized' }, 401, request, env);
      return handleProgress(request, env, auth);
    }

    return json({ error: 'not_found' }, 404, request, env);
  }
};
