# 面试作战室 · 本地生活 + IoT 桥梁监测

围绕简历两个项目「本地生活点评平台」和「市政桥梁健康监测平台」整理的 Java 后端 / IoT 八股知识库。纯静态站点，双击即可离线学习。

## 打开方式

**方式一（最简单）**：双击 `打开八股网站.bat`，或直接双击 `index.html`。

**方式二（本地服务器，推荐长期使用）**：

```bash
# 在 interview-notes 目录下
npx serve .
# 或
python -m http.server 8080
```

然后访问 `http://localhost:8080`。

站点本身无任何外部依赖，不需要联网，不需要构建，所有脚本都是本地文件；只有开启可选的云同步时才访问自己的 Worker。

打开后会先看到一个星空粒子启动页：点击任意处、点「进入作战室」，或按 `Enter` 进入主界面。

## 在线访问

**https://unknownman-li.github.io/interview-war-room/**

已部署到 GitHub Pages（公开仓库：[interview-war-room](https://github.com/unknownman-li/interview-war-room)）。备用地址：<https://interview-war-room.deed.page/>。

修改内容后，在本地运行下面命令即可更新同一链接：

```bash
node ..\.deploy\deploy-github.cjs
```

部署凭证保存在 `E:\opendcode\.deploy\github-token.txt`，请勿公开或提交到仓库。

## 内容规模

- **13 个知识模块**
- **200 道问答 / 八股**
- **60 道单选自测题**
- 其中 **91 道**标记为 ★★★★★ 高频必背

| 模块 | 内容 |
| --- | --- |
| 项目总览与面试话术 | 自我介绍、架构链路、难点包装、压测口径、不足与改进 |
| 秒杀系统设计 | 四级防线、令牌桶、Lua 原子性、MQ 削峰、CAS、幂等、补偿 |
| Redis 核心与缓存设计 | 底层结构、持久化、集群、穿透/击穿/雪崩、一致性、分布式锁 |
| RabbitMQ 与消息可靠性 | 交换机、confirm/return、手动 ack、死信、延迟队列、积压 |
| MySQL 索引、事务与锁 | B+ 树、回表、最左前缀、MVCC、锁、慢 SQL、深分页 |
| Java 并发与集合 | 线程池、synchronized、volatile、CAS、AQS、ThreadLocal、CHM |
| JVM 内存与调优 | 内存区域、GC、G1、类加载、OOM / CPU 100% 排查 |
| Spring / Spring Boot / MyBatis | Bean 生命周期、循环依赖、事务失效、自动配置、MVC |
| 登录安全与限流 | JWT、拦截器、滑动窗口、分级封禁、越权、HTTPS |
| BitMap / HLL / Feed 流 | 签到、BITFIELD、HyperLogLog、点赞排行榜、推拉模式 |
| 系统设计与场景题 | 高并发套路、幂等、分布式事务、分布式 ID、容量评估、排查 |
| IoT 桥梁健康监测平台 | 多源接入、MQTT QoS、PUBACK 重试、断线补发、设备模型、数据质量、压差计算、时序索引、大屏与预警 |
| 面试实战与话术 | 高频 20 问速答、追问树、简历风险点、反问、复盘 |

## 功能

- **启动页面**：Canvas 粒子星图 + 渐变标题 + 数字滚动，点击 / Enter 进入主界面，移动端自适应
- **全文搜索**：输入关键词，跨模块匹配题目和答案（包括你修改后的答案），命中处高亮
- **掌握标记**：每道题可标记「已掌握」，进度保存在浏览器 localStorage
- **编辑答案**：每道题的答案都可以改成自己的版本，支持 HTML、实时预览、恢复原文
- **进度备份**：右上角 💾 可导出 / 导入完整进度 JSON（已掌握、答案、测验最高分、主题）
- **云同步**：可选。部署 `sync-worker` 后用 GitHub 登录，进度自动跨设备合并；不配置时完全本地运行
- **进度可视化**：顶部进度环 + 每个模块的进度条
- **随机抽题**：面试前抽一道，模拟被突然提问
- **随机测验**：每轮 10 题，即时判分 + 解析 + 错题回顾 + 历史最佳
- **深色 / 浅色主题**：右上角切换
- **快捷键**：`/` 聚焦搜索，`Esc` 关闭弹窗 / 清空搜索，编辑器内 `Ctrl + Enter` 保存

## 修改答案

打开任意一道题，点答案下方的「✎ 编辑答案」：

1. 左侧写 HTML，右侧实时预览；工具栏可快速插入加粗、行内代码、代码块、列表、提示块。
2. 点「保存答案」后，这道题会显示「已修改」标记，并优先展示你的版本。
3. 想回到原始答案，点编辑器里的「↺ 恢复原答案」，或卡片上的同名按钮。

修改默认只保存在**当前浏览器**的 localStorage。清理浏览器数据、换浏览器或换设备前，有两种办法：

- **导出进度**：右上角 💾 →「导出进度」，到新设备再「导入进度」，按题目合并
- **云同步**：部署 `sync-worker`（Cloudflare Worker + GitHub OAuth + KV），在 ☁ 弹窗里填入地址并登录，之后自动同步

云同步是 local-first：本地写入立即生效，联网后自动推送；两台设备同时改同一道题时，按每条记录的时间戳取较新的一份，冲突由 `baseRevision` 检测后合并重试。

> 答案按「模块 + 题目原文」匹配，后续在模块中间加题不会导致修改错位。

## 云同步部署

```bash
cd sync-worker
npx wrangler login
npx wrangler kv namespace create PROGRESS_KV     # 把 id 填进 wrangler.toml
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
npx wrangler deploy
```

然后：

1. GitHub → Settings → Developer settings → OAuth Apps 新建应用，回调地址填 `https://<worker 域名>/auth/callback`
2. 访问 `https://<worker 域名>/health`，确认返回 `{"ok":true,"configured":true}`
3. 把地址写进 `assets/sync-config.js` 的 `workerUrl`，或直接在站点 ☁ 弹窗里填写
4. 重新部署站点

安全边界：前端只拿到签名后的会话 token，Worker 用 `SESSION_SECRET` 校验，GitHub Client Secret 不进入浏览器；每个 GitHub 用户只能读写自己 key 下的进度。

## 目录结构

```
interview-notes/
├── index.html
├── 打开八股网站.bat
├── sync-worker/        # 可选：Cloudflare Worker 云同步后端
│   ├── src/index.js
│   ├── wrangler.toml
│   └── README.md
└── assets/
    ├── style.css       # 全部样式（启动页、深色/浅色、响应式）
    ├── intro.js        # 启动页粒子动画、数字滚动、进入逻辑
    ├── app.js          # 路由、搜索、进度、测验、备份逻辑
    ├── progress.js     # 进度结构归一化与合并
    ├── sync.js         # 云同步客户端（登录、拉取、推送、冲突重试）
    ├── sync-config.js  # Worker 地址（留空 = 纯本地）
    ├── data-1.js       # 模块 1-2：项目总览、秒杀
    ├── data-2.js       # 模块 3-4：Redis、RabbitMQ
    ├── data-3.js       # 模块 5-6：MySQL、Java 并发
    ├── data-4.js       # 模块 7-8：JVM、Spring
    ├── data-5.js       # 模块 9-11：登录限流、统计、系统设计
    ├── data-6.js       # 模块 13 + 自测题库：面试实战
    └── data-7.js       # 模块 12：IoT 桥梁健康监测 + IoT 自测题
```

## 自己加题

在任意 `data-*.js` 的 `items` 数组里追加：

```js
{
  q: '问题标题（支持 HTML）',
  star: 5,                       // 1-5，面试频率
  a: '<p>答案，支持 HTML。</p>' +
     '<pre><code>代码</code></pre>'
}
```

注意：HTML 里的 `<` 要写成 `&lt;`，`>` 写成 `&gt;`，否则浏览器会当成标签解析。

加自测题则在 `data-6.js` 的 `window.QUIZ` 里追加：

```js
{
  q: '题干',
  options: ['A 选项', 'B 选项', 'C 选项', 'D 选项'],
  answer: 1,                     // 正确项下标，从 0 开始
  explain: '解析',
  modTitle: '秒杀系统设计'
}
```

## 部署到线上

任选其一，都是免费静态托管：

1. **GitHub Pages**：把 `interview-notes` 推到仓库 → Settings → Pages → 选择分支和目录。
2. **Vercel / Netlify**：把文件夹拖进控制台，或连接仓库，无需构建命令。
3. **对象存储**：阿里云 OSS / 腾讯云 COS 开启静态网站托管，上传整个文件夹。

## 复习建议

1. 先看「项目总览」，能脱稿画出一次秒杀请求的完整链路。
2. 按模块顺序刷，每个问题先自己讲 30 秒，再展开对照。
3. 能讲清「是什么 + 为什么 + 项目里怎么用」再点「已掌握」。
4. 每天做一轮 10 题测验，错题回到对应模块。
5. 面试前 24 小时只看 ★★★★★ 和「面试实战」。

> 答案用于帮你知道「该答哪些点」，不要逐字背。面试时用自己的话讲，遇到追问才显得是真的理解。
