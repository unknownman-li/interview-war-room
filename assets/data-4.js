window.MODULES = window.MODULES || [];

/* ================= 模块 7：JVM ================= */
window.MODULES.push({
  id: 'jvm',
  order: 7,
  icon: '☕',
  title: 'JVM 内存与调优',
  desc: '简历写的是「了解 JVM 内存结构与 GC 机制」。不用深到写 GC 算法，但内存区域、对象存活、G1、OOM 排查这几块必须能接住。',
  tags: ['内存区域', 'GC', 'G1', '类加载', 'OOM 排查'],
  items: [
    {
      q: 'JVM 运行时内存区域怎么划分？哪些线程私有、哪些共享？',
      star: 5,
      a: '<table><tr><th>区域</th><th>归属</th><th>作用</th><th>可能抛出的错误</th></tr>' +
        '<tr><td>程序计数器</td><td>线程私有</td><td>当前字节码行号，唯一不会 OOM 的区域</td><td>无</td></tr>' +
        '<tr><td>虚拟机栈</td><td>线程私有</td><td>方法调用的栈帧（局部变量表、操作数栈、动态链接、返回地址）</td><td>StackOverflowError / OOM</td></tr>' +
        '<tr><td>本地方法栈</td><td>线程私有</td><td>Native 方法</td><td>同上</td></tr>' +
        '<tr><td>堆</td><td>线程共享</td><td>对象实例、数组，GC 主战场</td><td>OutOfMemoryError: Java heap space</td></tr>' +
        '<tr><td>方法区（元空间）</td><td>线程共享</td><td>类元信息、常量、静态变量、JIT 代码</td><td>Metaspace OOM</td></tr>' +
        '<tr><td>直接内存</td><td>-</td><td>NIO 的 DirectByteBuffer，不受堆大小限制</td><td>Direct buffer memory OOM</td></tr></table>' +
        '<p>JDK 8 的变化：<strong>永久代被元空间取代</strong>，字符串常量池从方法区移到堆中。原因是永久代大小难调、容易 OOM，元空间使用本地内存更灵活。</p>'
    },
    {
      q: '对象在堆里怎么布局？创建过程是怎样的？',
      star: 4,
      a: '<p><strong>内存布局</strong>：</p>' +
        '<ul>' +
        '<li><strong>对象头</strong>：Mark Word（hashCode、GC 分代年龄、锁状态）+ 类型指针（指向 Class）。数组还有长度字段。</li>' +
        '<li><strong>实例数据</strong>：字段值，按类型宽度对齐排列。</li>' +
        '<li><strong>对齐填充</strong>：保证对象大小是 8 字节的整数倍。</li>' +
        '</ul>' +
        '<p><strong>创建过程</strong>：</p>' +
        '<ol>' +
        '<li>类加载检查（是否已加载、解析、初始化）。</li>' +
        '<li>分配内存：指针碰撞（内存规整时）或空闲列表（有碎片时）。</li>' +
        '<li>并发安全：CAS 重试或 TLAB（线程本地分配缓冲）。</li>' +
        '<li>初始化零值（保证字段有默认值）。</li>' +
        '<li>设置对象头（hashCode、GC 年龄、类型指针）。</li>' +
        '<li>执行 <code>&lt;init&gt;</code> 构造方法。</li>' +
        '</ol>' +
        '<p><strong>指针压缩</strong>：64 位 JVM 默认开启 <code>UseCompressedOops</code>，引用从 8 字节压到 4 字节，节省内存；堆超过 32GB 时失效，所以堆一般不超过 32GB。</p>'
    },
    {
      q: '怎么判断对象可以回收？可达性分析为什么不用引用计数？',
      star: 4,
      a: '<p><strong>引用计数</strong>：每个对象维护引用数，为 0 回收。简单，但<strong>无法解决循环引用</strong>（A 引用 B，B 引用 A，计数都不为 0），且增减计数有开销。所以 JVM 不用。</p>' +
        '<p><strong>可达性分析</strong>：从 <strong>GC Roots</strong> 出发遍历引用链，不可达的对象可回收。</p>' +
        '<p><strong>GC Roots 包括</strong>：</p>' +
        '<ul>' +
        '<li>虚拟机栈中局部变量表引用的对象。</li>' +
        '<li>方法区中静态属性、常量引用的对象。</li>' +
        '<li>本地方法栈中 JNI 引用的对象。</li>' +
        '<li>活跃线程、同步锁持有的对象。</li>' +
        '<li>JVM 内部的系统类加载器、基本类型 Class 等。</li>' +
        '</ul>' +
        '<p><strong>不可达不一定死</strong>：还要经过 <code>finalize()</code>（已废弃）判断，对象可以在 finalize 里自救，但只一次。</p>' +
        '<p><strong>四种引用</strong>：强（不回收）、软（内存不足时回收，适合缓存）、弱（下次 GC 必回收，ThreadLocal key）、虚（用于回收通知/直接内存清理）。</p>'
    },
    {
      q: '垃圾回收算法有哪几种？分代收集是什么？',
      star: 4,
      a: '<p><strong>基础算法</strong>：</p>' +
        '<ul>' +
        '<li><strong>标记-清除</strong>：标记存活对象后清除垃圾。简单，但产生内存碎片、效率不高。</li>' +
        '<li><strong>复制</strong>：把存活对象复制到另一块空间，再清空原空间。无碎片、快，但浪费一半空间，适合存活率低的新生代。</li>' +
        '<li><strong>标记-整理</strong>：标记后把存活对象向一端移动。无碎片，但移动成本高，适合老年代。</li>' +
        '<li><strong>分代收集</strong>：按对象存活周期分新生代/老年代，分别用合适算法。</li>' +
        '</ul>' +
        '<p><strong>分代假设</strong>：绝大多数对象朝生夕死；熬过多次 GC 的对象更难死。</p>' +
        '<ul>' +
        '<li><strong>新生代</strong>：Eden + Survivor0 + Survivor1（默认 8:1:1），用复制算法。Minor GC 频繁但快。</li>' +
        '<li><strong>老年代</strong>：存活久的对象，用标记-清除/整理。Major/Full GC 慢，要尽量避免。</li>' +
        '</ul>' +
        '<p><strong>对象晋升老年代</strong>：年龄达到阈值（默认 15）、大对象直接进老年代、Survivor 中同年龄对象总和超过一半（动态年龄判断）。</p>'
    },
    {
      q: '常见垃圾收集器有哪些？CMS 和 G1 的区别？',
      star: 5,
      a: '<table><tr><th>收集器</th><th>区域</th><th>算法</th><th>特点</th></tr>' +
        '<tr><td>Serial</td><td>新生代</td><td>复制</td><td>单线程，STW，适合客户端小堆</td></tr>' +
        '<tr><td>ParNew</td><td>新生代</td><td>复制</td><td>多线程版 Serial</td></tr>' +
        '<tr><td>Parallel Scavenge</td><td>新生代</td><td>复制</td><td>吞吐优先，JDK 8 默认</td></tr>' +
        '<tr><td>CMS</td><td>老年代</td><td>标记-清除</td><td>低延迟，并发标记，JDK 9 废弃、14 移除</td></tr>' +
        '<tr><td>G1</td><td>整堆</td><td>标记-整理 + 复制</td><td>可预测停顿，JDK 9+ 默认</td></tr>' +
        '<tr><td>ZGC</td><td>整堆</td><td>染色指针 + 读屏障</td><td>超低延迟（&lt;10ms），JDK 15 生产可用</td></tr></table>' +
        '<p><strong>CMS 四个阶段</strong>：初始标记（STW）→ 并发标记 → 重新标记（STW）→ 并发清除。缺点：标记-清除产生碎片、并发模式失败退化为 Serial Old、占用 CPU。</p>' +
        '<p><strong>G1 的核心</strong>：把堆分成大小相等的 Region（1–32MB），逻辑上仍有 Eden/Survivor/Old/Humongous；维护每个 Region 的回收价值，优先回收价值高的（Garbage First）；通过 <code>MaxGCPauseMillis</code> 预测停顿，选择本次回收的 Region 集合。</p>' +
        '<p><strong>G1 vs CMS</strong>：G1 无碎片（整体标记-整理 + Region 间复制）、可预测停顿、支持大堆；CMS 低延迟但碎片和退化问题多。</p>'
    },
    {
      q: 'G1 的回收过程？Remembered Set 和 Card Table 是干什么的？',
      star: 4,
      a: '<p><strong>回收流程</strong>：</p>' +
        '<ol>' +
        '<li>初始标记（STW）：标记 GC Roots 直接关联的对象，很快。</li>' +
        '<li>并发标记：遍历对象图，与用户线程并发。</li>' +
        '<li>最终标记（STW）：处理并发标记期间的漏标（SATB 写屏障）。</li>' +
        '<li>筛选回收（STW）：按回收价值排序，选择 Region 复制存活对象。</li>' +
        '</ol>' +
        '<p><strong>跨 Region 引用问题</strong>：回收某个 Region 时，不能扫描整个堆找谁引用了它。G1 用 <strong>RSet（Remembered Set）</strong> 记录「其他 Region 指向本 Region 的引用」，每个 Region 一个 RSet。</p>' +
        '<p><strong>Card Table（卡表）</strong>：把堆分成 512 字节的卡页，引用字段赋值时通过写屏障把对应卡标记为脏；RSet 基于卡表维护。这样 Minor GC 只需扫描脏卡，不用全堆扫描。</p>' +
        '<p><strong>SATB</strong>：并发标记时，对象引用断开前把旧引用记录下来，防止漏标。会产生浮动垃圾，下次回收。</p>'
    },
    {
      q: '类加载过程有哪几步？双亲委派是什么？为什么需要？',
      star: 4,
      a: '<p><strong>过程</strong>：加载 → 验证 → 准备 → 解析 → 初始化（之后还有使用、卸载）。</p>' +
        '<ul>' +
        '<li><strong>加载</strong>：通过全限定名获取二进制字节流，生成 Class 对象。</li>' +
        '<li><strong>验证</strong>：文件格式、元数据、字节码、符号引用验证。</li>' +
        '<li><strong>准备</strong>：为静态变量分配内存并设零值（<code>static final</code> 常量在编译期已赋值）。</li>' +
        '<li><strong>解析</strong>：符号引用转直接引用。</li>' +
        '<li><strong>初始化</strong>：执行 <code>&lt;clinit&gt;</code>，即静态变量赋值和静态代码块，父类先于子类。</li>' +
        '</ul>' +
        '<p><strong>双亲委派</strong>：收到加载请求先交给父加载器，父加载器无法完成才自己加载。</p>' +
        '<p>层级：Bootstrap（rt.jar/核心库）→ Extension/Platform → Application（classpath）→ 自定义。</p>' +
        '<p><strong>好处</strong>：</p>' +
        '<ul>' +
        '<li>避免类重复加载。</li>' +
        '<li>保护核心类不被篡改（自己写个 <code>java.lang.String</code> 不会被加载）。</li>' +
        '</ul>' +
        '<p><strong>打破双亲委派的场景</strong>：SPI（JDBC Driver 用线程上下文类加载器）、Tomcat 应用隔离（每个 webapp 独立 ClassLoader）、OSGi 热部署。</p>'
    },
    {
      q: '常见 OOM 有哪些？分别怎么产生？',
      star: 4,
      a: '<ul>' +
        '<li><strong>Java heap space</strong>：对象太多/太大，堆放不下。常见于缓存无上限、一次查全表、内存泄漏。</li>' +
        '<li><strong>GC overhead limit exceeded</strong>：GC 花了 98% 时间却只回收不到 2% 内存，通常是堆太小或泄漏。</li>' +
        '<li><strong>Metaspace</strong>：动态生成类太多（CGLIB 代理、反射、热部署），元空间不足。</li>' +
        '<li><strong>Direct buffer memory</strong>：NIO 直接内存耗尽，<code>-XX:MaxDirectMemorySize</code> 太小或 ByteBuffer 未释放。</li>' +
        '<li><strong>Unable to create new native thread</strong>：线程数超过系统限制，常见于线程池无界、每个请求起线程。</li>' +
        '<li><strong>Requested array size exceeds VM limit</strong>：数组过大。</li>' +
        '</ul>' +
        '<p>排查思路：先看异常信息定位区域，再用 <code>jmap -dump</code> + MAT 分析对象占比和 GC Roots 引用链；元空间看 <code>jstat -gcmetacapacity</code>；直接内存看 NMT。</p>'
    },
    {
      q: '线上 CPU 100% 怎么排查？',
      star: 5,
      a: '<p>标准四步（背下来）：</p>' +
        '<ol>' +
        '<li><code>top</code> 找到 CPU 最高的 Java 进程 PID。</li>' +
        '<li><code>top -Hp &lt;pid&gt;</code> 找到该进程内 CPU 最高的线程 TID。</li>' +
        '<li><code>printf \'%x\\n\' &lt;tid&gt;</code> 把 TID 转成十六进制。</li>' +
        '<li><code>jstack &lt;pid&gt; | grep -A 20 &lt;nid&gt;</code> 找到对应线程栈，看它在执行什么。</li>' +
        '</ol>' +
        '<p><strong>常见原因</strong>：</p>' +
        '<ul>' +
        '<li>死循环 / 正则回溯 / 大循环。</li>' +
        '<li>频繁 Full GC（用 <code>jstat -gcutil &lt;pid&gt; 1000</code> 看 FGC 次数和耗时）。</li>' +
        '<li>线程上下文切换过多（线程数过多、锁竞争）。</li>' +
        '<li>频繁创建对象导致 GC 压力。</li>' +
        '</ul>' +
        '<p>如果是 GC 导致，再 <code>jmap -dump:live,format=b,file=heap.hprof &lt;pid&gt;</code>，用 MAT 找大对象和泄漏点。</p>'
    },
    {
      q: '内存泄漏怎么排查？',
      star: 5,
      a: '<p><strong>现象</strong>：老年代占用持续上升，Full GC 后也降不下来，最终 OOM。</p>' +
        '<p><strong>步骤</strong>：</p>' +
        '<ol>' +
        '<li><code>jstat -gcutil &lt;pid&gt; 1000</code> 观察 Eden/Old 变化和 FGC 频率。</li>' +
        '<li><code>jmap -histo:live &lt;pid&gt; | head -20</code> 看对象数量排行。</li>' +
        '<li><code>jmap -dump:live,format=b,file=heap.hprof &lt;pid&gt;</code> 导出堆。</li>' +
        '<li>MAT / VisualVM 打开，看 Dominator Tree、Leak Suspects，找 GC Roots 引用链。</li>' +
        '</ol>' +
        '<p><strong>常见泄漏点</strong>：</p>' +
        '<ul>' +
        '<li>静态集合只增不减（<code>static Map</code> 缓存）。</li>' +
        '<li>ThreadLocal 没 remove。</li>' +
        '<li>监听器/回调注册后没注销。</li>' +
        '<li>线程池/连接池未关闭。</li>' +
        '<li>自定义缓存没有淘汰策略。</li>' +
        '</ul>' +
        '<p>预防：堆转储参数 <code>-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=...</code>，出问题自动留现场。</p>'
    },
    {
      q: '常用 JVM 参数有哪些？你项目怎么设置的？',
      star: 3,
      a: '<ul>' +
        '<li><strong>堆</strong>：<code>-Xms4g -Xmx4g</code>（设成一样，避免动态伸缩），<code>-Xmn</code> 新生代大小。</li>' +
        '<li><strong>元空间</strong>：<code>-XX:MetaspaceSize=256m -XX:MaxMetaspaceSize=512m</code>。</li>' +
        '<li><strong>收集器</strong>：<code>-XX:+UseG1GC -XX:MaxGCPauseMillis=200</code>。</li>' +
        '<li><strong>OOM 现场</strong>：<code>-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/logs</code>。</li>' +
        '<li><strong>GC 日志</strong>：<code>-Xlog:gc*:file=gc.log:time,uptime,level,tags</code>（JDK 9+）。</li>' +
        '<li><strong>容器</strong>：<code>-XX:MaxRAMPercentage=75</code>，按容器内存比例设置，避免被 OOMKilled。</li>' +
        '</ul>' +
        '<p>项目话术：「本地/测试环境用默认参数，Docker 部署时用 <code>-XX:MaxRAMPercentage=70</code>，并开启 HeapDump。没有做深度调优，因为流量和堆都不大，调优需要基于 GC 日志和压测数据，不能拍脑袋。」</p>'
    }
  ]
});

