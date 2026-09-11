"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, FileText, GitBranch, RotateCcw, X } from "lucide-react";
import task from "../../showcase/task-story.v1.json";
import { PawMark } from "./ui-shared";
import { ResumeSection } from "./resume-section";
import { ProjectReadingRoute } from "./project-reading-route";
import { ProjectAtlas } from "./project-atlas";

type Beat = { title: string; body: string; note: string };
const lanes = [
  { name: "输入", owner: "Input Agent", file: "input-method-plan.md", brief: "原生输入与显式 AI 的边界" },
  { name: "记忆", owner: "Memory Agent", file: "memory-value-loop.md", brief: "保存、召回与本轮使用" },
  { name: "协作", owner: "Room Agent", file: "multi-agent-room-plan.md", brief: "独立执行，共同交付" },
  { name: "桌面", owner: "PAWOS Agent", file: "pawos-projection-plan.md", brief: "同一工作台，清晰的状态归属" },
];
const collaboration: Beat[] = [
  { title: "先共享目标，不共享所有上下文。", body: "一起设计 PAW 工作台。把输入、记忆、协作和桌面拆成四条线，但让所有人对同一份交付负责。", note: "TaskBrief 定义目标、边界与预期产物。" },
  { title: "四条线并行，接口必须相遇。", body: "每个 Agent 在自己的 Session 中执行。需要别人的结论时，交换接口与来源，而不是复制整段私有对话。", note: "Pi 执行；Room 负责显式分派和公共交接。" },
  { title: "完成不是四句“完成了”。", body: "汇总四份方案，再检查它们是否存在、接口是否一致、结果是否足以继续工作。协调者对最终交付负责。", note: "共同交付：四份方案 + 一份整合说明。" },
];
const failure: Beat[] = [
  { title: "报告完成，文件却不见了。", body: "整合时找不到 PAWOS 方案。重新让 Agent 写一遍，看似能解决问题，却解释不了文件为什么消失。", note: "先对照目标与实际产物，再看 Agent 的总结。" },
  { title: "不是没写成，是写成后被撤销。", body: "workspace_write 已成功。随后辅助 WorkDocument 登记失败，补偿流程把这个错误当成文件失败，回滚了真实产物。", note: "原始事件顺序比一句失败总结更重要。" },
  { title: "把真实工作与辅助登记分开。", body: "成功写入的文件应该留下。登记失败进入可恢复待办；还必须验证重试能够补齐索引，而不是悄悄忽略错误。", note: "修复对象是失败处理边界，不是生成提示词。" },
];
const verification: Beat[] = [
  { title: "先定判据，再比较候选。", body: "两个修改都能保住文件，但这不够。同题重放还要检查登记能否恢复，以及重复登记是否产生副本。", note: "固定任务与检查条件，避免换题后宣布成功。" },
  { title: "候选 A 保住了文件，却丢了恢复路径。", body: task.rejected.result, note: "失败也是结果，不把未通过项藏进平均分。" },
  { title: "候选 B 保留真实产物，也保留下一步。", body: task.kept.result, note: "采用结论只覆盖这个合成场景；真实实验另看留出集。" },
];

