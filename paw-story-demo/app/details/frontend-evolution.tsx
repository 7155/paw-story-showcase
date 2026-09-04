"use client";

import {
  ArrowLeft,
  ArrowRight,
  GitCommitHorizontal,
  GitFork,
  LayoutList,
  ListChecks,
  MessageSquareText,
  Orbit,
  PanelsTopLeft,
  ShieldCheck,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { DetailShell } from "./shared";

type EvolutionVisual = "room" | "kernel" | "conversation" | "tasks" | "light" | "spatial" | "timeline";

type EvolutionStage = {
  id: string;
  period: string;
  label: string;
  title: string;
  question: string;
  choice: string;
  gain: string;
  reversal: string;
  verdict: string;
  visual: EvolutionVisual;
  Icon: LucideIcon;
  commits: readonly { hash: string; label: string }[];
};

const evolutionStages: readonly EvolutionStage[] = [
  {
    id: "structured-room",
    period: "07.16–07.18",
    label: "结构化 Room",
    title: "先把“几个人在一起”画清楚。",
    question: "Room 里是谁、各自是什么角色、消息属于哪个 group？",
    choice: "用成员列表、角色、Room 状态和结构化消息替代散落的多窗口聊天。",
    gain: "第一次让成员、Room 身份和公共消息拥有统一入口；后续所有视图都继续复用这层事实。",
    reversal: "它能回答“谁在房间里”，却回答不了“谁正在做什么、工作怎样交接、何时真正结束”。",
    verdict: "长期正确的底座；作为主视图信息不足。",
    visual: "room",
    Icon: LayoutList,
    commits: [{ hash: "9b320d0d", label: "Add structured Agent group Rooms" }],
  },
  {
    id: "kernel-control",
    period: "07.19–07.20",
    label: "Kernel 控制面",
    title: "再把预算、权限和终态全部摊开。",
    question: "Root、Session、Token、墙钟、Context / Capability receipt 和 Stop 由谁控制？",
    choice: "把 Room Kernel 的 root、generation、预算、私有 Session inspector 与 terminal receipt 做成控制面。",
    gain: "责任、停止和完成门第一次可见；强治理需要什么信息，从此不再含糊。",
    reversal: "页面开始要求用户理解第二套 Runtime 的所有内部名词；显示层也跟着 owner 重叠一起膨胀。",
    verdict: "阶段性正确：治理问题判断正确，Kernel 化的执行与展示过重。",
    visual: "kernel",
    Icon: ShieldCheck,
    commits: [
      { hash: "e62a67f8", label: "Add Room kernel control plane view" },
      { hash: "7436c039", label: "Add governed Room requirements control plane" },
    ],
  },
  {
    id: "public-conversation",
    period: "07.21–07.26",
    label: "公开对话",
    title: "控制面太像后台，于是工作重新回到对话。",
    question: "用户怎样读懂多 Agent 实际说了什么、调用了什么、交付了什么？",
    choice: "将公开 Room timeline、Composer、Markdown、Diff、媒体和结构化 Tool 结果合并成连续对话。",
    gain: "沟通重新变成人能顺着读的因果流，Session 与 Room 也开始共享渲染器。",
    reversal: "对话擅长解释发生了什么，却无法在第一眼呈现并行责任、依赖、阻塞和整体完成度。",
    verdict: "长期正确：保留为“公开记录”，但不再独自承担全部协作信息。",
    visual: "conversation",
    Icon: MessageSquareText,
    commits: [
      { hash: "96aab4e8", label: "Stream Room progress and compose rich renderers" },
      { hash: "74ec6c45", label: "Unify paper workspace UI" },
    ],
  },
  {
    id: "task-control",
    period: "07.31–08.14",
    label: "任务卡与任务图",
    title: "对话看不见全局，于是任务卡、树和验收线不断加回来。",
    question: "每个伙伴负责哪件事、处于哪一轮、为什么等待、什么时候可以 Review？",
    choice: "围绕 governed Runtime 增加一人一卡、任务上下文、Task Graph、恢复状态和 verified acceptance line。",
    gain: "并行工作第一次可以按任务扫读；取消、重试、恢复和验收都有可见位置。",
    reversal: "重试与恢复会把同一 WorkItem 投影成多条状态；大量 UI 修复转而维持 Kernel 状态机的自洽。",
    verdict: "阶段性正确：任务对象必须保留，但 UI 不应复制 Runtime 工作流。",
    visual: "tasks",
    Icon: ListChecks,
    commits: [
      { hash: "923a9e14", label: "Unify governed agent and room runtime" },
      { hash: "51795b95", label: "Integrate verified acceptance line" },
    ],
  },
  {
    id: "light-room",
    period: "08.15–08.19",
    label: "Light Room 工作台",
    title: "删掉重复 Kernel 后，前端也从控制器退回投影器。",
    question: "怎样保留任务责任，又不再复制 Pi Session 的 loop、context、Tool、Stop 与 recovery？",
    choice: "Room 改为普通 Pi Sessions 的组合；前端只投影 Partner、WorkItem、attempt lane、公共事件和唯一 final。",
    gain: "执行 owner 收敛；ghost root 消失，真实 Session、任务尝试和角色分派重新可操作。",
    reversal: "列表和 lane 仍把沟通、关系与时间拆成几块；大型 Room 需要更直观的全局态势。",
    verdict: "长期正确的架构选择；展示方式仍未收敛。",
    visual: "light",
    Icon: GitFork,
    commits: [
      { hash: "0a9f5c9c", label: "Compose rooms from Pi sessions" },
      { hash: "9e706207", label: "Release Pi-native session and room workbench" },
      { hash: "7de54a39", label: "Project exact WorkItem attempt lanes" },
    ],
  },
  {
    id: "spatial-room",
    period: "08.24–08.25",
    label: "星球、卫星与 Mesh",
    title: "为了看见关系，Room 一夜之间试过卫星、太阳系、圆形 Mesh。",
    question: "谁围绕谁工作、哪条交接正在发生、哪个 Session 可以直接打开？",
    choice: "主 Room 为 Sol，Partner 为行星，私有子 Agent 为卫星；再把 Partner 与 WorkItem 合成关系 Mesh。",
    gain: "身份、层级、并行和 intercom 终于能被一眼看见；行星还能打开真实 Session 窗口。",
    reversal: "星空容易盖住真正的工作，圆形 Mesh 又丢失时间顺序；3D 还引入 GPU、DPR、懒加载与暂停成本。",
    verdict: "可控实验性选型：空间关系有价值，但只能按需出现，不能成为默认工作表面。",
    visual: "spatial",
    Icon: Orbit,
    commits: [
      { hash: "7a3e5a74", label: "Session moons, Room solar system, Room galaxy" },
      { hash: "7283bec7", label: "Replace task tree and planet lists with collaboration mesh" },
    ],
  },
  {
    id: "timeline-windows",
    period: "08.25–08.29",
    label: "时间线与真实窗口",
    title: "最终没有选一个“最好看的图”，而是拆成多种问题视图。",
    question: "怎样同时保留因果顺序、任务责任、伙伴关系和每段 Session 的完整工作现场？",
    choice: "圆形 Mesh 改为按身份分 lane、按真实事件从上到下排列；摘要之外继续打开真实 PAWOS Session 窗口。",
    gain: "时间与关系不再互相牺牲；公开记录、任务表、协同模式和真实窗口各自回答一个问题。",
    reversal: "组合视图比单图诚实，但信息仍密；移动端必须逐层披露，星空也只能保持可选入口。",
    verdict: "当前判决：复合视图长期保留，任何单一拓扑都不再冒充完整 Room。",
    visual: "timeline",
    Icon: PanelsTopLeft,
    commits: [
      { hash: "ea001717", label: "Chronological timeline mesh replaces circular orbit" },
      { hash: "43de6111", label: "Complete Room Trace and desktop delivery" },
    ],
  },
] as const;

const rapidIterations = [
  ["08.24", "伙伴卫星窗口", "482acb35", "人和真实 Session 可达了，但交接关系仍藏在窗口后面。"],
  ["08.24", "Session 月亮 / Room 太阳系", "7a3e5a74", "层级和身份很直观，但星空开始抢走工作本身的注意力。"],
  ["08.25", "伙伴 + WorkItem 圆形 Mesh", "7283bec7", "关系进入同一张图，却无法可靠表达先后顺序。"],
  ["08.25", "纵向时间线 Mesh", "ea001717", "身份变成 lane、事件自上而下；关系和时间第一次同时成立。"],
] as const;

const currentViews = [
  ["公开记录", "发生了什么", "用户消息、伙伴更新、Tool 回执、Docs 与 final 的因果顺序。", "PawRoomConversation.tsx"],
  ["任务表", "谁负责什么", "WorkItem、owner、attempt、阻塞、Review 与终态，不从聊天文本猜状态。", "PawRoomRoundSheet.tsx"],
  ["协同模式", "谁与谁交接", "伙伴、任务和 intercom 的关系投影；按需打开真实 Partner 窗口。", "PawRoomFocusOverview.tsx"],
  ["真实 Session 窗口", "具体怎样执行", "每段 Session 自己的对话、Tools、Skills、Stop、恢复和工作证据。", "PawRoomWorkspace.tsx"],
  ["星空（按需）", "整体拓扑与身份", "只在用户主动打开时加载；真实工作继续留在窗口、任务表和记录里。", "PawStarfieldLazy.tsx"],
] as const;

const currentSourceFiles = [
  "control-center-web/src/paw-os/apps/PawRoomWorkspace.tsx",
  "control-center-web/src/paw-os/apps/PawRoomConversation.tsx",
  "control-center-web/src/paw-os/apps/PawRoomRoundSheet.tsx",
  "control-center-web/src/paw-os/apps/PawRoomFocusOverview.tsx",
  "control-center-web/src/paw-os/apps/room-focus-mesh.ts",
  "control-center-web/src/paw-os/apps/PawStarfieldLazy.tsx",
] as const;

const repository = "https://github.com/7155/personal-agent-workbench";

export function FrontendEvolutionDetail() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStage = evolutionStages[activeIndex] ?? evolutionStages[0];
  const previousIndex = (activeIndex - 1 + evolutionStages.length) % evolutionStages.length;
  const nextIndex = (activeIndex + 1) % evolutionStages.length;
  const focusStage = (index: number) => {
    setActiveIndex(index);
    window.requestAnimationFrame(() => document.getElementById(`frontend-evolution-tab-${evolutionStages[index]?.id}`)?.focus());
  };
  const handleStageKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const targetIndex = event.key === "ArrowRight"
      ? (index + 1) % evolutionStages.length
      : event.key === "ArrowLeft"
        ? (index - 1 + evolutionStages.length) % evolutionStages.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? evolutionStages.length - 1
            : null;
    if (targetIndex === null) return;
    event.preventDefault();
    focusStage(targetIndex);
  };

  return (
    <DetailShell
      index="01 · 多 Agent 协作 · 前端演进"
      pageClassName="detail-page--frontend-evolution"
      repositories={[
        { label: "personal-agent-workbench", href: repository },
        { label: "paw-story-showcase", href: "https://github.com/7155/paw-story-showcase" },
      ]}
      title="一个月里，多 Agent 前端为什么换了七种视图？"
      sub="从结构化 Room、Kernel 控制面、公开对话、任务卡与任务图，到 Light Room、行星 Mesh 和真实窗口：这不是技术栈 Logo 墙，而是一段持续寻找协作可见性的真实前端选型史。"
    >
      <section className="frontend-evolution-intro" aria-labelledby="frontend-evolution-intro-title">
        <div>
          <span>GIT FORENSICS · 2026.07.16 → 08.29</span>
          <h2 id="frontend-evolution-intro-title">每一种显示方式，都只回答了多 Agent 的一部分。</h2>
          <p>列表擅长成员，控制面擅长约束，对话擅长因果，任务图擅长责任，行星擅长关系，真实窗口擅长执行细节。一个月的反复，最后得到的不是唯一赢家，而是按问题切换的复合界面。</p>
        </div>
        <dl>
          <div><dt>7</dt><dd>因果阶段，不按 commit 数凑故事</dd></div>
          <div><dt>4</dt><dd>跨过一夜的关系视图改写</dd></div>
          <div><dt>1</dt><dd>Runtime owner：Pi Session</dd></div>
        </dl>
      </section>

      <section className="frontend-evolution-stage" aria-labelledby="frontend-evolution-stage-title">
        <header>
          <div><span>SOURCE-RECONSTRUCTED UI</span><h2 id="frontend-evolution-stage-title">沿真实提交切换七种前端答案。</h2></div>
          <p>下面是根据当时组件、commit 与现行 owner 重建的拓扑缩略图。<strong>源码重建，不是历史截图</strong>；Git 证明何时改了什么，不单独证明当时动机。</p>
        </header>
        <div className="frontend-evolution-stage-tabs" role="tablist" aria-label="选择多 Agent 前端演进阶段">
          {evolutionStages.map((stage, index) => (
            <button
              aria-controls="frontend-evolution-active-panel"
              aria-selected={activeIndex === index}
              data-evolution-stage={stage.id}
              id={`frontend-evolution-tab-${stage.id}`}
              key={stage.id}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => handleStageKeyDown(event, index)}
              role="tab"
              tabIndex={activeIndex === index ? 0 : -1}
              type="button"
            >
              <span>{stage.period}</span><strong>{stage.label}</strong><stage.Icon size={15}/>
            </button>
          ))}
        </div>
        <div aria-labelledby={`frontend-evolution-tab-${activeStage.id}`} className="frontend-evolution-active" data-visual={activeStage.visual} id="frontend-evolution-active-panel" key={activeStage.id} role="tabpanel">
          <figure aria-label={`${activeStage.label} 源码拓扑重建`}>
            <EvolutionDiagram kind={activeStage.visual}/>
            <figcaption><activeStage.Icon size={14}/><span>{activeStage.period}</span><strong>{activeStage.label}</strong></figcaption>
          </figure>
          <div className="frontend-evolution-decision">
            <span>CURRENT VIEW · {String(activeIndex + 1).padStart(2, "0")} / 07</span>
            <h3>{activeStage.title}</h3>
            <dl>
              <div><dt>当时要回答</dt><dd>{activeStage.question}</dd></div>
              <div><dt>实际选择</dt><dd>{activeStage.choice}</dd></div>
              <div><dt>首次收益</dt><dd>{activeStage.gain}</dd></div>
              <div><dt>反证 / 踩坑</dt><dd>{activeStage.reversal}</dd></div>
              <div><dt>当前判决</dt><dd>{activeStage.verdict}</dd></div>
            </dl>
            <footer>
              <nav aria-label={`${activeStage.label} Git 证据`}>
                {activeStage.commits.map((commit) => <a href={`${repository}/commit/${commit.hash}`} key={commit.hash} rel="noreferrer" target="_blank"><GitCommitHorizontal size={13}/><code>{commit.hash}</code><span>{commit.label}</span></a>)}
              </nav>
              <div>
                <button aria-label={`上一阶段：${evolutionStages[previousIndex]?.label}`} onClick={() => setActiveIndex(previousIndex)} type="button"><ArrowLeft size={15}/></button>
                <button aria-label={`下一阶段：${evolutionStages[nextIndex]?.label}`} onClick={() => setActiveIndex(nextIndex)} type="button"><ArrowRight size={15}/></button>
              </div>
            </footer>
          </div>
        </div>
      </section>

      <section className="frontend-evolution-rapid" aria-labelledby="frontend-evolution-rapid-title">
        <header><div><span>2026.08.24 → 08.25</span><h2 id="frontend-evolution-rapid-title">跨过一夜，关系视图连续改了四次。</h2></div><p>不是四套同时存在的产品方案，而是每一版暴露一个新的缺口，下一版马上改写信息拓扑。</p></header>
        <ol>
          {rapidIterations.map(([date, title, hash, consequence], index) => (
            <li key={hash}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <time>{date}</time>
              <strong>{title}</strong>
              <p>{consequence}</p>
              <a href={`${repository}/commit/${hash}`} rel="noreferrer" target="_blank"><code>{hash}</code><ArrowRight size={12}/></a>
            </li>
          ))}
        </ol>
      </section>

      <section className="frontend-evolution-current" aria-labelledby="frontend-evolution-current-title">
        <header><div><span>CURRENT DECISION</span><h2 id="frontend-evolution-current-title">最终选型不是一张万能图，而是五个有边界的视图。</h2></div><p>每个表面只回答自己擅长的问题；前端继续是 Runtime projection，不拥有第二份工作状态。</p></header>
        <div role="table" aria-label="当前 PAW Room 前端视图责任">
          {currentViews.map(([view, question, answer, owner]) => (
            <div role="row" key={view}>
              <strong role="cell">{view}</strong>
              <span role="cell">{question}</span>
              <p role="cell">{answer}</p>
              <code role="cell">{owner}</code>
            </div>
          ))}
        </div>
        <aside><Waypoints size={19}/><div><strong>今天重做，会更早确立这条规则。</strong><p>先固定数据 owner，再为“因果、责任、关系、执行细节”分别设计视图；星空只做按需拓扑，不让视觉隐喻反过来定义 Runtime。</p></div></aside>
      </section>

      <section className="frontend-evolution-evidence" aria-labelledby="frontend-evolution-evidence-title">
        <header><h2 id="frontend-evolution-evidence-title">当前实现落在这些源码 owner。</h2><p>页面的最终判断可以回到现行文件核对；历史缩略图则只承诺与对应 commit 的信息结构一致。</p></header>
        <div>
          {currentSourceFiles.map((file) => <a href={`${repository}/blob/main/${file}`} key={file} rel="noreferrer" target="_blank"><GitFork size={13}/><code>{file}</code><ArrowRight size={12}/></a>)}
        </div>
      </section>
    </DetailShell>
  );
}

