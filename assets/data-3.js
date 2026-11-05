window.MODULES = window.MODULES || [];

/* ================= 模块 5：MySQL ================= */
window.MODULES.push({
  id: 'mysql',
  order: 5,
  icon: '🗄️',
  title: 'MySQL 索引、事务与锁',
  desc: '简历写了「熟悉索引、事务、锁、MVCC」。这一章按面试真实追问顺序整理：B+ 树 → 回表 → 最左前缀 → 隔离级别 → MVCC → 锁 → 慢 SQL 优化。',
  tags: ['B+树', 'MVCC', '事务', '索引优化', '锁'],
  items: [
    {
      q: '为什么 MySQL 索引用 B+ 树，不用 B 树、红黑树、哈希？',
      star: 5,
      a: '<table><tr><th>结构</th><th>为什么不用</th></tr>' +
        '<tr><td>哈希</td><td>等值查询 O(1)，但不支持范围查询、排序、最左前缀，哈希冲突要遍历</td></tr>' +
        '<tr><td>二叉搜索树/红黑树</td><td>树高 O(log n)，100 万数据约 20 层，每层一次磁盘 I/O，太慢</td></tr>' +
        '<tr><td>B 树</td><td>非叶子节点也存数据，同样磁盘页能放的索引项更少，树更高；范围查询要中序遍历，跨层跳转</td></tr>' +
        '<tr><td>B+ 树</td><td>非叶子只存索引，扇出大（一页 16KB 可放上千 key），3–4 层能存千万级；叶子节点用双向链表相连，范围查询和排序高效；数据都在叶子，查询稳定</td></tr></table>' +
        '<p><strong>扇出计算</strong>：InnoDB 页 16KB，假设主键 bigint 8B + 指针 6B，一个非叶子节点约存 1170 个索引；叶子节点假设一行 1KB，能存 16 行。三层 B+ 树约 <code>1170 × 1170 × 16 ≈ 2190 万</code> 行。所以通常 3 次 I/O 就能定位。</p>' +
        '<p>补一句：「B+ 树把<strong>磁盘 I/O 次数</strong>压到最低，这是它胜出的根本原因，不是单纯因为『矮』。」</p>'
    },
    {
      q: '聚簇索引和二级索引有什么区别？什么是回表？',
      star: 5,
      a: '<p><strong>聚簇索引</strong>：InnoDB 的主键索引，叶子节点直接存<strong>整行数据</strong>。一张表只有一个聚簇索引。</p>' +
        '<p><strong>二级索引（辅助索引）</strong>：叶子节点存的是<strong>索引列 + 主键值</strong>，不是整行。</p>' +
        '<p><strong>回表</strong>：通过二级索引找到主键后，再拿主键去聚簇索引查整行。相当于两棵 B+ 树各走一次。</p>' +
        '<pre><code>-- id 主键，name 普通索引\nSELECT * FROM user WHERE name = \'张三\';\n-- 1. 走 name 二级索引，找到 id=18\n-- 2. 拿 id=18 回聚簇索引取整行  ← 回表</code></pre>' +
        '<p><strong>怎么减少回表</strong>：</p>' +
        '<ul>' +
        '<li>覆盖索引：查询字段都在索引里，不用回表。</li>' +
        '<li>把常用查询字段放进联合索引，或使用索引条件下推。</li>' +
        '<li>避免 <code>SELECT *</code>。</li>' +
        '</ul>' +
        '<p><strong>没有主键怎么办</strong>：InnoDB 会选第一个非空唯一索引；都没有就生成 6 字节的隐藏 <code>row_id</code>。所以建表必须显式主键，且推荐自增（顺序写入，减少页分裂）。</p>'
    },
    {
      q: '什么是覆盖索引？怎么判断用上了？',
      star: 5,
      a: '<p>查询的所有列都能从索引里拿到，不需要回表，叫覆盖索引。</p>' +
        '<pre><code>-- 联合索引 idx_name_age (name, age)\nSELECT name, age FROM user WHERE name = \'张三\';  -- 覆盖索引\nSELECT id, name FROM user WHERE name = \'张三\';    -- 也覆盖：二级索引叶子有主键\nSELECT * FROM user WHERE name = \'张三\';           -- 回表</code></pre>' +
        '<p><code>EXPLAIN</code> 里看 <code>Extra: Using index</code>，就表示覆盖索引；如果是 <code>Using where; Using index</code>，表示索引用于过滤且覆盖；出现 <code>Using filesort</code>、<code>Using temporary</code> 要警惕。</p>' +
        '<blockquote class="tip">加分：覆盖索引不仅减少 I/O，还能避免回表时读到不一致的数据（同一事务内），但它会增加索引体积和写成本，字段不能无限往索引里塞。</blockquote>'
    },
    {
      q: '最左前缀原则是什么？联合索引 (a,b,c) 哪些查询能走索引？',
      star: 5,
      a: '<p>联合索引按定义顺序<strong>逐列排序</strong>，所以查询条件必须从最左列开始、且不跳过中间列，才能充分利用索引。</p>' +
        '<p>索引 <code>idx(a, b, c)</code>：</p>' +
        '<table><tr><th>查询条件</th><th>索引使用情况</th></tr>' +
        '<tr><td><code>a=1</code></td><td>用 a</td></tr>' +
        '<tr><td><code>a=1 AND b=2</code></td><td>用 a、b</td></tr>' +
        '<tr><td><code>a=1 AND b=2 AND c=3</code></td><td>全用</td></tr>' +
        '<tr><td><code>b=2</code></td><td>不用（跳过 a）</td></tr>' +
        '<tr><td><code>a=1 AND c=3</code></td><td>用 a，c 只能过滤（5.6+ 索引下推可在索引层过滤）</td></tr>' +
        '<tr><td><code>a=1 AND b&gt;2 AND c=3</code></td><td>用 a、b；c 因范围查询后面的列失效</td></tr>' +
        '<tr><td><code>a LIKE \'%x\'</code></td><td>不用（前缀模糊）</td></tr>' +
        '<tr><td><code>a=1 ORDER BY b</code></td><td>用 a 过滤 + b 排序，避免 filesort</td></tr></table>' +
        '<p><strong>为什么范围查询后面的列失效</strong>：B+ 树在 a 确定、b 是范围时，c 在整体上并不是有序的（只在每个 b 值内有序），无法继续二分。</p>' +
        '<p><strong>索引下推（ICP）</strong>：5.6+ 把 <code>c=3</code> 条件下推到索引遍历时判断，减少回表次数，Extra 显示 <code>Using index condition</code>。</p>'
    },
    {
      q: '哪些情况会导致索引失效？',
      star: 5,
      a: '<p>按高频顺序背：</p>' +
        '<ol>' +
        '<li><strong>左模糊/全模糊</strong>：<code>LIKE \'%张\'</code>。右模糊 <code>LIKE \'张%\'</code> 可以走。</li>' +
        '<li><strong>索引列做函数/运算</strong>：<code>WHERE DATE(create_time) = \'2026-01-01\'</code>、<code>WHERE id + 1 = 10</code>。改成范围查询。</li>' +
        '<li><strong>隐式类型转换</strong>：<code>phone</code> 是 varchar，却写 <code>WHERE phone = 13800000000</code>，等价于对列做 <code>CAST</code>。</li>' +
        '<li><strong>OR 连接非索引列</strong>：<code>WHERE a=1 OR b=2</code>，b 没索引则全表扫。</li>' +
        '<li><strong>不满足最左前缀</strong>：联合索引跳过最左列。</li>' +
        '<li><strong>范围条件后的列</strong>：<code>a=1 AND b&gt;2 AND c=3</code>，c 用不上。</li>' +
        '<li><strong>!= / NOT IN / IS NOT NULL</strong>：可能全表扫（取决于优化器成本）。</li>' +
        '<li><strong>字符集/排序规则不一致</strong>：join 两表字符集不同，索引失效。</li>' +
        '<li><strong>优化器认为全表扫更快</strong>：表很小、或区分度极低（如性别），走索引反而慢。</li>' +
        '</ol>' +
        '<p>回答时补一句：「是否走索引最终由优化器按成本决定，<code>EXPLAIN</code> 才是准的，不能只背规则。」</p>'
    },
    {
      q: '联合索引的列顺序怎么设计？',
      star: 4,
      a: '<p>三条原则：</p>' +
        '<ul>' +
        '<li><strong>等值查询列放前面，范围查询列放后面</strong>：范围列后面的列无法继续用索引。</li>' +
        '<li><strong>区分度高的列放前面</strong>：能更快缩小扫描范围（但也要结合查询模式）。</li>' +
        '<li><strong>覆盖高频查询</strong>：把 SELECT 的列加进索引，做成覆盖索引，减少回表。</li>' +
        '</ul>' +
        '<p>例：订单表常用 <code>WHERE user_id=? AND status=? ORDER BY create_time DESC</code>，可以建 <code>(user_id, status, create_time)</code>。</p>' +
        '<p><strong>不要滥用</strong>：索引越多，写入越慢、占用空间越大；低区分度列（性别、状态只有几种）单独建索引意义不大。一般单表索引控制在 5 个以内。</p>'
    },
    {
      q: 'EXPLAIN 你会重点看哪些字段？',
      star: 5,
      a: '<table><tr><th>字段</th><th>关注点</th></tr>' +
        '<tr><td><code>type</code></td><td>访问类型，性能从好到差：<code>system &gt; const &gt; eq_ref &gt; ref &gt; range &gt; index &gt; ALL</code>。出现 ALL 要警惕</td></tr>' +
        '<tr><td><code>key</code></td><td>实际使用的索引；为 NULL 说明没走索引</td></tr>' +
        '<tr><td><code>key_len</code></td><td>用到的索引字节数，可判断联合索引用了几列</td></tr>' +
        '<tr><td><code>rows</code></td><td>预估扫描行数，越小越好</td></tr>' +
        '<tr><td><code>filtered</code></td><td>按条件过滤后剩余行的百分比</td></tr>' +
        '<tr><td><code>Extra</code></td><td><code>Using index</code> 覆盖索引；<code>Using index condition</code> 索引下推；<code>Using filesort</code> 额外排序；<code>Using temporary</code> 临时表；<code>Using join buffer</code> 被驱动表没索引</td></tr></table>' +
        '<p>进阶：<code>EXPLAIN ANALYZE</code>（8.0.18+）给出实际执行时间和行数，比预估更准；<code>SHOW WARNINGS</code> 看优化器改写后的 SQL。</p>'
    },
    {
      q: '事务的 ACID 是怎么实现的？',
      star: 5,
      a: '<table><tr><th>特性</th><th>实现机制</th></tr>' +
        '<tr><td><strong>A 原子性</strong></td><td>undo log：记录反向操作，回滚时恢复</td></tr>' +
        '<tr><td><strong>C 一致性</strong></td><td>目的，由 A/I/D 共同保证 + 业务约束（唯一索引、外键、CHECK）</td></tr>' +
        '<tr><td><strong>I 隔离性</strong></td><td>MVCC（快照读）+ 锁（当前读）</td></tr>' +
        '<tr><td><strong>D 持久性</strong></td><td>redo log：先写日志再刷盘（WAL），崩溃后重放</td></tr></table>' +
        '<p>关键理解：</p>' +
        '<ul>' +
        '<li><strong>undo log 是逻辑日志</strong>，记录「把 id=1 的 name 改回张三」，用于回滚和 MVCC 版本链。</li>' +
        '<li><strong>redo log 是物理日志</strong>，记录「在某个页的某个偏移写入什么」，循环写，保证崩溃恢复。</li>' +
        '<li><strong>binlog 是 Server 层日志</strong>，记录 SQL 或行变更，用于主从复制和数据恢复，追加写。</li>' +
        '</ul>'
    },
    {
      q: '四种隔离级别分别解决什么问题？MySQL 默认是哪个？',
      star: 5,
      a: '<table><tr><th>级别</th><th>脏读</th><th>不可重复读</th><th>幻读</th></tr>' +
        '<tr><td>读未提交 RU</td><td>可能</td><td>可能</td><td>可能</td></tr>' +
        '<tr><td>读已提交 RC</td><td>解决</td><td>可能</td><td>可能</td></tr>' +
        '<tr><td>可重复读 RR</td><td>解决</td><td>解决</td><td>基本解决（MVCC + 间隙锁）</td></tr>' +
        '<tr><td>串行化</td><td>解决</td><td>解决</td><td>解决</td></tr></table>' +
        '<p><strong>MySQL InnoDB 默认 RR</strong>（<code>REPEATABLE-READ</code>），而 Oracle/PostgreSQL 默认 RC。</p>' +
        '<p><strong>三个现象</strong>：</p>' +
        '<ul>' +
        '<li><strong>脏读</strong>：读到别的事务未提交的数据。</li>' +
        '<li><strong>不可重复读</strong>：同一事务两次读同一行，结果不同（别人改了/删了）。</li>' +
        '<li><strong>幻读</strong>：同一事务两次范围查询，行数变多（别人插入了）。</li>' +
        '</ul>' +
        '<p><strong>RR 下幻读被「基本解决」</strong>：快照读靠 MVCC 一致性视图；当前读靠 Next-Key Lock（记录锁 + 间隙锁）。但同一事务里「先快照读、再当前读」仍可能看到新插入的行，所以是「基本」。</p>'
    },
    {
      q: 'MVCC 的原理是什么？undo 版本链、ReadView 讲清楚',
      star: 5,
      a: '<p><strong>MVCC（多版本并发控制）</strong>让读写不互相阻塞：读操作读快照，写操作写新版本。</p>' +
        '<p><strong>三个组成部分</strong>：</p>' +
        '<ol>' +
        '<li><strong>隐藏字段</strong>：每行有 <code>DB_TRX_ID</code>（最后修改它的事务 ID）、<code>DB_ROLL_PTR</code>（指向 undo log 的指针）。</li>' +
        '<li><strong>undo 版本链</strong>：每次修改生成一条 undo 记录，通过 <code>roll_ptr</code> 串成链表，越老版本越靠后。</li>' +
        '<li><strong>ReadView</strong>：事务快照读时生成，包含：<ul>' +
        '<li><code>m_ids</code>：当前活跃（未提交）事务 ID 列表。</li>' +
        '<li><code>min_trx_id</code>：活跃事务最小 ID。</li>' +
        '<li><code>max_trx_id</code>：下一个要分配的事务 ID。</li>' +
        '<li><code>creator_trx_id</code>：创建该 ReadView 的事务 ID。</li></ul></li>' +
        '</ol>' +
        '<p><strong>可见性判断</strong>（沿版本链找第一个可见版本）：</p>' +
        '<ul>' +
        '<li>版本事务 ID == 自己 → 可见。</li>' +
        '<li>版本事务 ID &lt; <code>min_trx_id</code> → 已提交，可见。</li>' +
        '<li>版本事务 ID ≥ <code>max_trx_id</code> → 快照之后才开启，不可见。</li>' +
        '<li>在 <code>[min, max)</code> 之间：在 <code>m_ids</code> 里说明还没提交 → 不可见；不在 → 已提交，可见。</li>' +
        '</ul>' +
        '<p><strong>RC 与 RR 的区别</strong>：RC 每次 SELECT 都生成新 ReadView（能读到别人新提交的）；RR 只在事务第一次 SELECT 时生成，之后复用（可重复读）。</p>'
    },
    {
      q: 'redo log、undo log、binlog 的区别？为什么需要两阶段提交？',
      star: 5,
      a: '<table><tr><th></th><th>redo log</th><th>undo log</th><th>binlog</th></tr>' +
        '<tr><td>层级</td><td>InnoDB 引擎</td><td>InnoDB 引擎</td><td>MySQL Server</td></tr>' +
        '<tr><td>类型</td><td>物理日志（页 + 偏移）</td><td>逻辑日志（反向 SQL）</td><td>逻辑日志（SQL/行变更）</td></tr>' +
        '<tr><td>作用</td><td>崩溃恢复、持久性</td><td>回滚、MVCC</td><td>主从复制、备份恢复</td></tr>' +
        '<tr><td>写入</td><td>循环写，固定大小</td><td>随事务增长，purge 清理</td><td>追加写，可长期保留</td></tr></table>' +
        '<p><strong>两阶段提交</strong>解决 redo log 和 binlog 的一致性问题：</p>' +
        '<ol>' +
        '<li><strong>prepare</strong>：写 redo log，标记为 prepare 状态。</li>' +
        '<li><strong>commit</strong>：写 binlog，再把 redo log 标记为 commit。</li>' +
        '</ol>' +
        '<p><strong>为什么需要</strong>：如果只写其中一个就崩溃，会出现「主库有数据、从库没有」或「从库有、主库没有」。崩溃恢复时：</p>' +
        '<ul>' +
        '<li>redo 是 prepare 且 binlog 完整 → 提交。</li>' +
        '<li>redo 是 prepare 但 binlog 不完整 → 回滚。</li>' +
        '</ul>' +
        '<p>参数 <code>innodb_flush_log_at_trx_commit=1</code> + <code>sync_binlog=1</code> 是「双 1」配置，最安全但性能最低。</p>'
    },
    {
      q: 'InnoDB 有哪些锁？记录锁、间隙锁、临键锁的区别？',
      star: 5,
      a: '<p><strong>按粒度</strong>：表锁、行锁、意向锁（IS/IX，表级，用来快速判断表里是否有行锁）。</p>' +
        '<p><strong>行锁三种形态</strong>：</p>' +
        '<ul>' +
        '<li><strong>Record Lock 记录锁</strong>：锁住某一条索引记录。</li>' +
        '<li><strong>Gap Lock 间隙锁</strong>：锁住两个索引值之间的「空隙」，防止插入，<em>只在不唯一索引的范围查询/等值查询不存在时产生</em>。</li>' +
        '<li><strong>Next-Key Lock 临键锁</strong>：记录锁 + 前面的间隙锁，左开右闭 <code>(a, b]</code>，RR 下默认。</li>' +
        '</ul>' +
        '<p><strong>加锁规则（简化版）</strong>：</p>' +
        '<ul>' +
        '<li>唯一索引等值命中 → 记录锁。</li>' +
        '<li>唯一索引等值未命中 → 间隙锁。</li>' +
        '<li>非唯一索引等值 → 临键锁 + 向后扫描到第一个不满足的值。</li>' +
        '<li>范围查询 → 临键锁。</li>' +
        '</ul>' +
        '<p><strong>RC 与 RR 的锁差异</strong>：RC 基本不用间隙锁（所以有幻读），RR 用间隙锁防幻读。这也是很多互联网业务用 RC 的原因——减少锁冲突，但要在业务层处理幻读。</p>' +
        '<p><strong>insert 加锁</strong>：插入时加<strong>插入意向锁</strong>，如果间隙被其他事务的 Gap Lock 占用，会等待。</p>'
    },
    {
      q: '什么是幻读？InnoDB 怎么解决？',
      star: 4,
      a: '<p><strong>幻读</strong>：同一事务内，同样的范围查询执行两次，第二次多出了别人插入的行。</p>' +
        '<p>注意与不可重复读的区别：不可重复读针对<em>同一行</em>的修改，幻读针对<em>结果集行数</em>的变化。</p>' +
        '<p><strong>解决</strong>：</p>' +
        '<ul>' +
        '<li><strong>快照读</strong>（普通 SELECT）：MVCC，读事务开始时的 ReadView，看不到新插入的行。</li>' +
        '<li><strong>当前读</strong>（<code>SELECT ... FOR UPDATE</code>、<code>UPDATE</code>、<code>DELETE</code>）：Next-Key Lock 锁住范围，阻止其他事务在间隙插入。</li>' +
        '</ul>' +
        '<p><strong>为什么说「基本解决」</strong>：RR 下先快照读、再当前读，当前读会看到最新数据，出现「前后不一致」。严格串行化才能完全避免。</p>'
    },
    {
      q: '死锁是怎么产生的？怎么排查和避免？',
      star: 4,
      a: '<p><strong>产生条件</strong>：互斥、占有且等待、不可剥夺、循环等待。数据库死锁常见于两个事务以相反顺序锁多行：</p>' +
        '<pre><code>事务 A: UPDATE t SET ... WHERE id = 1;  -- 锁 1\n事务 B: UPDATE t SET ... WHERE id = 2;  -- 锁 2\n事务 A: UPDATE t SET ... WHERE id = 2;  -- 等 B\n事务 B: UPDATE t SET ... WHERE id = 1;  -- 等 A → 死锁</code></pre>' +
        '<p><strong>排查</strong>：</p>' +
        '<ul>' +
        '<li><code>SHOW ENGINE INNODB STATUS</code> 看 <code>LATEST DETECTED DEADLOCK</code>，能看到两个事务的 SQL、持有的锁、等待的锁。</li>' +
        '<li><code>information_schema.INNODB_TRX</code>、<code>performance_schema.data_locks</code> 看当前事务和锁。</li>' +
        '</ul>' +
        '<p><strong>避免</strong>：</p>' +
        '<ul>' +
        '<li>按<strong>固定顺序</strong>访问多行/多表。</li>' +
        '<li>事务尽量短，减少持锁时间，不要在事务里做远程调用。</li>' +
        '<li>合理使用索引，避免锁范围扩大（没索引会锁很多行甚至全表）。</li>' +
        '<li>降低隔离级别到 RC，减少间隙锁。</li>' +
        '<li>业务层重试（死锁是正常现象，InnoDB 会自动回滚代价小的事务）。</li>' +
        '</ul>'
    },
    {
      q: '乐观锁和悲观锁的区别？项目里怎么用的？',
      star: 4,
      a: '<p><strong>悲观锁</strong>：假设一定会冲突，先加锁再操作。数据库层面 <code>SELECT ... FOR UPDATE</code>，Java 里 <code>synchronized</code>、<code>ReentrantLock</code>。适合写多、冲突多的场景，但会阻塞、可能死锁。</p>' +
        '<p><strong>乐观锁</strong>：假设冲突少，不加锁，提交时检查版本。实现：</p>' +
        '<ul>' +
        '<li>版本号：<code>UPDATE ... SET stock=stock-1, version=version+1 WHERE id=? AND version=?</code>，失败重试。</li>' +
        '<li>CAS 条件：<code>UPDATE ... SET stock=stock-1 WHERE id=? AND stock &gt; 0</code>，用业务条件代替版本号。</li>' +
        '</ul>' +
        '<p>项目里秒杀扣库存用的就是第二种：<strong>把「判断库存 &gt; 0」和「扣减」合并成一条 SQL</strong>，靠 InnoDB 行锁保证原子，不需要额外版本字段，也不会阻塞等待。</p>' +
        '<p>注意：乐观锁在冲突极高时重试次数多，反而更慢；这时悲观锁或串行化更合适。没有银弹。</p>'
    },
    {
      q: '一条慢 SQL 你怎么优化？完整流程',
      star: 5,
      a: '<p>按「定位 → 分析 → 改 SQL/索引 → 验证 → 兜底」回答：</p>' +
        '<ol>' +
        '<li><strong>定位</strong>：慢查询日志（<code>slow_query_log</code>、<code>long_query_time</code>）、<code>performance_schema</code>、APM。</li>' +
        '<li><strong>分析</strong>：<code>EXPLAIN</code> 看 type、key、rows、Extra；<code>EXPLAIN ANALYZE</code> 看真实耗时。</li>' +
        '<li><strong>常见手段</strong>：<ul>' +
        '<li>加合适索引 / 联合索引 / 覆盖索引。</li>' +
        '<li>改写 SQL：避免函数、隐式转换、<code>SELECT *</code>、大 <code>IN</code>、<code>OR</code>。</li>' +
        '<li>深分页改游标（<code>WHERE id &gt; last_id LIMIT 20</code>）。</li>' +
        '<li>大事务拆小，减少锁持有时间。</li>' +
        '<li>分页/分批处理，避免一次查太多。</li>' +
        '<li>读写分离、热点数据缓存。</li></ul></li>' +
        '<li><strong>验证</strong>：对比优化前后执行时间、扫描行数、QPS。</li>' +
        '<li><strong>兜底</strong>：限流、缓存、异步化、归档历史数据。</li>' +
        '</ol>' +
        '<p>项目里的例子：「百万级历史表补 <code>(sensor_sn, created)</code> 复合索引，查询从全表扫降到 range，响应到秒级。」这虽然是第二个项目，但同样能说明你会看执行计划。</p>'
    },
    {
      q: '深分页为什么慢？怎么优化？',
      star: 4,
      a: '<p><code>LIMIT 1000000, 20</code> 会先扫描并回表 100 万行，再丢弃前 100 万行，代价随偏移量线性增长。</p>' +
        '<p><strong>优化</strong>：</p>' +
        '<ul>' +
        '<li><strong>游标分页</strong>：<code>WHERE id &gt; #{lastId} ORDER BY id LIMIT 20</code>，利用主键索引，O(1) 定位。缺点是不能跳页。</li>' +
        '<li><strong>延迟关联</strong>：<code>SELECT * FROM t JOIN (SELECT id FROM t ORDER BY id LIMIT 1000000, 20) x USING(id)</code>，先在索引上分页，只回表 20 行。</li>' +
        '<li><strong>覆盖索引</strong>：只查索引列，避免回表。</li>' +
        '<li><strong>业务限制</strong>：不允许翻太深（如最多 100 页），或改用搜索/归档。</li>' +
        '</ul>' +
        '<p>面试官可能追问「为什么延迟关联有效」：因为子查询只扫索引（二级索引或主键），不回表，回表次数从 100 万降到 20。</p>'
    },
    {
      q: '大表加索引 / 改字段要注意什么？',
      star: 3,
      a: '<p>MySQL 5.6+ 的 Online DDL 支持加索引时不阻塞读写（<code>ALGORITHM=INPLACE, LOCK=NONE</code>），但仍会占用 I/O，建议低峰执行。</p>' +
        '<ul>' +
        '<li>先 <code>EXPLAIN</code> 验证索引有效，再在预发环境试。</li>' +
        '<li>避免在业务高峰执行；用 <code>pt-online-schema-change</code> 或 <code>gh-ost</code> 做无锁变更（大表更稳）。</li>' +
        '<li>加索引会重建二级索引，磁盘和 CPU 有开销。</li>' +
        '<li>改字段类型可能锁表/重建表，尤其 varchar 长度变化。</li>' +
        '<li>监控主从延迟，DDL 在从库执行可能滞后。</li>' +
        '</ul>'
    },
    {
      q: '主从延迟怎么排查和缓解？',
      star: 4,
      a: '<p><strong>排查</strong>：<code>SHOW SLAVE STATUS</code> 看 <code>Seconds_Behind_Master</code>、<code>Relay_Log_Pos</code>；对比主库 binlog 位点。</p>' +
        '<p><strong>原因</strong>：</p>' +
        '<ul>' +
        '<li>从库单线程回放（5.7+ 支持并行复制，但按库/组并行，热点表仍单线程）。</li>' +
        '<li>大事务、大表 DDL、批量写。</li>' +
        '<li>从库配置差、有查询压力。</li>' +
        '<li>网络延迟。</li>' +
        '</ul>' +
        '<p><strong>缓解</strong>：</p>' +
        '<ul>' +
        '<li>拆大事务、批量写控制批次。</li>' +
        '<li>开启并行复制（<code>slave_parallel_workers</code>、<code>slave_parallel_type=LOGICAL_CLOCK</code>）。</li>' +
        '<li>强一致读走主库；用 <code>WAIT</code>/半同步复制提升可靠性。</li>' +
        '<li>从库只做读，避免大查询。</li>' +
        '</ul>'
    },
    {
      q: 'count(*)、count(1)、count(字段) 的区别？',
      star: 3,
      a: '<ul>' +
        '<li><code>count(*)</code> 和 <code>count(1)</code>：统计行数，不取值，InnoDB 做了优化，性能基本一样。官方推荐 <code>count(*)</code>。</li>' +
        '<li><code>count(字段)</code>：只统计该字段非 NULL 的行，需要取值判断，理论上更慢；如果字段有索引且非空，优化器可能选最小的索引。</li>' +
        '</ul>' +
        '<p>InnoDB 不像 MyISAM 存了总行数，因为 MVCC 下不同事务看到的行数不同，必须逐行判断可见性。所以大表 <code>count(*)</code> 也慢，建议用缓存/计数表维护，或接受近似值。</p>'
    }
  ]
});

