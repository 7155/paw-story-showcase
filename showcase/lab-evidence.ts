import snapshot from "../paw-story-demo/public/evidence/vertical-evals/agent-lab-current-20260905.v1.json";

export type LabKey = "enterpriseops" | "rag" | "cloudops" | "memory";
export function labScenario(value: unknown): LabKey {
  return value === "rag" || value === "cloudops" || value === "memory" ? value : "enterpriseops";
}
type Metrics = Record<string, number | undefined>;
type PublicStage = { stage: string; runId: string; decision: string; costUsd: number; metrics: Metrics };
type PublicExperiment = {
  key: string; id: string; title: string; businessProblem: string; decision: string;
  dataset: { split: string; caseCount: number; unit: string; manifestSha256: string };
  baseline: { runId: string; metrics: Metrics }; candidate: { runId: string; metrics: Metrics };
  stages: PublicStage[]; factors: { name: string; before: string; after: string; reason: string }[];
  frozenControls: { name: string; value: string; reason: string }[]; hardGates: string[];
  costAuthority: string; costDecreasePercent: number; promptAdaptationNeeded: boolean;
  validationBoundary: { candidateAware?: boolean; syntheticFixture?: boolean }; openGaps: string[];
  evidence: { file: string; sha256: string }[];
};

const presentation: Record<LabKey, { label: string; change: string }> = {
  enterpriseops: { label: "EnterpriseOps", change: "明确角色、地区与任期约束，优先遵守已选 Tool 的精确枚举。" },
  rag: { label: "Enterprise RAG", change: "分解事实缺口、轮转补充检索，并逐项检查主张与引用。" },
  cloudops: { label: "CloudOps", change: "精确查找证据族，先确认 owner 再判断机制，仍有关键歧义时停止。" },
  memory: { label: "Memory Maintenance", change: "固定 Prompt、上下文与数据，仅替换模型；无需额外 Prompt 适配。" },
};
const stageLabels: Record<string, string> = {
  sol_baseline: "Sol 基线", luna_model_only: "Luna · 仅换模型",
  luna_prompt_adapted: "Luna · 通用 Prompt", luna_prompt_v4: "Luna · Prompt-v4",
};

function metric(values: Metrics, key: string): number {
  const value = values[key];
  if (value === undefined || !Number.isFinite(value)) throw new Error(`Missing public Lab metric: ${key}`);
  return value;
}
const percent = (value: number) => `${Number((value * 100).toFixed(2))}%`;
export const formatLabCost = (value: number) => `$${value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")}`;
export const currentLabEvidenceHref = "/evidence/vertical-evals/agent-lab-current-20260905.v1.json";
export const labBenefitBoundary = "API 成本为估算，非 Provider 账单；多 Agent 尚无同预算 matched A/B 收益比例。";

function quality(e: PublicExperiment, values: Metrics): string {
  if (e.key === "enterpriseops") return `${metric(values, "taskSuccessCount")}/${e.dataset.caseCount} 任务 · ${metric(values, "verifierPassCount")}/${metric(e.baseline.metrics, "verifierCount")} 验收`;
  if (e.key === "rag") return `${metric(values, "exactCitationFactsCovered")}/${metric(values, "citationFactCount")} 引用事实 · ${Math.round(metric(values, "agentSuccessRate") * e.dataset.caseCount)}/${e.dataset.caseCount} 任务`;
  if (e.key === "cloudops") {
    const fa = metric(values, "fa"), jra = metric(values, "jra");
    return `CA ${percent(metric(values, "ca"))} · ${fa === jra ? `FA/JRA ${percent(jra)}` : `FA ${percent(fa)} · JRA ${percent(jra)}`}`;
  }
  if (e.dataset.split === "synthetic_validation") return `${metric(values, "modelDecisionCount")} 次整理决策 · ${metric(values, "governedCurrentAtomCount")} 个受治理 atom · 检索门禁${metric(values, "retrievalPassed") ? "通过" : "失败"}`;
  return `${metric(values, "curationPassed")}/${metric(values, "curationCases")} 整理 · ${metric(values, "durableRecallPassed")}/${metric(values, "durableRecallTotal")} 长期召回 · ${metric(values, "abstentionPassed")}/${metric(values, "abstentionTotal")} 拒记`;
}

function project(e: PublicExperiment) {
  if (!(e.key in presentation)) throw new Error(`Unknown public Lab scenario: ${e.key}`);
  const key = e.key as LabKey;
  const scope = e.validationBoundary.syntheticFixture ? "Pi 合成数据单轮验证" : e.validationBoundary.candidateAware ? "candidate-aware Validation · r6" : e.dataset.split === "shadow_validation" ? "private-shadow Validation" : "单轮 Validation";
  const costLabel = ["runtime_cost_reconciled", "runtime_cost_reconciled_estimate"].includes(e.costAuthority) ? "Runtime 用量对账估算" : "reported usage 确定性定价估算";
  return {
    ...e, ...presentation[key], key, scope, costLabel,
    qualityBefore: quality(e, e.baseline.metrics), qualityAfter: quality(e, e.candidate.metrics),
    costBefore: formatLabCost(metric(e.baseline.metrics, "apiCostUsd")), costAfter: formatLabCost(metric(e.candidate.metrics, "apiCostUsd")),
    saving: `${e.costDecreasePercent.toFixed(2)}%`,
    stages: e.stages.map(stage => ({
      ...stage, label: stageLabels[stage.stage] ?? stage.stage,
      change: stage.stage === "sol_baseline" ? "冻结基线" : stage.stage === "luna_model_only" ? "Model" : "Prompt（Luna 固定）",
      quality: quality(e, stage.metrics), cost: formatLabCost(stage.costUsd),
      reliability: stage.metrics.toolCalls !== undefined
        ? `${metric(stage.metrics, "toolCalls") - metric(stage.metrics, "failedToolCalls")}/${metric(stage.metrics, "toolCalls")} Tool 成功`
        : key === "memory" ? `回滚 ${metric(stage.metrics, "rollbackPassed") ? "通过" : "失败"} · 重放 ${metric(stage.metrics, "replayPassed") ? "通过" : "失败"}` : "引用硬门先于成本",
    })),
  };
}

const publicExperiments: PublicExperiment[] = snapshot.experiments;
export const currentLabExperiments = publicExperiments.map(project);
export type CurrentLabExperiment = (typeof currentLabExperiments)[number];
export function currentLabExperiment(key: LabKey) {
  const result = currentLabExperiments.find(experiment => experiment.key === key);
  if (!result) throw new Error(`Current public Lab scenario is absent: ${key}`);
  return result;
}
