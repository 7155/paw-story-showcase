"use client";

import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CircleAlert,
  CircleDot,
  FileCheck2,
  FileText,
  History,
  Keyboard,
  Mic,
  Orbit,
  PanelsTopLeft,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  SquareArrowOutUpRight,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Badge } from "@/components/launch/badge";
import { LinkButton } from "@/components/launch/link-button";
import { ResumeSection } from "./resume-section";
import { CollaborationResult, ImprovementSection, TaskIntroduction } from "./story-journey";
import { ShowcasePlayback, type ShowcaseStage } from "./showcase-playback";
import { GithubBadge, GithubMark, PawMark, useInView, useLoop, useOnScreen, useTimedLoop } from "./ui-shared";

const chapters = [
  { id: "agents", index: "01", label: "交付" },
  { id: "reliability", index: "02", label: "评测" },
  { id: "improvement", index: "03", label: "改进" },
  { id: "memory", index: "04", label: "继续" },
  { id: "input", index: "05", label: "入口" },
];

// three.js stays out of the initial bundle; the chunk loads only when the
// Room slide approaches the viewport (RoomTransformationDemo mounts on view).
const SolarSystem3D = lazy(() => import("../components/SolarSystem3D").then((module) => ({ default: module.SolarSystem3D })));

const inputTimelineDurations = [
  2_000,
  2_400,
  1_200,
  1_000,
  3_200,
  1_200,
  1_400,
  1_400,
  1_500,
  1_500,
  1_800,
  3_600,
  1_200,
  3_000,
] as const;

const inputScenarios = [
  {
    id: "report",
    label: "技术复盘",
    fileName: "PAW Agent 安全写入复盘.docx",
    kicker: "架构复盘 · WorkspaceHarness",
    title: "为什么我们推翻了“同步失败就回滚”",
    summary: "用一次真实架构反转，讲清 Tool、权限、并发边界与证据分级。",
    section: "问题与反转",
    body: "旧策略把真实文件写入与 WorkDocument 登记做成强一致：登记失败就尝试回滚文件。后来我们发现，辅助协作记录不应撤销已经成功且获批的真实工作。",
    typingPrefix: "最终决定把工作区重新定义为唯一的",
    compositionRoman: "shi shi yuan",
    committedSentence: "最终决定把工作区重新定义为唯一的事实源。",
    rimeCandidates: ["事实源", "实施源", "实时源", "事实原", "真实源"],
    suggestions: [
      "真实写入成功后，不因辅助登记失败而回滚",
      "documentSync 失败只留一次 Trace 与残余提醒",
      "resourceRevision 仍不等于同文件并发串行化",
    ],
    generatedParagraph: "这次反转不是放松安全，而是重新划分事实源：workspace_write 仍要经过 Tool 可用性、workspaceRoots、resourceRevision、approval digest 与 OS sandbox 五层约束；但一旦真实文件已经成功写入，WorkDocument 登记失败只记录一次 documentSync pending/failed 与 Trace，不再撤销用户的真实工作。当前边界也必须说清：resourceRevision 能阻止顺序发生的陈旧写入，却不等于同文件 mutation queue；两个真正同时通过预检的全文件替换仍可能出现后写覆盖前写。",
    diagnostic: "当前输入 24 字 · 对话证据 3 条 · 代码证据 4 条 · 首字 1.3 秒",
    historyDone: "已选取 3 条架构追问与用户纠正",
    retrievalDone: "已找到安全分层、Git 反转与并发残余",
    handoff: "AX 7 节点 · 对话 3 条 · 召回 Decision、Skill、Git",
    sources: [
      { id: "window", label: "窗口语义", title: "当前复盘 · 问题与反转", detail: "rollback → workspace source of truth", Icon: FileText },
      { id: "recent", label: "最近完整输入", title: "架构追问 · 3 条", detail: "不要把所有安全机制都叫多 Agent 安全", Icon: History },
      { id: "atom", label: "项目事实 · Decision", title: "写入与辅助登记边界", detail: "成功的 workspace mutation 不被 WorkDocument 撤销", Icon: CircleDot },
      { id: "book", label: "知识主题 · Skill", title: "Trace Agent 诊断合同", detail: "八项评分 · 硬门槛 · 授权后修复", Icon: BookOpen },
    ],
  },
  {
    id: "prd",
    label: "产品需求",
    fileName: "智能输入需求说明.docx",
    kicker: "产品需求 · v0.9",
    title: "Post-commit 联想交互需求",
    summary: "定义联想出现时机、快捷键和 Active RAG 的授权边界。",
    section: "交互规则",
    body: "拼音组合阶段只保留 Rime 候选，不展示模型或 RAG 内容。",
    typingPrefix: "用户提交完整句子后，系统才展示三条",
    compositionRoman: "duan lian xiang",
    committedSentence: "用户提交完整句子后，系统才展示三条短联想。",
    rimeCandidates: ["三条短联想", "三条端联想", "三条段联想", "三条短连想", "三条联想"],
    suggestions: [
      "Tab 接受第一条，Option + 数字选择侧候选",
      "普通联想不读取远程上下文",
      "点击生成后再启动 Active RAG",
    ],
    generatedParagraph: "验收时需要同时满足三个条件：联想不得覆盖系统候选栏；首条建议可用 Tab 接受，其他建议使用 Option + 数字选择；只有用户主动点击“生成”后，系统才能读取获准的窗口语义、近期输入与记忆，并在结果中保留可核对的依据回执。",
    diagnostic: "当前输入 24 字 · 历史 3 条 · RAG 2 条 · 首字 1.1 秒",
    historyDone: "已选取 3 条交互评审结论",
    retrievalDone: "已找到组合态规则与授权边界",
    handoff: "AX 6 节点 · 历史 3 条 · 召回 Atom、Book",
    sources: [
      { id: "window", label: "窗口语义", title: "当前 PRD · 交互规则", detail: "联想出现时机与快捷键定义", Icon: FileText },
      { id: "recent", label: "最近完整输入", title: "交互评审 · 3 条", detail: "数字键不能被联想面板吞掉", Icon: History },
      { id: "atom", label: "知识库事实 · Atom", title: "组合态边界", detail: "composition phase = Rime only", Icon: CircleDot },
      { id: "book", label: "知识主题 · Book", title: "Active RAG 授权", detail: "仅在用户主动点击生成后启动", Icon: BookOpen },
    ],
  },
  {
    id: "paper",
    label: "论文写作",
    fileName: "冰架基底融化方法.docx",
    kicker: "研究论文 · 方法章节",
    title: "基于物理残差学习的冰架融化反演",
    summary: "质量守恒基线、残差校正与像元级不确定性建模。",
    section: "模型方法",
    body: "首先依据质量守恒关系计算物理基线：m_raw = SMB − ∂tH − ∇·(Hu)。",
    typingPrefix: "随后使用残差 U-Net 学习观测产品与物理基线之间的",
    compositionRoman: "xi tong pian cha",
    committedSentence: "随后使用残差 U-Net 学习观测产品与物理基线之间的系统偏差。",
    rimeCandidates: ["系统偏差", "系统偏叉", "系通偏差", "系统片差", "系统误差"],
    suggestions: [
      "网络同时输出残差项与像元级不确定性",
      "最终结果由物理基线与学习残差相加得到",
      "采用时空分块避免训练与验证泄漏",
    ],
    generatedParagraph: "网络以 m_raw、冰厚、速度及其空间梯度等 12 个通道为输入，同时预测残差项 δm 与对数方差 logσ²。最终融化率写为 m_pred = m_raw + δm，使模型只学习物理方程未能解释的部分；训练与验证按冰架和年份分块，以避免相邻像元造成的数据泄漏。",
    diagnostic: "当前输入 32 字 · 历史 2 条 · RAG 3 条 · 首字 1.4 秒",
    historyDone: "已选取 2 条实验设计记录",
    retrievalDone: "已找到特征定义与验证方案",
    handoff: "AX 7 节点 · 历史 2 条 · 召回 Atom、Book",
    sources: [
      { id: "window", label: "窗口语义", title: "当前论文 · 模型方法", detail: "质量守恒基线与残差校正", Icon: FileText },
      { id: "recent", label: "最近完整输入", title: "实验记录 · 2 条", detail: "Residual U-Net 输出 δm 与 logσ²", Icon: History },
      { id: "atom", label: "知识库事实 · Atom", title: "模型特征定义", detail: "输入共 12 个物理与空间特征通道", Icon: CircleDot },
      { id: "book", label: "知识主题 · Book", title: "验证方法", detail: "按冰架与年份进行时空分块", Icon: BookOpen },
    ],
  },
] as const;

