window.MODULES = window.MODULES || [];

/* ================= 模块 9：登录安全与限流 ================= */
window.MODULES.push({
  id: 'auth',
  order: 9,
  icon: '🔐',
  title: '登录安全与限流',
  desc: '简历第三条 bullet：JWT + 拦截器 + Redis ZSet 滑动窗口 + 分级封禁。放这里的不只是「怎么实现」，还有面试官会追问的安全边界。',
  tags: ['JWT', '拦截器', '滑动窗口', '限流', '越权'],
  items: [
    {
      q: 'Session 和 JWT 的区别？为什么选 JWT？',
      star: 5,
      a: '<table><tr><th></th><th>Session</th><th>JWT</th></tr>' +
        '<tr><td>存储</td><td>服务端（内存/Redis）</td><td>客户端保存 token，服务端不存</td></tr>' +
        '<tr><td>状态</td><td>有状态</td><td>无状态</td></tr>' +
        '<tr><td>扩展</td><td>多实例要共享 Session（Redis/粘性会话）</td><td>天然支持水平扩展</td></tr>' +
        '<tr><td>注销</td><td>服务端删 Session 即可</td><td>签发后无法主动失效，需要黑名单</td></tr>' +
        '<tr><td>体积</td><td>Cookie 里只有 sessionId</td><td>token 较大，每次请求都带</td></tr>' +
        '<tr><td>安全</td><td>依赖 Cookie，需防 CSRF</td><td>放 Header，天然规避 CSRF，但怕 XSS 窃取</td></tr></table>' +
        '<p><strong>选 JWT 的理由</strong>：「项目是前后端分离 + 多实例部署，JWT 无状态、跨域方便、不用共享 Session；代价是注销和续期要额外设计，我用 Redis 黑名单 + 短期 access token + 刷新 token 解决。」</p>'
    },
    {
      q: 'JWT 的结构是什么？签名是怎么做的？',
      star: 4,
      a: '<p>三段，用 <code>.</code> 分隔：</p>' +
        '<ul>' +
        '<li><strong>Header</strong>：<code>{"alg":"HS256","typ":"JWT"}</code>，Base64Url 编码。</li>' +
        '<li><strong>Payload</strong>：claims，如 <code>sub</code>、<code>userId</code>、<code>exp</code>、<code>iat</code>。也是 Base64Url，<strong>不是加密，只是编码</strong>，任何人都能解出来。</li>' +
        '<li><strong>Signature</strong>：<code>HMACSHA256(base64(header) + "." + base64(payload), secret)</code>，防篡改。</li>' +
        '</ul>' +
        '<p><strong>验证流程</strong>：服务端用同一 secret 重新计算签名，一致且未过期才放行。</p>' +
        '<blockquote class="warn">Payload 不能放密码、手机号等敏感信息。需要保密就用 JWE 加密，或只放 userId 这种无意义标识。</blockquote>'
    },
    {
      q: 'JWT 有哪些安全隐患？怎么防？',
      star: 5,
      a: '<ul>' +
        '<li><strong>无法主动失效</strong>：token 签发后到期前一直有效。解决：Redis 黑名单（存 jti 或 token 哈希）、短期过期 + 刷新 token、改密码时使旧 token 失效。</li>' +
        '<li><strong>Payload 明文</strong>：不放敏感信息。</li>' +
        '<li><strong>XSS 窃取</strong>：不要存 localStorage（易被 JS 读取），优先 HttpOnly + Secure Cookie；如果必须放 Header，做好 XSS 防护（转义、CSP）。</li>' +
        '<li><strong>alg=none 攻击</strong>：某些库不校验算法，攻击者把 alg 改成 none 伪造 token。服务端必须<strong>固定算法</strong>，不接受客户端指定。</li>' +
        '<li><strong>弱密钥</strong>：HS256 的 secret 要足够长且随机，不能硬编码在代码里。</li>' +
        '<li><strong>重放</strong>：加 <code>jti</code> + 一次性 nonce，或短过期时间。</li>' +
        '<li><strong>续期漏洞</strong>：refresh token 要单独存储、可撤销、绑定设备。</li>' +
        '</ul>'
    },
    {
      q: 'JWT 怎么实现登出和续期？',
      star: 4,
      a: '<p><strong>登出</strong>（JWT 本身无状态，需要额外机制）：</p>' +
        '<ul>' +
        '<li>Redis 黑名单：登出时把 token 的 <code>jti</code> 或哈希写入 Redis，TTL 设为 token 剩余有效期；拦截器每次校验黑名单。</li>' +
        '<li>用户维度版本号：Redis 存 <code>user:token:version</code>，token 里带版本，登出/改密码时版本 +1，旧 token 全部失效。</li>' +
        '</ul>' +
        '<p><strong>续期</strong>：</p>' +
        '<ul>' +
        '<li>双 token：access token 短（15–30 分钟），refresh token 长（7–30 天）。access 过期后用 refresh 换新的，refresh 存 Redis 可撤销。</li>' +
        '<li>滑动续期：每次请求如果剩余时间小于阈值，签发新 token 返回（要注意并发和旧 token 失效策略）。</li>' +
        '</ul>' +
        '<p>项目里为了简单只做了短期 token + 黑名单；如果要做「记住我」，会引入 refresh token。</p>'
    },
    {
      q: '登录拦截器是怎么实现的？和过滤器怎么配合？',
      star: 4,
      a: '<p><strong>拦截器流程</strong>：</p>' +
        '<ol>' +
        '<li>实现 <code>HandlerInterceptor</code>，重写 <code>preHandle</code>。</li>' +
        '<li>从 <code>Authorization</code> 头取 token（去掉 Bearer 前缀）。</li>' +
        '<li>校验签名、过期时间，解析出 userId。</li>' +
        '<li>查 Redis 黑名单，命中则 401。</li>' +
        '<li>把用户信息放入 <code>ThreadLocal</code>，供后续业务使用。</li>' +
        '<li><code>afterCompletion</code> 里 <code>remove()</code>，防止线程池复用串数据。</li>' +
        '</ol>' +
        '<p><strong>放行配置</strong>：<code>addPathPatterns("/**")</code> + <code>excludePathPatterns("/user/login", "/user/code", "/shop/**")</code>。注意静态资源和 Swagger 也要排除。</p>' +
        '<p><strong>和过滤器配合</strong>：过滤器负责更外层的事（CORS、请求体包装、MDC traceId），拦截器负责业务鉴权（能拿到 HandlerMethod 和注解）。</p>' +
        '<p><strong>为什么不用 Spring Security</strong>：项目需求简单，自己写拦截器更轻；生产级系统会考虑 Spring Security / Sa-Token，功能更完整。</p>'
    },
    {
      q: '四种限流算法怎么选？项目为什么用滑动窗口？',
      star: 5,
      a: '<table><tr><th>算法</th><th>优点</th><th>缺点</th><th>适用</th></tr>' +
        '<tr><td>固定窗口</td><td>最简单、内存小</td><td>临界点突发（0:59 和 1:00 各打满一次）</td><td>粗粒度配额</td></tr>' +
        '<tr><td>滑动窗口</td><td>平滑、精确</td><td>要存请求记录，内存/性能开销大</td><td>登录、短信、防刷</td></tr>' +
        '<tr><td>漏桶</td><td>绝对平滑，保护下游</td><td>无法应对合理突发</td><td>流量整形</td></tr>' +
        '<tr><td>令牌桶</td><td>允许突发、实现简单</td><td>集群需额外协调</td><td>秒杀入口</td></tr></table>' +
        '<p><strong>项目选择</strong>：</p>' +
        '<ul>' +
        '<li>秒杀入口用<strong>令牌桶</strong>：允许一定突发，重点是把平均速率压下来。</li>' +
        '<li>登录/发验证码用<strong>滑动窗口</strong>：要精确控制「1 分钟内最多 5 次」，固定窗口在边界会放过 10 次。</li>' +
        '</ul>' +
        '<p>一句话：「限流算法没有优劣，取决于你要控的是<em>平均速率</em>还是<em>任意时间窗内的次数</em>。」</p>'
    },
    {
      q: 'Redis ZSet 滑动窗口限流怎么实现？为什么用 ZSet？',
      star: 5,
      a: '<p><strong>原理</strong>：ZSet 的 score 存请求时间戳，member 存请求唯一标识；每次请求先删掉窗口外的记录，再统计窗口内数量。</p>' +
        '<pre><code>-- KEYS[1] = login:limit:{userId}\n-- ARGV[1] = now(ms)  ARGV[2] = window(ms)  ARGV[3] = limit  ARGV[4] = 唯一id\nlocal key = KEYS[1]\nlocal now = tonumber(ARGV[1])\nlocal window = tonumber(ARGV[2])\nlocal limit = tonumber(ARGV[3])\n\n-- 1. 移除窗口之前的数据\nredis.call(\'ZREMRANGEBYSCORE\', key, 0, now - window)\n-- 2. 统计窗口内请求数\nlocal count = redis.call(\'ZCARD\', key)\nif count &gt;= limit then\n  return 0                      -- 超限\nend\n-- 3. 记录本次请求\nredis.call(\'ZADD\', key, now, ARGV[4])\nredis.call(\'PEXPIRE\', key, window)\nreturn 1</code></pre>' +
        '<p><strong>为什么用 ZSet</strong>：需要按时间排序、按时间范围删除、统计数量，ZSet 的 <code>ZREMRANGEBYSCORE</code> + <code>ZCARD</code> 正好匹配，且 O(log n)。</p>' +
        '<p><strong>细节</strong>：</p>' +
        '<ul>' +
        '<li>必须用 Lua 保证「删 + 查 + 加」原子，否则并发下会超限。</li>' +
        '<li>member 用 <code>timestamp:random</code> 或 UUID，防止同一毫秒的请求被 ZSet 去重。</li>' +
        '<li>设置 <code>PEXPIRE</code>，避免冷用户 key 永久占内存。</li>' +
        '<li>大流量下限流 key 会很大，可改用漏桶/令牌桶 + 本地预检。</li>' +
        '</ul>'
    },
    {
      q: '简历里的「1 分钟 1 次、1 分钟 5 次、分级封禁」具体怎么设计？',
      star: 5,
      a: '<p>这是两层限流 + 惩罚机制：</p>' +
        '<ul>' +
        '<li><strong>第一层（频率）</strong>：同一手机号 1 分钟内只能发送 1 次验证码 → 防抖动、防连点。</li>' +
        '<li><strong>第二层（配额）</strong>：同一用户/IP 1 分钟内最多 5 次 → 防脚本批量刷。</li>' +
        '<li><strong>超限处理</strong>：连续超限则封禁，比如 10 分钟内不允许再请求；封禁时间可以递增（1 分钟 → 5 分钟 → 1 小时）。</li>' +
        '</ul>' +
        '<p><strong>实现</strong>：</p>' +
        '<ol>' +
        '<li>ZSet 滑动窗口做 5 次/分钟的判断。</li>' +
        '<li>单独一个 String key <code>login:ban:{userId}</code> 记录封禁到期时间，命中直接拒绝。</li>' +
        '<li>超限次数用另一个计数器累加，达到阈值写封禁 key。</li>' +
        '<li>返回统一错误码，不要暴露「你还剩几次」，避免被探测。</li>' +
        '</ol>' +
        '<p><strong>面试官可能追问「IP 后面的用户共享出口怎么办」</strong>：所以不能只按 IP，要「用户维度为主 + IP 维度为辅」，并对 NAT 出口放宽阈值；生产环境还需要验证码、设备指纹、风控评分。</p>'
    },
    {
      q: '分布式限流有哪些方案？',
      star: 4,
      a: '<ul>' +
        '<li><strong>Redis + Lua</strong>：集中式计数/令牌桶，精确但每次请求都要访问 Redis，Redis 成为瓶颈和单点。</li>' +
        '<li><strong>网关层</strong>：Nginx <code>limit_req</code>（漏桶）、Spring Cloud Gateway + Redis RateLimiter、Sentinel 网关流控。</li>' +
        '<li><strong>Sentinel 集群流控</strong>：Token Server 统一分配令牌，支持集群阈值。</li>' +
        '<li><strong>本地 + 集中</strong>：本地令牌桶预检，只有通过后才访问 Redis 精确扣减，减少 Redis 压力。</li>' +
        '<li><strong>队列/信号量</strong>：用 MQ 或线程池做并发隔离，属于「限并发」而非「限速率」。</li>' +
        '</ul>' +
        '<p>取舍：「限流越精确，成本越高。秒杀场景允许少量误差，可以用本地预检 + Redis 兜底；金融场景则要严格集中式。」</p>'
    },
    {
      q: '密码应该怎么存？为什么不能 MD5？',
      star: 3,
      a: '<p>不能明文，也不能裸 MD5/SHA1：</p>' +
        '<ul>' +
        '<li>MD5 太快，攻击者可以每秒算几十亿次，彩虹表直接反查。</li>' +
        '<li>相同密码得到相同哈希，拖库后一撞一片。</li>' +
        '</ul>' +
        '<p><strong>正确做法</strong>：加盐 + 慢哈希。</p>' +
        '<ul>' +
        '<li><strong>bcrypt</strong>（推荐）：自带盐，可调 cost（工作因子），故意慢。</li>' +
        '<li><strong>scrypt / Argon2</strong>：抗 GPU/ASIC，Argon2 是密码哈希竞赛冠军。</li>' +
        '<li><strong>PBKDF2</strong>：迭代多次，FIPS 认证场景常用。</li>' +
        '</ul>' +
        '<p>Spring Security 的 <code>BCryptPasswordEncoder</code> 直接用即可。数据库字段留够长度（bcrypt 60 字符）。</p>'
    },
    {
      q: '什么是越权？水平越权和垂直越权怎么防？',
      star: 4,
      a: '<ul>' +
        '<li><strong>水平越权</strong>：同角色用户互相访问数据，如 A 改 URL 里的 orderId 查到 B 的订单。</li>' +
        '<li><strong>垂直越权</strong>：低权限用户访问高权限接口，如普通用户调管理员接口。</li>' +
        '</ul>' +
        '<p><strong>防护</strong>：</p>' +
        '<ul>' +
        '<li>所有涉及资源的查询都带上 <code>user_id</code> 条件，<strong>不要信前端传的 userId</strong>，从 token 里取。</li>' +
        '<li>接口级权限：注解 + 拦截器/AOP 校验角色。</li>' +
        '<li>数据级权限：订单、地址等资源校验归属。</li>' +
        '<li>避免直接暴露自增 ID，用 UUID/雪花 ID 增加遍历成本（但不能替代鉴权）。</li>' +
        '</ul>' +
        '<p>项目落点：查订单、取消订单、查看笔记草稿，都要先校验 <code>order.userId == currentUserId</code>。</p>'
    },
    {
      q: '怎么防止登录接口被暴力破解？',
      star: 3,
      a: '<ul>' +
        '<li><strong>失败计数</strong>：同一账号/手机号连续失败 5 次，锁定 15 分钟或要求验证码。</li>' +
        '<li><strong>IP 限流</strong>：滑动窗口限制单 IP 每分钟尝试次数。</li>' +
        '<li><strong>验证码</strong>：失败几次后强制图形/滑块验证码，提高脚本成本。</li>' +
        '<li><strong>密码策略</strong>：长度、复杂度、禁止常见弱密码。</li>' +
        '<li><strong>多因素</strong>：异地登录、新设备短信/邮箱验证。</li>' +
        '<li><strong>日志与告警</strong>：记录失败来源，异常突增告警。</li>' +
        '</ul>' +
        '<p>注意：锁定策略本身可能被用来「锁死别人账号」（拒绝服务），所以更推荐<strong>验证码 + 递增延迟</strong>，而不是无条件锁定。</p>'
    },
    {
      q: '单点登录（SSO）的原理？',
      star: 3,
      a: '<p>核心：多个系统共享一个认证中心，一次登录，处处可用。</p>' +
        '<p><strong>CAS 流程</strong>：</p>' +
        '<ol>' +
        '<li>访问系统 A，未登录 → 重定向到认证中心，带上 <code>service</code> 参数。</li>' +
        '<li>认证中心登录成功，生成 <strong>Ticket</strong>，重定向回 A 并带上 ticket。</li>' +
        '<li>A 拿 ticket 到认证中心后台校验，换取用户信息，建立本地会话。</li>' +
        '<li>访问系统 B 时同样跳认证中心，发现已有全局会话，直接发新 ticket，无需再输密码。</li>' +
        '</ol>' +
        '<p><strong>JWT 方案</strong>：认证中心签发 token，各系统共享公钥/密钥验签；登出用黑名单或短过期。</p>' +
        '<p>关键点：全局会话（认证中心）与局部会话（各系统）分离；ticket 一次性、短有效期。</p>'
    },
    {
      q: 'HTTPS 的握手过程？为什么能防中间人？',
      star: 3,
      a: '<p>TLS 1.2 简化版：</p>' +
        '<ol>' +
        '<li>Client Hello：支持的协议版本、加密套件、随机数 A。</li>' +
        '<li>Server Hello：选定套件、随机数 B、<strong>证书</strong>（含公钥）。</li>' +
        '<li>客户端验证证书链（CA 签名、域名、有效期），生成预主密钥，用服务器公钥加密发送。</li>' +
        '<li>双方用 A、B、预主密钥推导会话密钥。</li>' +
        '<li>Change Cipher Spec + Finished，之后用对称加密通信。</li>' +
        '</ol>' +
        '<p><strong>为什么防中间人</strong>：证书由受信任 CA 签名，中间人没有私钥，无法解密预主密钥，也无法伪造证书（浏览器会告警）。</p>' +
        '<p><strong>为什么用非对称 + 对称</strong>：非对称安全但慢，只用来协商密钥；对称加密快，用于数据传输。</p>'
    }
  ]
});

