import { ArrowDown, ArrowRight } from "lucide-react";

const guides = {
  evaluation: {
    opening: "自我优化的关键不是 Agent 宣布自己变好了，而是谁定义成功、谁执行修改、谁独立检查结果。",
    choice: "诊断、候选修改、同题重放和采用决策分开；固定基线和检查条件，并为结论保留原始回执。",
    alternative: "只比较 Agent 的总结或反复重跑到通过，很容易把评分器偏好、测试泄漏和样本过拟合当成改进。",
    failure: "EnterpriseOps 候选在 Validation 达到 3/3 任务、31/31 检查，但一次性 Held-out 只完成 1/8，因此拒绝推广。检索排序改善也不能替代答案引用正确性。",
    cost: "冻结样本与独立验证需要额外运行成本，并限制快速试错；同时小样本只能支撑局部结论，不能自然外推到生产。",
    proof: "先选一个垂直场景，指明改变的是执行合同、检索还是业务策略，再看候选、基线和判决。Memory Keep 只限 shadow Validation，不能说成已生产修复。",
    next: "/details/context", nextLabel: "接着讲：结果怎样支持下一次工作",
  },
  agents: {
    opening: "难点不是多启动几个 Agent，而是有人要为分工、交接、取消和最终结果负责。",
    choice: "Pi 持有 Session 的执行循环、上下文和恢复；Room 只增加显式派发、公共事件和汇总。",
    alternative: "强 Kernel 能集中规定流程，但当它与 Pi 同时管理执行和终态，就需要维护两套状态的一致性。",
    failure: "Pi 已接受派发，Kernel 在记录 ACK 前崩溃：任务可能还活着，但协调层已经不知道该取消谁。删掉 Kernel 后，未路由 Session 的事件又曾被误投影为 Room 进度。",
    cost: "轻量化没有消除异步协调。仍要处理 ACK、事件归属、重放与取消扇出；按需复核也要求 Facilitator 作出判断。",
    proof: "先展示运行责任图，再展开下方 Git 反证和 Light Room 取舍表。最小 canary 只证明已记录的协作、Stop 与刷新路径，不代表大型项目全面稳定。",
    next: "/details/sandbox", nextLabel: "接着讲：怎样验证改进",
  },
  frontend: {
    opening: "七种视图不是七次换皮，而是对“用户此刻要判断什么”给出的不同答案。",
    choice: "公开时间线讲因果，任务关系讲责任与依赖，Session 窗口承载执行细节；它们投影同一份 Runtime 状态。",
    alternative: "单一列表容易扫状态，但难解释交接；单一关系图能表达连接，却不适合阅读长过程和实际操作。",
    failure: "把所有东西塞进一种视图，会让结构显得完整，却仍然解释不了谁在等待谁、哪份结果可用、哪里需要继续。",
    cost: "复合视图增加导航与投影维护成本。需要稳定对象身份和一致的来源关系，不能让每个视图各养一套生命周期。",
    proof: "按下面的时间轴选一个阶段，依次讲当时问题、选择、反证、后续改变。Git 能证明改动发生，不自动证明用户体验或吞吐提升。",
    next: "/details/agents", nextLabel: "回看：执行与协作的责任边界",
  },
  context: {
    opening: "上下文不是越多越好：能保存、能召回和本轮应该使用，是三个不同问题。",
    choice: "项目事实留在项目文档，资料留在 Knowledge，长期偏好进入受治理 Memory；当前任务按权限和相关性组装片段。",
    alternative: "整段历史直接注入实现简单，但会混入过期状态、一次性任务和不相关内容，也扩大隐私与 token 成本。",
    failure: "把零散词或临时任务当长期记忆，会让后续回答持续携带噪声；把相似度当答案正确率，又会把检索优化误报成业务改善。",
    cost: "分域增加治理、来源追踪和失效处理。检索可能漏掉隐含背景，因此需要返回来源、允许核对与删除，而不是默默扩大召回。",
    proof: "沿 History → 整理结果 → 召回回执 → 来源回跳讲一遍。下面的公开快照与检索实验各有口径，不等于生产记忆已经长期有效。",
    next: "/details/input", nextLabel: "接着讲：上下文怎样进入日常输入",
  },
  input: {
    opening: "输入法优化的是连续按键下可用的候选，不是通用模型榜单，也不是服务端吞吐。",
    choice: "Rime 保留拼音解码；明确触发的 AI 生成使用相关上下文。推理端复用稳定 token 前缀，并在新输入到来时让旧候选失效。",
    alternative: "通用大模型更灵活，通用推理服务擅长并发吞吐；但它们的目标不必然匹配单用户本地资源与完整 Top-3 尾延迟。",
    failure: "字符前缀没变不代表 token 前缀没变；错误复用 KV 会带入旧状态。继续重复训练也可能损伤候选多样性，因此不是训练越久越好。",
    cost: "小模型与专用推理换来资源和延迟上的适配，也牺牲通用能力、增加训练和缓存正确性的维护成本。",
    proof: "先展示真实候选，再讲 token-LCP 与 latest-wins 图，最后读同条件 p50/p95。区分 token 命中、整句 exact、候选多样性；不要合成一个准确率。",
    next: "/details/context", nextLabel: "回看：上下文保存与召回的边界",
  },
} as const;

export function DecisionGuide({ topic }: { topic: keyof typeof guides }) {
  const guide = guides[topic];
  return <details className="decision-guide" id="decision-guide">
    <summary>怎样把这段设计讲清楚？<span>问题 → 选择 → 反证 → 代价 → 证据</span></summary>
    <p className="decision-opening">{guide.opening}</p>
    <dl>
      <div><dt>架构选择</dt><dd>{guide.choice}</dd></div>
      <div><dt>为什么不选另一条路</dt><dd>{guide.alternative}</dd></div>
      <div><dt>踩过的坑与反证</dt><dd>{guide.failure}</dd></div>
      <div><dt>保留下来的代价</dt><dd>{guide.cost}</dd></div>
      <div><dt>现场展示什么证据</dt><dd>{guide.proof}</dd></div>
    </dl>
    {topic === "agents" ? <figure className="ownership-failure-diagram">
      <figcaption>最危险的缝隙：执行已接受，协调层却没记住。</figcaption>
      <ol>
        <li><strong>Room 派发</strong><span>向 Pi 提交任务</span><ArrowDown aria-hidden="true" size={18}/></li>
        <li><strong>Pi 已接受</strong><span>任务开始执行</span><ArrowDown aria-hidden="true" size={18}/></li>
        <li><strong>ACK 写入前崩溃</strong><span>协调层丢失确认</span><ArrowDown aria-hidden="true" size={18}/></li>
        <li><strong>执行与协调失配</strong><span>任务可能仍活着，不能把 unknown 当成已停止</span></li>
      </ol>
      <p>设计收敛：Pi 保持执行 owner；Room 通过派发身份、回执和重放恢复对应关系，不再维护第二套执行循环。</p>
      <a href="/diagrams/dispatch-ack-gap.mmd">查看可维护原图<ArrowRight size={14}/></a>
    </figure> : null}
    <a href={guide.next}>{guide.nextLabel}<ArrowRight size={15}/></a>
  </details>;
}
