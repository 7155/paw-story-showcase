"use client";

import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Bot,
  Brain,
  Check,
  CircleAlert,
  CircleDot,
  FileCheck2,
  FileText,
  GitBranch,
  Globe2,
  History,
  Keyboard,
  Layers3,
  Mic,
  Network,
  Orbit,
  Pause,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  SquareArrowOutUpRight,
  TestTube2,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SolarSystem3D } from "../components/SolarSystem3D";

const chapters = [
  { id: "input", index: "01", label: "智能输入" },
  { id: "memory", index: "02", label: "记忆 / RAG" },
  { id: "agents", index: "03", label: "多 Agent" },
];

const inputTimelineDurations = [700, 900, 620, 420, 1_180, 320, 620, 620, 700, 680, 880, 1_080, 360, 1_350] as const;

const inputScenarios = [
  {
    id: "report",
    label: "工作报告",
    fileName: "智能输入项目周报.docx",
    kicker: "研发周报 · 第 34 周",
    title: "PAW 智能输入本周进展",
    summary: "汇总本周交付、关键指标、风险与下周计划。",
    section: "本周完成",
    body: "本周完成 post-commit 联想链路的 Release 验证，覆盖拼音组合态、跨应用提交和候选接受。",
    typingPrefix: "实测 200 轮连续输入后，候选栏未再出现",
    compositionRoman: "qiang jiao dian",
    committedSentence: "实测 200 轮连续输入后，候选栏未再出现抢焦点或吞键。",
    rimeCandidates: ["抢焦点", "强焦点", "抢交点", "强交点", "抢焦"],
    suggestions: [
      "首个本地候选稳定在 100ms 内返回",
      "Active RAG 仍需继续压缩首字延迟",
      "下周将补齐跨应用回归测试",
    ],
    generatedParagraph: "从结果看，核心输入链路已经具备可演示条件：首个本地候选稳定在 100ms 内返回，Tab 接受与 Option+数字侧候选均符合预期。当前主要风险集中在 Active RAG 首字延迟和窗口上下文质量，下周将补齐 Word、浏览器与代码编辑器三类场景的回归测试。",
    diagnostic: "当前输入 29 字 · 历史 2 条 · RAG 2 条 · 首字 1.2 秒",
    historyDone: "已选取 2 条本周测试记录",
    retrievalDone: "已找到性能目标与发布边界",
    handoff: "AX 6 节点 · 历史 2 条 · 召回 Atom、Book",
    sources: [
      { id: "window", label: "窗口语义", title: "当前周报 · 本周完成", detail: "Release 验证与跨应用输入测试", Icon: FileText },
      { id: "recent", label: "最近完整输入", title: "连续测试记录 · 2 条", detail: "候选栏不能吞键或抢焦点", Icon: History },
      { id: "atom", label: "知识库事实 · Atom", title: "输入性能目标", detail: "首个本地候选 P95 < 100ms", Icon: CircleDot },
      { id: "book", label: "知识主题 · Book", title: "v1 发布边界", detail: "Rime 稳定优先，Active RAG opt-in", Icon: BookOpen },
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
    typingPrefix: "用户提交完整句子后，系统才展示",
    compositionRoman: "san tiao duan lian xi",
    committedSentence: "用户提交完整句子后，系统才展示三条短联想。",
    rimeCandidates: ["三条短联想", "三条端联想", "三条段联想", "三条短连想", "三条联想"],
    suggestions: [
      "Tab 接受第一条，Option+数字选择侧候选",
      "普通联想不读取远程上下文",
      "点击生成后再启动 Active RAG",
    ],
    generatedParagraph: "验收时需要同时满足三个条件：联想不得覆盖系统候选栏；首条建议可用 Tab 接受，其他建议使用 Option+数字选择；只有用户主动点击“生成”后，系统才能读取获准的窗口语义、近期输入与记忆，并在结果中保留可核对的依据回执。",
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

const memoryTimelineEntries = [
  {
    time: "08:42",
    source: "完整输入",
    context: "飞书 · 增长组晨会",
    text: "今天第一次参加增长组晨会，导师让我跟进华东门店的活动转化。",
    outcome: "候选事件 · 实习角色与当前职责",
    color: "#5b6fe8",
  },
  {
    time: "10:16",
    source: "术语确认",
    context: "掌柜问数 · 指标字典",
    text: "这里的“到店核销”只算领取优惠券后 7 天内完成核销的订单。",
    outcome: "词库 · 到店核销 / 7 日口径",
    color: "#e08a52",
  },
  {
    time: "14:08",
    source: "项目上下文",
    context: "VS Code · weekly-report.md",
    text: "把门店漏斗和上周活动方案一起放进这周的实习周报上下文。",
    outcome: "项目关系 · 周报 ↔ 漏斗 ↔ 活动方案",
    color: "#3f9b78",
  },
  {
    time: "18:27",
    source: "行动承诺",
    context: "Word · 实习日志.docx",
    text: "明天先核对上海 12 家门店的到店率，再向导师解释转化下降原因。",
    outcome: "时间线 · 明日优先事项",
    color: "#9a68cb",
  },
] as const;

const memoryContextShelves = [
  { label: "连续完整输入", value: "1,284", detail: "示例日均 · 仅保留完整提交", icon: Keyboard },
  { label: "窗口上下文", value: "236", detail: "应用、文档与当前段落", icon: Layers3 },
  { label: "个人 / 公司词库", value: "318", detail: "简称、指标口径与专有名词", icon: BookOpen },
  { label: "项目文件", value: "42", detail: "周报、方案、数据字典与代码", icon: FileText },
] as const;

const governedContextSources = [
  {
    id: "project",
    label: "Project Docs",
    displayLabel: "项目文档",
    flow: "目标 → 需求 → WorkItem → 验收",
    title: "项目的长期事实",
    detail: "需求、决策、任务、代码与验收都留在项目范围内；不混入个人偏好。",
    access: "当前项目 Session / Room",
    trigger: "每轮按任务选择相关文件",
    persistence: "项目文件与版本历史",
    icon: FileText,
    state: "PROJECT SCOPED",
  },
  {
    id: "memory",
    label: "User Memory",
    displayLabel: "用户记忆",
    flow: "原始输入 → 时间线 → 可治理记忆",
    title: "用户自己的偏好与经历",
    detail: "默认不越权读取；只有用户显式开启或本轮工具已获权限时才参与上下文。",
    access: "显式开关 + Tool 权限",
    trigger: "每个 compact / 大对话周期至多主动召回一次",
    persistence: "可查看、隐藏、修订与删除",
    icon: Brain,
    state: "PERMISSIONED",
  },
  {
    id: "knowledge",
    label: "Knowledge Mount",
    displayLabel: "知识库",
    flow: "挂载 → 检索图 → Trace / Eval",
    title: "按场景外挂的材料库",
    detail: "论文写作、企业知识管理、专项研究等场景按需挂载，不默认进入所有对话。",
    access: "Session / 应用显式挂载",
    trigger: "问题需要外部材料时检索",
    persistence: "独立知识库与来源索引",
    icon: BookOpen,
    state: "OPT-IN MOUNT",
  },
] as const;

const projectDocumentPages = [
  {
    id: "agents",
    file: "AGENTS.md",
    group: "ENTRY MAP",
    status: "渐进式入口",
    title: "给 Agent 一张地图，而不是一本说明书",
    summary: "简短入口只说明当前目标、边界和下一步去哪读；更深的项目事实留在结构化文档中按需加载。",
    sections: [
      { title: "先读哪里", body: "从 PROJECT.md 和当前 active plan 开始，只加载与本轮 WorkItem 直接相关的上下文。" },
      { title: "机械事实", body: "Git、Runtime、测试与 Trace 由工具实时读取，不能从文档状态或对话措辞反推。" },
      { title: "工作规则", body: "保留用户原话、尊重 owner 边界、提交可复核 WorkPatch，并把未验证项明确留下。" },
    ],
  },
  {
    id: "project",
    file: "PROJECT.md",
    group: "FOUNDATION",
    status: "权威入口",
    title: "掌柜问数 · 门店经营分析 Agent",
    summary: "把经营问题转换为有口径、有证据、可复核的数据结论；项目文档是协作目标与边界的唯一长期权威。",
    sections: [
      { title: "目标", body: "经营者用自然语言询问门店、商品和活动表现，Agent 返回口径一致且附来源的分析。" },
      { title: "当前 MVP", body: "先完成华东 12 店漏斗、活动复盘和周报生成；每个结论必须链接指标字典或原始数据。" },
      { title: "非目标", body: "不自动修改生产报表，不把个人偏好写进项目事实，也不以 AI Judge 代替最终验收。" },
    ],
  },
  {
    id: "requirements",
    file: "REQUIREMENTS.md",
    group: "PRODUCT",
    status: "原话可追溯",
    title: "需求台账",
    summary: "每一条需求保留稳定 ID、用户原话、当前解释与验收边界，后续修订追加而不覆盖。",
    sections: [
      { title: "BQ-001 · 漏斗解释", body: "解释上海门店转化下降，并指出变化发生在哪一层漏斗。" },
      { title: "BQ-002 · 口径一致", body: "“到店核销”统一采用领取优惠券后 7 日内完成核销的订单。" },
      { title: "BQ-003 · 引用", body: "结论必须落到指标字典、门店漏斗或活动决策的具体来源。" },
    ],
  },
  {
    id: "architecture",
    file: "ARCHITECTURE.md",
    group: "SYSTEM",
    status: "边界已冻结",
    title: "数据与 Agent 边界",
    summary: "项目文档、用户记忆和外挂知识库分开治理；Session 只按本轮任务组装已授权上下文。",
    sections: [
      { title: "Project Docs", body: "保存目标、需求、决策、任务、代码与验收结果。" },
      { title: "User Memory", body: "仅在显式开关和 Tool 权限成立时参与，不自动并入项目。" },
      { title: "Knowledge Mount", body: "按应用或 Session 显式挂载，索引与来源独立维护。" },
    ],
  },
  {
    id: "tasks",
    file: "TASKS.md",
    group: "DELIVERY",
    status: "3 个纵向 WorkItem",
    title: "纵向任务与交接",
    summary: "每个实施伙伴完成一个可见能力纵切并提交 WorkPatch；Facilitator 汇总后再启动独立 Reviewer。",
    sections: [
      { title: "WI-01 · 问数入口", body: "从问题输入到指标口径确认与查询计划。" },
      { title: "WI-02 · 证据检索", body: "从混合召回、重排到可引用证据包。" },
      { title: "WI-03 · 周报输出", body: "从结论生成到文档写回与操作回执。" },
    ],
  },
  {
    id: "acceptance",
    file: "ACCEPTANCE.md",
    group: "REVIEW",
    status: "Reviewer gate",
    title: "测试与最终验收",
    summary: "实施 WorkPatch 全部到齐之后，Reviewer 才按原始需求、代码和真实路径执行测试。",
    sections: [
      { title: "需求忠实", body: "逐条核对 BQ-001–BQ-003，不以实现者自述替代证据。" },
      { title: "代码与路径", body: "运行构建、检索 Eval 和周报写回链路，记录精确命令与回执。" },
      { title: "终止条件", body: "P0 必须为 0；存在未验证边界时明确保留，不冒充最终通过。" },
    ],
  },
] as const;

const ragModes = [
  {
    id: "embedding",
    label: "Embedding",
    title: "传统向量召回",
    summary: "把问题与切片编码成向量，按语义距离取回 Top-K。快，但相似不等于可回答。",
    steps: ["问题向量化", "ANN Top-20", "相似片段返回"],
    metric: "84 ms · 命中 20",
    boundary: "可能漏掉精确指标口径",
    hits: ["实习周报模板.md · 0.86", "门店活动复盘.md · 0.82", "增长组晨会记录 · 0.78"],
  },
  {
    id: "hybrid",
    label: "Hybrid",
    title: "关键词 + 向量混合",
    summary: "同时保留术语精确匹配与语义相似度，再合并两路候选。",
    steps: ["BM25 精确词", "向量语义召回", "RRF 合并去重"],
    metric: "112 ms · 合并 26",
    boundary: "相关片段仍未按答案价值排序",
    hits: ["指标字典/到店核销.md", "华东门店漏斗.csv", "活动方案-v3.docx"],
  },
  {
    id: "rerank",
    label: "Rerank",
    title: "混合召回 + 重排",
    summary: "用重排模型重新判断问题与候选的真实相关性，把证据压到可读范围。",
    steps: ["混合召回 26", "Cross-encoder 重排", "保留 6 条依据"],
    metric: "286 ms · 证据 6",
    boundary: "仍由固定检索流程决定查什么",
    hits: ["到店核销 7 日口径 · #L18", "上海 12 店漏斗 · 8/27", "上周活动变更 · 决策 04"],
  },
  {
    id: "agentic",
    label: "Agentic RAG",
    title: "Agent 自己规划检索",
    summary: "先拆问题，再按需查时间线、词库、项目文件与知识库；发现证据不足时继续检索。",
    steps: ["拆成口径 / 数据 / 原因", "路由 4 个上下文源", "核对冲突并生成回执"],
    metric: "4 次有界检索 · 6 条依据",
    boundary: "AI 估计与真实命中分开标注",
    hits: ["真实命中 · 指标字典", "真实命中 · 门店漏斗", "AI 归纳 · 转化下降原因"],
  },
] as const;

const agentPatterns = [
  { id: "tree", index: "01", label: "主从树", title: "判断全部挤回主 Agent", detail: "子 Agent 能并行执行，却无法横向补位；计划、上下文和验收最终都堵在一个入口。", metric: "同级通道 0" },
  { id: "swarm", index: "02", label: "全连接蜂群", title: "通信比工作增长得更快", detail: "每个人都能互相 @，但消息、等待和重试很快超过真正写入文件的结果。", metric: "潜在 @ ∞" },
  { id: "peer", index: "03", label: "平等专家组", title: "互补偏见，也可能无限否决", detail: "专家可以相互质疑；没有证据门槛与循环上限时，严谨会变成无法结束的复核。", metric: "审核循环 4+" },
] as const;

const orbitalWork = [
  {
    id: "input",
    name: "输入体验",
    tag: "DISPATCH 01 · IMPLEMENTER",
    task: "完成输入法交互纵切",
    phase: "组件、状态与数据源回执",
    receipt: "workpatch-input.md",
    className: "solar-planet--research",
    color: "#a79dff",
    subWorker: "实施伙伴 · 只提交 WorkPatch",
    subVerify: "Reviewer · 等全部实施提交后启动",
    metric: "示例状态 · WorkPatch 已提交",
    summary: "纵向完成输入页面的界面、交互状态与合成数据，不在本任务内自封测试通过。",
    tdd: "PATCH READY · 非测试结论",
  },
  {
    id: "memory",
    name: "记忆 / RAG",
    tag: "DISPATCH 02 · IMPLEMENTER",
    task: "完成记忆数据叙事纵切",
    phase: "时间线、词库、文件与检索",
    receipt: "workpatch-memory.md",
    className: "solar-planet--build",
    color: "#ffaa88",
    subWorker: "实施伙伴 · 只提交 WorkPatch",
    subVerify: "Reviewer · 等全部实施提交后启动",
    metric: "示例状态 · WorkPatch 已提交",
    summary: "用明确标注的合成输入解释记忆整理与 RAG 升级路线，保留真实指标和 AI 估计边界。",
    tdd: "PATCH READY · 非测试结论",
  },
  {
    id: "room",
    name: "Room 体验",
    tag: "DISPATCH 03 · IMPLEMENTER",
    task: "完成行星到窗口的真实投影",
    phase: "关系视图与多窗口执行态",
    receipt: "workpatch-room.md",
    className: "solar-planet--verify",
    color: "#75e2b5",
    subWorker: "实施伙伴 · 只提交 WorkPatch",
    subVerify: "Reviewer · 等全部实施提交后启动",
    metric: "示例状态 · WorkPatch 提交中",
    summary: "保持太阳、行星、WorkItem 与 PAW 窗口一一对应，让关系视图自然进入执行视图。",
    tdd: "PATCH RUNNING · 非测试结论",
  },
  {
    id: "review",
    name: "独立复核",
    tag: "REVIEW BATCH · REVIEWER",
    task: "忠于需求并确认代码无 P0",
    phase: "由 Facilitator 在实施完成后启动",
    receipt: "review-receipt.md",
    className: "solar-planet--deliver",
    color: "#8dc5ff",
    subWorker: "Reviewer · 不参与前序实施",
    subVerify: "Gate · 收齐 3 个 WorkPatch 后执行",
    metric: "示例状态 · 等待 Facilitator 启动",
    summary: "独立读取原始需求和整合代码，执行构建与交互检查；只有 P0 为 0 才能给出通过回执。",
    tdd: "QUEUED · FACILITATOR GATE",
  },
] as const;

function useLoop(length: number, delay: number) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % length), delay);
    return () => window.clearInterval(timer);
  }, [delay, length, playing]);

  return { step, playing, setStep, setPlaying, restart: () => { setStep(0); setPlaying(true); } };
}

