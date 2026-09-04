import {
  ArrowRight,
  CircleAlert,
  FileCheck2,
  GitBranch,
  ShieldCheck,
  SquareArrowOutUpRight,
} from "lucide-react";

const proofSignals = [
  {
    value: "4",
    label: "独立验证链",
    detail: "Enterprise RAG · EnterpriseOps · CloudOps · Memory",
  },
  {
    value: "3/31 → 26/31",
    label: "执行链修复",
    detail: "Host-private verifier · source-local candidate",
  },
  {
    value: ".6128 → .8872",
    label: "RAG nDCG@10",
    detail: "16-query validation · retrieval only",
  },
] as const;

const resumeCases = [
  {
    title: "Agent Runtime / Agent Lab",
    summary:
      "把 source-local Pi、能力令牌 Tool Gateway、Host-private Verifier、Trace/Eval 和 Keep/Reject 组合成一条可审计实验链；Validation winner 仍要经过一次性 Held-out，失败候选不被重跑成好结果。",
    evidence: "EnterpriseOps · 1/8 Held-out · Promotion rejected",
    href: "/details/sandbox",
    linkLabel: "看四个垂直实验",
    Icon: FileCheck2,
  },
  {
    title: "多 Agent 前端选型",
    summary:
      "沿 Git 历史还原结构化 Room、Kernel、公开对话、任务图、Light Room、空间 Mesh 到时间线的七次答案；最终让 Pi Session 保持 Runtime owner，Room 只做协作投影。",
    evidence: "12 个因果阶段 · 0a9f5c9c · −115,912 行",
    href: "/details/frontend",
    linkLabel: "看前端演进",
    Icon: GitBranch,
  },
  {
    title: "输入法与受治理上下文",
    summary:
      "从 Rime-first 的组合态边界，到提交后短联想、显式生成、Memory / Knowledge 召回与可撤销回执；普通输入不被 AI 打断，来源和权限随结果一起展示。",
    evidence: "Rime owner · post-commit · opt-in context",
    href: "#input",
    linkLabel: "回看输入链",
    Icon: ShieldCheck,
  },
] as const;

const architectureFlow = [
  {
    label: "目标与上下文",
    title: "用户目标进入 Pi Session",
    detail: "TaskBrief、ContextRefs 与 SkillRefs 只携带本轮真正需要的边界。",
  },
  {
    label: "执行与协作",
    title: "Session 执行，Room 组合",
    detail: "Pi 保持 Agent / Tool loop；Room 只增加显式分派、伙伴身份与一个 Root。",
  },
  {
    label: "权限与数据",
    title: "Tool、Memory 各守 owner",
    detail: "Tool 经过 schema、权限与回执；Memory、Knowledge 保持分域治理。",
  },
  {
    label: "验证与保留",
    title: "Trace → Replay → Eval",
    detail: "同一 Case 重跑并通过硬门槛后，才产生 Verification Receipt。",
  },
] as const;

const technologyStack = [
  {
    layer: "PAWOS 前端",
    technologies: "React 19 · TypeScript 5.9 · Vite · Electron",
    responsibility: "投影 App、窗口、Room 时间线与真实 Runtime 状态，不复制第二份生命周期。",
  },
  {
    layer: "Agent Runtime",
    technologies: "Pi Session · Node.js · Python 3.12 · HTTP / SSE",
    responsibility: "承接 Provider / Tool loop、上下文压缩、Steer、Stop、恢复与流式事件。",
  },
  {
    layer: "合同与状态",
    technologies: "JSON Schema / AJV · SQLite · Zustand · TanStack Query",
    responsibility: "让命令、事件、权限和回执可验证；SQLite 保持本地权威数据。",
  },
  {
    layer: "可选本地智能",
    technologies: "Rime / librime · Squirrel · sentence-transformers · MLX / MLX-LM · usearch",
    responsibility: "负责原生拼音、本地候选、Embedding、Rerank 与 ANN；能力按需安装。",
  },
  {
    layer: "验证体系",
    technologies: "Trace / Replay / Eval · Vitest · Playwright · pytest",
    responsibility: "区分 applied、tested 与 verified，并覆盖合同、同题回放和真实浏览器行为。",
  },
  {
    layer: "公开展示层",
    technologies: "Vinext · React 19 · Vite 8 · Three.js",
    responsibility: "只负责 oshow 的交互叙事与公开合成投影，不是 PAW 私有 Runtime。",
  },
] as const;

