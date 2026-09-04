"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CircleAlert,
  FileText,
  GitBranch,
  History,
  Layers3,
  Maximize2,
  Search,
  ShieldCheck,
  Sparkles,
  SquareArrowOutUpRight,
  TestTube2,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GithubMark, PawMark, PlaybackControls, useLoop } from "../ui-shared";

const industrySources = {
  context: {
    label: "Anthropic · Effective context engineering",
    href: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents",
  },
  harness: {
    label: "OpenAI · Harness engineering",
    href: "https://openai.com/zh-Hans-CN/index/harness-engineering/",
  },
  multiAgent: {
    label: "Anthropic · Multi-agent research system",
    href: "https://www.anthropic.com/engineering/multi-agent-research-system",
  },
  agentGuide: {
    label: "OpenAI · A practical guide to building agents",
    href: "https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/",
  },
  longRunning: {
    label: "Anthropic · Harness design for long-running apps",
    href: "https://www.anthropic.com/engineering/harness-design-long-running-apps",
  },
  claudeParallel: {
    label: "Claude Code · Run agents in parallel",
    href: "https://code.claude.com/docs/en/agents",
  },
  claudeTeams: {
    label: "Claude Code · Agent teams",
    href: "https://code.claude.com/docs/en/agent-teams",
  },
} as const;

const imeRuntimeSteps = [
  ["01", "确认前缀", "Rime / Squirrel 仍负责拼音解析、原生候选与提交；模型只接收已经确认的中文前缀。"],
  ["02", "一次 Prefill", "按 token-LCP 复用上一按键的 Prefix KV；不能用字符前缀冒充 tokenizer 层面的精确复用。"],
  ["03", "候选成组", "为当前前缀创建 CandidateGroup，2–8 条初始行共享前缀状态，而不是重复做八次完整请求。"],
  ["04", "Ragged Decode", "只批处理仍在生成的行；遇到 EOS 或句末就移出 active rows，避免空转。"],
  ["05", "过滤与排序", "保留 raw logprob，先做中文合法性过滤和显示归一化去重，再以软惩罚与 char-bigram MMR 选 Top-3。"],
  ["06", "新按键接管", "若用户继续输入，latest-wins 立即让旧代际失效；输出不足时再自适应补候选，最多累计 24 条。"],
] as const;

const agentRoles = [
  ["Session", "一段真实的 Codex 项目对话", "Transcript、模型与 Tool loop、Skills、context / compaction、Steer / Stop、恢复", "持续完成一个项目目标"],
  ["Tool Agent", "某个 Session 私下派出的短任务", "父 Session 授予的模型、工具、SkillRefs 与工作区边界", "有界 AgentResult，不进入 Room 成员列表"],
  ["Room Partner", "另一个可独立做项目的 Session", "自己的上下文、工具、WorkItem 与结果责任", "公开进度、证据与 terminal result"],
  ["Facilitator", "Room 中负责整合的普通 Session", "Goal 对齐、显式派发、冲突修复、最终回答所有权", "唯一的 Root 结论"],
  ["Reviewer", "按需启动的独立检查批次", "固定范围、原需求与产物证据", "风险与验收意见；不是无限否决者"],
] as const;

const pawLaunchLanes = [
  ["输入法", "梳理 Rime / Squirrel 边界，训练 MiniMind-IME，并把 AIOS-IME 接到低延迟候选链。", "模型与推理报告"],
  ["Memory", "把零散输入拆成 Capture → Govern → Recall → Eval，保留授权、来源和删除边界。", "可召回记忆与回执"],
  ["多 Agent", "从强 Room / Kernel 重构为轻 Room：Session 保持原生，协作只新增身份、派发与公共事件。", "Room 运行契约"],
  ["PAWOS", "把 Agent、Room、Memory、Trace 和真实应用窗口放到同一个 Control Center 投影中。", "前端与交互验收"],
] as const;

type AgentGitEra = "product" | "kernel" | "cutover" | "rebuild";

type AgentProjectHistoryEntry = {
  phase: string;
  date: string;
  endedAt: string;
  startRef: string | null;
  endRef: string;
  era: AgentGitEra;
  track: string;
  title: string;
  change: string;
  pitfall: string;
  commits: number;
  files: number;
  additions: number;
  deletions: number;
  spotlight: { label: string; value: string } | null;
};

const agentProjectHistory = [
  {
    phase: "G01", date: "2026-06-30", endedAt: "2026-06-30", startRef: null, endRef: "d6dcd679", era: "product", track: "INPUT / RAG",
    title: "先证明本地模型能接住一次输入。",
    change: "SQLite / FTS5 与本地预测基线落地；InputMethodKit 当天降为 prototype，生产输入前端转向 Rime / Squirrel。",
    pitfall: "代码和进程存在，不等于系统前台真的能输入。第一天就遇到了产品验收与实现证据的分界。",
    commits: 1, files: 4, additions: 134, deletions: 1, spotlight: null,
  },
  {
    phase: "G02", date: "06-30 → 07-10", endedAt: "2026-07-10", startRef: "d6dcd679", endRef: "fc9f7262", era: "product", track: "IME",
    title: "候选有了，输入法却不好用了。",
    change: "Prediction-first 与 Rime 候选争夺交互 owner；07-08 起把 AI Overlay 与原生 candidate panel 拆开。",
    pitfall: "模型输出、RAG 命中和输入法可用性是三种不同证据，不能用其中一个替另外两个过验收。",
    commits: 307, files: 353, additions: 333780, deletions: 1616, spotlight: null,
  },
  {
    phase: "G03", date: "07-10 → 07-13", endedAt: "2026-07-13", startRef: "fc9f7262", endRef: "d2381d87", era: "product", track: "PI GATEWAY",
    title: "输入法之外，Pi Gateway 变成第二条产品线。",
    change: "补前台与发布门；07-13 用户提出网关型 Agent 与多端控制，输入法从唯一中心变成 Workbench 的一个入口。",
    pitfall: "不能倒推成“输入法失败所以改做 Agent”。真实历史是两条动机并行推进，后来才汇入 PAW。",
    commits: 22, files: 438, additions: 72170, deletions: 239934, spotlight: null,
  },
  {
    phase: "G04", date: "07-13 → 07-15", endedAt: "2026-07-15", startRef: "d2381d87", endRef: "c1bd34b6", era: "product", track: "SESSION",
    title: "网页能控制 Session 后，状态所有权又成了问题。",
    change: "多端 Session 与 Web 控制面落地；权威会话状态、刷新和恢复第一次成为跨进程问题。",
    pitfall: "真实例子：Native transport 明明返回空 Session / Persona，页面仍自动注入 preview fixture，看起来像有会话在运行。7decc565 后补回归测试：Native 空态必须如实为空，演示数据只能属于 mock transport。",
    commits: 78, files: 555, additions: 124573, deletions: 8193, spotlight: null,
  },
  {
    phase: "G05", date: "07-15 → 07-16", endedAt: "2026-07-16", startRef: "c1bd34b6", endRef: "5a8986e4", era: "product", track: "MEMORY",
    title: "一天的原始输入不能直接塞进 Agent。",
    change: "按 App、时间、Backspace 与 Enter 拼接输入，先去噪并生成提案，再由用户批准进入长期记忆。",
    pitfall: "真实例子：用户要求整理全部历史，compiler 却默认只取最近 7 天、最多 80 条，于是 7 月 11 日左右的旧记忆在界面上像“消失”了。修复不是把原始输入全塞进 Agent，而是补全历史整理与来源回跳。",
    commits: 47, files: 242, additions: 23069, deletions: 1399, spotlight: null,
  },
  {
    phase: "G06", date: "07-16 → 07-18", endedAt: "2026-07-18", startRef: "5a8986e4", endRef: "c7a97046", era: "product", track: "TOOLS",
    title: "Tool 越来越多，权限与展示一起爆出来。",
    change: "危险操作审批、语义化 Tool 展示、按需激活与监控进入产品范围，Tool 开始被当成用户可理解的工作过程。",
    pitfall: "真实例子：operation-specific JSON Schema 把所有属性复制进每个分支，Tool manifest 很快膨胀到难以注入和阅读。f5df76cd 用体积回归把 manifest 限在 25 KB 内，前端则改成语义化卡片而不是倾倒 JSON。",
    commits: 51, files: 432, additions: 107959, deletions: 7130, spotlight: null,
  },
  {
    phase: "G07", date: "07-18 → 07-27", endedAt: "2026-07-27", startRef: "c7a97046", endRef: "f82e1935", era: "kernel", track: "ROOM KERNEL",
    title: "为了不失真，我们给 Room 加了整套 Kernel。",
    change: "WorkItem、worktree、review、settlement、quality gate 与恢复被放进一个强控制面，试图一次解决责任与最终完成语义。",
    pitfall: "真实例子：Pi 已接受 Dispatch，但 Kernel 在写 ACK 前崩溃；租约随后变成 unknown，Room 撤销了 capability，却找不到仍在运行的任务来取消。bede5897 / c15571bd 的复现说明第二套生命周期会制造不可收口状态。",
    commits: 211, files: 927, additions: 167904, deletions: 20228, spotlight: null,
  },
  {
    phase: "G08", date: "07-27 → 08-12", endedAt: "2026-08-12", startRef: "f82e1935", endRef: "548641dd", era: "kernel", track: "KERNEL EXPANSION",
    title: "每修一个洞，又长出一个状态机。",
    change: "发布门、TUI、canary 与 Project Field 继续扩张，同时反复修取消复活、孤儿 dispatch、deadlock、settlement 和 recovery。",
    pitfall: "真实例子：第一波功能完成后，integration task 等待后续功能；后续功能又依赖 integration 先释放，形成闭环等待。81594a56 增加复现并改为逐波集成，避免所有任务互相等完成。",
    commits: 99, files: 1048, additions: 298670, deletions: 31278, spotlight: null,
  },
  {
    phase: "G09", date: "08-12 → 08-15", endedAt: "2026-08-15", startRef: "548641dd", endRef: "69ccce70", era: "cutover", track: "DELETE / CUTOVER",
    title: "停下来删：Room 不再拥有第二套 Runtime。",
    change: "两个提交移除重复的 loop、context、Tool 与 settlement owner；Room 改回由普通 Pi Session 组合。",
    pitfall: "真实例子：删掉 Kernel 后，detached 普通 Pi Session 的 progress 仍被投影成 Room turn；刷新又从持久事件重放，于是出现没人派发却一直存在的 ghost。69ccce70 明确过滤未被 Room 路由的 Session 事件。",
    commits: 2, files: 318, additions: 10300, deletions: 136029,
    spotlight: { label: "核心提交 0a9f5c9c", value: "190 files · +5,145 · −115,912" },
  },
  {
    phase: "G10", date: "08-15 → 08-16", endedAt: "2026-08-16", startRef: "69ccce70", endRef: "20d198cf", era: "rebuild", track: "PI-NATIVE",
    title: "让 Pi 重新执行，让 Room 只负责协作。",
    change: "根文档、Skill 路由和 Light Room 边界落地：Pi 管模型、Tool、context 与恢复；Room 管身份、派发和公共事件。",
    pitfall: "真实例子：Runtime owner 收敛成功后，页面却一度看不到任务拆解、分配、Todo、Sub Agent 和参与者项目上下文。09491a15 / 872524d6 说明“轻量”仍要保留 WorkItem 与公共事件的可观察合同。",
    commits: 23, files: 303, additions: 19566, deletions: 6310, spotlight: null,
  },
  {
    phase: "G11", date: "08-16 → 08-24", endedAt: "2026-08-24", startRef: "20d198cf", endRef: "cfb3f649", era: "rebuild", track: "CONTROL RECOVERY",
    title: "把删重时丢掉的控制能力一项项补回来。",
    change: "继续修 Steer、Stop、refresh、Partner waves 与 ownership，让长任务重新可观察、可停止、可恢复。",
    pitfall: "真实例子：用户在刚发送 prompt 后立刻 Steer，指令会抢在 prompt admission 与 turnId 建立前落到错误位置。241dd91d 改成等待 Pi Host 接纳 prompt 后再 steer；Stop 还要继续扇出到所有活跃 child。",
    commits: 45, files: 424, additions: 70023, deletions: 6178, spotlight: null,
  },
  {
    phase: "G12", date: "08-24 → 08-29", endedAt: "2026-08-29", startRef: "cfb3f649", endRef: "692a41ce", era: "rebuild", track: "PAWOS",
    title: "最后才轮到 PAWOS 把这些 owner 放到一张桌面。",
    change: "Session、Room、Memory、Trace 与 Electron-only release runtime 被投影进同一个 Control Center 和应用窗口体系。",
    pitfall: "真实例子：Swift 与 Electron 两套发布宿主并存时，构建和安装链选中了错误 Browser 版本；源码测试通过，前台却不是用户刚改的界面。deeaf8ea 把发布宿主收敛为 Electron-only，并保留安装后前台验收。",
    commits: 473, files: 1159, additions: 242485, deletions: 31450, spotlight: null,
  },
] satisfies readonly AgentProjectHistoryEntry[];

const agentGitCommitTotal = agentProjectHistory.reduce((total, entry) => total + entry.commits, 0);
const agentGitMaxAdditions = Math.max(...agentProjectHistory.map((entry) => entry.additions));
const agentGitMaxDeletions = Math.max(...agentProjectHistory.map((entry) => entry.deletions));
const agentGitNumber = new Intl.NumberFormat("en-US");

function agentGitDiffScale(value: number, maximum: number) {
  return `${Math.max(5, Math.round((Math.log10(value + 1) / Math.log10(maximum + 1)) * 100))}%`;
}

const agentConversationEvidence = [
  ["2026-06-30", "INPUT / RAG", "“逐字进行提示，用户没法选择，因为他看不到全貌。”", "推动候选与完整句子展示，不把一次模型输出当成交互完成。"],
  ["2026-07-13", "PI GATEWAY", "“Pi 可以做成网关型 Agent 吗？我就可以用手机或者聊天软件控制 Pi 和输入法。”", "输入法没有消失，而是从唯一产品中心变成 Workbench 的一个入口。"],
  ["2026-07-16", "GOVERNED MEMORY", "“按 App 分组；同一软件短时间自动拼接；作为 Skill 让 Agent 整理，批准后再更新 Memory。”", "Capture、整理建议、审批和长期记忆被拆成不同 owner。"],
  ["2026-07-17", "TOOLS / CONTEXT", "“为什么工具还要激活才能使用？本身只是为了省上下文，渐进式披露的。”", "Tool 能力、上下文成本与可读展示开始被当成同一个产品问题处理。"],
] as const;

