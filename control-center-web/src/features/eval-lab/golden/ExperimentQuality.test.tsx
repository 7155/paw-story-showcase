import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ControlTransportProvider } from '@/app/control-transport';
import { MockControlTransport } from '@/test/mock-transport';
import { defaultRetrieval } from '../projects/knowledge-types';
import { GoldenExperiment } from './Experiment';
import { QualityComparison, RetrievalComparison } from './QualityComparison';
import { isExperimentResult, qualityMetricKeys, type ExperimentMetrics, type GoldenSuite } from './types';

const readProject = vi.hoisted(() => vi.fn());
vi.mock('../projects/api', () => ({ readLabProject: readProject }));
afterEach(() => { cleanup(); sessionStorage.clear(); vi.clearAllMocks(); });
const model = { provider: 'test', model: 'test', thinkingLevel: 'high', prompt: '' };
const binding = { projectId: 'project-1', indexId: 'index-1', corpusHash: 'same-corpus', documentCount: 20, chunkCount: 500, profile: defaultRetrieval };
const suite: GoldenSuite = { schemaVersion: 'rag-ime.agent-lab-golden-suite.v1', suiteId: 'suite-1', title: '论文回答', scenario: '论文', revision: 1, targetCount: 48, sources: [], cases: [], judgeConfig: model, calibration: null, jobs: [], createdAtMs: 1, updatedAtMs: 2, knowledge: binding,
  snapshot: { snapshotId: 'snapshot-1', suiteId: 'suite-1', version: 1, sourceRevision: 1, createdAtMs: 1, developmentCount: 36, holdoutCount: 12, judgeConfig: model, knowledge: binding } };
const metrics: ExperimentMetrics = { total: 48, passed: 30, failed: 18, uncertain: 0, runtimeErrors: 0, passRate: 30 / 48 };
const quality = (value: number | null, count: number) => ({ basis: 'model_judged' as const, totalCases: 48, observedCases: count,
  metrics: Object.fromEntries(qualityMetricKeys.map((key) => [key, { value, measuredCount: count, totalCount: 48 }])) as NonNullable<ExperimentMetrics['quality']>['metrics'] });

