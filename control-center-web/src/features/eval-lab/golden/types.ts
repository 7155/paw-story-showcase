import type { ResearchWorkflow, RetrievalProfile } from '../projects/knowledge-types';
export type { ResearchWorkflow } from '../projects/knowledge-types';
export type ModelConfig = { provider: string; model: string; thinkingLevel: string; prompt: string };
export const goldenThinkingLevels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export const isGoldenThinkingLevel = (value: string) => goldenThinkingLevels.some((level) => level === value);
export const isRunnableGoldenModel = (value: ModelConfig) => Boolean(value.provider.trim() && value.model.trim() && isGoldenThinkingLevel(value.thinkingLevel));
export type GoldenSourceSupplement = {
  sourceId: string; corpusHash: string; quote: string; quoteStartChar: number; quoteEndChar: number;
  contextStartChar: number; contextEndChar: number; contextText: string; originalExcerpt: string;
  originalSourceId?: string; sourceSha256?: string; fullTextSha256?: string; pageStart?: number; pageEnd?: number;
};
export type GoldenSource = {
  sourceId: string; title: string; kind: 'document' | 'history' | 'failure'; uri: string; text: string;
  originalExcerpt?: string; supplements?: GoldenSourceSupplement[];
};
export type GoldenEvidence = { sourceId: string; quote: string };
export type Verdict = 'pass' | 'fail' | 'uncertain';
export type GoldenSample = {
  sampleId: string; answer: string; category: 'correct' | 'incorrect' | 'boundary';
  humanVerdict: Verdict | null; humanNote: string; labelAuthor?: 'human' | 'agent';
};
export type GoldenCase = {
  caseId: string; question: string; taskType: string; answerable: boolean;
  requiredFacts: string[]; evidence: GoldenEvidence[]; rubric: string[];
  split: 'development' | 'holdout';
  review: { status: 'pending' | 'approved' | 'rejected'; note: string; reviewedAtMs: number | null; author?: 'human' | 'agent' };
  samples: GoldenSample[];
};
export type QuoteNormalization = {
  evidenceIndex: number; sourceId: string; from: string; to: string; startChar: number; endChar: number;
  offsetUnit: string; alignmentPolicyVersion?: string; operations: Record<string, unknown>[];
};
export type QuoteNormalizationIssue = {
  evidenceIndex?: number; sourceId?: string; quote?: string; kind: string; reason: string; alignmentPolicyVersion?: string;
};
export type Judgment = {
  caseId: string; sampleId: string; verdict: Verdict; reason: string; evidence: GoldenEvidence[];
  rawVerdict?: Verdict; rawReason?: string; quoteNormalizations?: QuoteNormalization[];
  quoteNormalizationIssues?: QuoteNormalizationIssue[]; quoteAlignmentPolicyVersion?: string;
};
export type Calibration = {
  calibrationId: string; suiteRevision: number; judgeConfig: ModelConfig;
  judgeProtocolVersion?: string;
  judgments: Judgment[]; metrics: { total: number; comparable: number; agreement: number | null; falsePasses: number; falseFails: number; uncertain: number };
  ready: boolean; reasons: string[]; createdAtMs: number;
  labelAuthors?: { human: number; agent: number; unrecorded: number }; referenceAuthority?: 'human' | 'agent_assisted' | 'unrecorded';
  reprocessedFrom?: { jobId: string; calibrationId: string; suiteRevision: number; judgeProtocolVersion: string; quoteNormalizationPolicyVersion?: string };
  quoteNormalizationMode?: 'formatting_only'; quoteNormalizationPolicyVersion?: string;
  rejudgedFrom?: { jobId: string; calibrationId: string; suiteRevision: number; judgeProtocolVersion: string; caseId: string; sampleId: string; originalVerdict: Verdict; originalReason: string; originalJudgment?: Record<string, unknown>; originalReceipt?: Record<string, unknown>; originalReceiptRequestId?: string };
  rejudgeMode?: 'single_uncertain';
};
export type KnowledgeVariantInput = { indexId: string; profile: RetrievalProfile; workflow?: ResearchWorkflow };
export type KnowledgeBinding = { projectId?: string; indexId: string; corpusHash: string; documentCount: number; chunkCount: number; profile: Record<string, unknown>; chunking?: { strategy: string; size: number; overlap: number }; configHash?: string; workflowConfigHash?: string; workflow?: ResearchWorkflow };
export type GoldenSnapshot = {
  knowledge?: KnowledgeBinding;
  snapshotId: string; suiteId: string; version: number; sourceRevision: number; createdAtMs: number;
  developmentCount: number; holdoutCount: number; judgeConfig: ModelConfig;
  judgeProtocolVersion?: string;
};
export type GoldenJob = {
  jobId: string; kind: 'draft' | 'calibrate' | 'experiment';
  state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';
  progress: string; sessionId: string; error: string; result: Record<string, unknown> | null;
  runMode?: GoldenRunMode;
  caseIds?: string[];
  canReprocess?: boolean;
  canReprocessCalibration?: boolean;
  canRejudgeUncertainCalibration?: boolean;
  reprocessOnly?: boolean;
  reprocessKind?: 'calibration_quote_normalization';
  reprocessSourceJobId?: string;
  rejudgeOnly?: boolean;
  rejudgeKind?: 'uncertain_calibration';
  rejudgeSourceJobId?: string;
  rejudgeCaseId?: string;
  rejudgeSampleId?: string;
  rejudgeCount?: number;
  canCompleteDraft?: boolean;
  canRetryFailedCall?: boolean;
  createdAtMs: number; updatedAtMs: number;
};
export type GoldenSuite = {
  schemaVersion: 'rag-ime.agent-lab-golden-suite.v1'; suiteId: string; title: string; scenario: string;
  revision: number; targetCount: number; sources: GoldenSource[]; cases: GoldenCase[];
  judgeConfig: ModelConfig; calibration: Calibration | null; snapshot: GoldenSnapshot | null;
  jobs: GoldenJob[]; createdAtMs: number; updatedAtMs: number;
  currentJudgeProtocolVersion?: string;
  knowledge?: KnowledgeBinding;
  datasetProvenance?: { kind: string; totalCases: number; selectedCases: number; diagnosticSamples?: string };
};
export type GoldenRead = { ok: true; items: GoldenSuite[]; suite: GoldenSuite | null };
export type GoldenAction = 'create' | 'draft' | 'review_case' | 'label_sample' | 'judge_config' | 'calibrate' | 'freeze' | 'experiment' | 'supplement_source' | 'cancel' | 'resume' | 'reprocess_calibration' | 'rejudge_uncertain_calibration';
export type GoldenRunMode = 'full' | 'development_trial';
export type DevelopmentTrialSelection = {
  split: 'development';
  caseIds: string[];
  selectedCount: number;
  frozenDevelopmentCount: number;
  holdoutConsumed: false;
  paidCallPlan?: { answerCalls: number; planningCalls: number; judgeCalls: number; optimizationCalls: number; holdoutCalls: number; totalCalls: number; basis?: string; callUnit?: 'pi_turns'; modelCallsKnownInAdvance?: boolean };
};
export type GoldenCommand = {
  action: GoldenAction; suiteId?: string; expectedRevision: number; clientRequestId: string;
  input: Record<string, import('@/platform/transport').JsonValue>;
};
export type GoldenReceipt = { ok: true; suite: GoldenSuite; job: GoldenJob | null; clientRequestId: string; replayed: boolean; supplement?: { changed: boolean; alreadyPresent: boolean; record: GoldenSourceSupplement } };
export type CaseRun = {
  answer: string; status: 'graded' | 'runtime_error';
  judgment: { verdict: Verdict; reason: string; evidence: GoldenEvidence[]; quality?: QualityObservation };
  requestId: string; sessionId: string; turnId: string;
  retrieval?: { indexId: string; sourceCount: number; contextChars: number; sources: { sourceId: string; chunkId: string; excerpt?: string }[]; sourceMetrics?: RetrievalObservation };
};
export type RetrievalObservation = { schemaVersion: 'paw.golden.retrieval-quality.v1'; basis: 'frozen_reference_source_ids'; status: 'measured' | 'no_reference' | 'unmeasured';
  referenceSourceIds: string[]; retrievedSourceIds: string[] | null;
  counts: { referenceSources: number; retrievedSources: number | null; truePositive: number | null; falsePositive: number | null; falseNegative: number | null };
  metrics: Record<'precision' | 'recall' | 'f1', number | null>;
  cutoff: { kind: 'single_query_top_k' | 'multiquery_union' | 'adaptive_search_union'; perQueryTopK: number; maxQueries: number; actualQueries: number; contextTruncationApplied: false };
};
export type RetrievalSummary = { basis: 'frozen_reference_source_ids'; totalCases: number; observedCases: number; noReferenceCases: number; unmeasuredCases?: number;
  metrics: Record<'precision' | 'recall' | 'f1', { value: number | null; measuredCount: number; totalCount: number }>; aggregation: 'macro_over_reference_cases' };