/* ================= 模块 8：Spring ================= */
window.MODULES.push({
  id: 'spring',
  order: 8,
  icon: '🌱',
  title: 'Spring / Spring Boot / MyBatis',
  desc: '简历写了「理解 IoC、AOP 与事务管理」。这一章聚焦面试真正会问的：Bean 生命周期、循环依赖、事务失效、自动配置、MVC 流程和 MyBatis 细节。',
  tags: ['IoC', 'AOP', '事务失效', '循环依赖', '自动配置'],
  items: [
    {
      q: 'IoC 和 DI 是什么？有什么好处？',
      star: 4,
      a: '<p><strong>IoC（控制反转）</strong>：对象的创建和依赖管理交给容器，而不是在代码里 <code>new</code>。控制权从程序反转给容器。</p>' +
        '<p><strong>DI（依赖注入）</strong>：IoC 的实现方式，容器把依赖注入到对象里。三种方式：</p>' +
        '<ul>' +
        '<li>构造器注入（推荐，依赖不可变、便于测试、避免循环依赖）。</li>' +
        '<li>Setter 注入。</li>' +
        '<li>字段注入（<code>@Autowired</code> 直接标字段，简单但不推荐，隐藏依赖、难测试）。</li>' +
        '</ul>' +
        '<p><strong>好处</strong>：解耦、可替换实现、便于单元测试（Mock）、统一管理生命周期和 AOP 增强。</p>' +
        '<p>一句话：「IoC 是思想，DI 是手段，Spring 容器是载体。」</p>'
    },
    {
      q: 'AOP 的原理？JDK 动态代理和 CGLIB 有什么区别？',
      star: 5,
      a: '<p><strong>AOP</strong> 把横切逻辑（日志、事务、权限、限流）从业务代码中抽离，通过代理在方法前后织入。</p>' +
        '<p><strong>两种代理</strong>：</p>' +
        '<table><tr><th></th><th>JDK 动态代理</th><th>CGLIB</th></tr>' +
        '<tr><td>前提</td><td>目标类必须实现接口</td><td>目标类不能是 final</td></tr>' +
        '<tr><td>原理</td><td><code>Proxy</code> + <code>InvocationHandler</code>，生成实现同一接口的代理类</td><td>生成目标类的子类，重写方法</td></tr>' +
        '<tr><td>性能</td><td>创建快，调用略慢（反射）</td><td>创建慢，调用快（字节码）</td></tr>' +
        '<tr><td>局限</td><td>只能增强接口方法</td><td>无法代理 final 类/方法、private 方法</td></tr></table>' +
        '<p><strong>Spring Boot 2.x 默认</strong>：<code>spring.aop.proxy-target-class=true</code>，即优先 CGLIB。因为 CGLIB 能代理没有接口的类，且现在性能差距很小。</p>' +
        '<p><strong>关键坑</strong>：同一个类内部方法自调用（<code>this.method()</code>）不走代理，事务/AOP 失效。解决：注入自己、<code>AopContext.currentProxy()</code>、或拆分到另一个 Bean。</p>'
    },
    {
      q: 'Bean 的生命周期完整讲一遍',
      star: 5,
      a: '<p>从创建到销毁：</p>' +
        '<ol>' +
        '<li><strong>实例化</strong>：反射调用构造方法。</li>' +
        '<li><strong>属性填充</strong>：<code>populateBean</code>，注入依赖（可能触发循环依赖）。</li>' +
        '<li><strong>Aware 回调</strong>：<code>BeanNameAware</code>、<code>BeanFactoryAware</code>、<code>ApplicationContextAware</code>。</li>' +
        '<li><strong>BeanPostProcessor.postProcessBeforeInitialization</strong>。</li>' +
        '<li><strong>初始化</strong>：<code>@PostConstruct</code> → <code>InitializingBean.afterPropertiesSet()</code> → <code>init-method</code>。</li>' +
        '<li><strong>BeanPostProcessor.postProcessAfterInitialization</strong>：AOP 代理通常在这里生成。</li>' +
        '<li><strong>使用</strong>。</li>' +
        '<li><strong>销毁</strong>：<code>@PreDestroy</code> → <code>DisposableBean.destroy()</code> → <code>destroy-method</code>。</li>' +
        '</ol>' +
        '<p><strong>作用域</strong>：singleton（默认，容器内一个）、prototype（每次获取新建，销毁不归容器管）、request/session/application（Web）。</p>' +
        '<p><strong>单例 Bean 线程安全吗</strong>：不保证。Spring 只负责创建，不负责并发。有状态字段要注意，尽量设计成无状态。</p>'
    },
    {
      q: 'Spring 三级缓存怎么解决循环依赖？为什么需要三级？',
      star: 5,
      a: '<p><strong>循环依赖</strong>：A 依赖 B，B 依赖 A。构造器注入无法解决（对象还没创建就要依赖），<strong>Setter/字段注入</strong>可以靠提前暴露引用解决。</p>' +
        '<p><strong>三级缓存</strong>：</p>' +
        '<ul>' +
        '<li><code>singletonObjects</code>（一级）：完整的单例 Bean。</li>' +
        '<li><code>earlySingletonObjects</code>（二级）：提前暴露的<strong>原始/代理</strong> Bean，尚未完成属性填充。</li>' +
        '<li><code>singletonFactories</code>（三级）：<code>ObjectFactory</code>，调用 <code>getObject()</code> 可生成早期引用（必要时创建 AOP 代理）。</li>' +
        '</ul>' +
        '<p><strong>流程（A ↔ B）</strong>：</p>' +
        '<ol>' +
        '<li>创建 A，实例化后把 A 的 ObjectFactory 放入三级缓存。</li>' +
        '<li>填充 A 的属性，发现依赖 B，去创建 B。</li>' +
        '<li>B 实例化后填充属性，发现依赖 A，从三级缓存拿到工厂，生成 A 的早期引用，放入二级缓存，删除三级。</li>' +
        '<li>B 完成初始化，放入一级缓存；A 拿到 B 完成初始化，放入一级缓存。</li>' +
        '</ol>' +
        '<p><strong>为什么需要三级而不是两级</strong>：如果只有二级，A 被提前暴露时必须立刻决定「是否生成代理」。但 AOP 代理是在初始化后由 <code>BeanPostProcessor</code> 生成的，提前生成会破坏生命周期。三级缓存用工厂<strong>延迟</strong>决定：只有真发生循环依赖时才提前生成代理，正常 Bean 不受影响。</p>' +
        '<p><strong>解决不了的情况</strong>：构造器注入循环依赖、prototype 作用域、<code>@Async</code> 代理导致的特殊循环。Spring Boot 2.6+ 默认禁止循环依赖，需要 <code>spring.main.allow-circular-references=true</code> 显式开启（不推荐，应重构）。</p>'
    },
    {
      q: '@Transactional 什么情况下会失效？',
      star: 5,
      a: '<p>这是必问题，至少说出 6 种：</p>' +
        '<ol>' +
        '<li><strong>方法不是 public</strong>：Spring 事务代理默认只拦截 public 方法（CGLIB 也无法增强 private/final）。</li>' +
        '<li><strong>同类内部自调用</strong>：<code>this.methodB()</code> 不走代理，B 上的事务不生效。</li>' +
        '<li><strong>异常被吞掉</strong>：try-catch 后没有重新抛出，事务管理器认为没异常，正常提交。</li>' +
        '<li><strong>异常类型不匹配</strong>：默认只回滚 <code>RuntimeException</code> 和 <code>Error</code>，受检异常不回滚。要 <code>rollbackFor = Exception.class</code>。</li>' +
        '<li><strong>类没有被 Spring 管理</strong>：没有 <code>@Service/@Component</code>，或自己 <code>new</code> 的对象。</li>' +
        '<li><strong>数据库引擎不支持事务</strong>：MyISAM 没有事务，必须 InnoDB。</li>' +
        '<li><strong>传播行为设置不当</strong>：如 <code>NOT_SUPPORTED</code>、<code>NEVER</code>。</li>' +
        '<li><strong>多线程</strong>：事务绑定在 ThreadLocal 的连接上，子线程不共享。</li>' +
        '<li><strong>被 final/static 方法</strong>：CGLIB 无法重写。</li>' +
        '</ol>' +
        '<p><strong>项目落点</strong>：下单方法里「扣库存 + 写订单」必须在同一事务；发送 MQ 消息要放在事务提交后（<code>TransactionSynchronization.afterCommit</code> 或本地消息表），否则可能消息发了但事务回滚。</p>'
    },
    {
      q: '事务的传播行为有哪几种？',
      star: 4,
      a: '<p>7 种，重点记前三个：</p>' +
        '<table><tr><th>传播行为</th><th>含义</th></tr>' +
        '<tr><td>REQUIRED（默认）</td><td>有事务就加入，没有就新建</td></tr>' +
        '<tr><td>REQUIRES_NEW</td><td>总是新建事务，挂起当前事务（内外互不影响）</td></tr>' +
        '<tr><td>NESTED</td><td>嵌套事务，基于 savepoint，外层回滚会带上内层，内层回滚不影响外层</td></tr>' +
        '<tr><td>SUPPORTS</td><td>有就加入，没有就以非事务运行</td></tr>' +
        '<tr><td>NOT_SUPPORTED</td><td>以非事务运行，挂起当前事务</td></tr>' +
        '<tr><td>MANDATORY</td><td>必须在事务中，否则抛异常</td></tr>' +
        '<tr><td>NEVER</td><td>必须不在事务中，否则抛异常</td></tr></table>' +
        '<p><strong>场景</strong>：记录操作日志用 <code>REQUIRES_NEW</code>，保证业务回滚日志还在；<code>NESTED</code> 适合「部分失败可容忍」的子流程。</p>' +
        '<p><strong>坑</strong>：<code>REQUIRES_NEW</code> 会占用新连接，外层事务未提交时内层读不到外层未提交的数据，且并发高时容易连接池耗尽。</p>'
    },
    {
      q: 'Spring MVC 一次请求的完整流程？',
      star: 4,
      a: '<ol>' +
        '<li>请求到达 <code>DispatcherServlet</code>（前端控制器）。</li>' +
        '<li>遍历 <code>HandlerMapping</code>，根据 URL 找到 Handler 和拦截器链。</li>' +
        '<li>通过 <code>HandlerAdapter</code> 调用 Handler（Controller 方法）。</li>' +
        '<li>执行参数解析（<code>@RequestParam</code>、<code>@RequestBody</code> 等）和返回值处理。</li>' +
        '<li>返回 <code>ModelAndView</code> 或直接写响应（<code>@ResponseBody</code> 走 <code>HttpMessageConverter</code>）。</li>' +
        '<li><code>ViewResolver</code> 解析视图并渲染（前后端分离时通常不涉及）。</li>' +
        '<li>拦截器 <code>postHandle</code>、<code>afterCompletion</code>。</li>' +
        '</ol>' +
        '<p><strong>拦截器执行顺序</strong>：<code>preHandle</code> 正序 → Controller → <code>postHandle</code> 逆序 → <code>afterCompletion</code> 逆序。任一 <code>preHandle</code> 返回 false，后续都不执行。</p>'
    },
    {
      q: '过滤器、拦截器、AOP 的区别？',
      star: 4,
      a: '<table><tr><th></th><th>Filter</th><th>Interceptor</th><th>AOP</th></tr>' +
        '<tr><td>层级</td><td>Servlet 容器</td><td>Spring MVC</td><td>Spring 容器</td></tr>' +
        '<tr><td>作用范围</td><td>所有请求（含静态资源）</td><td>Controller 方法</td><td>任意 Spring Bean 方法</td></tr>' +
        '<tr><td>能否拿到 Bean</td><td>默认不能（可注入）</td><td>能</td><td>能</td></tr>' +
        '<tr><td>典型用途</td><td>编码、CORS、XSS、请求包装</td><td>登录校验、权限、日志</td><td>事务、方法级日志、限流</td></tr></table>' +
        '<p>项目里：JWT 校验放在拦截器（能拿到 <code>HandlerMethod</code> 做注解鉴权），跨域和请求体包装放在过滤器，事务和接口耗时统计用 AOP。</p>'
    },
    {
      q: 'Spring Boot 自动配置的原理？',
      star: 5,
      a: '<p>核心注解 <code>@SpringBootApplication</code> = <code>@SpringBootConfiguration</code> + <code>@EnableAutoConfiguration</code> + <code>@ComponentScan</code>。</p>' +
        '<p><strong>自动配置流程</strong>：</p>' +
        '<ol>' +
        '<li><code>@EnableAutoConfiguration</code> 通过 <code>@Import(AutoConfigurationImportSelector.class)</code> 导入选择器。</li>' +
        '<li>选择器读取 <code>META-INF/spring.factories</code>（Boot 2.x）或 <code>META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports</code>（Boot 3.x）中的自动配置类列表。</li>' +
        '<li>根据条件注解过滤：<code>@ConditionalOnClass</code>、<code>@ConditionalOnMissingBean</code>、<code>@ConditionalOnProperty</code> 等。</li>' +
        '<li>满足条件的配置类生效，创建 Bean。</li>' +
        '</ol>' +
        '<p><strong>为什么能做到「约定优于配置」</strong>：starter 把依赖和默认配置打包，自动配置类在类路径存在相应库时生效，用户可以用 <code>application.yml</code> 覆盖，或自己定义 Bean 覆盖（<code>@ConditionalOnMissingBean</code>）。</p>' +
        '<p><strong>怎么排查自动配置</strong>：<code>--debug</code> 启动看条件评估报告；<code>ConditionEvaluationReport</code>。</p>'
    },
    {
      q: '常用的 Spring 注解有哪些？分别什么作用？',
      star: 3,
      a: '<ul>' +
        '<li><strong>组件</strong>：<code>@Component</code>、<code>@Service</code>、<code>@Repository</code>、<code>@Controller</code>、<code>@RestController</code>。</li>' +
        '<li><strong>注入</strong>：<code>@Autowired</code>（按类型）、<code>@Qualifier</code>（按名称）、<code>@Resource</code>（按名称，JDK）。</li>' +
        '<li><strong>配置</strong>：<code>@Configuration</code>、<code>@Bean</code>、<code>@Value</code>、<code>@ConfigurationProperties</code>。</li>' +
        '<li><strong>Web</strong>：<code>@RequestMapping</code>、<code>@GetMapping</code>、<code>@PathVariable</code>、<code>@RequestParam</code>、<code>@RequestBody</code>、<code>@ResponseBody</code>。</li>' +
        '<li><strong>事务/切面</strong>：<code>@Transactional</code>、<code>@Aspect</code>、<code>@Around</code>、<code>@Pointcut</code>。</li>' +
        '<li><strong>异常</strong>：<code>@ControllerAdvice</code>、<code>@ExceptionHandler</code>。</li>' +
        '<li><strong>条件</strong>：<code>@ConditionalOnClass</code>、<code>@ConditionalOnMissingBean</code>。</li>' +
        '</ul>' +
        '<p>注意 <code>@Autowired</code> 按类型注入，同类型多个 Bean 会报错，需要 <code>@Qualifier</code> 或 <code>@Primary</code>。</p>'
    },
    {
      q: 'MyBatis 中 #{} 和 ${} 的区别？',
      star: 4,
      a: '<table><tr><th></th><th>#{}</th><th>${}</th></tr>' +
        '<tr><td>处理方式</td><td>预编译，替换为 <code>?</code> 占位符</td><td>字符串直接拼接</td></tr>' +
        '<tr><td>SQL 注入</td><td>安全</td><td>有风险</td></tr>' +
        '<tr><td>类型处理</td><td>自动类型转换、加引号</td><td>原样拼入，需自己处理</td></tr>' +
        '<tr><td>适用</td><td>参数值</td><td>表名、列名、排序字段等动态结构</td></tr></table>' +
        '<p><strong>为什么 #{} 能防注入</strong>：PreparedStatement 把 SQL 结构和参数分开传输，参数只作为值，不参与语法解析。</p>' +
        '<p><strong>必须用 ${} 的场景</strong>：动态表名、<code>ORDER BY ${column}</code>。这时要做<strong>白名单校验</strong>，不能直接拼用户输入。</p>' +
        '<p><strong>项目落点</strong>：MyBatis-Plus 的 <code>LambdaQueryWrapper</code> 底层也是参数绑定，不要为了动态条件自己拼字符串。</p>'
    },
    {
      q: 'MyBatis 的一级缓存和二级缓存有什么区别？',
      star: 4,
      a: '<ul>' +
        '<li><strong>一级缓存</strong>：SqlSession 级别，默认开启。同一个 SqlSession 内相同 SQL 和参数只查一次。SqlSession 关闭/提交/回滚、执行增删改后清空。</li>' +
        '<li><strong>二级缓存</strong>：Mapper（namespace）级别，跨 SqlSession，需手动开启（<code>cacheEnabled=true</code> + <code>&lt;cache/&gt;</code> 或 <code>@CacheNamespace</code>）。多个 SqlSession 共享。</li>' +
        '</ul>' +
        '<p><strong>二级缓存的问题</strong>：</p>' +
        '<ul>' +
        '<li>多表关联时，某个表更新可能不会清空另一个 Mapper 的缓存，导致脏读。</li>' +
        '<li>分布式环境下各节点缓存不一致。</li>' +
        '<li>缓存对象必须可序列化。</li>' +
        '</ul>' +
        '<p>所以生产上通常<strong>关闭二级缓存</strong>，用 Redis 做应用级缓存，一致性更可控。</p>'
    },
    {
      q: 'MyBatis 的执行流程？',
      star: 3,
      a: '<ol>' +
        '<li>读取 <code>mybatis-config.xml</code> 和 Mapper 文件，构建 <code>Configuration</code>。</li>' +
        '<li>通过 <code>SqlSessionFactoryBuilder</code> 创建 <code>SqlSessionFactory</code>。</li>' +
        '<li>打开 <code>SqlSession</code>，拿到 Mapper 的代理对象。</li>' +
        '<li>调用 Mapper 方法，经 <code>MapperProxy</code> 找到 <code>MappedStatement</code>。</li>' +
        '<li><code>Executor</code> 处理一级缓存、事务，交给 <code>StatementHandler</code>。</li>' +
        '<li><code>ParameterHandler</code> 设置参数，<code>StatementHandler</code> 执行 SQL。</li>' +
        '<li><code>ResultSetHandler</code> 把结果映射成对象。</li>' +
        '</ol>' +
        '<p><strong>插件（Interceptor）</strong>可以拦截 Executor、StatementHandler、ParameterHandler、ResultSetHandler 四大对象，实现分页、SQL 日志、乐观锁等。MyBatis-Plus 的分页插件就是拦截 StatementHandler 改写 SQL。</p>'
    },
    {
      q: 'Spring 单例 Bean 是线程安全的吗？',
      star: 4,
      a: '<p><strong>不是</strong>。Spring 只负责创建单例，不保证线程安全。是否存在并发问题取决于 Bean 是否有<strong>可变状态</strong>。</p>' +
        '<ul>' +
        '<li><strong>无状态 Bean</strong>（Controller、Service 只调用方法，不存请求数据）：线程安全。</li>' +
        '<li><strong>有状态 Bean</strong>（成员变量存用户信息、计数器）：需要自己加锁、用 ThreadLocal，或改成 prototype。</li>' +
        '</ul>' +
        '<p>常见错误：在 Controller 里定义 <code>private User currentUser;</code>，并发请求会互相覆盖。正确做法是用方法参数或 ThreadLocal（记得 remove）。</p>' +
        '<p>项目里 JWT 解析出的 userId 就放 ThreadLocal，拦截器 set、<code>afterCompletion</code> remove，避免线程池复用导致串数据。</p>'
    }
  ]
});