function useTimedLoop(durations: readonly number[]) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => setStep((value) => (value + 1) % durations.length),
      durations[step] ?? 700,
    );
    return () => window.clearTimeout(timer);
  }, [durations, playing, step]);

  return {
    step,
    playing,
    setPlaying,
    goTo: (next: number) => { setStep(next); setPlaying(true); },
    restart: () => { setStep(0); setPlaying(true); },
  };
}

function PawMark() {
  return <span className="paw-mark" aria-hidden="true"><i /><i /><i /><i /></span>;
}

function Topbar() {
  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="回到 PAW 首页"><PawMark /><span>PAW</span></a>
      <nav aria-label="页面章节">
        {chapters.map((chapter) => <a href={`#${chapter.id}`} key={chapter.id}>{chapter.label}</a>)}
      </nav>
      <a className="nav-cta" href="#input">进入演示 <ArrowDown size={14} /></a>
    </header>
  );
}

function InputPageHeader() {
  return (
    <header className="input-page-header">
      <a className="input-page-brand" href="#input" aria-label="回到智能输入页顶部"><PawMark /><strong>PAW</strong></a>
      <nav className="story-header-nav" aria-label="三章产品故事">
        {chapters.map((chapter) => <a href={`#${chapter.id}`} key={chapter.id}><b>{chapter.index}</b>{chapter.label}</a>)}
      </nav>
      <div className="input-page-actions"><p><i /> SYNTHETIC DATA · REAL UI LOGIC</p><a href="#memory">下一章 · 记忆 / RAG <ArrowDown size={13} /></a></div>
    </header>
  );
}

