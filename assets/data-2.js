window.MODULES = window.MODULES || [];

/* ================= 模块 3：Redis ================= */
window.MODULES.push({
  id: 'redis',
  order: 3,
  icon: '🧠',
  title: 'Redis 核心与缓存设计',
  desc: '项目里 Redis 承担了库存、缓存、限流、签到四类职责。这一章覆盖：底层结构、持久化、集群、缓存三件套、分布式锁，以及面试最爱追问的一致性。',
  tags: ['缓存穿透', '击穿', '雪崩', 'Lua', '分布式锁'],
  items: [
    {
      q: 'Redis 为什么快？',
      star: 5,
      a: '<ul>' +
        '<li><strong>纯内存操作</strong>：避免磁盘 I/O，这是最主要的。</li>' +
        '<li><strong>单线程执行命令</strong>：没有线程切换和锁竞争，也避免了并发写的数据结构问题。</li>' +
        '<li><strong>I/O 多路复用</strong>：epoll 监听大量连接，事件驱动，不用一连接一线程。</li>' +
        '<li><strong>高效数据结构</strong>：SDS、跳表、listpack、intset 等针对场景优化。</li>' +
        '<li><strong>协议简单</strong>：RESP 协议解析开销小。</li>' +
        '</ul>' +
        '<p>补一句边界：「单线程指的是<em>命令执行</em>，不是整个 Redis 只有一个线程。6.0 之后网络 I/O 也支持多线程，持久化、异步删除、集群同步都有后台线程。」</p>'
    },
    {
      q: 'Redis 6.0 的多线程是怎么回事？为什么命令执行还是单线程？',
      star: 5,
      a: '<p>6.0 引入的是 <strong>I/O 多线程</strong>：读请求解析、写响应数据这些网络 I/O 可以分给多个线程做，但<strong>命令本身仍在主线程串行执行</strong>。</p>' +
        '<p>原因：</p>' +
        '<ul>' +
        '<li>命令执行是纯内存操作，本身极快，瓶颈往往在网络 I/O 和协议解析。</li>' +
        '<li>保持单线程执行就不用给所有数据结构加锁，避免复杂度和上下文切换。</li>' +
        '<li>多线程执行会破坏 Lua 原子性、事务、<code>INCR</code> 等语义，改造代价极大。</li>' +
        '</ul>' +
        '<p>配置：<code>io-threads 4</code>、<code>io-threads-do-reads yes</code>。默认关闭。</p>' +
        '<blockquote class="tip">追问「那 Redis 是单线程还是多线程？」标准答法：「命令执行单线程，网络 I/O 6.0 起可多线程，持久化/异步删除有后台线程。」</blockquote>'
    },
    {
      q: 'Redis 五种基本类型，分别对应你项目里的什么场景？',
      star: 5,
      a: '<table><tr><th>类型</th><th>底层/特点</th><th>项目场景</th></tr>' +
        '<tr><td>String</td><td>SDS，可存文本/数字/二进制</td><td>库存值、JWT、验证码、对象 JSON、分布式锁</td></tr>' +
        '<tr><td>Hash</td><td>listpack / hashtable</td><td>购物车（userId → itemId:count）、用户信息局部更新</td></tr>' +
        '<tr><td>List</td><td>quicklist（双向链表 + listpack）</td><td>简单消息队列、最新评论列表</td></tr>' +
        '<tr><td>Set</td><td>intset / hashtable</td><td>一人一单用户集合、点赞用户、共同关注</td></tr>' +
        '<tr><td>ZSet</td><td>listpack / skiplist + dict</td><td>点赞排行榜、Feed 流时间线、滑动窗口限流</td></tr></table>' +
        '<p>加分项：再提三种扩展类型——<strong>BitMap</strong>（签到）、<strong>HyperLogLog</strong>（UV 去重估算）、<strong>GEO</strong>（附近商铺）、<strong>Stream</strong>（消息流）。</p>' +
        '<p>注意别说「String 只能存字符串」：它底层是 SDS，可以存二进制，所以能放序列化对象、图片等。</p>'
    },
    {
      q: 'String 的底层 SDS 相比 C 字符串有什么好处？',
      star: 4,
      a: '<ul>' +
        '<li><strong>O(1) 获取长度</strong>：SDS 头里存了 <code>len</code>，C 字符串要遍历到 <code>\\0</code>。</li>' +
        '<li><strong>二进制安全</strong>：不依赖 <code>\\0</code> 判断结尾，可以存图片、序列化数据。</li>' +
        '<li><strong>杜绝缓冲区溢出</strong>：扩容前检查空间，自动分配。</li>' +
        '<li><strong>减少内存重分配</strong>：采用<em>空间预分配</em>（小于 1MB 翻倍，大于 1MB 多分配 1MB）和<em>惰性释放</em>。</li>' +
        '</ul>' +
        '<p>SDS 有三种头：<code>sdshdr5/8/16/32</code>，按字符串长度选择，节省内存。</p>'
    },
    {
      q: 'ZSet 为什么用跳表而不是红黑树？',
      star: 5,
      a: '<p>先纠正：ZSet 是 <strong>跳表 + 哈希表</strong> 组合。哈希表存 <code>member → score</code>，O(1) 判断成员是否存在；跳表按 score 排序，支持范围查询。</p>' +
        '<p>为什么跳表：</p>' +
        '<ul>' +
        '<li><strong>范围查询更自然</strong>：跳表底层是有序链表，找到起点后顺着指针扫即可；红黑树需要中序遍历，实现复杂。</li>' +
        '<li><strong>实现简单</strong>：跳表插入删除只需改指针，红黑树的旋转/变色逻辑复杂，容易出 bug。</li>' +
        '<li><strong>并发友好</strong>：跳表局部修改，锁粒度小（虽然 Redis 单线程用不上，但设计上更简单）。</li>' +
        '<li><strong>性能相当</strong>：平均 O(log n)，常数因子可接受。</li>' +
        '</ul>' +
        '<p>代价：跳表用<strong>空间换时间</strong>，每个节点有随机层数，平均 1.33 层指针，比红黑树占内存。</p>' +
        '<pre><code>// 跳表节点\nstruct zskiplistNode {\n    sds ele;              // 成员\n    double score;         // 分值\n    struct zskiplistNode *backward;\n    struct zskiplistLevel {\n        struct zskiplistNode *forward;\n        unsigned long span;  // 跨度，用于排名\n    } level[];            // 随机层数 1~32\n};</code></pre>'
    },
    {
      q: 'ZSet 的底层编码什么时候用 listpack，什么时候用跳表？',
      star: 4,
      a: '<p>两个条件同时满足时用 <strong>listpack</strong>（压缩列表的替代），否则转 <strong>skiplist</strong>：</p>' +
        '<ul>' +
        '<li>元素个数 ≤ <code>zset-max-listpack-entries</code>（默认 128）</li>' +
        '<li>每个元素长度 ≤ <code>zset-max-listpack-value</code>（默认 64 字节）</li>' +
        '</ul>' +
        '<p>listpack 是连续内存，省指针、缓存友好，但插入删除要移动元素，只适合小集合。超过阈值后转为跳表 + 哈希表。</p>' +
        '<p>注意：<strong>转换是单向的</strong>，一旦变成跳表，即使元素删到很少也不会转回 listpack。</p>' +
        '<p>同类知识：Hash 用 listpack（≤512 个、值 ≤64 字节），Set 全整数且 ≤512 用 intset，List 用 quicklist。</p>'
    },
    {
      q: 'Redis 字典的渐进式 rehash 是什么？为什么需要？',
      star: 4,
      a: '<p>Redis 的哈希表用<strong>链地址法</strong>解决冲突。当负载因子过高/过低时需要扩容或缩容，但一次性迁移所有元素会阻塞主线程（尤其是百万级 key）。</p>' +
        '<p><strong>渐进式 rehash</strong>：同时保留 <code>ht[0]</code> 和 <code>ht[1]</code>，每次增删改查时顺带迁移一个桶（<code>rehashidx</code> 记录进度），直到迁完再释放旧表。</p>' +
        '<ul>' +
        '<li>查找时先查 <code>ht[0]</code>，没有再查 <code>ht[1]</code>。</li>' +
        '<li>新增只写 <code>ht[1]</code>，保证 <code>ht[0]</code> 只减不增。</li>' +
        '<li>迁移期间如果有多余 CPU，会启动定时任务批量迁移。</li>' +
        '</ul>' +
        '<p>触发扩容：负载因子 ≥ 1 且没有执行 <code>BGSAVE/BGREWRITEAOF</code>；或负载因子 ≥ 5。缩容：负载因子 &lt; 0.1。</p>'
    },
    {
      q: 'Redis 的过期键是怎么删除的？',
      star: 4,
      a: '<p>两种策略结合：</p>' +
        '<ul>' +
        '<li><strong>惰性删除</strong>：访问 key 时才检查是否过期，过期就删。对 CPU 友好，但过期 key 可能长期占内存。</li>' +
        '<li><strong>定期删除</strong>：每 100ms 随机抽取一部分设置了过期时间的 key，删除其中过期的；如果过期比例高，继续抽，但有时限（默认 25% 比例、25ms 上限），避免阻塞。</li>' +
        '</ul>' +
        '<p>所以「过期 key 到点一定被立刻删除」是错的——它是<strong>最终删除</strong>，内存回收有延迟。大量 key 同时过期还会造成缓存雪崩，所以过期时间要加随机值。</p>' +
        '<p>主从环境下：从库不主动删过期 key，等主库删除后同步 <code>DEL</code>；但从库读到的过期 key 会返回空（逻辑过期），保证一致性。</p>'
    },
    {
      q: 'Redis 内存满了会怎样？八种淘汰策略怎么选？',
      star: 5,
      a: '<p>达到 <code>maxmemory</code> 后，根据 <code>maxmemory-policy</code> 处理：</p>' +
        '<table><tr><th>策略</th><th>含义</th></tr>' +
        '<tr><td>noeviction</td><td>不淘汰，写入报 OOM（默认）</td></tr>' +
        '<tr><td>volatile-lru</td><td>在设置了过期时间的 key 中，淘汰最久未使用</td></tr>' +
        '<tr><td>volatile-lfu</td><td>在过期 key 中淘汰访问频率最低</td></tr>' +
        '<tr><td>volatile-random</td><td>过期 key 中随机淘汰</td></tr>' +
        '<tr><td>volatile-ttl</td><td>优先淘汰剩余存活时间最短的</td></tr>' +
        '<tr><td>allkeys-lru</td><td>所有 key 中淘汰最久未使用</td></tr>' +
        '<tr><td>allkeys-lfu</td><td>所有 key 中淘汰访问频率最低</td></tr>' +
        '<tr><td>allkeys-random</td><td>所有 key 随机淘汰</td></tr></table>' +
        '<p><strong>怎么选</strong>：</p>' +
        '<ul>' +
        '<li>缓存场景 → <code>allkeys-lru</code> 或 <code>allkeys-lfu</code>（热点数据用 LFU 更稳）。</li>' +
        '<li>既有缓存又有不能丢的数据 → 不能全淘汰，应拆分实例，或对重要 key 不设过期并使用 <code>volatile-*</code>。</li>' +
        '<li>消息队列/分布式锁 → <code>noeviction</code>，宁可报错也不能悄悄删数据。</li>' +
        '</ul>' +
        '<p>LRU 是「最近是否使用」，LFU 是「使用频率」。Redis 的 LRU 是<strong>近似 LRU</strong>（随机采样 5 个挑最旧），不是严格链表。</p>'
    },
    {
      q: 'RDB 和 AOF 的区别？混合持久化是什么？',
      star: 5,
      a: '<table><tr><th></th><th>RDB</th><th>AOF</th></tr>' +
        '<tr><td>内容</td><td>某一时刻的内存快照（二进制）</td><td>写命令日志（文本/二进制）</td></tr>' +
        '<tr><td>触发</td><td>save/bgsave、配置规则、主从同步</td><td>appendfsync 策略</td></tr>' +
        '<tr><td>恢复</td><td>快，直接加载</td><td>慢，重放所有命令</td></tr>' +
        '<tr><td>丢失</td><td>可能丢最后一次快照后的数据</td><td>everysec 最多丢 1 秒</td></tr>' +
        '<tr><td>开销</td><td>fork 子进程，写时复制，可能卡顿</td><td>持续写盘，文件更大</td></tr></table>' +
        '<p><strong>AOF 三种刷盘策略</strong>：</p>' +
        '<ul>' +
        '<li><code>always</code>：每条命令都 fsync，最安全但性能差。</li>' +
        '<li><code>everysec</code>：每秒 fsync，默认，兼顾性能与安全（最多丢 1 秒）。</li>' +
        '<li><code>no</code>：交给操作系统，可能丢 30 秒。</li>' +
        '</ul>' +
        '<p><strong>混合持久化</strong>（4.0+）：AOF 重写时，前半部分写成 RDB 格式，后半部分追加增量命令。重启时先加载 RDB 再重放增量，兼顾恢复速度和数据完整性。配置 <code>aof-use-rdb-preamble yes</code>。</p>' +
        '<p><strong>AOF 重写</strong>：不是读旧文件，而是 fork 子进程<em>遍历当前内存</em>生成最小命令集；重写期间的新命令写入重写缓冲区，完成后合并。</p>'
    },
    {
      q: '主从复制的原理？复制延迟怎么处理？',
      star: 4,
      a: '<p><strong>建立连接 → 全量同步 → 增量同步</strong>：</p>' +
        '<ol>' +
        '<li>从库发 <code>PSYNC</code>，带 <code>runid</code> 和 <code>offset</code>。</li>' +
        '<li>首次同步：主库 <code>bgsave</code> 生成 RDB，发送给从库；期间新写命令存进 <code>repl_backlog</code>。</li>' +
        '<li>从库加载 RDB 后，主库把积压的增量命令发过去。</li>' +
        '<li>之后主库持续传播写命令，从库执行，并定期上报 offset。</li>' +
        '</ol>' +
        '<p><strong>复制延迟</strong>：异步复制，从库可能落后。业务上：</p>' +
        '<ul>' +
        '<li>强一致读走主库（如下单后立即查订单）。</li>' +
        '<li>容忍延迟的读走从库（商品列表、报表）。</li>' +
        '<li>用 <code>WAIT</code> 命令等待指定数量的从库确认（会牺牲可用性）。</li>' +
        '<li>监控 <code>master_repl_offset</code> 与从库 offset 的差值。</li>' +
        '</ul>' +
        '<p><strong>主库挂掉可能丢数据</strong>：异步复制下，未同步的写会丢。这是 Redis 主从的固有取舍，所以我们的库存有 DB CAS 兜底。</p>'
    },
    {
      q: '哨兵和 Cluster 的区别？分别解决什么问题？',
      star: 4,
      a: '<p><strong>哨兵（Sentinel）</strong>：解决<em>高可用</em>，不解决容量。</p>' +
        '<ul>' +
        '<li>多个哨兵监控主从，主观下线 → 多数派确认客观下线 → 选举 leader 哨兵 → 选新主 → 通知客户端。</li>' +
        '<li>数据全量存在每个节点，容量受单机内存限制。</li>' +
        '<li>适合数据量不大、QPS 不高的场景。</li>' +
        '</ul>' +
        '<p><strong>Cluster</strong>：解决<em>水平扩展</em>。</p>' +
        '<ul>' +
        '<li>16384 个 hash slot，key 用 <code>CRC16(key) % 16384</code> 定位；每个主节点负责一部分槽。</li>' +
        '<li>每个主节点带从节点，主挂自动切换。</li>' +
        '<li>客户端需支持重定向（MOVED/ASK）。</li>' +
        '<li>多 key 操作要求在同一 slot，用 <code>{hash tag}</code> 强制同槽。</li>' +
        '</ul>' +
        '<p>面试点：<strong>为什么是 16384 个槽？</strong> 作者回答过：集群消息心跳包要携带槽位图，16384 个槽的位图约 2KB，65536 个则要 8KB，心跳开销太大；且节点数一般不超过 1000，16384 足够分布。</p>'
    },
    {
      q: '缓存穿透是什么？你项目里怎么解决的？',
      star: 5,
      a: '<p><strong>定义</strong>：查询一个<em>数据库里也不存在</em>的数据，缓存永远不命中，请求全部打到 DB。常见于恶意用不存在的 ID 刷接口。</p>' +
        '<p><strong>项目方案（两层）</strong>：</p>' +
        '<ol>' +
        '<li><strong>空值缓存</strong>：查 DB 为空时，往 Redis 写一个空值（如 <code>""</code> 或特殊标记），TTL 设短一些（2–5 分钟）。后续同样请求直接命中空值，不再查库。</li>' +
        '<li><strong>互斥锁重建</strong>：缓存未命中时，用 <code>SETNX</code> 拿锁，只有一个线程查 DB 并回填，其他线程短暂等待或重试。防止空值过期瞬间大量请求同时穿透。</li>' +
        '</ol>' +
        '<pre><code>public Shop queryWithPassThrough(Long id) {\n    String key = "cache:shop:" + id;\n    String json = redis.get(key);\n    if (json != null) {\n        return json.isEmpty() ? null : JSON.parse(json);  // 空串代表不存在\n    }\n    // 互斥锁，只放一个线程查库\n    String lockKey = "lock:shop:" + id;\n    boolean locked = redis.setIfAbsent(lockKey, "1", 10, SECONDS);\n    if (!locked) {\n        Thread.sleep(50);\n        return queryWithPassThrough(id);   // 简化：实际要限制重试次数\n    }\n    try {\n        Shop shop = shopMapper.selectById(id);\n        redis.set(key, shop == null ? "" : JSON.toJSONString(shop),\n                  shop == null ? 2 : 30, MINUTES);\n        return shop;\n    } finally {\n        redis.delete(lockKey);\n    }\n}</code></pre>' +
        '<p><strong>进阶</strong>：布隆过滤器（提前拦截不存在的 ID）、参数校验、接口限流。</p>' +
        '<p><strong>空值缓存的问题</strong>：占内存、可能短时间数据不一致（后来数据被创建了还返回空）。所以 TTL 要短，新增数据时主动删缓存。</p>'
    },
    {
      q: '缓存击穿是什么？互斥锁和逻辑过期怎么选？',
      star: 5,
      a: '<p><strong>定义</strong>：某个<em>热点 key</em> 过期的瞬间，大量并发请求同时打到 DB。注意和穿透的区别：击穿是 key 存在但过期，穿透是数据根本不存在。</p>' +
        '<p><strong>方案一：互斥锁</strong>（强一致优先）</p>' +
        '<ul>' +
        '<li>未命中 → <code>SETNX</code> 抢锁 → 抢到的查 DB 回填 → 没抢到的休眠重试。</li>' +
        '<li>优点：实现简单，数据一致性好。</li>' +
        '<li>缺点：其他线程要等待，吞吐下降；锁超时/死锁要处理。</li>' +
        '</ul>' +
        '<p><strong>方案二：逻辑过期</strong>（高可用优先）</p>' +
        '<ul>' +
        '<li>Redis 里不设 TTL，value 里带一个 <code>expireTime</code> 字段。</li>' +
        '<li>读到数据先判断逻辑时间：未过期直接返回；已过期则<strong>返回旧数据</strong>，同时抢锁开异步线程重建缓存。</li>' +
        '<li>优点：永不阻塞，用户体验好。</li>' +
        '<li>缺点：短时间内返回旧数据，一致性弱；实现更复杂（线程池、锁、异常处理）。</li>' +
        '</ul>' +
        '<p><strong>怎么选</strong>：商品详情、店铺信息这类「允许短暂陈旧」的读多写少场景用逻辑过期；库存、余额这类强一致场景用互斥锁或直接查库。</p>' +
        '<p>我项目里把两种都封装进 <code>CacheClient</code>，调用方通过方法名选择：<code>queryWithPassThrough</code>、<code>queryWithLogicalExpire</code>、<code>queryWithMutex</code>。</p>'
    },
    {
      q: '缓存雪崩是什么？和击穿有什么区别？怎么防？',
      star: 5,
      a: '<p><strong>定义</strong>：大量 key 在<em>同一时间</em>过期，或 Redis 整个宕机，导致请求瞬间全部压到 DB。</p>' +
        '<p><strong>与击穿的区别</strong>：击穿是<em>单个热点 key</em>，雪崩是<em>大批 key 或整个缓存层</em>。</p>' +
        '<p><strong>防护</strong>：</p>' +
        '<ul>' +
        '<li><strong>过期时间打散</strong>：基础 TTL 加随机值（如 30 分钟 ± 5 分钟），避免整点集体失效。</li>' +
        '<li><strong>多级缓存</strong>：本地 Caffeine + Redis，Redis 挂了还有本地兜底。</li>' +
        '<li><strong>高可用</strong>：哨兵/Cluster，主从自动切换。</li>' +
        '<li><strong>限流降级</strong>：DB 前加信号量/线程池隔离，或直接返回兜底数据。</li>' +
        '<li><strong>缓存预热</strong>：活动前提前加载热点数据。</li>' +
        '<li><strong>永不过期 + 逻辑过期</strong>：后台异步更新，适合极端热点。</li>' +
        '</ul>' +
        '<p>回答时把「穿透 / 击穿 / 雪崩」三个词的定义一句话分清，面试官会认为你是理解而不是背的。</p>'
    },
    {
      q: '缓存和数据库的一致性怎么保证？为什么是「先删缓存再更新数据库」或「先更新库再删缓存」？',
      star: 5,
      a: '<p>先给结论：<strong>没有绝对强一致，只能最终一致</strong>；常用 Cache-Aside（旁路缓存）。</p>' +
        '<p><strong>四种组合分析</strong>：</p>' +
        '<table><tr><th>顺序</th><th>问题</th></tr>' +
        '<tr><td>先删缓存，再更新 DB</td><td>删完缓存、DB 还没更新时，另一个读请求把<em>旧值</em>回填，导致长期脏数据</td></tr>' +
        '<tr><td>先更新 DB，再删缓存</td><td>推荐。极端并发下仍有小概率脏读（读请求在更新前读旧值、在删缓存后才写回）</td></tr>' +
        '<tr><td>更新 DB，再更新缓存</td><td>并发写会乱序，缓存可能被旧值覆盖；且写多读少时浪费</td></tr>' +
        '<tr><td>删缓存失败</td><td>缓存一直是旧值</td></tr></table>' +
        '<p><strong>工程上的补强</strong>：</p>' +
        '<ul>' +
        '<li><strong>延迟双删</strong>：更新 DB 前删一次，更新后延迟 500ms–1s 再删一次，覆盖读请求回填旧值的窗口。</li>' +
        '<li><strong>订阅 binlog</strong>（Canal）：DB 变更后异步删缓存，业务代码零侵入，可靠性高。</li>' +
        '<li><strong>消息队列</strong>：更新 DB 后发消息删缓存，失败重试。</li>' +
        '<li><strong>缓存 TTL 兜底</strong>：再差也能在过期后自愈。</li>' +
        '<li><strong>读写锁/分布式锁</strong>：强一致场景下串行化，但性能代价大。</li>' +
        '</ul>' +
        '<p>项目里商铺详情是「读多写少 + 允许短暂陈旧」，用的是「更新 DB 后删缓存 + TTL」，没有上 Canal，因为课程项目规模不需要。这样答既真实又知道进阶方案。</p>'
    },
    {
      q: '分布式锁用 SETNX 实现有什么坑？',
      star: 5,
      a: '<p>最小可用版：</p>' +
        '<pre><code>SET lock:order 1 NX PX 30000</code></pre>' +
        '<p>必须<strong>原子地</strong>设置值和过期时间，不能先 <code>SETNX</code> 再 <code>EXPIRE</code>（中间宕机会死锁）。</p>' +
        '<p><strong>四个坑</strong>：</p>' +
        '<ol>' +
        '<li><strong>误删别人的锁</strong>：A 的业务超过 30 秒，锁自动释放，B 拿到锁；A 执行完直接 <code>DEL</code> 把 B 的锁删了。解决：value 存唯一标识（UUID + 线程 ID），删除前用 Lua 比较 value。</li>' +
        '<li><strong>业务没执行完锁就过期</strong>：需要看门狗自动续期（Redisson）。</li>' +
        '<li><strong>主从切换丢锁</strong>：主节点加锁成功但还没同步就挂了，从节点升主，另一个客户端也能加锁。RedLock 试图解决，但争议很大（依赖时钟、性能和正确性难兼顾），生产更推荐用 ZooKeeper/etcd 或接受小概率并做幂等兜底。</li>' +
        '<li><strong>不可重入</strong>：同一线程再次加锁会失败，需要 Hash 记录重入次数（Redisson 已实现）。</li>' +
        '</ol>' +
        '<p><strong>释放锁的 Lua</strong>：</p>' +
        '<pre><code>if redis.call(\'GET\', KEYS[1]) == ARGV[1] then\n  return redis.call(\'DEL\', KEYS[1])\nelse\n  return 0\nend</code></pre>'
    },
    {
      q: 'Redisson 的看门狗机制讲一下？',
      star: 5,
      a: '<p>解决的问题：业务执行时间不确定，锁的过期时间设短了会提前释放，设长了故障时恢复慢。</p>' +
        '<p><strong>机制</strong>：</p>' +
        '<ul>' +
        '<li>加锁成功且<strong>没有显式指定 leaseTime</strong> 时，默认锁过期 30 秒。</li>' +
        '<li>启动一个后台定时任务（<code>TimeTask</code>），每 <code>30/3 = 10</code> 秒检查一次，如果锁还被当前线程持有，就重置为 30 秒。</li>' +
        '<li>客户端宕机后定时任务停止，锁最多 30 秒自动释放，不会永久死锁。</li>' +
        '</ul>' +
        '<p><strong>注意</strong>：</p>' +
        '<ul>' +
        '<li>只有不传 <code>leaseTime</code> 才启用看门狗；<code>lock(10, TimeUnit.SECONDS)</code> 会固定 10 秒过期，不续期。</li>' +
        '<li>看门狗依赖客户端存活，长时间 Full GC 也可能导致续期失败。</li>' +
        '<li>Redisson 还实现了可重入（Hash 结构存线程 ID 和重入次数）、公平锁、读写锁、联锁。</li>' +
        '</ul>'
    },
    {
      q: 'Redis 事务和 Lua 脚本有什么区别？',
      star: 4,
      a: '<table><tr><th></th><th>Redis 事务（MULTI/EXEC）</th><th>Lua 脚本</th></tr>' +
        '<tr><td>原子性</td><td>命令一起执行，但<strong>不保证全成功</strong>：某条命令运行时报错，其他命令仍执行，没有回滚</td><td>整体执行，中途不能插入其他命令；脚本内报错前的写操作仍生效（也不是回滚）</td></tr>' +
        '<tr><td>条件逻辑</td><td>不支持，只能把命令排队</td><td>支持 if/for，可做「判断 + 修改」</td></tr>' +
        '<tr><td>网络开销</td><td>MULTI 入队 + EXEC 两次 RTT（可用 Pipeline 优化）</td><td>一次 RTT</td></tr>' +
        '<tr><td>适用</td><td>简单的批量命令</td><td>库存扣减、分布式锁释放、限流等需要原子判断的场景</td></tr></table>' +
        '<p>关键点：<strong>Redis 事务不支持回滚</strong>，因为它认为命令错误是编程错误，应在开发阶段发现；运行时错误（如对 String 执行 <code>LPUSH</code>）只影响该条命令。</p>' +
        '<p>WATCH 可以实现乐观锁：WATCH key 后如果 key 被改，EXEC 返回 nil。但高并发下重试成本高，不如 Lua。</p>'
    },
    {
      q: 'Pipeline 有什么用？和事务、Lua 的区别？',
      star: 3,
      a: '<p><strong>Pipeline</strong> 把多条命令一次性发送，减少网络 RTT，但<strong>不保证原子性</strong>，中间可能插入其他客户端命令，也不支持条件逻辑。</p>' +
        '<ul>' +
        '<li>适合批量读写、初始化数据、批量删除。</li>' +
        '<li>注意一次不要塞太多命令，否则服务端缓冲区暴涨、阻塞其他请求。建议每批几百条。</li>' +
        '</ul>' +
        '<p>三者定位：Pipeline 解决<em>网络开销</em>；事务解决<em>批量执行的隔离</em>（但不回滚）；Lua 解决<em>原子条件逻辑</em>。</p>'
    },
    {
      q: '什么是 bigkey 和 hotkey？怎么发现、怎么处理？',
      star: 4,
      a: '<p><strong>bigkey</strong>：单个 key 的 value 过大（String &gt; 10KB，集合元素 &gt; 5000）。危害：网络阻塞、删除时阻塞主线程、集群数据倾斜、持久化变慢。</p>' +
        '<ul>' +
        '<li>发现：<code>redis-cli --bigkeys</code>、<code>MEMORY USAGE key</code>、离线分析 RDB。</li>' +
        '<li>处理：拆分（Hash 分桶）、压缩、只取需要的字段（<code>HMGET</code>）、用 <code>UNLINK</code> 异步删除。</li>' +
        '</ul>' +
        '<p><strong>hotkey</strong>：某个 key 被极高并发访问（如秒杀库存）。危害：单分片 CPU 打满、集群倾斜。</p>' +
        '<ul>' +
        '<li>发现：<code>redis-cli --hotkeys</code>（需 LFU 策略）、监控、业务埋点。</li>' +
        '<li>处理：本地缓存、key 分桶（stock:1…stock:10）、读写分离、限流。</li>' +
        '</ul>' +
        '<p>秒杀库存 key 天然是 hotkey，所以我才在它前面加了令牌桶和 Lua，尽量减少打到 Redis 的无效请求。</p>'
    },
    {
      q: 'Redis 内存碎片、阻塞、慢查询怎么排查？',
      star: 3,
      a: '<ul>' +
        '<li><strong>内存碎片</strong>：<code>INFO memory</code> 看 <code>mem_fragmentation_ratio</code>，&gt;1.5 考虑 <code>activedefrag yes</code> 或重启。</li>' +
        '<li><strong>阻塞</strong>：<code>SLOWLOG GET</code> 看慢命令；避免 <code>KEYS *</code>、<code>FLUSHALL</code>、大 key 删除、复杂 Lua；用 <code>UNLINK</code> 替代 <code>DEL</code>。</li>' +
        '<li><strong>连接</strong>：<code>INFO clients</code> 看 <code>connected_clients</code>，连接数暴涨可能是客户端没复用连接池。</li>' +
        '<li><strong>CPU</strong>：<code>INFO commandstats</code> 看命令耗时占比。</li>' +
        '<li><strong>持久化</strong>：fork 耗时、AOF fsync 阻塞，看 <code>latest_fork_usec</code>。</li>' +
        '</ul>'
    }
  ]
});