const orbitalWork = [
  {
    id: "input",
    name: "输入法",
    tag: "输入层 · RIME FIRST",
    task: "原生候选、完整输入与显式 Agent 怎样分权",
    phase: "Rime 拼音候选 → 完整输入事件 → 提交后 AI 联想",
    receipt: "input-method-plan.md",
    className: "solar-planet--research",
    color: "#a79dff",
    subWorker: "Skill · domain-modeling",
    subVerify: "合同 · Rime owner / input_event / explicit authority",
    metric: "4 层输入边界 · 1 条封口合同",
    summary: "Rime 继续负责拼音和原生候选；完整输入才进入数据链，短联想保持本地，显式生成才读取获准上下文。",
    tdd: "WORKPATCH · INPUT CONTRACT",
  },
  {
    id: "runtime",
    name: "Memory",
    tag: "记忆层 · GOVERNED RECALL",
    task: "1,284 条输入怎样压成任务，再按问题找回",
    phase: "输入事件 → 时间线 / 原子记忆 → 召回回执",
    receipt: "memory-value-loop.md",
    className: "solar-planet--build",
    color: "#ffaa88",
    subWorker: "Skill · rag-retrieval-optimization",
    subVerify: "数据链 · 1,284 inputs / 5 tasks / 3 preferences",
    metric: "1,284 → 5 → 按题召回",
    summary: "一句普通寒暄会自然带回今天的时间线；用户只说“今天有点累”，Agent 再结合相关习惯关心并续接工作。原始输入仍在来源层，不整段灌进 Agent。",
    tdd: "WORKPATCH · RECALL BOUNDED",
  },
  {
    id: "context",
    name: "多 Agent",
    tag: "协作层 · BOUNDED PARALLEL",
    task: "四颗行星怎样并行、通信并汇成一个结果",
    phase: "任务摘要 → 跨星通信 → 工作补丁 → 统一汇总",
    receipt: "multi-agent-room-plan.md",
    className: "solar-planet--verify",
    color: "#75e2b5",
    subWorker: "Skill · implementation-planning",
    subVerify: "通信 · Mars → Venus → Jupiter → Saturn → Mars",
    metric: "4 个 WorkItem · 4 次跨星通信 · 1 个 Root",
    summary: "各伙伴不共享整段私有上下文；仅通过 ContextRefs 交换接口、依赖与证据，各自交付 WorkPatch，最终由 Facilitator 汇总文档。",
    tdd: "WORKPATCH · INTERCOM VISIBLE",
  },
  {
    id: "room",
    name: "PAWOS",
    tag: "桌面层 · RUNTIME PROJECTION",
    task: "怎样把 Input、Memory、Agent 与 Room 放进同一桌面",
    phase: "主状态机 → 应用注册表 → 窗口投影",
    receipt: "pawos-projection-plan.md",
    color: "#8dc5ff",
    subWorker: "Skill · codemap",
    subVerify: "Owner · OS 不复制 Session / Room 状态机",
    metric: "4 个真实应用 · 1 个桌面 · 0 个额外运行时",
    summary: "PAWOS 复用原 Owner 的合同与 Reducer，只负责打开、排列和观察真实应用；发布与前台验收继续分层。",
    tdd: "WORKPATCH · PROJECTION ONLY",
  },
] as const;

// Types text character by character while `active`; shows the full string
// otherwise. Resets whenever it re-activates, so every replay cycle retypes.
function useTypewriter(text: string, active: boolean, speedMs = 44) {
  const [state, setState] = useState({ key: "", count: 0 });
  const key = active ? text : "";
  if (state.key !== key) setState({ key, count: 0 });

  useEffect(() => {
    if (!active || state.count >= text.length) return;
    const timer = window.setInterval(() => {
      setState((current) => current.count >= text.length ? current : { key: current.key, count: current.count + 1 });
    }, speedMs);
    return () => window.clearInterval(timer);
  }, [active, text, speedMs, state.count]);

  return active ? text.slice(0, state.count) : text;
}


