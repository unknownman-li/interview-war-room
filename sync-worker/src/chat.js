/*
 * /api/chat：只读 AI 问答
 * - 检索：内置题库 BM25（中文二元组），取 top 5 作为资料
 * - 模型：DeepSeek / 任意 OpenAI 兼容端点，流式返回
 * - 配额：按 GitHub 用户按天计数，默认 30 次
 * - 只读：不读写学习进度，不提供任何写操作
 */

import { json, readJson } from './lib.js';
import { DOCS } from './search-index.js';

const DEFAULT_LIMIT = 30;
const MAX_INPUT = 4000;
const MAX_TOTAL = 12000;
const MAX_QUOTE = 1000;
const TIMEOUT_MS = 30000;
const TOP_K = 5;

const SYSTEM_PROMPT = [
  '你是「面试作战室」的学习助教，服务对象是准备 Java 后端 / IoT 岗位面试的候选人。',
  '',
  '规则：',
  '1. 只依据下面提供的【资料】回答。资料没覆盖的部分，直接说「题库里没有覆盖」，可以补充通用知识，但必须标注「以下是通用补充」。',
  '2. 不要把资料之外的具体数字、公司名、压测结果当成事实。',
  '3. 用中文回答，先给结论，再给 2-4 点解释，总长度 400 字以内，除非用户明确要求展开。',
  '4. 引用资料时在句末标注 [编号]，编号必须来自给定资料。',
  '5. 不要输出 HTML，不要用一级标题，可以用短列表和行内代码。',
  '6. 用户是在准备面试，优先给「能说出口」的表达，不要背教科书定义。'
].join('\n');

const CJK_RUN = /[\u4e00-\u9fff]+/g;
const LATIN = /[a-z0-9][a-z0-9+#._-]*/g;

function tokenize(s) {
  const text = String(s || '').toLowerCase();
  const out = [];
  const latin = text.match(LATIN);
  if (latin) for (const t of latin) out.push(t);
  const runs = text.match(CJK_RUN);
  if (runs) {
    for (const run of runs) {
      if (run.length === 1) { out.push(run); continue; }
      for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2));
    }
  }
  return out;
}

/* 关键词权重在构建期算好（scripts/build-index.cjs），这里只做集合求交 */
function search(query, limit) {
  const qSet = new Set(tokenize(query));
  if (!qSet.size) return [];

  const q = String(query || '').trim();
  const scored = [];

  for (let i = 0; i < DOCS.length; i++) {
    const doc = DOCS[i];
    let score = 0;
    if (doc.k) {
      for (const pair of doc.k) {
        if (qSet.has(pair[0])) score += pair[1];
      }
    }
    if (score <= 0) continue;

    /* 问题原文命中，额外加权 */
    const head = q.slice(0, 12);
    if (head.length >= 4 && doc.q.indexOf(head) > -1) score *= 1.35;
    scored.push({ i: i, score: score });
  }

  scored.sort(function (a, b2) { return b2.score - a.score; });
  const out = [];
  for (const hit of scored) {
    if (out.length >= limit) break;
    out.push(DOCS[hit.i]);
  }
  return out;
}

function findDoc(mod, idx) {
  for (const d of DOCS) {
    if (d.m === mod && d.i === idx) return d;
  }
  return null;
}

function buildMaterials(docs) {
  return docs.map(function (d, i) {
    return '【资料' + (i + 1) + '】' + d.mt + ' / 第' + (d.i + 1) + '题：' + d.q + '\n' + d.t;
  }).join('\n\n');
}

function citationsOf(docs) {
  return docs.map(function (d, i) {
    return { n: i + 1, mod: d.m, modTitle: d.mt, idx: d.i, q: d.q, star: d.s };
  });
}

function sseHeaders(request, env) {
  const headers = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Accel-Buffering': 'no'
  };
  const origin = request.headers.get('Origin') || '';
  if (origin && String(env.ALLOWED_ORIGINS || '').split(',').map(function (s) { return s.trim(); }).indexOf(origin) > -1) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Authorization,Content-Type';
    headers['Access-Control-Allow-Methods'] = 'POST,OPTIONS';
    headers.Vary = 'Origin';
  }
  return headers;
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw) || !raw.length) return null;
  const out = [];
  let total = 0;
  for (const m of raw.slice(-8)) {
    if (!m || typeof m !== 'object') return null;
    const role = m.role === 'assistant' ? 'assistant' : (m.role === 'user' ? 'user' : null);
    if (!role) return null;
    const content = typeof m.content === 'string' ? m.content.trim() : '';
    if (!content || content.length > MAX_INPUT) return null;
    total += content.length;
    if (total > MAX_TOTAL) return null;
    out.push({ role: role, content: content });
  }
  while (out.length && out[0].role === 'assistant') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

