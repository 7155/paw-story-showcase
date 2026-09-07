"use client";

import { useId, useState } from "react";

const diagrams = [
  {
    id: "collaboration", label: "任务怎样完成", title: "并行的是工作，共同的是目标。",
    description: "Facilitator 保留原始目标，按依赖分派独立工作。伙伴返回结果与证据，存在缺口时继续处理，最后由 Facilitator 汇总交付。",
    nodes: ["用户目标", "Facilitator", "Partner Sessions", "共同交付", "整合与检查", "工作结果与证据"],
    edges: ["原始要求", "任务与上下文", "各自执行并返回", "对照要求", "满足要求后交付"],
    branch: "有缺口：带着具体问题回到负责的 Session", source: "/diagrams/task-delivery.mmd",
    note: "Pi 负责每个 Session 的执行；Room 负责分派、公开协作事件与汇总。复核按任务需要选择。",
  },
  {
    id: "evaluation", label: "改进怎样留下", title: "一次修复，要经过比较才能成为改进。",
    description: "冻结失败案例和比较条件，生成具体候选，进行同题重放与其他样本检查。结果决定候选被保留，还是继续采用基线。",
    nodes: ["失败 Trace", "诊断与候选", "同题重放", "后续验证或采用", "Keep / Reject", "回归或保留样本"],
    edges: ["事件与原始要求", "有范围的修改", "原问题修复后", "质量与退步检查", "在验证范围内保留"],
    branch: "Reject：保留原基线；记录失败，不扩大候选的适用范围", source: "/diagrams/improvement-loop.mmd",
    note: "Keep 必须标明范围：shadow Validation、source-local 与已安装状态是不同结论。",
  },
  {
    id: "architecture", label: "系统如何连接", title: "界面、执行与数据，各自有明确职责。",
    description: "PAWOS 接收用户操作并展示状态；服务层传递命令与事件；Pi Session 执行模型和工具循环。工具结果、运行记录与相关上下文支持后续检查和继续工作。",
    nodes: ["PAWOS / Electron", "PAW 服务层", "Pi Sessions / Room", "界面状态与结果", "存储与状态投影", "Tools / Providers"],
    edges: ["用户命令", "启动与控制执行", "模型与工具调用", "结果与运行事件", "读取状态 / 事件更新"],
    branch: "继续工作：按需读取 Memory / Knowledge，注入当前 Session", source: "/diagrams/runtime-structure.mmd",
    note: "SQLite 保存本地状态；Memory 与 Knowledge 有独立来源和检索边界。公开展示站使用合成投影。",
  },
] as const;

export function SystemExplorer() {
  const [active, setActive] = useState(0);
  const diagram = diagrams[active];
  const markerId = useId().replaceAll(":", "");
  const positions = [[30, 30], [340, 30], [650, 30], [30, 210], [340, 210], [650, 210]];
  return (
    <section className="system-explorer" aria-label="任务、改进与系统结构图">
      <div className="explorer-switch" role="group" aria-label="选择图示">
        {diagrams.map((item, index) => <button key={item.id} type="button" aria-pressed={active === index} onClick={() => setActive(index)}>{item.label}</button>)}
      </div>
      <div className="explorer-body" aria-live="polite">
        <h4>{diagram.title}</h4><p>{diagram.description}</p>
        <svg className="explorer-graph" viewBox="0 0 920 320" role="img" aria-labelledby={`${markerId}-title ${markerId}-desc`}>
          <title id={`${markerId}-title`}>{diagram.title}</title><desc id={`${markerId}-desc`}>{diagram.description} {diagram.branch}</desc>
          <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor" /></marker></defs>
          <g className="explorer-edges" fill="none" markerEnd={`url(#${markerId})`}>
            <path d="M270 66 H338"/><path d="M580 66 H648"/><path d="M770 102 V208"/><path d="M650 246 H582"/><path d="M340 246 H272"/>
          </g>
          <g className="explorer-edge-labels"><text x="304" y="48">{diagram.edges[0]}</text><text x="614" y="48">{diagram.edges[1]}</text><text x="770" y="158">{diagram.edges[2]}</text><text x="614" y="283">{diagram.edges[3]}</text><text x="304" y="283">{diagram.edges[4]}</text></g>
          {diagram.nodes.map((node, index) => <g key={node} transform={`translate(${positions[index][0]} ${positions[index][1]})`} className={index === 0 || index === 3 ? "explorer-node explorer-node--terminal" : "explorer-node"}><rect width="240" height="72" rx="3"/><text x="120" y="42">{node}</text></g>)}
        </svg>
        <ol className="explorer-mobile" aria-label="图示的顺序与连接">
          {[0, 1, 2, 5, 4, 3].map((nodeIndex, index) => <li key={nodeIndex}><strong>{diagram.nodes[nodeIndex]}</strong>{index < 5 ? <span>↓ {diagram.edges[index]}</span> : null}</li>)}
        </ol>
        <div className="explorer-branch">{diagram.branch}</div>
        <footer><p>{diagram.note}</p><a href={diagram.source} target="_blank" rel="noreferrer">查看 Mermaid 源图</a></footer>
      </div>
    </section>
  );
}
