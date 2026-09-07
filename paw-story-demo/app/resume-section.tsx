import {
  ArrowRight,
  CircleAlert,
  FileCheck2,
  GitBranch,
  ShieldCheck,
  SquareArrowOutUpRight,
} from "lucide-react";
import { SystemExplorer } from "./system-explorer";
import { currentLabExperiments, currentLabEvidenceHref, labBenefitBoundary } from "./lab-evidence";

const resumeCases = [
  {
    title: "Agent Runtime / Agent Lab",
    summary:
      "把 source-local Pi、能力令牌 Tool Gateway、Host-private Verifier、Trace/Eval 和 Keep/Reject 组合成一条可审计实验链；Validation winner 仍要经过一次性 Held-out，失败候选不被重跑成好结果。",
    evidence: "四场景当前 Validation · 历史 Held-out Reject 保留",
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
          <h2 id="resume-title">从工作过程，看到系统设计。</h2>
          <p>
            上面的过程由同一套工作台支撑。这里展开任务如何流转、系统怎样连接，以及评测如何影响下一次选择。
          </p>
          <nav aria-label="框架与证据入口" className="resume-actions">
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
          <strong>关键选择：让 Pi 执行，让 Room 组织协作。</strong>
          <p>界面展示同一份运行状态，记忆按需参与任务；执行、协作和评测各自承担清楚的责任。</p>
        </aside>
      </div>

      <dl aria-label="公开可核查的项目结果" className="resume-proof-ledger">
        {currentLabExperiments.map((experiment) => (
          <div key={experiment.id}>
            <dt><a href={`/details/sandbox?scenario=${experiment.key}`}>{experiment.label}</a></dt>
            <dd>
              <strong>{experiment.qualityAfter}</strong>
              <small>{experiment.costBefore} → {experiment.costAfter} · API 估算降低 {experiment.saving} · {experiment.scope} · {experiment.costLabel}</small>
            </dd>
          </div>
        ))}
      </dl>
      <p className="current-lab-boundary">{labBenefitBoundary} RAG r6 非盲测、非 Held-out；当前 Keep 不代表泛化或生产效果。<a href={currentLabEvidenceHref} target="_blank" rel="noreferrer">查看同源回执</a></p>

      <section aria-labelledby="framework-title" className="technical-foundation" id="framework">
        <details className="story-speaking-route" id="story-route">
          <summary>从哪里开始讲这个项目？</summary>
          <p>先用首页演示一个完整任务，再按听众的追问选一条设计线。每个详情开头都有“选择、反证、代价、证据”的讲述提纲。</p>
          <ol>
            <li><a href="/details/agents#decision-guide">执行与协作为什么分开？<ArrowRight size={14}/></a><span>从重复 owner 到 Light Room；讲一次 ACK 丢失的失败。</span></li>
            <li><a href="/details/sandbox#decision-guide">怎样证明优化有效？<ArrowRight size={14}/></a><span>从 Validation winner 到 Held-out Reject；先说判据，再读数字。</span></li>
            <li><a href="/details/frontend#decision-guide">为什么前端反复改？<ArrowRight size={14}/></a><span>用一次视图取舍解释因果、关系与执行细节不能互相替代。</span></li>
            <li><a href="/details/context#decision-guide">为什么不把历史全部塞进去？<ArrowRight size={14}/></a><span>区分保存、召回与本轮使用；沿来源回跳讲清治理成本。</span></li>
            <li><a href="/details/input#decision-guide">为什么还要做模型与推理？<ArrowRight size={14}/></a><span>用连续按键、token-LCP 和完整 Top-3 延迟解释专用优化。</span></li>
          </ol>
          <small>只把有来源的实施与验证归于项目；尚未证实的动机、贡献比例和生产效果不补写。</small>
        </details>
        <header className="technical-foundation-header">
          <h3 id="framework-title">任务、改进、架构，分三张图看清。</h3>
          <p>
            先看协作过程，再看改进回路，最后展开支撑它们的运行结构。每条连接都说明传递了什么。
          </p>
        </header>

        <SystemExplorer />
        <details className="architecture-reference"><summary>查看各层的状态责任</summary><ol aria-label="PAW 系统框架" className="architecture-flow">
          {architectureFlow.map((item, index) => (
            <li key={item.label}>
              <small>{item.label}</small>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              {index < architectureFlow.length - 1 ? <ArrowRight aria-hidden="true" size={17} /> : null}
            </li>
          ))}
        </ol></details>

        <div className="technology-stack-heading">
          <h4>这些选择，怎样落到代码里？</h4>
          <p>从桌面界面到执行循环、数据存储与评测，每一层列出采用的技术及其职责。</p>
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
          <h3>继续深入三个关键实践。</h3>
          <p>从真实问题出发，看技术选择、失败尝试和对应结果。</p>
        </header>
        <ol aria-label="关键技术实践">
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
          <strong>哪些结论已经得到验证？</strong>
          <small>
            当前四场景结果来自单轮 Validation，Memory 为当前 Pi 路径的合成数据验证；RAG r6 使用 candidate-aware 标准，标准修订不代表模型能力提升。EnterpriseOps 历史 one-shot Held-out 1/8 的拒绝推广结论保留。公开站只展示清洗后的合成/公开回执，不代表私有 Runtime 已安装或生产已上线。
          </small>
        </span>
      </aside>
    </section>
  );
}