export const qualityMetricKeys = ['factualAccuracy', 'referenceFactRecall', 'claimPrecision', 'claimF1', 'faithfulness', 'queryRelevance', 'citationCorrectness', 'abstentionCorrectness'] as const;
export type QualityMetricKey = typeof qualityMetricKeys[number];
export type QualityObservation = { status: 'measured' | 'unmeasured' | 'invalid'; basis: 'model_judged'; reason?: string; quoteAlignmentPolicyVersion?: string; metrics: Record<QualityMetricKey, number | null>; counts: Record<string, number | null>; facts: unknown[]; claims: unknown[]; citations: unknown[]; relevance: { score: number | null; reason: string } };
export type QualitySummary = { basis: 'model_judged'; totalCases: number; observedCases: number; metrics: Record<QualityMetricKey, { value: number | null; measuredCount: number; totalCount: number }> };
export type ExperimentMetrics = { quality?: QualitySummary; retrievalQuality?: RetrievalSummary; total: number; passed: number; failed: number; uncertain: number; runtimeErrors: number; passRate: number | null };
export type PhaseReport = {
  cases: { caseId: string; question: string; taskType: string; baseline: CaseRun; candidate: CaseRun }[];
  baselineMetrics: ExperimentMetrics; candidateMetrics: ExperimentMetrics;
  baselineUsage?: ExperimentUsage; candidateUsage?: ExperimentUsage; usageScope?: 'answer_calls_only' | 'planning_and_answer_calls';
  businessCost?: { basis: 'actual' | 'model_catalog_estimate' | 'unavailable'; baselineUsd: number | null; candidateUsd: number | null; deltaUsd: number | null; reductionFraction: number | null; baselineCostPerSuccessUsd: number | null; candidateCostPerSuccessUsd: number | null };
};
export type ExperimentUsage = {
  calls: number; inputTokens: number | null; outputTokens: number | null; totalTokens: number | null;
  modelCallCount?: number | null; knownModelCallCount?: number | null; modelCallCountComplete?: boolean;
  toolCallCount?: number | null; knownToolCallCount?: number | null; toolCallCountComplete?: boolean;
  costUsd: number | null; knownCostUsd: number | null; pricedCalls: number;
  tokensComplete: boolean; costComplete: boolean; source: 'runtime_receipts';
  estimatedCostUsd?: number | null; knownEstimatedCostUsd?: number | null; estimatedPricedCalls?: number; estimateComplete?: boolean;
  cacheReadTokens?: number | null; cacheWriteTokens?: number | null;
  knownInputTokens?: number | null; knownOutputTokens?: number | null;
  knownCacheReadTokens?: number | null; knownCacheWriteTokens?: number | null; knownTotalTokens?: number | null;
  inputTokensComplete?: boolean; outputTokensComplete?: boolean;
  cacheReadTokensComplete?: boolean; cacheWriteTokensComplete?: boolean; totalTokensComplete?: boolean;
  allTokenFieldsComplete?: boolean; elapsedMs?: number | null; knownElapsedMs?: number | null;
  elapsedMsComplete?: boolean; elapsedComplete?: boolean; callCountScope?: 'settled_receipts' | string;
};
export type ExperimentResult = {
  referenceAuthority?: 'human' | 'agent_assisted' | 'unrecorded';
  labelAuthors?: { human: number; agent: number; unrecorded: number } | null;
  schemaVersion: 'rag-ime.agent-lab-golden-experiment.v1'; suiteId: string; snapshotId: string;
  executionMode: 'context_qa' | 'knowledge_qa'; optimizationScope: 'prompt' | 'workflow'; judgeConfig: ModelConfig;
  runMode?: GoldenRunMode;
  caseSelection?: DevelopmentTrialSelection;
  baseline: ModelConfig; candidate: ModelConfig; development: PhaseReport; holdout: PhaseReport | null;
  overall?: { baselineMetrics: ExperimentMetrics; candidateMetrics: ExperimentMetrics; scope?: string };
  knowledgeVariants?: { baseline: KnowledgeBinding; candidate: KnowledgeBinding };
  retrievalStages?: Record<'baseline' | 'candidate', { caseCount: number; packetCount: number; sharedPacketCount: number; timedPacketCount: number; meanPacketLatencyMs: number | null; totalPacketLatencyMs: number | null; sourceCount: number; contextChars: number; plannerCalls?: number; searchCount?: number | null; sourceReadCount?: number | null; toolCallCount?: number | null }>;
  optimization: { enabled: boolean; maxCandidates: number; selectedCandidateIndex: number; proposals: { candidateIndex: number; modelConfig: ModelConfig; developmentMetrics: ExperimentMetrics; selected: boolean; proposalRequestId: string }[] };
  comparison: { decision: 'improved' | 'no_improvement' | 'inconclusive'; comparable: boolean | number; developmentDelta: number | null; holdoutDelta: number | null; reasons: string[]; sameSnapshot: true; goldenChanged: false; improvementBasis?: 'quality' | 'answer_cost' | 'answer_cost_estimate' | null; evidenceScope?: 'development_only' | 'development_and_holdout'; groupRegressions?: unknown[] };
  receipts: { requestId: string; stage: string; sessionId: string; turnId: string; usage: unknown; receipt: unknown }[];
  usage: ExperimentUsage;
  validationUse?: { snapshotId: string; ordinal: number; priorStartedRuns: number; priorCompletedRuns: number; reused: boolean; overlappingQuestionCount?: number; totalQuestions?: number; startedAtMs: number; scope: 'local_lab_validation_entry' };
  usageByScope?: Partial<Record<'baselineAnswers' | 'candidateAnswers' | 'baselinePlanning' | 'candidatePlanning' | 'judging' | 'optimization' | 'drafting' | 'calibration', ExperimentUsage>>;
};

