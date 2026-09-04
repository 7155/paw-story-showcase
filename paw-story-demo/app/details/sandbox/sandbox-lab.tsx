"use client";

import {
  Activity,
  ArrowRight,
  Check,
  CircleAlert,
  Database,
  FileCheck2,
  GitCompareArrows,
  LockKeyhole,
  Search,
  ShieldCheck,
  SquareArrowOutUpRight,
  TerminalSquare,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { DetailShell } from "../shared";

type RunId = "rag" | "cloudops" | "enterpriseops" | "memory";

type RunEvent = {
  id: string;
  state: "passed" | "failed" | "blocked" | "unknown";
  label: string;
  summary: string;
  evidence: string;
  evidenceHref?: string;
};

type LabRun = {
  id: RunId;
  label: string;
  shortLabel: string;
  status: string;
  statusTone: "passed" | "blocked" | "candidate";
  title: string;
  summary: string;
  metric: string;
  metricLabel: string;
  Icon: LucideIcon;
  metrics: readonly [string, string, string][];
  events: readonly RunEvent[];
  evidenceHref: string;
  evidenceLabel: string;
  boundary: string;
};

const labRuns: readonly LabRun[] = [
  {
    id: "rag",
    label: "Enterprise RAG",
    shortLabel: "知识检索",
    status: "VALIDATION · HELD-OUT NOT CONSUMED",
    statusTone: "candidate",
    title: "先冻结语料和问题，再允许 Agent 改检索链。",
    summary: "5,101 篇企业文档、29,846 个 chunk、16 个 Validation query。14 个候选共享同一语料、split 与 qrels，选出 hybrid + Qwen3 reranker；随后 v16 和 Luna Max v20 都用逐事实 source/chunk/quote 合同检查最终答案，四条 answer-only lane 仍全部 Reject。",
    metric: "+44.78%",
    metricLabel: "nDCG@10 相对 lexical floor",
    Icon: Search,
    metrics: [
      ["nDCG@10", "0.6128 → 0.8872", "+44.78% relative"],
      ["MRR", "0.6042 → 0.8672", "+43.53% relative"],
      ["Recall@10", "0.6719 → 0.9554", "+42.19% relative"],
      ["Rerank pairs", "935 / 935", "0 fallback · 0 error"],
    ],
    events: [
      { id: "rag-freeze", state: "passed", label: "冻结输入", summary: "固定 5,101 文档、16 个 Validation query、配置与 hash。", evidence: "datasetSourceSha256 · validationSplitSha256" },
      { id: "rag-search", state: "passed", label: "14 路候选", summary: "Lexical、Dense、Hybrid 与 reranker 只在 Validation 上比较。", evidence: "candidateCount = 14" },
      { id: "rag-select", state: "passed", label: "选出 winner", summary: "Hybrid + Qwen3-Reranker-0.6B-4bit 在三个检索指标上同时领先。", evidence: "winnerConfigSha256 · 935 scored pairs" },
      { id: "rag-answer", state: "failed", label: "v16 最终答案 Reject", summary: "Host 先证明 9/9 必要事实有精确来源；baseline、Skill、tuned 却都只引用支持了 2/9 个事实，可回答问题 citation support 为 0。", evidence: "2 / 9 cited facts · support rate 0", evidenceHref: "/evidence/vertical-evals/enterprise-rag-answer-v16-reject-20260901.v1.json" },
      { id: "rag-luna-answer", state: "failed", label: "Luna Max v20 · 四 lane Reject", summary: "同一 4 个 Validation answer case、同一语料绑定下，baseline、Skill、tuned 都是答案判定 2/4，agentic 是 0/4；四条 lane 都因 citation hard gate 失败而 Reject。agentic 另外触发 abstention、terminal、Tool contract 与 output protocol 门禁。", evidence: "2/4 · 2/4 · 2/4 · 0/4 · citation gate failed", evidenceHref: "/evidence/vertical-evals/enterprise-rag-answer-luna-max-validation-20260902.v1.json" },
      { id: "rag-tag", state: "blocked", label: "阻断伪 Tag A/B", summary: "Knowledge graph node / edge / extraction 全为 0，Memory Tag 的 memory_item_id 不能冒充 document_id + chunk_id。", evidence: "0 node · 0 edge · 0 extraction", evidenceHref: "/evidence/vertical-evals/enterprise-rag-tag-readiness-20260901.v1.json" },
      { id: "rag-v19b", state: "blocked", label: "V19b · TopK 20 预检拒绝", summary: "只改变 Agent retrieval topK 10→20，但当前主机的 MLX Metal preflight 失败；0 Session、0 Tool、0 Provider turn，没有产生可比较分数。", evidence: "preflight rejected · held-out untouched" },
      { id: "rag-heldout", state: "unknown", label: "Held-out 未开启", summary: "当前只允许说 Validation 选型，不允许说泛化、生产提升或正式 Keep。", evidence: "heldOutEvaluated = false" },
    ],
    evidenceHref: "/evidence/vertical-evals/enterprise-rag-validation-20260831.v1.json",
    evidenceLabel: "打开 RAG Validation 回执",
    boundary: "检索 winner 只是 Validation 选型；answer-only v16 与 Luna Max v20 均因逐事实引用硬门失败而 Reject。Held-out 没有被消费，不能把检索提升写成最终答案提升。",
  },
  {
    id: "cloudops",
    label: "CloudOps",
    shortLabel: "故障定位",
    status: "BASELINE INCUMBENT · V1 FAILED · V2–V4 REJECTED · LUNA MAX REJECTED",
    statusTone: "blocked",
    title: "先保住 Baseline，再让模型候选拿到可比较的结果。",
    summary: "同一组 12 个冻结故障 case 先建立 Sol baseline，再连续保留 v1–v4。搜索、usage 投影与长 Tool ID 三个 OS 合同缺陷被修复；随后只替换模型为 Luna Max，跑了 3 个真实 Session transcript，共 278 次 Tool、14 次失败。第三批超时，abort 也超时；没有正式 Host CA/JRA 分数，因此拒绝候选，不做质量或成本比较。",
    metric: "CA 1.00",
    metricLabel: "保留的 Sol Baseline · Luna Reject",
    Icon: Activity,
    metrics: [
      ["Baseline", "CA 1.0000", "JRA 0.8333"],
      ["Luna Max", "278 Tool", "14 failed"],
      ["Luna usage", "916,112 in", "57,057 out · cache 18,809,344"],
      ["Decision", "Reject", "no CA/JRA or cost compare"],
    ],
    events: [
      { id: "cloud-baseline", state: "passed", label: "Baseline · 业务 incumbent", summary: "3 个 Sol Session 完成 3×4 批次；12/12 作答、98/98 Tool 成功，CA 1.00、JRA 0.8333。", evidence: "host-only score · 12 frozen cases", evidenceHref: "/evidence/vertical-evals/cloudops-agent-validation-20260901.v1.json" },
      { id: "cloud-v1", state: "failed", label: "V1 · Search 合同", summary: "新增 host-side search 后，Schema 合法的长 query 被隐藏的 12-term 限制拒绝；没有正式分数。", evidence: "search_schema_hidden_term_limit" },
      { id: "cloud-v2", state: "failed", label: "V2 · Usage 与无界探索", summary: "查询合同修复后 12 题跑完；Top3JRA 到 1.0，但 CA 回退、Tool 调用增至 189，同时全零 usage 被错误投影为可用。", evidence: "CA 0.8333 · Tool +92.86%", evidenceHref: "/evidence/vertical-evals/cloudops-candidate-falsification-20260901.v1.json" },
      { id: "cloud-v3", state: "failed", label: "V3 · 有界工作流", summary: "两阶段诊断与预算把调用降到 82，但 CA/JRA 退至 0.75，并出现一次长 cacheKey 转录失败。", evidence: "82 Tool · 1 failed read", evidenceHref: "/evidence/vertical-evals/cloudops-candidate-falsification-20260901.v1.json" },
      { id: "cloud-v4", state: "failed", label: "V4 · 短 observationId", summary: "56/56 read 使用短 ID、94/94 Tool 成功；但 CA/JRA/Top3JRA 退至 CA 0.5000 / JRA 0.4167 / Top3JRA 0.5000，业务门禁失败。", evidence: "Tool contract pass · quality reject", evidenceHref: "/evidence/vertical-evals/cloudops-candidate-falsification-20260901.v1.json" },
      { id: "cloud-stop", state: "passed", label: "按预设门禁停止", summary: "工具可靠性与诊断质量分别验收。V4 只通过前者，baseline 保留，不再用同一 Validation 运行 V5。", evidence: "incumbent = baseline · runV5 false", evidenceHref: "/evidence/vertical-evals/cloudops-candidate-falsification-20260901.v1.json" },
      { id: "cloud-usage", state: "unknown", label: "成本只能记录，不能换算", summary: "Luna transcript 有 input、output 和 cache-read 记录，但没有冻结价格卡或账单回执；usage 不是成本，更不能宣称零成本或降价比例。", evidence: "916,112 in · 57,057 out · 18,809,344 cache" },
      { id: "cloud-luna", state: "failed", label: "Luna Max · Model-only candidate Reject", summary: "Prompt、Skill、Tool、Workflow 和 Validation case 全部冻结，只替换 Sol → Luna Max。3 个真实 Session 共 278 次 Tool、14 次失败；由于没有正式 Host CA/JRA 分数，候选不能与 Baseline 做质量比较，按门禁 Reject。", evidence: "3 Session · 278 Tool · 14 failed", evidenceHref: "/evidence/vertical-evals/cloudops-luna-max-validation-reject-20260902.v1.json" },
      { id: "cloud-luna-timeout", state: "failed", label: "Luna Max · 第三批终止", summary: "第三个 Validation batch 先超时，随后 abort 也超时；因此没有形成 formal CA/JRA score，Baseline 保留，Held-out 不开启。", evidence: "third batch timeout · abort timeout", evidenceHref: "/evidence/vertical-evals/cloudops-luna-max-validation-reject-20260902.v1.json" },
    ],
    evidenceHref: "/evidence/vertical-evals/cloudops-candidate-falsification-20260901.v1.json",
    evidenceLabel: "打开 CloudOps V1–V4 对照回执",
    boundary: "三个 OS Tool/Eval 合同缺陷已在 source-local candidate 验证；Sol Baseline 保留。Luna Max 只完成 3 个真实 Session transcript，因第三批与 abort 均超时而没有 formal CA/JRA score，所以不做质量或成本比较，也没有安装或打开 Held-out。",
  },
  {
    id: "enterpriseops",
    label: "EnterpriseOps CSM",
    shortLabel: "业务工作流",
    status: "VALIDATION WON · HELD-OUT REJECTED · CHEAPER MODEL REJECTED",
    statusTone: "blocked",
    title: "更快、更省的模型，也必须先过质量门禁。",
    summary: "先修复 Runner / Tool / 权限合同，让业务 Tool 真正执行；suite-v2 的 state-contract 将 Validation 从 2/3、28/31 提到 3/3、31/31，但 one-shot Held-out 仅 1/8、54/65，Promotion 被拒绝。随后在同一当前源码、Runtime provenance、Prompt、Tool、Workflow 与 thinking=max 下只替换模型：Luna 成本估算降低 77.64%、耗时降低 16.45%，但质量回退到 2/3、30/31，因此继续保留 Sol。",
    metric: "1 / 8",
    metricLabel: "one-shot Held-out task · Promotion rejected",
    Icon: FileCheck2,
    metrics: [
      ["Harness repair", "3 / 31 → 26 / 31", "+74.19 percentage points"],
      ["Validation task", "2 / 3 → 3 / 3", "state-contract winner"],
      ["One-shot Held-out", "1 / 8 · 54 / 65", "Promotion rejected"],
      ["Matched model gate", "3 / 3 → 2 / 3", "Luna quality rejected"],
      ["Luna price estimate", "$3.2434 → $0.7252", "-77.64% · not a bill"],
    ],
    events: [
      { id: "csm-invalid", state: "failed", label: "Invalid plumbing", summary: "首轮没有真正进入业务 Tool：0/3 任务、3/31 verifier、0 次业务 Tool。这是不可比较的执行链故障，不是业务 baseline。", evidence: "0 / 3 task · 3 / 31 verifier · 0 Tool" },
      { id: "csm-runtime", state: "passed", label: "01 · Runtime thinking 绑定", summary: "update_session 只改了请求字段，没有改变实际 Pi thinking；Runtime ready 后改为显式 select_thinking_level，并核验 effective model 与 thinking receipt。", evidence: "CSM-RUNTIME-001 · live plumbing", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" },
      { id: "csm-transport", state: "passed", label: "02 · Tool transport", summary: "文件 spool wrapper 没有截获普通业务 Tool fetch；改为 capability-token 保护的临时 loopback Gateway，单题从 0 Tool / 1-of-11 verifier 恢复到 11 Tool / 11-of-11。", evidence: "CSM-TRANSPORT-001 · live A/B", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" },
      { id: "csm-authority", state: "passed", label: "03 · 写权限语义", summary: "Session 错标 read_only 导致 Agent 拒绝临时数据库写入；改为 per_action，并把宿主文件权限与受限 CSM Tool 写权限分开表达。", evidence: "CSM-AUTHORITY-001 · live Validation", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" },
      { id: "csm-mcp-error", state: "passed", label: "04 · MCP 错误投影", summary: "MCP isError:true 曾被 Gateway 记为成功；现在写入失败 ledger，并向 Agent 返回结构化 ValueError。", evidence: "CSM-MCP-ERROR-001 · focused test", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" },
      { id: "csm-cleanup", state: "passed", label: "05 · Cleanup 终态", summary: "verifier 异常可能绕过 unbind / delete；改为嵌套 finally 和显式 cleanup 状态，删除失败会让报告失效，最终 3/3 临时库删除。", evidence: "CSM-CLEANUP-001 · 3 / 3 deleted", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" },
      { id: "csm-gold", state: "passed", label: "06 · Gold 隔离", summary: "公共报告不再投影 verifier 名称和低熵 expected hash，只保留 index、pass 与 error type；SQL、名称和期望值留在 Host。", evidence: "CSM-GOLD-LEAK-001 · focused test", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" },
      { id: "csm-terminal", state: "passed", label: "07 · 任务成功合同", summary: "数据库碰巧满足 verifier 不能掩盖 turn_failed；任务成功现在同时要求 turn_completed、无 Runtime error、全部 verifier 通过。", evidence: "CSM-TERMINAL-001 · focused test", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" },
      { id: "csm-oracle", state: "passed", label: "08 · Tool 选择边界", summary: "Agent 实际看到的是 task-selected Tool，不再包装成从 89 个 Tool 自由选择；报告固定标记 task_selected_oracle。", evidence: "CSM-ORACLE-001 · report contract", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" },
      { id: "csm-replay", state: "passed", label: "09 · Mutation 幂等", summary: "强制非空 toolCallId；相同 ID 与 payload 返回缓存结果，不同 payload 复用同一 ID 时 fail closed，避免 mutation 重放两次。", evidence: "CSM-REPLAY-001 · focused test", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" },
      { id: "csm-split", state: "passed", label: "10 · Split 物理隔离", summary: "Validation loader 不再先解析全部任务；它先核对文件名 universe，再只读取当前 split 的显式 ID，Held-out body 未被消费。", evidence: "CSM-SPLIT-001 · invalid-body test", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" },
      { id: "csm-server", state: "passed", label: "11 · 受控 Server 错误", summary: "预期 RuntimeError 不再让 HTTP 连接直接断开；EnterpriseOps 将预期 Tool failure 转成结构化 ValueError。该项已过 focused test，尚未单独重跑 live candidate。", evidence: "CSM-SERVER-ERROR-001 · source/test only", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" },
      { id: "csm-baseline", state: "passed", label: "修复后 baseline", summary: "真实业务 Tool 恢复为 47/47 成功，1/3 任务完成、26/31 verifier 通过、3/3 临时数据库删除。", evidence: "33.33% task · 83.87% verifier", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-validation-summary-20260901.v1.json" },
      { id: "csm-suite-v2", state: "passed", label: "Suite-v2 Validation winner", summary: "同一 3 任务、31 verifier 下，state-contract 从 2/3、28/31 提升到 3/3、31/31，并把 Tool 72 降到 64；这是打开一次 Held-out 的唯一依据。", evidence: "3 / 3 task · 31 / 31 verifier · 64 Tool", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-suite-v2-summary-20260903.v2.json" },
      { id: "csm-heldout", state: "failed", label: "One-shot Held-out Reject", summary: "8 个任务只完成 1 个，65 条 verifier 通过 54 条；140 次 Tool 中 2 次失败，但 8/8 Session 都有终态且 8/8 临时数据库已清理。系统拒绝 Promotion，没有重跑成好结果。", evidence: "1 / 8 task · 54 / 65 verifier · cleanup 8 / 8", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-suite-v2-summary-20260903.v2.json" },
      { id: "csm-luna-v0", state: "failed", label: "Luna V0 · Runtime 不兼容", summary: "只替换模型后，三个请求都在首轮 Provider 调用前因 max_output_tokens 被拒绝；0 Tool、0 token，因此不是模型质量分。", evidence: "0 / 3 · 3 / 31 · unsupported parameter" },
      { id: "csm-legacy-cost", state: "blocked", label: "旧成本比较 · 已撤回", summary: "2026-09-02 Luna 运行证明 Provider 兼容修复，但其 Sol 对照的 thinking 与源码 provenance 不一致，不能继续作为单变量模型成本结论。", evidence: "superseded · comparability audit failed", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-suite-v2-summary-20260903.v2.json" },
      { id: "csm-sol-controlled", state: "passed", label: "Sol Max · 匹配对照", summary: "当前同一源码与 Runtime provenance 上，Sol Max 达到 3/3 task、31/31 verifier、3/3 cleanup；87 次 Tool 中 1 次失败已恢复。", evidence: "3 / 3 · 31 / 31 · $3.243385 estimate", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-suite-v2-summary-20260903.v2.json" },
      { id: "csm-luna-controlled", state: "failed", label: "Luna Max · 质量门禁 Reject", summary: "只改变模型后，Luna 将成本估算降低 77.64%、耗时降低 16.45%、Tool 减少 21 次，但 task 降至 2/3、verifier 降至 30/31；质量优先，保留 Sol。", evidence: "2 / 3 · 30 / 31 · $0.725239 estimate", evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-suite-v2-summary-20260903.v2.json" },
    ],
    evidenceHref: "/evidence/vertical-evals/enterpriseops-csm-suite-v2-summary-20260903.v2.json",
    evidenceLabel: "打开 EnterpriseOps suite-v2 修订总回执",
    boundary: "Validation workflow winner、one-shot Held-out Reject 与模型成本 Reject 是三条独立证据。77.64% 是 Runtime DB usage × 冻结价格来源的估算，不是账单；Luna candidate 未安装，Held-out 没有重跑。",
  },
  {
    id: "memory",
    label: "Memory Maintenance",
    shortLabel: "长期记忆整理",
    status: "REAL FAILURE · SHADOW V5 KEPT · PRODUCTION CLOSED",
    statusTone: "candidate",
    title: "把一次 13.9 分钟后的失败，拆成可定位、可复验的维护链。",
    summary: "真实月度整理 Run 在 834.945 秒后因未闭合 JSONL 记录失败。Luna Max 随后只在隔离 shadow fixture 上推进 v1→v5：前三个候选分别暴露 replay、布尔门禁与 Null embedding 缺陷；v5 才通过 5/5 整理决策、4/4 durable recall、1/1 临时任务拒记、rollback 与精确 baseline replay。生产记忆始终未打开。",
    metric: "834.945s",
    metricLabel: "真实失败被发现前的总耗时",
    Icon: Database,
    metrics: [
      ["Real maintenance", "Failed", "truncated JSONL"],
      ["V5 curation", "5 / 5", "4 keep · 1 reject"],
      ["V5 RAG", "4 / 4 + 1 / 1", "durable recall + abstain"],
      ["Recovery", "rollback + replay", "exact baseline"],
    ],
    events: [
      { id: "memory-failure", state: "failed", label: "真实维护 Run 失败", summary: "顶层 memory_curation span 运行约 13 分 54.945 秒后，Runtime Host 在第 687,529 个字符附近读到未闭合 JSONL 字符串。", evidence: "834.945s · unterminated JSONL" },
      { id: "memory-trace-gap", state: "blocked", label: "阶段 Trace 不足", summary: "现有 Trace 只有 started 与 failed，无法把截断继续归因到 Provider、stdout capture、parse、validate 或 apply。", evidence: "2 top-level events · no child span", evidenceHref: "/evidence/vertical-evals/trace-agent-skill-envelope-validation-20260901.v1.json" },
      { id: "memory-v1", state: "failed", label: "V1 · Replay 证据不等价", summary: "首次 curation 和 rollback 完成，但 replay 对比的是残留派生投影，而不是精确 pre-run baseline；因此拒绝。", evidence: "changed: initial eval harness · REJECT", evidenceHref: "/evidence/vertical-evals/memory-maintenance-validation-20260902.v1.json" },
      { id: "memory-v3", state: "failed", label: "V3 · 恢复正确、门禁实现错误", summary: "恢复到精确 baseline 后实质条件通过，但 replay.ok 被错误初始化为 false，且 dense lane 仍为 0；因此保留为 Reject。", evidence: "changed: recovery snapshot · REJECT", evidenceHref: "/evidence/vertical-evals/memory-maintenance-validation-20260902.v1.json" },
      { id: "memory-v4", state: "failed", label: "V4 · Null embedding", summary: "修正 replay 布尔门禁后 rollback/replay 通过，但 Null embedding 让 vectorCoverage 仍为 0，RAG 证据不完整。", evidence: "changed: replay gate · REJECT", evidenceHref: "/evidence/vertical-evals/memory-maintenance-validation-20260902.v1.json" },
      { id: "memory-v5", state: "passed", label: "V5 · Shadow Validation Keep", summary: "只改评测 harness：加入确定性本地 dense provider、精确 baseline replay 和无原文 JSON receipt。Luna 完成 5/5 决策；4 个 durable case 全召回，临时任务 1/1 拒记，rollback/replay 均通过。", evidence: "85.172s · 24,399 CLI tokens · cost unavailable", evidenceHref: "/evidence/vertical-evals/memory-maintenance-validation-20260902.v1.json" },
      { id: "memory-promotion", state: "blocked", label: "生产 Promotion 未开放", summary: "没有真实成功的修复后 Trace 与 Eval 前，不会改生产记忆、不会把 shadow 分数写成维护成功率。", evidence: "production mutation = false" },
    ],
    evidenceHref: "/evidence/vertical-evals/memory-maintenance-validation-20260902.v1.json",
    evidenceLabel: "打开 Memory v1–v5 完整回执",
    boundary: "v5 只证明固定五例 private-shadow Validation；四个 durable case 的最佳排名为 7、6、7、1，不能写成全 rank-1。没有 Held-out、生产写入、安装态验收或 USD 成本结论。",
  },
] as const;

const stateIcon = {
  passed: Check,
  failed: X,
  blocked: LockKeyhole,
  unknown: CircleAlert,
} satisfies Record<RunEvent["state"], LucideIcon>;

export function SandboxLabDetail() {
  const [activeId, setActiveId] = useState<RunId>("rag");
  const activeRun = labRuns.find((run) => run.id === activeId) ?? labRuns[0];
  const [eventByRun, setEventByRun] = useState<Record<RunId, string>>({
    rag: "rag-freeze",
    cloudops: "cloud-baseline",
    enterpriseops: "csm-invalid",
    memory: "memory-failure",
  });
  const selectedEvent = activeRun.events.find((event) => event.id === eventByRun[activeRun.id]) ?? activeRun.events[0];

  const selectRun = (id: RunId) => {
    setActiveId(id);
    window.requestAnimationFrame(() => document.getElementById(`vertical-lab-tab-${id}`)?.focus());
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = event.key === "ArrowRight"
      ? (index + 1) % labRuns.length
      : event.key === "ArrowLeft"
        ? (index - 1 + labRuns.length) % labRuns.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? labRuns.length - 1
            : null;
    if (target === null) return;
    event.preventDefault();
    selectRun(labRuns[target]?.id ?? "rag");
  };

  return (
    <DetailShell
      index="02 · 评测与自我优化 · 垂直沙盒"
      pageClassName="detail-page--vertical-lab"
      title="从真实执行证据，走到可授权修复，再用新 Trace / Eval 验证。"
      sub="同一个 PAW 基座承载四个可核验项目：企业知识检索、CloudOps 故障定位、EnterpriseOps 业务工作流与长期记忆整理。Trace Agent 不再冒充第五个业务场景，而是作为每个项目共享的只读 Reviewer。"
    >
      <section className="vertical-lab-intro" aria-labelledby="vertical-lab-intro-title">
        <div>
          <h2 id="vertical-lab-intro-title">四个真实项目，每个都有一张候选矩阵。</h2>
          <p>每条链都保留冻结数据、失败 run、host-only 评分和公开回执；模型与 Runtime 身份只在实际经过 Provider 的 Agent 链上单独绑定。模型可以提出判断，但不能改 gold、不能把失败删掉，也不能用一句“已完成”替代测试与运行证据。</p>
        </div>
        <ol aria-label="垂直 Agent 的统一验收链">
          <li><span>冻结输入</span><small>suite · split · hash</small></li>
          <li><ArrowRight size={14}/><span>Agent 执行</span><small>Session · Tool</small></li>
          <li><ArrowRight size={14}/><span>Host 评分</span><small>gold 不进 prompt</small></li>
          <li><ArrowRight size={14}/><span>证据收口</span><small>Trace · Eval · Sandbox</small></li>
        </ol>
        <aside><LockKeyhole size={18}/><span><strong>RAG Held-out 未消费；EnterpriseOps one-shot Held-out 已拒绝</strong><small>失败候选不会删除或重跑成好结果；CloudOps、EnterpriseOps 与 Memory 的 source-local candidate 都未安装，前台验收另算。</small></span></aside>
        <nav aria-label="公开脱敏评测回执">
          <a href="/evidence/vertical-evals/enterprise-rag-validation-20260831.v1.json" target="_blank">RAG receipt<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/enterprise-rag-answer-v16-reject-20260901.v1.json" target="_blank">Answer v16 Reject<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/enterprise-rag-answer-luna-max-validation-20260902.v1.json" target="_blank">Luna Max v20 Reject<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/enterprise-rag-tag-readiness-20260901.v1.json" target="_blank">Tag readiness<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/cloudops-agent-validation-20260901.v1.json" target="_blank">CloudOps receipt<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/cloudops-candidate-falsification-20260901.v1.json" target="_blank">CloudOps V1–V4<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/cloudops-luna-max-validation-reject-20260902.v1.json" target="_blank">CloudOps Luna Reject<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/enterpriseops-csm-suite-v2-summary-20260903.v2.json" target="_blank">EnterpriseOps suite-v2<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/enterpriseops-csm-trace-repairs-20260901.v1.json" target="_blank">CSM Trace repairs<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/memory-maintenance-validation-20260902.v1.json" target="_blank">Memory receipt<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/trace-agent-provider-bootstrap-20260901.v1.json" target="_blank">Trace receipt<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/trace-agent-skill-envelope-validation-20260901.v1.json" target="_blank">Trace Skill receipt<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/trace-defect-inventory-20260901.v1.json" target="_blank">Defect inventory<SquareArrowOutUpRight size={11}/></a>
          <a href="/evidence/vertical-evals/manifest.v1.json" target="_blank">Hash manifest<SquareArrowOutUpRight size={11}/></a>
        </nav>
      </section>

      <section className="vertical-lab-workbench" aria-labelledby="vertical-lab-workbench-title">
        <header>
          <div><Database size={19}/><span><h2 id="vertical-lab-workbench-title">选择一条真实运行，沿证据链检查。</h2><small>点击标签与时间线事件；所有公开文字均来自脱敏 receipt，不展示模型私有推理。</small></span></div>
          <b>Baseline = incumbent · VALIDATION LEDGER · 2026-09-02</b>
        </header>
        <div className="vertical-lab-tabs" role="tablist" aria-label="选择垂直 Agent 运行">
          {labRuns.map((run, index) => (
            <button
              aria-controls="vertical-lab-panel"
              aria-selected={activeRun.id === run.id}
              id={`vertical-lab-tab-${run.id}`}
              key={run.id}
              onClick={() => setActiveId(run.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              role="tab"
              tabIndex={activeRun.id === run.id ? 0 : -1}
              type="button"
            >
              <run.Icon size={17}/><span><strong>{run.label}</strong><small>{run.shortLabel}</small></span><b>{run.metric}</b>
            </button>
          ))}
        </div>

        <div aria-labelledby={`vertical-lab-tab-${activeRun.id}`} className="vertical-lab-panel" data-run={activeRun.id} id="vertical-lab-panel" key={activeRun.id} role="tabpanel">
          <header>
            <span data-tone={activeRun.statusTone}>{activeRun.status}</span>
            <div><h3>{activeRun.title}</h3><p>{activeRun.summary}</p></div>
            <aside><strong>{activeRun.metric}</strong><small>{activeRun.metricLabel}</small></aside>
          </header>

          <dl className="vertical-lab-metrics">
            {activeRun.metrics.map(([label, value, detail]) => <div key={label}><dt>{label}</dt><dd>{value}</dd><small>{detail}</small></div>)}
          </dl>

          <RunSnapshot runId={activeRun.id}/>

          <div className="vertical-lab-evidence-grid">
            <div className="vertical-lab-timeline">
              <span>REAL RUN TIMELINE</span>
              <ol>
                {activeRun.events.map((event) => {
                  const Icon = stateIcon[event.state];
                  return (
                    <li data-state={event.state} key={event.id}>
                      <button aria-pressed={selectedEvent.id === event.id} onClick={() => setEventByRun((current) => ({ ...current, [activeRun.id]: event.id }))} type="button">
                        <Icon size={14}/><span><strong>{event.label}</strong><small>{event.evidence}</small></span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
            <article className="vertical-lab-event" data-state={selectedEvent.state}>
              <header><TerminalSquare size={17}/><span><small>SELECTED EVIDENCE</small><strong>{selectedEvent.label}</strong></span></header>
              <p>{selectedEvent.summary}</p>
              <dl>
                <div><dt>状态</dt><dd>{selectedEvent.state}</dd></div>
                <div><dt>锚点</dt><dd>{selectedEvent.evidence}</dd></div>
                <div><dt>权威</dt><dd>{selectedEvent.state === "passed" ? "Runtime / deterministic receipt" : selectedEvent.state === "failed" ? "retained failure receipt" : "explicit evidence boundary"}</dd></div>
              </dl>
              <a href={selectedEvent.evidenceHref ?? activeRun.evidenceHref} target="_blank"><FileCheck2 size={14}/>{selectedEvent.evidenceHref ? "打开这条事件的专用回执" : activeRun.evidenceLabel}<SquareArrowOutUpRight size={12}/></a>
            </article>
          </div>
          <aside className="vertical-lab-reviewer">
            <ShieldCheck size={17}/><span><strong>Trace Agent · 共享 Reviewer</strong><small>逐候选检查失败归因、输入等价性、Trace 完整度、硬门禁与 unsupported claim；Reviewer 不能改 gold，也不能替代 Host verifier。</small></span>
            <a href="/evidence/vertical-evals/trace-defect-inventory-20260901.v1.json" target="_blank">查看审计账本<SquareArrowOutUpRight size={11}/></a>
          </aside>
          <footer><CircleAlert size={16}/><span><strong>不能越过的结论边界</strong><p>{activeRun.boundary}</p></span></footer>
        </div>
      </section>

      <section className="vertical-lab-loop" aria-labelledby="vertical-lab-loop-title">
        <header><div><GitCompareArrows size={19}/><span><h2 id="vertical-lab-loop-title">“Agent 自己变好”被拆成五个不同权力。</h2><small>诊断权不等于写权限；写入成功也不等于修复已验证。</small></span></div></header>
        <ol>
          <li><b>01</b><strong>冻结失败</strong><p>Session、Tool、Trace、Eval 与环境 hash 成为不可改的 source evidence。</p></li>
          <li><b>02</b><strong>只读诊断</strong><p>Trace Agent 区分 observation、hypothesis 与 conclusion，只生成 candidate repair。</p></li>
          <li><b>03</b><strong>用户授权</strong><p>用户选定 finding、owner 与 workspace roots，才创建独立 full-trust repair Session。</p></li>
          <li><b>04</b><strong>沙盒应用</strong><p>普通 Agent 产生 diff、test evidence 与 change receipt；approval Agent 独立仲裁。</p></li>
          <li><b>05</b><strong>同 Case 复检</strong><p>新 Trace / Eval 与 SandboxRun 通过后才可标 verified；输入不等价则禁止写提升。</p></li>
        </ol>
        <aside><ShieldCheck size={18}/><span><strong>PAW 的基座价值</strong><p>垂直应用不是换一套聊天 UI，而是复用同一组 Session、Tool authority、Trace、Eval、Sandbox、审批、恢复和回滚合同。</p></span></aside>
      </section>
    </DetailShell>
  );
}

function SnapshotColumns() {
  return (
    <div role="row" data-head="true">
      <strong role="columnheader">候选</strong>
      <span role="columnheader">改动层</span>
      <span role="columnheader">质量结果</span>
      <span role="columnheader">可靠性 / 门禁</span>
      <span role="columnheader">效率 / 成本</span>
      <code role="columnheader">决策</code>
    </div>
  );
}

function RunSnapshot({ runId }: { runId: RunId }) {
  if (runId === "enterpriseops") {
    return (
      <section className="vertical-lab-run-snapshot" aria-label="EnterpriseOps 修复前后与工作流候选对照">
        <header><h4>先修执行合同，再分别守住 Held-out 与模型质量门禁。</h4><p>每一行都保留：改变层、质量、可靠性、效率/成本和最终决策。</p></header>
        <div role="table">
          <SnapshotColumns/>
          <div role="row" data-state="failed"><strong role="cell">Invalid plumbing</strong><span role="cell">执行链</span><span role="cell">0/3 · 3/31</span><span role="cell">业务 Tool 未进入</span><span role="cell">0 Tool · 不可比</span><code role="cell">INVALID</code></div>
          <div role="row" data-state="passed"><strong role="cell">Repaired baseline</strong><span role="cell">Runtime + Tool + 权限</span><span role="cell">1/3 · 26/31</span><span role="cell">47/47 Tool · cleanup 3/3</span><span role="cell">376.4s</span><code role="cell">KEEP HARNESS</code></div>
          <div role="row"><strong role="cell">Suite-v2 baseline</strong><span role="cell">无</span><span role="cell">2/3 · 28/31</span><span role="cell">0 Tool failure</span><span role="cell">72 Tool · 529.35s</span><code role="cell">BASELINE</code></div>
          <div role="row" data-state="passed"><strong role="cell">State contract</strong><span role="cell">Workflow</span><span role="cell">3/3 · 31/31</span><span role="cell">cleanup 3/3</span><span role="cell">64 Tool · 758.44s</span><code role="cell">VALIDATION KEEP</code></div>
          <div role="row" data-state="failed"><strong role="cell">One-shot Held-out</strong><span role="cell">无调参</span><span role="cell">1/8 · 54/65</span><span role="cell">2 Tool fail · cleanup 8/8</span><span role="cell">140 Tool · 2015.24s</span><code role="cell">REJECT</code></div>
          <div role="row" data-state="failed"><strong role="cell">Luna V0</strong><span role="cell">Model</span><span role="cell">不可评分</span><span role="cell">Runtime 参数不兼容</span><span role="cell">0 Tool · 0 token</span><code role="cell">INVALID</code></div>
          <div role="row" data-state="failed"><strong role="cell">Legacy Luna</strong><span role="cell">Runtime（相对 V0）</span><span role="cell">3/3 · 31/31</span><span role="cell">对照 provenance 不匹配</span><span role="cell">不可作单变量成本结论</span><code role="cell">SUPERSEDED</code></div>
          <div role="row" data-state="passed"><strong role="cell">Controlled Sol</strong><span role="cell">匹配 incumbent</span><span role="cell">3/3 · 31/31</span><span role="cell">1 Tool fail 已恢复 · cleanup 3/3</span><span role="cell">87 Tool · 1112.65s · $3.2434</span><code role="cell">KEEP</code></div>
          <div role="row" data-state="failed"><strong role="cell">Controlled Luna</strong><span role="cell">Model only</span><span role="cell">2/3 · 30/31</span><span role="cell">0 Tool fail · cleanup 3/3</span><span role="cell">66 Tool · 929.66s · $0.7252</span><code role="cell">REJECT QUALITY</code></div>
        </div>
      </section>
    );
  }
  if (runId === "cloudops") {
    return (
      <section className="vertical-lab-run-snapshot" aria-label="CloudOps baseline 与四轮候选对照">
        <header><h4>同一冻结套件，Tool 合同与业务质量分别判。</h4><p>V1 没有正式分数；V2–V4 全部保留 Reject，不能只挑最好看的指标。</p></header>
        <div role="table">
          <SnapshotColumns/>
          <div role="row" data-state="passed"><strong role="cell">Baseline</strong><span role="cell">无</span><span role="cell">CA 1.00 · JRA .8333</span><span role="cell">98/98 Tool</span><span role="cell">98 Tool</span><code role="cell">KEEP</code></div>
          <div role="row" data-state="failed"><strong role="cell">V1 · search</strong><span role="cell">Tool</span><span role="cell">无正式分数</span><span role="cell">隐藏 Schema 限制</span><span role="cell">batch failed</span><code role="cell">RETAIN REJECT</code></div>
          <div role="row" data-state="failed"><strong role="cell">V2 · search fixed</strong><span role="cell">Tool</span><span role="cell">CA .8333 · JRA .8333</span><span role="cell">189/189 Tool</span><span role="cell">Tool +92.86%</span><code role="cell">REJECT</code></div>
          <div role="row" data-state="failed"><strong role="cell">V3 · bounded</strong><span role="cell">Workflow</span><span role="cell">CA .75 · JRA .75</span><span role="cell">1 Tool failure</span><span role="cell">82 Tool</span><code role="cell">REJECT</code></div>
          <div role="row" data-state="failed"><strong role="cell">V4 · short ID</strong><span role="cell">Tool</span><span role="cell">CA .50 · JRA .4167</span><span role="cell">94 / 94 Tool</span><span role="cell">94 Tool</span><code role="cell">REJECT · STOP</code></div>
          <div role="row" data-state="failed"><strong role="cell">Luna Max</strong><span role="cell">Model only</span><span role="cell">无 CA/JRA score</span><span role="cell">278 Tool · 14 failed</span><span role="cell">1,718.516s · 916,112 in · 57,057 out · cache 18,809,344</span><code role="cell">REJECT</code></div>
        </div>
      </section>
    );
  }
  if (runId === "memory") {
    return (
      <section className="vertical-lab-run-snapshot" aria-label="Memory Maintenance 真实失败与隔离候选对照">
        <header><h4>真实维护失败、shadow Validation 和生产修复是三条不同证据。</h4><p>v1/v3/v4 均保留 Reject；v5 只晋级为 private-shadow winner，生产门禁仍关闭。</p></header>
        <div role="table">
          <SnapshotColumns/>
          <div role="row" data-state="failed"><strong role="cell">Real monthly run</strong><span role="cell">无</span><span role="cell">任务失败</span><span role="cell">无 apply receipt</span><span role="cell">834.945s</span><code role="cell">JSONL TRUNCATED</code></div>
          <div role="row" data-state="failed"><strong role="cell">V1</strong><span role="cell">Eval harness</span><span role="cell">curation/rollback 可运行</span><span role="cell">replay 非等价</span><span role="cell">不可比较</span><code role="cell">REJECT</code></div>
          <div role="row" data-state="failed"><strong role="cell">V3</strong><span role="cell">Recovery</span><span role="cell">实质 replay 条件通过</span><span role="cell">布尔门禁错 · dense 0</span><span role="cell">不可晋级</span><code role="cell">REJECT</code></div>
          <div role="row" data-state="failed"><strong role="cell">V4</strong><span role="cell">Eval gate</span><span role="cell">rollback/replay pass</span><span role="cell">vector coverage 0</span><span role="cell">不可晋级</span><code role="cell">REJECT</code></div>
          <div role="row" data-state="passed"><strong role="cell">V5</strong><span role="cell">Eval harness</span><span role="cell">5/5 · recall 4/4 · abstain 1/1</span><span role="cell">dense 1.0 · rollback/replay pass</span><span role="cell">85.172s · 24,399 token · $N/A</span><code role="cell">KEEP SHADOW</code></div>
          <div role="row" data-state="failed"><strong role="cell">Production</strong><span role="cell">未改</span><span role="cell">未运行</span><span role="cell">DB 未打开 · Held-out 未消费</span><span role="cell">无账单</span><code role="cell">GATE CLOSED</code></div>
        </div>
      </section>
    );
  }
  return (
    <section className="vertical-lab-run-snapshot" aria-label="Enterprise RAG 检索与回答候选矩阵">
        <header><h4>检索 winner 进入回答链后，答案仍要单独过引用硬门。</h4><p>同一套 Luna Max Validation 的四条 answer-only lane 也保留在矩阵中；没有 Session 的 preflight 不能写成质量分。</p></header>
      <div role="table">
        <SnapshotColumns/>
        <div role="row"><strong role="cell">Lexical floor</strong><span role="cell">无</span><span role="cell">R@10 .6719 · MRR .6042</span><span role="cell">冻结 16 query</span><span role="cell">rerank 0</span><code role="cell">BASELINE</code></div>
        <div role="row" data-state="passed"><strong role="cell">Hybrid + Qwen3</strong><span role="cell">RAG</span><span role="cell">R@10 .9554 · MRR .8672</span><span role="cell">935/935 · 0 fallback</span><span role="cell">延迟待补</span><code role="cell">VALIDATION WINNER</code></div>
        <div role="row" data-state="failed"><strong role="cell">Answer baseline</strong><span role="cell">无</span><span role="cell">2/9 facts</span><span role="cell">citation support 0</span><span role="cell">6 Tool · 63.7s</span><code role="cell">REJECT</code></div>
        <div role="row" data-state="failed"><strong role="cell">Skill</strong><span role="cell">Skill</span><span role="cell">2/9 facts</span><span role="cell">citation support 0</span><span role="cell">7 Tool · 224.5s</span><code role="cell">REJECT</code></div>
        <div role="row" data-state="failed"><strong role="cell">Tuned</strong><span role="cell">RAG + Context</span><span role="cell">2/9 facts</span><span role="cell">citation support 0</span><span role="cell">7 Tool · 210.7s</span><code role="cell">REJECT</code></div>
        <div role="row" data-state="failed"><strong role="cell">Agentic</strong><span role="cell">Workflow</span><span role="cell">0/9 facts</span><span role="cell">terminal incomplete</span><span role="cell">13 Tool · 600.6s</span><code role="cell">REJECT</code></div>
        <div role="row" data-state="failed"><strong role="cell">V19b · TopK 20</strong><span role="cell">RAG</span><span role="cell">无分数</span><span role="cell">Metal preflight failed</span><span role="cell">0 Session · 0 Tool</span><code role="cell">INVALID</code></div>
        <div role="row" data-state="failed"><strong role="cell">Luna Max · baseline</strong><span role="cell">无（模型固定）</span><span role="cell">答案 2/4 · facts 2/9</span><span role="cell">citation hard gate FAIL · abstention PASS</span><span role="cell">51.578s · 25,778 tok · 6 Tool</span><code role="cell">REJECT</code></div>
        <div role="row" data-state="failed"><strong role="cell">Luna Max · Skill</strong><span role="cell">Skill</span><span role="cell">答案 2/4 · facts 2/9</span><span role="cell">citation hard gate FAIL · abstention PASS</span><span role="cell">208.064s · 74,769 tok · 7 Tool</span><code role="cell">REJECT</code></div>
        <div role="row" data-state="failed"><strong role="cell">Luna Max · tuned</strong><span role="cell">RAG + reranker</span><span role="cell">答案 2/4 · facts 2/9</span><span role="cell">citation hard gate FAIL · abstention PASS</span><span role="cell">182.437s · 88,941 tok · 7 Tool</span><code role="cell">REJECT</code></div>
        <div role="row" data-state="failed"><strong role="cell">Luna Max · agentic</strong><span role="cell">Workflow + sub-agent</span><span role="cell">答案 0/4 · facts 0/9</span><span role="cell">abstention · terminal · Tool contract FAIL</span><span role="cell">420.642s · 7,713 tok · 12 Tool</span><code role="cell">REJECT</code></div>
      </div>
    </section>
  );
}
