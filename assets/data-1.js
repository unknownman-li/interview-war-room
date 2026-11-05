window.MODULES = window.MODULES || [];

/* ================= 模块 1：项目总览 ================= */
window.MODULES.push({
  id: 'project',
  order: 1,
  icon: '🗺️',
  title: '项目总览与面试话术',
  desc: '先把项目讲成一个「有背景、有取舍、有数据」的工程故事。这一章解决：自我介绍、架构链路、难点包装、压测口径、被质疑时怎么接。',
  tags: ['自我介绍', '架构', 'STAR', '压测'],
  items: [
    {
      q: '用一分钟介绍一下这个项目（背下这段结构，不要背稿）',
      star: 5,
      a: '<p><strong>答题结构：背景 → 目标 → 方案 → 难点 → 结果。</strong></p>' +
        '<p>「这是一个本地生活优惠点评平台，类似大众点评的课程项目，我在课程版基础上重构了交易链路。核心场景有四个：商铺缓存检索、优惠券秒杀、探店笔记的点赞关注和 Feed 流、用户签到统计。</p>' +
        '<p>我主要负责高并发交易和登录安全两块。秒杀做了四层防线：Guava 令牌桶在网关层快速失败、Redis + Lua 原子完成库存校验和一人一单、RabbitMQ 异步削峰落库、数据库用 <code>stock &gt; 0</code> 的 CAS 更新兜底防超卖。缓存方面封装了统一的 CacheClient，用空值缓存加互斥锁解决穿透，用逻辑过期加异步重建解决击穿。</p>' +
        '<p>压测时用 1000 并发打 100 库存的券，最终成功下单数和库存严格一致，重复请求全部被拦，没有出现负库存。这个项目让我把 Redis 原子性、MQ 可靠性和数据库乐观锁真正串成了一条链路。」</p>' +
        '<blockquote class="tip">控制在一分钟内。如果面试官对某一段感兴趣，他会追问，你再展开细节——不要一口气把 20 分钟的内容塞进自我介绍。</blockquote>'
    },
    {
      q: '画一下项目架构，一次秒杀请求完整经过哪些组件？',
      star: 5,
      a: '<p>按请求顺序讲，比背组件名更加分：</p>' +
        '<pre><code>浏览器 / JMeter\n   │ 1. 秒杀请求（带 token）\n   ▼\nNginx / Spring Boot 应用\n   │ 2. 登录拦截器校验 JWT\n   │ 3. Guava RateLimiter.tryAcquire()  —— 拿不到令牌直接返回「活动太火爆」\n   ▼\nRedis（Lua 脚本原子执行）\n   │ 4. 判断库存 stock &gt; 0\n   │ 5. 判断 SET 中是否已下单（一人一单）\n   │ 6. DECR 库存 + SADD userId\n   │ 7. 返回订单标识\n   ▼\nRabbitMQ（Topic Exchange）\n   │ 8. 发送下单消息，立即给用户返回「排队中」\n   ▼\n消费者（独立线程/服务）\n   │ 9. 幂等校验（消息 ID / 唯一索引）\n   │ 10. 扣 DB 库存：UPDATE ... SET stock = stock - 1 WHERE stock &gt; 0\n   │ 11. 写订单表，唯一索引 (user_id, voucher_id) 兜底\n   ▼\nMySQL\n   │ 12. 订单落库成功 → 可选：延迟队列检查支付超时</code></pre>' +
        '<p><strong>一句话总结：</strong>「同步链路只做 Redis 层的资格判断，把真正的落库和扣减异步化，用 MQ 把峰值流量摊平，数据库只承担削峰后的稳定写入。」</p>'
    },
    {
      q: '这个项目你觉得最难的地方是什么？',
      star: 5,
      a: '<p>不要说「都挺简单的」。选一个有技术纵深、又能体现你思考的点，推荐<strong>库存最终一致性</strong>：</p>' +
        '<p>「最难的不是把 QPS 做高，而是<em>在 Redis 预扣、MQ 异步落库的架构下，保证不超卖、不丢单、还能回滚</em>。因为 Redis 扣减成功不等于订单创建成功：消费者可能失败、消息可能重复、用户可能不付款。</p>' +
        '<p>我的处理分三层：第一层，Redis Lua 把库存校验、一人一单、扣减放在一个原子操作里，先挡住绝大部分无效请求；第二层，消费端用 CAS 更新数据库库存，并用 <code>(user_id, voucher_id)</code> 唯一索引兜底，保证重复消费也只会有一单；第三层，失败消息进死信队列，由补偿任务回补 Redis 库存并记录对账日志，定时比对 Redis 与 DB 的库存差异。</p>' +
        '<p>这件事让我理解了一个原则：<strong>缓存可以做预扣，但数据库必须是最终事实来源，任何异步链路都要有可观测的对账和补偿。</strong>」</p>'
    },
    {
      q: '秒杀系统本质上要解决哪几个问题？',
      star: 5,
      a: '<ul>' +
        '<li><strong>瞬时高并发</strong>：流量在几秒内涌入，远超系统常态承载，直接打 DB 会连接池耗尽、CPU 打满。</li>' +
        '<li><strong>超卖</strong>：库存是共享资源，并发读改写会丢失更新，导致卖出数量大于库存。</li>' +
        '<li><strong>一人一单</strong>：同一用户重复请求或脚本刷单，需要幂等与限购。</li>' +
        '<li><strong>系统稳定性</strong>：不能让秒杀流量拖垮商品、订单等正常业务，需要隔离、限流、降级。</li>' +
        '<li><strong>数据一致性</strong>：缓存预扣、异步落库之后，库存、订单、支付状态要能对得上。</li>' +
        '<li><strong>公平性与防刷</strong>：链接隐藏、验证码、风控、限购，都是围绕这一点。</li>' +
        '</ul>' +
        '<p>回答时点出：<strong>前三个是功能正确性，后三个是工程可用性</strong>，能把两类分开讲，层次会明显高一截。</p>'
    },
    {
      q: '为什么用 Redis 扣库存，而不是直接让数据库扛？',
      star: 5,
      a: '<p>从三个角度答：</p>' +
        '<ul>' +
        '<li><strong>性能</strong>：Redis 单机十万级 QPS，MySQL 单行更新受行锁和磁盘限制，热点行会在锁上排队，几百并发就明显抖动。</li>' +
        '<li><strong>保护数据库</strong>：秒杀 1000 个请求可能只有 10 个真正有效，让 990 个请求打到 DB 是浪费，还会挤占正常业务连接。</li>' +
        '<li><strong>原子能力</strong>：Redis 单线程执行 + Lua 脚本，可以把「查库存、查重、扣减」合成一个原子操作，天然适合做资格预判。</li>' +
        '</ul>' +
        '<p>但要补一句边界：「Redis 只做<strong>预扣和资格过滤</strong>，最终库存以 MySQL 为准，MQ 消费成功后才算真正下单，避免把 Redis 当唯一数据源。」这句话能防住「Redis 挂了数据不就丢了」的追问。</p>'
    },
    {
      q: 'Redis 扣完库存，数据库怎么保证最终一致？',
      star: 5,
      a: '<p>把链路拆成「预扣 → 异步落库 → 对账补偿」三段：</p>' +
        '<ol>' +
        '<li><strong>预扣</strong>：Lua 里 <code>DECR</code> 后立刻返回，Redis 库存是「可售额度」，不是最终成交数。</li>' +
        '<li><strong>落库</strong>：消费者执行 <code>UPDATE ... SET stock = stock - 1 WHERE stock &gt; 0</code>，影响行数为 0 说明 DB 也没库存了，走失败补偿；订单表唯一索引保证幂等。</li>' +
        '<li><strong>失败补偿</strong>：消费异常进死信队列，由定时任务/人工补偿；补偿时先查订单是否存在，不存在才回补 Redis 库存，避免「订单已成功却又加回库存」。</li>' +
        '<li><strong>对账</strong>：定时任务比对 <code>Redis 剩余库存 + 已成功订单数</code> 与 <code>DB 初始库存</code>，有差异告警并以 DB 为准修正 Redis。</li>' +
        '</ol>' +
        '<blockquote class="warn">高频追问：「MQ 消息丢了怎么办？」答生产者 confirm + 消息持久化 + 消费者手动 ack + 本地消息表/定时重发，不要只说「MQ 很可靠」。</blockquote>'
    },
    {
      q: '压测是怎么做的？「1000 并发、零超卖」这个数据怎么解释？',
      star: 4,
      a: '<p>面试官问这个，多半是在验证数据是不是编的。要主动交代<strong>口径</strong>：</p>' +
        '<ul>' +
        '<li><strong>工具</strong>：JMeter（或 wrk），1000 线程，设置 ramp-up，避免瞬间把本机打挂；参数化不同 userId 和 token。</li>' +
        '<li><strong>前置</strong>：库存预热到 Redis，DB 初始库存与 Redis 一致，清空历史订单。</li>' +
        '<li><strong>观测</strong>：接口 QPS、P99 响应时间、错误率，同时看 Redis CPU、MySQL 连接池、MQ 堆积。</li>' +
        '<li><strong>结果口径</strong>：1000 次并发请求里，14 次是同一用户的重复请求被一人一单拦截，86 次为有效用户且成功创建订单；最终 <code>DB 库存 + 成功订单数 = 初始库存</code>，Redis 库存不为负，校验通过。</li>' +
        '</ul>' +
        '<p>如果记不清具体数字，就说「量级」和「校验方法」，别硬编 QPS。可信度来自：<strong>你怎么验证的</strong>，而不是数字多大。</p>' +
        '<blockquote class="warn">不要声称「支撑百万 QPS」。单机项目压测和真实大促是两回事，说过头一定被追问到崩。</blockquote>'
    },
    {
      q: '如果流量再涨 10 倍，你会怎么演进？',
      star: 4,
      a: '<p>按「分层扩容 + 减少无效流量 + 隔离」回答：</p>' +
        '<ul>' +
        '<li><strong>接入层</strong>：Nginx 限流（<code>limit_req</code>）、静态资源 CDN、秒杀页面静态化，能挡掉大部分重复刷新。</li>' +
        '<li><strong>应用层</strong>：无状态水平扩容；Guava 单机令牌桶换成 Redis + Lua 的分布式令牌桶，或用 Sentinel 集群流控。</li>' +
        '<li><strong>缓存层</strong>：库存分桶（把 100 库存拆成 10 个桶，降低单 key 热点）、Redis Cluster 分片、本地缓存 + Redis 二级缓存。</li>' +
        '<li><strong>MQ</strong>：增加消费者并发、批量消费；按 voucherId 分区保证同一商品顺序。</li>' +
        '<li><strong>数据库</strong>：订单分库分表、库存扣减串行化到单行、热点商品单独库；历史订单归档。</li>' +
        '<li><strong>业务手段</strong>：预约制、答题/验证码削峰、排队页、验证码令牌一次性消费。</li>' +
        '</ul>' +
        '<p>最后补一句取舍：「真到大促量级，优先做<strong>流量削峰和无效请求过滤</strong>，因为扩容成本远高于把 90% 的请求挡在门外。」</p>'
    },
    {
      q: '为什么选 RabbitMQ，而不是 Kafka / RocketMQ？',
      star: 4,
      a: '<p>不要说「因为课程用的」。从业务特征出发：</p>' +
        '<table><tr><th>维度</th><th>RabbitMQ</th><th>Kafka</th></tr>' +
        '<tr><td>模型</td><td>AMQP，交换机 + 队列，路由灵活</td><td>分区日志，吞吐极高</td></tr>' +
        '<tr><td>延迟</td><td>毫秒级，适合业务消息</td><td>批量发送，延迟略高</td></tr>' +
        '<tr><td>可靠</td><td>confirm + 持久化 + 手动 ack，成熟</td><td>副本机制，适合流式</td></tr>' +
        '<tr><td>场景</td><td>订单、削峰、延迟任务</td><td>日志、埋点、大数据管道</td></tr></table>' +
        '<p>话术：「这个场景是<strong>低频次、要求低延迟、需要可靠投递和灵活路由</strong>的业务消息，RabbitMQ 的 confirm/return、死信队列、延迟插件都更贴合；Kafka 的优势在百万级吞吐和流处理，我们没到那个量级，运维成本反而更高。如果是日志采集或实时数仓，我会选 Kafka。」</p>'
    },
    {
      q: '核心表结构怎么设计的？',
      star: 4,
      a: '<p>说清三张核心表和关键字段、索引即可：</p>' +
        '<pre><code>voucher            优惠券模板\n  id, shop_id, title, sub_title, rules, pay_value, actual_value, type, status\n\nseckill_voucher    秒杀库存（与 voucher 1:1）\n  voucher_id(PK), stock, begin_time, end_time, version\n\nvoucher_order      秒杀订单\n  id(PK), user_id, voucher_id, pay_type, status, create_time, pay_time\n  UNIQUE KEY uk_user_voucher (user_id, voucher_id)   -- 一人一单兜底\n  KEY idx_voucher (voucher_id)\n\nvoucher_stock_log（可选）库存流水\n  id, voucher_id, order_id, delta, type, create_time  -- 对账/审计</code></pre>' +
        '<p>要点：</p><ul>' +
        '<li>订单表用<strong>唯一索引</strong>而不是「先查再插」，因为查和插之间有时间窗，唯一索引才是并发安全的最终防线。</li>' +
        '<li>库存字段加 <code>stock &gt; 0</code> 条件更新，靠数据库行锁保证不卖超。</li>' +
        '<li>订单 ID 用 Redis 自增或雪花算法预生成，避免依赖数据库自增暴露业务量。</li>' +
        '<li>金额用 <code>decimal</code> 或「分」为单位的整数，不用 float。</li></ul>'
    },
    {
      q: '项目有什么不足？如果重做你会怎么改？',
      star: 4,
      a: '<p>这题考的是反思能力，挑真实但可控的不足：</p>' +
        '<ul>' +
        '<li><strong>限流是单机的</strong>：Guava 令牌桶只在单实例生效，多实例部署后总令牌数会翻倍。改进：Redis + Lua 分布式令牌桶，或 Sentinel 集群流控。</li>' +
        '<li><strong>补偿依赖定时任务</strong>：实时性一般。改进：本地消息表 + 定时重投，或引入事务消息。</li>' +
        '<li><strong>没有做真正的压测环境隔离</strong>：本机 JMeter 和应用抢 CPU，数据只能看趋势。改进：独立压测机、固定基线、全链路监控。</li>' +
        '<li><strong>缓存一致性是最终一致</strong>：极端情况下短时间脏读。改进：延迟双删 + binlog 订阅（Canal）异步刷新。</li>' +
        '<li><strong>缺少可观测性</strong>：只有日志。改进：Micrometer + Prometheus + Grafana，给秒杀链路加埋点。</li>' +
        '</ul>' +
        '<p>表达公式：「当时因为 X 选择了 A，它的代价是 B；如果重做，我会用 C，并验证 D。」——有取舍、有验证，比单纯认错高级。</p>'
    },
    {
      q: '简历写「在课程版基础上自主完成」，面试官问你自己到底做了什么？',
      star: 3,
      a: '<p>不要贬低课程版，也不要把课程功能说成自己原创。用「改造清单 + 原因」回答：</p>' +
        '<ul>' +
        '<li><strong>原版</strong>：秒杀只有 Redis 预扣 + 异步下单，没有限流和完整补偿；缓存只有简单的穿透处理。</li>' +
        '<li><strong>我的改造</strong>：加了令牌桶前置限流；把「查库存 + 查重 + 扣减」合并成 Lua 原子脚本；消费端补了 CAS 与唯一索引双保险；封装 CacheClient 统一处理穿透/击穿；加了滑动窗口登录限流和签到统计。</li>' +
        '<li><strong>我验证的</strong>：JMeter 压测、重复请求拦截、库存对账脚本、异常场景手工注入（MQ 消费失败、Redis 库存不足）。</li>' +
        '</ul>' +
        '<p>核心是把「我理解并改进了什么」讲具体，而不是争「是不是我从零写的」。面试官更在意你是否真的踩过坑。</p>'
    },
    {
      q: '怎么防止黄牛刷单 / 脚本抢券？',
      star: 4,
      a: '<p>从「身份、频率、行为、库存」四层答：</p>' +
        '<ul>' +
        '<li><strong>身份</strong>：强登录 + 实名/手机号绑定；一人一单不只按 userId，还可按设备指纹、IP 段做风控。</li>' +
        '<li><strong>频率</strong>：接口级限流（令牌桶）、用户级滑动窗口（1 分钟 1 次）、验证码/答题、秒杀 token 一次性消费。</li>' +
        '<li><strong>行为</strong>：链接不提前暴露，开始前才下发；请求签名 + 时间戳防重放；异常 UA/无埋点请求降权。</li>' +
        '<li><strong>库存</strong>：Redis 原子扣减 + DB 唯一索引，保证即使绕过前端也只能买到一单；事后对账冻结异常订单。</li>' +
        '</ul>' +
        '<p>补一句：「风控是成本与体验的平衡，项目里我主要实现了限流 + 一人一单 + 链接隐藏，设备指纹属于生产环境会接的风控系统。」</p>'
    },
    {
      q: '项目怎么部署的？线上出问题怎么排查？',
      star: 3,
      a: '<p>部署：Maven 打包 → Docker 镜像（JDK 17 + jar）→ docker-compose 起 MySQL/Redis/RabbitMQ → Nginx 反代。关键点：</p>' +
        '<ul>' +
        '<li>JVM 参数：<code>-Xms/-Xmx</code> 设成一样，避免堆动态伸缩；容器里用 <code>-XX:MaxRAMPercentage</code>。</li>' +
        '<li>配置外置：数据库密码走环境变量，不打进镜像。</li>' +
        '<li>健康检查：<code>/actuator/health</code>，启动依赖就绪再接流量。</li>' +
        '</ul>' +
        '<p>排查顺序（万能模板）：<strong>看监控 → 看日志 → 看线程/连接池 → 定位最近变更 → 复现/回滚</strong>。具体工具：<code>top</code> 看 CPU、<code>jstack</code> 看线程阻塞、<code>jmap</code>/<code>MAT</code> 看内存、慢 SQL 日志、Redis <code>slowlog</code>、MQ 堆积监控。</p>'
    }
  ]
});