export const blankModel = (): ModelConfig => ({ provider: '', model: '', thinkingLevel: '', prompt: '' });
export const isActiveJob = (job: GoldenJob) => job.state === 'queued' || job.state === 'running';
export const verdictLabel: Record<Verdict, string> = { pass: '通过', fail: '不通过', uncertain: '无法判定' };
export const splitLabel = { development: '开发题', holdout: '留出题' };
export const categoryLabel = { correct: '正确样例', incorrect: '错误样例', boundary: '边界样例' };
export const jobLabel = { draft: '起草题目', calibrate: '校准评审', experiment: '运行实验' };
export const jobStateLabel = { queued: '排队中', running: '进行中', completed: '已完成', failed: '失败', cancelled: '已停止', interrupted: '已中断' };
export const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
const fields = (value: Record<string, unknown>, keys: string[]) => keys.every((key) => typeof value[key] === 'string');
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nullableNumber = (value: unknown) => value === null || number(value);
const verdict = (value: unknown) => value === 'pass' || value === 'fail' || value === 'uncertain';
const model = (value: unknown) => fields(object(value), ['provider', 'model', 'thinkingLevel', 'prompt']);
const evidence = (value: unknown) => Array.isArray(value) && value.every((item) => fields(object(item), ['sourceId', 'quote']));
const nonNegativeInteger = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
const sameStringSet = (left: unknown, right: unknown) => {
  if (!Array.isArray(left) || !Array.isArray(right) || !left.every((item) => typeof item === 'string') || !right.every((item) => typeof item === 'string')) return false;
  const leftValues = left as string[]; const rightValues = right as string[];
  return leftValues.length === rightValues.length && new Set(leftValues).size === leftValues.length
    && new Set(rightValues).size === rightValues.length && leftValues.every((item) => rightValues.includes(item));
};