function EvolutionDiagram({ kind }: { kind: EvolutionVisual }) {
  return (
    <div aria-hidden="true" className={`frontend-evolution-diagram frontend-evolution-diagram--${kind}`}>
      <header><i/><i/><i/><span>PAW · ROOM</span></header>
      {kind === "room" ? <div className="fed-room"><b>PAW 计划</b><span>Root · Facilitator</span><span>Mars · Partner</span><span>Venus · Partner</span><small>3 participants · public room</small></div> : null}
      {kind === "kernel" ? <div className="fed-kernel"><strong>ROOT · generation 2</strong><span>Dispatch 4 / 8</span><span>Token 18k / 32k</span><span>Context · sealed</span><span>Capability · sealed</span><div><i/><i/><i/></div></div> : null}
      {kind === "conversation" ? <div className="fed-conversation"><span><i/>你：先明确边界，再开始并行。</span><span><i/>Facilitator：拆为三条责任线。</span><span><i/>Mars：已交付 WorkPatch。</span><b>Tool result · 3 files changed</b></div> : null}
      {kind === "tasks" ? <div className="fed-tasks"><span><b>输入链</b><small>RUNNING</small></span><span><b>Memory</b><small>WAITING</small></span><span><b>Room</b><small>REVIEW</small></span><svg viewBox="0 0 100 55"><path d="M18 12 L50 28 L82 12 M50 28 L50 48"/></svg></div> : null}
      {kind === "light" ? <div className="fed-light"><b>Facilitator Session</b><span>TaskBrief</span><i/><span>WorkItem</span><div><small>Mars Session</small><small>Venus Session</small><small>Jupiter Session</small></div><footer>PUBLIC EVENTS · ONE FINAL</footer></div> : null}
      {kind === "spatial" ? <div className="fed-spatial"><b>SOL</b><span data-orbit="1">MARS</span><span data-orbit="2">VENUS</span><span data-orbit="3">JUPITER</span><span data-orbit="4">SATURN</span><svg viewBox="0 0 100 70"><path d="M14 22 Q50 48 82 17 M82 17 Q58 60 20 58"/></svg></div> : null}
      {kind === "timeline" ? <div className="fed-timeline"><div><i/><i/><i/><i/></div><svg viewBox="0 0 100 70"><path d="M12 9 V62 M36 9 V62 M61 9 V62 M86 9 V62 M12 18 L36 28 L61 39 L86 52"/></svg><span style={{ left: "8%", top: "22%" }}>PLAN</span><span style={{ left: "31%", top: "36%" }}>PATCH</span><span style={{ left: "56%", top: "51%" }}>HANDOFF</span><span style={{ left: "80%", top: "68%" }}>FINAL</span></div> : null}
    </div>
  );
}
