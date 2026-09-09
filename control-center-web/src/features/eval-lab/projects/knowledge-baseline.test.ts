import { describe, expect, it } from 'vitest';
import { baselineEvaluation, baselineForCorpus, matchingBaselineIndex, parseBaseline } from './knowledge-baseline';
import type { KnowledgeState } from './knowledge-types';

const state = { corpora:[{ jobId:'corpus', corpusHash:'original', intake:{ cleaning:{removeRepeatedMargins:true,normalizeWhitespace:true} } }], indexes:[
  { jobId:'index',corpusId:'older-identical-corpus',corpusHash:'original',chunking:{strategy:'fixed',size:900,overlap:120},dense:{provider:{semantic:true,model:'model-a'}} },
  { jobId:'other',corpusHash:'other',chunking:{strategy:'fixed',size:900,overlap:120},dense:{provider:{semantic:true,model:'model-a'}} },
] } as KnowledgeState;
describe('saved knowledge baseline', () => {
  it('binds the selected corpus and exact embedding, never a different corpus or model', () => {
    const plan=baselineForCorpus(state);
    expect(matchingBaselineIndex(plan,state)?.jobId).toBe('index');
    expect(matchingBaselineIndex({...plan,embeddingModel:'model-b'},state)).toBeUndefined();
    expect(matchingBaselineIndex({...plan,corpusHash:'other'},state)).toBeUndefined();
    expect(matchingBaselineIndex({...plan,parsing:'mineru'},state)).toBeUndefined();
    expect(matchingBaselineIndex({...plan,chunking:{...plan.chunking,size:1200}},state)).toBeUndefined();
  });
  it('requires the actual baseline profile and a fully scored development run', () => {
    const plan=baselineForCorpus(state), row={jobId:'real-baseline',indexId:plan.indexId,corpusHash:plan.corpusHash,split:'development',profile:plan.profile,plannedCount:37,evaluatedCount:37,unlabeledCount:0};
    const evaluations=[{...row,jobId:'different-budget',profile:{...plan.profile,contextChars:24000}},{...row,jobId:'holdout',split:'holdout'},{...row,jobId:'partial',evaluatedCount:2},row] as KnowledgeState['evaluations'];
    expect(baselineEvaluation({...state,evaluations},plan)?.jobId).toBe('real-baseline');
    expect(baselineEvaluation({...state,evaluations}, {...plan,indexId:'other'})).toBeUndefined();
  });
  it('rejects impossible chunking and retrieval drafts before they can be saved', () => {
    const plan=baselineForCorpus(state);
    expect(parseBaseline(plan)).toEqual(plan);
    expect(parseBaseline({...plan,chunking:{...plan.chunking,overlap:900}})).toBeUndefined();
    expect(parseBaseline({...plan,profile:{...plan.profile,topK:21}})).toBeUndefined();
  });
});
