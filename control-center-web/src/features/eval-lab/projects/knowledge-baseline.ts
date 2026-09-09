import { defaultCleaning, defaultRetrieval, type KnowledgeIndex, type KnowledgeState, type RetrievalProfile, type CleaningConfig } from './knowledge-types';
import { object, type LabProject } from './types';
import { useLabArtifact } from './api';

export const baselineKind = 'knowledge_baseline';
export type KnowledgeBaseline = {
  schemaVersion: 'paw.lab-knowledge-baseline.v1';
  corpusId: string; corpusHash: string; indexId: string;
  parsing: 'preserve' | 'builtin' | 'mineru'; cleaning: CleaningConfig;
  chunking: { strategy: string; size: number; overlap: number };
  embedding: 'none' | 'configured'; embeddingModel: string;
  profile: RetrievalProfile;
};
export const chunkLabels: Record<string,string> = { fixed:'固定长度', paper:'论文结构', general:'段落结构', markdown:'Markdown 结构', qa:'问答结构' };
export const retrievalLabels: Record<string,string> = { lexical:'关键词', dense:'语义', hybrid:'混合' };

export function baselineForCorpus(state: KnowledgeState, corpusId = state.corpora[0]?.jobId ?? '', indexId?: string): KnowledgeBaseline {
  const corpus = state.corpora.find(row => row.jobId === corpusId);
  const index = state.indexes.find(row => row.corpusHash === corpus?.corpusHash && (!indexId || row.jobId === indexId));
  const semantic = index?.dense.provider.semantic === true;
  return { schemaVersion:'paw.lab-knowledge-baseline.v1', corpusId, corpusHash:corpus?.corpusHash ?? '', indexId:index?.jobId ?? '',
    parsing:'preserve', cleaning:{ ...(corpus?.intake.cleaning ?? defaultCleaning) },
    chunking:{ ...(index?.chunking ?? { strategy:'fixed', size:900, overlap:120 }) },
    embedding:semantic ? 'configured' : 'none', embeddingModel:index?.dense.provider.model ?? '',
    profile:{ ...defaultRetrieval, mode:semantic ? 'hybrid' : 'lexical', topK:16 } };
}

export function parseBaseline(value: unknown): KnowledgeBaseline | undefined {
  const v = object(value), c = object(v.chunking), p = object(v.profile), cleaning = object(v.cleaning);
  const integer = (n: unknown, min: number, max: number) => Number.isInteger(n) && Number(n) >= min && Number(n) <= max;
  if (v.schemaVersion !== 'paw.lab-knowledge-baseline.v1' || !['corpusId','corpusHash','indexId','embeddingModel'].every(key => typeof v[key] === 'string')
    || !['preserve','builtin','mineru'].includes(String(v.parsing)) || !['none','configured'].includes(String(v.embedding))
    || typeof cleaning.removeRepeatedMargins !== 'boolean' || typeof cleaning.normalizeWhitespace !== 'boolean'
    || !Object.hasOwn(chunkLabels,String(c.strategy)) || !integer(c.size,200,8000) || !integer(c.overlap,0,Math.min(Number(c.size)-1,2000))
    || (v.embedding==='none' && p.mode!=='lexical') || !Object.hasOwn(retrievalLabels,String(p.mode)) || !integer(p.topK,1,20) || !integer(p.candidateDepth,Number(p.topK),100)
    || !integer(p.contextChars,1000,60000) || typeof p.rerank !== 'boolean' || typeof p.threshold !== 'number' || !Number.isFinite(p.threshold) || p.threshold < 0 || p.threshold > 1) return undefined;
  return v as KnowledgeBaseline;
}

export function matchingBaselineIndex(plan: KnowledgeBaseline, state: KnowledgeState): KnowledgeIndex | undefined {
  const corpus = state.corpora.find(row => row.jobId === plan.corpusId);
  if (!corpus || corpus.corpusHash !== plan.corpusHash || plan.parsing !== 'preserve'
    || corpus.intake.cleaning?.removeRepeatedMargins !== plan.cleaning.removeRepeatedMargins
    || corpus.intake.cleaning?.normalizeWhitespace !== plan.cleaning.normalizeWhitespace) return undefined;
  return state.indexes.find(row => row.corpusHash === plan.corpusHash
    && (!plan.indexId || row.jobId === plan.indexId)
    && row.chunking.strategy === plan.chunking.strategy && row.chunking.size === plan.chunking.size && row.chunking.overlap === plan.chunking.overlap
    && (plan.embedding === 'none' ? !row.dense.provider.semantic : row.dense.provider.semantic && row.dense.provider.model === plan.embeddingModel));
}

export function baselineEvaluation(state: KnowledgeState | undefined, plan: KnowledgeBaseline | undefined) {
  if (!state || !plan || !plan.indexId) return undefined;
  return [...state.evaluations].reverse().find(row => row.indexId === plan.indexId && row.corpusHash === plan.corpusHash
    && row.split === 'development' && row.plannedCount > 0 && row.evaluatedCount === row.plannedCount && row.unlabeledCount === 0
    && Object.keys(plan.profile).every(key => row.profile[key as keyof RetrievalProfile] === plan.profile[key as keyof RetrievalProfile]));
}

export function useKnowledgeBaseline(project: LabProject) {
  const summary = project.artifacts.find(row => row.kind === baselineKind);
  const query = useLabArtifact(project.projectId, summary?.artifactId ?? '', summary?.revision);
  return { ...query, summary, plan:parseBaseline(query.data?.content) };
}

export function researchBuildMessage(artifactId: string, revision: number) {
  return `请继续构建本项目的深度研究 App。先用 lab_project 读取项目需求、全部知识资料，以及用户保存的知识库基线 ${artifactId} v${revision}。严格使用该基线的 corpusId、indexId、解析、清洗、分块、Embedding 和 profile 开始评测；未建成的索引先按方案准备，已有索引直接复用，不重复导入。候选优化另外保存，不能改写基线或把不同题集的成绩直接比较。应用必须支持围绕一个问题检索多篇论文、按证据缺口读取原文、比较结论、逐项引用、原文阅读、追问、历史恢复、停止和报告导出。复用 window.pawAgentUI.mountConversation(element, options) 的真实共享接口，options 使用 title、actionId、sourcesActionId、questionField、contextField。以当前真实模型配置执行，记录每轮参数变化、结果与用量，使用 prepare_app 保存真实应用版本并提供试用和下载。`;
}