function HeroOrbit() {
  const [focus, setFocus] = useState("room");
  const detail = {
    room: ["ROOM / 官网重构", "一个目标，一组有边界的执行伙伴。"],
    memory: ["MEMORY / 个人上下文", "被接受的事实沉淀为可治理记忆。"],
    knowledge: ["KNOWLEDGE / 项目材料", "独立知识库提供可回溯的外部依据。"],
    browser: ["BROWSER / 工作现场", "隔离浏览、观察页面并留下操作证据。"],
  }[focus] ?? ["ROOM", ""];

  return (
    <div className="orbit-stage" aria-label="PAW 系统星图">
      <div className="orbit orbit-a" /><div className="orbit orbit-b" />
      <button className="orbit-core" onClick={() => setFocus("room")} type="button"><PawMark /><strong>PAW</strong><span>Project Runtime</span></button>
      <button className="planet planet-memory" data-active={focus === "memory"} onClick={() => setFocus("memory")} type="button"><Brain size={16} /><span>Memory</span></button>
      <button className="planet planet-knowledge" data-active={focus === "knowledge"} onClick={() => setFocus("knowledge")} type="button"><BookOpen size={16} /><span>Knowledge</span></button>
      <button className="planet planet-browser" data-active={focus === "browser"} onClick={() => setFocus("browser")} type="button"><Globe2 size={16} /><span>Browser</span></button>
      <div className="agent-satellite agent-one"><Bot size={13} />Research</div>
      <div className="agent-satellite agent-two"><Bot size={13} />Build</div>
      <div className="agent-satellite agent-three"><Bot size={13} />Review</div>
      <div className="orbit-detail"><span>当前焦点</span><strong>{detail[0]}</strong><p>{detail[1]}</p></div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero starfield" id="top">
      <Topbar />
      <div className="hero-copy">
        <p className="eyebrow"><span className="live-dot" /> LOCAL-FIRST PERSONAL AGENT WORKBENCH</p>
        <h1>让每一次工作，<br /><em>成为下一次的上下文。</em></h1>
        <p className="hero-lede">从语音和打字开始，穿过个人记忆、项目知识与浏览器现场，最终让一组 Agent 在同一个 Room 里继续工作。</p>
        <div className="hero-actions">
          <a className="primary-action" href="#input">观看五幕演示 <ArrowDown size={16} /></a>
          <span><ShieldCheck size={15} /> 本地优先 · 有界上下文 · 全程可追溯</span>
        </div>
      </div>
      <HeroOrbit />
      <div className="chapter-strip" aria-label="五幕叙事">
        {chapters.map((chapter) => <a href={`#${chapter.id}`} key={chapter.id}><span>{chapter.index}</span>{chapter.label}</a>)}
      </div>
    </section>
  );
}

function ChapterIntro({ index, kicker, title, body }: { index: string; kicker: string; title: string; body: string }) {
  return <div className="chapter-intro"><p className="eyebrow"><span>{index}</span> {kicker}</p><h2>{title}</h2><p>{body}</p></div>;
}

function PlaybackControls({ playing, onToggle, onRestart }: { playing: boolean; onToggle: () => void; onRestart: () => void }) {
  return (
    <div className="playback-controls">
      <button onClick={onToggle} type="button">{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? "暂停" : "继续"}</button>
      <button onClick={onRestart} type="button"><RefreshCw size={14} />重播</button><span>真实组件状态回放</span>
    </div>
  );
}

function ImeDemo() {
  const [scenarioId, setScenarioId] = useState<(typeof inputScenarios)[number]["id"]>("report");
  const windowRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLElement>(null);
  const [popupAnchor, setPopupAnchor] = useState({ left: 16, top: 420, ready: false });
  const playback = useTimedLoop(inputTimelineDurations);
  const scenario = inputScenarios.find((item) => item.id === scenarioId) ?? inputScenarios[0];
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
    playback.restart();
  };

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
    <div className="demo-window ime-window" data-phase={phaseIndex} ref={windowRef}>
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
        <p className="doc-kicker">{scenario.kicker}</p><h3>{scenario.title}</h3>
        <p className="doc-muted">{scenario.summary}</p><div className="doc-rule" />
        <h4>{scenario.section}</h4><p>{scenario.body}</p>
        <div className="typing-line" data-committed={playback.step >= 2}>
          {playback.step <= 1 ? scenario.typingPrefix : scenario.committedSentence}
          {showComposition ? <span className="composition-roman">{scenario.compositionRoman}</span> : null}
          <i className="ime-caret-anchor" data-active={phaseIndex < 4} ref={caretRef}><b className="caret" /></i>
        </div>
        {inserted ? <p className="generated-paragraph">{scenario.generatedParagraph}</p> : null}
        {inserted ? <div className="insert-receipt"><Check size={12} /> 已插入下一段 · 依据 4 项 · 可撤销</div> : null}
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
              <button data-primary={index === 0} key={suggestion} type="button">
                <i />
                <kbd>{index === 0 ? "Tab" : `⌥${index + 1}`}</kbd>
                <strong>{suggestion}</strong>
              </button>
            ))}
          </div>
          <div className="native-ime-suggestion-actions">
            <button data-pressed={playback.step === 5} onClick={() => playback.goTo(5)} type="button"><Sparkles size={13} />生成</button>
            <button type="button"><Search size={13} />深度</button>
          </div>
        </div>
      ) : null}
      {showProgress ? (
        <div className="native-ime-card native-ime-card--thinking" data-anchor-ready={popupAnchor.ready} data-surface="explicitGenerating" style={{ left: popupAnchor.left, top: popupAnchor.top }}>
          <span className="native-ime-rail" />
          <header><strong>{progressTitle}</strong><button aria-label="停止生成" type="button">■</button></header>
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
          <header><kbd>Tab 插入</kbd><strong>{playback.step === 10 ? "正在接收内容" : "生成结果"}</strong><button aria-label="关闭" type="button">×</button></header>
          <p className="native-ime-diagnostic">{scenario.diagnostic}</p>
          {playback.step === 10 ? <p className="native-ime-handoff">{scenario.handoff}</p> : null}
          <div className="native-ime-result-copy">{resultText}<b className="stream-caret" /></div>
          <footer><button onClick={() => playback.goTo(12)} type="button">插入</button><button type="button">重试</button><button aria-label="更多" type="button">•••</button></footer>
        </div>
      ) : null}
      <aside className="rag-source-trace" data-visible={showSourceTrace} aria-label="本轮上下文与数据源">
        <header><span>AUTHORIZED CONTEXT</span><strong>本轮实际使用</strong><small>{sourceVisibleCount}/4</small></header>
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
      <PlaybackControls playing={playback.playing} onRestart={playback.restart} onToggle={() => playback.setPlaying(!playback.playing)} />
    </div>
  );
}