export function isGoldenJob(value: unknown): value is GoldenJob {
  const job = object(value);
  return fields(job, ['jobId', 'progress', 'sessionId', 'error']) && job.jobId !== ''
    && ['draft', 'calibrate', 'experiment'].includes(String(job.kind))
    && ['queued', 'running', 'completed', 'failed', 'cancelled', 'interrupted'].includes(String(job.state))
    && (job.runMode === undefined || job.runMode === 'full' || job.runMode === 'development_trial')
    && (job.caseIds === undefined || (Array.isArray(job.caseIds) && job.caseIds.every((item) => typeof item === 'string' && item.length > 0)))
    && (job.canReprocess === undefined || typeof job.canReprocess === 'boolean')
    && (job.canReprocessCalibration === undefined || typeof job.canReprocessCalibration === 'boolean')
    && (job.canRejudgeUncertainCalibration === undefined || typeof job.canRejudgeUncertainCalibration === 'boolean')
    && (job.reprocessOnly === undefined || typeof job.reprocessOnly === 'boolean')
    && (job.reprocessKind === undefined || job.reprocessKind === 'calibration_quote_normalization')
    && (job.reprocessSourceJobId === undefined || typeof job.reprocessSourceJobId === 'string')
    && (job.rejudgeOnly === undefined || typeof job.rejudgeOnly === 'boolean')
    && (job.rejudgeKind === undefined || job.rejudgeKind === 'uncertain_calibration')
    && (job.rejudgeSourceJobId === undefined || typeof job.rejudgeSourceJobId === 'string')
    && (job.rejudgeCaseId === undefined || typeof job.rejudgeCaseId === 'string')
    && (job.rejudgeSampleId === undefined || typeof job.rejudgeSampleId === 'string')
    && (job.rejudgeCount === undefined || nonNegativeInteger(job.rejudgeCount))
    && (job.canCompleteDraft === undefined || typeof job.canCompleteDraft === 'boolean')
    && (job.canRetryFailedCall === undefined || typeof job.canRetryFailedCall === 'boolean')
    && (job.result === null || (typeof job.result === 'object' && !Array.isArray(job.result)))
    && number(job.createdAtMs) && number(job.updatedAtMs);
}

