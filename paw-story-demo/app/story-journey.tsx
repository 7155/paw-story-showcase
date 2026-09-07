import { ArrowRight } from "lucide-react";
import story from "../../showcase/task-story.v1.json";
import { CandidateComparison } from "./candidate-comparison";

export function TaskIntroduction() {
  return (
    <section aria-labelledby="story-title" className="task-introduction">
      <div className="task-introduction-heading"><h1 id="story-title">一起完成任务。<br/><span>让下一次更好。</span></h1></div>
      <p>多 Agent 协作、记忆与测评，<br/>在一个工作台里继续。</p>
      <div className="task-brief"><details><summary>演示任务：一起设计 PAW 工作台</summary><p>{story.request}</p><p>{story.deliverable}</p></details><a className="task-start" href="#agents">开始体验<ArrowRight size={16}/></a></div>
      <small>真实前端 · 公开合成数据</small>
    </section>
  );
}

export function CollaborationResult() {
  return (
    <aside className="story-handoff" aria-label="协作交付与下一步">
      <h3>协作要汇成一份交付。</h3>
      <p>在这个立项场景里，Input、Memory、多 Agent 与 PAWOS 各自形成方案，交换接口与依赖，再由 Facilitator 汇总。星系中的四条轨道，最终对应四份工作文档和一个共同结果。</p>
      <p>{story.incident}</p>
      <a href="#reliability">有了交付，怎样检查它真的满足要求？<ArrowRight size={16} /></a>
    </aside>
  );
}

export function ImprovementSection() {
  return (
    <section className="improvement-section" id="improvement" aria-labelledby="improvement-title">
      <header className="improvement-heading"><div><h2 id="improvement-title">改进，要经得起比较。</h2><p>固定任务与判据，留下通过验证的修改。</p></div><a href="/details/sandbox">查看技术详情<ArrowRight size={15}/></a></header>
      <ol className="improvement-steps" aria-label="改进验证流程">
        {["定位问题", "比较候选", "检查回归", "保留或拒绝"].map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
      </ol>
      <CandidateComparison />
      <details className="improvement-evidence improvement-evidence-disclosure">
        <summary>查看独立实验依据<span>Memory · EnterpriseOps</span></summary>
        <div>
        <p>下面是独立实验的公开结果，用来解释选择依据；它们与上面的立项及故障回放不是同一次运行。</p>
        <article><div><h4>Memory：保留为后续验证候选</h4><p>V5 在固定五例 shadow Validation 中完成 5/5 决策，四个长期记忆案例可召回，临时任务拒记，回滚与重放通过。</p><small>Keep 仅限 shadow Validation；没有生产写入或安装验收。</small></div><a href="/evidence/vertical-evals/memory-maintenance-validation-20260902.v1.json" target="_blank" rel="noreferrer">查看 Memory 回执<ArrowRight size={15} /></a></article>
        <article><div><h4>EnterpriseOps：拒绝推广</h4><p>候选在 Validation 达到 3/3 任务、31/31 检查，但一次性 Held-out 只完成 1/8 任务，因此拒绝推广。</p><small>同一案例通过之后，还需要检查其他任务；失败结果继续保留。</small></div><a href="/evidence/vertical-evals/enterpriseops-csm-suite-v2-summary-20260903.v2.json" target="_blank" rel="noreferrer">查看 EnterpriseOps 回执<ArrowRight size={15} /></a></article>
        </div>
      </details>
      <footer className="improvement-next"><p>换成你的数据，走一遍测评与导出。</p><a href="#lab">进入 Agent Lab<ArrowRight size={16}/></a></footer>
    </section>
  );
}
