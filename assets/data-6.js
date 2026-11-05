window.MODULES = window.MODULES || [];

/* ================= 模块 12：面试实战 ================= */
window.MODULES.push({
  id: 'interview',
  order: 12,
  icon: '🎤',
  title: '面试实战与话术',
  desc: '知识会了，还要讲得出来。这一章是自我介绍模板、项目追问树、高频速答、简历风险点和压力面应对。面试前 30 分钟看这一章。',
  tags: ['自我介绍', 'STAR', '追问树', '反问', '复盘'],
  items: [
    {
      q: '自我介绍怎么设计？（30 秒版 + 1 分钟版）',
      star: 5,
      a: '<p><strong>30 秒版</strong>（适用于面试官已经看过简历）：</p>' +
        '<blockquote>「我是西南交大通信工程研一的学生，本科是电子信息。Java 后端方向，主要做 Spring Boot + Redis + MySQL 的业务开发。最近完成了一个本地生活点评平台，核心是优惠券秒杀和缓存优化，做了限流、Lua 原子扣减、MQ 削峰和 CAS 防超卖，也做过压测验证。平时关注高并发和中间件，喜欢把原理落到代码里。」</blockquote>' +
        '<p><strong>1 分钟版</strong>：在上述基础上加「一个技术细节 + 一个结果」：</p>' +
        '<blockquote>「……其中我印象最深的是库存一致性：Redis 预扣之后，消费端用 CAS 加唯一索引兜底，再配合死信补偿和对账，保证不超卖。1000 并发压测下成功订单和库存严格一致，零超卖。」</blockquote>' +
        '<p><strong>结构</strong>：身份 → 方向 → 项目 → 亮点 → 收尾（为什么投这个岗位）。不要复述简历上的每一行，留钩子让面试官追问。</p>'
    },
    {
      q: '项目难点怎么用 STAR 讲？',
      star: 5,
      a: '<p><strong>S（背景）</strong>：秒杀瞬时流量是常态的几十倍，直接打 DB 会连接池耗尽、热点行锁排队，而且并发下容易超卖。</p>' +
        '<p><strong>T（目标）</strong>：在保证不超卖、一人一单的前提下，让系统扛住瞬时流量，并且 Redis 与 DB 最终一致。</p>' +
        '<p><strong>A（行动）</strong>：</p>' +
        '<ul>' +
        '<li>入口：Guava 令牌桶 10/s 快速失败，挡住无效流量。</li>' +
        '<li>缓存：Lua 把库存校验、一人一单、扣减合成原子操作。</li>' +
        '<li>异步：RabbitMQ Topic 削峰，消费端手动 ack + 死信。</li>' +
        '<li>存储：CAS <code>stock &gt; 0</code> + 唯一索引双保险。</li>' +
        '<li>兜底：失败补偿 + 定时对账。</li>' +
        '</ul>' +
        '<p><strong>R（结果）</strong>：1000 并发下零超卖、重复请求全部拦截；接口 P99 从直接压库的秒级降到百毫秒级；形成了一套可复用的缓存和限流封装。</p>' +
        '<p><strong>加一句反思</strong>：「如果重做，我会把单机令牌桶换成 Redis 分布式令牌桶，并补上 Prometheus 监控。」</p>'
    },
    {
      q: '面试官会顺着项目怎么追问？（追问树）',
      star: 5,
      a: '<p>提前把每个 bullet 的「下一层」准备好：</p>' +
        '<pre><code>秒杀四级防线\n├─ 令牌桶：为什么是 10/s？集群怎么办？RateLimiter 原理？\n├─ Lua：为什么原子？执行时阻塞吗？集群 key 怎么路由？\n├─ MQ：消息丢了怎么办？重复消费？积压？顺序？\n└─ CAS：为什么 Lua 扣了还要 CAS？影响行数 0 怎么处理？\n\n缓存封装\n├─ 穿透：空值 TTL 多久？布隆过滤器怎么加？\n├─ 击穿：互斥锁 vs 逻辑过期怎么选？\n├─ 雪崩：过期时间怎么打散？\n└─ 一致性：先删还是后删？延迟双删延迟多久？\n\n登录限流\n├─ 为什么用 ZSet？为什么用 Lua？\n├─ 1 分钟 1 次和 5 次怎么叠加？\n├─ 封禁 key 怎么设计？误封怎么办？\n└─ 分布式限流还有什么方案？\n\n统计\n├─ BitMap 为什么省内存？offset 上限？\n├─ BITFIELD 位序？跨月怎么办？\n├─ HLL 原理？误差多少？为什么不能精确？\n└─ 签到补签、断签怎么处理？</code></pre>' +
        '<p>练习方法：对着这棵树，每个节点用 30 秒讲一遍，卡住的就回到对应模块。</p>'
    },
    {
      q: '高频 20 问速答（面试前扫一遍）',
      star: 5,
      a: '<table><tr><th>问题</th><th>一句话答案</th></tr>' +
        '<tr><td>Redis 为什么快</td><td>内存 + 单线程无锁 + IO 多路复用 + 高效结构</td></tr>' +
        '<tr><td>缓存穿透</td><td>查不存在的数据，空值缓存 + 布隆过滤器</td></tr>' +
        '<tr><td>缓存击穿</td><td>热点 key 过期，互斥锁或逻辑过期</td></tr>' +
        '<tr><td>缓存雪崩</td><td>大量 key 同时失效，过期打散 + 多级缓存 + 降级</td></tr>' +
        '<tr><td>缓存一致性</td><td>先更新 DB 再删缓存 + 延迟双删 + binlog + TTL</td></tr>' +
        '<tr><td>分布式锁</td><td>SET NX PX + 唯一 value + Lua 释放，Redisson 看门狗</td></tr>' +
        '<tr><td>MQ 不丢</td><td>confirm + 持久化 + 手动 ack + 本地消息表</td></tr>' +
        '<tr><td>MQ 幂等</td><td>唯一索引 + 状态机 + 去重表</td></tr>' +
        '<tr><td>超卖</td><td>Redis Lua 预扣 + DB CAS + 唯一索引</td></tr>' +
        '<tr><td>B+ 树</td><td>扇出大、树矮、范围查询快、查询稳定</td></tr>' +
        '<tr><td>回表</td><td>二级索引拿主键再查聚簇索引，覆盖索引可避免</td></tr>' +
        '<tr><td>MVCC</td><td>隐藏字段 + undo 版本链 + ReadView 可见性判断</td></tr>' +
        '<tr><td>事务隔离</td><td>RU/RC/RR/串行化，MySQL 默认 RR</td></tr>' +
        '<tr><td>线程池流程</td><td>核心 → 队列 → 最大 → 拒绝</td></tr>' +
        '<tr><td>volatile</td><td>可见性 + 有序性，不保证原子性</td></tr>' +
        '<tr><td>AQS</td><td>volatile state + CLH 队列 + 模板方法</td></tr>' +
        '<tr><td>Spring 事务失效</td><td>非 public、自调用、异常吞掉、类型不匹配</td></tr>' +
        '<tr><td>循环依赖</td><td>三级缓存，延迟生成 AOP 代理</td></tr>' +
        '<tr><td>JWT 缺点</td><td>无法主动失效、payload 明文、怕 XSS</td></tr>' +
        '<tr><td>HLL</td><td>12KB、0.81% 误差、估算 UV，不存元素</td></tr></table>'
    },
    {
      q: '简历上哪些措辞最容易被追问？怎么提前准备？',
      star: 5,
      a: '<table><tr><th>简历原话</th><th>可能被追问</th><th>准备方向</th></tr>' +
        '<tr><td>「1000 并发压测」</td><td>怎么压的？QPS 多少？瓶颈在哪？</td><td>JMeter 配置、指标口径、Redis/DB 监控</td></tr>' +
        '<tr><td>「零超卖」</td><td>怎么证明？异常场景测了吗？</td><td>对账 SQL、库存断言、重复请求构造</td></tr>' +
        '<tr><td>「拦截 14 次重复请求」</td><td>14 怎么来的？并发下会不会漏？</td><td>一人一单两层实现、唯一索引兜底</td></tr>' +
        '<tr><td>「CacheClient 统一封装」</td><td>用了什么设计模式？怎么扩展？</td><td>策略/模板方法、泛型、函数式回填</td></tr>' +
        '<tr><td>「逻辑过期 + 异步重建」</td><td>线程池参数？重建失败怎么办？</td><td>线程池隔离、失败重试、旧值兜底</td></tr>' +
        '<tr><td>「分级封禁」</td><td>阈值怎么定？误封怎么办？</td><td>滑动窗口 + 递增封禁 + 人工解封</td></tr>' +
        '<tr><td>「熟悉 JVM」</td><td>调过什么参数？排查过 OOM 吗？</td><td>诚实说了解，讲清排查步骤</td></tr>' +
        '</table>' +
        '<p><strong>原则</strong>：简历上每个形容词都要有一个故事支撑；没有把握的写「了解」，不要写「精通」。</p>'
    },
    {
      q: '面试官问「你为什么用这个技术」，怎么答才有说服力？',
      star: 4,
      a: '<p>公式：<strong>场景约束 → 候选方案 → 选择理由 → 代价与兜底</strong>。</p>' +
        '<p>例：为什么用 RabbitMQ？</p>' +
        '<blockquote>「我们的场景是秒杀下单，消息量峰值高但总体不大，要求低延迟、可靠投递、能路由到多个消费者。候选有 Kafka 和 RocketMQ：Kafka 吞吐更高但偏流处理，延迟和路由灵活性不占优；RocketMQ 功能全但运维重。RabbitMQ 的 confirm、死信、延迟插件刚好覆盖需求，社区成熟，所以选它。代价是吞吐上限不如 Kafka，我们通过消费者扩容和批量落库来补。」</blockquote>' +
        '<p>不要只说「因为流行/课程用的/公司用的」。即使真是公司定的，也要补上「它适合什么场景」。</p>'
    },
    {
      q: '被问到不会的问题怎么办？',
      star: 4,
      a: '<p>三步：<strong>承认边界 → 迁移已知 → 给出思路</strong>。</p>' +
        '<blockquote>「这个点我没有在生产环境实践过，我的理解是……（讲相邻的已知知识）。如果是我来实现，我会先……再……，需要验证的是……」</blockquote>' +
        '<p>示例：问「RedLock 的争议」不会细节：</p>' +
        '<blockquote>「RedLock 我没落地过。我知道它是向多个独立 Redis 加锁，多数成功才算成功，用来解决主从切换丢锁。但它依赖时钟和网络，成本和正确性争议较大。我的项目里更倾向用单实例锁 + 数据库唯一索引兜底，或者用 ZooKeeper/etcd 这种共识系统。」</blockquote>' +
        '<p><strong>不要</strong>：瞎编、沉默超过 5 秒、强行转移话题。面试官更看重你的思考路径和诚实度。</p>'
    },
    {
      q: '压力面 / 被质疑项目太简单，怎么应对？',
      star: 4,
      a: '<p>先接住情绪，再给事实，不卑不亢：</p>' +
        '<blockquote>「您说得对，这是个课程项目，规模和真实大促没法比。但它是我从 0 到 1 把高并发链路走通的一次实践：我遇到了 Redis 与 DB 不一致、消息重复、缓存击穿这些真实问题，也做了压测和补偿。我很清楚它的边界——比如限流是单机的、没有全链路压测。如果放到生产，我会优先补分布式限流、监控和容量评估。」</blockquote>' +
        '<p>要点：</p>' +
        '<ul>' +
        '<li>不防御、不吹大，承认边界反而增加可信度。</li>' +
        '<li>把「项目大小」转成「我学到了什么、怎么验证的」。</li>' +
        '<li>主动说出改进方向，显示你有工程判断。</li>' +
        '<li>如果对方持续贬低，保持礼貌，判断这家公司是否值得去。</li>' +
        '</ul>'
    },
    {
      q: '面试最后反问什么？',
      star: 3,
      a: '<p>按优先级选 2–3 个：</p>' +
        '<ul>' +
        '<li><strong>团队与业务</strong>：「团队目前的核心业务和近期目标是什么？我进来会参与哪部分？」</li>' +
        '<li><strong>技术成长</strong>：「团队的技术栈和代码评审/上线流程是怎样的？新人有没有导师制？」</li>' +
        '<li><strong>岗位期望</strong>：「这个岗位前三个月最重要的产出是什么？」</li>' +
        '<li><strong>挑战</strong>：「团队现在最大的技术挑战是什么？」</li>' +
        '</ul>' +
        '<p><strong>不要问</strong>：加班多吗（可以换种问法「团队通常的发布节奏」）、工资多少（HR 环节谈）、「我表现得怎么样」（显得不自信）。</p>'
    },
    {
      q: '面试前 24 小时怎么复习？',
      star: 4,
      a: '<ul>' +
        '<li><strong>第 1 小时</strong>：过一遍项目总览和追问树，确保能脱稿画链路。</li>' +
        '<li><strong>第 2 小时</strong>：只看 ★★★★★ 高频题，用自己的话复述，不要逐字背。</li>' +
        '<li><strong>第 3 小时</strong>：做 2 轮随机测验，错题回到模块重读。</li>' +
        '<li><strong>睡前</strong>：准备 3 个反问 + 自我介绍 30 秒版，录音听一遍。</li>' +
        '<li><strong>面试前 30 分钟</strong>：看「高频 20 问速答」和「简历风险点」，不要再学新知识。</li>' +
        '</ul>' +
        '<p>心态：面试是匹配，不是考试。会 70% 已经很好，关键是能把会的那 70% 讲清楚。</p>'
    },
    {
      q: '怎么复盘一场面试？',
      star: 3,
      a: '<p>面完立刻记录（趁记忆新鲜）：</p>' +
        '<ul>' +
        '<li><strong>问题清单</strong>：被问了什么，哪些答得好，哪些卡住。</li>' +
        '<li><strong>追问链</strong>：面试官从哪个点往下挖，说明他对什么感兴趣。</li>' +
        '<li><strong>不会的点</strong>：当天查清楚，补进这个知识库（可以自己加笔记）。</li>' +
        '<li><strong>表达问题</strong>：是否啰嗦、是否跑题、是否一上来就堆细节。</li>' +
        '<li><strong>公司信息</strong>：业务、团队、面试官风格，判断是否匹配。</li>' +
        '</ul>' +
        '<p>复盘的目标不是自责，而是把「不会」变成「下次会」。同一类问题连续两次卡住，就说明是知识盲区，不是紧张。</p>'
    }
  ]
});