export function isGoldenSuite(value: unknown): value is GoldenSuite {
  const suite = object(value);
  const calibration = object(suite.calibration);
  const snapshot = object(suite.snapshot);
  return suite.schemaVersion === 'rag-ime.agent-lab-golden-suite.v1'
    && fields(suite, ['suiteId', 'title', 'scenario']) && suite.suiteId !== ''
    && Number.isSafeInteger(suite.revision) && Number(suite.revision) >= 0 && number(suite.targetCount)
    && model(suite.judgeConfig) && number(suite.createdAtMs) && number(suite.updatedAtMs)
    && Array.isArray(suite.sources) && suite.sources.every((source) => {
      const row = object(source);
      return fields(row, ['sourceId', 'title', 'uri', 'text']) && ['document', 'history', 'failure'].includes(String(row.kind));
    })
    && Array.isArray(suite.cases) && suite.cases.every((item) => {
      const row = object(item); const review = object(row.review);
      return fields(row, ['caseId', 'question', 'taskType']) && typeof row.answerable === 'boolean'
        && strings(row.requiredFacts) && strings(row.rubric) && evidence(row.evidence)
        && ['development', 'holdout'].includes(String(row.split))
        && ['pending', 'approved', 'rejected'].includes(String(review.status)) && typeof review.note === 'string'
        && nullableNumber(review.reviewedAtMs) && Array.isArray(row.samples) && row.samples.every((sample) => {
          const value = object(sample);
          return fields(value, ['sampleId', 'answer', 'humanNote']) && ['correct', 'incorrect', 'boundary'].includes(String(value.category))
            && (value.humanVerdict === null || verdict(value.humanVerdict));
        });
    })
    && Array.isArray(suite.jobs) && suite.jobs.every(isGoldenJob)
    && (suite.calibration === null || (fields(calibration, ['calibrationId']) && number(calibration.suiteRevision)
      && model(calibration.judgeConfig) && typeof calibration.ready === 'boolean' && strings(calibration.reasons)
      && Array.isArray(calibration.judgments) && calibration.judgments.every((item) => {
        const row = object(item); return fields(row, ['caseId', 'sampleId', 'reason']) && verdict(row.verdict) && evidence(row.evidence);
      }) && ['total', 'comparable', 'falsePasses', 'falseFails', 'uncertain'].every((key) => number(object(calibration.metrics)[key]))
      && nullableNumber(object(calibration.metrics).agreement) && number(calibration.createdAtMs)))
    && (suite.snapshot === null || (fields(snapshot, ['snapshotId', 'suiteId']) && model(snapshot.judgeConfig)
      && ['version', 'sourceRevision', 'createdAtMs', 'developmentCount', 'holdoutCount'].every((key) => number(snapshot[key]))));
}