/* ================= 模块 4：RabbitMQ ================= */
window.MODULES.push({
  id: 'mq',
  order: 4,
  icon: '📨',
  title: 'RabbitMQ 与消息可靠性',
  desc: '秒杀削峰的关键组件。重点不是 API，而是「消息不丢、不重、不积压」这三件事，以及延迟队列、死信队列在订单超时里的应用。',
  tags: ['削峰', 'confirm', '幂等', '死信队列', '延迟队列'],
  items: [
    {
      q: '为什么用消息队列？它带来了什么代价？',
      star: 5,
      a: '<p><strong>三大作用</strong>：</p>' +
        '<ul>' +
        '<li><strong>解耦</strong>：下单后要发短信、加积分、更新报表，都通过消息通知，新增消费者不用改下单代码。</li>' +
        '<li><strong>异步</strong>：非核心链路异步执行，接口响应时间从 500ms 降到 50ms。</li>' +
        '<li><strong>削峰</strong>：秒杀瞬时 1000 QPS 写入 MQ，消费者按 100 QPS 稳定落库，保护数据库。</li>' +
        '</ul>' +
        '<p><strong>代价</strong>（一定要说，体现权衡）：</p>' +
        '<ul>' +
        '<li>系统复杂度上升：消息丢失、重复、积压、顺序都要处理。</li>' +
        '<li>一致性变弱：从同步强一致变成最终一致。</li>' +
        '<li>运维成本：MQ 本身要高可用、监控、告警。</li>' +
        '<li>排查变难：链路变长，需要 traceId 串起来。</li>' +
        '</ul>'
    },
    {
      q: 'RabbitMQ 的核心概念（Exchange / Queue / Binding / RoutingKey / Virtual Host）',
      star: 4,
      a: '<ul>' +
        '<li><strong>Producer</strong>：发消息到 Exchange，不直接发队列。</li>' +
        '<li><strong>Exchange</strong>：交换机，根据类型和 RoutingKey 把消息路由到一个或多个队列。</li>' +
        '<li><strong>Queue</strong>：真正存储消息的地方。</li>' +
        '<li><strong>Binding</strong>：Exchange 与 Queue 之间的绑定规则（可带 BindingKey）。</li>' +
        '<li><strong>RoutingKey</strong>：生产者发送时带的 routing key，交换机据此匹配。</li>' +
        '<li><strong>Virtual Host</strong>：逻辑隔离，不同 vhost 的 Exchange/Queue 互不可见，权限也按 vhost 划分。</li>' +
        '<li><strong>Channel</strong>：复用 TCP 连接上的轻量级会话，大部分操作在 channel 上。</li>' +
        '</ul>' +
        '<p>一条消息的路径：<code>Producer → Exchange --(Binding/RoutingKey)--> Queue → Consumer</code>。</p>'
    },
    {
      q: '四种交换机类型及使用场景？',
      star: 4,
      a: '<table><tr><th>类型</th><th>路由规则</th><th>场景</th></tr>' +
        '<tr><td>Direct</td><td>RoutingKey 完全相等</td><td>点对点、按错误级别分发</td></tr>' +
        '<tr><td>Fanout</td><td>忽略 RoutingKey，广播到所有绑定队列</td><td>广播通知、缓存刷新</td></tr>' +
        '<tr><td>Topic</td><td>通配符匹配：<code>*</code> 一个词，<code>#</code> 零或多个词</td><td>秒杀订单按业务拆分、多消费者订阅</td></tr>' +
        '<tr><td>Headers</td><td>按消息头键值匹配，性能差</td><td>少用，基本被 Topic 替代</td></tr></table>' +
        '<p>例：<code>seckill.order.create</code> 可被 <code>seckill.order.*</code> 和 <code>seckill.#</code> 匹配。项目里用 Topic，方便后续加「积分」「通知」消费者而不改生产者。</p>'
    },
    {
      q: '如何保证消息不丢失？（生产、Broker、消费三段）',
      star: 5,
      a: '<p>这是 MQ 必问题，按链路答：</p>' +
        '<p><strong>① 生产者 → Broker</strong></p>' +
        '<ul>' +
        '<li>开启 <code>publisher-confirm</code>：Broker 收到消息后回调 ack/nack；nack 或超时则重发。</li>' +
        '<li>开启 <code>publisher-return</code>：消息到达 Exchange 但路由不到 Queue 时回调（<code>mandatory=true</code>）。</li>' +
        '<li>本地消息表：业务和消息在同一个本地事务里落库，定时任务扫描未发送/未确认的消息重发。</li>' +
        '</ul>' +
        '<p><strong>② Broker 存储</strong></p>' +
        '<ul>' +
        '<li>Exchange、Queue、Message 都要持久化（<code>durable=true</code>、<code>deliveryMode=2</code>）。</li>' +
        '<li>集群/镜像队列或 Quorum Queue，防止单节点挂掉丢消息。</li>' +
        '</ul>' +
        '<p><strong>③ Broker → 消费者</strong></p>' +
        '<ul>' +
        '<li>关闭自动 ack，改为手动 ack：业务处理成功才 <code>basicAck</code>。</li>' +
        '<li>处理失败 <code>basicNack(requeue=false)</code> 进死信队列，配合重试和告警；不要无限 requeue。</li>' +
        '<li>消费者宕机未 ack 的消息会重新投递（可能重复，需幂等）。</li>' +
        '</ul>' +
        '<blockquote class="tip">一句话总结：「生产端 confirm + 存储端持久化 + 消费端手动 ack，三段都做到，才是至少一次投递；要做到不丢，还得加上本地消息表和监控。」</blockquote>'
    },
    {
      q: 'publisher-confirm 和 publisher-return 的区别？',
      star: 4,
      a: '<table><tr><th></th><th>confirm</th><th>return</th></tr>' +
        '<tr><td>触发时机</td><td>消息到达 Exchange 后</td><td>消息到达 Exchange，但<strong>没有队列可路由</strong>时</td></tr>' +
        '<tr><td>回调内容</td><td>ack/nack + 消息 ID</td><td>消息体、replyCode、replyText、exchange、routingKey</td></tr>' +
        '<tr><td>前提</td><td>开启 <code>publisher-confirm-type: correlated</code></td><td>开启 <code>publisher-returns: true</code> 且 <code>mandatory=true</code></td></tr>' +
        '<tr><td>解决</td><td>Broker 是否收到</td><td>收到了但路由失败（比如 RoutingKey 写错、队列没绑定）</td></tr></table>' +
        '<p>两者互补：confirm 只能证明 Exchange 收到了，不能证明消息进了队列，所以必须配合 return。生产上通常用 <code>CorrelationData</code> 关联消息，失败落库重发。</p>'
    },
    {
      q: '消息的持久化是怎么做的？只设置 durable 就够吗？',
      star: 4,
      a: '<p>不够，要<strong>三处都持久化</strong>：</p>' +
        '<ol>' +
        '<li><strong>Exchange</strong>：声明时 <code>durable=true</code>。</li>' +
        '<li><strong>Queue</strong>：声明时 <code>durable=true</code>。</li>' +
        '<li><strong>Message</strong>：发送时 <code>deliveryMode=2</code>（持久化消息）。</li>' +
        '</ol>' +
        '<p>少了任何一处，重启后都可能丢：队列不持久化，重启队列没了；消息不持久化，队列在但消息没了。</p>' +
        '<p>另外，持久化消息写入磁盘前 RabbitMQ 可能先放内存，要真正落盘还需配合 <code>publisher-confirm</code> 等待确认；对可靠性要求极高时可用 Quorum Queue（Raft 复制）。</p>'
    },
    {
      q: '自动 ack 和手动 ack 怎么选？requeue 有什么坑？',
      star: 4,
      a: '<p><strong>自动 ack</strong>：消息投递给消费者就立刻确认，不管业务是否成功。性能好，但消费者处理失败/宕机会丢消息。<strong>只适合允许丢的场景</strong>（日志、埋点）。</p>' +
        '<p><strong>手动 ack</strong>：业务成功后调用 <code>basicAck</code>；失败调用 <code>basicNack</code>。</p>' +
        '<ul>' +
        '<li><code>requeue=true</code>：消息重新入队，可能立刻又被同一个消费者拿到，形成<strong>死循环</strong>，打满 CPU。</li>' +
        '<li><code>requeue=false</code>：丢弃或进死信队列（配置了 DLX），推荐配合有限重试。</li>' +
        '</ul>' +
        '<p><strong>推荐做法</strong>：业务异常记录日志 + <code>basicNack(requeue=false)</code> 进死信；如果是临时故障（DB 连接超时），可以用延迟队列重试 3 次，仍失败再进死信并告警。</p>' +
        '<p>还要注意 <strong>ack 丢失</strong>：业务成功但 ack 前消费者宕机，消息会重投 → 必须幂等。</p>'
    },
    {
      q: '死信队列是什么？消息什么时候会变成死信？',
      star: 5,
      a: '<p>死信（Dead Letter）是<strong>无法被正常消费</strong>的消息，会被投递到配置的 DLX（死信交换机），再路由到死信队列。</p>' +
        '<p><strong>三种来源</strong>：</p>' +
        '<ol>' +
        '<li>消费者 <code>basicNack/basicReject</code> 且 <code>requeue=false</code>。</li>' +
        '<li>消息 TTL 过期。</li>' +
        '<li>队列达到最大长度（<code>x-max-length</code>）被丢弃/转死信。</li>' +
        '</ol>' +
        '<p><strong>项目里的用途</strong>：</p>' +
        '<ul>' +
        '<li>消费失败的消息进死信，人工/定时任务排查，避免无限重试打爆队列。</li>' +
        '<li>配合 TTL 做延迟队列，实现订单 15 分钟未支付自动取消。</li>' +
        '<li>死信队列也是「消息不丢」的最后一道兜底，必须监控深度并告警。</li>' +
        '</ul>' +
        '<pre><code>// 声明业务队列时绑定死信交换机\nMap&lt;String, Object&gt; args = new HashMap&lt;&gt;();\nargs.put("x-dead-letter-exchange", "dlx.exchange");\nargs.put("x-dead-letter-routing-key", "dlx.order");\nargs.put("x-message-ttl", 15 * 60 * 1000);  // 15 分钟\nchannel.queueDeclare("order.queue", true, false, false, args);</code></pre>'
    },
    {
      q: '延迟队列怎么实现？TTL + 死信有什么坑？',
      star: 5,
      a: '<p><strong>三种实现</strong>：</p>' +
        '<ol>' +
        '<li><strong>TTL + DLX</strong>：消息设 TTL，过期后进死信队列，消费者处理。无需插件。</li>' +
        '<li><strong>延迟插件</strong>：<code>rabbitmq-delayed-message-exchange</code>，声明 <code>x-delayed-type</code>，发送时设 <code>x-delay</code>，最方便。</li>' +
        '<li><strong>定时任务扫表</strong>：兜底方案，精度低但可靠。</li>' +
        '</ol>' +
        '<p><strong>TTL + DLX 的坑（高频）</strong>：</p>' +
        '<blockquote class="warn">RabbitMQ 队列是 FIFO，只会检查<strong>队头</strong>消息是否过期。如果先发 TTL 30 分钟的消息、再发 TTL 5 分钟的消息，后者会被前者堵住，直到 30 分钟才过期——这就是<strong>队头阻塞</strong>。</blockquote>' +
        '<p>解决：</p>' +
        '<ul>' +
        '<li>不同延迟时间用不同队列（每档一个 TTL），互不影响。</li>' +
        '<li>用延迟插件，按消息级别延迟，没有队头阻塞。</li>' +
        '<li>用 Redis ZSet 延迟队列。</li>' +
        '</ul>' +
        '<p>订单取消场景还要注意：消费延迟消息时先查订单状态，已支付就跳过，避免误取消。</p>'
    },
    {
      q: '消息积压怎么处理？（消费者、生产者、队列三个角度）',
      star: 5,
      a: '<p>先定位：是<strong>生产突增</strong>、<strong>消费变慢</strong>，还是<strong>消费者挂了</strong>。</p>' +
        '<p><strong>消费端</strong>：</p>' +
        '<ul>' +
        '<li>扩容消费者实例、提高 <code>concurrency</code> 和 <code>prefetch</code>（注意 prefetch 太大会导致消息分配不均、内存上涨）。</li>' +
        '<li>批量消费 + 批量写库，减少 DB 往返。</li>' +
        '<li>把非核心逻辑（发短信、加积分）异步化或降级。</li>' +
        '<li>优化慢 SQL、加索引、避免在消费线程里做远程调用。</li>' +
        '</ul>' +
        '<p><strong>消息端</strong>：</p>' +
        '<ul>' +
        '<li>毒消息（反复失败）转移进死信队列，先恢复主链路。</li>' +
        '<li>临时把积压消息转存到新队列/数据库，起临时消费者快速消费。</li>' +
        '<li>设置队列最大长度，防止内存/磁盘打满。</li>' +
        '</ul>' +
        '<p><strong>预防</strong>：监控队列深度、消费速率、消费者存活；设置告警阈值；大促前压测消费能力。</p>'
    },
    {
      q: 'RabbitMQ 能保证消息顺序吗？',
      star: 4,
      a: '<p>默认<strong>不能跨队列/跨消费者</strong>保证。原因：</p>' +
        '<ul>' +
        '<li>一个队列多个消费者时，消息轮询投递，消费完成顺序不确定。</li>' +
        '<li>失败重试、requeue 会打乱顺序。</li>' +
        '<li>集群/镜像队列切换也可能乱序。</li>' +
        '</ul>' +
        '<p><strong>怎么保证</strong>：</p>' +
        '<ul>' +
        '<li>同一业务 key（如 orderId）路由到同一队列（一致性哈希 / 按 key 分队列）。</li>' +
        '<li>该队列只用一个消费者（并发为 1），牺牲吞吐。</li>' +
        '<li>业务层用状态机/版本号处理乱序，比如订单状态只允许单向流转。</li>' +
        '</ul>' +
        '<p>秒杀场景其实<strong>不需要严格顺序</strong>：每个订单独立，靠唯一索引和状态机保证正确性。只有「创建订单 → 支付 → 取消」这类同一订单的事件才需要顺序。</p>'
    },
    {
      q: 'prefetch（QoS）是什么？设置多少合适？',
      star: 4,
      a: '<p><code>basicQos(prefetchCount)</code> 限制<strong>每个消费者未 ack 的消息数量</strong>。默认不限（0），会把队列里的消息一次性推给消费者，导致内存暴涨、负载不均。</p>' +
        '<ul>' +
        '<li>设太小（如 1）：吞吐低，消费者等 ack 才拿下一批。</li>' +
        '<li>设太大：某个消费者积压大量未处理消息，其他消费者空闲。</li>' +
        '</ul>' +
        '<p>经验值：从 10–50 开始压测调整；消费耗时长的设小，耗时短的设大。Spring Boot 里：</p>' +
        '<pre><code>spring.rabbitmq.listener.simple.prefetch=20\nspring.rabbitmq.listener.simple.concurrency=5\nspring.rabbitmq.listener.simple.max-concurrency=10</code></pre>' +
        '<p>注意 prefetch 是<strong>每个 consumer</strong> 的，不是每个 channel 的总和。</p>'
    },
    {
      q: 'RabbitMQ 和 Kafka 怎么选？',
      star: 4,
      a: '<table><tr><th>维度</th><th>RabbitMQ</th><th>Kafka</th></tr>' +
        '<tr><td>模型</td><td>Broker 推，Exchange 路由灵活</td><td>消费者拉，分区日志</td></tr>' +
        '<tr><td>吞吐</td><td>万级～十万级</td><td>百万级</td></tr>' +
        '<tr><td>延迟</td><td>毫秒级</td><td>毫秒～几十毫秒（批量）</td></tr>' +
        '<tr><td>顺序</td><td>队列内近似有序，多消费者会乱</td><td>分区内严格有序</td></tr>' +
        '<tr><td>重复消费</td><td>ack 机制，可能重复</td><td>offset 可重放，天然支持</td></tr>' +
        '<tr><td>场景</td><td>业务消息、削峰、延迟任务</td><td>日志、埋点、流处理、大数据管道</td></tr></table>' +
        '<p>话术：「业务消息要低延迟、可靠路由、死信/延迟能力，选 RabbitMQ；日志和流式数据要超高吞吐、可回放，选 Kafka。我们秒杀是业务消息，所以 RabbitMQ 更合适。」</p>'
    },
    {
      q: 'RabbitMQ 集群模式有哪几种？镜像队列和 Quorum Queue 的区别？',
      star: 3,
      a: '<ul>' +
        '<li><strong>普通集群</strong>：只同步元数据（队列、交换机定义），消息只存在创建它的节点。消费者连到其他节点会转发，节点挂了消息就丢。只提升吞吐，不提升可用性。</li>' +
        '<li><strong>镜像队列</strong>：队列内容复制到多个节点，主节点挂从节点接管。经典方案，但同步是异步的，可能丢消息；网络分区时脑裂。</li>' +
        '<li><strong>Quorum Queue</strong>（3.8+）：基于 Raft，多数派确认才算写入，强一致、抗脑裂，是官方推荐的替代方案。代价是吞吐略低、不支持部分特性（如优先级队列）。</li>' +
        '</ul>' +
        '<p>项目是单机 Docker，没上集群；如果生产部署，我会用 3 节点 + Quorum Queue。</p>'
    },
    {
      q: '消息队列如何做监控和告警？',
      star: 3,
      a: '<ul>' +
        '<li><strong>队列深度</strong>：<code>messages_ready</code> 持续增长说明消费跟不上。</li>' +
        '<li><strong>未确认消息</strong>：<code>messages_unacknowledged</code> 高说明消费者卡住。</li>' +
        '<li><strong>消费速率 / 投递速率</strong>：对比生产与消费速度。</li>' +
        '<li><strong>连接与 channel 数</strong>：泄漏会耗尽资源。</li>' +
        '<li><strong>死信队列深度</strong>：非零就该排查。</li>' +
        '</ul>' +
        '<p>方案：RabbitMQ Management 插件看面板，Prometheus + <code>rabbitmq_exporter</code> + Grafana 做趋势和告警；日志里带 traceId 串联生产/消费。</p>'
    }
  ]
});