function VoiceInputDemo() {
  const playback = useLoop(6, 1450);
  const stageLabels = ["准备就绪", "按住说话", "实时转写", "松开按键", "文字定稿", "写回应用"];
  const interim = playback.step <= 1
    ? ""
    : playback.step === 2
      ? "今天上海十二家门店到店和效率"
      : "今天上海十二家门店到店和效率下降";
  const finalized = playback.step >= 4;
  const inserted = playback.step >= 5;

  return (
    <div className="voice-feature-demo" data-finalized={finalized || undefined} data-inserted={inserted || undefined}>
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
          <header><div><p>SAY IT TO PAW</p><h3>把说话变成输入文字。</h3><span>边说边显示，松开后补充完整文字，再写回当前应用。</span></div><button type="button"><RefreshCw size={13}/>刷新</button></header>
          <div className="voice-readiness-strip">
            <article><span><i/><strong>听写服务</strong></span><b>运行中</b><small>实时听写</small></article>
            <article><span><i/><strong>麦克风</strong></span><b>已允许</b><small>系统授权</small></article>
            <article><span><i/><strong>辅助功能</strong></span><b>已允许</b><small>写回当前应用</small></article>
            <article><span><i/><strong>文字定稿</strong></span><b>已就绪</b><small>保守校对</small></article>
          </div>
          <div className="voice-demo-workspace">
            <section className="voice-live-session">
              <header><span><i className="voice-record-dot"/> LIVE DICTATION</span><small>鼠标中键 · 按住说话</small></header>
              <div className="voice-wave" data-speaking={playback.step >= 1 && playback.step <= 3}>{Array.from({ length: 34 }).map((_, index) => <i key={index} style={{ "--wave-index": index } as React.CSSProperties}/>)}</div>
              <div className="voice-transcript-card">
                <span>{finalized ? "FINAL TEXT · 完整文字" : "INTERIM · 临时听写"}</span>
                <p>{finalized ? "今天上海 12 家门店的到店核销率下降。" : interim || "按住鼠标中键开始说话…"}<i/></p>
              </div>
              <ol aria-label="语音输入处理阶段">
                {stageLabels.map((label, index) => <li data-state={index < playback.step ? "done" : index === playback.step ? "active" : "waiting"} key={label}><span>{index < playback.step ? <Check size={10}/> : index + 1}</span><strong>{label}</strong></li>)}
              </ol>
            </section>
            <aside className="voice-refinement-panel">
              <header><Sparkles size={14}/><span><strong>文字定稿</strong><small>识别结束后的保守校对</small></span></header>
              <div><span>临时听写</span><p>今天上海<span>十二家</span>门店<span>到店和效率</span>下降</p></div>
              <ArrowDown size={14}/>
              <div data-result><span>完整文字</span><p>今天上海 <b>12 家</b>门店的<b>到店核销率</b>下降<b>。</b></p></div>
              <dl><div><dt>热词</dt><dd>到店核销 · 掌柜问数</dd></div><div><dt>正文日志</dt><dd>不写入诊断记录</dd></div><div><dt>写回</dt><dd>{inserted ? "已插入当前 Word 段落" : "等待完整文字"}</dd></div></dl>
            </aside>
          </div>
        </main>
      </div>
      <PlaybackControls playing={playback.playing} onRestart={playback.restart} onToggle={() => playback.setPlaying(!playback.playing)}/>
    </div>
  );
}

function InputStory() {
  const [inputMode, setInputMode] = useState<"keyboard" | "voice">("keyboard");
  return (
    <section className="story-section light-story" id="input">
      <div className="story-grid">
        <div className="chapter-intro input-chapter-intro">
          <p className="eyebrow"><span>01</span> INPUT IS THE ENTRY</p>
          <h2>AI 不必等你<br /><em>打开聊天框。</em></h2>
          <p>语音和打字是人与电脑最上层的输入。PAW 在输入结束后读取当前界面、近期工作与获准使用的记忆，给出真正贴合现场的下一句。</p>
        </div>
        <div className="story-points">
          <div><Keyboard size={17} /><span><strong>打字 + 语音</strong><small>不改变原来的输入习惯</small></span></div>
          <div><Layers3 size={17} /><span><strong>界面 + 记忆 + 知识</strong><small>只取这次任务需要的上下文</small></span></div>
          <div><ShieldCheck size={17} /><span><strong>可采纳，也可拒绝</strong><small>输入不等于自动永久记忆</small></span></div>
        </div>
      </div>
      <div className="input-capability-switch" role="group" aria-label="切换输入能力演示">
        <button aria-pressed={inputMode === "keyboard"} onClick={() => setInputMode("keyboard")} type="button"><Keyboard size={15}/><span><strong>智能输入法</strong><small>Rime · 联想 · Active RAG</small></span></button>
        <button aria-pressed={inputMode === "voice"} onClick={() => setInputMode("voice")} type="button"><Mic size={15}/><span><strong>语音转文字</strong><small>实时转写 · 文字定稿 · 写回</small></span></button>
      </div>
      {inputMode === "keyboard" ? <ImeDemo /> : <VoiceInputDemo />}
    </section>
  );
}