export function parseGoldenRead(value: unknown, expectedSuiteId = ''): GoldenRead {
  const read = object(value);
  if (read.ok !== true || !Array.isArray(read.items) || !read.items.every(isGoldenSuite)
    || !(read.suite === null || isGoldenSuite(read.suite))
    || (expectedSuiteId && object(read.suite).suiteId !== expectedSuiteId)) throw new Error('评测集状态不完整，请重新读取。');
  return read as GoldenRead;
}

export function isExperimentResult(value: unknown): value is ExperimentResult {
  const result = object(value); const comparison = object(result.comparison);
  const validation = object(result.validationUse);
  const runMode: GoldenRunMode = result.runMode === 'development_trial' ? 'development_trial' : 'full';
  const selection = object(result.caseSelection);
  const selectionCaseIds = Array.isArray(selection.caseIds) ? selection.caseIds : [];
  const developmentCases = object(result.development).cases;
  const developmentCaseIds = Array.isArray(developmentCases)
    ? developmentCases.map((item: unknown) => object(item).caseId)
    : [];
  const paidCallPlan = object(selection.paidCallPlan);
  const paidCallFields = ['answerCalls', 'planningCalls', 'judgeCalls', 'optimizationCalls', 'holdoutCalls', 'totalCalls'];
  const validPaidCallPlan = selection.paidCallPlan === undefined || (
    paidCallFields.every((field) => nonNegativeInteger(paidCallPlan[field]))
    && Number(paidCallPlan.totalCalls) === paidCallFields.slice(0, -1).reduce((sum, field) => sum + Number(paidCallPlan[field]), 0)
    && (paidCallPlan.basis === undefined || typeof paidCallPlan.basis === 'string')
  );
  const metrics = (value: unknown) => {
    const row = object(value); const quality = object(row.quality);
    const retrieval = object(row.retrievalQuality);
    return ['total', 'passed', 'failed', 'uncertain', 'runtimeErrors'].every((key) => number(row[key])) && nullableNumber(row.passRate)
      && (row.retrievalQuality === undefined || (retrieval.basis === 'frozen_reference_source_ids' && retrieval.aggregation === 'macro_over_reference_cases'
        && retrieval.totalCases === row.total && number(retrieval.observedCases) && Number(retrieval.observedCases) >= 0 && Number(retrieval.observedCases) <= Number(row.total)
        && number(retrieval.noReferenceCases) && Number(retrieval.noReferenceCases) >= 0 && Number(retrieval.noReferenceCases) <= Number(row.total)
        && ['precision', 'recall', 'f1'].every((key) => {
          const metric = object(object(retrieval.metrics)[key]);
          return nullableNumber(metric.value) && (metric.value === null || (Number(metric.value) >= 0 && Number(metric.value) <= 1))
            && Number.isSafeInteger(metric.measuredCount) && Number(metric.measuredCount) >= 0 && Number(metric.measuredCount) <= Number(row.total)
            && metric.measuredCount === retrieval.observedCases && metric.totalCount === row.total && (metric.measuredCount !== 0 || metric.value === null);
        })))
      && (row.quality === undefined || (quality.basis === 'model_judged' && quality.totalCases === row.total
        && number(quality.observedCases) && quality.observedCases >= 0 && quality.observedCases <= Number(row.total)
        && qualityMetricKeys.every((key) => {
          const metric = object(object(quality.metrics)[key]);
          return nullableNumber(metric.value) && (metric.value === null || (Number(metric.value) >= 0 && Number(metric.value) <= 1))
            && Number.isSafeInteger(metric.measuredCount) && Number(metric.measuredCount) >= 0 && Number(metric.measuredCount) <= Number(row.total)
            && metric.totalCount === row.total && (metric.measuredCount !== 0 || metric.value === null);
        })));
  };
  const knowledge = (value: unknown) => {
    const row = object(value);
    return fields(row, ['indexId', 'corpusHash']) && number(row.documentCount) && number(row.chunkCount)
      && typeof row.profile === 'object' && row.profile !== null && !Array.isArray(row.profile);
  };
  const phase = (value: unknown) => {
    const report = object(value);
    return metrics(report.baselineMetrics) && metrics(report.candidateMetrics) && Array.isArray(report.cases) && report.cases.every((value) => {
      const row = object(value);
      return fields(row, ['caseId', 'question', 'taskType']) && ['baseline', 'candidate'].every((key) => {
        const run = object(row[key]); const judgment = object(run.judgment);
        return fields(run, ['answer', 'requestId', 'sessionId', 'turnId']) && ['graded', 'runtime_error'].includes(String(run.status))
          && verdict(judgment.verdict) && typeof judgment.reason === 'string' && evidence(judgment.evidence);
      });
    });
  };
  const validTrialSelection = result.runMode === 'development_trial'
    && selection.split === 'development' && selection.holdoutConsumed === false
    && Array.isArray(selection.caseIds) && selection.caseIds.length > 0 && selection.caseIds.length <= 16
    && selection.caseIds.every((item) => typeof item === 'string' && item.length > 0)
    && new Set(selection.caseIds).size === selection.caseIds.length
    && Number.isSafeInteger(selection.selectedCount) && Number(selection.selectedCount) === selection.caseIds.length && Number(selection.selectedCount) > 0
    && Number.isSafeInteger(selection.frozenDevelopmentCount) && Number(selection.frozenDevelopmentCount) >= Number(selection.selectedCount)
    && sameStringSet(selectionCaseIds, developmentCaseIds) && validPaidCallPlan;
  const validTrialComparison = result.runMode !== 'development_trial'
    || (comparison.decision === 'inconclusive' && comparison.evidenceScope === 'development_only' && comparison.holdoutDelta === null && result.validationUse === undefined);
  return result.schemaVersion === 'rag-ime.agent-lab-golden-experiment.v1' && fields(result, ['suiteId', 'snapshotId'])
    && ['context_qa', 'knowledge_qa'].includes(String(result.executionMode)) && ['prompt', 'workflow'].includes(String(result.optimizationScope))
    && (result.runMode === undefined || result.runMode === 'full' || result.runMode === 'development_trial')
    && (result.validationUse === undefined || (Number.isSafeInteger(validation.ordinal) && Number(validation.ordinal) > 0 && typeof validation.reused === 'boolean'
      && number(validation.priorStartedRuns) && number(validation.priorCompletedRuns) && number(validation.startedAtMs)
      && (validation.overlappingQuestionCount === undefined || number(validation.overlappingQuestionCount))))
    && model(result.baseline) && model(result.candidate) && model(result.judgeConfig)
    && phase(result.development) && (runMode === 'development_trial' ? validTrialSelection && validTrialComparison && result.holdout === null : phase(result.holdout))
    && (result.overall === undefined || (metrics(object(result.overall).baselineMetrics) && metrics(object(result.overall).candidateMetrics)))
    && (result.knowledgeVariants === undefined || (knowledge(object(result.knowledgeVariants).baseline) && knowledge(object(result.knowledgeVariants).candidate)))
    && (result.retrievalStages === undefined || ['baseline', 'candidate'].every((key) => {
      const row = object(object(result.retrievalStages)[key]);
      return ['caseCount', 'packetCount', 'sharedPacketCount', 'timedPacketCount', 'sourceCount', 'contextChars'].every((field) => number(row[field]))
        && nullableNumber(row.meanPacketLatencyMs) && nullableNumber(row.totalPacketLatencyMs);
    }))
    && ['improved', 'no_improvement', 'inconclusive'].includes(String(comparison.decision))
    && strings(comparison.reasons) && nullableNumber(comparison.developmentDelta) && nullableNumber(comparison.holdoutDelta)
    && comparison.sameSnapshot === true && comparison.goldenChanged === false
    && Array.isArray(result.receipts) && result.receipts.every((receipt) => fields(object(receipt), ['requestId', 'stage', 'sessionId', 'turnId']))
    && Array.isArray(object(result.optimization).proposals)
    && number(object(result.usage).calls);
}
