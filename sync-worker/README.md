# 云同步 Worker（GitHub OAuth + Cloudflare KV）

站点是纯静态的，真正的登录和存储由这个 Worker 完成：

- 登录：GitHub OAuth，只申请 `read:user`
- 存储：Cloudflare KV，key 为 `progress:<GitHub 用户 id>`
- 前端只拿到一个签名的会话 token，不接触 GitHub Client Secret
- 每个 GitHub 用户只能读写自己的进度

## 1. 准备

需要：

- 一个 Cloudflare 账号
- 一个 GitHub 账号
- 本地能运行 Node.js（`npx wrangler`）

在 `sync-worker` 目录执行：

```bash
npx wrangler login
npx wrangler kv namespace create PROGRESS_KV
```

把命令输出的 `id` 填到 `wrangler.toml` 的 `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`。

## 2. 创建 GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App。

- Application name：`面试作战室同步`
- Homepage URL：`https://unknownman-li.github.io/interview-war-room/`
- Authorization callback URL：`https://<你的-worker>.<你的子域>.workers.dev/auth/callback`

> 回调地址必须和 Worker 实际地址完全一致。先部署 Worker 拿到地址，再回来填这里也可以。

创建后拿到：

- Client ID
- Client Secret（点 Generate a new client secret）

## 3. 配置 Secret

在 `sync-worker` 目录执行，按提示粘贴：

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

`SESSION_SECRET` 用随机字符串，至少 32 字节。PowerShell 可以这样生成：

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## 4. 部署

```bash
npx wrangler deploy
```

记下输出的地址，例如：

```text
https://interview-war-room-sync.your-name.workers.dev
```

先访问 `/health`，应该返回：

```json
{"ok":true,"configured":true}
```

如果不是 `configured:true`，检查三个 Secret 和 KV 绑定。

## 5. AI 问答（可选）

同一个 Worker 也提供 `/api/chat`，给站点的「问 AI」用。只需要再加一个 Secret：

```bash
npx wrangler secret put DEEPSEEK_API_KEY
```

可选变量（写在 `wrangler.toml` 的 `[vars]`）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DEEPSEEK_BASE` | `https://api.deepseek.com` | 任何 OpenAI 兼容端点 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 模型名 |
| `CHAT_DAILY_LIMIT` | `30` | 每个 GitHub 用户每天次数 |

行为：

- 只读，不碰学习进度；回答只基于题库检索出的 5 道题，要求带 `[编号]` 引用
- 流式 SSE 返回，首字延迟主要取决于模型
- 超过每日次数返回 429；未配置 Key 返回 503 `ai_not_configured`
- 修改题库后重新生成检索索引：

```bash
npm run index      # 等价于 node scripts/build-index.cjs
npx wrangler deploy
```

`/health` 会多返回一个 `ai` 字段，确认 Key 是否生效：

```json
{"ok":true,"configured":true,"ai":true}
```

## 6. 在站点里启用

打开站点 → 点顶栏的 `☁` → 把 Worker 地址填进去 → 保存并连接 → 使用 GitHub 登录。

也可以直接把地址写进 `assets/sync-config.js`：

```js
window.SYNC_CONFIG = { workerUrl: 'https://interview-war-room-sync.your-name.workers.dev' };
```

## 本地调试

```bash
npx wrangler dev
```

本地 Worker 默认在 `http://127.0.0.1:8787`，`ALLOWED_ORIGINS` 已经包含 `http://127.0.0.1:8765`。本地 OAuth 回调需要单独建一个 GitHub OAuth App，或者临时把回调地址改成 `http://127.0.0.1:8787/auth/callback`。

## 数据与限制

- 进度是一个 JSON blob，前端会做字段校验、答案 HTML 过滤。
- Worker 限制单次请求体 1 MB；`/api/chat` 另有 64 KB 限制、单条 4k 字符、最多 8 轮上下文。
- KV 免费额度足够个人使用；写入是最终一致的，极短时间内多设备同时写可能产生一次冲突，前端会用 `baseRevision` 检测并合并重试。
- AI 配额计数也在 KV，最终一致意味着并发请求可能略微超出上限，个人使用无需在意。
- 退出登录只清除当前浏览器的 token；token 本身 30 天过期。需要立即失效可以更换 `SESSION_SECRET`（会让所有设备重新登录）。
