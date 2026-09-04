import { ArrowRight } from "lucide-react";

export function TaskIntroduction() {
  return (
    <section aria-labelledby="story-title" className="task-introduction">
      <h1 id="story-title">多个 Agent 协作完成任务，<br />让每一次改进都有依据。</h1>
      <p>PAW 是本地优先的 Agent 工作台。从一个用户目标出发，组织协作、检查交付，再把经过验证的改进带到后续工作。</p>
      <div className="task-brief">
        <div><h2>从这件事开始：一起设计 PAW。</h2><p>把输入、记忆、多 Agent 和桌面组织成一个能继续工作的系统。各条产品线需要独立推进，也必须对齐接口、处理分歧，最后交出一份一致的方案。</p></div>
        <div><h3>最后要交付什么？</h3><p>四条产品线的设计文档、相互依赖的接口约定，以及一份标明已解决问题和待办事项的汇总。</p><a href="#agents">看任务怎样被完成<ArrowRight size={16} /></a></div>
      </div>
      <nav aria-label="任务展示阅读顺序" className="journey-links">
        <a href="#agents">协作交付</a><ArrowRight aria-hidden="true" size={14} />
        <a href="#reliability">评测问题</a><ArrowRight aria-hidden="true" size={14} />
        <a href="#improvement">验证改进</a><ArrowRight aria-hidden="true" size={14} />
        <a href="#memory">继续工作</a>
      </nav>
      <small>交互演示使用公开合成场景；实验结果另附来源与验证范围。</small>
    </section>
  );
}

export function CollaborationResult() {
  return (
    <aside className="story-handoff" aria-label="协作交付与下一步">
      <h3>协作要汇成一份交付。</h3>
      <p>在这个立项场景里，Input、Memory、多 Agent 与 PAWOS 各自形成方案，交换接口与依赖，再由 Facilitator 汇总。星系中的四条轨道，最终对应四份工作文档和一个共同结果。</p>
      <p>独立工作可以并行，依赖问题需要交接；需要额外判断时再引入复核。用户最终看到的是交付、依据和未完成项。</p>
      <a href="#reliability">有了交付，怎样检查它真的满足要求？<ArrowRight size={16} /></a>
    </aside>
  );
}

export function ImprovementSection() {
  return (
    <section className="improvement-section" id="improvement" aria-labelledby="improvement-title">
      <header><span className="slide-index">03 · 验证并保留改进</span><h2 id="improvement-title">这次修好了，下次能留下什么？</h2><p>诊断找到问题之后，改进必须落到具体对象：代码、Skill、提示词或执行策略。固定比较条件，检查原任务与其他样本，再决定采用候选还是继续保留原方案。</p></header>
      <ol className="improvement-flow" aria-label="改进验证流程">
        <li><strong>定位改变对象</strong><p>从失败证据找到负责模块，记录这次准备改变什么。</p></li>
        <li><strong>比较候选与基线</strong><p>对同一任务重跑，比较完成质量、错误和资源消耗。</p></li>
        <li><strong>检查其他样本</strong><p>按实验设计检查回归或保留样本，观察是否带来退步。</p></li>
        <li><strong>保留或拒绝</strong><p>在已验证范围内保留有效候选；失败时继续使用基线。</p></li>
      </ol>
      <div className="improvement-evidence">
        <h3>已有实验，怎样做出不同决定？</h3>
        <p>下面是独立实验的公开结果，用来解释选择依据；它们与上面的立项及故障回放不是同一次运行。</p>
        <article><div><h4>Memory：保留为后续验证候选</h4><p>V5 在固定五例 shadow Validation 中完成 5/5 决策，四个长期记忆案例可召回，临时任务拒记，回滚与重放通过。</p><small>Keep 仅限 shadow Validation；没有生产写入或安装验收。</small></div><a href="/evidence/vertical-evals/memory-maintenance-validation-20260902.v1.json" target="_blank" rel="noreferrer">查看 Memory 回执<ArrowRight size={15} /></a></article>
        <article><div><h4>EnterpriseOps：拒绝推广</h4><p>候选在 Validation 达到 3/3 任务、31/31 检查，但一次性 Held-out 只完成 1/8 任务，因此拒绝推广。</p><small>同一案例通过之后，还需要检查其他任务；失败结果继续保留。</small></div><a href="/evidence/vertical-evals/enterpriseops-csm-suite-v2-summary-20260903.v2.json" target="_blank" rel="noreferrer">查看 EnterpriseOps 回执<ArrowRight size={15} /></a></article>
        <a className="improvement-more" href="/details/sandbox">进入实验室，查看候选、基线与完整比较<ArrowRight size={16} /></a>
      </div>
      <aside className="story-handoff"><h3>系统改进与任务记忆，一起支撑后续工作。</h3><p>被采用的代码或策略改变系统怎样执行；项目文档与相关记忆帮助 Agent 理解接下来做什么。下面继续看 PAW 怎样整理工作上下文，并在需要时找回来。</p><a href="#memory">看下一次工作怎样接上<ArrowRight size={16} /></a></aside>
    </section>
  );
}