/* ================= 模块 6：Java 并发 ================= */
window.MODULES.push({
  id: 'java',
  order: 6,
  icon: '🧵',
  title: 'Java 并发与集合',
  desc: '简历写了「掌握线程池、synchronized 等并发基础」。这一章覆盖 JUC 高频题，并给出在秒杀项目里的真实落点，避免只会背八股。',
  tags: ['线程池', 'AQS', 'CAS', 'ThreadLocal', 'ConcurrentHashMap'],
  items: [
    {
      q: '线程池的 7 个核心参数是什么？',
      star: 5,
      a: '<pre><code>public ThreadPoolExecutor(\n    int corePoolSize,        // 核心线程数\n    int maximumPoolSize,     // 最大线程数\n    long keepAliveTime,      // 非核心线程空闲存活时间\n    TimeUnit unit,           // 时间单位\n    BlockingQueue&lt;Runnable&gt; workQueue,  // 任务队列\n    ThreadFactory threadFactory,        // 线程工厂（命名、优先级、守护）\n    RejectedExecutionHandler handler    // 拒绝策略\n)</code></pre>' +
        '<p>记忆方法：<strong>核心、最大、存活、单位、队列、工厂、拒绝</strong>。</p>' +
        '<p>补充：</p>' +
        '<ul>' +
        '<li><code>allowCoreThreadTimeOut(true)</code> 可以让核心线程也超时回收。</li>' +
        '<li>线程工厂一定要给线程起名（如 <code>seckill-consumer-1</code>），排查 jstack 时才知道是谁。</li>' +
        '<li>队列容量很关键：无界队列（<code>LinkedBlockingQueue</code> 默认 Integer.MAX_VALUE）会让 <code>maximumPoolSize</code> 失效，任务无限堆积直到 OOM。</li>' +
        '</ul>'
    },
    {
      q: '线程池的任务提交和执行流程？',
      star: 5,
      a: '<p>标准流程（背这张图）：</p>' +
        '<ol>' +
        '<li>当前线程数 &lt; <code>corePoolSize</code> → 创建核心线程执行。</li>' +
        '<li>核心线程满了 → 任务放入<strong>阻塞队列</strong>排队。</li>' +
        '<li>队列满了 → 创建非核心线程，直到 <code>maximumPoolSize</code>。</li>' +
        '<li>最大线程也满了 → 执行<strong>拒绝策略</strong>。</li>' +
        '</ol>' +
        '<blockquote class="warn">常见误区：不是「核心满了就扩线程」，而是<strong>先排队，队列满了才扩容</strong>。所以用无界队列时永远不会触发扩容。</blockquote>' +
        '<p><strong>为什么这样设计</strong>：创建线程成本高，能排队就排队；只有积压严重时才扩容，最后才拒绝。这是一种「保护系统」的取舍。</p>' +
        '<p><strong>execute vs submit</strong>：<code>execute</code> 只接收 Runnable，异常直接抛；<code>submit</code> 返回 Future，异常被包装在 <code>ExecutionException</code> 里，不调用 <code>get()</code> 可能永远发现不了。</p>'
    },
    {
      q: '四种拒绝策略分别是什么？生产上怎么选？',
      star: 4,
      a: '<ul>' +
        '<li><strong>AbortPolicy</strong>（默认）：抛 <code>RejectedExecutionException</code>，调用方能感知。</li>' +
        '<li><strong>CallerRunsPolicy</strong>：让提交任务的线程自己执行，起到<strong>反压</strong>作用，但会阻塞调用线程。</li>' +
        '<li><strong>DiscardPolicy</strong>：静默丢弃，不报错，最危险。</li>' +
        '<li><strong>DiscardOldestPolicy</strong>：丢弃队列最老的任务，再尝试提交。</li>' +
        '</ul>' +
        '<p><strong>怎么选</strong>：</p>' +
        '<ul>' +
        '<li>核心业务（下单、支付）：<code>AbortPolicy</code> + 上层降级/告警，绝不能静默丢。</li>' +
        '<li>可丢弃的日志/埋点：<code>DiscardPolicy</code> 或 <code>DiscardOldestPolicy</code>。</li>' +
        '<li>希望反压：<code>CallerRunsPolicy</code>，但要小心把 Web 线程拖死。</li>' +
        '<li>生产常用自定义策略：记录日志 + 落库/进 MQ + 告警，再决定丢弃或重试。</li>' +
        '</ul>'
    },
    {
      q: '线程数怎么设置？CPU 密集和 IO 密集有什么区别？',
      star: 5,
      a: '<p>经典公式：</p>' +
        '<ul>' +
        '<li><strong>CPU 密集</strong>：<code>N + 1</code>（N 为核数），过多线程只会增加上下文切换。</li>' +
        '<li><strong>IO 密集</strong>：<code>N × (1 + 等待时间 / 计算时间)</code>，比如 8 核、等待占 90%，约 80 个线程。</li>' +
        '</ul>' +
        '<p>但公式只是起点，真实值要靠<strong>压测</strong>：观察 CPU 利用率、线程池活跃数、队列长度、P99。线程太少吞吐上不去，太多则内存和切换开销大。</p>' +
        '<p>项目落点：「秒杀消费端是 IO 密集（等 DB、等网络），我用 <code>core=8, max=16, queue=200</code>，并限制并发消费数，避免把 MySQL 打满。这个值是根据压测调的，不是拍脑袋。」</p>' +
        '<p>还要区分线程池类型：CPU 密集型用固定大小；IO 密集型可适当大；定时任务用 <code>ScheduledThreadPoolExecutor</code>。</p>'
    },
    {
      q: '为什么不推荐用 Executors 创建线程池？',
      star: 4,
      a: '<p>阿里开发手册明确禁止，因为容易 OOM：</p>' +
        '<ul>' +
        '<li><code>Executors.newFixedThreadPool</code> / <code>newSingleThreadExecutor</code>：使用<strong>无界队列</strong> <code>LinkedBlockingQueue</code>（默认 Integer.MAX_VALUE），任务无限堆积 → OOM，且 <code>maximumPoolSize</code> 失效。</li>' +
        '<li><code>Executors.newCachedThreadPool</code>：<code>maximumPoolSize = Integer.MAX_VALUE</code>，任务多时疯狂创建线程 → OOM 或系统卡死。</li>' +
        '<li><code>Executors.newScheduledThreadPool</code>：同样最大线程数无界。</li>' +
        '</ul>' +
        '<p>正确做法：手动 <code>new ThreadPoolExecutor(...)</code>，指定有界队列、最大线程数、线程工厂和拒绝策略，便于监控和治理。</p>'
    },
    {
      q: 'synchronized 的原理？锁升级过程讲一下',
      star: 5,
      a: '<p><strong>原理</strong>：修饰代码块时，编译成 <code>monitorenter</code> / <code>monitorexit</code> 指令；修饰方法时用 <code>ACC_SYNCHRONIZED</code> 标志。底层依赖对象头的 <strong>Mark Word</strong> 和 Monitor（管程）。</p>' +
        '<p><strong>锁状态与升级</strong>：</p>' +
        '<ol>' +
        '<li><strong>无锁</strong>：Mark Word 存 hashCode、分代年龄等。</li>' +
        '<li><strong>偏向锁</strong>：只有一个线程访问时，Mark Word 记录线程 ID，后续进入无需 CAS。偏向锁撤销需要 STW，代价高；JDK 15 起默认禁用，18 已移除。</li>' +
        '<li><strong>轻量级锁</strong>：多线程交替访问，CAS 把 Mark Word 指向栈帧里的 Lock Record；失败则自旋。</li>' +
        '<li><strong>重量级锁</strong>：自旋失败/竞争激烈，升级为 Monitor，线程进入阻塞队列，涉及用户态/内核态切换。</li>' +
        '</ol>' +
        '<p><strong>注意</strong>：锁升级是<strong>单向</strong>的，不能降级。偏向锁/轻量级锁是为了减少系统调用，竞争激烈时重量级锁反而更稳。</p>' +
        '<p><strong>可重入</strong>：Monitor 里有 <code>owner</code> 和 <code>recursions</code> 计数，同一线程再次进入计数 +1。</p>'
    },
    {
      q: 'volatile 的作用和原理？能保证原子性吗？',
      star: 5,
      a: '<p><strong>两个语义</strong>：</p>' +
        '<ul>' +
        '<li><strong>可见性</strong>：一个线程修改后，其他线程立即可见。底层是 <code>lock</code> 前缀指令，把缓存行写回主存并使其他 CPU 缓存失效（MESI）。</li>' +
        '<li><strong>有序性</strong>：禁止指令重排，通过<strong>内存屏障</strong>实现（LoadLoad、StoreStore、LoadStore、StoreLoad）。</li>' +
        '</ul>' +
        '<p><strong>不保证原子性</strong>：<code>i++</code> 是「读-改-写」三步，volatile 只能保证每步读到最新值，不能保证整体原子。需要 <code>AtomicInteger</code> 或 <code>synchronized</code>。</p>' +
        '<p><strong>经典用法：双重检查锁单例</strong></p>' +
        '<pre><code>private static volatile Singleton instance;\npublic static Singleton getInstance() {\n    if (instance == null) {\n        synchronized (Singleton.class) {\n            if (instance == null) {\n                instance = new Singleton();  // 不加 volatile 可能重排：先赋值引用再初始化\n            }\n        }\n    }\n    return instance;\n}</code></pre>' +
        '<p>项目里可以用在「秒杀开关」「配置刷新」这类一写多读的标志位上。</p>'
    },
    {
      q: 'JMM 是什么？happens-before 规则有哪些？',
      star: 4,
      a: '<p><strong>JMM（Java 内存模型）</strong>是一套规范，定义了多线程下共享变量的可见性和有序性，屏蔽不同硬件的差异。它抽象出「主内存 + 工作内存」，每个线程有本地副本。</p>' +
        '<p><strong>happens-before</strong>：如果 A happens-before B，则 A 的结果对 B 可见，且 A 在 B 之前执行（不要求物理顺序，只要求可观察结果）。</p>' +
        '<p>主要规则：</p>' +
        '<ul>' +
        '<li><strong>程序顺序</strong>：同一线程内，前面的操作 hb 后面的操作。</li>' +
        '<li><strong>监视器锁</strong>：解锁 hb 后续加锁。</li>' +
        '<li><strong>volatile</strong>：写 hb 后续读。</li>' +
        '<li><strong>线程启动</strong>：<code>Thread.start()</code> hb 线程内所有操作。</li>' +
        '<li><strong>线程终止</strong>：线程内所有操作 hb <code>join()</code> 返回。</li>' +
        '<li><strong>传递性</strong>：A hb B，B hb C，则 A hb C。</li>' +
        '<li><strong>中断</strong>：<code>interrupt()</code> hb 检测到中断。</li>' +
        '<li><strong>对象终结</strong>：构造函数结束 hb <code>finalize()</code>。</li>' +
        '</ul>'
    },
    {
      q: 'CAS 是什么？有什么问题？ABA 怎么解决？',
      star: 5,
      a: '<p><strong>CAS（Compare And Swap）</strong>：比较内存值与期望值，相等才更新为新值，由 CPU 的 <code>cmpxchg</code> 指令保证原子。Java 通过 <code>Unsafe.compareAndSwapInt</code> 暴露，<code>AtomicInteger</code> 等原子类基于它。</p>' +
        '<pre><code>do {\n    old = atomic.get();\n} while (!atomic.compareAndSet(old, old + 1));</code></pre>' +
        '<p><strong>三个问题</strong>：</p>' +
        '<ul>' +
        '<li><strong>ABA</strong>：值从 A 改成 B 又改回 A，CAS 察觉不到。解决：<code>AtomicStampedReference</code> 加版本号，或 <code>AtomicMarkableReference</code> 加布尔标记。</li>' +
        '<li><strong>自旋开销</strong>：竞争激烈时一直重试，浪费 CPU。解决：自适应自旋、退化为锁（<code>LongAdder</code> 分段累加）。</li>' +
        '<li><strong>只能保证一个变量</strong>：多变量原子性要用 <code>AtomicReference</code> 包装对象，或加锁。</li>' +
        '</ul>' +
        '<p><strong>项目落点</strong>：数据库的 <code>stock &gt; 0</code> 条件更新本质也是 CAS 思想——比较并更新，失败返回 0 行。</p>'
    },
    {
      q: 'AQS 的原理？ReentrantLock 怎么基于它实现？',
      star: 5,
      a: '<p><strong>AQS（AbstractQueuedSynchronizer）</strong>是一个同步器框架，核心三部分：</p>' +
        '<ul>' +
        '<li><strong>volatile int state</strong>：同步状态，0 表示空闲，>0 表示被占用/重入次数。</li>' +
        '<li><strong>CLH 双向队列</strong>：获取失败的线程包装成 Node 入队，自旋 + <code>LockSupport.park</code> 阻塞。</li>' +
        '<li><strong>模板方法</strong>：子类实现 <code>tryAcquire</code>/<code>tryRelease</code>，AQS 负责排队、唤醒、中断处理。</li>' +
        '</ul>' +
        '<p><strong>ReentrantLock 加锁流程</strong>：</p>' +
        '<ol>' +
        '<li><code>tryAcquire</code>：CAS 把 state 从 0 改成 1，成功则记录当前线程为 owner。</li>' +
        '<li>如果 owner 是自己，state + 1（可重入）。</li>' +
        '<li>失败则入队，<code>park</code> 等待；前驱节点释放锁时 <code>unpark</code> 唤醒。</li>' +
        '<li>释放时 state - 1，减到 0 才真正释放并唤醒后继。</li>' +
        '</ol>' +
        '<p><strong>公平 vs 非公平</strong>：公平锁在 <code>tryAcquire</code> 里先检查队列是否有前驱，有就排队；非公平锁直接 CAS 抢，抢不到再排队。非公平吞吐更高，但可能饥饿。</p>' +
        '<p><code>CountDownLatch</code>、<code>Semaphore</code>、<code>ReentrantReadWriteLock</code> 都基于 AQS。</p>'
    },
    {
      q: 'synchronized 和 ReentrantLock 的区别？怎么选？',
      star: 5,
      a: '<table><tr><th></th><th>synchronized</th><th>ReentrantLock</th></tr>' +
        '<tr><td>层级</td><td>JVM 关键字，字节码指令</td><td>JDK API，基于 AQS</td></tr>' +
        '<tr><td>释放</td><td>自动释放（异常也释放）</td><td>必须手动 <code>unlock()</code>，要放 finally</td></tr>' +
        '<tr><td>公平性</td><td>非公平</td><td>可选公平/非公平</td></tr>' +
        '<tr><td>中断</td><td>不可中断等待</td><td><code>lockInterruptibly()</code> 可中断</td></tr>' +
        '<tr><td>超时</td><td>不支持</td><td><code>tryLock(timeout)</code></td></tr>' +
        '<tr><td>条件变量</td><td>wait/notify 单一等待集</td><td>多个 <code>Condition</code>，精确唤醒</td></tr>' +
        '<tr><td>性能</td><td>JDK 6 后优化，低竞争很好</td><td>高竞争下更可控</td></tr></table>' +
        '<p><strong>怎么选</strong>：优先 <code>synchronized</code>（简单、不易漏解锁）；需要超时、可中断、公平锁、多条件队列时用 <code>ReentrantLock</code>。</p>' +
        '<p>项目里扣库存没在 Java 层加锁，而是交给 Redis Lua 和 DB 行锁，因为是多实例部署，JVM 锁管不到其他实例。</p>'
    },
    {
      q: 'ThreadLocal 的原理？为什么会内存泄漏？',
      star: 5,
      a: '<p><strong>原理</strong>：每个 <code>Thread</code> 内部有一个 <code>ThreadLocalMap</code>，key 是 <code>ThreadLocal</code> 对象（<strong>弱引用</strong>），value 是强引用的值。调用 <code>get/set</code> 时操作当前线程自己的 map，所以线程隔离。</p>' +
        '<p><strong>内存泄漏原因</strong>：</p>' +
        '<ul>' +
        '<li>ThreadLocal 对象被回收后，map 里的 key 变成 null，但 <strong>value 仍被 Entry 强引用</strong>。</li>' +
        '<li>如果线程是线程池里的核心线程，长期存活，这些 value 就一直无法回收 → 泄漏。</li>' +
        '<li>ThreadLocalMap 虽然会在 <code>get/set/remove</code> 时清理部分 null key，但不保证及时。</li>' +
        '</ul>' +
        '<p><strong>正确用法</strong>：用完必须 <code>remove()</code>，尤其在 Web 容器/线程池里，放在 <code>finally</code> 中。</p>' +
        '<p><strong>项目场景</strong>：用户登录信息（userId）放 ThreadLocal，拦截器解析 JWT 后 set，请求结束 remove；日志 traceId 也常用 ThreadLocal。</p>' +
        '<p><strong>父子线程传递</strong>：<code>InheritableThreadLocal</code>，但线程池复用时不生效，要用阿里的 <code>TransmittableThreadLocal</code>。</p>'
    },
    {
      q: 'ConcurrentHashMap 怎么保证线程安全？1.8 有什么变化？',
      star: 5,
      a: '<p><strong>JDK 1.7</strong>：分段锁 Segment（继承 ReentrantLock），默认 16 段，不同段可并发写。</p>' +
        '<p><strong>JDK 1.8</strong>：</p>' +
        '<ul>' +
        '<li>取消 Segment，改为 <strong>CAS + synchronized 锁单个桶（链表头/红黑树根）</strong>，锁粒度更细。</li>' +
        '<li>数组 + 链表 + 红黑树，链表长度 ≥ 8 且数组长度 ≥ 64 时转红黑树。</li>' +
        '<li>扩容支持多线程协助迁移（<code>ForwardingNode</code> 标记）。</li>' +
        '<li><code>size()</code> 用 <code>baseCount + CounterCell[]</code> 分段计数，类似 LongAdder。</li>' +
      '</ul>' +
        '<p><strong>为什么 key/value 不允许 null</strong>：并发下 <code>get</code> 返回 null 无法区分「不存在」还是「值为 null」，需要加锁再查，违背无锁设计；HashMap 允许 null 是因为单线程可以 <code>containsKey</code> 判断。</p>' +
        '<p><strong>复合操作仍非原子</strong>：<code>if (!map.containsKey(k)) map.put(k, v)</code> 有竞态，要用 <code>putIfAbsent</code>、<code>computeIfAbsent</code>。</p>'
    },
    {
      q: 'HashMap 的底层结构？为什么容量是 2 的幂？',
      star: 4,
      a: '<ul>' +
        '<li><strong>结构</strong>：数组 + 链表 + 红黑树（1.8）。链表长度 ≥ 8 且数组 ≥ 64 转红黑树，退化阈值 6。</li>' +
        '<li><strong>哈希扰动</strong>：<code>(h = key.hashCode()) ^ (h &gt;&gt;&gt; 16)</code>，让高位参与运算，减少碰撞。</li>' +
        '<li><strong>索引</strong>：<code>(n - 1) &amp; hash</code>，等价于取模但更快。</li>' +
        '<li><strong>扩容</strong>：负载因子 0.75，容量翻倍；1.8 用高低位拆分，避免重新计算 hash。</li>' +
        '</ul>' +
        '<p><strong>为什么容量是 2 的幂</strong>：<code>n-1</code> 的二进制是全 1，按位与等价于取模且分布均匀；扩容时元素要么留在原位置，要么移到「原位置 + 旧容量」，迁移高效。</p>' +
        '<p><strong>为什么负载因子 0.75</strong>：空间与冲突的折中。太高冲突多，太低浪费空间。</p>' +
        '<p><strong>1.7 头插法的问题</strong>：并发扩容可能形成环形链表，导致 CPU 100%；1.8 改为尾插法，但 HashMap 仍然不是线程安全的。</p>'
    },
    {
      q: '死锁的四个必要条件？怎么排查和避免？',
      star: 4,
      a: '<p><strong>四个条件</strong>：互斥、请求并保持、不可剥夺、循环等待。</p>' +
        '<p><strong>排查</strong>：</p>' +
        '<ul>' +
        '<li><code>jps -l</code> 找到进程，<code>jstack &lt;pid&gt;</code> 查看线程栈，搜索 <code>Found one Java-level deadlock</code>。</li>' +
        '<li>或 <code>jconsole</code> / <code>VisualVM</code> 的「检测死锁」。</li>' +
        '</ul>' +
        '<p><strong>避免</strong>：</p>' +
        '<ul>' +
        '<li>按固定顺序加锁。</li>' +
        '<li>用 <code>tryLock(timeout)</code>，超时放弃并释放已持有的锁。</li>' +
        '<li>减少锁的嵌套和持锁时间。</li>' +
        '<li>用无锁结构（原子类、并发容器）。</li>' +
        '</ul>' +
        '<p>项目里其实更容易出现的是<strong>数据库死锁</strong>，排查用 <code>SHOW ENGINE INNODB STATUS</code>，避免方式是固定更新顺序、缩短事务。</p>'
    },
    {
      q: 'Java 线程的六种状态？BLOCKED 和 WAITING 的区别？',
      star: 3,
      a: '<ul>' +
        '<li><strong>NEW</strong>：创建未启动。</li>' +
        '<li><strong>RUNNABLE</strong>：可运行（包括等待 CPU 和正在运行，以及 IO 等待）。</li>' +
        '<li><strong>BLOCKED</strong>：等待进入 <code>synchronized</code> 临界区（等 monitor 锁）。</li>' +
        '<li><strong>WAITING</strong>：无限期等待，需要别的线程唤醒，如 <code>Object.wait()</code>、<code>join()</code>、<code>LockSupport.park()</code>。</li>' +
        '<li><strong>TIMED_WAITING</strong>：限时等待，如 <code>sleep(ms)</code>、<code>wait(ms)</code>、<code>tryLock(timeout)</code>。</li>' +
        '<li><strong>TERMINATED</strong>：已结束。</li>' +
        '</ul>' +
        '<p><strong>BLOCKED vs WAITING</strong>：BLOCKED 是被动等锁，WAITING 是主动等待通知；BLOCKED 会在锁释放后自动竞争，WAITING 必须被 <code>notify/unpark</code> 唤醒。</p>'
    },
    {
      q: '阻塞队列有哪几种？线程池该怎么选队列？',
      star: 4,
      a: '<ul>' +
        '<li><code>ArrayBlockingQueue</code>：有界数组，公平/非公平可选，适合固定容量。</li>' +
        '<li><code>LinkedBlockingQueue</code>：链表，默认无界（Integer.MAX_VALUE），要手动指定容量。</li>' +
        '<li><code>SynchronousQueue</code>：不存储元素，每个 put 必须等 take，适合 <code>CachedThreadPool</code> 这种直接交接。</li>' +
        '<li><code>PriorityBlockingQueue</code>：无界优先队列，按优先级出队。</li>' +
        '<li><code>DelayQueue</code>：延迟队列，元素到期才能取，可用于订单超时。</li>' +
        '<li><code>LinkedTransferQueue</code>：无界，支持 transfer。</li>' +
        '</ul>' +
        '<p><strong>线程池选队列</strong>：业务线程池用有界 <code>ArrayBlockingQueue</code> 或指定容量的 <code>LinkedBlockingQueue</code>，配合拒绝策略保护系统；不要用默认无界队列。</p>'
    },
    {
      q: '线程池怎么监控？怎么优雅关闭？',
      star: 3,
      a: '<p><strong>监控指标</strong>：</p>' +
        '<ul>' +
        '<li><code>getActiveCount()</code> 活跃线程数、<code>getQueue().size()</code> 队列长度、<code>getCompletedTaskCount()</code> 完成任务数。</li>' +
        '<li><code>getLargestPoolSize()</code> 历史最大线程数，判断是否触达上限。</li>' +
        '<li>接入 Micrometer/Prometheus，对队列长度和拒绝次数告警。</li>' +
        '</ul>' +
        '<p><strong>优雅关闭</strong>：</p>' +
        '<pre><code>executor.shutdown();                       // 不再接新任务，等待已提交任务完成\nif (!executor.awaitTermination(30, SECONDS)) {\n    executor.shutdownNow();                // 中断线程\n}</code></pre>' +
        '<p>Spring 里可以 <code>@PreDestroy</code> 或实现 <code>DisposableBean</code>，也可以配置 <code>spring.task.execution.shutdown.await-termination=true</code>。关键是先把 MQ 消费者停掉，再关线程池，避免消息处理一半。</p>'
    }
  ]
});