function Navbar() {
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-xl">
      <div className="max-w-[1420px] mx-auto flex h-16 items-center justify-between px-5 sm:px-8">
        <a href="#top" className="text-foreground flex items-center gap-2.5 transition-opacity hover:opacity-85" aria-label="回到顶部">
          <span className="text-brand"><PawMark /></span>
          <span className="text-[16px] font-bold tracking-tight">PAW</span>
          <span className="text-muted-foreground/80 hidden font-mono text-[10px] tracking-widest sm:inline">STORY SHOWCASE</span>
        </a>
        <nav className="hidden items-center gap-1.5 xl:flex" aria-label="任务与改进的五个阶段">
          {chapters.map((chapter) => (
            <a href={`#${chapter.id}`} key={chapter.id} className="text-muted-foreground hover:text-foreground hover:bg-black/[0.04] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all">
              <span className="text-brand mr-1.5 font-mono text-[11px] font-semibold">{chapter.index}</span>{chapter.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden lg:inline-flex"><Badge variant="outline" className="font-mono text-[10.5px] tracking-wider rounded-full px-2.5 py-0.5 border-black/[0.08]"><span className="bg-brand size-1.5 rounded-full mr-1" />真实组件交互 · SYNTHETIC DATA</Badge></span>
          <MoreFeaturesMenu/>
          <a className="resume-nav-link" href="#framework">框架与技术</a>
          <a aria-label="作者 GitHub · 7155" className="gh-icon" href="https://github.com/7155" rel="noreferrer" target="_blank"><GithubMark size={17}/></a>
          <LinkButton href="https://github.com/7155/paw-story-showcase" variant="outline" size="sm" iconRight={<SquareArrowOutUpRight />}>源码</LinkButton>
        </div>
      </div>
    </header>
  );
}

function MoreFeaturesMenu() {
  const browserReady = useSyncExternalStore(subscribeBrowserReady, browserSnapshot, serverSnapshot);
  const features = [
    { label: "知识图谱", detail: "Knowledge Graph 与检索关系", Icon: BookOpen, route: "/knowledge", showcaseId: "context-knowledge" },
    { label: "沙盒 Browser", detail: "Browser Tool 与网页任务", Icon: Search, route: "/browser", showcaseId: "browser-sandbox" },
    { label: "运行 Trace", detail: "Trace、Eval 与 Sandbox 回执", Icon: CircleDot, route: "/observability", showcaseId: "context-reliability" },
  ] as const;

  return (
    <details className="more-features-menu">
      <summary aria-label="打开更多功能"><span>更多功能</span><ArrowDown size={13}/></summary>
      <nav aria-label="更多 PAWOS 功能">
        <a href="/details/frontend"><PanelsTopLeft size={15}/><span><strong>前端演进</strong><small>多 Agent 一个月的七种视图</small></span><ArrowRight size={12}/></a>
        <a href="/details/sandbox"><ShieldCheck size={15}/><span><strong>垂直沙盒</strong><small>RAG、CloudOps 与 Trace 真实回执</small></span><ArrowRight size={12}/></a>
        {features.map((feature) => (
          <a aria-disabled={!browserReady} href={browserReady ? pawOsSurfaceUrl(feature.route, feature.showcaseId) : undefined} key={feature.label} rel="noreferrer" target="_blank">
            <feature.Icon size={15}/><span><strong>{feature.label}</strong><small>{feature.detail}</small></span><SquareArrowOutUpRight size={12}/>
          </a>
        ))}
      </nav>
    </details>
  );
}

function ImeDemo() {
  const [scenarioId, setScenarioId] = useState<(typeof inputScenarios)[number]["id"]>("report");
  const [acceptedText, setAcceptedText] = useState<string | null>(null);
  const [decisionReceipt, setDecisionReceipt] = useState<"accepted" | "rejected" | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const { ref: imeViewRef, onScreen: imeOnScreen } = useOnScreen<HTMLDivElement>();
  const caretRef = useRef<HTMLElement>(null);
  const [popupAnchor, setPopupAnchor] = useState({ left: 16, top: 420, ready: false });
  const playback = useTimedLoop(inputTimelineDurations, [12], imeOnScreen);
  const scenario = inputScenarios.find((item) => item.id === scenarioId) ?? inputScenarios[0];
  const typedPrefix = useTypewriter(scenario.typingPrefix, playback.step === 0, 38);
  const typedRoman = useTypewriter(scenario.compositionRoman, playback.step === 1, 85);
  const stageIndex = Math.max(0, Math.min(3, playback.step - 6));
  const showComposition = playback.step === 1;
  const showPending = playback.step === 3;
  const showSuggestions = playback.step === 4 || playback.step === 5;
  const showProgress = playback.step >= 6 && playback.step <= 9;
  const showResult = playback.step >= 10 && playback.step <= 12;
  const showSourceTrace = playback.step >= 6 && playback.step <= 12;
  const sourceVisibleCount = playback.step === 6 ? 1 : playback.step === 7 ? 2 : playback.step >= 8 ? 4 : 0;
  const accepting = playback.step === 12;
  const inserted = playback.step === 13;
  const phaseIndex = playback.step <= 1 ? 0 : playback.step <= 3 ? 1 : playback.step <= 5 ? 2 : playback.step <= 12 ? 3 : 4;
  const phases = ["打字", "提交", "联想", "上下文生成", "插入"];
  const popupWidth = showComposition ? 128 : showPending ? 248 : 440;
  const resultText = playback.step === 10 ? scenario.generatedParagraph.slice(0, Math.ceil(scenario.generatedParagraph.length * .46)) : scenario.generatedParagraph;
  const progressTitle = playback.step === 8 ? "已找到相关内容" : playback.step === 9 ? "正在生成" : "正在准备";
  const pendingDetails = ["等待可访问性上下文", "等待上下文就绪", "等待上下文就绪", "等待检索结果"];
  const imeStages = [
    { title: "理解当前内容", active: "正在读取当前输入与界面信息", done: `已读取 ${scenario.fileName} 与当前段落` },
    { title: "补充近期上下文", active: "正在选择最近完整输入", done: scenario.historyDone },
    { title: "查找相关记忆", active: "正在检索记忆、计划与资料", done: scenario.retrievalDone },
    { title: "组织回答", active: "首段内容已到达，正在继续", done: "回答已生成" },
  ];

  const chooseScenario = (next: (typeof inputScenarios)[number]["id"]) => {
    setScenarioId(next);
    setAcceptedText(null);
    setDecisionReceipt(null);
    playback.restart();
  };

  const acceptText = (text: string) => {
    setAcceptedText(text);
    setDecisionReceipt("accepted");
    playback.goTo(13, true);
  };

  const rejectText = () => {
    setAcceptedText(null);
    setDecisionReceipt("rejected");
    playback.goTo(2, true);
  };

  const effectiveAcceptedText = acceptedText;
  const showAcceptedReceipt = playback.step >= 13 && decisionReceipt === "accepted";
  const showRejectedReceipt = decisionReceipt === "rejected" && playback.step >= 2 && playback.step <= 5;

  useEffect(() => {
    const updatePopupAnchor = () => {
      const demoWindow = windowRef.current;
      const caret = caretRef.current;
      if (!demoWindow || !caret) return;

      const windowRect = demoWindow.getBoundingClientRect();
      const caretRect = caret.getBoundingClientRect();
      const gutter = windowRect.width <= 560 ? 10 : 14;
      const actualWidth = Math.min(popupWidth, windowRect.width - gutter * 2);
      const traceReserve = showSourceTrace && windowRect.width > 1080 ? 310 : 0;
      const maxLeft = Math.max(gutter, windowRect.width - traceReserve - actualWidth - gutter);
      const caretLeft = caretRect.right - windowRect.left;

      setPopupAnchor({
        left: Math.round(Math.min(maxLeft, Math.max(gutter, caretLeft + 6))),
        top: Math.round(caretRect.bottom - windowRect.top + 8),
        ready: true,
      });
    };

    const frame = window.requestAnimationFrame(updatePopupAnchor);
    window.addEventListener("resize", updatePopupAnchor);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePopupAnchor);
    };
  }, [playback.step, popupWidth, scenarioId, showSourceTrace]);

  return (
    <div className="demo-window ime-window" data-phase={phaseIndex} ref={(el) => { windowRef.current = el; imeViewRef.current = el; }}>
      <div className="ime-ambient ime-ambient-one" aria-hidden="true" />
      <div className="ime-ambient ime-ambient-two" aria-hidden="true" />
      <div className="window-bar">
        <div className="traffic"><i /><i /><i /></div>
        <span className="ime-window-title"><strong>{scenario.fileName}</strong><small>PAW 智能输入 · 真实组件回放</small></span>
        <span className="window-state"><CircleDot size={12} /> 已保存到本机</span>
      </div>
      <div className="document-toolbar">
        <strong>开始</strong><span>插入</span><span>布局</span><span>审阅</span><i /><span>正文</span><span>14 pt</span>
        <div className="ime-scenario-switcher" aria-label="切换文档场景">
          {inputScenarios.map((item) => <button aria-pressed={item.id === scenarioId} key={item.id} onClick={() => chooseScenario(item.id)} type="button">{item.label}</button>)}
        </div>
      </div>
      <div className="ime-phase-rail" aria-label="输入法演示进度">
        <div className="ime-phase-line"><i style={{ width: `${phaseIndex * 25}%` }} /></div>
        {phases.map((phase, index) => <span data-state={index < phaseIndex ? "done" : index === phaseIndex ? "active" : "waiting"} key={phase}><b>{index < phaseIndex ? <Check size={12} /> : index + 1}</b>{phase}</span>)}
      </div>
      <div className="document-page" data-inserted={inserted} key={scenario.id}>
        <p className="doc-kicker">{scenario.kicker}</p><h2>{scenario.title}</h2>
        <p className="doc-muted">{scenario.summary}</p><div className="doc-rule" />
        <h3>{scenario.section}</h3><p>{scenario.body}</p>
        <div className="typing-line" data-committed={playback.step >= 2}>
          {playback.step <= 1 ? typedPrefix : scenario.committedSentence}
          {showComposition ? <span className="composition-roman">{typedRoman}</span> : null}
          <i className="ime-caret-anchor" data-active={phaseIndex < 4} ref={caretRef}><b className="caret" /></i>
        </div>
        {inserted && effectiveAcceptedText ? <p className="generated-paragraph">{effectiveAcceptedText}</p> : null}
        {showAcceptedReceipt ? <div className="insert-receipt"><Check size={12} /> 已由用户采纳并写入 · 可撤销</div> : null}
        {showRejectedReceipt ? <div className="insert-receipt" data-decision="rejected"><CircleAlert size={12} /> 已拒绝本轮联想 · 未写入文档</div> : null}
      </div>
      <div className="ime-statusbar"><span>中文（简体）</span><span><Keyboard size={13} /> PAW 智能输入</span><span><Mic size={13} /> 语音</span></div>
      {showComposition ? (
        <div className="rime-candidate-menu" aria-label="拼音候选" data-anchor-ready={popupAnchor.ready} style={{ left: popupAnchor.left, top: popupAnchor.top }}>
          {scenario.rimeCandidates.map((candidate, index) => (
            <button data-primary={index === 0} key={candidate} onClick={() => playback.goTo(2)} type="button"><span>{index + 1}.</span>{candidate}</button>
          ))}
        </div>
      ) : null}
      {showPending ? (
        <div className="native-ime-card native-ime-card--pending" data-anchor-ready={popupAnchor.ready} data-surface="pendingPrediction" style={{ left: popupAnchor.left, top: popupAnchor.top }}>
          <div className="native-ime-pending-actions">
            <button aria-label="生成" type="button"><Sparkles size={13} /></button>
            <i />
            <button aria-label="深度" type="button"><Search size={13} /></button>
          </div>
          <span
            aria-hidden="true"
            className="native-ime-companion"
            style={{ backgroundImage: "url(/rag-ime-companion-thinking.png)" }}
          />
          <strong>正在联想</strong>
        </div>
      ) : null}
      {showSuggestions ? (
        <div className="native-ime-card native-ime-card--suggestions" data-anchor-ready={popupAnchor.ready} data-clicked={playback.step === 5} data-surface="compactPrediction" style={{ left: popupAnchor.left, top: popupAnchor.top }}>
          <div className="native-ime-candidates">
            {scenario.suggestions.map((suggestion, index) => (
              <button aria-label={`采纳联想：${suggestion}`} data-primary={index === 0} key={suggestion} onClick={() => acceptText(suggestion)} type="button">
                <i />
                <kbd>{index === 0 ? "Tab" : `⌥${index + 1}`}</kbd>
                <strong>{suggestion}</strong>
              </button>
            ))}
          </div>
          <div className="native-ime-suggestion-actions">
            <button data-pressed={playback.step === 5} onClick={() => playback.goTo(5)} type="button"><Sparkles size={13} />{playback.step === 5 ? "已点击 · 生成中" : "点击生成"}</button>
            <button onClick={rejectText} type="button"><CircleAlert size={13} />拒绝联想</button>
          </div>
          <small className="ime-autoplay-note">演示回放：停留约 2 秒后模拟用户点击生成</small>
        </div>
      ) : null}
      {showProgress ? (
        <div className="native-ime-card native-ime-card--thinking" data-anchor-ready={popupAnchor.ready} data-surface="explicitGenerating" style={{ left: popupAnchor.left, top: popupAnchor.top }}>
          <span className="native-ime-rail" />
          <header><strong>{progressTitle}</strong><button aria-label="停止生成" type="button"><Square size={10} fill="currentColor" /></button></header>
          <div className="native-ime-progress">
            {imeStages.map((stage, index) => {
              const state = index < stageIndex ? "done" : index === stageIndex ? "active" : "pending";
              const detail = state === "done" ? stage.done : state === "active" ? stage.active : pendingDetails[index];
              return <div className="native-ime-stage" data-state={state} key={stage.title}><span>{state === "done" ? <Check size={13} /> : state === "active" ? <Sparkles size={13} /> : <i />}</span><strong>{stage.title}</strong><small>{detail}</small></div>;
            })}
          </div>
        </div>
      ) : null}
      {showResult ? (
        <div className="native-ime-card native-ime-card--result" data-accepting={accepting} data-anchor-ready={popupAnchor.ready} data-surface="explicitResult" style={{ left: popupAnchor.left, top: popupAnchor.top }}>
          <span className="native-ime-rail" />
          <header><kbd>Tab 插入</kbd><strong>{playback.step === 10 ? "正在接收内容" : "生成结果 · 等待用户决定"}</strong><button aria-label="拒绝并关闭" onClick={rejectText} type="button">×</button></header>
          <p className="native-ime-diagnostic">{scenario.diagnostic}</p>
          {playback.step === 10 ? <p className="native-ime-handoff">{scenario.handoff}</p> : null}
          <div className="native-ime-result-copy">{resultText}<b className="stream-caret" /></div>
          <footer><button onClick={() => acceptText(scenario.generatedParagraph)} type="button">采纳并插入</button><button onClick={() => playback.goTo(6)} type="button">重试</button><button aria-label="拒绝结果" onClick={rejectText} type="button">拒绝</button></footer>
        </div>
      ) : null}
      <aside className="rag-source-trace" data-visible={showSourceTrace} aria-label="本轮上下文与数据源">
        <header><span>获准上下文 · CONTEXT</span><strong>本轮实际使用</strong><small>{sourceVisibleCount}/4</small></header>
        <div>
          {scenario.sources.map((source, index) => {
            const Icon = source.Icon;
            const state = index < sourceVisibleCount ? (index === sourceVisibleCount - 1 && playback.step < 9 ? "active" : "used") : "waiting";
            return (
              <article data-kind={source.id} data-state={state} key={source.id}>
                <span><Icon size={13} /></span>
                <div><small>{source.label}</small><strong>{source.title}</strong><p>{source.detail}</p></div>
                <i>{state === "used" ? <Check size={10} /> : null}</i>
              </article>
            );
          })}
        </div>
        <footer><ShieldCheck size={12} /> 只发送本轮获准使用的片段</footer>
      </aside>
    </div>
  );
}

const voiceTimelineDurations = [1_800, 2_000, 2_400, 2_000, 3_800, 3_200] as const;

function VoiceInputDemo() {
  const { ref: voiceViewRef, onScreen: voiceOnScreen } = useOnScreen<HTMLDivElement>();
  const playback = useTimedLoop(voiceTimelineDurations, [], voiceOnScreen);
  const stageLabels = ["准备就绪", "按住说话", "实时转写", "松开按键", "文字定稿", "写回应用"];
  const interim = playback.step <= 1
    ? ""
    : playback.step === 2
      ? "八月二十四日我们把文件写入和文档登记做成了强一致"
      : "八月二十四日我们把文件写入和文档登记做成强一致，五天后又推翻了这个决定";
  const finalized = playback.step >= 4;
  const inserted = playback.step >= 5;

  return (
    <div ref={voiceViewRef} className="voice-feature-demo" data-finalized={finalized || undefined} data-inserted={inserted || undefined}>
      <header className="voice-demo-titlebar">
        <div className="traffic"><i/><i/><i/></div>
        <span><Mic size={15}/><strong>PAW · Input Studio / 语音输入</strong><small>VoiceFeature · synthetic session</small></span>
        <b><i/> 听写服务运行中</b>
      </header>
      <div className="voice-demo-shell">
        <aside className="voice-demo-sidebar">
          <PawMark/><strong>Input Studio</strong>
          <nav><button type="button"><Keyboard size={14}/>输入法</button><button data-active type="button"><Mic size={14}/>语音</button><button type="button"><BookOpen size={14}/>词库</button><button type="button"><History size={14}/>输入记录</button></nav>
          <footer><ShieldCheck size={13}/><span>不保存音频<br/>不会让伙伴朗读</span></footer>
        </aside>
        <main className="voice-demo-main">
          <header><div><p>SAY IT TO PAW</p><h2>把说话变成输入文字。</h2><span>边说边显示，松开后补充完整文字，再写回当前应用。</span></div><button type="button"><RefreshCw size={13}/>刷新</button></header>
          <div className="voice-readiness-strip">
            <article><span><i/><strong>听写服务</strong></span><b>运行中</b><small>实时听写</small></article>
            <article><span><i/><strong>麦克风</strong></span><b>已允许</b><small>系统授权</small></article>
            <article><span><i/><strong>辅助功能</strong></span><b>已允许</b><small>写回当前应用</small></article>
            <article><span><i/><strong>文字定稿</strong></span><b>已就绪</b><small>保守校对</small></article>
          </div>
          <div className="voice-demo-workspace">
            <section className="voice-live-session">
              <header><span><i className="voice-record-dot"/> 实时听写 · LIVE</span><small>鼠标中键 · 按住说话</small></header>
              <div className="voice-wave" data-speaking={playback.step >= 1 && playback.step <= 3}>{Array.from({ length: 34 }).map((_, index) => <i key={index} style={{ "--wave-index": index } as React.CSSProperties}/>)}</div>
              <div className="voice-transcript-card">
                <span>{finalized ? "完整文字 · FINAL TEXT" : "临时听写 · INTERIM"}</span>
                <p>{finalized ? "8 月 24 日，我们把文件写入和文档登记做成强一致；5 天后又推翻了这个决定。" : interim || "按住鼠标中键开始说话…"}<i/></p>
              </div>
              <ol aria-label="语音输入处理阶段">
                {stageLabels.map((label, index) => <li data-state={index < playback.step ? "done" : index === playback.step ? "active" : "waiting"} key={label}><span>{index < playback.step ? <Check size={10}/> : index + 1}</span><strong>{label}</strong></li>)}
              </ol>
            </section>
            <aside className="voice-refinement-panel">
              <header><Sparkles size={14}/><span><strong>文字定稿</strong><small>识别结束后的保守校对</small></span></header>
              <div><span>临时听写</span><p><span>八月二十四日</span>我们把文件写入和文档登记做成强一致<span>五天后</span>又推翻了这个决定</p></div>
              <ArrowDown size={14}/>
              <div data-result><span>完整文字</span><p><b>8 月 24 日</b>，我们把文件写入和文档登记做成强一致；<b>5 天后</b>又推翻了这个决定。</p></div>
              <dl><div><dt>热词</dt><dd>WorkDocument · workspace_write</dd></div><div><dt>正文日志</dt><dd>不写入诊断记录</dd></div><div><dt>写回</dt><dd>{inserted ? "已写入《PAW Agent 安全写入复盘》" : "等待完整文字"}</dd></div></dl>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}


function Slide({ id, index, title, sub, detailHref, detailLabel, secondaryDetailHref, secondaryDetailLabel, projects, bare = false, headingLevel = "h2", children }: {
  id: string;
  index: string;
  title: string;
  sub: string;
  detailHref?: string;
  detailLabel?: string;
  secondaryDetailHref?: string;
  secondaryDetailLabel?: string;
  projects: readonly { href: string; label: string }[];
  bare?: boolean;
  headingLevel?: "h1" | "h2";
  children: ReactNode;
}) {
  const Heading = headingLevel;
  return (
    <section className="slide" id={id}>
      <header className="slide-head">
        <span className="slide-index">{index}</span>
        <Heading>{title}</Heading>
        <p>{sub}</p>
        <div className="slide-links">
          {detailHref && detailLabel ? <a className="slide-detail" href={detailHref}>{detailLabel}<ArrowRight size={13}/></a> : null}
          {secondaryDetailHref && secondaryDetailLabel ? <a className="slide-detail slide-detail--secondary" href={secondaryDetailHref}>{secondaryDetailLabel}<ArrowRight size={13}/></a> : null}
          {projects.map((project) => <GithubBadge href={project.href} key={project.href} label={project.label}/>)}
        </div>
      </header>
      <div className={bare ? "slide-frame slide-frame--bare" : "slide-frame"}>{children}</div>
    </section>
  );
}

function InputSlide() {
  const [inputMode, setInputMode] = useState<"keyboard" | "voice">("keyboard");
  return (
    <Slide detailHref="/details/input" detailLabel="输入详情" id="input" projects={[{ href: "https://github.com/7155/minimind-ime", label: "minimind-ime" }, { href: "https://github.com/7155/aios", label: "AIOS-IME" }]} index="05 · 回到日常工作的入口" sub="有了可召回的上下文，下一次继续工作可以从正在写的文档开始。下面用 PAW 的设计复盘展示：提交完整输入、找回相关资料、生成补充，再由你决定写回。" title="让每个输入框，都成为一个了解你的 AI 入口。">
      <div className="slide-frame-bar">
        <div className="slide-switch" role="group" aria-label="切换输入能力演示">
          <button aria-pressed={inputMode === "keyboard"} onClick={() => setInputMode("keyboard")} type="button"><Keyboard size={14}/>智能输入法</button>
          <button aria-pressed={inputMode === "voice"} onClick={() => setInputMode("voice")} type="button"><Mic size={14}/>语音转文字</button>
        </div>
        <span className="slide-frame-note">真实组件回放 · 合成演示数据</span>
      </div>
      <div className="slide-frame-body">
        {inputMode === "keyboard" ? <ImeDemo/> : <VoiceInputDemo/>}
      </div>
    </Slide>
  );
}

const contextTabs = [
  { id: "memory", label: "输入 → 记忆 → 召回", icon: Brain, route: "/history", showcaseId: "memory-flow", title: "输入到记忆召回 · 实际 PAWOS 前端" },
  { id: "knowledge", label: "知识库", icon: BookOpen, route: "/knowledge", showcaseId: "context-knowledge", title: "知识库 · 实际 PAWOS 前端" },
  { id: "project", label: "项目文档", icon: FileText, route: "/work-documents", showcaseId: "context-project", title: "项目文档 · 实际 PAWOS 前端" },
] as const;

const memoryShowcaseStages = [
  { id: "history-list", label: "查看采集结果", detail: "进入输入记录，鼠标定位到一条真实采集项" },
  { id: "history-detail", label: "打开原始输入", detail: "点击具体记录，查看 App、时间与完整输入" },
  { id: "daily-memory", label: "一天整理结果", detail: "关闭详情并切换 Memory，查看当天任务与记忆" },
  { id: "graph", label: "关系 Graph", detail: "打开关系图，查看输入、任务、偏好与来源连接" },
  { id: "recall", label: "对话找回", detail: "进入 Agent 对话，让当天记忆自然参与回答" },
  { id: "evidence", label: "证据回跳", detail: "展开召回依据，再点击来源返回同一条原始输入" },
] as const satisfies readonly ShowcaseStage[];

const memoryShowcaseDurations = [4_200, 4_800, 5_000, 4_800, 5_200, 6_800] as const;

function ContextSlide() {
  const [activeTabId, setActiveTabId] = useState<(typeof contextTabs)[number]["id"]>("memory");
  const { ref: memoryViewRef, onScreen: memoryOnScreen } = useOnScreen<HTMLDivElement>();
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, serverSnapshot);
  const memoryPlayback = useTimedLoop(memoryShowcaseDurations, [], memoryOnScreen && activeTabId === "memory" && !reducedMotion);
  const setMemoryPlaying = memoryPlayback.setPlaying;
  const [memoryReplayEpoch, setMemoryReplayEpoch] = useState(0);
  const browserReady = useSyncExternalStore(subscribeBrowserReady, browserSnapshot, serverSnapshot);
  const activeTab = contextTabs.find((tab) => tab.id === activeTabId) ?? contextTabs[0];
  const fullscreenUrl = browserReady ? pawOsSurfaceUrl(activeTab.route, activeTab.showcaseId) : null;

  useEffect(() => {
    if (reducedMotion) setMemoryPlaying(false);
  }, [reducedMotion, setMemoryPlaying]);

  const restartMemory = () => {
    setMemoryReplayEpoch((value) => value + 1);
    memoryPlayback.goTo(0, !reducedMotion);
  };

  return (
    <Slide detailHref="/details/context" detailLabel="上下文详情" id="memory" projects={[{ href: "https://github.com/7155/paw-story-showcase", label: "paw-story-showcase" }, { href: "https://github.com/7155/personal-agent-workbench", label: "personal-agent-workbench" }]} index="04 · 下一次继续工作" sub="工作结束后，项目决定、相关输入与资料需要能被再次找到。这个独立的日常工作场景展示输入如何整理为任务与记忆，再按当前问题召回，并返回原始来源。" title="下次接着做，不必从头解释。">
      <div className="slide-frame-bar">
        <div className="slide-switch" role="tablist" aria-label="切换上下文前端">
          {contextTabs.map((tab) => (
            <button aria-selected={activeTabId === tab.id} key={tab.id} onClick={() => setActiveTabId(tab.id)} role="tab" type="button"><tab.icon size={14}/>{tab.label}</button>
          ))}
        </div>
        {fullscreenUrl ? <a className="slide-open" href={fullscreenUrl} rel="noreferrer" target="_blank">全屏打开<SquareArrowOutUpRight size={12}/></a> : null}
      </div>
      {activeTabId === "memory" ? (
        <div ref={memoryViewRef}>
          <ShowcasePlayback
            ariaLabel="输入、记忆与召回演示控制"
            disabled={reducedMotion}
            onRestart={restartMemory}
            onSeek={(step) => memoryPlayback.goTo(step, false)}
            onToggle={() => setMemoryPlaying(!memoryPlayback.playing)}
            playing={memoryPlayback.playing && memoryOnScreen && !reducedMotion}
            stages={memoryShowcaseStages}
            step={memoryPlayback.step}
          />
        </div>
      ) : null}
      <div className="slide-frame-body">
        {contextTabs.map((tab) => (
          <div className="slide-pane" hidden={activeTabId !== tab.id} key={tab.id} role="tabpanel">
            <RealSurface
              active={activeTabId === tab.id}
              director={tab.id === "memory" ? {
                eventIndex: memoryPlayback.step,
                playing: memoryPlayback.playing && memoryOnScreen && !reducedMotion,
                replayEpoch: memoryReplayEpoch,
                stageId: memoryShowcaseStages[memoryPlayback.step]?.id ?? memoryShowcaseStages[0].id,
              } : undefined}
              route={tab.route}
              showcaseId={tab.showcaseId}
              title={tab.title}
            />
          </div>
        ))}
      </div>
    </Slide>
  );
}

type ShowcaseDirectorState = {
  stageId: string;
  eventIndex: number;
  playing: boolean;
  replayEpoch: number;
};

function RealSurface({ route, showcaseId, title, active = true, director }: {
  route: string;
  showcaseId: string;
  title: string;
  active?: boolean;
  director?: ShowcaseDirectorState;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [instanceId] = useState(() => `story-${showcaseId}`);
  const requestSequenceRef = useRef(0);
  const sentEpochRef = useRef(-1);
  const [inView, setInView] = useState(false);
  const [loadedDocument, setLoadedDocument] = useState("");
  const [directorReadyDocument, setDirectorReadyDocument] = useState("");
  const browserReady = useSyncExternalStore(subscribeBrowserReady, browserSnapshot, serverSnapshot);

  useEffect(() => {
    const node = hostRef.current;
    if (!node || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setInView(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView]);

  const source = useMemo(
    () => (browserReady && inView && active ? pawOsSurfaceUrl(route, showcaseId, instanceId) : ""),
    [browserReady, inView, active, instanceId, route, showcaseId],
  );
  const documentSource = source.split("#", 1)[0] ?? "";
  const loaded = Boolean(documentSource) && loadedDocument === documentSource;
  const directorReady = Boolean(documentSource) && directorReadyDocument === documentSource;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !source || !director) return;
    const expectedOrigin = new URL(source, window.location.href).origin;
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.origin !== expectedOrigin) return;
      const payload = event.data as Record<string, unknown> | null;
      if (!payload || payload.channel !== "paw.showcase" || payload.version !== 1) return;
      if (payload.showcaseId !== showcaseId || payload.instanceId !== instanceId) return;
      if (payload.type === "ready") {
        sentEpochRef.current = -1;
        setDirectorReadyDocument(documentSource);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [director, documentSource, instanceId, showcaseId, source]);

  useEffect(() => {
    const target = frameRef.current?.contentWindow;
    if (!target || !source || !loaded || !directorReady || !director) return;
    const targetOrigin = new URL(source, window.location.href).origin;
    const send = (command: "stage.set" | "seek" | "playback.set" | "replay.reset") => {
      requestSequenceRef.current += 1;
      target.postMessage({
        channel: "paw.showcase",
        version: 1,
        type: "command",
        showcaseId,
        instanceId,
        requestId: `${instanceId}-${requestSequenceRef.current}`,
        replayEpoch: director.replayEpoch,
        command,
        stageId: director.stageId,
        eventIndex: director.eventIndex,
        playing: director.playing,
      }, targetOrigin);
    };

    if (sentEpochRef.current !== director.replayEpoch) {
      sentEpochRef.current = director.replayEpoch;
      send("replay.reset");
    }
    send("stage.set");
    send("seek");
    send("playback.set");
  }, [director, directorReady, instanceId, loaded, showcaseId, source]);

  return (
    <div className="real-surface" data-loaded={loaded || undefined} ref={hostRef}>
      <div className="real-surface-loading" role="status"><RefreshCw size={18}/><span><strong>正在打开实际 PAWOS 窗口</strong><small>界面与交互来自本项目 control-center-web · 公开合成数据</small></span></div>
      <iframe
        allow="clipboard-read; clipboard-write"
        loading="lazy"
        onLoad={() => { if (documentSource) setLoadedDocument(documentSource); }}
        ref={frameRef}
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
        src={source || undefined}
        title={title}
      />
    </div>
  );
}

function RoomSlide() {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Slide bare detailHref="/details/agents" detailLabel="协作详情" secondaryDetailHref="/details/frontend" secondaryDetailLabel="前端演进" id="agents" projects={[{ href: "https://github.com/7155/personal-agent-workbench", label: "personal-agent-workbench" }, { href: "https://github.com/7155/paw-story-showcase", label: "paw-story-showcase" }]} index="01 · 协作交付" sub="以 PAW 立项为例：输入、记忆、多 Agent 和桌面四条产品线分别推进，交换接口与依赖，再汇成一个共同方案。每个 Agent 都能回看原始目标，必要时提出质疑；Facilitator 负责整合交付。" title="一个目标，怎样变成共同完成的结果？">
      <div className="slide-deferred" ref={ref}>
        {inView ? <RoomTransformationDemo/> : null}
      </div>
      <CollaborationResult />
    </Slide>
  );
}

const reliabilityStages = [
  {
    id: "observe",
    label: "运行异常",
    status: "异常告警 · 4 SESSIONS NEED ATTENTION",
    title: "先从异常 Session 找到真正值得追的信号",
    body: "第一屏同时出现 Tool error、运行时间异常过长、被错误提升到前台的 Sub Agent，以及只检查 Worker 自我总结的 Skill 测评。鼠标会进入 PAWOS，悬停并点击具体 Session 的“交给 Trace Agent”。",
    facts: [
      { label: "Tool", value: "workspace_write · 执行错误" },
      { label: "耗时", value: "14m 32s · 无进展" },
      { label: "Sub Agent", value: "前台阻塞 · 应转为后台" },
      { label: "Skill / Eval", value: "仅有工作总结，缺乏硬证据" },
    ],
  },
  {
    id: "report",
    label: "Trace 诊断",
    status: "TRACE AGENT · 只读分析模式",
    title: "点击交给 Trace Agent，报告快速流式生成",
    body: "Trace Agent 沿 Session、Tool 与 Sub Agent 事件还原时间线；文字逐段出现，先区分症状与第一根因，再给出需要用户授权的最小修复建议。",
    facts: [
      { label: "诊断范围", value: "会话 + 工具 + 子 Agent 生命周期" },
      { label: "输出方式", value: "流式输出 · 证据链回溯" },
      { label: "当前权限", value: "只读模式 · 尚未授权修复" },
      { label: "Skill 测评", value: "SkillRef + 评估标准 + 诊断回执" },
    ],
  },
  {
    id: "repair",
    label: "授权修复",
    status: "用户授权 · REPAIR SESSION",
    title: "诊断不会自己改代码，鼠标确认后才开始修复",
    body: "用户点击授权，系统另开有界 Repair Session。修复步骤同样流式出现，并明确显示改动范围、测试和仍未验证的边界。",
    facts: [
      { label: "写入权限", value: "受约束的独立 Repair Session" },
      { label: "修改范围", value: "负责模块 + 针对性回归测试" },
      { label: "当前状态", value: "applied + tested ≠ verified" },
    ],
  },
  {
    id: "verify",
    label: "前后对比",
    status: "BEFORE / AFTER · 证据全链路可溯",
    title: "修复完成后，用同一 Case 展示前后差异",
    body: "最终复用 Trace Agent 报告里的前后对照表：错误、耗时与 Sub Agent 生命周期逐项比较；点击任一 Trace 引用，都能跳回形成判断的原始事件。",
    facts: [
      { label: "Tool error", value: "执行失败 → 自动恢复" },
      { label: "运行时间", value: "14m 32s → 2m 18s" },
      { label: "Sub Agent", value: "前台阻塞 → 后台静默处理" },
      { label: "Skill / Eval", value: "自我总结 → 原始需求 + 行为 + 严格测试" },
    ],
  },
] as const;

const reliabilityStageDurations = [7_000, 8_500, 8_000, 8_500] as const;
const reliabilityShowcaseId = "context-reliability";
const reliabilityPlaybackStages = reliabilityStages.map((stage) => ({
  id: stage.id,
  label: stage.label,
  detail: stage.title,
})) satisfies readonly ShowcaseStage[];

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function reducedMotionSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ReliabilitySlide() {
  const { ref: reliabilityViewRef, onScreen: reliabilityOnScreen } = useOnScreen<HTMLDivElement>();
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, serverSnapshot);
  const [replayEpoch, setReplayEpoch] = useState(0);
  const playback = useTimedLoop(
    reliabilityStageDurations,
    [],
    reliabilityOnScreen && !reducedMotion,
  );
  const setReliabilityPlaying = playback.setPlaying;
  const browserReady = useSyncExternalStore(subscribeBrowserReady, browserSnapshot, serverSnapshot);
  const activeStage = reliabilityStages[playback.step] ?? reliabilityStages[0];
  const reliabilityRoute = "/agent?session=session-reliability-incident";
  const fullscreenUrl = browserReady ? pawOsSurfaceUrl(reliabilityRoute, reliabilityShowcaseId) : null;

  useEffect(() => {
    if (reducedMotion) setReliabilityPlaying(false);
  }, [reducedMotion, setReliabilityPlaying]);

  const restartReliability = () => {
    setReplayEpoch((value) => value + 1);
    playback.goTo(0, !reducedMotion);
  };

  return (
    <Slide
      id="reliability"
      index="02 · 对照要求检查结果"
      projects={[{ href: "https://github.com/7155/personal-agent-workbench", label: "personal-agent-workbench" }, { href: "https://github.com/7155/paw-story-showcase", label: "paw-story-showcase" }]}
      sub="交付之后，把原始要求与实际行为、测试结果逐项对照。下面切到一个独立的故障回放：从工具错误和执行停滞找到原因，修复后重跑同一案例，检查原来的问题是否消失。"
      title="Agent 出错以后，怎样证明它真的变好了？"
    >
      <div ref={reliabilityViewRef}>
        <ShowcasePlayback
          ariaLabel="Trace 诊断、修复与验证演示控制"
          disabled={reducedMotion}
          onRestart={restartReliability}
          onSeek={(step) => playback.goTo(step, false)}
          onToggle={() => playback.setPlaying(!playback.playing)}
          playing={playback.playing && reliabilityOnScreen && !reducedMotion}
          stages={reliabilityPlaybackStages}
          step={playback.step}
          trailing={fullscreenUrl ? <a className="slide-open" href={fullscreenUrl} rel="noreferrer" target="_blank">全屏打开<SquareArrowOutUpRight size={12}/></a> : null}
        />
      </div>
      <aside className="reliability-stage-note" aria-live="polite" data-stage={activeStage.id}>
        <b>{activeStage.status}</b><p>{activeStage.body}</p>
        <dl>{activeStage.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
        <small>PUBLIC SYNTHETIC REPLAY · 公开合成回放（演示耗时不代表真实运行时性能）</small>
      </aside>
      <div className="slide-frame-body reliability-surface" data-stage={activeStage.id}>
        <RealSurface
          director={{
            eventIndex: playback.step,
            playing: playback.playing && reliabilityOnScreen && !reducedMotion,
            replayEpoch,
            stageId: activeStage.id,
          }}
          route={reliabilityRoute}
          showcaseId={reliabilityShowcaseId}
          title="Trace Agent 诊断、修复与前后对比 · 实际 PAWOS 前端"
        />
      </div>
    </Slide>
  );
}

type RoomStage = "orbit" | "morph" | "windows";

const roomPlaybackStages = [
  { id: "orbit", label: "分配与并行", detail: "Facilitator 把独立产品线分给不同 Agent" },
  { id: "morph", label: "交接与汇合", detail: "ContextRefs、接口与证据在 Partner 之间传递" },
  { id: "windows", label: "执行与交付", detail: "查看各条产品线的工作文档、交接与共同结果" },
] as const satisfies readonly ShowcaseStage[];

type MorphGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  originDx: number;
  originDy: number;
  originScale: number;
};

