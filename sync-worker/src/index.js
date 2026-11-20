/*
 * 面试作战室 · 云端 Worker
 * 1) GitHub OAuth + KV 同步学习进度
 * 2) /api/chat：只读 AI 问答（DeepSeek，OpenAI 兼容端点）
 *
 * 环境变量 / Secret：
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *   SESSION_SECRET        随机 32 字节以上
 *   ALLOWED_ORIGINS       逗号分隔，例如 https://unknownman-li.github.io
 *   DEEPSEEK_API_KEY      AI 问答用；不配置时 /api/chat 返回 ai_not_configured
 *   DEEPSEEK_BASE         可选，默认 https://api.deepseek.com
 *   DEEPSEEK_MODEL        可选，默认 deepseek-chat
 *   CHAT_DAILY_LIMIT      可选，默认 30
 * KV 绑定：
 *   PROGRESS_KV
 */

import {
  MAX_BODY,
  allowedOrigins,
  bearer,
  corsHeaders,
  getAuth,
  htmlError,
  json,
  readJson,
  signPayload,
  verifyPayload
} from './lib.js';
import { handleChat } from './chat.js';

const SESSION_TTL = 30 * 24 * 60 * 60;
const STATE_TTL = 10 * 60;

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

function aiConfigured(env) {
  return !!env.DEEPSEEK_API_KEY;
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
        configured: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.SESSION_SECRET && env.PROGRESS_KV),
        ai: aiConfigured(env)
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

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const auth = await getAuth(request, env);
      if (!auth) return json({ error: 'unauthorized' }, 401, request, env);
      return handleChat(request, env, auth);
    }

    return json({ error: 'not_found' }, 404, request, env);
  }
};
