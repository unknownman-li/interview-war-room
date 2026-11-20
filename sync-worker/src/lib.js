/* 共享工具：CORS、JSON 响应、签名会话、请求体读取 */

export const MAX_BODY = 1024 * 1024;
const encoder = new TextEncoder();

export function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

export function corsHeaders(request, env) {
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

export function json(data, status, request, env) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  const cors = corsHeaders(request, env);
  Object.keys(cors).forEach(function (k) { headers[k] = cors[k]; });
  return new Response(JSON.stringify(data), { status: status || 200, headers: headers });
}

export function htmlError(message, status) {
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

export function b64url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(str) {
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

export async function signPayload(payload, env) {
  const body = b64urlJson(payload);
  return body + '.' + await hmac(body, env.SESSION_SECRET);
}

export async function verifyPayload(token, env) {
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

export function bearer(request) {
  const h = request.headers.get('Authorization') || '';
  return h.indexOf('Bearer ') === 0 ? h.slice(7).trim() : '';
}

export async function readJson(request, limit) {
  const max = limit || MAX_BODY;
  const text = await request.text();
  if (!text || text.length > max) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}

export async function getAuth(request, env) {
  return verifyPayload(bearer(request), env);
}