describe('Golden quality and workflow configuration', () => {
  it('shows measured denominators and N/A without turning missing observations into zero or an improvement', () => {
    render(<QualityComparison title="全部冻结题" baseline={{ ...metrics, quality: quality(null, 0) }} candidate={{ ...metrics, quality: quality(.8, 12) }} />);
    const row = screen.getByRole('row', { name: /事实准确率/ });
    expect(within(row).getByText('N/A')).toBeInTheDocument();
    expect(within(row).getByText('0 / 48 题有效')).toBeInTheDocument();
    expect(within(row).getByText('80%')).toBeInTheDocument();
    expect(within(row).getByText('12 / 48 题有效')).toBeInTheDocument();
    expect(within(row).queryByText('0%')).not.toBeInTheDocument();
    expect(screen.queryByText(/\+80/)).not.toBeInTheDocument();
  });

  it('does not invent quality values for historical pass-rate-only reports', () => {
    const { container } = render(<QualityComparison title="开发题" baseline={metrics} candidate={metrics} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('separates raw source retrieval scores from answer quality and preserves missing denominators', () => {
    const retrieval = (value: number | null, measuredCount: number) => ({ basis: 'frozen_reference_source_ids' as const,
      totalCases: 48, observedCases: measuredCount, noReferenceCases: 0, aggregation: 'macro_over_reference_cases' as const,
      metrics: { precision: { value, measuredCount, totalCount: 48 }, recall: { value, measuredCount, totalCount: 48 }, f1: { value, measuredCount, totalCount: 48 } } });
    render(<RetrievalComparison title="全部冻结题" baseline={{ ...metrics, retrievalQuality: retrieval(null, 0) }} candidate={{ ...metrics, retrievalQuality: retrieval(.5, 24) }} />);
    const row = screen.getByRole('row', { name: /来源 F1/u });
    expect(within(row).getByText('N/A')).toBeVisible();
    expect(within(row).getByText('0 / 48 题有效')).toBeVisible();
    expect(within(row).getByText('50%')).toBeVisible();
    expect(within(row).getByText('24 / 48 题有效')).toBeVisible();
    expect(screen.getByText(/Precision 分母为实际返回来源数/u)).toBeVisible();
    expect(screen.queryByText('事实 F1')).not.toBeInTheDocument();
  });

  it('reads only the suite project and submits same-corpus selected index and actual retrieval parameters', async () => {
    const index = (jobId: string, corpusHash: string) => ({ jobId, corpusId: 'corpus-1', corpusHash, title: jobId, documentCount: 20, chunkCount: 400, configHash: jobId, chunking: { strategy: 'markdown', size: 1600, overlap: 200 }, dense: { available: true, provider: { semantic: true, provider: 'configured', model: `/private/cache/models--ibm-granite--granite-embedding-${jobId === 'index-2' ? '311m' : '97m'}-multilingual-r2/snapshots/revision` }, vectorCount: 400 }, reranker: { configured: true } });
    readProject.mockResolvedValue({ knowledge: { schemaVersion: 'paw.lab-knowledge-resource.v1', indexes: [index('index-1', 'same-corpus'), index('index-2', 'same-corpus'), index('unrelated', 'other-corpus')], corpora: [], datasets: [], evaluations: [], jobs: [], embedding: { provider: '', model: '' } } });
    const onExperiment = vi.fn(async () => true);
    render(<ControlTransportProvider transport={new MockControlTransport()}><GoldenExperiment suite={suite} disabled={false} onFreeze={vi.fn()} onExperiment={onExperiment} /></ControlTransportProvider>);
    await waitFor(() => expect(screen.getAllByRole('option', { name: /index-2/ })).toHaveLength(2));
    expect(readProject).toHaveBeenCalledWith(expect.anything(), 'project-1', '', undefined, expect.any(AbortSignal));
    expect(screen.getAllByRole('option', { name: /ibm-granite\/granite-embedding-311m-multilingual-r2/ })).toHaveLength(2);
    expect(screen.getAllByRole('option', { name: /ibm-granite\/granite-embedding-97m-multilingual-r2/ })).toHaveLength(2);
    expect(screen.queryByRole('option', { name: /private\/cache/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /unrelated/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: '候选知识索引' }), { target: { value: 'index-2' } });
    fireEvent.change(screen.getByRole('combobox', { name: '候选检索方式' }), { target: { value: 'hybrid' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: '候选Top K' }), { target: { value: '6' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: '候选证据字符预算' }), { target: { value: '9000' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '候选启用重排' }));
    fireEvent.click(screen.getByRole('button', { name: '开始冻结集实验' }));
    await waitFor(() => expect(onExperiment).toHaveBeenCalledWith(expect.objectContaining({ snapshotId: 'snapshot-1', baselineKnowledge: { indexId: 'index-1', profile: defaultRetrieval }, candidateKnowledge: { indexId: 'index-2', profile: { ...defaultRetrieval, mode: 'hybrid', topK: 6, contextChars: 9000, rerank: true } } })));
  });

  it('preserves the explicit research workflow through index changes and freezes its real limits', async () => {
    readProject.mockResolvedValue({ knowledge: { schemaVersion: 'paw.lab-knowledge-resource.v1', indexes: [{ jobId: 'index-2', corpusId: 'corpus-1', corpusHash: 'same-corpus', title: '研究索引', documentCount: 20, chunkCount: 400, configHash: 'i2', chunking: { strategy: 'markdown', size: 1600, overlap: 200 }, dense: { available: false, provider: { semantic: false } }, reranker: { configured: false } }], corpora: [], datasets: [], evaluations: [], jobs: [], embedding: { provider: '', model: '' } } });
    const onExperiment = vi.fn(async () => true);
    render(<ControlTransportProvider transport={new MockControlTransport()}><GoldenExperiment suite={suite} disabled={false} onFreeze={vi.fn()} onExperiment={onExperiment} /></ControlTransportProvider>);
    await screen.findAllByRole('option', { name: /研究索引/u });
    fireEvent.click(screen.getByRole('checkbox', { name: '候选启用多来源研究流程' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: '候选最多来源篇数' }), { target: { value: '16' } });
    fireEvent.change(screen.getByRole('combobox', { name: '候选知识索引' }), { target: { value: 'index-2' } });
    expect(screen.getByRole('spinbutton', { name: '候选最多来源篇数' })).toHaveValue(16);
    fireEvent.click(screen.getByRole('button', { name: '开始冻结集实验' }));
    await waitFor(() => expect(onExperiment).toHaveBeenCalledWith(expect.objectContaining({
      baselineKnowledge: { indexId: 'index-1', profile: defaultRetrieval },
      candidateKnowledge: expect.objectContaining({ indexId: 'index-2', workflow: { kind: 'bilingual_multiquery', version: 1, maxQueries: 4, perQueryTopK: 12, maxSources: 16, maxChunksPerSource: 2 } }),
    })));
  });

  it('freezes adaptive tool budgets and does not promise a fixed model request count', async () => {
    readProject.mockResolvedValue({ knowledge: { indexes: [] } });
    const onExperiment = vi.fn(async () => true);
    render(<ControlTransportProvider transport={new MockControlTransport()}><GoldenExperiment suite={suite} disabled={false} onFreeze={vi.fn()} onExperiment={onExperiment} /></ControlTransportProvider>);
    fireEvent.click(screen.getByRole('checkbox', { name: '候选启用多来源研究流程' }));
    fireEvent.change(screen.getByRole('combobox', { name: '候选研究方式' }), { target: { value: 'adaptive_research' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: '候选最多工具调用' }), { target: { value: '2' } });
    expect(screen.getByRole('spinbutton', { name: '候选最多搜索次数' })).toHaveValue(2);
    expect(screen.queryByRole('spinbutton', { name: '候选最多来源篇数' })).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: '开发试跑计划' })).toHaveTextContent('计划执行回合');
    expect(screen.getByRole('status', { name: '开发试跑计划' })).toHaveTextContent('一次执行可能包含多次模型请求');
    fireEvent.click(screen.getByRole('button', { name: '开始冻结集实验' }));
    await waitFor(() => expect(onExperiment).toHaveBeenCalledWith(expect.objectContaining({
      candidateKnowledge: expect.objectContaining({ workflow: { kind: 'adaptive_research', version: 1, maxToolCalls: 2, maxSearchCalls: 2, perQueryTopK: 6 } }),
    })));
  });

  it('recognizes workflow experiment receipts and displays the exact executed parameters and both prompts', () => {
    const run = { answer: '论文答案', status: 'graded', judgment: { verdict: 'pass', reason: '证据支持', evidence: [] }, requestId: 'request-1', sessionId: 'session-1', turnId: 'turn-1' };
    const phase = { cases: [{ caseId: 'case-1', question: '论文结论？', taskType: '事实', baseline: run, candidate: run }], baselineMetrics: metrics, candidateMetrics: metrics };
    const result = { schemaVersion: 'rag-ime.agent-lab-golden-experiment.v1', suiteId: 'suite-1', snapshotId: 'snapshot-1', executionMode: 'knowledge_qa', optimizationScope: 'workflow', judgeConfig: model, baseline: { ...model, prompt: '原始规则' }, candidate: { ...model, prompt: '改进规则' }, development: phase, holdout: phase, overall: { baselineMetrics: { ...metrics, quality: quality(.5, 48) }, candidateMetrics: { ...metrics, quality: quality(.8, 48) } }, knowledgeVariants: { baseline: { ...binding, configHash: 'config-before', workflowConfigHash: 'workflow-before' }, candidate: { ...binding, indexId: 'index-2', configHash: 'config-after', workflowConfigHash: 'workflow-after', profile: { ...defaultRetrieval, topK: 6 } } }, comparison: { decision: 'no_improvement', comparable: true, reasons: [], developmentDelta: 0, holdoutDelta: 0, sameSnapshot: true, goldenChanged: false }, optimization: { enabled: false, maxCandidates: 0, selectedCandidateIndex: 0, proposals: [] }, receipts: [], usage: { calls: 0 } };
    expect(isExperimentResult(result)).toBe(true);
    expect(isExperimentResult({ ...result, knowledgeVariants: {} })).toBe(false);
    expect(isExperimentResult({ ...result, overall: { baselineMetrics: { ...metrics, retrievalQuality: {} }, candidateMetrics: metrics } })).toBe(false);
    expect(isExperimentResult({ ...result, overall: { baselineMetrics: { ...metrics, quality: quality(.8, 0) }, candidateMetrics: metrics } })).toBe(false);
    render(<GoldenExperiment suite={{ ...suite, jobs: [{ jobId: 'experiment-1', kind: 'experiment', state: 'completed', progress: '', sessionId: '', error: '', result, createdAtMs: 1, updatedAtMs: 2 }] }} disabled={false} onFreeze={vi.fn()} onExperiment={vi.fn()} />);
    expect(screen.getByRole('region', { name: '全部冻结题质量指标' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('本次实际检索参数与变化'));
    expect(screen.getByText('workflow-before')).toBeVisible();
    expect(screen.getByText('workflow-after')).toBeVisible();
    expect(screen.getByText('Top K · 已变化')).toBeVisible();
    fireEvent.click(screen.getByText('本次实际模型与候选规则'));
    expect(screen.getByText('原始规则')).toBeVisible();
    expect(screen.getByText('改进规则')).toBeVisible();
  });
});