function MemoryStory() {
  const timeline = useLoop(memoryTimelineEntries.length, 2400);
  const retrieval = useLoop(ragModes.length, 3600);
  const [activeContextSourceId, setActiveContextSourceId] = useState<(typeof governedContextSources)[number]["id"]>("project");
  const [activeProjectDocumentId, setActiveProjectDocumentId] = useState<(typeof projectDocumentPages)[number]["id"]>("project");
  const activeEntry = memoryTimelineEntries[timeline.step] ?? memoryTimelineEntries[0];
  const activeMode = ragModes[retrieval.step] ?? ragModes[0];
  const activeContextSource = governedContextSources.find((source) => source.id === activeContextSourceId) ?? governedContextSources[0];
  const activeProjectDocument = projectDocumentPages.find((document) => document.id === activeProjectDocumentId) ?? projectDocumentPages[0];

  return (
    <section className="story-section memory-story" id="memory">
      <div className="memory-chapter-heading">
        <ChapterIntro index="02" kicker="FROM DAILY INPUT TO RETRIEVABLE CONTEXT" title="一天上千次输入，最后留下什么？" body="原始句子先回到它发生的应用、文档与项目；系统再整理时间线、词库和可治理记忆。需要回答时，从传统向量召回逐步升级到有计划、有回执的 Agentic RAG。" />
        <div className="synthetic-data-seal"><ShieldCheck size={16}/><span><strong>公开合成演示</strong><small>实习场景 · 非真实个人输入 · 所有数量均为示例</small></span></div>
      </div>

      <div className="memory-capability-switch" role="tablist" aria-label="切换项目文档、用户记忆和知识库">
        {governedContextSources.map(({ id, displayLabel, flow, icon: Icon }) => (
          <button
            aria-controls={`${id}-context-page`}
            aria-selected={activeContextSourceId === id}
            key={id}
            onClick={() => setActiveContextSourceId(id)}
            role="tab"
            type="button"
          >
            <Icon size={20}/><span><strong>{displayLabel}</strong><small>{flow}</small></span>
          </button>
        ))}
      </div>

      <section className="context-governance-summary" aria-label="当前上下文治理边界">
        <header>
          <div><ShieldCheck size={19}/><span><b>{activeContextSource.state}</b><strong>{activeContextSource.label}</strong><small>{activeContextSource.title}</small></span></div>
          <p>{activeContextSource.detail}</p>
        </header>
        <div className="context-governance-receipt">
          <span><small>调用条件</small><strong>{activeContextSource.access}</strong></span>
          <ArrowRight size={14}/>
          <span><small>召回时机</small><strong>{activeContextSource.trigger}</strong></span>
          <ArrowRight size={14}/>
          <span><small>权威载体</small><strong>{activeContextSource.persistence}</strong></span>
        </div>
      </section>

      <section className="project-docs-showcase" data-active={activeContextSourceId === "project"} hidden={activeContextSourceId !== "project"} id="project-context-page" role="tabpanel">
        <header className="project-docs-titlebar">
          <div><Orbit size={22}/><span><strong>Project Context Gravity</strong><small>公开合成项目 · 不是文件柜，而是 Agent 可导航、可执行、可验证的约束场</small></span></div>
          <b>READABLE STRUCTURE</b>
        </header>
        <div className="project-docs-shell">
          <nav className="project-docs-tree" aria-label="项目文档结构">
            <p>项目文档</p>
            {projectDocumentPages.map((document) => (
              <button aria-pressed={activeProjectDocumentId === document.id} key={document.id} onClick={() => setActiveProjectDocumentId(document.id)} type="button">
                <FileText size={16}/><span><small>{document.group}</small><strong>{document.file}</strong></span>
              </button>
            ))}
            <footer><ShieldCheck size={16}/><span><strong>单一权威</strong><small>文件投影不复制 transcript</small></span></footer>
          </nav>
          <article className="project-docs-article" key={activeProjectDocument.id}>
            <section className="project-docs-gravity" aria-label="Project Docs 引力场">
              <header>
                <span><b>PROJECT DOCS ≠ FILE CABINET</b><strong>这不是普通的 docs，是 Agent 的执行引力场。</strong><small>中心 Goal 稳定方向；入口、需求、架构、任务与验收共同约束每条执行轨道。</small></span>
                <a href="https://openai.com/zh-Hans-CN/index/harness-engineering/" rel="noreferrer" target="_blank">参考 · OpenAI Harness Engineering <SquareArrowOutUpRight size={14}/></a>
              </header>
              <div className="project-gravity-map">
                <i className="project-gravity-orbit project-gravity-orbit--outer" aria-hidden="true"/>
                <i className="project-gravity-orbit project-gravity-orbit--inner" aria-hidden="true"/>
                <svg aria-hidden="true" viewBox="0 0 800 380">
                  <path d="M400 190 L400 40 M400 190 L690 105 M400 190 L660 315 M400 190 L140 315 M400 190 L110 105 M400 190 L400 342"/>
                </svg>
                <div className="project-gravity-core"><span>ROOT GOAL</span><strong>掌柜问数</strong><small>可解释的经营分析 Agent</small></div>
                {projectDocumentPages.map((document, index) => (
                  <button
                    aria-label={`查看 ${document.file}`}
                    aria-pressed={activeProjectDocumentId === document.id}
                    data-orbit-index={index}
                    key={document.id}
                    onClick={() => setActiveProjectDocumentId(document.id)}
                    type="button"
                  ><small>{document.group}</small><strong>{document.file}</strong></button>
                ))}
              </div>
            </section>
            <header><span>{activeProjectDocument.group} · {activeProjectDocument.file}</span><b>{activeProjectDocument.status}</b></header>
            <h3>{activeProjectDocument.title}</h3>
            <p>{activeProjectDocument.summary}</p>
            {activeProjectDocument.sections.map((section, index) => (
              <section key={section.title}>
                <span>{String(index + 1).padStart(2, "0")}</span><div><h4>{section.title}</h4><p>{section.body}</p></div>
              </section>
            ))}
          </article>
          <aside className="project-docs-outline">
            <p>本页结构</p>
            {activeProjectDocument.sections.map((section, index) => <span key={section.title}><b>{String(index + 1).padStart(2, "0")}</b>{section.title}</span>)}
            <div><FileCheck2 size={17}/><span><strong>来源回执</strong><small>项目文件 · 版本历史 · 当前 Session</small></span></div>
          </aside>
        </div>
      </section>

      <div className="memory-observatory" data-active={activeContextSourceId === "memory"} hidden={activeContextSourceId !== "memory"} id="memory-context-page" role="tabpanel">
        <header className="memory-observatory-bar">
          <div><Brain size={18}/><span><strong>Context Observatory</strong><small>输入 → 时间线 → 词库 / 项目 → 可治理记忆</small></span></div>
          <span><i/> 2026-08-28 · 已整理到 18:27</span>
        </header>

        <div className="memory-source-metrics">
          {memoryContextShelves.map(({ label, value, detail, icon: Icon }) => (
            <article key={label}><Icon size={16}/><span><strong>{value}</strong><b>{label}</b><small>{detail}</small></span></article>
          ))}
        </div>

        <div className="memory-observatory-body">
          <div className="memory-day-stream">
            <header><span><History size={14}/> 实习第一周 · 今天</span><small>点击查看原句与上下文</small></header>
            <div className="memory-time-axis" aria-label="一天输入整理时间线">
              {memoryTimelineEntries.map((entry, index) => (
                <button
                  aria-pressed={timeline.step === index}
                  key={entry.time}
                  onClick={() => { timeline.setStep(index); timeline.setPlaying(false); }}
                  style={{ "--entry-color": entry.color } as React.CSSProperties}
                  type="button"
                >
                  <time>{entry.time}</time><i/><span><strong>{entry.source}</strong><small>{entry.context}</small></span>
                </button>
              ))}
            </div>
            <article className="memory-raw-card" style={{ "--entry-color": activeEntry.color } as React.CSSProperties}>
              <span>RAW SENTENCE · 原始完整输入</span>
              <blockquote>“{activeEntry.text}”</blockquote>
              <div><small>发生位置</small><strong>{activeEntry.context}</strong></div>
              <div><small>整理结果</small><strong>{activeEntry.outcome}</strong></div>
            </article>
          </div>

          <div className="memory-distillation">
            <header><span><Sparkles size={14}/> 当天整理结果</span><small>可回溯 · 可修订 · 不自动永久化</small></header>
            <div className="memory-distill-flow">
              <article><b>01</b><strong>1,284 条完整输入</strong><small>原句和发生位置分开保存</small></article>
              <ArrowDown size={15}/>
              <article><b>02</b><strong>176 个候选事件</strong><small>去重、聚类、排除密码与敏感字段</small></article>
              <ArrowDown size={15}/>
              <article><b>03</b><strong>28 条可治理记忆</strong><small>事实、偏好、承诺都保留来源</small></article>
              <ArrowDown size={15}/>
              <article><b>04</b><strong>7 个长期项目主题</strong><small>实习 / 华东门店 / 掌柜问数</small></article>
            </div>
          </div>

          <aside className="memory-context-cabinet">
            <header><span><Layers3 size={14}/> 这次可以取用的上下文</span><small>按问题临时组装</small></header>
            <article><BookOpen size={15}/><span><b>词库</b><strong>到店核销 = 领取后 7 日内</strong><small>来源：指标字典 v3 · #L18</small></span></article>
            <article><FileText size={15}/><span><b>项目文件</b><strong>华东门店漏斗.csv</strong><small>上海 12 店 · 更新于 8/27</small></span></article>
            <article><History size={15}/><span><b>时间线</b><strong>导师要求先核对到店率</strong><small>来源：今天 08:42 / 18:27</small></span></article>
            <article><Brain size={15}/><span><b>个人记忆</b><strong>当前角色：增长组实习生</strong><small>已确认 · 可随时隐藏或修订</small></span></article>
          </aside>
        </div>
      </div>

      <div className="rag-evolution-lab" data-active={activeContextSourceId === "knowledge"} hidden={activeContextSourceId !== "knowledge"} id="knowledge-context-page" role="tabpanel">
        <header>
          <div><Search size={17}/><span><strong>Retrieval Evolution Lab</strong><small>同一个问题，观察检索能力如何升级</small></span></div>
          <p>检索执行指标与 AI 归纳分栏展示</p>
        </header>
        <div className="rag-query"><span>QUESTION</span><p>“帮我解释上海门店转化为什么下降，并写进今天的实习周报。”</p></div>
        <nav aria-label="切换 RAG 策略">
          {ragModes.map((mode, index) => (
            <button aria-pressed={retrieval.step === index} key={mode.id} onClick={() => { retrieval.setStep(index); retrieval.setPlaying(false); }} type="button"><b>{String(index + 1).padStart(2, "0")}</b><span>{mode.label}</span></button>
          ))}
        </nav>
        <div className="rag-mode-stage">
          <section>
            <p>ACTIVE STRATEGY</p><h3>{activeMode.title}</h3><span>{activeMode.summary}</span>
            <div className="rag-step-row">{activeMode.steps.map((step, index) => <span key={step}><i>{index + 1}</i><strong>{step}</strong>{index < activeMode.steps.length - 1 ? <ArrowRight size={13}/> : null}</span>)}</div>
          </section>
          <aside>
            <div><span>检索执行回执 · 合成</span><strong>{activeMode.metric}</strong></div>
            {activeMode.hits.map((hit) => <p key={hit}><Check size={12}/>{hit}</p>)}
            <footer><CircleAlert size={13}/><span><b>能力边界</b>{activeMode.boundary}</span></footer>
          </aside>
        </div>
        <section className="rag-trace-eval" aria-label="RAG Trace 与评测边界">
          <header><div><GitBranch size={15}/><span><strong>Trace / Eval · 同一次检索如何被检查</strong><small>公开合成 trace · 24 条人工相关性标注查询</small></span></div><b>FOUNDATION IN PROGRESS</b></header>
          <div className="rag-trace-pipeline">
            {[
              ["01", "QUERY", "上海门店转化下降"],
              ["02", "SCOPE", "Docs + 已授权 Memory"],
              ["03", "RETRIEVE", "26 candidates"],
              ["04", "RERANK", "Top 5 + citations"],
              ["05", "JUDGE", "相关性人工标注"],
            ].map(([index, label, value]) => <span key={index}><i>{index}</i><b>{label}</b><strong>{value}</strong></span>)}
          </div>
          <div className="rag-eval-metrics">
            <article data-kind="measured"><span>MEASURED</span><strong>0.76</strong><b>Precision@5</b><small>人工相关性标签计算</small></article>
            <article data-kind="measured"><span>MEASURED</span><strong>0.82</strong><b>Recall@5</b><small>黄金证据集计算</small></article>
            <article data-kind="measured"><span>MEASURED</span><strong>100%</strong><b>Citation coverage</b><small>5 / 5 结论附来源</small></article>
            <article data-kind="estimated"><span>AI ESTIMATE</span><strong>4.4 / 5</strong><b>Groundedness Judge</b><small>模型评分，不替代真实标签</small></article>
            <aside><Sparkles size={16}/><span><b>自动优化 · 正在添加</b><strong>失败 Trace → 建议改写 Query / Chunk / Rerank → 周期 Eval 再确认</strong><small>当前仅展示目标形态，不宣称已自动改写生产索引。</small></span></aside>
          </div>
        </section>
        <PlaybackControls playing={retrieval.playing} onRestart={retrieval.restart} onToggle={() => retrieval.setPlaying(!retrieval.playing)} />
      </div>
    </section>
  );
}

