import { describe, expect, it } from 'vitest';
import { comparableRetrievalRuns } from './journey-evidence';
import { normalizeGoals, requirementWithGoals } from './optimization-goals';
import type { KnowledgeEvaluation, KnowledgeState } from './knowledge-types';

describe('comparison evidence boundaries', () => {
  const run = (patch: Partial<KnowledgeEvaluation> = {}): KnowledgeEvaluation => ({ jobId:'base', indexId:'i', corpusHash:'c', datasetId:'d', datasetHash:'h', split:'development', plannedCount:10, evaluatedCount:10, unlabeledCount:0, holdoutUseNumber:0,
    profile:{ mode:'hybrid', topK:8, threshold:0, rerank:false, candidateDepth:40, contextChars:16000 }, report:{ metrics:{ metrics:{ mrr:.5, recallAtK:{'8':.7}, ndcgAtK:{'8':.5} } }, costs:{ meanRetrievalLatencyMs:10, retrievalCalls:10 }, receiptSha256:'proof' }, ...patch });
  it('excludes held-out, incomplete and incompatible runs before presenting a comparison', () => {
    const rows = [run({jobId:'latest'}),run({jobId:'other-data',datasetHash:'changed'}),run({jobId:'partial',evaluatedCount:9}),run({jobId:'holdout',split:'holdout'}),run({jobId:'unlabeled',unlabeledCount:1}),run({jobId:'other-corpus',corpusHash:'other'}),run()];
    const state = { evaluations:rows, jobs:[{jobId:'base',createdAtMs:1},{jobId:'latest',createdAtMs:2}] } as KnowledgeState;
    expect(comparableRetrievalRuns(state).map(row => row.jobId)).toEqual(['base','latest']);
  });
});

describe('user optimization targets', () => {
  it('bounds preference coordinates and does not reinterpret legacy currency or accuracy targets', () => {
    expect(normalizeGoals({accuracyPriority:2,costFlexibility:-1})).toEqual({accuracyPriority:1,costFlexibility:0});
    expect(normalizeGoals({accuracy:95,latency:60,cost:2})).toEqual({accuracyPriority:.7,costFlexibility:.5});
    expect(normalizeGoals({accuracyPriority:NaN,costFlexibility:Infinity})).toEqual({accuracyPriority:.7,costFlexibility:.5});
  });
  it('passes qualitative preferences and task-specific baseline measurement without inventing fixed targets', () => {
    const output = requirementWithGoals('Compare scientific methods.',{accuracyPriority:.95,costFlexibility:.15});
    expect(output).toMatch(/^Compare scientific methods\./);
    expect(output).toContain('严格要求'); expect(output).toContain('优先控制成本');
    expect(output).toContain('当前任务的基线'); expect(output).toContain('同一题集');
    expect(output).not.toMatch(/\d\s*(%|元|秒)|P95|每 100 问/);
  });
  it('preserves an explicit budget when it comes from the user requirement', () => {
    const output = requirementWithGoals('本轮预算 50 元，至少 92%。',{accuracyPriority:.7,costFlexibility:.5});
    expect(output).toMatch(/^本轮预算 50 元，至少 92%。/);
    expect(output).toContain('用户在需求中明确给出的数值约束仍须保留');
  });
});