function Chapter({ id, title, intro, beats, scene, variant = "" }: {
  id: string; title: string; intro: string; beats: Beat[]; scene: (step: number) => ReactNode; variant?: string;
}) {
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const nodes = root.current?.querySelectorAll<HTMLElement>("[data-story-beat]");
    if (!nodes || !window.IntersectionObserver) return;
    let observer: IntersectionObserver;
    const attach = () => {
      observer?.disconnect();
      const inset = Math.round(window.innerHeight * .38);
      const selectNearest = () => {
        const center = window.innerHeight / 2;
        const nearest = Array.from(nodes).reduce((best, node) => {
          const rect = node.getBoundingClientRect();
          const distance = center < rect.top ? rect.top - center : center > rect.bottom ? center - rect.bottom : 0;
          return distance < best.distance ? { node, distance } : best;
        }, { node: nodes[0], distance: Infinity });
        setStep(Number(nearest.node.dataset.storyBeat));
      };
      observer = new IntersectionObserver((entries) => {
        if (entries.some(entry => entry.isIntersecting)) selectNearest();
      }, { rootMargin: `-${inset}px 0px -${inset}px 0px`, threshold: 0 });
      nodes.forEach(node => observer.observe(node));
      selectNearest();
    };
    attach();
    window.addEventListener("resize", attach);
    return () => { observer.disconnect(); window.removeEventListener("resize", attach); };
  }, []);
  return <section ref={root} id={id} className={`precision-chapter ${variant}`}>
    <header className="precision-chapter-heading"><h2>{title}</h2><p>{intro}</p></header>
    <div className="precision-scrolly">
      <div className="precision-sticky"><div className="precision-scene" data-scene={id} data-step={step}>{scene(step)}</div>
        <div className="precision-scene-controls" aria-label={`${title}演示步骤`}>
          {beats.map((beat, index) => <button key={beat.title} type="button" aria-label={beat.title} aria-pressed={step === index} onClick={() => {
            setStep(index);
            if (window.matchMedia("(min-width: 761px) and (prefers-reduced-motion: no-preference)").matches) root.current?.querySelectorAll<HTMLElement>("[data-story-beat]")[index]?.scrollIntoView({ block: "center", behavior: "instant" });
          }}><span/>{["开始", "展开", "结果"][index]}</button>)}
        </div><small className="precision-synthetic">公开合成演示 · 可点击切换，也可随滚动阅读</small>
      </div>
      <div className="precision-beats">{beats.map((beat, index) => <article key={beat.title} data-story-beat={index} className={step === index ? "is-current" : ""}>
        <h3>{beat.title}</h3><p>{beat.body}</p><small>{beat.note}</small>
      </article>)}</div>
    </div>
  </section>;
}

function Network({ step = 1, hero = false }: { step?: number; hero?: boolean }) {
  return <div className={`precision-network ${hero ? "precision-network--hero" : ""}`} data-network-step={step}>
    <svg className="precision-orbits" viewBox="0 0 680 580" fill="none" aria-hidden="true">
      <ellipse cx="340" cy="290" rx="252" ry="166" transform="rotate(-25 340 290)"/>
      <ellipse cx="340" cy="290" rx="252" ry="166" transform="rotate(25 340 290)"/>
      <circle cx="340" cy="290" r="230"/>
      <g className="precision-network-links"><path d="M340 290L155 145M340 290L525 145M340 290L155 425M340 290L525 425"/></g>
      <g className="precision-peer-links"><path d="M155 145Q340 45 525 145M525 145Q620 290 525 425M525 425Q340 520 155 425"/></g>
    </svg>
    <div className="precision-root"><PawMark/><strong>{step === 2 ? "共同交付" : "共同目标"}</strong><span>{step === 2 ? "4 份方案 + 整合说明" : "PAW 工作台方案"}</span></div>
    {lanes.map((lane, i) => <div className={`precision-agent precision-agent--${i}`} key={lane.owner}>
      <span className="precision-agent-symbol">{step === 2 ? <FileText size={22}/> : <GitBranch size={22}/>}</span>
      <div><strong>{lane.name}</strong><span>{step === 2 ? "方案已汇总" : lane.owner}</span></div>
      {!hero && <small>{step === 2 ? lane.file : lane.brief}</small>}
    </div>)}
    {hero && <div className="precision-network-caption">一个目标，多个独立的执行者。</div>}
  </div>;
}