/* ================= 模块 10：统计与数据结构 ================= */
window.MODULES.push({
  id: 'stats',
  order: 10,
  icon: '📊',
  title: 'BitMap / HLL / Feed 流',
  desc: '简历第四条 bullet：签到 BitMap + BITFIELD、UV HyperLogLog。这一章讲清「为什么用这个结构」，以及点赞、关注、Feed 流的推拉取舍。',
  tags: ['BitMap', 'BITFIELD', 'HyperLogLog', 'ZSet', 'Feed'],
  items: [
    {
      q: '签到功能怎么设计？为什么用 BitMap 而不是一张签到表？',
      star: 5,
      a: '<p><strong>表方案</strong>：<code>sign_record(user_id, date)</code>，一个月 100 万用户 × 30 天 = 3000 万行，写入和统计都重。</p>' +
        '<p><strong>BitMap 方案</strong>：一个用户一个月一个 key，每天占 1 bit，31 天只需 4 字节。</p>' +
        '<pre><code>key: sign:{userId}:202611\nbit 偏移: 日期 - 1（11 月 1 日 = 0，11 月 30 日 = 29）\n\nSETBIT sign:1001:202611 4 1     -- 11 月 5 日签到\nGETBIT sign:1001:202611 4       -- 查 11 月 5 日\nBITCOUNT sign:1001:202611       -- 本月签到天数</code></pre>' +
        '<p><strong>优点</strong>：</p>' +
        '<ul>' +
        '<li>极致省内存：31 天 4 字节，一年 12 个 key 也才 48 字节/用户。</li>' +
        '<li>统计 O(1)/O(n/8)，<code>BITCOUNT</code> 直接算总天数。</li>' +
        '<li>天然幂等：同一天重复 <code>SETBIT</code> 不会重复计数。</li>' +
        '</ul>' +
        '<p><strong>注意</strong>：</p>' +
        '<ul>' +
        '<li>需要设置过期时间（如保留 2 年），否则 key 越积越多。</li>' +
        '<li>BitMap 的最大 offset 是 2^32-1（512MB），日期偏移远小于此，安全。</li>' +
        '<li>跨月连续签到要合并上个月最后几天判断。</li>' +
        '</ul>'
    },
    {
      q: 'BITFIELD 怎么统计连续签到天数？',
      star: 5,
      a: '<p><code>BITFIELD</code> 可以一次读取多个 bit，并支持 <code>GET/SET/INCRBY</code>。统计「截至今天连续签到」，可以从今天往前读 7 天（或 31 天）的位图，再数末尾连续 1 的个数。</p>' +
        '<pre><code>-- 读取从 (day-7) 开始的 7 个 bit，返回无符号整数\n-- 最高位是 day-6，最低位是 today\nBITFIELD sign:1001:202611 GET u7 0\n-- 假设返回 0b0001111 = 15，表示最近 4 天连续</code></pre>' +
        '<p>Java 侧：</p>' +
        '<pre><code>long bits = jedis.bitfield(key, "GET", "u7", String.valueOf(offset)).get(0);\nint consecutive = 0;\nwhile ((bits &amp; 1) == 1) {   // 今天在最低位\n    consecutive++;\n    bits &gt;&gt;= 1;\n}\n// 如果连续天数 == 7，继续查上一周/上个月，直到遇到 0</code></pre>' +
        '<p><strong>更简单的替代</strong>：直接循环 <code>GETBIT</code> 往前查，最多 31 次，实现简单、不易错；<code>BITFIELD</code> 的优势是一次网络往返读多天。</p>' +
        '<p><strong>注意位序</strong>：Redis bit 偏移 0 是<strong>最高位</strong>（MSB），<code>GET u7 offset</code> 读到的第一个 bit 在结果最高位。别把今天算反了，这是最容易错的点。</p>' +
        '<blockquote class="tip">面试时先讲「按天 SETBIT + BITCOUNT 算总数」，再讲「连续天数用 BITFIELD 批量读 + 位运算」，层次清楚。</blockquote>'
    },
    {
      q: 'BitMap 的底层原理？有什么限制？',
      star: 4,
      a: '<p>BitMap 不是独立数据类型，而是基于 <strong>String</strong> 的位操作：把 String 当成 bit 数组，<code>SETBIT/GETBIT/BITCOUNT/BITOP</code> 操作每一位。</p>' +
        '<ul>' +
        '<li><code>SETBIT key offset 1</code>：offset 最大 2^32-1，即 512MB。</li>' +
        '<li><code>BITCOUNT</code>：统计 1 的个数，可按字节范围统计。</li>' +
        '<li><code>BITOP AND/OR/XOR</code>：多个 BitMap 做交并差，可用于「连续两天都签到的用户」。</li>' +
        '<li><code>BITPOS</code>：找第一个 0/1 的位置。</li>' +
        '</ul>' +
        '<p><strong>限制</strong>：</p>' +
        '<ul>' +
        '<li>稀疏数据浪费空间：只有 offset=1 亿的一个 bit 也要分配 12.5MB。适合 ID 连续、稠密场景（用户 ID、日期）。</li>' +
        '<li>只能存布尔值，不能存计数/明细。</li>' +
        '<li>大 key 的 <code>BITCOUNT</code> 会阻塞，要注意范围。</li>' +
        '</ul>' +
        '<p>稀疏场景改用 <strong>Roaring Bitmap</strong>（压缩位图）或 Set。</p>'
    },
    {
      q: 'HyperLogLog 是什么？为什么能用 12KB 统计 UV？',
      star: 5,
      a: '<p><strong>HyperLogLog</strong> 是概率基数估计算法，用固定内存估算集合中不同元素的个数（去重计数），<strong>不保存元素本身</strong>。</p>' +
        '<p><strong>原理（简化）</strong>：</p>' +
        '<ul>' +
        '<li>对每个元素做 hash，得到一个 64 位二进制串。</li>' +
        '<li>统计 hash 值中「第一个 1 出现的位置」或「末尾连续 0 的个数」。</li>' +
        '<li>如果观察到的最大前导零位数是 k，说明大概有 2^k 个不同元素（类似抛硬币）。</li>' +
        '<li>单个估计误差大，所以用 <strong>16384 个桶（register）</strong> 分桶，每个桶 6 bit，最后用调和平均合并，误差降到 0.81%。</li>' +
        '</ul>' +
        '<p><strong>内存</strong>：16384 × 6 bit = 98304 bit ≈ <strong>12KB</strong>，与元素数量无关。</p>' +
        '<p><strong>命令</strong>：<code>PFADD</code>、<code>PFCOUNT</code>、<code>PFMERGE</code>。</p>' +
        '<p><strong>限制</strong>：</p>' +
        '<ul>' +
        '<li>有误差（标准误差 0.81%），不能精确计数。</li>' +
        '<li>不能判断某个元素是否存在，也不能取回元素。</li>' +
        '<li>只能统计去重数量，不能做「交集后精确计数」。</li>' +
        '</ul>' +
        '<p>项目里 UV 用 HLL，PV 直接 <code>INCR</code>，签到/订单等需要精确的场景绝不用 HLL。</p>'
    },
    {
      q: 'PV 和 UV 的区别？分别怎么统计？',
      star: 3,
      a: '<ul>' +
        '<li><strong>PV（Page View）</strong>：页面访问总次数，同一用户刷新多次都算。用 Redis <code>INCR</code> 或计数表，简单精确。</li>' +
        '<li><strong>UV（Unique Visitor）</strong>：去重后的访问人数，同一用户一天内只算一次。方案：<ul>' +
        '<li>Set 存 userId：精确，但百万用户约占几十 MB。</li>' +
        '<li>BitMap：userId 连续时极省空间，1 亿用户约 12.5MB。</li>' +
        '<li>HyperLogLog：12KB 固定内存，误差 0.81%，适合大流量、允许近似。</li></ul></li>' +
        '</ul>' +
        '<p>选型：「小流量要精确用 Set，ID 连续用 BitMap，大流量看趋势用 HLL。我们看板展示 UV 用 HLL，因为 0.81% 的误差业务可接受。」</p>'
    },
    {
      q: '点赞功能怎么设计？ZSet 排行榜怎么做？',
      star: 4,
      a: '<p><strong>点赞</strong>：</p>' +
        '<ul>' +
        '<li>Redis Set：<code>like:blog:{blogId}</code> 存点赞用户 ID，<code>SADD</code> 幂等，<code>SCARD</code> 计数，<code>SISMEMBER</code> 判断是否点赞。</li>' +
        '<li>数据库：<code>blog_like(blog_id, user_id)</code> 唯一索引，异步落库，保证持久化。</li>' +
        '<li>计数：Redis 计数 + 定时同步 DB，或直接以 DB 为准、缓存兜底。</li>' +
        '</ul>' +
        '<p><strong>排行榜（ZSet）</strong>：</p>' +
        '<pre><code>ZINCRBY rank:blog 1 123          -- 博客 123 点赞 +1\nZREVRANGE rank:blog 0 9 WITHSCORES -- 前 10 名\nZREVRANK rank:blog 123            -- 查排名\nZSCORE rank:blog 123              -- 查分数</code></pre>' +
        '<ul>' +
        '<li>score 用点赞数；如果分数相同，member 按字典序排，可用「点赞数 * 10^10 + 时间戳」做复合排序（注意精度）。</li>' +
        '<li>ZSet 底层跳表，范围查询 O(log n + m)。</li>' +
        '<li>数据量大时按时间分桶（日榜/周榜），避免单 key 过大。</li>' +
        '</ul>'
    },
    {
      q: 'Feed 流的推模式和拉模式怎么选？',
      star: 5,
      a: '<table><tr><th></th><th>推模式（写扩散）</th><th>拉模式（读扩散）</th></tr>' +
        '<tr><td>做法</td><td>发布时写入所有粉丝的收件箱</td><td>读时聚合关注的人的发件箱</td></tr>' +
        '<tr><td>写</td><td>重（粉丝多则写放大）</td><td>轻</td></tr>' +
        '<tr><td>读</td><td>快（直接读自己的收件箱）</td><td>慢（要合并 N 个人）</td></tr>' +
        '<tr><td>适合</td><td>普通用户、粉丝少</td><td>大 V、粉丝千万</td></tr>' +
        '</table>' +
        '<p><strong>推拉结合</strong>（生产常用）：</p>' +
        '<ul>' +
        '<li>普通用户发笔记 → 推给粉丝的收件箱（ZSet，score 时间戳）。</li>' +
        '<li>大 V 发笔记 → 不推，粉丝读时再拉取合并。</li>' +
        '<li>读的时候：自己的收件箱 + 关注的大 V 发件箱，按时间归并，游标分页。</li>' +
        '</ul>' +
        '<p><strong>项目实现</strong>：<code>feed:{userId}</code> ZSet 存 blogId，score 是发布时间戳；发布时查粉丝列表批量 <code>ZADD</code>；滚动分页用 <code>ZREVRANGEBYSCORE max = lastTime LIMIT 0 10</code>，避免 <code>OFFSET</code> 深分页。</p>' +
        '<p><strong>坑</strong>：ZSet 无限增长要裁剪（只保留最近 1000 条）；取关要删收件箱；发笔记失败要保证推和落库的一致性。</p>'
    },
    {
      q: '关注、点赞这些关系表怎么设计？',
      star: 4,
      a: '<pre><code>follow(follower_id, followee_id, create_time)\n  PRIMARY KEY (follower_id, followee_id)\n  KEY idx_followee (followee_id)      -- 查粉丝列表\n\nblog_like(blog_id, user_id, create_time)\n  PRIMARY KEY (blog_id, user_id)      -- 天然防重复点赞\n  KEY idx_user (user_id)              -- 查我点赞过的\n\nblog(id, author_id, title, content, liked, create_time)\n  KEY idx_author_time (author_id, create_time)</code></pre>' +
        '<p>要点：</p>' +
        '<ul>' +
        '<li>联合主键/唯一索引保证幂等，重复关注/点赞不会产生脏数据。</li>' +
        '<li>双向查询要建反向索引：查「我关注了谁」用 follower_id，查「谁关注了我」用 followee_id。</li>' +
        '<li>计数字段（点赞数、粉丝数）是冗余，用 Redis 计数 + 异步落库，接受最终一致。</li>' +
        '<li>大表按用户 ID 分片，避免单表过亿。</li>' +
        '</ul>'
    },
    {
      q: '点赞数、粉丝数这类计数怎么保证准确？',
      star: 4,
      a: '<p>高并发下不能每次点赞都 <code>UPDATE count = count + 1</code>（热点行锁）。方案：</p>' +
        '<ul>' +
        '<li><strong>Redis 计数</strong>：<code>INCR</code> 原子自增，读的时候直接读 Redis，快但不持久。</li>' +
        '<li><strong>异步落库</strong>：MQ 消费后更新 DB，或定时任务批量同步。</li>' +
        '<li><strong>以 DB 为准对账</strong>：定时用 <code>COUNT(*)</code> 或汇总表校正 Redis，防止丢消息导致偏差。</li>' +
        '<li><strong>避免重复计数</strong>：点赞用唯一索引/Set 保证幂等，取消点赞要判断是否真的存在。</li>' +
        '</ul>' +
        '<p>取舍：「计数是展示型数据，允许短暂不一致；交易金额绝不能用这种方案。」</p>'
    },
    {
      q: '附近商铺 / GEO 怎么做？',
      star: 3,
      a: '<p>Redis 的 GEO 基于 ZSet + GeoHash：把经纬度编码成一个 52 位整数作为 score，通过 ZSet 范围查询找附近点。</p>' +
        '<pre><code>GEOADD shop:geo 116.40 39.90 1001 116.41 39.91 1002\nGEOSEARCH shop:geo FROMLONLAT 116.40 39.90 BYRADIUS 5 km ASC COUNT 20\nGEODIST shop:geo 1001 1002 km</code></pre>' +
        '<p><strong>原理</strong>：GeoHash 把二维经纬度递归切成网格，编码成字符串/整数；相邻格子的前缀相同，所以范围查询可以转化为 ZSet 的 score 区间扫描。边界问题需要查周围 8 个格子。</p>' +
        '<p><strong>限制</strong>：Redis GEO 不支持复杂的多边形/路网距离，生产级「附近」通常用 Elasticsearch 的 geo_point 或 PostGIS。</p>'
    },
    {
      q: '布隆过滤器是什么？怎么解决缓存穿透？',
      star: 4,
      a: '<p><strong>原理</strong>：一个位数组 + 多个哈希函数。插入元素时把 k 个位置置 1；查询时如果有一位是 0，元素<strong>一定不存在</strong>；全为 1 则<strong>可能存在</strong>（有误判）。</p>' +
        '<ul>' +
        '<li>优点：空间极小、查询 O(k)。</li>' +
        '<li>缺点：有假阳性、不支持删除（可用 Counting Bloom）、无法取回元素。</li>' +
        '</ul>' +
        '<p><strong>防穿透</strong>：启动时把所有合法 ID 放入布隆过滤器，请求先过过滤器，不存在的直接拒绝，不再查 Redis/DB。</p>' +
        '<p><strong>注意</strong>：</p>' +
        '<ul>' +
        '<li>新增数据要同步加入过滤器，否则会被误判为不存在。</li>' +
        '<li>布隆过滤器不能删，删除数据只能靠重建或使用 Counting Bloom。</li>' +
        '<li>Redis 用 <code>BF.ADD/BF.EXISTS</code>（RedisBloom 模块），或用 Guava 的本地布隆过滤器。</li>' +
        '</ul>'
    }
  ]
});