const roomMorphTargets = [
  { left: 4, top: 6, width: 30, height: 28 },
  { left: 36, top: 6, width: 30, height: 28 },
  { left: 4, top: 38, width: 30, height: 28 },
  { left: 36, top: 38, width: 30, height: 28 },
] as const;

function RoomTransformationDemo() {
  const orbitLoop = useLoop(orbitalWork.length, 1700, false);
  const setOrbitPlaying = orbitLoop.setPlaying;
  const [stage, setStage] = useState<RoomStage>("orbit");
  const [playing, setPlaying] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, serverSnapshot);
  const [morphGeometry, setMorphGeometry] = useState<MorphGeometry[]>([]);
  const roomRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const stageStateRef = useRef<RoomStage>("orbit");

  useEffect(() => {
    stageStateRef.current = stage;
  }, [stage]);

  // Pause the WebGL orbit loop when the stage scrolls out of view; resume the
  // ambient orbit when it comes back. Morph and window stages are untouched.
  useEffect(() => {
    const node = roomRef.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) {
        if (stageStateRef.current === "orbit") {
          setPlaying(false);
          setOrbitPlaying(false);
        }
      } else if (startedRef.current && stageStateRef.current === "orbit" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setPlaying(true);
        setOrbitPlaying(true);
      }
    }, { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [setOrbitPlaying]);

  const captureMorphGeometry = useCallback(() => {
    const stageNode = stageRef.current;
    if (!stageNode) return;

    const stageRect = stageNode.getBoundingClientRect();
    const anchors = new Map(
      Array.from(stageNode.querySelectorAll<HTMLElement>("[data-planet-origin]")).map((node) => [
        node.dataset.planetOrigin ?? "",
        node.getBoundingClientRect(),
      ]),
    );

    const geometry = orbitalWork.map((work, index) => {
      const target = roomMorphTargets[index] ?? roomMorphTargets[0];
      const targetWidth = stageRect.width * target.width / 100;
      const targetHeight = stageRect.height * target.height / 100;
      const targetCenterX = stageRect.width * (target.left + target.width / 2) / 100;
      const targetCenterY = stageRect.height * (target.top + target.height / 2) / 100;
      const anchor = anchors.get(work.id);
      const fallbackAngle = index * Math.PI / 2 + Math.PI / 4;
      const rawOriginX = anchor
        ? anchor.left + anchor.width / 2 - stageRect.left
        : stageRect.width * (0.5 + Math.cos(fallbackAngle) * 0.23);
      const rawOriginY = anchor
        ? anchor.top + anchor.height / 2 - stageRect.top
        : stageRect.height * (0.48 + Math.sin(fallbackAngle) * 0.2);
      const originX = Math.min(Math.max(rawOriginX, 24), stageRect.width - 24);
      const originY = Math.min(Math.max(rawOriginY, 24), stageRect.height - 24);

      return {
        ...target,
        originDx: originX - targetCenterX,
        originDy: originY - targetCenterY,
        originScale: Math.min(0.22, Math.max(0.1, 38 / Math.max(targetWidth, targetHeight))),
      };
    });

    setMorphGeometry(geometry);
  }, []);

  const beginMorph = useCallback(() => {
    setOrbitPlaying(false);

    if (reducedMotion) {
      setPlaying(false);
      setStage("windows");
      return;
    }

    captureMorphGeometry();
    setPlaying(true);
    setStage("morph");
  }, [captureMorphGeometry, reducedMotion, setOrbitPlaying]);

  useEffect(() => {
    if (!playing) return;

    const timer = window.setTimeout(() => {
      if (stage === "orbit") {
        beginMorph();
        return;
      }

      if (stage === "morph") {
        setPlaying(false);
        setStage("windows");
      }
    }, stage === "orbit" ? 7_600 : 2_600);

    return () => window.clearTimeout(timer);
  }, [beginMorph, playing, stage]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handlePreference = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setPlaying(false);
        setOrbitPlaying(false);
        setStage((current) => current === "morph" ? "windows" : current);
      }
    };
    media.addEventListener("change", handlePreference);

    return () => media.removeEventListener("change", handlePreference);
  }, [setOrbitPlaying]);

  useEffect(() => {
    const node = roomRef.current;
    if (!node || startedRef.current) return;

    const startSequence = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      if (!reducedMotion) {
        setPlaying(true);
        setOrbitPlaying(true);
      }
    };

    if (!("IntersectionObserver" in window)) {
      startSequence();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          startSequence();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [reducedMotion, setOrbitPlaying]);

  const restart = () => {
    orbitLoop.restart();
    setStage("orbit");
    setPlaying(!reducedMotion);
    if (reducedMotion) setOrbitPlaying(false);
    setRunKey((value) => value + 1);
  };

  const selectPartner = (index: number) => {
    orbitLoop.setStep(index);
    orbitLoop.setPlaying(false);
  };

  const seekRoom = (step: number) => {
    setOrbitPlaying(false);
    setPlaying(false);
    if (step <= 0) {
      setStage("orbit");
      return;
    }
    if (step === 1) {
      captureMorphGeometry();
      setStage("morph");
      return;
    }
    setStage("windows");
  };

  const toggleRoomPlayback = () => {
    if (stage === "windows") {
      restart();
      return;
    }
    const nextPlaying = !playing;
    setPlaying(nextPlaying);
    setOrbitPlaying(stage === "orbit" && nextPlaying);
  };

  const roomStep = stage === "orbit" ? 0 : stage === "morph" ? 1 : 2;

  return (
    <div className="room-transformation" data-stage={stage} ref={roomRef}>
      <ShowcasePlayback
        ariaLabel="多 Agent 协作演示控制"
        disabled={reducedMotion}
        onRestart={restart}
        onSeek={seekRoom}
        onToggle={toggleRoomPlayback}
        playing={playing}
        stages={roomPlaybackStages}
        step={roomStep}
      />
      <div className="room-transformation-stage" ref={stageRef}>
        <div className="room-orbit-layer" aria-hidden={stage === "windows"}>
          <Suspense fallback={<div className="solar-3d-fallback"><Orbit size={18}/><span>正在加载 3D 引力场…</span></div>}>
            <SolarSystem3D
              activeStep={orbitLoop.step}
              isPlaying={playing && orbitLoop.playing}
              onSelectStep={selectPartner}
              orbitalWork={orbitalWork}
            />
          </Suspense>
          <div className="room-orbit-caption"><span><i/> SOL</span><p><strong>多维检测</strong>不同 Agent 分别实现、质疑和验收；Reviewer Skill 明确对照用户原话、需求文档、程序行为与测试证据。独立工作并行推进，Room 负责传递任务、上下文与结果。</p></div>
        </div>

        <div className="room-morph-bridge" aria-hidden="true">
          <div className="room-morph-desktop">
            <header><span><i/><i/><i/></span><strong>PAWOS · ROOM / PAW 立项</strong><small>需求追问 → 4 条产品线 → 行星通信 → Docs → Review</small></header>
          </div>
          {orbitalWork.map((work, index) => {
            const geometry = morphGeometry[index] ?? {
              ...roomMorphTargets[index],
              originDx: 0,
              originDy: 0,
              originScale: 0.12,
            };
            return (
              <article
                className="room-morph-window"
                key={work.id}
                style={{
                  "--morph-color": work.color,
                  "--morph-index": index,
                  "--morph-left": `${geometry.left}%`,
                  "--morph-top": `${geometry.top}%`,
                  "--morph-width": `${geometry.width}%`,
                  "--morph-height": `${geometry.height}%`,
                  "--origin-dx": `${geometry.originDx}px`,
                  "--origin-dy": `${geometry.originDy}px`,
                  "--origin-scale": geometry.originScale,
                  "--morph-delay": `${180 + index * 70}ms`,
                } as React.CSSProperties}
              >
                <header><span><i/><i/><i/></span><strong>{work.name}</strong><b>实施 Agent · IMPLEMENTER</b></header>
                <div><small>{work.tag}</small><h4>{work.task}</h4><p>{work.phase}</p><footer><FileCheck2 size={11}/><code>{work.receipt}</code></footer></div>
              </article>
            );
          })}
          <span className="room-morph-caption"><b>身份不变</b><small>行星轨道 → 桌面窗口</small></span>
        </div>

        {stage !== "orbit" ? <PawOsLiveRoom key={runKey} visible={stage === "windows"}/> : null}

      </div>
    </div>
  );
}