/* ================= 自测题库 ================= */
window.QUIZ = [
  {
    q: '秒杀链路中，Redis 的 Lua 脚本已经扣减了库存，为什么数据库还要用 stock &gt; 0 的 CAS 更新？',
    options: [
      '因为 Lua 脚本不能扣减数字',
      '因为 Redis 不是最终事实来源，可能丢数据或与 DB 不一致，CAS 是最后一道防超卖保险',
      '因为数据库更新比 Redis 快',
      '因为 RabbitMQ 要求必须再扣一次'
    ],
    answer: 1,
    explain: 'Redis 负责挡流量和预扣，数据库负责最终正确。主从切换、持久化丢失、预热错误都可能让 Redis 库存不准，CAS 保证最坏情况只少卖、不超卖。',
    modTitle: '秒杀系统设计'
  },
  {
    q: 'Guava RateLimiter 在秒杀项目里最大的局限是什么？',
    options: [
      '不能限制 QPS',
      '只能单机限流，多实例部署时集群总速率会翻倍',
      '必须配合 RabbitMQ 使用',
      '只能用于 HTTP 接口'
    ],
    answer: 1,
    explain: 'RateLimiter 的令牌桶状态在 JVM 内存里，每个实例独立计数。多实例要用 Redis + Lua 分布式令牌桶或 Sentinel 集群流控。',
    modTitle: '秒杀系统设计'
  },
  {
    q: '令牌桶相比漏桶的核心优势是？',
    options: [
      '完全不限流',
      '允许一定程度的突发流量，因为桶里可以积攒令牌',
      '内存占用为零',
      '不需要考虑时间窗口'
    ],
    answer: 1,
    explain: '漏桶以固定速率流出，绝对平滑；令牌桶按速率放令牌，桶内可攒令牌，因此能容忍桶容量内的突发。',
    modTitle: '秒杀系统设计'
  },
  {
    q: '缓存穿透指的是？',
    options: [
      '热点 key 过期瞬间大量请求打到数据库',
      '大量 key 同时过期导致数据库压力骤增',
      '查询数据库里也不存在的数据，缓存永远不命中',
      'Redis 集群某个节点宕机'
    ],
    answer: 2,
    explain: '穿透是「数据不存在」，击穿是「热点 key 过期」，雪崩是「大量 key 同时失效」。三者定义要分清。',
    modTitle: 'Redis 核心与缓存设计'
  },
  {
    q: '用「逻辑过期」解决缓存击穿时，缓存过期后的行为是？',
    options: [
      '直接删除缓存并阻塞等待重建',
      '返回旧数据，同时异步抢锁重建缓存',
      '返回 404',
      '所有请求排队查数据库'
    ],
    answer: 1,
    explain: '逻辑过期不设 Redis TTL，value 里带过期时间。过期后先返回旧值保证可用性，再由一个线程异步重建。',
    modTitle: 'Redis 核心与缓存设计'
  },
  {
    q: '缓存空值（防穿透）的 TTL 通常应该怎么设置？',
    options: [
      '越长越好，最好永不过期',
      '较短，如 2 到 5 分钟，避免数据后来被创建却一直返回空',
      '必须和正常数据一样长',
      '不需要设置 TTL'
    ],
    answer: 1,
    explain: '空值缓存是为了挡重复的无效查询，但数据可能后来被创建，所以 TTL 要短，并在新增数据时主动清理。',
    modTitle: 'Redis 核心与缓存设计'
  },
  {
    q: '「先更新数据库，再删除缓存」相比「先删除缓存，再更新数据库」更推荐，主要原因是？',
    options: [
      '删除缓存比更新缓存快',
      '先删缓存会在 DB 更新前留下较长的旧值回填窗口',
      '数据库不支持先删后更新',
      '这样一定能强一致'
    ],
    answer: 1,
    explain: '先删缓存后，DB 还没更新时若有读请求，会把旧值回填，造成较长时间的脏数据。先更新库再删缓存窗口更小，但仍需延迟双删/TTL 兜底。',
    modTitle: 'Redis 核心与缓存设计'
  },
  {
    q: 'Redis 的 ZSet 底层使用的是什么结构？',
    options: [
      '纯红黑树',
      '跳表 + 哈希表',
      '数组 + 链表',
      'B+ 树'
    ],
    answer: 1,
    explain: '哈希表存 member 到 score 的映射，支持 O(1) 判断成员；跳表按 score 排序，支持范围查询和排名。',
    modTitle: 'Redis 核心与缓存设计'
  },
  {
    q: '「Redis 是单线程的」准确含义是？',
    options: [
      '整个 Redis 进程只有一个线程',
      '命令执行是单线程的，网络 IO 在 6.0 后可多线程，持久化等有后台线程',
      'Redis 不能处理并发连接',
      '所有操作都在一个 CPU 核上完成'
    ],
    answer: 1,
    explain: '单线程指命令执行串行，这是原子性和无锁的基础。6.0 引入 IO 多线程处理网络读写，BGSAVE、异步删除等也有后台线程。',
    modTitle: 'Redis 核心与缓存设计'
  },
  {
    q: 'AOF 设置为 everysec 时，宕机最多可能丢失多少数据？',
    options: [
      '不丢数据',
      '约 1 秒的写命令',
      '约 30 秒的写命令',
      '全部数据'
    ],
    answer: 1,
    explain: 'everysec 每秒 fsync 一次，最多丢 1 秒；always 最安全但性能差；no 交给操作系统，可能丢约 30 秒。',
    modTitle: 'Redis 核心与缓存设计'
  },
  {
    q: '缓存场景下，Redis 内存淘汰策略通常优先选？',
    options: [
      'noeviction',
      'allkeys-lru 或 allkeys-lfu',
      'volatile-ttl',
      'allkeys-random'
    ],
    answer: 1,
    explain: '纯缓存场景所有 key 都可淘汰，用 allkeys-lru（最近最少使用）或 allkeys-lfu（访问频率最低）。noeviction 适合不能丢数据的场景。',
    modTitle: 'Redis 核心与缓存设计'
  },
  {
    q: '用 SETNX 实现分布式锁，释放锁时为什么要用 Lua 比较 value？',
    options: [
      '为了提高性能',
      '防止业务超时后锁被其他线程持有，自己误删别人的锁',
      'Lua 可以自动续期',
      '为了支持可重入'
    ],
    answer: 1,
    explain: 'value 存唯一标识，释放前用 Lua 原子地比较并删除，避免 A 的锁过期后 B 拿到锁，A 执行完把 B 的锁删掉。',
    modTitle: 'Redis 核心与缓存设计'
  },
  {
    q: 'Redisson 看门狗的默认续期行为是？',
    options: [
      '每 1 秒续期 1 秒',
      '锁默认 30 秒过期，后台每 10 秒检查并续期到 30 秒',
      '锁永不过期',
      '只有手动调用才续期'
    ],
    answer: 1,
    explain: '未显式指定 leaseTime 时才启用看门狗：默认 30 秒，每 30/3=10 秒续一次。指定了 leaseTime 则固定过期，不续期。',
    modTitle: 'Redis 核心与缓存设计'
  },
  {
    q: '以下哪项不是 RabbitMQ 消息变成死信的常见原因？',
    options: [
      '消费者 basicNack 且 requeue=false',
      '消息 TTL 过期',
      '队列达到最大长度',
      '消费者正常 basicAck'
    ],
    answer: 3,
    explain: '正常 ack 表示消费成功，消息被删除，不会进死信。死信来源是拒绝且不重回队列、TTL 过期、队列超长。',
    modTitle: 'RabbitMQ 与消息可靠性'
  },
  {
    q: 'RabbitMQ 的 publisher-return 回调在什么时候触发？',
    options: [
      '消息到达 Exchange 时',
      '消息到达 Exchange 但无法路由到任何队列时',
      '消费者 ack 时',
      '消息持久化失败时'
    ],
    answer: 1,
    explain: 'confirm 证明 Exchange 收到了；return 证明 Exchange 收到了但路由失败（如 routingKey 写错），需要 mandatory=true。',
    modTitle: 'RabbitMQ 与消息可靠性'
  },
  {
    q: '用 TTL + 死信队列实现延迟队列，最大的坑是？',
    options: [
      'TTL 不能设置为毫秒',
      '同一队列中不同 TTL 会队头阻塞，短 TTL 消息可能被长 TTL 消息堵住',
      '死信队列不能持久化',
      '必须使用 Fanout 交换机'
    ],
    answer: 1,
    explain: 'RabbitMQ 只检查队头消息是否过期。不同延迟时间应使用不同队列，或改用延迟插件/Redis ZSet。',
    modTitle: 'RabbitMQ 与消息可靠性'
  },
  {
    q: 'RabbitMQ 的 prefetch（QoS）限制的是什么？',
    options: [
      '每个消费者未 ack 的消息数量',
      '队列的最大长度',
      '生产者的发送速率',
      '交换机的绑定数量'
    ],
    answer: 0,
    explain: 'prefetch 限制每个 consumer 最多有多少条未确认消息，防止一次性推送太多导致内存暴涨和负载不均。',
    modTitle: 'RabbitMQ 与消息可靠性'
  },
  {
    q: '消费者重复消费最常见的兜底方案是？',
    options: [
      '关闭自动 ack',
      '数据库唯一索引或状态机条件更新',
      '增加消费者数量',
      '把消息 TTL 设长'
    ],
    answer: 1,
    explain: 'MQ 只能保证至少一次投递，重复不可避免。唯一索引、状态机条件更新、去重表是可靠方案；先查后插在并发下不可靠。',
    modTitle: 'RabbitMQ 与消息可靠性'
  },
  {
    q: 'MySQL 选择 B+ 树而不是 B 树，主要优势不包括？',
    options: [
      '非叶子节点不存数据，扇出更大，树更矮',
      '叶子节点用链表连接，范围查询高效',
      '所有查询都在叶子节点命中，性能稳定',
      '不需要磁盘 IO'
    ],
    answer: 3,
    explain: 'B+ 树依然需要磁盘 IO，只是把 IO 次数压到很低（通常 3 到 4 次）。其他三项都是 B+ 树的优势。',
    modTitle: 'MySQL 索引、事务与锁'
  },
  {
    q: '什么是回表？',
    options: [
      '把表数据导回历史库',
      '通过二级索引找到主键后，再回聚簇索引查整行',
      '把数据写回缓存',
      '事务回滚'
    ],
    answer: 1,
    explain: '二级索引叶子只存索引列和主键，查整行要再走一次聚簇索引。覆盖索引可以避免回表。',
    modTitle: 'MySQL 索引、事务与锁'
  },
  {
    q: '联合索引 (a, b, c)，查询条件为 a=1 AND c=3，索引使用情况是？',
    options: [
      '完全用不上索引',
      '能用 a 列，c 列通常只能做索引下推过滤',
      'a 和 c 都能用于定位',
      '只能走全表扫描'
    ],
    answer: 1,
    explain: '跳过 b 后，c 无法用于 B+ 树的定位；5.6+ 的索引下推可以在索引层过滤 c，减少回表。',
    modTitle: 'MySQL 索引、事务与锁'
  },
  {
    q: '以下哪种写法最可能导致索引失效？',
    options: [
      'WHERE name = 张三',
      'WHERE name LIKE 张%',
      'WHERE DATE(create_time) = 2026-01-01',
      'WHERE id BETWEEN 1 AND 10'
    ],
    answer: 2,
    explain: '对索引列使用函数会导致失效，应改成 create_time &gt;= ... AND create_time &lt; ... 的范围查询。',
    modTitle: 'MySQL 索引、事务与锁'
  },
  {
    q: 'MySQL InnoDB 的默认隔离级别是？',
    options: ['读未提交', '读已提交', '可重复读', '串行化'],
    answer: 2,
    explain: 'InnoDB 默认 REPEATABLE-READ，通过 MVCC 和 Next-Key Lock 基本解决幻读。Oracle/PostgreSQL 默认 RC。',
    modTitle: 'MySQL 索引、事务与锁'
  },
  {
    q: 'MVCC 中判断版本是否可见依赖什么？',
    options: [
      '锁等待队列',
      'ReadView（m_ids、min_trx_id、max_trx_id 等）',
      'binlog 位点',
      'redo log 的 LSN'
    ],
    answer: 1,
    explain: 'ReadView 记录活跃事务列表和边界，结合 undo 版本链上的事务 ID 判断某个版本是否对当前事务可见。',
    modTitle: 'MySQL 索引、事务与锁'
  },
  {
    q: 'undo log 的主要作用是？',
    options: [
      '崩溃恢复时重放已提交事务',
      '事务回滚和 MVCC 版本链',
      '主从复制',
      '记录慢查询'
    ],
    answer: 1,
    explain: 'undo 记录反向操作，用于回滚；同时通过 roll_ptr 串成版本链，支撑 MVCC 快照读。redo 负责崩溃恢复，binlog 负责复制。',
    modTitle: 'MySQL 索引、事务与锁'
  },
  {
    q: 'InnoDB 的间隙锁（Gap Lock）主要解决什么问题？',
    options: [
      '防止脏读',
      '防止其他事务在索引间隙中插入，从而避免幻读',
      '提升查询速度',
      '防止死锁'
    ],
    answer: 1,
    explain: '间隙锁锁住索引值之间的空隙，阻止插入；配合记录锁组成 Next-Key Lock，在 RR 下防幻读。',
    modTitle: 'MySQL 索引、事务与锁'
  },
  {
    q: '深分页 LIMIT 1000000, 20 的优化方案，最合适的是？',
    options: [
      '加更多索引',
      '改成游标分页 WHERE id > last_id ORDER BY id LIMIT 20',
      '把 LIMIT 调大',
      '用 COUNT(*) 先统计'
    ],
    answer: 1,
    explain: '游标分页利用主键索引直接定位，避免扫描并丢弃前 100 万行；延迟关联也是常见方案。',
    modTitle: 'MySQL 索引、事务与锁'
  },
  {
    q: '线程池提交任务时，核心线程已满、队列未满，会发生什么？',
    options: [
      '直接创建非核心线程',
      '任务进入阻塞队列排队',
      '执行拒绝策略',
      '抛异常'
    ],
    answer: 1,
    explain: '执行顺序是核心线程 → 队列 → 最大线程 → 拒绝。所以使用无界队列时最大线程数永远不会生效。',
    modTitle: 'Java 并发与集合'
  },
  {
    q: '为什么阿里规约禁止用 Executors.newFixedThreadPool？',
    options: [
      '它不支持多线程',
      '使用无界队列，任务可能无限堆积导致 OOM，且最大线程数失效',
      '它不能指定线程名',
      '它性能太差'
    ],
    answer: 1,
    explain: 'LinkedBlockingQueue 默认容量 Integer.MAX_VALUE，任务堆积会 OOM。应手动创建 ThreadPoolExecutor 并指定有界队列。',
    modTitle: 'Java 并发与集合'
  },
  {
    q: 'CPU 密集型任务的线程数通常设置为？',
    options: ['核数 × 2', '核数 + 1', '固定 100', '核数 × 10'],
    answer: 1,
    explain: 'CPU 密集型线程数约为 N+1，过多只会增加上下文切换；IO 密集型可用 N × (1 + 等待/计算)，最终以压测为准。',
    modTitle: 'Java 并发与集合'
  },
  {
    q: 'volatile 能保证以下哪一项？',
    options: [
      'i++ 的原子性',
      '可见性和有序性',
      '复合操作的原子性',
      '线程互斥'
    ],
    answer: 1,
    explain: 'volatile 通过内存屏障保证可见性和禁止重排，但 i++ 是读改写三步，不保证原子性，需要原子类或锁。',
    modTitle: 'Java 并发与集合'
  },
  {
    q: 'ThreadLocal 内存泄漏的根本原因是？',
    options: [
      'ThreadLocal 是强引用',
      'ThreadLocalMap 的 key 是弱引用，被回收后 value 仍被 Entry 强引用',
      '线程池不会复用线程',
      'value 是弱引用'
    ],
    answer: 1,
    explain: 'key 被回收后变成 null，但 value 仍被 Entry 强引用；线程长期存活（线程池）时 value 无法回收。用完必须 remove。',
    modTitle: 'Java 并发与集合'
  },
  {
    q: 'AQS 中表示同步状态的核心字段是？',
    options: [
      'volatile int state',
      'final int count',
      'AtomicInteger size',
      'boolean locked'
    ],
    answer: 0,
    explain: 'AQS 用 volatile int state 表示同步状态，配合 CAS 修改；ReentrantLock 用它表示占用和重入次数，Semaphore 表示许可数。',
    modTitle: 'Java 并发与集合'
  },
  {
    q: 'synchronized 的锁升级顺序是？',
    options: [
      '重量级 → 轻量级 → 偏向锁',
      '无锁 → 偏向锁 → 轻量级锁 → 重量级锁',
      '偏向锁 → 重量级锁 → 轻量级锁',
      '无锁 → 重量级锁'
    ],
    answer: 1,
    explain: '锁升级是单向的。JDK 15 起偏向锁默认禁用，JDK 18 移除，但面试仍常问。',
    modTitle: 'Java 并发与集合'
  },
  {
    q: 'JDK 1.8 的 ConcurrentHashMap 用什么保证线程安全？',
    options: [
      'Segment 分段锁',
      'CAS + synchronized 锁单个桶',
      '全局 synchronized',
      '只读不加锁'
    ],
    answer: 1,
    explain: '1.8 取消 Segment，锁粒度细化到链表头/红黑树根节点；扩容时支持多线程协助迁移。',
    modTitle: 'Java 并发与集合'
  },
  {
    q: '以下哪个 JVM 区域是线程私有的？',
    options: ['堆', '方法区', '虚拟机栈', '元空间'],
    answer: 2,
    explain: '虚拟机栈、本地方法栈、程序计数器是线程私有；堆和方法区（元空间）是线程共享。',
    modTitle: 'JVM 内存与调优'
  },
  {
    q: 'G1 收集器的核心特点不包括？',
    options: [
      '把堆划分为大小相等的 Region',
      '可预测的停顿时间模型',
      '整体基于标记-整理，Region 间复制，不产生碎片',
      '必须配合永久代使用'
    ],
    answer: 3,
    explain: '永久代在 JDK 8 已被元空间取代，和 G1 无关。G1 是 JDK 9+ 默认收集器，支持大堆和可预测停顿。',
    modTitle: 'JVM 内存与调优'
  },
  {
    q: '双亲委派机制的主要好处是？',
    options: [
      '加快类加载速度',
      '避免类重复加载，并保护核心类不被篡改',
      '支持热部署',
      '减少内存占用'
    ],
    answer: 1,
    explain: '加载请求先交给父加载器，保证核心类由 Bootstrap 加载，防止自定义 java.lang.String 冒充；也避免重复加载。',
    modTitle: 'JVM 内存与调优'
  },
  {
    q: '线上 CPU 100%，第一步应该做什么？',
    options: [
      '重启应用',
      'top 找到 CPU 最高的进程，再 top -Hp 找线程，转十六进制后 jstack 定位',
      '直接导出堆转储',
      '增加机器'
    ],
    answer: 1,
    explain: '先定位是哪个线程在消耗 CPU，再看它在执行什么。如果是 GC 导致，再用 jstat/jmap 分析。直接重启会丢失现场。',
    modTitle: 'JVM 内存与调优'
  },
  {
    q: 'Spring 三级缓存中，第三级 singletonFactories 的作用是？',
    options: [
      '缓存完整的 Bean',
      '缓存 ObjectFactory，延迟决定是否提前生成 AOP 代理',
      '缓存 Bean 的定义信息',
      '缓存事务连接'
    ],
    answer: 1,
    explain: '二级缓存存早期引用，三级缓存存工厂。只有发生循环依赖时才调用工厂生成代理，避免破坏正常 Bean 的生命周期。',
    modTitle: 'Spring / Spring Boot / MyBatis'
  },
  {
    q: '以下哪种情况会导致 @Transactional 失效？',
    options: [
      '方法声明为 public 并被其他 Bean 调用',
      '同类内部 this 自调用一个带事务的方法',
      '异常是 RuntimeException 且未被捕获',
      '使用 InnoDB 引擎'
    ],
    answer: 1,
    explain: '自调用不走代理，事务增强不生效。其他三项都是事务能正常工作的条件。',
    modTitle: 'Spring / Spring Boot / MyBatis'
  },
  {
    q: 'Spring Boot 3.x 自动配置类主要从哪个文件加载？',
    options: [
      'META-INF/spring.factories',
      'META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports',
      'application.yml',
      'web.xml'
    ],
    answer: 1,
    explain: 'Boot 2.x 用 spring.factories，3.x 改为 AutoConfiguration.imports。通过 @Conditional 系列注解决定是否生效。',
    modTitle: 'Spring / Spring Boot / MyBatis'
  },
  {
    q: 'MyBatis 中 #{} 和 ${} 的关键区别是？',
    options: [
      '没有区别',
      '#{} 使用预编译占位符，能防 SQL 注入；${} 是字符串拼接',
      '${} 性能更好且更安全',
      '#{} 只能用于数字'
    ],
    answer: 1,
    explain: '#{} 交给 PreparedStatement 做参数绑定；${} 直接拼进 SQL，只应用于表名、列名等动态结构，并做白名单校验。',
    modTitle: 'Spring / Spring Boot / MyBatis'
  },
  {
    q: 'JWT 的 Payload 是什么状态？',
    options: [
      '加密的，只有服务端能解',
      'Base64Url 编码的明文，不能放敏感信息',
      '二进制压缩数据',
      '存在数据库里'
    ],
    answer: 1,
    explain: 'JWT 只做签名防篡改，不做加密，任何人拿到 token 都能解开 Payload。敏感信息应放服务端或用 JWE。',
    modTitle: '登录安全与限流'
  },
  {
    q: '用 Redis ZSet 做滑动窗口限流，核心命令组合是？',
    options: [
      'INCR + EXPIRE',
      'ZREMRANGEBYSCORE 清理窗口外 + ZCARD 计数 + ZADD 记录',
      'LPUSH + LRANGE',
      'SETNX + DEL'
    ],
    answer: 1,
    explain: 'score 存时间戳，先删窗口外的旧记录，再统计数量，未超限则加入本次请求。整体要用 Lua 保证原子。',
    modTitle: '登录安全与限流'
  },
  {
    q: '一个用户一个月签到数据用 BitMap 存，大约占多少空间？',
    options: ['4 字节', '4 KB', '4 MB', '40 MB'],
    answer: 0,
    explain: '31 天只需 31 bit，约 4 字节。BitMap 按 bit 存储，极致省内存；但 offset 很大而数据稀疏时会浪费空间。',
    modTitle: 'BitMap / HLL / Feed 流'
  },
  {
    q: 'HyperLogLog 统计 UV 的特点是什么？',
    options: [
      '精确计数，能取回元素',
      '固定约 12KB 内存，标准误差约 0.81%，不能取回元素',
      '占用内存随用户数线性增长',
      '只能统计 PV'
    ],
    answer: 1,
    explain: 'HLL 用 16384 个 6 bit 桶做概率估计，内存固定 12KB，适合大流量 UV；有误差，且不能判断元素是否存在。',
    modTitle: 'BitMap / HLL / Feed 流'
  },
  {
    q: 'Feed 流中「推模式」的主要缺点是？',
    options: [
      '读的时候要合并很多人的数据',
      '写扩散：粉丝多时发布要给每个粉丝写一份，写放大严重',
      '不能按时间排序',
      '无法使用 Redis'
    ],
    answer: 1,
    explain: '推模式读快写重，适合普通用户；大 V 粉丝千万会用拉模式或推拉结合，避免发布时写放大。',
    modTitle: 'BitMap / HLL / Feed 流'
  },
  {
    q: '保证接口幂等，最可靠的最终兜底方案是？',
    options: [
      '先查后插',
      '数据库唯一索引 / 唯一约束',
      '前端按钮置灰',
      '增加服务器'
    ],
    answer: 1,
    explain: '前端防重不可靠，先查后插在并发下有窗口。唯一索引由数据库保证，是最终防线；可配合状态机和去重表。',
    modTitle: '系统设计与场景题'
  },
  {
    q: '雪花算法生成的 ID 包含哪些部分？',
    options: [
      '时间戳 + 机器 ID + 序列号',
      '随机数 + MAC 地址',
      '数据库自增 + 哈希',
      '用户 ID + 时间戳'
    ],
    answer: 0,
    explain: '64 bit：1 位符号 + 41 位时间戳 + 10 位机器 ID + 12 位序列号。趋势递增、本地生成，但依赖时钟，回拨会重复。',
    modTitle: '系统设计与场景题'
  },
  {
    q: 'HTTPS 为什么同时使用非对称加密和对称加密？',
    options: [
      '为了兼容旧浏览器',
      '非对称加密安全地协商会话密钥，对称加密高效传输数据',
      '因为对称加密不安全',
      '因为非对称加密更快'
    ],
    answer: 1,
    explain: '非对称加密慢但能安全交换密钥，对称加密快但需要共享密钥。TLS 用前者协商，后者传输。',
    modTitle: '登录安全与限流'
  },
  {
    q: '防止水平越权，最关键的做法是？',
    options: [
      '把用户 ID 放在请求参数里由前端传',
      '从 token 中取当前用户 ID，并在查询/操作时校验资源归属',
      '使用自增 ID',
      '只做前端隐藏按钮'
    ],
    answer: 1,
    explain: '不能信任前端传的 userId。服务端从 token 解析身份，所有资源查询都带 user_id 条件，防止改 orderId 查别人订单。',
    modTitle: '登录安全与限流'
  }
];