/* ================= 模块 11：系统设计 ================= */
window.MODULES.push({
  id: 'design',
  order: 11,
  icon: '🏗️',
  title: '系统设计与场景题',
  desc: '把前面的知识点串成「设计能力」。覆盖高并发套路、幂等、分布式事务、分布式 ID、容量评估、线上排查，以及面试官爱出的开放题。',
  tags: ['高并发', '幂等', '分布式事务', '分布式ID', '排查'],
  items: [
    {
      q: '设计一个高并发系统，你的通用套路是什么？',
      star: 5,
      a: '<p>按「分层 + 四板斧」回答：</p>' +
        '<ol>' +
        '<li><strong>接入层</strong>：CDN 静态化、Nginx 负载均衡、限流、防刷、HTTPS 卸载。</li>' +
        '<li><strong>应用层</strong>：无状态水平扩容、线程池隔离、异步化、接口合并、结果缓存。</li>' +
        '<li><strong>缓存层</strong>：本地缓存（Caffeine）+ Redis，热点数据预热，防穿透/击穿/雪崩。</li>' +
        '<li><strong>存储层</strong>：读写分离、分库分表、索引优化、热点行拆分、冷热分离。</li>' +
        '<li><strong>异步层</strong>：MQ 削峰、最终一致、补偿对账。</li>' +
        '</ol>' +
        '<p><strong>四板斧</strong>：<strong>缓存、异步、削峰、扩容</strong>。任何高并发问题都可以先往这四个方向套。</p>' +
        '<p>最后补：「还要有<strong>可观测性</strong>（监控、日志、链路追踪）和<strong>降级预案</strong>，否则流量上来后你不知道瓶颈在哪。」</p>'
    },
    {
      q: '什么是幂等？有哪些实现方案？',
      star: 5,
      a: '<p><strong>幂等</strong>：同一个请求执行一次和执行多次，结果相同。注意是「结果」相同，不是「不执行」。</p>' +
        '<p><strong>方案</strong>：</p>' +
        '<ul>' +
        '<li><strong>唯一索引</strong>：数据库最终兜底，插入冲突即已处理。最可靠。</li>' +
        '<li><strong>Token 机制</strong>：页面先申请一次性 token，提交时带上，服务端 <code>DEL</code> 成功才处理（Redis <code>DEL</code> 返回 1）。</li>' +
        '<li><strong>状态机</strong>：<code>UPDATE order SET status=2 WHERE id=? AND status=1</code>，影响行数 0 说明已处理。</li>' +
        '<li><strong>去重表</strong>：业务唯一键 + 唯一索引，处理前插入。</li>' +
        '<li><strong>分布式锁</strong>：同一 key 串行执行，但要防锁超时。</li>' +
        '</ul>' +
        '<p><strong>选型</strong>：支付/下单用「唯一索引 + 状态机」双保险；表单防重复提交用 token；消息消费用业务唯一键。</p>' +
        '<blockquote class="warn">不要用「先查后插」：并发下两个请求都查到不存在，然后都插入。必须靠唯一约束。</blockquote>'
    },
    {
      q: '分布式事务有哪些方案？你们项目用了吗？',
      star: 4,
      a: '<table><tr><th>方案</th><th>一致性</th><th>原理</th><th>代价</th></tr>' +
        '<tr><td>2PC/XA</td><td>强一致</td><td>协调者两阶段提交</td><td>同步阻塞、性能差、协调者单点</td></tr>' +
        '<tr><td>TCC</td><td>最终一致</td><td>Try 预留、Confirm 确认、Cancel 取消</td><td>业务侵入大，要处理空回滚/悬挂</td></tr>' +
        '<tr><td>Saga</td><td>最终一致</td><td>长事务拆成多个本地事务 + 补偿</td><td>无隔离性，补偿逻辑复杂</td></tr>' +
        '<tr><td>本地消息表</td><td>最终一致</td><td>业务和消息同库同事务，定时重发</td><td>依赖 DB，消息可能重复</td></tr>' +
        '<tr><td>事务消息</td><td>最终一致</td><td>RocketMQ 半消息 + 回查</td><td>依赖特定 MQ</td></tr>' +
        '<tr><td>Seata AT</td><td>最终一致</td><td>自动生成 undo，全局锁</td><td>全局锁竞争，性能有损</td></tr></table>' +
        '<p><strong>项目回答</strong>：「秒杀链路没有引入分布式事务框架。Redis 扣减和 DB 落库通过 MQ 解耦，用<strong>本地消息表 + 消费端幂等 + 定时对账</strong>保证最终一致。因为业务允许短暂不一致，强一致方案（2PC）性能代价太大。」</p>' +
        '<p>如果追问「为什么不用 Seata」：项目是单库，跨服务场景少；引入 Seata 增加复杂度，收益不大。</p>'
    },
    {
      q: '如何设计一个分布式 ID 生成器？',
      star: 4,
      a: '<table><tr><th>方案</th><th>优点</th><th>缺点</th></tr>' +
        '<tr><td>UUID</td><td>本地生成、无网络</td><td>无序（索引分裂）、占空间、不可读</td></tr>' +
        '<tr><td>数据库自增</td><td>简单、有序</td><td>单点、性能瓶颈、分库难</td></tr>' +
        '<tr><td>号段模式</td><td>批量取号、DB 压力小</td><td>服务重启可能浪费号段</td></tr>' +
        '<tr><td>Redis INCR</td><td>性能好、有序</td><td>依赖 Redis，持久化丢号</td></tr>' +
        '<tr><td>雪花算法</td><td>本地生成、趋势递增、高性能</td><td>依赖时钟，回拨会重复</td></tr></table>' +
        '<p><strong>雪花结构</strong>（64 bit）：1 符号位 + 41 时间戳（约 69 年）+ 10 机器 ID（1024 台）+ 12 序列号（每毫秒 4096 个）。</p>' +
        '<p><strong>时钟回拨处理</strong>：等待追平、用备用机器 ID、抛异常让上层重试、或使用 Leaf/美团方案（号段 + 雪花结合）。</p>' +
        '<p>项目里订单 ID 可以用 Redis 自增或雪花；如果单库，自增也够，但要考虑未来分库。</p>'
    },
    {
      q: '限流、降级、熔断有什么区别？',
      star: 4,
      a: '<ul>' +
        '<li><strong>限流</strong>：主动控制入口流量，超过阈值拒绝/排队。保护自己不被压垮。</li>' +
        '<li><strong>降级</strong>：主动关闭非核心功能或返回兜底数据（如推荐服务挂了返回热门列表），保核心链路。</li>' +
        '<li><strong>熔断</strong>：当下游错误率/慢调用比例超过阈值，<strong>自动</strong>切断调用一段时间（Open），之后半开试探（Half-Open），恢复则关闭（Closed）。防止雪崩和线程耗尽。</li>' +
        '</ul>' +
        '<p>三者关系：限流是<strong>入口防护</strong>，熔断是<strong>下游防护</strong>，降级是<strong>最终兜底</strong>。</p>' +
        '<p>工具：Sentinel（流量控制、熔断降级、系统自适应保护）、Resilience4j、Hystrix（停更）。</p>' +
        '<p>项目里秒杀入口用令牌桶限流，Redis/DB 异常时降级为「活动维护中」，没有引入完整熔断框架，因为服务依赖少。</p>'
    },
    {
      q: '如何做容量评估？',
      star: 3,
      a: '<p>步骤：</p>' +
        '<ol>' +
        '<li><strong>估算 QPS</strong>：日活 × 人均请求 / 86400，再乘峰值系数（通常 3–10）。</li>' +
        '<li><strong>二八原则</strong>：80% 流量集中在 20% 时间，峰值 QPS ≈ 平均 × 4。</li>' +
        '<li><strong>单机压测</strong>：测出单实例在可接受 RT（如 P99 &lt; 200ms）下的 QPS。</li>' +
        '<li><strong>算实例数</strong>：峰值 QPS / 单机 QPS × 冗余系数（1.5–2）。</li>' +
        '<li><strong>算存储</strong>：单条大小 × 日增 × 保留天数，加索引和副本开销。</li>' +
        '<li><strong>全链路压测</strong>：验证 DB、缓存、MQ 是否成为瓶颈。</li>' +
        '</ol>' +
        '<p>面试时说清假设，比如「假设日活 10 万，人均 20 次请求，峰值 QPS 约 1000；单机压测 500 QPS，考虑冗余需要 4 台」。数字不重要，<strong>推导过程</strong>才重要。</p>'
    },
    {
      q: '线上接口突然变慢，你怎么排查？',
      star: 5,
      a: '<p>按「先止损、再定位、后复盘」：</p>' +
        '<p><strong>1. 止损</strong>：看监控确认影响面；如果是新发布导致，先回滚；必要时限流/降级。</p>' +
        '<p><strong>2. 定位</strong>：</p>' +
        '<ul>' +
        '<li><strong>链路</strong>：traceId 看耗时分布，是网关、应用、DB 还是下游。</li>' +
        '<li><strong>应用</strong>：CPU、内存、GC、线程池队列、连接池；<code>jstack</code> 看是否大量线程 BLOCKED/WAITING。</li>' +
        '<li><strong>DB</strong>：慢查询日志、<code>SHOW PROCESSLIST</code>、锁等待、连接数。</li>' +
        '<li><strong>Redis</strong>：<code>SLOWLOG</code>、大 key、命中率、连接数。</li>' +
        '<li><strong>MQ</strong>：堆积、消费者存活。</li>' +
        '<li><strong>外部</strong>：DNS、网络、第三方接口超时。</li>' +
        '</ul>' +
        '<p><strong>3. 常见根因</strong>：慢 SQL/索引失效、缓存失效导致穿透、线程池打满、连接池泄漏、Full GC、下游超时、锁竞争。</p>' +
        '<p><strong>4. 复盘</strong>：加监控、加索引、加限流、补预案，写出可执行的改进项。</p>'
    },
    {
      q: '如何保证缓存与数据库的最终一致？（再深一层）',
      star: 4,
      a: '<p>前面讲过基础方案，这里给「生产级」组合拳：</p>' +
        '<ol>' +
        '<li><strong>Cache-Aside</strong>：读时未命中查库回填；写时先更新库，再删缓存。</li>' +
        '<li><strong>延迟双删</strong>：更新前删一次，更新后延迟 500ms–1s 再删一次。</li>' +
        '<li><strong>binlog 订阅</strong>：Canal 监听 MySQL binlog，异步删缓存/更新缓存，业务无侵入，可靠性最高。</li>' +
        '<li><strong>消息补偿</strong>：删缓存失败发 MQ 重试，配合死信。</li>' +
        '<li><strong>TTL 兜底</strong>：所有缓存设置过期时间，最坏情况自动恢复。</li>' +
        '<li><strong>对账</strong>：定时抽样比对缓存和 DB，发现不一致告警。</li>' +
        '</ol>' +
        '<p><strong>为什么不追求强一致</strong>：分布式下强一致要加锁/2PC，性能和可用性代价大；缓存本身就是为性能牺牲一致性，业务要接受「短暂不一致」。</p>'
    },
    {
      q: '消息可靠性怎么做到全链路不丢？',
      star: 4,
      a: '<p>把消息生命周期拆成四段，每段都要有保障：</p>' +
        '<ol>' +
        '<li><strong>生产</strong>：本地消息表（业务与消息同事务）+ confirm 回调 + 定时重发。</li>' +
        '<li><strong>存储</strong>：持久化三要素 + 集群/Quorum Queue + 磁盘告警。</li>' +
        '<li><strong>消费</strong>：手动 ack + 有限重试 + 死信队列 + 幂等。</li>' +
        '<li><strong>兜底</strong>：对账任务（DB 与消息/缓存比对）+ 人工补偿入口 + 全链路监控。</li>' +
        '</ol>' +
        '<p>关键认知：「MQ 只能保证 at-least-once，做不到 exactly-once。所谓『不丢』是用<strong>重试 + 幂等 + 对账</strong>换来的，不是配置一个参数就完事。」</p>'
    },
    {
      q: '如何设计一个短链系统？',
      star: 3,
      a: '<p>核心：长链 → 短码 → 跳转。</p>' +
        '<ul>' +
        '<li><strong>短码生成</strong>：自增 ID 转 62 进制（0-9a-zA-Z），或 MurmurHash + 冲突重试，或预生成号段。</li>' +
        '<li><strong>存储</strong>：<code>short_code(PK) → long_url, create_time, expire_time</code>，短码做唯一索引。</li>' +
        '<li><strong>跳转</strong>：查缓存 → 查 DB → 302 重定向；缓存空值防穿透。</li>' +
        '<li><strong>高并发</strong>：CDN/多级缓存、布隆过滤器、分库分表。</li>' +
        '<li><strong>安全</strong>：短码不可预测（防止遍历）、频率限制、恶意链接检测、过期清理。</li>' +
        '<li><strong>统计</strong>：点击量用 Redis <code>INCR</code> + HLL 统计 UV。</li>' +
        '</ul>' +
        '<p>追问「301 还是 302」：301 永久重定向会被浏览器缓存，统计不到后续点击；302 临时重定向每次都经过服务端，便于统计和动态调整。</p>'
    },
    {
      q: '如何设计一个点赞/评论系统？',
      star: 3,
      a: '<p><strong>点赞</strong>：</p>' +
        '<ul>' +
        '<li>写：Redis Set 去重 + <code>INCR</code> 计数，异步 MQ 落库。</li>' +
        '<li>读：<code>SISMEMBER</code> 判断当前用户是否点赞，<code>SCARD</code> 取数量。</li>' +
        '<li>持久化：<code>like(user_id, target_id, type)</code> 唯一索引。</li>' +
        '</ul>' +
        '<p><strong>评论</strong>：</p>' +
        '<ul>' +
        '<li>两级结构：<code>comment(id, target_id, user_id, parent_id, root_id, content, create_time)</code>。</li>' +
        '<li>一级评论按时间倒序分页；二级回复按 <code>root_id</code> 聚合，限制展示条数 + 「查看更多」。</li>' +
        '<li>大表按 <code>target_id</code> 分片，或冷热分离。</li>' +
        '</ul>' +
        '<p><strong>难点</strong>：计数一致性、热点评论、敏感词过滤、删除的级联、分页性能。回答时挑 1–2 个深入讲，比面面俱到好。</p>'
    },
    {
      q: '灰度发布和回滚怎么做？',
      star: 3,
      a: '<ul>' +
        '<li><strong>灰度</strong>：按用户 ID 取模、按 IP/地域、按请求头、按比例分流；Nginx/网关/注册中心打标，新版本只接部分流量。</li>' +
        '<li><strong>监控</strong>：对比新旧版本的错误率、RT、业务指标，异常自动停止放量。</li>' +
        '<li><strong>回滚</strong>：保留上一版本镜像，一键切回；数据库变更要兼容新旧版本（先加字段、再双写、后删旧字段）。</li>' +
        '<li><strong>特性开关</strong>：新功能用配置中心开关控制，出问题不用重新部署。</li>' +
        '</ul>' +
        '<p>项目是个人项目，没做完整灰度；但我知道生产上「数据库变更」是最难回滚的，所以要用 expand-contract 模式。</p>'
    }
  ]
});