function TraceScene({ step }: { step: number }) {
  const rows = [
    ["workspace_write", "文件写入成功", "文件已保存"],
    ["documentSync", "辅助登记失败", "登记待恢复"],
    ["compensation", "回滚已保存文件", "保留真实产物"],
  ];
  return <div className="precision-trace" data-repaired={step === 2}>
    <div className="precision-trace-top"><FileText size={26}/><span>pawos-projection-plan.md</span><strong>{step === 2 ? "已保留" : "缺失"}</strong></div>
    <div className="precision-trace-events">{rows.map(([tool, before, after], index) => <div key={tool} className={`precision-trace-event ${index > 0 ? "is-problem" : ""}`}>
      <span className="precision-event-node">{step === 2 && index === 1 ? <RotateCcw size={16}/> : index === 0 || step === 2 ? <Check size={16}/> : <X size={16}/>}</span>
      <div><code>{tool}</code><strong>{step === 2 ? after : before}</strong></div>
      <span className="precision-event-order">{index + 1}</span>
    </div>)}</div>
    <div className="precision-trace-conclusion"><span>{step === 0 ? "交付检查" : step === 1 ? "定位根因" : "修复边界"}</span><strong>{step === 0 ? "总结 ≠ 产物" : step === 1 ? "辅助失败，撤销了真实成功。" : "文件留下。登记可以重试。"}</strong></div>
  </div>;
}

function CompareScene({ step }: { step: number }) {
  return <div className="precision-compare" data-verdict={step}>
    <div className="precision-compare-question">同一任务。同一组检查。</div>
    <div className="precision-candidate-pair">{[task.rejected, task.kept].map((candidate, i) => <div key={candidate.name} className={`precision-candidate precision-candidate--${i}`}>
      <span className="precision-candidate-letter">{i ? "B" : "A"}</span><h3>{i ? "保留 + 恢复" : "忽略错误"}</h3>
      <ul>{task.checkLabels.map((label, j) => <li key={label}>{candidate.checks[j] ? <Check size={18}/> : <X size={18}/>}<span>{label}<span className="sr-only">：{candidate.checks[j] ? "通过" : "未通过"}</span></span></li>)}</ul>
      <strong className="precision-verdict">{step === 0 ? "待比较" : i ? step === 2 ? "保留" : "继续检查" : "拒绝"}<ArrowUpRight size={22}/></strong>
    </div>)}</div>
    <p aria-live="polite" aria-atomic="true">{step === 0 ? "文件没有消失，只是第一项。" : step === 1 ? "候选 A 被拒绝。不能恢复的成功，仍然不完整。" : "候选 B 被保留。可继续工作的结果，才值得留下。"}</p>
  </div>;
}