const agentSkillRoutes = [
  ["重大选择仍未闭合", "alignment-and-decision / grilling", "只追问会改变范围、行为、成本或验收的选择。"],
  ["多个 owner 与依赖已确定", "implementation-planning", "把改动拆成最小、可验证、可回滚的 WorkItem。"],
  ["父 Session 需要一个有界结果", "orchestrate-session", "派私有 Tool Agent；父级继续拥有整合与最终责任。"],
  ["需要可见伙伴共同承担责任", "facilitate-room", "显式派发 Partner、收集证据、处理冲突并给一个 final。"],
  ["未知故障 / 已知行为改变", "systematic-debugging / test-driven-implementation", "先定位未知根因；已知 seam 再走红测—实现—回归。"],
  ["高风险成品 / 已接受文档", "independent-review / organize-work-documents", "Reviewer 按需批次；文档整理只消费已接受结果，不决定 Runtime 状态。"],
] as const;

const agentSourceOwners = [
  ["Room 身份、成员、主题与事件存储", "rag_ime/agent_rooms.py", "AgentRoomStore / AgentRoomEventHub"],
  ["私有 Pi turn 到公共 Root 的准入", "rag_ime/agent_room_turn_registry.py", "RoomTurnRegistry.allows_room_event"],
  ["Partner 派发、回收、重试与取消", "rag_ime/agent_room_partner_application.py", "RoomPartnerApplicationService"],
  ["Session 内部 Tool Agent 委派", "rag_ime/agent_delegation.py", "AgentDelegationCoordinator.delegate"],
  ["Snapshot / SSE 归并成前端状态", "control-center-web/src/contracts/room-reducer.ts", "reduceRoomEvent"],
  ["工作、交接与 Review 的可视投影", "control-center-web/src/features/rooms/room-flow-projection.ts", "roomWorkReviewFlow"],
] as const;

const memoryTimelineEntries = [
  {
    time: "08:42",
    source: "治理偏好",
    context: "Session · 页面修改",
    text: "网页只需更新，不必每次重写全部内容。",
    outcome: "偏好 Atom · 局部修改，保留其余内容",
    color: "#5b6fe8",
  },
  {
    time: "10:16",
    source: "表达偏好",
    context: "Session · 结果说明",
    text: "面向用户的解释先给结论，再补充必要原因。",
    outcome: "偏好 Atom · 结论先行",
    color: "#e08a52",
  },
  {
    time: "14:08",
    source: "界面偏好",
    context: "Session · 前端评审",
    text: "输入法候选框与控制界面的字体和布局保持统一，避免文字重叠；候选内容需先脱敏。",
    outcome: "偏好 Atom · 一致布局与隐私边界",
    color: "#3f9b78",
  },
  {
    time: "18:27",
    source: "证据规则",
    context: "Session · 源码核对",
    text: "当理解与代码事实不一致时，应指出并基于源码证据共同修正。",
    outcome: "偏好 Atom · 证据高于顺从",
    color: "#9a68cb",
  },
] as const;