export async function handleChat(request, env, auth) {
  if (!env.DEEPSEEK_API_KEY) {
    return json({ error: 'ai_not_configured' }, 503, request, env);
  }

  const body = await readJson(request, 64000);
  if (!body || typeof body !== 'object') return json({ error: 'bad_json' }, 400, request, env);

  const messages = sanitizeMessages(body.messages);
  if (!messages) return json({ error: 'bad_messages' }, 400, request, env);

  const quote = typeof body.quote === 'string' ? body.quote.trim().slice(0, MAX_QUOTE) : '';
  const last = messages[messages.length - 1].content;

  const ctx = body.context && typeof body.context === 'object' ? body.context : null;
  const ctxDoc = ctx ? findDoc(String(ctx.m || ''), Number(ctx.i)) : null;

  const query = [last, quote, ctxDoc ? ctxDoc.q : ''].filter(Boolean).join(' ');
  let docs = search(query, TOP_K);
  if (ctxDoc) {
    docs = [ctxDoc].concat(docs.filter(function (d) { return !(d.m === ctxDoc.m && d.i === ctxDoc.i); })).slice(0, TOP_K);
  }
  if (!docs.length) docs = DOCS.slice(0, TOP_K);

  const limit = Number(env.CHAT_DAILY_LIMIT) || DEFAULT_LIMIT;
  const day = new Date().toISOString().slice(0, 10);
  const quotaKey = 'chat:quota:' + auth.uid + ':' + day;
  let used = 0;
  try {
    used = Number(await env.PROGRESS_KV.get(quotaKey)) || 0;
  } catch (e) {
    used = 0;
  }
  if (used >= limit) {
    return json({ error: 'chat_quota_exceeded', limit: limit, used: used }, 429, request, env);
  }

  const upstreamMessages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n【资料】\n' + buildMaterials(docs) }
  ].concat(messages);

  if (quote) {
    const tail = upstreamMessages[upstreamMessages.length - 1];
    tail.content = tail.content + '\n\n（我选中的原文是：「' + quote + '」，请结合这段解释）';
  }

  const base = String(env.DEEPSEEK_BASE || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = String(env.DEEPSEEK_MODEL || 'deepseek-chat');
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
  if (request.signal) {
    request.signal.addEventListener('abort', function () { controller.abort(); });
  }

  let upstream;
  try {
    upstream = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.DEEPSEEK_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream'
      },
      body: JSON.stringify({
        model: model,
        messages: upstreamMessages,
        stream: true,
        temperature: 0.3,
        max_tokens: 1200
      }),
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timer);
    return json({ error: 'ai_unreachable' }, 502, request, env);
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timer);
    let detail = '';
    try { detail = (await upstream.text()).slice(0, 300); } catch (e) {}
    console.error('deepseek error', upstream.status, detail);
    return json({ error: 'ai_upstream_error', status: upstream.status }, 502, request, env);
  }

  try {
    await env.PROGRESS_KV.put(quotaKey, String(used + 1), { expirationTtl: 172800 });
  } catch (e) {}

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = upstream.body.getReader();
  const citations = citationsOf(docs);

  const stream = new ReadableStream({
    async start(out) {
      const send = function (obj) {
        out.enqueue(enc.encode('data: ' + JSON.stringify(obj) + '\n\n'));
      };
      send({ type: 'meta', citations: citations, quota: { used: used + 1, limit: limit } });

      let buffer = '';
      let usage = null;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += dec.decode(chunk.value, { stream: true });
          let nl;
          while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            let obj;
            try { obj = JSON.parse(payload); } catch (e) { continue; }
            if (obj.usage) usage = obj.usage;
            const choice = obj.choices && obj.choices[0];
            const text = choice && choice.delta && choice.delta.content;
            if (text) send({ type: 'delta', text: text });
          }
        }
        send({ type: 'done', usage: usage });
      } catch (e) {
        try { send({ type: 'error', error: 'stream_interrupted' }); } catch (e2) {}
      } finally {
        clearTimeout(timer);
        try { out.close(); } catch (e) {}
      }
    },
    cancel() {
      clearTimeout(timer);
      try { reader.cancel(); } catch (e) {}
    }
  });

  return new Response(stream, { status: 200, headers: sseHeaders(request, env) });
}
