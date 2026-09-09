import { useEffect, useId, useState } from 'react';
import { useOptionalControlTransport } from '@/app/control-transport';
import { Button } from '@/components/primitives';
import { readLabProject } from '../projects/api';
import { defaultRetrieval, embeddingModelLabel, parseKnowledgeState, type KnowledgeIndex, type RetrievalProfile } from '../projects/knowledge-types';
import { object, type KnowledgeBinding, type KnowledgeVariantInput, type ResearchWorkflow } from './types';

export const defaultResearchWorkflow: Extract<ResearchWorkflow, { kind: 'bilingual_multiquery' }> = { kind: 'bilingual_multiquery', version: 1, maxQueries: 4, perQueryTopK: 12, maxSources: 12, maxChunksPerSource: 2 };
export const defaultAdaptiveWorkflow: Extract<ResearchWorkflow, { kind: 'adaptive_research' }> = { kind: 'adaptive_research', version: 1, maxToolCalls: 6, maxSearchCalls: 3, perQueryTopK: 6 };

export function knowledgeVariant(value: unknown, binding: KnowledgeBinding): KnowledgeVariantInput {
  const row = object(value);
  const savedWorkflow = object(row.workflow ?? binding.workflow);
  const workflow = savedWorkflow.version !== 1 ? undefined : savedWorkflow.kind === 'bilingual_multiquery'
    ? { ...defaultResearchWorkflow, ...savedWorkflow } as ResearchWorkflow : savedWorkflow.kind === 'adaptive_research'
      ? { ...defaultAdaptiveWorkflow, ...savedWorkflow } as ResearchWorkflow : undefined;
  return { indexId: typeof row.indexId === 'string' ? row.indexId : binding.indexId, profile: { ...defaultRetrieval, ...binding.profile, ...object(row.profile) } as RetrievalProfile, ...(workflow ? { workflow } : {}) };
}