export function PrecisionStory({ room, trace, memory }: { room: ReactNode; trace: ReactNode; memory: ReactNode }) {
  return <main className="precision-story" id="top">
    <nav className="precision-nav" aria-label="主导航"><a className="precision-brand" href="#top"><PawMark/><strong>PAW</strong></a>
      <div><a href="#agents">协作</a><a href="#reliability">评测</a><a href="#improvement">改进</a><a href="#framework">架构与技术</a></div>
      <a className="precision-nav-demo" href="/?view=full">完整演示 <ArrowUpRight size={16}/></a>
    </nav>
    <section className="precision-hero">
      <div className="precision-hero-copy"><p className="precision-kicker">PAW · SYSTEM-LEVEL AGENT WORKFLOW</p><h1>让独立的智能，<br/><span>完成共同的工作。</span></h1><p>PAW 从一个问题开始：怎样让 Agent 记住上下文，并把每次配置改进变成可验证的结果。</p><div className="precision-hero-thesis"><article><strong>01</strong><b>减少重复沟通</b><span>输入法 + OS Runtime<br/>沉淀可检索的长期记忆</span></article><article><strong>02</strong><b>量化配置选择</b><span>固定任务集 + Lab<br/>比较质量、延迟与成本</span></article></div><a className="precision-primary" href="#agents">从一个任务开始 <ArrowDown size={18}/></a></div>
      <Network hero/>
      <div className="precision-hero-bottom"><span>Personal Agent Workbench</span><a href="#project-overview">探索项目设计 <ArrowRight size={16}/></a></div>
    </section>
    <ProjectReadingRoute/>
    <ProjectAtlas/>
    <div className="precision-task"><p>一起设计一套工作台。</p><h2>输入、记忆、协作、桌面。<br/><span>四条产品线，一份共同交付。</span></h2><details><summary>查看完整任务 <ArrowUpRight size={16}/></summary><p>{task.request}</p><p>{task.deliverable}</p></details></div>
    {room}
    <details className="precision-mechanism"><summary>展开协作机制：从独立执行到共同交付 <ArrowDown size={18}/></summary><Chapter id="agents-mechanism" title="把能并行的工作分开，把必须对齐的决定连起来。" intro="机制图用于解释刚才操作的 Room，不替代真实前端。" beats={collaboration} scene={step => <Network step={step}/>}/></details>
    <section className="precision-ownership"><div><h2>一个执行核心。<br/><span>轻量的协作层。</span></h2><p>Pi Session 拥有模型与 Tool 循环、上下文、停止和恢复。Room 组合 Session，不再复制第二套执行状态机。</p><a href="/details/agents">为什么放弃强 Kernel <ArrowUpRight size={18}/></a></div>
      <div className="precision-owner-stack"><div><span>Room</span><p>分派 / 交接 / 汇总</p></div><div><span>Pi Session</span><p>执行 / 上下文 / 恢复</p></div><div><span>Tools</span><p>真实操作 / 结果回执</p></div><small>取舍：减少重复状态，仍要做好 ACK、重放与取消。</small></div>
    </section>
    <div className="precision-live-product">{trace}</div>
    <details className="precision-mechanism"><summary>展开故障机制：哪一步撤销了真实成功 <ArrowDown size={18}/></summary><Chapter id="reliability-mechanism" variant="precision-chapter--trace" title="出错之后，沿证据往回走。" intro="机制图解释写入、辅助登记与补偿边界；原始事件在上方真实 Trace 前端中查看。" beats={failure} scene={step => <TraceScene step={step}/>}/></details>
    <div className="precision-bridge"><span>修好了？</span><h2>修改过，不等于验证过。</h2><p>Agent 出错以后，怎样证明它真的变好了？</p><a href="/details/sandbox">查看真实 Trace / Eval 实验 <ArrowUpRight size={18}/></a></div>
    <Chapter id="improvement" variant="precision-chapter--compare" title="改进，需要经得起比较。" intro="固定任务，保留失败，对照同一组判据。被拒绝的候选和被采用的候选，同样需要理由。" beats={verification} scene={step => <CompareScene step={step}/>}/>
    <section className="precision-heldout"><div><span className="precision-stamp">独立实验</span><h2>验证集的赢家，<br/>也可能被拒绝。</h2><p>EnterpriseOps 的一次历史实验中，Validation 全通过，Held-out 却只完成 1/8。这份拒绝记录与当前成本对照属于不同实验。</p><a href="/details/sandbox">读实验原始回执 <ArrowUpRight size={18}/></a></div><div className="precision-heldout-results"><div><span>Validation</span><strong>3/3</strong><small>任务通过 · 31/31 检查</small></div><ArrowRight size={32}/><div><span>Held-out</span><strong>1/8</strong><small>任务完成 · 拒绝推广</small></div></div></section>
    <div className="precision-live-product">{memory}</div>
    <section id="input" className="precision-input"><div className="precision-input-word" aria-hidden="true">继续<span className="precision-caret"/></div><div><h2>让每个输入框，都成为一个了解你的 AI 入口</h2><p>输入是工作继续发生的地方。原生拼音仍由 Rime 负责；提交后联想与显式 Agent 各守边界。</p><a href="/?view=full#input">操作输入与语音演示 <ArrowUpRight size={18}/></a><a href="/details/input">深入模型与推理取舍 <ArrowRight size={18}/></a></div></section>
    <div className="precision-framework"><ResumeSection/></div>
    <section className="precision-ending"><h2>协作有结果。<br/><span>改进有依据。</span></h2><a className="precision-primary" href="/?view=full">打开完整产品演示 <ArrowUpRight size={18}/></a><p>Room、Trace、Memory、输入与语音保留完整交互。更多功能包括知识图谱与沙盒 Browser。</p></section>
    <footer className="precision-footer"><span>PAW / Personal Agent Workbench</span><p>主线运行真实前端，使用公开合成演示数据；独立实验附原始来源，不代表真实后端执行或生产验收。</p><a href="https://github.com/7155/paw-story-showcase" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={14}/></a></footer>
  </main>;
}