function PawOsLiveRoom({ visible }: { visible: boolean }) {
  const [loadedSource, setLoadedSource] = useState("");
  const browserReady = useSyncExternalStore(subscribeBrowserReady, browserSnapshot, serverSnapshot);
  const source = useMemo(() => browserReady ? pawOsShowcaseUrl() : "", [browserReady]);
  const loaded = Boolean(source) && loadedSource === source;

  return (
    <div aria-hidden={!visible} className="pawos-live-room" data-loaded={loaded || undefined} data-visible={visible || undefined}>
      <div className="pawos-live-room__loading" role="status"><Orbit size={18}/><span><strong>正在进入真实 PAWOS</strong><small>加载 PAW 立项、四条产品线、行星通信、Skill / Tool / Docs 回执与实际窗口层…</small></span></div>
      <iframe
        allow="clipboard-read; clipboard-write"
        loading="lazy"
        onLoad={() => { if (source) setLoadedSource(source); }}
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
        src={source || undefined}
        tabIndex={visible ? 0 : -1}
        title="真实 PAWOS Room 多窗口运行过程"
      />
      <a aria-disabled={!source} href={source || undefined} rel="noreferrer" tabIndex={visible && source ? 0 : -1} target="_blank"><SquareArrowOutUpRight size={13}/>全屏打开真实 PAWOS</a>
    </div>
  );
}