export function KnowledgeVariants({ binding, baseline, candidate, onBaseline, onCandidate, disabled }: {
  binding: KnowledgeBinding; baseline: KnowledgeVariantInput; candidate: KnowledgeVariantInput;
  onBaseline: (value: KnowledgeVariantInput) => void; onCandidate: (value: KnowledgeVariantInput) => void; disabled: boolean;
}) {
  const transport = useOptionalControlTransport();
  const [indexes, setIndexes] = useState<KnowledgeIndex[]>([]);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setIndexes([]);
    if (!transport || !binding.projectId) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    void readLabProject(transport, binding.projectId, '', undefined, controller.signal).then((read) => {
      if (!controller.signal.aborted) setIndexes(parseKnowledgeState(read.knowledge).indexes.filter((index) => index.corpusHash === binding.corpusHash));
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '索引暂时无法读取。'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [transport, binding.projectId, binding.corpusHash, refresh]);
  return <section className="golden-knowledge-settings" aria-label="知识库回答方案">
    <header><h4>比较检索与回答的完整方案</h4><p className="golden-note">两侧只使用同一份资料快照。分块由所选索引决定；检索方式、Top K、重排与上下文预算随本次实验冻结。自动优化只调整候选 Prompt。</p></header>
    {loading ? <p role="status" className="golden-note">正在读取本项目的同资料索引…</p> : null}
    {error ? <p role="status" className="golden-note">{error} 可继续使用冻结索引。<Button size="small" onClick={() => setRefresh((value) => value + 1)}>重新读取索引</Button></p> : null}
    {!binding.projectId ? <p className="golden-note">此历史快照未提供项目绑定，只能调整冻结索引的检索参数。</p> : null}
    <div className="golden-model-comparison"><VariantFields label="基线" value={baseline} onChange={onBaseline} binding={binding} indexes={indexes} disabled={disabled} /><VariantFields label="候选" value={candidate} onChange={onCandidate} binding={binding} indexes={indexes} disabled={disabled} /></div>
  </section>;
}

function VariantFields({ label, value, onChange, binding, indexes, disabled }: { label: string; value: KnowledgeVariantInput; onChange: (value: KnowledgeVariantInput) => void; binding: KnowledgeBinding; indexes: KnowledgeIndex[]; disabled: boolean }) {
  const id = useId();
  const selected = indexes.find((index) => index.jobId === value.indexId);
  const profile = value.profile;
  const update = (patch: Partial<RetrievalProfile>) => onChange({ ...value, profile: { ...profile, ...patch } });
  const semantic = selected?.dense.provider.semantic === true;
  const numeric = (key: 'topK' | 'threshold' | 'candidateDepth' | 'contextChars', title: string, min: number, max: number, step = 1) => <label htmlFor={`${id}-${key}`}>{title}<input id={`${id}-${key}`} aria-label={`${label}${title}`} type="number" min={min} max={max} step={step} required value={profile[key]} onChange={(event) => { const next = Number(event.target.value); update({ [key]: next, ...(key === 'topK' && next > profile.candidateDepth ? { candidateDepth: next } : {}) }); }} /></label>;
  return <fieldset disabled={disabled} className="golden-variant-fields"><legend>{label}检索配置</legend>
    <label htmlFor={`${id}-index`}>索引<select id={`${id}-index`} aria-label={`${label}知识索引`} value={value.indexId} onChange={(event) => { const index = indexes.find((item) => item.jobId === event.target.value); onChange({ ...value, indexId: event.target.value, profile: { ...profile, ...(index?.dense.provider.semantic !== true ? { mode: 'lexical' as const } : {}), ...(index?.reranker.configured !== true ? { rerank: false } : {}) } }); }}>
      {!indexes.some((index) => index.jobId === binding.indexId) ? <option value={binding.indexId}>冻结索引 · {binding.chunkCount} 片段</option> : null}
      {!indexes.some((index) => index.jobId === value.indexId) && value.indexId !== binding.indexId ? <option value={value.indexId} disabled>已保存索引（尚未读取）</option> : null}
      {indexes.map((index) => <option key={index.jobId} value={index.jobId}>{index.title || index.jobId} · {index.chunking.strategy} {index.chunking.size}/{index.chunking.overlap} · {index.dense.provider.semantic ? embeddingModelLabel(index.dense.provider.model) || index.dense.provider.provider : '无向量'} · {index.chunkCount} 片段</option>)}
    </select></label>
    <div className="golden-variant-grid"><label htmlFor={`${id}-mode`}>检索方式<select id={`${id}-mode`} aria-label={`${label}检索方式`} value={profile.mode} onChange={(event) => update({ mode: event.target.value as RetrievalProfile['mode'] })}><option value="lexical">关键词</option><option value="dense" disabled={!semantic && profile.mode !== 'dense'}>语义</option><option value="hybrid" disabled={!semantic && profile.mode !== 'hybrid'}>混合</option></select></label>
      {numeric('topK', 'Top K', 1, 20)}{numeric('threshold', '分数阈值', 0, 1, .01)}{numeric('candidateDepth', '重排候选数', profile.topK, 100)}{numeric('contextChars', '证据字符预算', 1000, 60000)}
    </div><label className="golden-check"><input type="checkbox" checked={profile.rerank} disabled={disabled || (selected !== undefined && selected.reranker.configured !== true && !profile.rerank)} onChange={(event) => update({ rerank: event.target.checked })} />{label}启用重排</label>
    <label className="golden-check"><input type="checkbox" checked={Boolean(value.workflow)} onChange={(event) => onChange({ ...value, workflow: event.target.checked ? { ...defaultResearchWorkflow } : undefined })} />{label}启用多来源研究流程</label>
    {value.workflow ? <label htmlFor={`${id}-workflow`}>研究方式<select id={`${id}-workflow`} aria-label={`${label}研究方式`} value={value.workflow.kind} onChange={(event) => onChange({ ...value, workflow: event.target.value === 'adaptive_research' ? { ...defaultAdaptiveWorkflow } : { ...defaultResearchWorkflow } })}><option value="bilingual_multiquery">先规划，再汇总检索</option><option value="adaptive_research">按证据缺口逐步搜索与读原文</option></select></label> : null}
    {value.workflow?.kind === 'bilingual_multiquery' ? <><p className="golden-note">用所选回答模型规划中英文检索词，再合并各路证据。每题增加一次规划调用；用量与检索结果单独记录。</p><div className="golden-variant-grid">{([
      ['maxQueries', '最多检索问题', 2, 6], ['perQueryTopK', '每路 Top K', 1, 20], ['maxSources', '最多来源篇数', 1, 30], ['maxChunksPerSource', '每篇最大片段数', 1, 8],
    ] as const).map(([key, title, min, max]) => <label key={key} htmlFor={`${id}-${key}`}>{title}<input id={`${id}-${key}`} aria-label={`${label}${title}`} type="number" min={min} max={max} required value={value.workflow?.kind === 'bilingual_multiquery' ? value.workflow[key] : ''} onChange={(event) => onChange({ ...value, workflow: { ...value.workflow!, [key]: Number(event.target.value) } })} /></label>)}</div></> : null}
    {value.workflow?.kind === 'adaptive_research' ? <><p className="golden-note">Agent 根据已找到的证据继续搜索、打开相邻原文，证据充分或达到预算后作答。模型请求次数由实际研究过程决定，全部计入用量。</p><div className="golden-variant-grid">{([
      ['maxToolCalls', '最多工具调用', 1, 12], ['maxSearchCalls', '最多搜索次数', 1, Math.min(6, value.workflow.maxToolCalls)], ['perQueryTopK', '每次搜索 Top K', 1, 20],
    ] as const).map(([key, title, min, max]) => <label key={key} htmlFor={`${id}-${key}`}>{title}<input id={`${id}-${key}`} aria-label={`${label}${title}`} type="number" min={min} max={max} required value={value.workflow?.kind === 'adaptive_research' ? value.workflow[key] : ''} onChange={(event) => { if (value.workflow?.kind !== 'adaptive_research') return; const next = Number(event.target.value); onChange({ ...value, workflow: { ...value.workflow, [key]: next, ...(key === 'maxToolCalls' ? { maxSearchCalls: Math.min(next, value.workflow.maxSearchCalls) } : {}) } }); }} /></label>)}</div></> : null}
    {selected ? <p className="golden-note">分块：{selected.chunking.strategy} · 长度 {selected.chunking.size} · 重叠 {selected.chunking.overlap}；{selected.documentCount} 篇资料。</p> : null}
  </fieldset>;
}