/* ================= 模块 2：秒杀 ================= */
window.MODULES.push({
  id: 'seckill',
  order: 2,
  icon: '⚡',
  title: '秒杀系统设计',
  desc: '简历第一条 bullet 的完整拆解：四级防线、令牌桶、Lua 原子性、MQ 削峰、CAS 防超卖、幂等与补偿。这是面试的主战场。',
  tags: ['Redis', 'Lua', 'RabbitMQ', 'CAS', '限流'],
  items: [
    {
      q: '讲一下你的「秒杀四级防线」，每一层分别解决什么问题？',
      star: 5,
      a: '<p>关键是说清<strong>每层的职责边界</strong>，而不是堆技术名词：</p>' +
        '<table><tr><th>层级</th><th>手段</th><th>解决的问题</th><th>失败后的结果</th></tr>' +
        '<tr><td>1 接入层</td><td>Guava 令牌桶 10 令牌/秒</td><td>削掉瞬时洪峰，保护后端</td><td>快速失败，返回「活动太火爆」</td></tr>' +
        '<tr><td>2 缓存层</td><td>Redis Lua：库存 + 一人一单 + 扣减</td><td>原子资格判断，挡住无效请求</td><td>返回无库存 / 重复下单</td></tr>' +
        '<tr><td>3 异步层</td><td>RabbitMQ Topic 异步落库</td><td>削峰填谷，让 DB 按自己的能力消费</td><td>消息进死信，补偿重试</td></tr>' +
        '<tr><td>4 存储层</td><td>CAS 更新 + 唯一索引</td><td>最终防超卖、防重复单</td><td>影响行数 0，回滚/补偿</td></tr></table>' +
        '<p>「前三层是<em>尽量不让请求走到下一层</em>，第四层是<em>就算前面都失效也不会卖超</em>。防线之间不是重复，而是纵深防御。」</p>' +
        '<blockquote class="tip">面试官很可能追问「Lua 已经扣了库存，为什么 DB 还要 CAS？」——见下面单独一题，务必背熟。</blockquote>'
    },
    {
      q: '为什么用令牌桶？令牌桶和漏桶、固定窗口、滑动窗口有什么区别？',
      star: 5,
      a: '<table><tr><th>算法</th><th>核心思想</th><th>特点</th><th>适用</th></tr>' +
        '<tr><td>固定窗口</td><td>每分钟计数，到点清零</td><td>实现简单，但临界点可能双倍流量</td><td>粗粒度限额</td></tr>' +
        '<tr><td>滑动窗口</td><td>按时间轴统计最近 N 秒的请求</td><td>平滑，但存储成本高（ZSet/时间轮）</td><td>登录、短信等精确限流</td></tr>' +
        '<tr><td>漏桶</td><td>请求先入桶，以固定速率流出</td><td>绝对平滑，但无法应对突发</td><td>保护下游稳定速率</td></tr>' +
        '<tr><td>令牌桶</td><td>按速率放令牌，请求取令牌</td><td><strong>允许一定突发</strong>（桶里攒着令牌），实现简单</td><td>秒杀入口削峰</td></tr></table>' +
        '<p>选令牌桶的原因：「秒杀开始瞬间有突发流量，但我希望系统<strong>平均</strong>只放 10 个/秒进来，多余的快速失败。令牌桶既限住了平均速率，又能容忍桶容量内的突发，比漏桶更符合『放行一部分、拒绝大部分』的诉求。」</p>' +
        '<pre><code>// Guava：每秒 10 个令牌，桶容量默认 10\nprivate final RateLimiter limiter = RateLimiter.create(10);\n\nif (!limiter.tryAcquire()) {\n    return Result.fail("活动太火爆，请稍后再试");\n}</code></pre>'
    },
    {
      q: 'Guava RateLimiter 的原理是什么？它有什么致命局限？',
      star: 5,
      a: '<p><strong>原理</strong>：<code>SmoothBursty</code> 基于「令牌桶 + 惰性计算」。它不真的起线程放令牌，而是记录<em>下一次可发放令牌的时间</em> <code>nextFreeTicketMicros</code>；请求到来时按经过时间算出应补多少令牌，够就扣、不够就返回等待时间。所以它没有定时任务，开销很小。</p>' +
        '<p><strong>局限</strong>：</p>' +
        '<ul>' +
        '<li><strong>单机限流</strong>：每个实例各 10 令牌/秒，3 个实例就是 30/秒，集群总速率不可控。</li>' +
        '<li><strong>不持久</strong>：重启后桶状态清零，可能瞬间放过一波。</li>' +
        '<li><strong>不公平</strong>：默认非公平抢占，先到的请求不一定先拿到。</li>' +
        '</ul>' +
        '<p><strong>集群方案</strong>：Redis + Lua 实现分布式令牌桶（key 存 tokens 和 lastRefillTime），或直接用 Sentinel 集群流控 / Nginx <code>limit_req</code>。话术：「项目是单机部署所以用 Guava，如果多实例，我会把令牌桶下沉到 Redis，用 Lua 保证取令牌的原子性。」</p>'
    },
    {
      q: '为什么用 Lua 脚本？它为什么能保证原子性？',
      star: 5,
      a: '<p><strong>因为 Redis 执行命令是单线程的</strong>，而一段 Lua 脚本在 Redis 里会被当成<em>一个整体</em>执行：脚本执行期间不会插入其他客户端命令。所以「读库存 → 判断 → 扣减」不会出现交错。</p>' +
        '<p>对比不用 Lua 的问题：</p>' +
        '<pre><code>// 错误示范：三条命令，中间可能被其他请求插入\nint stock = redis.get(key);       // 线程 A 读到 1\nif (stock &gt; 0) {                  // 线程 B 也读到 1\n    redis.decr(key);              // 两个都减，库存 -1 → 超卖\n}</code></pre>' +
        '<p>Lua 版本：</p>' +
        '<pre><code>-- KEYS[1]=库存key  KEYS[2]=已下单用户Set  ARGV[1]=userId\nlocal stock = tonumber(redis.call(\'GET\', KEYS[1]))\nif stock == nil or stock &lt;= 0 then\n  return -1                        -- 库存不足\nend\nif redis.call(\'SISMEMBER\', KEYS[2], ARGV[1]) == 1 then\n  return -2                        -- 重复下单\nend\nredis.call(\'DECR\', KEYS[1])\nredis.call(\'SADD\', KEYS[2], ARGV[1])\nreturn stock - 1                   -- 返回剩余库存</code></pre>' +
        '<p>补充两个加分点：</p>' +
        '<ul>' +
        '<li>Lua 里<strong>不要写死 key</strong>，用 <code>KEYS[]</code> 传，否则 Redis Cluster 无法正确路由。</li>' +
        '<li>脚本要<strong>短小且无循环</strong>，因为执行期间会阻塞其他命令；不要在 Lua 里做大量计算。</li>' +
        '</ul>'
    },
    {
      q: 'Lua 脚本执行期间，Redis 还能处理其他请求吗？会有什么风险？',
      star: 4,
      a: '<p>不能。Redis 的主命令执行线程是单线程的，Lua 脚本在其中串行执行，期间其他客户端命令会<strong>阻塞等待</strong>。这是原子性的来源，也是风险所在。</p>' +
        '<p>所以有几条纪律：</p>' +
        '<ul>' +
        '<li>脚本要短，避免 O(n) 遍历大集合、避免在 Lua 里做复杂计算。</li>' +
        '<li>不要对 bigkey 做 <code>SMEMBERS</code>、<code>KEYS *</code> 这类操作。</li>' +
        '<li>脚本执行超过 <code>lua-time-limit</code>（默认 5 秒）后，Redis 会开始返回 BUSY，但仍不中断脚本；只能用 <code>SCRIPT KILL</code>（未写操作时）或 <code>SHUTDOWN NOSAVE</code>。</li>' +
        '<li>尽量让脚本只操作少量 key，并保证所有 key 在同一 slot（Cluster 下用 hash tag）。</li>' +
        '</ul>' +
        '<p>一句话：「Lua 用『阻塞』换『原子』，所以只能做轻量判断，不能把它当存储过程用。」</p>'
    },
    {
      q: '一人一单怎么实现？为什么不能只靠 Redis？',
      star: 5,
      a: '<p><strong>Redis 层</strong>：用 Set 存 <code>seckill:order:{voucherId}</code>，Lua 里 <code>SISMEMBER</code> 判断，<code>SADD</code> 标记，和扣库存放在同一脚本里原子完成。</p>' +
        '<p><strong>数据库层</strong>：订单表建唯一索引 <code>UNIQUE KEY uk_user_voucher (user_id, voucher_id)</code>，插入重复时抛 <code>DuplicateKeyException</code>，捕获后按「已下单」处理。</p>' +
        '<p><strong>为什么两层都要</strong>：</p>' +
        '<ul>' +
        '<li>Redis 可能丢数据/被清空/主从切换丢写，Set 标记不是强一致存储。</li>' +
        '<li>MQ 可能重复投递，消费者可能重试，只有数据库唯一约束是<em>最终、持久</em>的幂等保证。</li>' +
        '<li>反过来说，只有 DB 唯一索引也不够：请求会先打到 DB 才被拒绝，失去缓存层挡流量的意义。</li>' +
        '</ul>' +
        '<blockquote class="warn">注意：Redis Set 会随用户量增长占用内存。生产上应给 key 设置过期时间（活动结束后删除），或改用 BitMap（userId 连续时）/<code>SETNX</code> 标记，并做容量评估。</blockquote>'
    },
    {
      q: '超卖到底是怎么发生的？你的 CAS 怎么解决？',
      star: 5,
      a: '<p><strong>超卖根因</strong>：并发下的「读-改-写」丢失更新。两个事务都读到库存 1，都判断 <code>&gt; 0</code>，都执行 <code>stock = 1 - 1</code>，最终卖出 2 件。</p>' +
        '<p><strong>错误写法</strong>：</p>' +
        '<pre><code>// 先查后改，两步之间没有锁\nStock s = selectById(id);\nif (s.getStock() &gt; 0) {\n    update stock = #{s.stock - 1} where id = #{id};  // 覆盖写，丢更新\n}</code></pre>' +
        '<p><strong>CAS 写法</strong>：把判断和修改合并成一条 SQL，由数据库行锁保证原子：</p>' +
        '<pre><code>UPDATE seckill_voucher\nSET stock = stock - 1\nWHERE voucher_id = #{voucherId}\n  AND stock &gt; 0;\n-- 返回受影响行数：0 表示没抢到，1 表示成功</code></pre>' +
        '<p>再加唯一索引兜底一人一单，就同时解决了超卖和重复下单。</p>' +
        '<p><strong>为什么不用 <code>SET stock = #{newStock}</code></strong>：这是覆盖写，并发下会用旧值覆盖新值；<code>stock = stock - 1</code> 是数据库内计算，配合行锁天然串行。</p>' +
        '<p><strong>乐观锁版本号方案</strong>：<code>UPDATE ... SET stock = stock - 1, version = version + 1 WHERE id = ? AND version = ?</code>，失败重试。库存场景直接用 <code>stock &gt; 0</code> 更简洁，省一次查询。</p>'
    },
    {
      q: 'Lua 已经扣了 Redis 库存，为什么数据库还要再 CAS 一次？',
      star: 5,
      a: '<p>这是最高频的追问，核心答「Redis 不是事实来源」：</p>' +
        '<ol>' +
        '<li><strong>Redis 可能丢数据</strong>：主从异步复制，主挂切换可能丢写；重启未持久化也会丢。Redis 库存可能比真实可售多。</li>' +
        '<li><strong>Redis 与 DB 可能不一致</strong>：预热出错、人工改库存、补偿多扣/少扣，都会让两边对不上。</li>' +
        '<li><strong>消息会重复/乱序</strong>：MQ 至少一次投递，消费者可能重复执行；CAS + 唯一索引保证重复执行也无害。</li>' +
        '<li><strong>职责分离</strong>：Redis 负责「挡流量」，DB 负责「最终正确」。前者追求快，后者追求对。</li>' +
        '</ol>' +
        '<p>话术：「Lua 是<em>第一道闸门</em>，CAS 是<em>最后一道保险</em>。如果没有 CAS，一旦 Redis 库存被多扣或少扣，数据库就会跟着错；有了 CAS，最坏情况是少卖，但绝不会超卖。」</p>' +
        '<blockquote class="tip">「少卖」比「超卖」可接受，这是业务上的取舍，能说出来很加分。</blockquote>'
    },
    {
      q: 'RabbitMQ 在秒杀链路里具体怎么用？为什么用 Topic 交换机？',
      star: 5,
      a: '<p><strong>流程</strong>：Lua 扣减成功后，向交换机发送一条消息（voucherId、userId、orderId），立即返回「排队中」；消费者收到后落库、扣 DB 库存、更新订单状态。</p>' +
        '<p><strong>为什么用 Topic</strong>：Topic 支持通配符路由（<code>seckill.order.*</code>），可以把「下单成功」「下单失败」「超时取消」拆成不同 routing key，后续增加消费者（积分、通知、风控）时只需绑定新队列，不用改生产者。相比 Direct 更灵活，相比 Fanout 更可控。</p>' +
        '<p><strong>消息内容</strong>：只放必要字段（订单号、用户、商品），不放整个订单对象——消息体越大，MQ 压力越大，且容易与数据库 schema 耦合。</p>' +
        '<p><strong>可靠性配置</strong>：</p>' +
        '<ul>' +
        '<li>生产者：<code>publisher-confirm</code> + <code>publisher-return</code>，失败落本地消息表重发。</li>' +
        '<li>Broker：交换机、队列、消息都持久化。</li>' +
        '<li>消费者：手动 ack，业务成功才 ack；失败 <code>basicNack</code> 且 <code>requeue=false</code> 进死信，避免无限重试打爆队列。</li>' +
        '</ul>'
    },
    {
      q: '消息重复消费怎么办？幂等怎么做？',
      star: 5,
      a: '<p>先承认前提：「RabbitMQ 是 at-least-once，重复投递不可避免（网络抖动、ack 丢失、消费者重启），所以消费者必须幂等。」</p>' +
        '<p><strong>方案（从强到弱）</strong>：</p>' +
        '<ol>' +
        '<li><strong>数据库唯一索引</strong>：<code>UNIQUE(user_id, voucher_id)</code> 或 <code>UNIQUE(order_id)</code>。插入冲突即视为已处理，最可靠。</li>' +
        '<li><strong>状态机</strong>：订单状态只能从「待支付」流转到「已支付」，重复消息因状态不匹配被忽略（<code>UPDATE ... WHERE status = 0</code>）。</li>' +
        '<li><strong>去重表/Redis 标记</strong>：消息 ID 存 Redis <code>SETNX</code> 或去重表，处理前判断。缺点：Redis 不可靠、表会膨胀，通常配合过期时间。</li>' +
        '</ol>' +
        '<p><strong>不要用</strong>「先 select 再 insert」：并发下两个消费者都查到不存在，然后都插入，除非有唯一索引。</p>' +
        '<p>加分回答：「幂等键要选业务唯一键，而不是消息 ID。因为同一次下单可能因为重发产生不同消息 ID，但 <code>(userId, voucherId)</code> 永远唯一。」</p>'
    },
    {
      q: '消费者处理失败，Redis 库存怎么回补？会不会出问题？',
      star: 5,
      a: '<p>不能简单 <code>INCR</code> 了事，要考虑「订单到底建没建成功」。</p>' +
        '<p><strong>安全补偿流程</strong>：</p>' +
        '<ol>' +
        '<li>消费失败 → <code>basicNack(requeue=false)</code> → 死信队列，记录失败原因。</li>' +
        '<li>补偿任务消费死信，先按 <code>orderId</code> 查订单表：</li>' +
        '<ul><li>订单已存在 → 说明只是 ack 丢失，<strong>不回补库存</strong>，直接确认。</li>' +
        '<li>订单不存在 → 回补 Redis 库存 <code>INCR</code>，并从已下单 Set 中 <code>SREM</code> 该用户，允许其重新抢。</li></ul>' +
        '<li>回补操作要幂等：用「补偿流水表 + 唯一键」或 Redis 标记，防止重复回补导致库存虚增。</li>' +
        '<li>定时对账兜底：<code>DB 库存 + 有效订单数 = 初始库存</code>，不一致告警并人工介入。</li>' +
        '</ol>' +
        '<blockquote class="warn">顺序很关键：先确认订单不存在，再回补。反过来会制造「订单成功 + 库存加回」的超卖漏洞。</blockquote>'
    },
    {
      q: '订单超时未支付怎么自动取消？',
      star: 4,
      a: '<p>常见四种方案，按项目实际选：</p>' +
        '<table><tr><th>方案</th><th>原理</th><th>优点</th><th>缺点</th></tr>' +
        '<tr><td>定时任务扫表</td><td>每分钟查 <code>status=待支付 AND create_time &lt; now-15min</code></td><td>简单、可靠</td><td>延迟精度差、大表扫描压力</td></tr>' +
        '<tr><td>TTL + 死信队列</td><td>消息 15 分钟过期后进 DLX，消费者取消订单</td><td>实时、解耦</td><td>同一队列消息 TTL 不同会队头阻塞</td></tr>' +
        '<tr><td>延迟插件</td><td><code>rabbitmq-delayed-message-exchange</code></td><td>精确、好用</td><td>需装插件，消息堆积占资源</td></tr>' +
        '<tr><td>Redis ZSet 延迟队列</td><td>score 存到期时间，定时 <code>ZRANGEBYSCORE</code> 捞取</td><td>轻量、可控</td><td>需自己保证可靠性</td></tr></table>' +
        '<p>项目里我用「延迟队列 + 定时对账」：延迟消息负责实时取消，定时任务兜底防止消息丢失。取消时用状态机 <code>UPDATE ... WHERE status = 待支付</code>，保证不会把已支付订单误取消。</p>'
    },
    {
      q: '库存预热怎么做？为什么必须预热？',
      star: 4,
      a: '<p><strong>为什么</strong>：秒杀开始瞬间如果 Redis 没库存，所有请求会穿透到 DB；而且第一个请求回填缓存时容易形成击穿。</p>' +
        '<p><strong>做法</strong>：</p>' +
        '<ul>' +
        '<li>活动开始前（如提前 10 分钟）由定时任务把 <code>seckill_voucher.stock</code> 写入 Redis，key 设计为 <code>seckill:stock:{voucherId}</code>。</li>' +
        '<li>同时清理上一轮残留的已下单 Set、订单缓存。</li>' +
        '<li>预热完成打标记（如 <code>seckill:warm:{id}=1</code>），接口先校验标记，未预热直接拒绝，防止活动提前曝光。</li>' +
        '<li>多实例部署时用分布式锁保证只预热一次，或让预热任务幂等 <code>SET stock N</code>。</li>' +
        '</ul>' +
        '<p><strong>一致性</strong>：预热后如果运营改库存，要同时更新 DB 和 Redis；以 DB 为准，通过后台操作 + 缓存刷新，不要直接改 Redis。</p>'
    },
    {
      q: 'Redis 挂了，秒杀还能用吗？',
      star: 4,
      a: '<p>分层回答「降级」而不是「保证可用」：</p>' +
        '<ul>' +
        '<li><strong>哨兵/集群</strong>：主从自动故障转移，秒级恢复；但异步复制可能丢少量写，所以 DB 的 CAS 是最后保险。</li>' +
        '<li><strong>降级开关</strong>：Redis 不可用时，关闭秒杀入口，返回「活动维护中」，保护数据库不被直接打穿。</li>' +
        '<li><strong>本地兜底</strong>：极端场景可用本地缓存 + 单机限流临时顶一下，但多实例库存无法协同，只能短时应急。</li>' +
        '<li><strong>恢复后</strong>：以 DB 为准重建 Redis 库存和已下单集合，再打开入口。</li>' +
        '</ul>' +
        '<p>核心观点：「秒杀是<strong>可降级业务</strong>，可用性优先级低于数据正确性。宁可暂时不可用，也不能让流量绕过防线压垮 DB、造成超卖。」</p>'
    },
    {
      q: '秒杀接口怎么防止链接被提前暴露、被脚本刷？',
      star: 4,
      a: '<ul>' +
        '<li><strong>链接隐藏</strong>：秒杀 URL 不写死在页面，活动开始后才通过接口下发；URL 带随机 path 或一次性 token。</li>' +
        '<li><strong>token 机制</strong>：用户先调「获取秒杀令牌」接口，服务端校验资格后发一个一次性 token（Redis 存 + 过期时间），下单时校验并删除，防止直接构造请求。</li>' +
        '<li><strong>签名防重放</strong>：参数 + 时间戳 + nonce 做 MD5/HMAC 签名，服务端校验时间窗和 nonce 是否用过。</li>' +
        '<li><strong>限流</strong>：IP、用户、接口三个维度；登录接口用滑动窗口，秒杀接口用令牌桶。</li>' +
        '<li><strong>风控</strong>：同 IP 多账号、无埋点、UA 异常、请求间隔过于规律，打标记或直接拒绝。</li>' +
        '</ul>' +
        '<p>这些属于「提高攻击成本」，没有绝对防住。回答时点明这一点，比吹「完全防刷」可信。</p>'
    },
    {
      q: '为什么不用分布式锁来扣库存？',
      star: 4,
      a: '<p>不是不能用，而是<strong>不合适</strong>：</p>' +
        '<ul>' +
        '<li><strong>性能</strong>：分布式锁是串行化，1000 个请求排队，吞吐取决于锁的获取/释放开销，远不如 Lua 一次原子操作。</li>' +
        '<li><strong>复杂度</strong>：锁超时、续期、误删、脑裂都要处理；Redisson 看门狗虽然成熟，但引入额外依赖和故障点。</li>' +
        '<li><strong>没必要</strong>：库存扣减本质是「判断 + 自减」，Redis 单线程 + Lua 已经是原子操作，加锁属于重复保护。</li>' +
        '</ul>' +
        '<p>什么时候需要分布式锁：<strong>跨多个资源、需要先查后改且无法用一条命令表达</strong>的场景，比如「检查用户是否黑名单 → 创建订单 → 扣积分」这种多步业务。库存这种单 key 原子操作，Lua 更轻。</p>'
    },
    {
      q: '秒杀和普通下单有什么区别？',
      star: 3,
      a: '<table><tr><th>维度</th><th>普通下单</th><th>秒杀下单</th></tr>' +
        '<tr><td>流量</td><td>平稳、可预测</td><td>瞬时洪峰、远超承载</td></tr>' +
        '<tr><td>库存</td><td>DB 行锁/CAS 即可</td><td>Redis 预扣 + DB 兜底</td></tr>' +
        '<tr><td>流程</td><td>同步校验、同步落库</td><td>同步资格判断、异步落库</td></tr>' +
        '<tr><td>一致性</td><td>强一致，事务保证</td><td>最终一致，MQ + 补偿 + 对账</td></tr>' +
        '<tr><td>失败反馈</td><td>立即明确</td><td>可能「排队中」，需查单</td></tr>' +
        '<tr><td>防刷</td><td>常规风控</td><td>限流、令牌、链接隐藏</td></tr></table>' +
        '<p>总结一句：「秒杀是把<strong>并发压力</strong>和<strong>一致性要求</strong>拆开处理：入口尽量挡，中间异步化，末端强校验。」</p>'
    },
    {
      q: 'MQ 积压了几十万条消息，怎么处理？',
      star: 4,
      a: '<p>先定位原因（消费者挂了？变慢？生产突增？），再分情况：</p>' +
        '<ul>' +
        '<li><strong>消费者故障</strong>：修复后扩容消费者实例，提高并发（<code>concurrency</code>）和 <code>prefetch</code>，但要注意 DB 承受能力。</li>' +
        '<li><strong>消费逻辑慢</strong>：批量拉取 + 批量落库、异步化非核心逻辑（发短信、加积分）、优化慢 SQL。</li>' +
        '<li><strong>消息本身有问题</strong>：毒消息导致无限重试，配置重试次数 + 死信队列，先隔离。</li>' +
        '<li><strong>紧急止血</strong>：临时把消息转存到新队列/数据库，起临时消费者慢慢消化，避免影响主链路。</li>' +
        '<li><strong>预防</strong>：监控队列深度和消费速率告警、消费者自动扩缩容、生产端限流。</li>' +
        '</ul>' +
        '<blockquote class="warn">不要一上来就说「加机器」。如果消费逻辑是单条同步写库，加机器会把压力转嫁给 MySQL，可能引发更大故障。</blockquote>'
    }
  ]
});