const governedContextSources = [
  {
    id: "memory",
    label: "User Memory",
    displayLabel: "用户记忆",
    flow: "获准输入 → 偏好记忆 → 相关片段召回",
    title: "用户自己的表达品味与经历",
    detail: "默认不越权读取；只有用户显式开启或本轮工具已获权限时，才按当前语境或 compact 片段召回相关偏好。",
    access: "显式开关 + Tool 权限",
    trigger: "对话中按语境；compact 后按压缩片段，每周期至多一次",
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
] as const;

const ragModes = [
  {
    id: "embedding",
    label: "Embedding",
    title: "传统向量召回",
    summary: "把问题与切片编码成向量，按语义距离取回 Top-K。快，但相似不等于可回答。",
    steps: ["问题向量化", "ANN Top-20", "相似片段返回"],
    metric: "路径示意 · 本轮无独立成绩",
    boundary: "仅靠语义近邻，可能漏掉精确术语与时间约束",
    hits: ["向量近邻 · 语义相似", "没有项目范围门禁", "还未形成可交付证据"],
  },
  {
    id: "hybrid",
    label: "Hybrid",
    title: "关键词 + 向量混合",
    summary: "同时保留术语精确匹配与语义相似度，再合并两路候选。",
    steps: ["BM25 精确词", "向量语义召回", "RRF 合并去重"],
    metric: "Fresh core · 12 / 12 · p95 15 ms",
    boundary: "核心 fixture 通过；组合门禁另有 1 个 app-scope 用例失败",
    hits: ["BM25 / Tag 命中 @3 = 1.0", "Time / Book 命中 @3 = 1.0", "原句、墓碑与重复泄漏 = 0"],
  },
  {
    id: "rerank",
    label: "Rerank",
    title: "当前强基线：混合召回 + 模型重排",
    summary: "Qwen3 reranker 对 40 条候选做第二次模型判断，质量高，但这是 PAW 想用 Graph + Tag 裁剪替代的昂贵阶段。",
    steps: ["混合召回 40", "Qwen3 Cross-encoder", "保留 Top-10"],
    metric: "Frozen 60-case · Recall@10 .989",
    boundary: "历史冻结结果；Graph 关闭，且本轮没有重新执行源报告",
    hits: ["MRR .250 → .922", "nDCG@10 .237 → .927", "这是 Graph + Tag 必须对照的质量基线"],
  },
  {
    id: "graphTag",
    label: "Graph + Tag",
    title: "用关系传播直接裁剪候选",
    summary: "多路检索仍负责找全；受治理的 Tag 与语义边在便宜的结构层传播、合并和裁剪，让小候选集直接进入上下文，不再调用模型 reranker。",
    steps: ["BM25 / Dense / Time", "Graph + Tag 传播", "Shortlist 直入上下文"],
    metric: "语义边用例 3 / 3 · optimizer p95 .517 ms",
    boundary: "替代 rerank 是架构目标；同集质量 / 速度 A/B 尚未完成",
    hits: ["查询：输入法", "直接命中：输入法基础入口", "语义边扩展：候选排序能量传播"],
  },
  {
    id: "agentic",
    label: "Agentic RAG",
    title: "Agent 自己规划检索",
    summary: "先拆问题，再按需查时间线、词库、项目文件与知识库；发现证据不足时继续检索。",
    steps: ["拆成口径 / 数据 / 原因", "路由 4 个上下文源", "核对冲突并生成回执"],
    metric: "目标形态 · 统一 Trace 地基建设中",
    boundary: "Agent 规划不能覆盖 Scope、来源和确定性 Eval",
    hits: ["真实命中与 AI 归纳分栏", "证据不足时有界补检", "每次检索写入可复用 Trace"],
  },
] as const;

const ragRelationshipGraphs = {
  embedding: {
    focus: "vector",
    nodes: [
      { id: "query", kind: "query", label: "QUERY", value: "输入法", detail: "同一真实 fixture 查询", x: 10, y: 48 },
      { id: "vector", kind: "operator", label: "EMBEDDING", value: "问题向量", detail: "语义编码", x: 34, y: 25 },
      { id: "index", kind: "source", label: "VECTOR INDEX", value: "Memory / Knowledge 切片", detail: "各自 scope 内检索", x: 34, y: 72 },
      { id: "topk", kind: "merge", label: "ANN TOP-K", value: "20 个近邻", detail: "按距离排序", x: 66, y: 48 },
      { id: "evidence", kind: "evidence", label: "EVIDENCE", value: "相似片段", detail: "等待答案核对", x: 90, y: 48 },
    ],
    edges: [["query", "vector"], ["index", "topk"], ["vector", "topk"], ["topk", "evidence"]],
  },
  hybrid: {
    focus: "rrf",
    nodes: [
      { id: "query", kind: "query", label: "QUERY", value: "输入法", detail: "问题 + 精确术语", x: 10, y: 48 },
      { id: "bm25", kind: "operator", label: "BM25", value: "关键词召回", detail: "命中基础入口", x: 34, y: 23 },
      { id: "vector", kind: "operator", label: "EMBEDDING", value: "向量召回", detail: "寻找语义近邻", x: 34, y: 73 },
      { id: "rrf", kind: "merge", label: "RRF MERGE", value: "26 个候选", detail: "两路合并去重", x: 66, y: 48 },
      { id: "evidence", kind: "evidence", label: "EVIDENCE", value: "口径 + 数据", detail: "保留来源", x: 90, y: 48 },
    ],
    edges: [["query", "bm25"], ["query", "vector"], ["bm25", "rrf"], ["vector", "rrf"], ["rrf", "evidence"]],
  },
  rerank: {
    focus: "reranker",
    nodes: [
      { id: "query", kind: "query", label: "QUERY", value: "输入法", detail: "同一查询做强基线", x: 9, y: 48 },
      { id: "hybrid", kind: "operator", label: "HYBRID", value: "混合召回", detail: "词法 + 向量", x: 30, y: 48 },
      { id: "candidates", kind: "source", label: "CANDIDATES", value: "40 条片段", detail: "冻结配置候选深度", x: 52, y: 23 },
      { id: "reranker", kind: "merge", label: "RERANKER", value: "Cross-encoder", detail: "按回答价值重排", x: 72, y: 48 },
      { id: "evidence", kind: "evidence", label: "TOP EVIDENCE", value: "Top 10", detail: "冻结配置最终深度", x: 91, y: 48 },
    ],
    edges: [["query", "hybrid"], ["hybrid", "candidates"], ["candidates", "reranker"], ["reranker", "evidence"]],
  },
  graphTag: {
    focus: "graph",
    nodes: [
      { id: "query", kind: "query", label: "QUERY", value: "输入法", detail: "真实 fixture 查询", x: 8, y: 48 },
      { id: "lexical", kind: "operator", label: "BM25", value: "输入法基础入口", detail: "直接词法命中", x: 29, y: 22 },
      { id: "dense", kind: "operator", label: "DENSE / TIME", value: "多路候选", detail: "仍负责找全", x: 29, y: 74 },
      { id: "tags", kind: "source", label: "GOVERNED TAGS", value: "输入法 · 候选排序", detail: "398 个 Tag 的治理层", x: 52, y: 22 },
      { id: "graph", kind: "merge", label: "GRAPH PROPAGATION", value: "语义边传播 + 裁剪", detail: "替代模型重排序", x: 68, y: 52 },
      { id: "related", kind: "source", label: "RELATED", value: "候选排序能量传播", detail: "无词面重合的相关项", x: 52, y: 80 },
      { id: "evidence", kind: "evidence", label: "SHORTLIST", value: "2 条直接进入上下文", detail: "不调用 Cross-encoder", x: 91, y: 52 },
    ],
    edges: [["query", "lexical"], ["query", "dense"], ["lexical", "tags"], ["dense", "graph"], ["tags", "graph"], ["related", "graph"], ["graph", "evidence"]],
  },
  agentic: {
    focus: "planner",
    nodes: [
      { id: "query", kind: "query", label: "QUESTION", value: "解释候选排序并给证据", detail: "带交付目标", x: 9, y: 48 },
      { id: "planner", kind: "operator", label: "AGENT PLAN", value: "实现 / 指标 / 边界", detail: "拆解与路由", x: 27, y: 48 },
      { id: "docs", kind: "source", label: "PROJECT DOCS", value: "目标与口径", detail: "项目范围", x: 51, y: 16 },
      { id: "memory", kind: "source", label: "USER MEMORY", value: "获准上下文", detail: "显式授权", x: 51, y: 48 },
      { id: "knowledge", kind: "source", label: "KNOWLEDGE", value: "外部材料", detail: "按需挂载", x: 51, y: 80 },
      { id: "verify", kind: "merge", label: "VERIFY", value: "冲突与缺口", detail: "有界补检", x: 76, y: 48 },
      { id: "receipt", kind: "evidence", label: "RECEIPT", value: "6 条可追溯依据", detail: "真实命中 / AI 估计分开", x: 91, y: 48 },
    ],
    edges: [["query", "planner"], ["planner", "docs"], ["planner", "memory"], ["planner", "knowledge"], ["docs", "verify"], ["memory", "verify"], ["knowledge", "verify"], ["verify", "receipt"]],
  },
} as const;

const agentPatterns = [
  { id: "tree", index: "01", label: "主从树", title: "判断全部挤回主 Agent", detail: "子 Agent 能并行执行，却无法横向补位；计划、上下文和验收最终都堵在一个入口。", metric: "同级通道 0" },
  { id: "swarm", index: "02", label: "全连接蜂群", title: "通信比工作增长得更快", detail: "每个人都能互相 @，但消息、等待和重试很快超过真正写入文件的结果。", metric: "潜在 @ ∞" },
  { id: "peer", index: "03", label: "平等专家组", title: "互补偏见，也可能无限否决", detail: "专家可以相互质疑；没有证据门槛与循环上限时，严谨会变成无法结束的复核。", metric: "审核循环 4+" },
] as const;

const preferenceRecallScenarios = [
  {
    id: "conversation",
    label: "对话中召回",
    timing: "CURRENT TURN",
    trigger: "当前输入 + 窗口语义",
    fragment: "“把这段周报改得更像我平时的表达，但不要改动指标口径。”",
    matches: ["结论先行，不写寒暄铺垫", "中文正文保留必要的英文技术名"],
    excluded: "上海门店数据仍待核对 · 属于任务状态，不作为偏好注入",
    receipt: "2 条获准偏好 → 仅作用于本轮回答",
  },
  {
    id: "compact",
    label: "Compact 后召回",
    timing: "POST-COMPACT",
    trigger: "压缩片段 #C-018",
    fragment: "“Room 已改为普通 Pi Session 的组合；下一轮继续验证 Partner 取消与唯一 final。”",
    matches: ["机械状态由 Runtime 证明", "架构说明要区分当前 owner 与历史实现"],
    excluded: "早先输入法候选质量实验 · 与当前 Room 验证无关，不重新塞回上下文",
    receipt: "压缩片段定向检索 → 不回灌整段 transcript",
  },
] as const;

function SourcedAgentProblem({
  index,
  title,
  body,
  sources,
}: {
  index: string;
  title: string;
  body: string;
  sources: readonly { label: string; href: string }[];
}) {
  return (
    <aside className="sourced-agent-problem">
      <span>{index} · INDUSTRY PROBLEM</span>
      <div><CircleAlert size={22}/><h2>{title}</h2></div>
      <p>{body}</p>
      <footer>
        <small>问题来源，不是展示页自拟结论</small>
        {sources.map((source) => <a href={source.href} key={source.href} rel="noreferrer" target="_blank">{source.label}<SquareArrowOutUpRight size={12}/></a>)}
      </footer>
    </aside>
  );
}

function ImeEvidenceDiagram({
  alt,
  body,
  height,
  sourceHref,
  sourceLabel,
  src,
  title,
  width,
}: {
  alt: string;
  body: string;
  height: number;
  sourceHref: string;
  sourceLabel: string;
  src: string;
  title: string;
  width: number;
}) {
  return (
    <figure className="ime-evidence-diagram">
      <div className="ime-evidence-diagram-media" style={{ aspectRatio: `${width} / ${height}` }}>
        <AgentScreenshot alt={alt} caption={`${title}。${body}`} height={height} src={src} width={width}/>
      </div>
      <figcaption>
        <div><strong>{title}</strong><p>{body}</p></div>
        <a href={sourceHref} rel="noreferrer" target="_blank">{sourceLabel}<SquareArrowOutUpRight size={12}/></a>
      </figcaption>
    </figure>
  );
}

const imeModelSelectionRows = [
  ["MiniMind-IME Daily Long 0.1B", "100.69M", "192.05 MiB", "11% / 17%", "50%", "837.75 ms", "入选：顺着前缀续写完整句子"],
  ["Qwen3-0.6B base zero-shot", "596.05M", "1,136.88 MiB", "0% / 0%", "14%", "3,154.89 ms", "更容易把前缀当成待回答的问题"],
  ["Qwen3-4B base zero-shot", "4.02B", "7,672.25 MiB", "0% / 0%", "17%", "3,693.13 ms", "通用能力更强，但未适配输入法续写"],
] as const;

const imeScaleExperimentRows = [
  ["0.06B · 8 层", "63.91M", "历史低延迟基线", "首 token p95 8.25 ms", "语境质量不足，继续扩展到 0.1B"],
  ["0.1B · 14 层", "100.69M", "当前发布主线", "Daily Long Top-3 exact 15.02%", "完成训练与导出；取得质量、体积与延迟的当前平衡"],
  ["0.214B · 32 层 Block AttnRes", "214.06M", "质量候选，未发布", "24-token Top-3 exact 44%", "三候选互异仅 13%，p95 约 4 秒，未过端侧门禁"],
] as const;

const imeTrainingDataRows = [
  ["基础中文预训练", "646,166,886 presented tokens", "补足中文语法、语义与领域覆盖"],
  ["九阶段 Completion SFT", "99,990 行", "把基础语言模型改成短前缀续写模型"],
  ["DeepSeek Daily", "26,939 / 1,537 / 1,524", "用户归因；包内无独立 provider 元数据"],
  ["Claude Daily", "1,333 / 167 / 167", "审核后的日常 Completion SFT"],
  ["Gemini Daily focus", "1,000 / 200 / 200", "精选 Daily Completion SFT"],
  ["GPT-5.5 Pro Teacher", "50,894 条", "已进入 parent 的 sequence-level distillation"],
  ["DS validation / test", "1,179 / 1,132 unique prefixes", "当前 Daily Long checkpoint 与发布评测合同"],
] as const;

const imeInferenceExampleGroups = [
  {
    id: "words", label: "短词", note: "4-token 档直接给词或短语，不强行写完整句。",
    rows: [
      ["周末想去", "走走", "走一圈", "公园"],
      ["晚上早点", "出门", "休息", "出去走走"],
      ["到时候再", "确认一次", "发一次", "核对一次"],
      ["文件已经", "发到群", "发出了", "放好了"],
      ["我先去", "洗手间", "洗个澡", "找你"],
      ["这件事先", "处理了", "说清楚背景", "说清楚重点"],
    ],
  },
  {
    id: "short", label: "短上下文", note: "前缀只有 6–12 字，候选需要给出几个合理方向。",
    rows: [
      ["我想提前把周", "末的安排确认一下，我周末只安排一两件主要的事，其他时间看状态再安排。", "末的安排确定下来，我周末只安排一两件主要的事，其他时间看状态再安排。", "末的安排确认一下，我周末只安排一两件主要事情，其他细节会更容易判断。"],
      ["表格里的几个数字需要", "再核对，确认后再对照原始记录检查。", "再核对，我先对照原始记录核一遍。", "再核对，先对照原始记录核一遍。"],
      ["我把这周要办的几件小", "事列出来了，先处理最急的那两项，剩下的以后慢慢办。", "事列出来了，先把最重要的事情做掉，剩下的周末再慢慢安排。", "事列出来了，先处理最急的那两项，剩下的先放到下周。"],
    ],
  },
  {
    id: "medium", label: "中等上下文", note: "13–20 字已经给出局部语义，候选继续补全动作与结果。",
    rows: [
      ["外套袖口有点脏了，那件外套明天还要穿", "，今晚先把袖口洗掉。", "今晚先把袖口单独洗一下。", "今晚先把袖口单独洗一下，这样处理起来会更方便。"],
      ["最近总忘记买洗衣液，我下班", "路上顺便买一瓶新的，省得周末洗衣服时才发现没有。", "路上顺便买一瓶，省得周末洗衣服时才发现没有。", "路上顺便买一瓶新的，省得周末洗衣服时忘记。"],
      ["最近两天总觉得节奏有点乱，先把", "最急的一件单独拿出来，剩下的先放到后面。", "最急的事情做掉，剩下的先放到后面。", "最急的一件单独拿出来，剩下的暂时放后面。"],
    ],
  },
  {
    id: "long", label: "长上下文", note: "人物、动作和约束已经出现，候选不能另起话题。",
    rows: [
      ["我打算下班后顺路去趟打印店，打印店离地铁口不远，我下班路上把需要的", "文件打印好。", "文件打印好，回家以后直接放进材料袋。", "文件打印好，打印完直接放进材料袋。"],
      ["我刚核对了一下订单，有一件商品还没有发出，没发出的那件先问一下客服，", "客服回复后我再决定要不要等。", "客服回复后再决定要不要等。", "客服回复后我会回复。"],
      ["今天事情不算特别多但人有点累，可能只是需要早点休息，今晚先不", "再给自己加任务，休息好以后再看会更清楚。", "再给自己加任务，明天状态好一点再处理。", "再给自己加任务，明天状态好再安排。"],
      ["需要签字的页面单独放在前面，这样对方打开就能直接处理，发送时附上一句简短说明，不用", "再解释每一页。", "再解释每件事。", "再解释每句话。"],
    ],
  },
] as const;

function ImeInferenceEffectShowcase() {
  const [activeId, setActiveId] = useState<(typeof imeInferenceExampleGroups)[number]["id"]>("long");
  const active = imeInferenceExampleGroups.find((group) => group.id === activeId) ?? imeInferenceExampleGroups[0];
  return (
    <section className="ime-effect-showcase" aria-labelledby="ime-effect-title">
      <header><div><h2 id="ime-effect-title">先看它实际会补出什么。</h2><p>下面全部来自 Daily Long v3 的 DS held-out test，没有人工改写；只统一了中英文标点。</p></div><dl><div><dt>发布模型</dt><dd>Daily Long 0.1B</dd></div><div><dt>完整测试</dt><dd>1,132 unique prefixes</dd></div><div><dt>Top-3 exact</dt><dd>15.02%</dd></div><div><dt>非空率</dt><dd>98.94%</dd></div></dl></header>
      <nav aria-label="切换输入长度样例">{imeInferenceExampleGroups.map((group) => <button aria-pressed={group.id === active.id} key={group.id} onClick={() => setActiveId(group.id)} type="button">{group.label}</button>)}</nav>
      <p className="ime-effect-note">{active.note}</p>
      <div className="ime-effect-table" role="table" aria-label={`${active.label}真实 Top-3 候选`}>
        <div className="ime-effect-table-head" role="row"><span role="columnheader">用户已经输入</span><span role="columnheader">Top-1</span><span role="columnheader">Top-2</span><span role="columnheader">Top-3</span></div>
        {active.rows.map(([prefix, first, second, third]) => <div key={prefix} role="row"><strong role="cell">{prefix}<i/></strong><span role="cell">{first}</span><span role="cell">{second}</span><span role="cell">{third}</span></div>)}
      </div>
      <footer><span>8 路独立采样 → 过滤 → 去重 → 原始条件概率排序 → Top-3</span><a href="https://github.com/7155/minimind-ime/blob/main/reports/evaluation/ds_daily_long_v3_release_20260817.md" rel="noreferrer" target="_blank">冻结发布评测<SquareArrowOutUpRight size={12}/></a></footer>
    </section>
  );
}

function ImeTrainingDecisionChart() {
  return (
    <figure className="ime-training-decision-chart" aria-labelledby="ime-training-chart-title">
      <figcaption>
        <strong id="ime-training-chart-title">从基础能力到 Daily Long v3，模型靠独立生成结果晋级。</strong>
        <p>下面只画报告中的真实聚合点：预训练看固定验证 BPB，长补全 checkpoint 看同一份 100 条 DS 多参考生成集，最终再到 1,132 条 held-out release test。</p>
      </figcaption>
      <div className="ime-training-chart-panels">
        <section>
          <header><span>继续预训练</span><strong>验证 BPB</strong></header>
          <svg aria-label="546M 到 646M tokens 的验证 BPB 下降" role="img" viewBox="0 0 360 190">
            <path d="M34 28V154H334" className="ime-chart-axis"/>
            <path d="M54 54L181 93L309 126" className="ime-chart-line"/>
            {[[54,54],[181,93],[309,126]].map(([cx,cy]) => <circle className="ime-chart-point" cx={cx} cy={cy} key={`${cx}-${cy}`} r="5"/>)}
            <text x="54" y="40" textAnchor="middle">0.9612</text><text x="181" y="79" textAnchor="middle">0.9527</text><text x="309" y="112" textAnchor="middle">0.9463</text>
            <text x="54" y="178" textAnchor="middle">546M</text><text x="181" y="178" textAnchor="middle">596M</text><text x="309" y="178" textAnchor="middle">646M</text>
          </svg>
          <p>基础能力仍在改善，随后进入 Completion SFT。</p>
        </section>
        <section>
          <header><span>Daily Long 续训</span><strong>Top-3 精确命中</strong></header>
          <svg aria-label="Daily Long v1 到 v3 的 Top-3 多参考精确命中从 13% 提升到 17%" role="img" viewBox="0 0 360 190">
            <path d="M34 28V154H334" className="ime-chart-axis"/>
            <path d="M70 126L181 92L292 55" className="ime-chart-line ime-chart-line--blue"/>
            <circle className="ime-chart-point ime-chart-point--later" cx="70" cy="126" r="6"/><circle className="ime-chart-point ime-chart-point--later" cx="181" cy="92" r="6"/><circle className="ime-chart-point ime-chart-point--selected" cx="292" cy="55" r="7"/>
            <text x="70" y="111" textAnchor="middle">13%</text><text x="181" y="77" textAnchor="middle">15%</text><text x="292" y="40" textAnchor="middle">17%</text>
            <text x="70" y="178" textAnchor="middle">v1</text><text x="181" y="178" textAnchor="middle">v2</text><text x="292" y="178" textAnchor="middle">v3</text>
          </svg>
          <p><b>v3 入选</b>；再继续重复训练时，候选多样性开始下降。</p>
        </section>
        <section>
          <header><span>冻结发布评测</span><strong>DS held-out · 1,132</strong></header>
          <div className="ime-stage-verdicts">
            <article data-selected="true"><span>模型拟合</span><strong>1.2257</strong><small>NTP loss</small><p>Top-1 / Top-3 token 75.49% / 85.89%</p><b>通过</b></article>
            <article><span>生成结果</span><strong>15.02%</strong><small>Top-3 exact</small><p>非空 98.94% · 三候选全异 83.39%</p><b>发布</b></article>
          </div>
          <p>判决：Token 指标与最终 Top-3 生成质量必须同时成立。</p>
        </section>
      </div>
      <footer>来源：foundation_546m.json · all_provider_training_20260817.md · ds_daily_long_v3_release_20260817.md</footer>
    </figure>
  );
}

function ImeScaleExperimentLedger() {
  return (
    <section className="ime-scale-ledger" aria-labelledby="ime-scale-title">
      <header>
        <div><span>MODEL SCALE HISTORY</span><h2 id="ime-scale-title">三个规模实验，最终只发布一条主线。</h2></div>
        <p>模型规模从 0.06B 扩展到 0.1B，再探索到 0.214B。更深模型提高了严格补全质量，但输入法还要同时守住候选完整性、多样性、显存和一次按键的墙钟延迟。</p>
      </header>
      <div role="table" aria-label="MiniMind-IME 三个训练规模族">
        <div className="ime-scale-ledger-head" role="row"><span role="columnheader">训练规模</span><span role="columnheader">在线参数</span><span role="columnheader">定位</span><span role="columnheader">代表证据</span><span role="columnheader">最终判决</span></div>
        {imeScaleExperimentRows.map(([model, params, role, evidence, verdict], index) => (
          <div data-selected={index === 1 || undefined} key={model} role="row">
            <strong role="cell">{model}</strong><b role="cell">{params}</b><span role="cell">{role}</span><span role="cell">{evidence}</span><p role="cell">{verdict}</p>
          </div>
        ))}
      </div>
      <footer>
        <strong>外部对照</strong>
        <p>Qwen3-0.6B 和 Qwen3-4B 使用官方 base 权重做 zero-shot baseline。214M 的 32 层 Block AttnRes 则保留为自研质量与 Runtime 实验，质量提升没有自动获得发布资格。</p>
      </footer>
    </section>
  );
}

function ImeTrainingTrack() {
  return (
    <section className="ime-detail-track ime-detail-track--training" id="ime-training">
      <header className="ime-track-heading"><div><span>第一部分 · 模型训练</span><h2>先看它能补出什么，再解释为什么要自己训练。</h2></div><p>真实 Top-3 是入口；随后再用同协议对比回答为什么不直接常驻 Qwen。MiniMind-IME 不是追求更强的通用能力，而是从 Tokenizer、结构、数据和训练目标开始适配中文前缀续写。</p></header>

      <ImeInferenceEffectShowcase/>

      <section className="ime-selection-table" aria-labelledby="ime-selection-title">
        <header><h3 id="ime-selection-title">一个发布模型，两条外部基线，锁在同一个 64-token 协议下比较。</h3><p>100 个唯一 DS prefix · BF16 · 裸中文前缀 · 8 路独立采样后过滤、去重并返回 Top-3。</p></header>
        <div role="table" aria-label="输入法模型选型对比">
          <div className="ime-selection-table-head" role="row"><span role="columnheader">模型</span><span role="columnheader">在线参数 / 权重</span><span role="columnheader">Top-1 / Top-3 exact</span><span role="columnheader">首字方向 / Top-3 p95</span><span role="columnheader">判决</span></div>
          {imeModelSelectionRows.map(([model, params, weights, exact, firstChar, latency, verdict], index) => <div data-selected={index === 0 || undefined} key={model} role="row"><strong role="cell">{model}</strong><span role="cell">{params}<small>{weights}</small></span><span role="cell">{exact}</span><b role="cell">{firstChar}<small>{latency}</small></b><p role="cell">{verdict}</p></div>)}
        </div>
        <footer><strong>为什么重训</strong><p>同一 64-token 协议下，两款 Qwen base 的 Top-3 多参考精确命中都是 0%，并且完整 Top-3 p95 超过 3 秒；专项 0.1B 达到 17%，只使用 Qwen3-0.6B 约 16.9% 的参数与 BF16 权重。这里证明的是任务适配，不是通用能力超过 Qwen。</p></footer>
      </section>

      <ImeScaleExperimentLedger/>

      <section className="ime-model-detail" aria-labelledby="ime-model-detail-title">
        <div className="ime-model-narrative">
          <h2 id="ime-model-detail-title">为什么不能直接拿通用聊天模型来补输入法？</h2>
          <p>聊天模型倾向把前缀理解成等待回答的问题；输入法需要顺着用户正在写的句子继续。模型输入因此固定为 <code>[BOS] + 已确认中文前缀</code>，训练只监督 completion 与 EOS。</p>
          <blockquote>一个中文前缀生成 8 路独立候选，不能把一段长输出按逗号切成三条假候选。</blockquote>
        </div>
        <dl className="ime-model-spec">
          <div><dt>Tokenizer</dt><dd>16,384 词表 · SentencePiece Unigram · NFKC · byte fallback</dd></div>
          <div><dt>Decoder</dt><dd>14 层 · 768 hidden · 2048 FFN · 12 Q / 4 KV heads</dd></div>
          <div><dt>Training</dt><dd>646,166,886 presented tokens · 九阶段 Completion SFT</dd></div>
          <div><dt>Loss mask</dt><dd>Prefix labels = -100，只对 completion 与 EOS 反向传播</dd></div>
          <div><dt>Deploy</dt><dd>100.69M 在线参数 · BF16 192.05 MiB · MTP 部署时移除</dd></div>
        </dl>
      </section>

      <section className="ime-training-data" aria-labelledby="ime-training-data-title">
        <header><h2 id="ime-training-data-title">训练数据不是一个总数，而是七份用途不同的资产。</h2><p>预训练、Completion SFT、Teacher、专项数据与冻结 Eval 分开记账；来源、去重、split 和能否进入训练都有独立边界。</p></header>
        <div role="table" aria-label="MiniMind-IME 训练数据资产">
          {imeTrainingDataRows.map(([name, size, purpose]) => <div key={name} role="row"><strong role="cell">{name}</strong><b role="cell">{size}</b><p role="cell">{purpose}</p></div>)}
        </div>
        <footer>不同 Provider 的数据按来源和训练目标分开记账；DeepSeek 数据仅有用户归因，包内没有独立 Provider 元数据。跨来源重复前缀只保留一个监督目标，冻结评测统一标记为 train_eligible=false。</footer>
      </section>

      <div className="ime-model-diagrams">
        <ImeEvidenceDiagram alt="MiniMind-IME 从原始语料、清洗、预训练、Completion SFT 到冻结评测的数据流程" body="646M presented tokens、99,990 行 Completion SFT、Teacher 与 Frozen Eval 各有独立合同；未过质量门的分支不会覆盖发布模型。" height={650} sourceHref="https://github.com/7155/minimind-ime/blob/main/images/ime_training_pipeline_20260814.svg" sourceLabel="训练管线来源" src="/evidence/minimind-ime/training-pipeline.svg" title="数据怎样进入训练，又怎样被挡在评测集之外" width={1800}/>
      </div>
      <ImeTrainingDecisionChart/>
    </section>
  );
}

function ImeInferenceTrack() {
  return (
    <section className="ime-detail-track ime-detail-track--inference" id="ime-inference">
      <header className="ime-track-heading"><div><span>第二部分 · 推理 Runtime</span><h2>模型缩小以后，还要让一次按键真正来得及返回三条候选。</h2></div><p>输入法关心的不是服务能吞多少并发请求，而是本地单用户的一次按键能否快速、完整、稳定地得到 Top-3；新按键到来时，旧结果还必须立即失效。</p></header>

      <section className="ime-project-system" aria-labelledby="ime-project-system-title">
        <header><h2 id="ime-project-system-title">训练仓库与推理仓库，共同组成一条输入链。</h2><p>MiniMind-IME 决定模型学什么；AIOS-IME 接管 Prefix KV、候选组调度、取消、过滤、去重与排序。只训练小模型，不重做 Runtime，仍达不到输入法交互要求。</p></header>
        <div className="ime-integration-contract"><span><strong>MiniMind-IME export</strong><code>model.pt + tokenizer + config</code></span><ArrowRight aria-hidden="true" size={18}/><span><strong>AIOS model adapter</strong><code>python/aios/models/minimind_ime.py</code></span><ArrowRight aria-hidden="true" size={18}/><span><strong>IME runtime</strong><code>python/aios/ime.py</code></span></div>
      </section>

      <section className="ime-runtime-detail" aria-labelledby="ime-runtime-title">
        <header><h2 id="ime-runtime-title">一次按键，不是一次普通文本生成。</h2><p>同一个中文前缀只 Prefill 一次，8 路候选共享 Prefix KV；Ragged Decode 只推进仍活跃的行，新按键以 latest-wins 取消旧代际。</p></header>
        <div className="ime-runtime-diagrams">
          <ImeEvidenceDiagram alt="AIOS-IME 从中文前缀、分词、一次 Prefix Prefill、CandidateGroup 到候选栏的完整流程图" body="同一中文前缀只做一次 Prefill，候选组内部并行解码，最后统一过滤、去重和选 Top-3。" height={560} sourceHref="https://github.com/7155/aios/blob/main/docs/images/aios-ime-runtime-architecture.svg" sourceLabel="AIOS 图源" src="/evidence/aios-ime/runtime-architecture.svg" title="一个按键的完整运行路径" width={1400}/>
          <ImeEvidenceDiagram alt="AIOS-IME 在相邻按键间按 token-LCP 复用 Prefix KV 并以 latest-wins 取消旧候选组" body="Tokenizer 可能重切尾部，所以按稳定 token page 复用；新按键在 token-step 边界接管旧 generation。" height={760} sourceHref="https://github.com/7155/aios/blob/main/docs/images/aios-ime-prefix-kv.svg" sourceLabel="AIOS 图源" src="/evidence/aios-ime/prefix-kv.svg" title="跨按键 KV 复用与 latest-wins" width={1400}/>
        </div>
        <ol className="ime-runtime-pipeline">{imeRuntimeSteps.map(([index, title, body]) => <li key={index}><span>{index}</span><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol>
        <div className="ime-candidate-example"><div><span>真实模型输出样例</span><p>没关系，你先忙你的，<i aria-hidden="true"/></p><small>输入固定为 [BOS] + 裸中文前缀，不套 Chat Template。</small></div><ol><li><b>Top 1</b><span>我晚点给你一个明确答复。</span></li><li><b>Top 2</b><span>我晚点给你发消息。</span></li><li><b>Top 3</b><span>我晚一点给你一个明确答复。</span></li></ol><footer>候选来自 AIOS-IME README 的公开样例；没有人工润色输出。</footer></div>
      </section>

      <section className="ime-evidence" aria-labelledby="ime-evidence-title">
        <header><h2 id="ime-evidence-title">既看候选效果，也看用户真正等待了多久。</h2><p>质量、首 token、候选摊销和完整 Top-3 是四种不同口径。任何局部 9 ms 结果都不能冒充一次按键的完整等待时间。</p></header>
        <div className="ime-evidence-grid">
          <article><header><h3>Daily Long v3 发布效果</h3><span>DS held-out · 1,132 unique prefixes</span></header><table aria-label="MiniMind-IME Daily Long 发布效果"><tbody><tr><th>NTP loss</th><td>1.2257</td><td>唯一 prefix test</td></tr><tr><th>Token Top-1 / Top-3</th><td>75.49% / 85.89%</td><td>同一 DS test</td></tr><tr><th>Top-3 多参考 exact</th><td>15.02%</td><td>64-token generation</td></tr><tr><th>非空 / 三候选全异</th><td>98.94% / 83.39%</td><td>8 路采样后</td></tr></tbody></table><p>Token 命中、完整续写命中和候选结构回答不同问题，不合成一个“准确率”。</p></article>
          <article><header><h3>模型基线与 AIOS Runtime</h3><span>不同长度协议并列，不混用</span></header><table aria-label="MiniMind-IME 与 AIOS 推理口径"><tbody><tr><th>Daily Long 完整 Top-3</th><td>379.44 / 728.86 ms</td><td>p50 / p95 · 1,132 条 · 64 token</td></tr><tr><th>AIOS 首步微基准</th><td>7.58 / 8.26 ms</td><td>Prefix Prefill + 8 路首 token</td></tr><tr><th>AIOS 完整 Top-3</th><td>81.98 / 109.97 ms</td><td>p50 / p95 · 30 条短候选</td></tr><tr><th>0.1B / Qwen3-0.6B</th><td>83.24 / 170.85 ms</td><td>同协议 Top-3 p50 · 约 2.05×</td></tr></tbody></table><p>9 ms 只属于首步微基准；81.98 / 109.97 ms 才是 AIOS 短候选的完整用户等待时间。Daily Long 64-token 仍保留自己的发布口径。</p></article>
        </div>
        <div className="ime-runtime-proof"><span><TestTube2 size={17}/><strong>当前证明边界</strong></span><b>QUALITY + LATENCY</b><p>Daily Long 证明 64-token 长补全质量与基线；AIOS 的 109.97 ms 是历史短候选 Runtime。二者已经共享模型架构与接口，但还缺 Daily Long v3 在 AIOS 上的同协议 64-token 正式基准。</p></div>
      </section>
    </section>
  );
}

function MemoryDataStory() {
  return (
    <section className="memory-data-story" aria-labelledby="memory-data-story-title">
      <header>
        <span>REAL DATA CONTRACT · 2026-08-28 SNAPSHOT</span>
        <h2 id="memory-data-story-title">24,483 次输入，<br/>不等于 24,483 条记忆。</h2>
        <p>输入法先保存可追溯的完整输入事件；治理层再决定什么能成为偏好。原句、场景、反馈和最终召回各有自己的 owner，不能把一张“Memory”界面当成全部逻辑。</p>
      </header>

      <div className="memory-data-chain">
        <article data-stage="capture">
          <div className="memory-data-index"><b>01</b><span>CAPTURE</span></div>
          <h3><em>24,483</em> 条完整输入事件</h3>
          <p>只有满足 strong-final 边界的提交才创建事件；弱捕获不能写入。</p>
          <ul className="memory-data-fields">
            <li><b>写了什么</b><span>committed_text · recent_context · preedit</span></li>
            <li><b>在哪里写</b><span>source · app · project · context group</span></li>
            <li><b>候选证据</b><span>rank · provider · tags · schema</span></li>
            <li><b>后来怎样</b><span>accepted · skipped · pinned · downranked · deleted</span></li>
          </ul>
          <small><ShieldCheck size={13}/>公开页只展示聚合和治理后的例子，不复制原始输入。</small>
        </article>

        <div className="memory-chain-arrow" aria-hidden="true"><ArrowRight size={20}/></div>

        <article data-stage="govern">
          <div className="memory-data-index"><b>02</b><span>GOVERN</span></div>
          <h3>输入记录经过<span>去重、来源与权限治理</span></h3>
          <p>15,219 条记忆项继续收敛为 566 个 Atom、108 本 Book 与 398 个 Tag；它们保留来源、scope、状态与修订关系。</p>
          <blockquote>
            <small>真实清洗 Atom</small>
            <p>“网页只需更新，不必每次重写全部内容。”</p>
            <footer><span>#局部修改</span><span>#保留已有</span><b>quality .92</b></footer>
          </blockquote>
        </article>

        <div className="memory-chain-arrow" aria-hidden="true"><ArrowRight size={20}/></div>

        <article data-stage="recall">
          <div className="memory-data-index"><b>03</b><span>RECALL</span></div>
          <h3>只为当前回合组装<span>最小相关上下文</span></h3>
          <p>当前 Query 与 compact 摘要按 0.8 / 0.2 融合；Memory、Project Docs 与 Knowledge 仍保持各自权限。</p>
          <div className="memory-recall-example">
            <span><small>CURRENT QUERY</small><b>继续优化第二章，其他页面保留。</b></span>
            <ArrowDown size={15}/>
            <span><small>MEMORY HIT</small><b>局部修改，不重写全部内容。</b></span>
            <span><small>COMPACT RECOVERY</small><b>第二章必须使用真实 PAWOS 前端。</b></span>
          </div>
        </article>
      </div>

      <div className="memory-eval-receipt">
        <header><TestTube2 size={18}/><span><b>同一条链，用 Eval 判断“留下的东西是否真的有用”</b><small>新鲜本机门禁与冻结公开分数分开</small></span></header>
        <div>
          <article data-result="pass"><span>FRESH · 48 CASES</span><strong>48 / 48</strong><b>Memory optimizer</b><small>端到端 p95 117 ms · optimizer-only p95 0.517 ms</small></article>
          <article data-result="pass"><span>6-CASE MICRO EVAL</span><strong>4 → 6</strong><b>有用命中</b><small>compact recovery 0 → 2 · 无关注入 2 → 0</small></article>
          <article data-result="fail"><span>FROZEN · 82 CASES</span><strong>.056</strong><b>Abstention F1</b><small>拒答仍很差；Recall@3 / @5 同时回退，不能报喜不报忧</small></article>
          <article data-result="fail"><span>FRESH · COMBINED GATE</span><strong>1 FAIL</strong><b>App-scope phrase</b><small>缺少“文本编辑快捷短语”；Trace 已形成下一轮修复入口</small></article>
        </div>
      </div>
    </section>
  );
}

function GraphTagRerankStory() {
  return (
    <section className="graph-tag-story" aria-labelledby="graph-tag-story-title">
      <header>
        <span>RETRIEVAL ARCHITECTURE · CURRENT TARGET</span>
        <h2 id="graph-tag-story-title">Graph + Tag 替代的是重排序，<br/>不是检索。</h2>
        <p>BM25、Dense 与时间召回仍负责找到基础候选；Graph + Tag 用受治理关系补回词面没有命中的关联结果，再按 scope 与 Tag 约束裁剪 shortlist。前者改善召回，后者减少送入上下文的候选与延迟，目标是拿掉每次都要运行一次模型的 reranker。</p>
      </header>

      <div className="rerank-comparison">
        <article data-path="baseline">
          <header><span>当前质量强基线</span><b>MODEL RERANK</b></header>
          <div className="retrieval-path">
            <span><small>RETRIEVE</small><strong>BM25 + Dense</strong></span><ArrowRight size={17}/>
            <span><small>CANDIDATES</small><strong>Top 40</strong></span><ArrowRight size={17}/>
            <span data-expensive="true"><small>QWEN3</small><strong>Cross-encoder</strong></span><ArrowRight size={17}/>
            <span><small>CONTEXT</small><strong>Top 10</strong></span>
          </div>
          <footer><b>Recall@10 .244 → .989</b><span>MRR .250 → .922 · 冻结 60-case · Graph OFF</span></footer>
        </article>

        <article data-path="target">
          <header><span>PAW 目标路径</span><b>NO MODEL RERANK</b></header>
          <div className="retrieval-path">
            <span><small>RETRIEVE</small><strong>BM25 + Dense + Time</strong></span><ArrowRight size={17}/>
            <span><small>RELATION</small><strong>398 Tags</strong></span><ArrowRight size={17}/>
            <span data-graph="true"><small>GRAPH</small><strong>传播 + 裁剪</strong></span><ArrowRight size={17}/>
            <span><small>CONTEXT</small><strong>Shortlist</strong></span>
          </div>
          <footer><b>语义边用例 3 / 3</b><span>optimizer-only p95 .517 ms · 同集质量 / 速度 A/B 待补</span></footer>
        </article>
      </div>

      <div className="graph-tag-case">
        <div><small>真实 fixture 查询</small><strong>输入法</strong></div>
        <ArrowRight size={17}/>
        <div><small>词法直接命中</small><strong>输入法基础入口</strong></div>
        <ArrowRight size={17}/>
        <div><small>受治理语义边扩展</small><strong>候选排序能量传播</strong></div>
        <aside><CircleAlert size={16}/><span><b>证据边界</b>当前 hybrid fixture 的 vectorTagBoostWinRate 仍为 0.0；这证明路径能工作，不证明它已经优于 reranker。</span></aside>
      </div>
    </section>
  );
}

function PreferenceMemoryLoop() {
  const recall = useLoop(preferenceRecallScenarios.length, 5_200, false);
  const setRecallPlaying = recall.setPlaying;
  const active = preferenceRecallScenarios[recall.step] ?? preferenceRecallScenarios[0];
  const surfaceRef = useRef<HTMLElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const node = surfaceRef.current;
    if (!node || startedRef.current) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      if (!media.matches) setRecallPlaying(true);
    };

    if (!("IntersectionObserver" in window)) {
      start();
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        start();
        observer.disconnect();
      }
    }, { threshold: 0.28 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [setRecallPlaying]);

  return (
    <section className="preference-memory-loop" data-mode={active.id} ref={surfaceRef}>
      <header>
        <div><Brain size={22}/><span><b>PREFERENCE MEMORY · NOT TASK STATE</b><h2>让人的品味成为所有 Agent 的倍增器。</h2><p>中央只强制隐私、正确性与可重复性；窗口里的 Agent 在边界内自由决定解法和表达。</p></span></div>
        <nav aria-label="切换偏好记忆召回时机">
          {preferenceRecallScenarios.map((scenario, index) => (
            <button
              aria-pressed={recall.step === index}
              key={scenario.id}
              onClick={() => { recall.setStep(index); recall.setPlaying(false); }}
              type="button"
            >
              <small>{scenario.timing}</small><strong>{scenario.label}</strong>
            </button>
          ))}
        </nav>
      </header>

      <div className="preference-recall-stage" key={active.id}>
        <article className="preference-recall-trace">
          <span><b>{active.timing}</b><small>{active.trigger}</small></span>
          <blockquote>{active.fragment}</blockquote>
          <ol aria-label="偏好记忆召回边界">
            <li><i>01</i><span><small>授权</small><strong>Memory Tool 已获本轮权限</strong></span></li>
            <li><i>02</i><span><small>相关召回</small><strong>只匹配表达品味</strong></span></li>
            <li><i>03</i><span><small>有界注入</small><strong>{active.receipt}</strong></span></li>
          </ol>
          <div className="preference-memory-hits">
            {active.matches.map((match) => <span key={match}><Check size={14}/><strong>{match}</strong></span>)}
            <p><CircleAlert size={14}/><span><b>明确排除</b>{active.excluded}</span></p>
          </div>
        </article>

        <aside className="preference-boundary-map">
          <section><ShieldCheck size={18}/><span><b>CENTRAL · MUST ENFORCE</b><strong>隐私 · 正确性 · 来源 · 可重复</strong><small>所有 Agent 都不能绕过的系统边界</small></span></section>
          <ArrowDown size={17}/>
          <section><Sparkles size={18}/><span><b>LOCAL · AUTONOMY</b><strong>结构 · 文案 · 实现路径</strong><small>在边界内允许不同 Agent 自主表达解法</small></span></section>
        </aside>
      </div>

      <div className="taste-feedback-loop">
        <header><GitBranch size={18}/><span><b>HUMAN TASTE FEEDBACK LOOP</b><strong>人的反馈怎样变成下次默认做对</strong></span></header>
        <div>
          <span><small>输入信号</small><strong>审查评论<br/>重构 PR<br/>用户 Bug</strong></span>
          <ArrowRight size={18}/>
          <span><small>先写清</small><strong>文档规则<br/>边界与例子</strong></span>
          <ArrowRight size={18}/>
          <span><small>文档不够时</small><strong>编码进工具<br/>检查与模板</strong></span>
          <ArrowRight size={18}/>
          <span><small>立即复用</small><strong>所有后续<br/>Agent 运行</strong></span>
        </div>
        <p>不要求生成代码模仿人的表面风格。<strong>正确、可维护，并让未来 Agent 清晰可读，就是达标。</strong></p>
      </div>
    </section>
  );
}

function AgentPatternDiagram({ type }: { type: (typeof agentPatterns)[number]["id"] }) {
  const nodeCount = type === "peer" ? 4 : 5;
  return (
    <div className="agent-pattern-diagram" data-type={type} aria-hidden="true">
      {Array.from({ length: nodeCount }, (_, index) => <i key={index} />)}
    </div>
  );
}

function ContextGovernanceGrid() {
  return (
    <section className="context-governance-grid" aria-label="三种上下文的治理边界">
      {governedContextSources.map((source) => (
        <article key={source.id}>
          <header><source.icon size={18}/><span><b>{source.state}</b><strong>{source.displayLabel} · {source.title}</strong><small>{source.flow}</small></span></header>
          <p>{source.detail}</p>
          <dl>
            <div><dt>调用条件</dt><dd>{source.access}</dd></div>
            <div><dt>召回时机</dt><dd>{source.trigger}</dd></div>
            <div><dt>权威载体</dt><dd>{source.persistence}</dd></div>
          </dl>
        </article>
      ))}
    </section>
  );
}

function MemoryGovernanceDetail() {
  const timeline = useLoop(memoryTimelineEntries.length, 2400);
  const activeEntry = memoryTimelineEntries[timeline.step] ?? memoryTimelineEntries[0];

  return (
    <section className="memory-governance-detail" aria-label="已清洗的记忆治理样例">
      <header className="memory-snapshot-strip" aria-label="2026-08-28 聚合快照，非实时计数">
        <span><b>24,483</b> 输入事件</span><ArrowRight size={13}/>
        <span><b>15,219</b> 记忆项</span><ArrowRight size={13}/>
        <span><b>566</b> Atom · <b>108</b> Book · <b>398</b> Tag</span>
        <small>64 个活跃日 · 30 个应用 · 快照非实时计数</small>
      </header>
      <div className="memory-observatory-body">
        <div className="memory-day-stream">
          <header><span><History size={14}/> 已清洗的治理样例</span><small>不展示原始个人 transcript</small></header>
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
            <span>SANITIZED GOVERNED ATOM · 清洗后的治理记忆</span>
            <blockquote>“{activeEntry.text}”</blockquote>
            <div><small>发生位置</small><strong>{activeEntry.context}</strong></div>
            <div><small>整理结果</small><strong>{activeEntry.outcome}</strong></div>
          </article>
        </div>

        <aside className="memory-context-cabinet">
          <header><span><Layers3 size={14}/> 这次可以取用的上下文</span><small>按问题临时组装</small></header>
          <article><BookOpen size={15}/><span><b>表达偏好</b><strong>解释先给结论，再补必要原因</strong><small>治理 Atom · quality 0.99</small></span></article>
          <article><FileText size={15}/><span><b>项目规则</b><strong>网页局部更新，保留其余内容</strong><small>本轮按任务范围取用</small></span></article>
          <article><History size={15}/><span><b>Compact 片段</b><strong>只召回与当前章节相关的偏好</strong><small>不回灌完整对话</small></span></article>
          <article><Brain size={15}/><span><b>隐私边界</b><strong>候选内容先脱敏，再进入展示</strong><small>可隐藏、修订与删除</small></span></article>
        </aside>
      </div>
    </section>
  );
}

function RagLabDetail() {
  const retrieval = useLoop(ragModes.length, 3600);
  const [activeRagNodeId, setActiveRagNodeId] = useState<string>(ragRelationshipGraphs.embedding.focus);
  const activeMode = ragModes[retrieval.step] ?? ragModes[0];
  const activeRagGraph = ragRelationshipGraphs[activeMode.id];
  const activeRagNode = activeRagGraph.nodes.find((node) => node.id === activeRagNodeId) ?? activeRagGraph.nodes[0];

  return (
    <section aria-labelledby="rag-evolution-lab-title" className="rag-evolution-lab" data-active="true">
      <header>
        <div><Search size={17}/><span><h2 id="rag-evolution-lab-title">Retrieval Evolution Lab</h2><small>同一个问题，观察检索能力如何升级</small></span></div>
        <p>检索执行指标与 AI 归纳分栏展示</p>
      </header>
      <div className="rag-query"><span>QUESTION</span><p>“怎样从‘输入法’找到没有词面重合的‘候选排序能量传播’，同时不调用模型 reranker？”</p></div>
      <nav aria-label="切换 RAG 策略">
        {ragModes.map((mode, index) => (
          <button aria-pressed={retrieval.step === index} key={mode.id} onClick={() => { retrieval.setStep(index); retrieval.setPlaying(false); setActiveRagNodeId(ragRelationshipGraphs[mode.id].focus); }} type="button"><b>{String(index + 1).padStart(2, "0")}</b><span>{mode.label}</span></button>
        ))}
      </nav>
      <div className="rag-mode-stage">
        <section className="rag-relationship-panel">
          <header><span><b>ACTIVE RELATION GRAPH</b><h3>{activeMode.title}</h3></span><p>{activeMode.summary}</p></header>
          <div className="rag-relationship-graph" aria-label={`${activeMode.label} 检索关系图`}>
            <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
              {activeRagGraph.edges.map(([from, to]) => {
                const source = activeRagGraph.nodes.find((node) => node.id === from);
                const target = activeRagGraph.nodes.find((node) => node.id === to);
                return source && target ? <line key={`${from}-${to}`} x1={source.x} x2={target.x} y1={source.y} y2={target.y}/> : null;
              })}
            </svg>
            {activeRagGraph.nodes.map((node, index) => (
              <button
                aria-pressed={activeRagNode.id === node.id}
                data-kind={node.kind}
                key={node.id}
                onClick={() => setActiveRagNodeId(node.id)}
                style={{ left: `${node.x}%`, top: `${node.y}%`, "--rag-node-order": index } as React.CSSProperties}
                type="button"
              >
                <small>{node.label}</small><strong>{node.value}</strong><span>{node.detail}</span>
              </button>
            ))}
          </div>
        </section>
        <aside aria-label="当前检索执行回执">
          <div><span>检索执行回执 · 合成</span><strong>{activeMode.metric}</strong></div>
          <section className="rag-node-inspector"><small>SELECTED NODE</small><strong>{activeRagNode.label}</strong><p>{activeRagNode.value} · {activeRagNode.detail}</p></section>
          {activeMode.hits.map((hit) => <p key={hit}><Check size={12}/>{hit}</p>)}
          <footer><CircleAlert size={13}/><span><b>能力边界</b>{activeMode.boundary}</span></footer>
        </aside>
      </div>
      <section className="rag-trace-eval" aria-label="RAG Trace 与评测边界">
        <header><div><GitBranch size={15}/><span><strong>Trace / Eval · 同一次检索如何被检查</strong><small>公开合成 trace · 24 条人工相关性标注查询</small></span></div><b>FOUNDATION IN PROGRESS</b></header>
        <div className="rag-trace-pipeline">
          {[
            ["01", "QUERY", "输入法"],
            ["02", "RETRIEVE", "BM25 + Dense + Time"],
            ["03", "PRUNE", "Graph + Tag shortlist"],
            ["04", "TRACE", "candidate ids + latency"],
            ["05", "EVAL", "quality + scope + speed"],
          ].map(([index, label, value]) => <span key={index}><i>{index}</i><b>{label}</b><strong>{value}</strong></span>)}
        </div>
        <div className="rag-eval-metrics">
          <article data-kind="measured"><span>FROZEN · 60 CASES</span><strong>.989</strong><b>Knowledge Recall@10</b><small>Hybrid + Qwen3 rerank；Graph 关闭</small></article>
          <article data-kind="measured"><span>FROZEN · 60 CASES</span><strong>.922</strong><b>Knowledge MRR</b><small>项目派生 qrels，不是 CRUD-RAG 官方榜分</small></article>
          <article data-kind="measured"><span>FRESH · 48 CASES</span><strong>.517 ms</strong><b>Optimizer p95</b><small>Graph + Tag 用例包含在确定性门禁中</small></article>
          <article data-kind="estimated"><span>OPEN EVAL GAP</span><strong>0.0</strong><b>Vector / Tag boost win rate</b><small>当前 fixture 没证明胜率；禁止写成已优于 rerank</small></article>
          <aside><Sparkles size={16}/><span><b>下一次 Trace / Eval</b><strong>固定同一 qrels，对比 reranker ON 与 Graph + Tag shortlist：Recall@K、MRR、p50 / p95、成本与 scope leak。</strong><small>只有达到质量门槛并降低延迟，才允许把“替代重排序”从目标改成结果。</small></span></aside>
        </div>
      </section>
      <PlaybackControls playing={retrieval.playing} onRestart={retrieval.restart} onToggle={() => retrieval.setPlaying(!retrieval.playing)} />
    </section>
  );
}

function AgentScreenshot({
  alt,
  caption,
  eager = false,
  height,
  previewSrc,
  src,
  width,
}: {
  alt: string;
  caption: string;
  eager?: boolean;
  height: number;
  previewSrc?: string;
  src: string;
  width: number;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fullImageLoaded, setFullImageLoaded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button aria-haspopup="dialog" className="agent-screenshot-trigger" onClick={() => { setZoom(1); setFullImageLoaded(false); setOpen(true); }} type="button">
        {/* The supplied screenshots are bounded public showcase assets. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={alt} decoding="async" fetchPriority={eager ? "high" : "auto"} height={height} loading={eager ? "eager" : "lazy"} src={previewSrc ?? src} width={width}/>
        <span><Search size={13}/>在页面内放大</span>
      </button>
      <dialog
        aria-label={caption}
        className="agent-screenshot-dialog"
        onCancel={(event) => { event.preventDefault(); setOpen(false); }}
        onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        onClose={() => setOpen(false)}
        ref={dialogRef}
      >
        <header className="agent-screenshot-dialog-bar">
          <p>{caption}</p>
          <div>
            <button aria-label="缩小图片" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - 0.5))} type="button"><ZoomOut size={18}/></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button aria-label="放大图片" disabled={zoom >= 3} onClick={() => setZoom((value) => Math.min(3, value + 0.5))} type="button"><ZoomIn size={18}/></button>
            <button aria-label="适合屏幕" onClick={() => setZoom(1)} type="button"><Maximize2 size={17}/></button>
            <button aria-label="关闭大图" onClick={() => setOpen(false)} type="button"><X size={19}/></button>
          </div>
        </header>
        <div className="agent-screenshot-viewport" data-full-loaded={fullImageLoaded || undefined}>
          {open ? <>
            {previewSrc ? <>
              {/* The already-rendered preview prevents an empty black viewer while the original asset decodes. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" aria-hidden="true" className="agent-screenshot-placeholder" height={height} src={previewSrc} width={width}/>
            </> : null}
            {/* The original-pixel asset is requested only after the viewer opens. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={alt} className="agent-screenshot-original" decoding="async" fetchPriority="high" height={height} onDoubleClick={() => setZoom((value) => value === 1 ? 2 : 1)} onLoad={() => setFullImageLoaded(true)} src={src} style={{ width: `${zoom * 100}%` }} width={width}/>
            {!fullImageLoaded ? <span className="agent-screenshot-loading" role="status">正在读取原尺寸 · {width} × {height}</span> : null}
          </> : null}
        </div>
      </dialog>
    </>
  );
}

function AgentWorksiteIntro() {
  return (
    <figure className="agent-worksite-intro">
      <div>
        <AgentScreenshot
          alt="同一台 Mac 上多个 Codex 项目 Session 与后台任务同时运行"
          caption="旗舰 Harness 的真实多 Agent 工作现场：多个 Codex Session 同时执行，但跨窗口路由和结果收口仍由用户承担。"
          eager
          height={2162}
          previewSrc="/paw-agent-worksite-preview.webp"
          src="/paw-agent-worksite.webp"
          width={3900}
        />
      </div>
      <figcaption>
        <strong>这不是 PAW 的效果图，而是旗舰 Harness 多 Agent 的问题现场。</strong>
        <p>多个 Codex Session 已经能分别读代码、调用工具、修改不同方向，但 Harness 没有真正接管跨 Session 路由。用户仍要复制需求、转发结果、追问状态并判断谁真的完成，人被迫成了协作中转站。</p>
        <ul>
          <li>需求和上下文由人手动送到另一个窗口。</li>
          <li>子 Agent 启动后，层级、消耗和停止点难以统一控制。</li>
          <li>结果仍由人逐个收集，再判断能否对外宣布完成。</li>
        </ul>
        <small>用户提供的真实 Codex / Harness 工作现场 · 页面保留原始像素尺寸并使用高质量 WebP</small>
      </figcaption>
    </figure>
  );
}

function AgentScaleEvidence() {
  return (
    <section className="agent-scale-evidence" aria-labelledby="agent-scale-title">
      <header>
        <h2 id="agent-scale-title">旗舰 Harness 的能力已经很强，但多 Agent 仍然不好用。</h2>
        <p>问题不是“能不能再启动一个 Agent”。在这个项目实战里，多段长期 Session 和大量子 Agent 都已经存在，真正缺的是跨窗口的目标、依赖、进度、冲突和最终责任如何被统一看见。</p>
      </header>
      <div>
        <figure>
          <AgentScreenshot alt="多个 Codex Session 在同一工作台中并行读取代码、运行工具和编写文档" caption="多个长期 Codex Session 并排工作：执行已经并行，目标、依赖、冲突和验收仍散落在各个窗口。" height={2232} previewSrc="/paw-agent-sessions-grid-preview.webp" src="/paw-agent-sessions-grid.webp" width={3910}/>
          <figcaption><span>现状一：多 Session 并排</span><strong>Agent 都在工作，但项目状态仍散落在不同窗口里。</strong><p>谁依赖谁、哪里冲突、哪个结果已验收，仍要靠用户自己在屏幕之间拼起来。</p></figcaption>
        </figure>
        <figure>
          <AgentScreenshot alt="Codex 子智能体列表显示累计完成 102 个私有子任务" caption="子智能体列表累计完成 102 项：派发能力已经很强，但数量本身没有形成可控的父子执行树。" height={2014} previewSrc="/paw-agent-102-subagents-preview.webp" src="/paw-agent-102-subagents.webp" width={3252}/>
          <figcaption><span>现状二：子 Agent 数量增长</span><strong>“完成 102”证明 Harness 能派很多子任务，却不能证明协作已经好用。</strong><p>数量不会自动给出统一目标、公共进度、依赖关系和唯一最终结论；这些仍需要新的协作层。</p></figcaption>
        </figure>
      </div>
      <dl className="agent-harness-failures">
        <div><dt><span>问题一</span><strong>人被迫当路由中转</strong></dt><dd>目标拆分、上下文补充、跨 Session 消息、结果回收和冲突处理都穿过用户。Agent 虽然并行执行，协作吞吐却受限于人能切多少窗口、转发多少次。</dd></div>
        <div><dt><span>问题二</span><strong>Codex 子代理不受控制</strong></dt><dd>累计数量可以增长到 102，但父子关系、启动权限、Tool 范围、token / 时间消耗、取消与最终回收没有形成一个可操作的控制面。用户看见“很多 Agent”，却不能稳定控制整棵执行树。</dd></div>
      </dl>
      <footer><strong>PAW 要补的缺口</strong><p>不再做另一个 Agent 启动器，而是在现有 Session 能力之上补齐显式派发、伙伴通信、公共事件、失败收口与一个最终结果。</p></footer>
    </section>
  );
}

function AgentHarnessReference() {
  return (
    <section className="agent-harness-reference" aria-labelledby="agent-harness-reference-title">
      <header>
        <h2 id="agent-harness-reference-title">Claude Code 也在补同一类多 Agent 能力，并明确区分了四条路径。</h2>
        <p>官方文档已经把 subagents、agent view、agent teams 和 worktrees 分开：它们分别解决上下文隔离、后台监看、伙伴协作和文件隔离。这个划分反过来证明，多 Agent 的难点不是“能开几个”，而是谁负责协调与控制。</p>
      </header>
      <div className="agent-harness-reference-table" role="table" aria-label="Claude Code 并行机制与当前边界">
        <div role="row"><strong role="cell">Subagents</strong><span role="cell">父会话管理，独立上下文，结果摘要回传</span><p role="cell">适合短而独立的任务；路由和收口仍集中在父会话。</p></div>
        <div role="row"><strong role="cell">Agent view</strong><span role="cell">用户派发并监看多个后台 Session</span><p role="cell">状态更集中，但独立任务之间仍主要由用户协调。</p></div>
        <div role="row"><strong role="cell">Agent teams</strong><span role="cell">Lead、共享任务表、伙伴直接通信</span><p role="cell">仍是实验功能；官方列出恢复、任务协调和 shutdown 的已知限制。</p></div>
        <div role="row"><strong role="cell">Worktrees</strong><span role="cell">给并行 Session 隔离 Git 写入</span><p role="cell">解决文件互踩，不自动解决目标、通信和最终责任。</p></div>
      </div>
      <footer>
        <p>Claude Code 官方同时提醒：Agent teams 会增加协调开销和 token 消耗，更适合可以独立推进的任务；依赖多、顺序强或同文件修改时，不应为了“多 Agent”而强行并行。</p>
        <nav aria-label="Claude Code 多 Agent 官方资料">
          {[industrySources.claudeParallel, industrySources.claudeTeams].map((source) => <a href={source.href} key={source.href} rel="noreferrer" target="_blank">{source.label}<SquareArrowOutUpRight size={12}/></a>)}
        </nav>
      </footer>
    </section>
  );
}

function AgentSolutionBridge() {
  return (
    <section className="agent-solution-bridge" aria-labelledby="agent-solution-bridge-title">
      <h2 id="agent-solution-bridge-title">所以，PAW 做多 Agent 的意义不是再多开几个窗口。</h2>
      <p>它要让人退出路由中转，把目标派发、伙伴通信、子代理权限、执行消耗、停止回收和唯一最终结果交给一个可观察、可控制的协作层。下面才是 PAW 的解法。</p>
    </section>
  );
}

function AgentSessionReality() {
  return (
    <section className="agent-session-reality" aria-labelledby="agent-session-title">
      <div className="agent-session-copy">
        <h2 id="agent-session-title">PAW 的第一步：不削弱原本就能做项目的 Session。</h2>
        <p><strong>在你的实际使用里，它就是一段通过 SSH 持续做项目的 Codex 对话。</strong>你在同一段对话里追问、改需求、让 Codex 读 Skills、运行 Tool、改代码、压缩上下文，再从中断处恢复。PAW 没有把这条完整能力降级成一条临时 prompt。</p>
        <p>因此，多 Agent 也不是四个“模型气泡”同时生成文案，而是 2–4 段各自能真正推进项目的 Session，在一个 Room 里承担不同责任。</p>
      </div>
      <div className="agent-session-contract" aria-label="一个 Codex 项目 Session 拥有的能力">
        <header><span>ONE SESSION</span><strong>一段完整的 Codex 项目对话</strong></header>
        <dl>
          <div><dt>上下文</dt><dd>Transcript · context · compaction</dd></div>
          <div><dt>执行</dt><dd>Tools · Skills · code changes · tests</dd></div>
          <div><dt>控制</dt><dd>Steer · Stop · cancel</dd></div>
          <div><dt>持续性</dt><dd>resume · recovery · project scope</dd></div>
        </dl>
        <footer><Check size={14}/><span>Room 要组合的是这个完整单元，不是一条临时模型调用。</span></footer>
      </div>
    </section>
  );
}

function AgentRoleLedger() {
  return (
    <section className="agent-role-ledger" aria-labelledby="agent-role-title">
      <header><h2 id="agent-role-title">五个名字，五种不同的责任。</h2><p>把它们混成“Agent”一个词，就会重复实现上下文、取消、验收和最终回答。</p></header>
      <div className="agent-role-table" role="table" aria-label="PAW Agent 角色与所有权">
        <div role="row" className="agent-role-table-head"><span role="columnheader">角色</span><span role="columnheader">它是什么</span><span role="columnheader">自己拥有</span><span role="columnheader">必须交付</span></div>
        {agentRoles.map(([role, meaning, owns, result]) => <div role="row" key={role}><strong role="cell">{role}</strong><span role="cell">{meaning}</span><span role="cell">{owns}</span><span role="cell">{result}</span></div>)}
      </div>
    </section>
  );
}

function AgentBlueprintFigure({
  alt,
  body,
  height,
  source,
  src,
  title,
  width,
}: {
  alt: string;
  body: string;
  height: number;
  source: string;
  src: string;
  title: string;
  width: number;
}) {
  return (
    <figure className="agent-blueprint-figure">
      <div className="agent-blueprint-media" style={{ aspectRatio: `${width} / ${height}` }}>
        <AgentScreenshot alt={alt} caption={`${title}。${body}`} height={height} src={src} width={width}/>
      </div>
      <figcaption>
        <div><strong>{title}</strong><p>{body}</p></div>
        <code>{source}</code>
      </figcaption>
    </figure>
  );
}

function AgentRuntimeArchitecture() {
  return (
    <section className="agent-runtime-architecture" aria-labelledby="agent-runtime-title">
      <header><h2 id="agent-runtime-title">Room 只组合 Session，不再造第二套 Agent Runtime。</h2><p>Pi 继续拥有每段项目对话的模型与 Tool loop；Room 只增加协作身份、显式派发、公共事件顺序、取消扇出和一个终局 Root。</p></header>
      <div className="agent-blueprint-stack">
        <AgentBlueprintFigure
          alt="PAW Runtime 所有权总图：PAWOS 命令经过 Gateway 与 Light Room 进入 Pi Session，执行回执再成为 PAWOS 读模型"
          body="控制面负责表达意图，Pi Session 负责 transcript、模型与 Tool loop，Room 只负责协作事实；PAWOS 最后读取持久事件，而不凭页面状态推断完成。"
          height={942}
          source="diagrams/paw-runtime-ownership.excalidraw"
          src="/evidence/agents/paw-runtime-ownership.svg"
          title="所有权总图：Runtime 真相到底由谁负责"
          width={1260}
        />
        <AgentBlueprintFigure
          alt="PAW 功能纵切图：用户 Goal 依次经过 PAWOS、Room、Pi Session、Tool Gateway 与 Trace Eval，最后产生一个终态"
          body="每一步只有一个责任 owner。Eval 失败时保留 Reject，不让候选冒充成功；页面只消费排序后的终态事件，因此前端、Runtime 与验证可以沿同一个闭环追责。"
          height={1298}
          source="diagrams/paw-feature-slice.excalidraw"
          src="/evidence/agents/paw-feature-slice.svg"
          title="功能纵切：从 Goal 到可核查结果"
          width={1798}
        />
        <AgentBlueprintFigure
          alt="技术项目讲解主线：价值、范围、职责、系统、失败、选择、证据与结果八个问题组成四组证据"
          body="STAR 负责场景、任务、行动和结果；技术项目还要补齐个人责任、系统链路、失败根因、方案取舍、Eval 口径与 claim boundary，才能经得住继续追问。"
          height={430}
          source="diagrams/project-story-spine.excalidraw"
          src="/evidence/agents/project-story-spine.svg"
          title="项目主线：连续回答八个问题"
          width={1311}
        />
      </div>
      <footer className="agent-blueprint-boundary"><ShieldCheck size={16}/><p>这三张图是基于源码与架构文档整理的可编辑快照。Room 公共流只包含有来源的进度、证据与终态；private reasoning、原始 Tool 参数与结果仍留在各自 Session。图本身不替代当前安装态、真实 Provider 或前台验收。</p></footer>
    </section>
  );
}

function AgentProjectRun() {
  return (
    <section className="agent-project-run" aria-labelledby="agent-project-run-title">
      <header><h2 id="agent-project-run-title">为什么需要多 Agent 与多维检测？</h2><p>多 Agent 首先是在补偿模型本身的缺陷：一个 Agent 可能在长任务里遗忘或重新解释用户目标，也可能在需求尚未满足时提前判断自己已经完成；如果仍由同一视角自检，这种偏差会继续进入检查结果。</p></header>
      <div className="agent-grill-stage">
        <div><Users size={20}/><span><strong>四个必要维度</strong><small>不能只看“启动了多少 Agent”，要看它们是否真的补上单模型的盲区。</small></span></div>
        <ul>
          <li><strong>并行速度：</strong>独立工作流同时调查、实现和验证，缩短 wall-clock，而不是让所有 Agent 抢同一个文件。</li>
          <li><strong>减少偏见：</strong>不同模型与角色分别实现、质疑和复核，更容易发现单一视角反复忽略的问题。</li>
          <li><strong>目标忠诚度：</strong>Reviewer Skill 明确对照用户原话、需求文档、程序行为与测试证据，不以 Worker 的自我总结代替完成。</li>
          <li><strong>退出人工中转：</strong>Room 传递 TaskBrief、ContextRefs、依赖与 AgentResult，人不再逐个窗口复制需求和回收结果。</li>
        </ul>
      </div>
      <aside className="agent-goal-mode-comparison">
        <strong>两类实验暴露了同一个边界</strong>
        <p>Goal loop 会在模型尚未自判完成时继续唤醒它，但“是否完成”仍可能受目标漂移和自检偏见影响；外置 Reviewer 能增加第二视角，却也可能按自己的解释检查。PAW 不把任一方案写成保证，而是让 Reviewer 的 Skill 可显式强调：忠于用户原始需求，并同时核对可观察行为、程序缺陷与测试证据。</p>
        <small>USER-CONFIRMED + SOURCE-LEVEL MECHANISM · 不是对 Claude Code 或 Codex 产品完成率的量化结论</small>
      </aside>
      <section className="agent-skill-routing" aria-labelledby="agent-skill-routing-title">
        <header><div><Sparkles size={17}/><span><strong id="agent-skill-routing-title">Skill 路由不是固定流水线</strong><small>只有触发条件成立才加载；Skills 指导 Session 怎样工作，不取代 Pi Agent loop。</small></span></div><b>CONDITIONAL</b></header>
        <div role="table" aria-label="PAW 项目工作中的 Skill 触发与责任">
          {agentSkillRoutes.map(([trigger, skill, boundary]) => <div role="row" key={skill}><span role="cell">{trigger}</span><code role="cell">{skill}</code><p role="cell">{boundary}</p></div>)}
        </div>
      </section>
      <div className="agent-project-lanes">
        {pawLaunchLanes.map(([name, work, result], index) => <article key={name}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{name}</h3><p>{work}</p></div><strong>{result}</strong></article>)}
      </div>
      <ol className="agent-room-timeline">
        <li><span>USER-DIRECT</span><strong>用户在主 Codex Session 提出 PAW 立项目标</strong><small>保留原话与纠正，不把引用内容误算成需求。</small></li>
        <li><span>ALIGN</span><strong>Grill 技术选型、边界、失败与证据</strong><small>只有会改变产品行为的选择才交还用户决定。</small></li>
        <li><span>DISPATCH</span><strong>Facilitator 显式接受 4 个 WorkItem</strong><small>成员身份本身不能让一段 Session 自动进入公开回合。</small></li>
        <li><span>BUILD</span><strong>四段 Codex 项目对话各自读源码、调用 Tool、写实现</strong><small>每段保留自己的 Skills、上下文、token 与停止控制。</small></li>
        <li><span>INTERCOM</span><strong>只为接口和冲突做有界横向沟通</strong><small>不是全连接闲聊；消息必须带 source、target 与所属 WorkItem。</small></li>
        <li><span>COLLECT</span><strong>回收 AgentResult、文件、测试与残余风险</strong><small>子 Agent 的文字是证据，不自动等于接受。</small></li>
        <li><span>DOCS</span><strong>更新目标、决策、架构与验收文档</strong><small>Markdown 记录项目事实，但不能冒充 Runtime 正在运行。</small></li>
        <li><span>FINAL</span><strong>可选 Reviewer 后，由 Facilitator 给一个终局结果</strong><small>失败、部分完成和未验证边界都必须写进同一个答复。</small></li>
      </ol>
      <div className="agent-docs-contract" aria-label="PAW 项目文档责任">
        <header><FileText size={17}/><span><strong>Docs 不是收尾文案，而是不同寿命的项目记忆。</strong><small>每份文档只记录它有权证明的内容。</small></span></header>
        <dl>
          <div><dt>PROJECT.md</dt><dd>稳定愿景、目标边界与 non-goals</dd></div>
          <div><dt>OUTCOMES.md</dt><dd>当前焦点、已接受结果与下一前沿</dd></div>
          <div><dt>DECISIONS.md</dt><dd>跨 owner 技术选择、后果与后来反转</dd></div>
          <div><dt>ARCHITECTURE.md</dt><dd>进程、存储、Runtime 与 projection 的所有权</dd></div>
        </dl>
        <footer><CircleAlert size={14}/><span>Session / Room 的运行、停止、验收和工作区状态只信新鲜 Runtime 与 Git 证据，不解析 Markdown checkbox。</span></footer>
      </div>
    </section>
  );
}

function AgentSourceOwnership() {
  return (
    <section className="agent-source-ownership" aria-labelledby="agent-source-title">
      <header><h2 id="agent-source-title">概念最终落到这些源码 owner。</h2><p>详情页不把架构图当作实现证据；下面每一行都对应 PAW 当前代码中的文件与符号。</p></header>
      <div className="agent-source-table" role="table" aria-label="PAW Room 源码所有权">
        {agentSourceOwners.map(([responsibility, file, symbol]) => <div role="row" key={file}><strong role="cell">{responsibility}</strong><code role="cell">{file}</code><span role="cell">{symbol}</span></div>)}
      </div>
    </section>
  );
}

function AgentDecisionLifecycle() {
  return (
    <section className="agent-decision-lifecycle" aria-labelledby="agent-decision-title">
      <header>
        <h2 id="agent-decision-title">PAW 不是第一次就做对了：Room 先被做重，后来才删回轻。</h2>
        <p>这条重构不是“换了一个更时髦的架构”，而是早期假设被实际失败推翻。下面按问题、选择、收益、反证、改选与当前边界还原。</p>
      </header>
      <ol className="agent-decision-timeline">
        <li><span>USER-CONFIRMED</span><strong>当时问题：人是路由器，子 Agent 又缺少统一控制。</strong><p>需要的不只是并行执行，还要责任、审计、必交件、停止与最终完成语义。</p></li>
        <li><span>GIT · 2026-07-31</span><strong>第一版选择：统一 governed Room Runtime。</strong><p><code>923a9e14</code> 把计划、Kernel、settlement、quality gate、review、workspace 与恢复做成强控制面。</p></li>
        <li><span>FIRST BENEFIT</span><strong>即时收益：责任合同和检查节点变得非常明确。</strong><p>谁交文件、何时 Review、什么算完成都能写成规则；这验证了“协作需要治理”，但还没证明治理必须拥有第二套 Runtime。</p></li>
        <li><span>GIT · 08-04 → 08-08</span><strong>首次反证：系统开始围绕自己的状态机不断修补。</strong><p>历史提交连续处理取消任务复活、孤儿 dispatch、invalid wait、deadlock、settlement 与 recovery 缝隙；问题从业务工作转成了维持 Kernel 自洽。</p></li>
        <li><span>ROOT CAUSE</span><strong>根因不是某一个 bug，而是 owner 重叠。</strong><p>Room 与 Pi 同时拥有 loop、context、Tool、cancel、recovery 和 terminal 语义；Markdown / gate 又试图决定 Runtime 是否完成，产生 ghost completion、硬门阻塞和重复 final。</p></li>
        <li><span>GIT · 2026-08-15</span><strong>触发改选：删除第二套 Agent Runtime，Room 改回 Session 组合。</strong><p><code>0a9f5c9c</code> 保留责任语义、显式派发和公共事件，把模型与 Tool loop、Steer、Stop、compaction、recovery 还给 Pi。</p></li>
      </ol>

      <div aria-label="G09 重构规模回执" className="agent-refactor-receipt" role="group">
        <header><span><GitBranch size={16}/><strong>重构规模回执</strong></span><a href="https://github.com/7155/personal-agent-workbench/commit/0a9f5c9c" rel="noreferrer" target="_blank">0a9f5c9c · compose rooms from Pi sessions<SquareArrowOutUpRight size={12}/></a></header>
        <div>
          <strong>190 files</strong><b>+5,145 / −115,912</b>
          <dl>
            <div><dt>Production</dt><dd>+2,643 / −50,713</dd></div>
            <div><dt>Tests</dt><dd>+1,513 / −49,003</dd></div>
            <div><dt>Scripts</dt><dd>+822 / −15,076</dd></div>
            <div><dt>Docs / Eval</dt><dd>+162 / −1,111</dd></div>
          </dl>
        </div>
        <footer>这是固定 ref 的 Git diff，不是“删代码就更好”的成绩。统计排除 vendor / dist / build，且包含重写与删除；它证明旧控制面真实存在且被迁移，价值仍要由 owner 收敛、测试与 Runtime 行为证明。</footer>
      </div>

      <section className="agent-tradeoff-ledger" aria-labelledby="agent-tradeoff-title">
        <header><h3 id="agent-tradeoff-title">Light Room 的 trade-off：删掉强制流程，也失去了一部分强制保障。</h3><p>当前选择不是免费午餐。</p></header>
        <div role="table" aria-label="PAW Light Room 技术取舍">
          <div role="row"><strong role="cell">复用 Pi Session</strong><span role="cell">得到一个 loop / context / cancel / recovery owner</span><p role="cell">Room 不能再随意定制第二套执行循环，必须尊重 Pi 的生命周期与适配边界。</p></div>
          <div role="row"><strong role="cell">显式 dispatch + 有序公共事件</strong><span role="cell">得到来源、Root 与 final 的因果关系</span><p role="cell">仍需 Registry、ack、replay 与取消扇出来处理异步边界；“轻”不等于没有协调代码。</p></div>
          <div role="row"><strong role="cell">Reviewer 按需启动</strong><span role="cell">简单任务不再被 mandatory gate 卡死</span><p role="cell">是否 Review、何时返工回到 Facilitator 判断，无法用一条全局规则替代工程判断。</p></div>
          <div role="row"><strong role="cell">有界 TaskBrief，不复制 transcript</strong><span role="cell">减少隐私暴露、token 和上下文污染</span><p role="cell">Partner 可能缺少隐含背景；ContextRefs、SkillRefs 与 typed intercom 必须写得更准确。</p></div>
          <div role="row"><strong role="cell">共享工作区默认可用，worktree 按需</strong><span role="cell">降低每个 WorkItem 的启动与合并仪式</span><p role="cell">并行写同一文件会有冲突风险，所以纵向 owner、接口和写入边界必须先确定。</p></div>
          <div role="row"><strong role="cell">子 Agent 深度与输出有界</strong><span role="cell">父 Session 能控制权限、预算、取消和结果保留</span><p role="cell">当前最大 child depth 仍为 2，扩容要靠事件分页与资源预算，不能重新堆 Kernel 状态。</p></div>
        </div>
      </section>

      <section className="agent-current-evidence" aria-label="当前证据与未闭合边界">
        <article><span>RECORDED RUNTIME</span><strong>两段普通 Pi Session · 1 次 room_partner · 1 个 Root final</strong><p>已记录的 Luna canary 还能 Stop 第二个 live Tool turn，刷新后没有 active ghost。这证明 Light Room 的最小因果链，不证明所有大型项目都已稳定。</p></article>
        <article><span>OPEN GAP</span><strong>还缺同任务、同约束的真实对照。</strong><p>PAW 尚未用固定大型编码任务与 Claude Agent teams / Codex 原生多 Agent 比较完成率、人工路由次数、token、wall-clock、冲突和取消恢复。</p></article>
      </section>
    </section>
  );
}

function AgentProjectForensics() {
  return (
    <section className="agent-project-forensics" aria-labelledby="agent-project-forensics-title">
      <header>
        <div><span>GIT HISTORY · 2026-06-30 → 2026-08-29</span><h2 id="agent-project-forensics-title">PAW 一度把 Room 做成第二套 Runtime，8 月 15 日又亲手拆掉了它。</h2></div>
        <p>沿固定 ref 往下看：输入法、Gateway、Memory 与 Tool 先叠到一起，G07–G08 的强 Room 越长越重，G09 才把执行权还给 Pi Session。点击每段 ref 可以打开 GitHub compare；Git 证明改动，Test / Runtime 才证明行为。</p>
      </header>
      <div className="agent-git-shell">
        <div className="agent-git-overview" aria-label="Git 演进统计摘要">
          <span><strong>12</strong><small>固定 diff 区间</small></span>
          <span><strong>{agentGitNumber.format(agentGitCommitTotal)}</strong><small>区间内 commits</small></span>
          <span data-tone="cutover"><strong>−115,912</strong><small>G09 核心提交删除</small></span>
        </div>
        <ul className="agent-git-eras" aria-label="PAW 技术路线阶段">
          <li data-era="product"><b>G01–G06</b><span>产品能力叠加</span></li>
          <li data-era="kernel"><b>G07–G08</b><span>第二套 Runtime</span></li>
          <li data-era="cutover"><b>G09</b><span>删除与换轨</span></li>
          <li data-era="rebuild"><b>G10–G12</b><span>Pi-native 重建</span></li>
        </ul>
        <ol className="agent-git-history" aria-label="PAW G01 到 G12 Git 演进记录">
          {agentProjectHistory.map((entry) => {
            const range = `${entry.startRef ?? "empty tree"}..${entry.endRef}`;
            const href = entry.startRef
              ? `https://github.com/7155/personal-agent-workbench/compare/${entry.startRef}...${entry.endRef}`
              : `https://github.com/7155/personal-agent-workbench/commit/${entry.endRef}`;
            return (
              <li className={`agent-git-commit agent-git-commit--${entry.era}`} key={entry.phase}>
                <div className="agent-git-rail" aria-hidden="true"><span/></div>
                <article>
                  <header className="agent-git-meta">
                    <span className="agent-git-phase"><b>{entry.phase}</b><small>{entry.track}</small></span>
                    <time dateTime={entry.endedAt}>{entry.date}</time>
                    <a aria-label={`在 GitHub 查看 ${entry.phase} 的固定 diff`} href={href} rel="noreferrer" target="_blank"><code>{range}</code><SquareArrowOutUpRight size={11}/></a>
                  </header>
                  <div className="agent-git-content">
                    <div className="agent-git-copy"><h3>{entry.title}</h3><p>{entry.change}</p></div>
                    <div className="agent-git-diffstat" aria-label={`${entry.commits} commits，${entry.files} files，新增 ${entry.additions} 行，删除 ${entry.deletions} 行`}>
                      <header><span>{agentGitNumber.format(entry.commits)} commits</span><span>{agentGitNumber.format(entry.files)} files</span><small>LOG SCALE</small></header>
                      <div className="agent-git-bars" aria-hidden="true">
                        <span><i style={{ "--git-diff-width": agentGitDiffScale(entry.additions, agentGitMaxAdditions) } as React.CSSProperties}/></span>
                        <span><i style={{ "--git-diff-width": agentGitDiffScale(entry.deletions, agentGitMaxDeletions) } as React.CSSProperties}/></span>
                      </div>
                      <div className="agent-git-numbers"><b>+{agentGitNumber.format(entry.additions)}</b><b>−{agentGitNumber.format(entry.deletions)}</b></div>
                    </div>
                  </div>
                  {entry.spotlight ? <a className="agent-git-spotlight" href="https://github.com/7155/personal-agent-workbench/commit/0a9f5c9c" rel="noreferrer" target="_blank"><span>{entry.spotlight.label}</span><strong>{entry.spotlight.value}</strong><SquareArrowOutUpRight size={12}/></a> : null}
                  <footer className="agent-git-pitfall"><span>当时踩坑</span><p>{entry.pitfall}</p></footer>
                </article>
              </li>
            );
          })}
        </ol>
        <footer className="agent-git-method"><GitBranch size={15}/><p>统计为整个 tracked repository 的 boundary-to-boundary Git diff；files 包含二进制改动，增删行只统计文本。区间包含 tests、contracts 与 generated files，柱长使用对数刻度，只用于看结构迁移，不代表个人产出或功能完成度。</p></footer>
      </div>
      <section className="agent-conversation-evidence" aria-labelledby="agent-conversation-evidence-title">
        <header><History size={17}/><span><strong id="agent-conversation-evidence-title">真实 Codex 对话怎样改变项目方向</strong><small>节选 USER-DIRECT；为公开展示去掉 Session ID、机器路径与私有上下文。</small></span></header>
        <div>
          {agentConversationEvidence.map(([date, topic, quote, consequence]) => (
            <article key={`${date}-${topic}`}>
              <span><time>{date}</time><b>{topic}</b></span>
              <blockquote>{quote}</blockquote>
              <p>{consequence}</p>
            </article>
          ))}
        </div>
        <footer><strong>诚实边界</strong><p>07-18–07-27 强 Kernel 扩张与 08-15 删除 Kernel 的连续 USER-DIRECT 仍不完整；这两段只用 Git / Docs 证明发生了什么，不替用户补写动机或接受结果。</p></footer>
      </section>
    </section>
  );
}

function AgentSolutionSummary() {
  return (
    <section className="agent-solution-summary" aria-labelledby="agent-solution-title">
      <header>
        <h2 id="agent-solution-title">PAW 的解法：保留 Session，把边界加在协作层。</h2>
        <p>不是继续增加 Agent 数量，而是把“谁能做什么、什么可以公开、谁负责收口”变成可执行的合同。</p>
      </header>
      <ol>
        <li><span>01</span><strong>保留完整 Session</strong><p>每段 Codex 项目对话继续拥有自己的上下文、Tools、Skills、压缩、停止与恢复。</p></li>
        <li><span>02</span><strong>显式接受派发</strong><p>只有带 WorkItem 和 owner 的任务才进入 Room；成员身份本身不产生公开工作。</p></li>
        <li><span>03</span><strong>只公开有界证据</strong><p>进度、交接、测试和结果进入公共时间线；私有推理与原始 Tool 记录仍留在 Session。</p></li>
        <li><span>04</span><strong>一个 Facilitator 收口</strong><p>Partner 返回结果，Reviewer 按需检查，最终只向用户交付一个诚实结论。</p></li>
      </ol>
      <footer><strong>得到的结果</strong><p>大型项目可以按责任纵向拆分，多段 Session 能并行推进和有界沟通，同时不会复制 Agent Runtime，也不会产生多个互相冲突的最终答案。</p></footer>
    </section>
  );
}

export function DetailShell({ index, title, sub, children, repositories, pageClassName }: { index: string; title: string; sub: string; children: ReactNode; repositories?: readonly { label: string; href: string }[]; pageClassName?: string }) {
  const repositoryLinks = repositories ?? [
    { label: "paw-story-showcase", href: "https://github.com/7155/paw-story-showcase" },
    { label: "personal-agent-workbench", href: "https://github.com/7155/personal-agent-workbench" },
  ];
  return (
    <main className={`detail-page${pageClassName ? ` ${pageClassName}` : ""}`} id="top">
      <header className="detail-nav">
        <a className="detail-back" href="/"><ArrowLeft size={14}/>返回主页</a>
        <span className="detail-brand"><PawMark/>PAW STORY SHOWCASE</span>
      </header>
      <div className="detail-head">
        <span className="slide-index">{index}</span>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="detail-body">{children}</div>
      <footer className="detail-foot">
        <span>真实前端组件 + 明确标注的合成演示数据；本页不证明 PAW Runtime 安装或前台验收状态。</span>
        <nav aria-label="作者的项目仓库">
          {repositoryLinks.map((repository) => <a href={repository.href} key={repository.href} rel="noreferrer" target="_blank"><GithubMark size={13}/>{repository.label}</a>)}
        </nav>
        <a href="/">回到四章主页<ArrowRight size={13}/></a>
      </footer>
    </main>
  );
}

export function InputDetail() {
  return (
    <DetailShell
      index="03 · 输入即上下文 · 详情"
      title="为什么输入法既要重训模型，也要重做推理"
      sub="第一部分回答为什么不直接常驻 Qwen、0.1B 模型怎样由数据与冻结评测选出来；第二部分回答一次按键怎样复用 Prefix KV、并行生成并稳定返回 Top-3。训练和推理分别给证据，最后才组成一条产品链。"
      repositories={[
        { label: "paw-story-showcase", href: "https://github.com/7155/paw-story-showcase" },
        { label: "AIOS-IME", href: "https://github.com/7155/aios" },
        { label: "MiniMind-IME", href: "https://github.com/7155/minimind-ime" },
      ]}
    >
      <nav className="ime-detail-nav" aria-label="输入法详情章节"><a href="#ime-training">模型训练</a><a href="#ime-inference">推理 Runtime</a></nav>
      <ImeTrainingTrack/>
      <ImeInferenceTrack/>
    </DetailShell>
  );
}

export function ContextDetail() {
  return (
    <DetailShell
      index="04 · 上下文沉淀 · 详情"
      pageClassName="detail-page--context"
      title="上下文详情：什么能留下，谁能用，何时召回"
      sub="三种上下文各有权限、召回时机与权威载体；以下数据链、治理样例与检索实验全部使用公开清洗后的合成快照。"
    >
      <ContextGovernanceGrid/>
      <MemoryDataStory/>
      <MemoryGovernanceDetail/>
      <PreferenceMemoryLoop/>
      <GraphTagRerankStory/>
      <RagLabDetail/>
      <SourcedAgentProblem
        body="Anthropic 的出发点不是‘模型已经足够好，只差一个工作流’，而是长任务里的模型会失去连贯性、产生 context anxiety，并倾向过度肯定自己的结果。Harness 就是补偿层：用高信号上下文、结构化交接和独立评测弥补这些缺陷。OpenAI 再把仓库文档、计划、机械检查与 taste invariants 做成 Agent 可读、可执行的系统记录。注意：MiniMind-IME 是另一条独立证据线——它解决输入法专用模型的训练与 Eval，不是 Harness 的因果结果。"
        index="02"
        sources={[industrySources.longRunning, industrySources.harness]}
        title="模型的缺陷是前提；Harness 是补偿系统，不是模型训练的包装。"
      />
    </DetailShell>
  );
}

export function AgentsDetail() {
  return (
    <DetailShell
      index="01 · 多 Agent 协作 · 详情"
      title="当前旗舰 Harness 的多 Agent，为什么仍然不好用？"
      sub="真实工作现场里，多段 Codex Session 和累计 102 个子 Agent 都已经出现；但人被迫充当跨窗口路由中转，子代理的层级、消耗、停止和回收又难以控制。PAW 从这两个问题开始解决。"
      repositories={[
        { label: "paw-story-showcase", href: "https://github.com/7155/paw-story-showcase" },
        { label: "personal-agent-workbench", href: "https://github.com/7155/personal-agent-workbench" },
      ]}
    >
      <AgentWorksiteIntro/>
      <SourcedAgentProblem
        body="Anthropic 公开记录了多 Agent 的协调、评测与可靠性成本，并指出其研究系统使用的 token 约为普通聊天的 15 倍；高度相互依赖的工作也未必适合并行。OpenAI 则把 Manager 与 Handoff 区分开，要求先明确谁保留最终答复所有权。"
        index="03"
        sources={[industrySources.multiAgent, industrySources.agentGuide]}
        title="更多 Agent 会一起放大 token、通信、等待与验收问题。"
      />
      <section className="cited-agent-patterns" aria-label="用户定义的三种多 Agent 问题结构">
        <header><strong>先看问题：三种协作结构都会失控</strong><span>主从树把判断堵回主 Agent，全连接蜂群让通信超过工作，平等专家组则可能陷入无上限复核。</span></header>
        <div>
          {agentPatterns.map((pattern) => (
            <article data-pattern={pattern.id} key={pattern.id}>
              <AgentPatternDiagram type={pattern.id}/>
              <span>{pattern.index} · {pattern.label}</span>
              <h3>{pattern.title}</h3>
              <p>{pattern.detail}</p>
            </article>
          ))}
        </div>
        <footer>
          <a href={industrySources.multiAgent.href} rel="noreferrer" target="_blank">Anthropic · 协调与 token 成本<SquareArrowOutUpRight size={12}/></a>
          <a href={industrySources.agentGuide.href} rel="noreferrer" target="_blank">OpenAI · Manager / Handoff<SquareArrowOutUpRight size={12}/></a>
        </footer>
      </section>
      <AgentScaleEvidence/>
      <AgentHarnessReference/>
      <AgentSolutionBridge/>
      <AgentSessionReality/>
      <AgentRoleLedger/>
      <AgentRuntimeArchitecture/>
      <AgentDecisionLifecycle/>
      <AgentProjectForensics/>
      <AgentProjectRun/>
      <AgentSourceOwnership/>
      <AgentSolutionSummary/>
    </DetailShell>
  );
}