function pawOsSurfaceUrl(route: string, showcaseId: string, instanceId?: string): string {
  const instanceQuery = instanceId ? `&showcaseInstance=${encodeURIComponent(instanceId)}` : "";
  const query = `?controlTransport=mock&frontend=paw-os&showcase=${encodeURIComponent(showcaseId)}${instanceQuery}#${route}`;
  if (typeof window === "undefined") return `/pawos/${query}`;
  const localStoryHost = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    && window.location.port !== "5174";
  if (localStoryHost) {
    return `${window.location.protocol}//${window.location.hostname}:5174/${query}`;
  }
  return `/pawos/${query}`;
}

function subscribeBrowserReady(): () => void {
  return () => {};
}

function browserSnapshot(): boolean {
  return true;
}

function serverSnapshot(): boolean {
  return false;
}

function pawOsShowcaseUrl(): string {
  return pawOsSurfaceUrl("/agent?room=room-preview", "room-flow");
}

function Footer() {
  return (
    <footer className="border-border border-t">
      <div className="max-w-container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-10 text-center sm:flex-row sm:text-left">
        <div className="text-foreground flex items-center gap-2.5 text-sm"><span className="text-brand"><PawMark /></span><span className="font-semibold">PAW Story Showcase</span></div>
        <p className="text-muted-foreground max-w-md text-xs leading-relaxed">真实前端组件 + 明确标注的合成演示数据；本页不证明 PAW Runtime 安装或前台验收状态。</p>
        <div className="text-muted-foreground flex items-center gap-4 text-xs font-medium">
          <a aria-label="作者 GitHub · 7155" className="hover:text-foreground transition-colors inline-flex items-center gap-1.5" href="https://github.com/7155" rel="noreferrer" target="_blank"><GithubMark size={14}/>7155</a>
          <a className="hover:text-foreground transition-colors" href="https://github.com/7155/paw-story-showcase" rel="noreferrer" target="_blank">Showcase</a>
          <a className="hover:text-foreground transition-colors" href="https://github.com/7155/aios" rel="noreferrer" target="_blank">AIOS-IME</a>
          <a className="hover:text-foreground transition-colors" href="https://github.com/7155/minimind-ime" rel="noreferrer" target="_blank">minimind-ime</a>
        </div>
      </div>
    </footer>
  );
}


export default function Home() {
  return (
    <main className="home" id="top">
      <Navbar/>
      <TaskIntroduction/>
      <RoomSlide/>
      <ReliabilitySlide/>
      <ImprovementSection/>
      <ContextSlide/>
      <InputSlide/>
      <ResumeSection/>
      <Footer/>
    </main>
  );
}