export function ResumeSection() {
  return (
    <section aria-labelledby="resume-title" className="resume-section">
      <div className="resume-lead" id="resume">
        <div className="resume-lead-copy">
          <h2 id="resume-title">把 Agent 放回真实工作的现场。</h2>
          <p>
            我关注的不是再造一个聊天框，而是把输入、Memory、Tool、Session 和评测放回同一个可追溯的工作链：先让系统真的跑，再用失败证据决定哪里值得修。
          </p>
          <nav aria-label="项目履历与证据入口" className="resume-actions">
            <a className="resume-action resume-action--primary" href="#framework">
              查看系统框架
              <ArrowRight size={14} />
            </a>
            <a className="resume-action" href="/details/sandbox">
              打开证据实验室
              <ArrowRight size={14} />
            </a>
            <a
              className="resume-action"
              href="https://github.com/7155"
              rel="noreferrer"
              target="_blank"
            >
              GitHub / 7155
              <SquareArrowOutUpRight size={14} />
            </a>
          </nav>
        </div>
        <aside className="resume-statement">
          <strong>OS、Runtime 与 Evidence，必须在同一条工作链上对齐。</strong>
          <p>PAW 是本地优先的 Agent 工作台；下面的数字都保留 split、失败分支和未验证边界。</p>
        </aside>
      </div>

      <dl aria-label="公开可核查的项目结果" className="resume-proof-ledger">
        {proofSignals.map((signal) => (
          <div key={signal.label}>
            <dt>{signal.label}</dt>
            <dd>
              <strong>{signal.value}</strong>
              <small>{signal.detail}</small>
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="framework-title" className="technical-foundation" id="framework">
        <header className="technical-foundation-header">
          <h3 id="framework-title">一个目标，怎样穿过多 Agent、权限与评测？</h3>
          <p>
            框架先回答谁拥有状态和结束条件，技术栈再回答每一层怎样落地。Room 不重建 Pi，展示站也不重建 PAW。
          </p>
        </header>

        <ol aria-label="PAW 系统框架" className="architecture-flow">
          {architectureFlow.map((item, index) => (
            <li key={item.label}>
              <small>{item.label}</small>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              {index < architectureFlow.length - 1 ? <ArrowRight aria-hidden="true" size={17} /> : null}
            </li>
          ))}
        </ol>

        <div className="technology-stack-heading">
          <h4>技术栈按责任层展开。</h4>
          <p>产品 Runtime、可选本地能力与公开展示层分开列出，避免把依赖名堆成没有 owner 的 Logo 墙。</p>
        </div>
        <div className="technology-stack-table-wrap">
          <table className="technology-stack-table">
            <thead>
              <tr>
                <th scope="col">责任层</th>
                <th scope="col">核心技术</th>
                <th scope="col">在系统里负责什么</th>
              </tr>
            </thead>
            <tbody>
              {technologyStack.map((item) => (
                <tr key={item.layer}>
                  <th scope="row">{item.layer}</th>
                  <td data-label="核心技术">{item.technologies}</td>
                  <td data-label="责任边界">{item.responsibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="resume-casework">
        <header>
          <h3>三条最值得在面试里展开的主线。</h3>
          <p>每一条都先给问题和取舍，再给结果；Validation、source-local 和 synthetic preview 不混成一个“完成”。</p>
        </header>
        <ol aria-label="简历项目主线">
          {resumeCases.map((item) => (
            <li key={item.title}>
              <span aria-hidden="true" className="resume-case-icon"><item.Icon size={17} /></span>
              <div className="resume-case-copy">
                <h4>{item.title}</h4>
                <p>{item.summary}</p>
                <small>{item.evidence}</small>
              </div>
              <a href={item.href}>
                {item.linkLabel}
                <item.Icon size={14} />
              </a>
            </li>
          ))}
        </ol>
      </div>

      <aside className="resume-boundary">
        <CircleAlert size={18} />
        <span>
          <strong>证据边界写在简历里，而不是藏在脚注里。</strong>
          <small>
            RAG 的正向数字来自冻结 Validation；EnterpriseOps 的 one-shot Held-out 为 1/8，Luna 的低成本分支因质量回退被拒绝；这些负结果是结论的一部分。公开站只展示清洗后的合成/公开回执，不代表私有 Runtime 已安装或生产已上线。
          </small>
        </span>
      </aside>
    </section>
  );
}