function AgentPatternDiagram({ type }: { type: (typeof agentPatterns)[number]["id"] }) {
  const nodeCount = type === "peer" ? 4 : 5;
  return (
    <div className="agent-pattern-diagram" data-type={type} aria-hidden="true">
      <svg viewBox="0 0 320 150">
        {type === "tree" ? <><path d="M160 36 L54 116"/><path d="M160 36 L108 116"/><path d="M160 36 L212 116"/><path d="M160 36 L266 116"/></> : null}
        {type === "swarm" ? <><path d="M160 25 L55 70 L95 130 L225 130 L265 70 Z"/><path d="M160 25 L95 130"/><path d="M160 25 L225 130"/><path d="M55 70 L225 130"/><path d="M265 70 L95 130"/></> : null}
        {type === "peer" ? <><path d="M72 48 L248 48"/><path d="M72 110 L248 110"/><path d="M72 48 L72 110"/><path d="M248 48 L248 110"/><path d="M72 48 L248 110"/></> : null}
      </svg>
      {Array.from({ length: nodeCount }).map((_, index) => <i key={index}><Bot size={12}/></i>)}
      {type === "swarm" ? <><em>@review</em><em>@frontend</em></> : null}
    </div>
  );
}

function MultiAgentChapter() {
  const patternLoop = useLoop(agentPatterns.length, 3400);
  const orbitLoop = useLoop(orbitalWork.length, 1700);
  const [use3D, setUse3D] = useState(true);

  return (
    <section className="multi-agent-chapter" id="agents">
      <div className="agent-chapter-banner">
        <p><span>02</span> MULTI-AGENT ARCHITECTURE</p>
        <h2>更多 Agent，<br/>为什么没有更快交付？</h2>
        <small>问题不在数量，而在协作没有边界、没有共同事实，也没有结束条件。</small>
      </div>

      <div className="agent-pattern-grid" aria-label="三种常见多 Agent 结构">
        {agentPatterns.map((pattern, index) => (
          <button aria-pressed={patternLoop.step === index} key={pattern.id} onClick={() => { patternLoop.setStep(index); patternLoop.setPlaying(false); }} type="button">
            <header><span>{pattern.index}</span><b>{pattern.label}</b><code>{pattern.metric}</code></header>
            <AgentPatternDiagram type={pattern.id}/>
            <h3>{pattern.title}</h3><p>{pattern.detail}</p>
          </button>
        ))}
      </div>

      <div className="industry-answers">
        <article><header><span>ANTHROPIC</span><b>Orchestrator → Workers</b></header><h3>把并行用于单个模型难以覆盖的探索。</h3><p>Lead Agent 动态拆出专门 Subagent，扩大研究广度，再把结果汇总回主线程。</p><a href="https://www.anthropic.com/engineering/multi-agent-research-system" rel="noreferrer" target="_blank">官方架构 <ArrowRight size={13}/></a></article>
        <article><header><span>OPENAI</span><b>Manager / Handoffs</b></header><h3>先决定：最终答复究竟由谁负责。</h3><p>Manager 保持控制，或用 Handoff 转移所有权；每个专家都应该有清晰边界。</p><a href="https://developers.openai.com/api/docs/guides/agents/orchestration" rel="noreferrer" target="_blank">官方模式 <ArrowRight size={13}/></a></article>
      </div>

      <div className="project-gravity-panel">
        <div className="project-gravity-copy">
          <div className="gravity-header-row">
            <p><i/> PAW / PROJECT GRAVITY</p>
            <div className="gravity-dimension-toggle" aria-label="切换 3D / 2D 视图">
              <button
                className="dimension-btn"
                data-active={use3D}
                onClick={() => setUse3D(true)}
                type="button"
              >
                <span>🪐 3D 沉浸星系</span>
              </button>
              <button
                className="dimension-btn"
                data-active={!use3D}
                onClick={() => setUse3D(false)}
                type="button"
              >
                <span>🗺️ 2D 契约轨道路线</span>
              </button>
            </div>
          </div>
          <h2>文档和技能流，<br/><em>是项目的引力。</em></h2>
          <p>Session 内可以高效主从；Room 层只保留 2–4 个能纵向交付的伙伴。它们围绕原始需求运行，通过任务文档交换结果，而不是无限互相 @。</p>
          <div><span><b>SESSION</b><strong>主 Agent + 小 Worker</strong><small>读取、改写、局部验证；省 token，保持上下文干净。</small></span><span><b>ROOM</b><strong>少量平等伙伴</strong><small>每条轨道都交付实现、测试、证据与未解决风险。</small></span></div>
        </div>

        {use3D ? (
          <SolarSystem3D
            activeStep={orbitLoop.step}
            isPlaying={orbitLoop.playing}
            onRestart={orbitLoop.restart}
            onSelectStep={(step) => {
              orbitLoop.setStep(step);
              orbitLoop.setPlaying(false);
            }}
            onTogglePlay={() => orbitLoop.setPlaying(!orbitLoop.playing)}
            orbitalWork={orbitalWork}
          />
        ) : (
          <div className="solar-system-stage" aria-label="PAW 文档引力多 Agent 架构">
            <div className="solar-nebula solar-nebula--1" aria-hidden="true" />
            <div className="solar-nebula solar-nebula--2" aria-hidden="true" />
          <div className="solar-nebula solar-nebula--3" aria-hidden="true" />
          <div className="solar-stars solar-stars--deep" aria-hidden="true" />
          <div className="solar-stars solar-stars--mid" aria-hidden="true" />
          <div className="solar-stars solar-stars--bright" aria-hidden="true" />
          <div className="shooting-star shooting-star--1" aria-hidden="true" />
          <div className="shooting-star shooting-star--2" aria-hidden="true" />
          <div className="spacetime-grid" aria-hidden="true" />

          {/* Background Gravity Hologram Document */}
          <div className="solar-document-backdrop" aria-hidden="true">
            <header>
              <FileText size={14} />
              <span>ORIGINAL_REQUIREMENT.md · PROJECT GRAVITY SOURCE</span>
              <span className="doc-badge">ROOT FACT</span>
            </header>
            <div className="doc-content-mock">
              <h6># 核心目标: 消除偏见与无限等待</h6>
              <p>1. 原始需求与文档是唯一引力中心，执行伙伴重读需求修正 Plan。</p>
              <p>2. 跨轨道默认文档通信，禁止无依据的 P0 与无限打回。</p>
              <p>3. 纵向轨道对齐：实现 + TDD 自动化用例 + 完整验证证据。</p>
              <div className="doc-code-preview">
                <code>{`// 契约回执: sources.md -> implementation.md -> verification.md -> delivery.md`}</code>
              </div>
            </div>
            <div className="doc-watermark">PAW PROJECT GRAVITY FIELD</div>
          </div>

          {/* SVG Orbits and Photon Streams */}
          <svg className="solar-orbits" aria-hidden="true" viewBox="0 0 720 650">
            <defs>
              <linearGradient id="orbit-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(167, 157, 255, 0.6)" />
                <stop offset="50%" stopColor="rgba(255, 255, 255, 0.15)" />
                <stop offset="100%" stopColor="rgba(167, 157, 255, 0.5)" />
              </linearGradient>
              <radialGradient id="sun-glow-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff1d6" />
                <stop offset="25%" stopColor="#ffb356" />
                <stop offset="55%" stopColor="#cf4d38" />
                <stop offset="85%" stopColor="#4f1d35" />
                <stop offset="100%" stopColor="#0b0a16" />
              </radialGradient>
              <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Orbit Tracks */}
            <ellipse className="orbit-track orbit-track--1" cx="360" cy="325" rx="310" ry="225" />
            <ellipse className="orbit-track orbit-track--2" cx="360" cy="325" rx="245" ry="290" transform="rotate(26 360 325)" />
            <ellipse className="orbit-track orbit-track--inner" cx="360" cy="325" rx="160" ry="110" />

            {/* Photon Flow Pulses */}
            <path className="photon-stream photon-stream--1" d="M360 325 C220 185 145 170 86 223" />
            <path className="photon-stream photon-stream--2" d="M360 325 C515 180 611 184 676 225" />
            <path className="photon-stream photon-stream--3" d="M360 325 C218 467 139 474 91 431" />
            <path className="photon-stream photon-stream--4" d="M360 325 C515 468 610 475 670 432" />

            {/* Active Gravitational Pull Beam */}
            {orbitLoop.step === 0 && <line className="grav-pull-line" x1="360" y1="325" x2="105" y2="215" />}
            {orbitLoop.step === 1 && <line className="grav-pull-line" x1="360" y1="325" x2="615" y2="215" />}
            {orbitLoop.step === 2 && <line className="grav-pull-line" x1="360" y1="325" x2="110" y2="445" />}
            {orbitLoop.step === 3 && <line className="grav-pull-line" x1="360" y1="325" x2="610" y2="445" />}
          </svg>

          {/* Gravity Wave Ripples */}
          <div className="gravity-ripple gravity-ripple--1" aria-hidden="true" />
          <div className="gravity-ripple gravity-ripple--2" aria-hidden="true" />
          <div className="gravity-ripple gravity-ripple--3" aria-hidden="true" />

          {/* Central Sun / Gravity Core */}
          <div className="solar-sun-wrapper" onClick={() => orbitLoop.restart()} title="点击重新从研究轨道开始巡览">
            <div className="solar-corona" aria-hidden="true" />
            <div className="solar-sun">
              <span className="solar-sun-icon">
                <FileText size={22} />
              </span>
              <p className="solar-sun-label">PROJECT GRAVITY</p>
              <strong>原始需求<br />任务文档 · 技能流</strong>
              <small className="solar-sun-badge">共同事实 · 引力核心</small>
            </div>
          </div>

          {/* Planetary Orbital Nodes */}
          {orbitalWork.map((planet, index) => {
            const isActive = orbitLoop.step === index;
            return (
              <article
                className={`solar-planet ${planet.className}`}
                data-active={isActive}
                key={planet.id}
                onClick={() => {
                  orbitLoop.setStep(index);
                  orbitLoop.setPlaying(false);
                }}
                onMouseEnter={() => {
                  orbitLoop.setStep(index);
                  orbitLoop.setPlaying(false);
                }}
                style={{ "--planet-accent": planet.color } as React.CSSProperties}
              >
                <header>
                  <span className="planet-sphere">
                    <Orbit size={15} />
                    <i className="planet-glow-ring" />
                  </span>
                  <div>
                    <strong className="planet-title">{planet.name}</strong>
                    <small className="planet-tag">{planet.tag}</small>
                  </div>
                  <i className="planet-status-dot" title="轨道活跃中" />
                </header>

                <p className="planet-receipt">
                  <FileCheck2 size={11} />
                  <span>{planet.receipt}</span>
                </p>

                <div className="planet-tdd-badge">
                  <TestTube2 size={10} />
                  <span>{planet.tdd}</span>
                </div>

                {/* Orbiting Satellites (Session Workers) */}
                <em className="solar-moon solar-moon--one" title={planet.subWorker}>
                  <Bot size={9} />
                  <span>Worker</span>
                </em>
                <em className="solar-moon solar-moon--two" title={planet.subVerify}>
                  {index % 2 === 0 ? <Zap size={9} /> : <TestTube2 size={9} />}
                  <span>Verify</span>
                </em>
              </article>
            );
          })}

          {/* Interactive Orbit Navigation Strip */}
          <div className="solar-orbit-nav" aria-label="切换聚焦轨道">
            <button
              className="solar-nav-play"
              onClick={() => orbitLoop.setPlaying(!orbitLoop.playing)}
              type="button"
            >
              {orbitLoop.playing ? <Pause size={12} /> : <Play size={12} />}
              <span>{orbitLoop.playing ? "自动巡回" : "已暂停"}</span>
            </button>
            <div className="solar-nav-chips">
              {orbitalWork.map((planet, index) => (
                <button
                  aria-pressed={orbitLoop.step === index}
                  key={planet.id}
                  onClick={() => {
                    orbitLoop.setStep(index);
                    orbitLoop.setPlaying(false);
                  }}
                  type="button"
                >
                  <i style={{ backgroundColor: planet.color }} />
                  <span>{planet.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Active Orbit Receipt / Telemetry */}
          <div className="solar-receipt">
            <Check size={14} className="solar-receipt-check" />
            <div className="solar-receipt-content">
              <strong>
                {orbitalWork[orbitLoop.step].name} · {orbitalWork[orbitLoop.step].task}
              </strong>
              <small>
                {orbitalWork[orbitLoop.step].metric} · 产物: <code>{orbitalWork[orbitLoop.step].receipt}</code>
              </small>
            </div>
            <span className="solar-receipt-pill">TDD 纵向验收</span>
          </div>
        </div>
        )}
      </div>

      <div className="agent-rule-grid">
        <article><span>01</span><Network size={20}/><h3>文档优先通信</h3><p>跨轨道读取结果文档，不把连续互相 @ 当成主流程。</p></article>
        <article><span>02</span><GitBranch size={20}/><h3>Plan 可以被修订</h3><p>每个伙伴都重读原始需求，而不是机械执行有偏见的计划。</p></article>
        <article><span>03</span><ShieldCheck size={20}/><h3>P0 必须带证据</h3><p>复现步骤、影响范围与失败输出缺一不可。</p></article>
        <article><span>04</span><CircleAlert size={20}/><h3>审核循环有上限</h3><p>超过阈值升级为明确决策，系统不能无限互相打回。</p></article>
      </div>
      <div className="agent-chapter-close"><Users size={27}/><p>Session 可以是高效的主从系统。<br/><strong>Room 必须是一组围绕共同事实工作的伙伴。</strong></p></div>
    </section>
  );
}

type RoomStage = "orbit" | "morph" | "windows";

function RoomTransformationDemo() {
  const orbitLoop = useLoop(orbitalWork.length, 1700);
  const [stage, setStage] = useState<RoomStage>("orbit");
  const [playing, setPlaying] = useState(true);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    if (!playing || stage === "windows") return;
    const timer = window.setTimeout(() => setStage(stage === "orbit" ? "morph" : "windows"), stage === "orbit" ? 6_400 : 1_350);
    return () => window.clearTimeout(timer);
  }, [playing, stage]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!media.matches) return;

    const frame = window.requestAnimationFrame(() => {
      setPlaying(false);
      setStage("windows");
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const restart = () => {
    orbitLoop.restart();
    setStage("orbit");
    setPlaying(true);
    setRunKey((value) => value + 1);
  };

  const selectPartner = (index: number) => {
    orbitLoop.setStep(index);
    orbitLoop.setPlaying(false);
  };

  return (
    <div className="room-transformation" data-stage={stage}>
      <header className="room-transformation-toolbar">
        <div><Orbit size={16}/><span><strong>Room Collaboration Projection</strong><small>同一批伙伴：关系视图 → 执行窗口</small></span></div>
        <nav aria-label="切换 Room 展示阶段">
          <button aria-pressed={stage === "orbit"} onClick={() => { setStage("orbit"); setPlaying(false); }} type="button"><i/>关系视图</button>
          <button aria-pressed={stage === "windows"} onClick={() => { setStage("windows"); setPlaying(false); }} type="button"><i/>执行窗口</button>
          <button onClick={restart} type="button"><RefreshCw size={12}/>重播</button>
        </nav>
      </header>

      <div className="room-stage-status" aria-live="polite">
        <span data-active={stage === "orbit"}>01 · 围绕目标分派</span><ArrowRight size={13}/><span data-active={stage === "morph"}>02 · 保持身份展开</span><ArrowRight size={13}/><span data-active={stage === "windows"}>03 · 进入真实窗口态</span>
      </div>

      <div className="room-transformation-stage">
        <div className="room-orbit-layer" aria-hidden={stage === "windows"}>
          <SolarSystem3D
            activeStep={orbitLoop.step}
            isPlaying={playing && orbitLoop.playing}
            onRestart={restart}
            onSelectStep={selectPartner}
            onTogglePlay={() => { setPlaying(!playing); orbitLoop.setPlaying(!playing); }}
            orbitalWork={orbitalWork}
          />
          <div className="room-orbit-caption"><span><i/> SOL</span><p><strong>展示页面制作</strong>原始需求、三项实施 WorkPatch 与独立 Reviewer 共同围绕同一 Goal。</p></div>
        </div>

        <div className="room-morph-bridge" aria-hidden="true">
          {orbitalWork.map((work, index) => <i key={work.id} style={{ "--morph-color": work.color, "--morph-index": index } as React.CSSProperties}/>) }
          <span>PLANETS BECOME PAW WINDOWS</span>
        </div>

        {stage === "windows" ? <PawOsLiveRoom key={runKey}/> : null}
      </div>

      <footer className="real-surface-receipt">
        <ShieldCheck size={15}/><span><strong>实际 PAWOS 前端正在运行</strong><small>直接渲染公开 PawDesktop + PawWindowLayer + PawAgentApp；只有 Room 事件与示例内容为明确标注的合成数据。</small></span><code>real-ui · synthetic-events</code>
      </footer>
    </div>
  );
}

function PawOsLiveRoom() {
  const [loaded, setLoaded] = useState(false);
  const source = useMemo(() => pawOsShowcaseUrl(), []);

  return (
    <div className="pawos-live-room" data-loaded={loaded || undefined}>
      <div className="pawos-live-room__loading" role="status"><Orbit size={18}/><span><strong>正在进入真实 PAWOS</strong><small>加载公开合成 Room 与实际窗口层…</small></span></div>
      <iframe
        allow="clipboard-read; clipboard-write"
        onLoad={() => setLoaded(true)}
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
        src={source}
        title="真实 PAWOS Room 多窗口运行过程"
      />
      <a href={source} rel="noreferrer" target="_blank"><SquareArrowOutUpRight size={13}/>全屏打开真实 PAWOS</a>
    </div>
  );
}

function pawOsShowcaseUrl(): string {
  const route = "?frontend=paw-os&showcase=room-flow#/agent?room=room-preview";
  if (typeof window === "undefined") return `/pawos/${route}`;
  if (["5173", "3000", "3001"].includes(window.location.port)) {
    return `${window.location.protocol}//${window.location.hostname}:5174/${route}`;
  }
  return `/pawos/${route}`;
}

function RoomTransformationChapter() {
  return (
    <section className="multi-agent-chapter" id="agents">
      <div className="agent-chapter-banner room-chapter-banner">
        <p><span>03</span> MULTI-AGENT · FROM GRAVITY TO WINDOWS</p>
        <h2>先看清谁围绕什么工作，<br/>再进入每个伙伴的窗口。</h2>
        <small>太阳是原始文档目标；行星是纵向 WorkItem。它们不会变成一条交错消息流，而会保持身份、颜色和任务，逐一展开成真实 PAW 多窗口执行态。</small>
      </div>
      <div className="room-principles">
        <article><FileText size={18}/><span><strong>太阳 = 文档目标</strong><small>Goal 与原始需求是唯一引力，不拿聊天摘要冒充权威。</small></span></article>
        <article><Orbit size={18}/><span><strong>行星 = 纵向 WorkItem</strong><small>每位实施伙伴贯穿自己的界面、状态和交付物。</small></span></article>
        <article><TestTube2 size={18}/><span><strong>Reviewer = 独立批次</strong><small>是否启动由 Facilitator 决定；实施完成后再忠于需求与代码复核。</small></span></article>
      </div>
      <RoomTransformationDemo/>
      <div className="agent-chapter-close"><Users size={27}/><p>关系图不是装饰。<br/><strong>它必须能落回每一个真实工作窗口与回执。</strong></p></div>
    </section>
  );
}

function KnowledgeStory() {
  const [selected, setSelected] = useState("PAW 官网");
  const nodes = useMemo(() => [
    { label: "PAW 官网", x: 49, y: 46, kind: "core" }, { label: "输入法", x: 20, y: 24, kind: "feature" },
    { label: "Room", x: 76, y: 22, kind: "feature" }, { label: "记忆治理", x: 19, y: 73, kind: "topic" },
    { label: "沙盒浏览", x: 77, y: 73, kind: "topic" }, { label: "产品叙事", x: 51, y: 83, kind: "term" },
  ], []);
  return (
    <section className="story-section knowledge-story" id="knowledge">
      <div className="story-grid reverse"><ChapterIntro index="04" kicker="KNOWLEDGE WITH SOURCES" title="记忆属于你，知识属于材料。" body="个人记忆与项目知识库保持独立。文档被解析、索引并组织成关系图；每次检索都展示命中来源，而不是把答案变成无法核对的黑盒。" /><div className="knowledge-facts"><span><FileText size={15} /> 24 份项目材料</span><span><Network size={15} /> 86 个语义节点</span><span><Search size={15} /> 每次回答附来源</span></div></div>
      <div className="knowledge-window paper-surface">
        <aside className="kb-sidebar"><header><BookOpen size={16} /><strong>知识库</strong><button type="button">＋</button></header><small>项目材料</small>{["PAW 产品文档", "Agent 运行时", "输入法研究"].map((name, index) => <button data-active={index === 0} key={name} type="button"><span>{name}</span><small>{[24, 12, 9][index]} 份材料</small></button>)}</aside>
        <div className="graph-workspace"><header><div><Search size={14} /><span>搜索节点、主题或实体</span></div><button type="button">图谱</button><button type="button">节点</button><span>已就绪</span></header><div className="graph-canvas"><svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="49" y1="46" x2="20" y2="24"/><line x1="49" y1="46" x2="76" y2="22"/><line x1="49" y1="46" x2="19" y2="73"/><line x1="49" y1="46" x2="77" y2="73"/><line x1="49" y1="46" x2="51" y2="83"/><line x1="20" y1="24" x2="19" y2="73"/><line x1="76" y1="22" x2="77" y2="73"/></svg>{nodes.map((node) => <button className="graph-node" data-kind={node.kind} data-selected={selected === node.label} key={node.label} onClick={() => setSelected(node.label)} style={{ left: `${node.x}%`, top: `${node.y}%` }} type="button"><i />{node.label}</button>)}</div></div>
        <aside className="graph-inspector"><span>节点详情</span><h3>{selected}</h3><p>{selected === "PAW 官网" ? "以真实产品状态为主角，通过五幕叙事解释系统能力。" : `“${selected}”与当前项目的设计决策、实现材料和验证证据相关。`}</p><dl><div><dt>材料</dt><dd>官网叙事框架.md</dd></div><div><dt>关系</dt><dd>关联 5 个节点</dd></div><div><dt>权重</dt><dd>0.92</dd></div></dl><button type="button">打开材料来源</button></aside>
      </div>
    </section>
  );
}

function BrowserStory() {
  const loop = useLoop(4, 1700);
  const trace = ["打开参考页面", "读取可见内容", "提取产品叙事", "保存操作回执"];
  return (
    <section className="story-section browser-story" id="browser">
      <ChapterIntro index="05" kicker="BROWSER AS A CONTROLLED TOOL" title="Agent 可以看网页，但不会消失在网页里。" body="内置沙盒浏览器把页面、标签页、快照和操作轨迹放回 PAW。你能看到 Agent 看了什么、做了什么，以及哪些动作仍在等待授权。" />
      <div className="browser-window">
        <div className="browser-tabs"><div className="traffic"><i /><i /><i /></div><span data-active>PAW 项目文档 <b>×</b></span><span>竞品研究 <b>×</b></span><button type="button">＋</button></div>
        <div className="browser-toolbar"><button type="button">←</button><button type="button">→</button><button type="button">↻</button><div><ShieldCheck size={13} /><span>docs.paw.local / architecture</span></div><button type="button">•••</button></div>
        <div className="browser-body">
          <div className="browser-page"><nav><PawMark /><span>Docs</span><span>Architecture</span><span>Memory</span><span>Rooms</span></nav><main><p>PAW / ARCHITECTURE</p><h3>A project runtime<br />that remembers.</h3><p>Session 做真实工作，Room 组织协作，接受后的结果再进入受治理的记忆与知识。</p><div className="browser-doc-grid"><article><Brain size={17}/><strong>Governed Memory</strong><small>来源、整理、记忆、主题</small></article><article><Network size={17}/><strong>Room Runtime</strong><small>目标、分工、证据、交付</small></article></div></main><span className="browser-target" style={{ left: `${[19, 53, 67, 80][loop.step]}%`, top: `${[38, 68, 50, 30][loop.step]}%` }}><i /></span></div>
          <aside className="browser-trace"><header><Bot size={15} /><span><strong>Agent 操作轨迹</strong><small>隔离环境 · 实时</small></span></header>{trace.map((item, index) => <div data-state={index < loop.step ? "done" : index === loop.step ? "active" : "waiting"} key={item}><span>{index < loop.step ? <Check size={11}/> : index + 1}</span><p><strong>{item}</strong><small>{index === 0 ? "docs.paw.local" : index === 1 ? "标题、正文、2 个链接" : index === 2 ? "5 个页面章节" : "snapshot · receipt"}</small></p></div>)}<section><ShieldCheck size={14}/><span><strong>写操作需要确认</strong><small>当前仅允许读取与快照</small></span></section></aside>
        </div><PlaybackControls playing={loop.playing} onRestart={loop.restart} onToggle={() => loop.setPlaying(!loop.playing)} />
      </div>
    </section>
  );
}

function Closing() {
  return (
    <footer className="closing starfield"><div className="closing-orbit"><span><Keyboard size={15}/>输入</span><i/><span><Brain size={15}/>记忆</span><i/><span><BookOpen size={15}/>知识</span><i/><span><Globe2 size={15}/>浏览器</span><i/><span><Network size={15}/>Agent</span></div><p className="eyebrow">ONE CONTINUOUS CONTEXT LOOP</p><h2>Agent 会结束。<br /><em>项目不该失忆。</em></h2><p>PAW 把零散的输入、材料、浏览与执行，收束成一个可以继续工作的个人 AI 系统。</p><a href="#top">重新观看 <RefreshCw size={15}/></a></footer>
  );
}

function ExtendedFeatureGate() {
  const [open, setOpen] = useState(false);

  const reveal = () => {
    setOpen(true);
    window.setTimeout(() => document.querySelector("#extended-features")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  return (
    <>
      <section className="extended-feature-gate" aria-label="更多 PAW 功能">
        <div><p>THE STORY CONTINUES</p><h2>前三章讲清主链路。<br/><em>更多真实功能，按需进入。</em></h2><span>知识库图谱与沙盒浏览器没有删除；它们从主叙事退到一个明确入口之后。</span></div>
        <button aria-expanded={open} onClick={reveal} type="button"><span><b>04 / 05</b><strong>{open ? "返回扩展功能" : "进入更多功能展厅"}</strong><small>Knowledge · Browser</small></span><ArrowRight size={20}/></button>
      </section>
      {open ? <div className="extended-features" id="extended-features"><KnowledgeStory/><BrowserStory/><Closing/></div> : null}
    </>
  );
}

export default function Home() {
  return <main className="input-page-only"><InputPageHeader /><InputStory /><MemoryStory /><RoomTransformationChapter /><ExtendedFeatureGate /></main>;
}
