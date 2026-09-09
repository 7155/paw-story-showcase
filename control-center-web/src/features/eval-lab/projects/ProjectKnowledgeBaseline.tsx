import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/primitives';
import { useControlTransport } from '@/app/control-transport';
import { labConnectionKey } from '../control-request';
import { projectError } from './api';
import { activeKnowledgeJob, embeddingModelLabel, type KnowledgeState } from './knowledge-types';
import { baselineForCorpus, chunkLabels, matchingBaselineIndex, parseBaseline, retrievalLabels, type KnowledgeBaseline } from './knowledge-baseline';
import type { JsonValue, ProjectReceipt } from './types';

export function ProjectKnowledgeBaseline({ projectId, state, saved, revision, busy, onSave, onCommand, onRefresh }: {
  projectId: string; state: KnowledgeState; saved?: KnowledgeBaseline; revision: number; busy: boolean;
  onSave: (plan: KnowledgeBaseline, expectedRevision: number) => Promise<ProjectReceipt | undefined>;
  onCommand: (input: Record<string,JsonValue>) => Promise<ProjectReceipt | undefined>; onRefresh: () => void;
}) {
  const transport=useControlTransport();
  const key='paw.lab.baseline-draft.v1:'+labConnectionKey(transport)+':'+projectId;
  const [restored] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key) ?? 'null'); } catch { return null; } });
  const [plan,setPlan]=useState<KnowledgeBaseline>(parseBaseline(restored?.plan) ?? saved ?? baselineForCorpus(state));
  const [baseRevision,setBaseRevision]=useState<number>(Number.isInteger(restored?.revision) ? restored.revision : revision);
  const [pending,setPending]=useState<string>(typeof restored?.pending === 'string' ? restored.pending : '');
  const [dirty,setDirty]=useState(Boolean(restored?.plan)), [working,setWorking]=useState(false), [message,setMessage]=useState('');
  const active=useRef(false);
  const patch=(value: Partial<KnowledgeBaseline>) => { setPlan(current=>({...current,...value}));setDirty(true);setMessage(''); };
  useEffect(() => {
    if (!dirty && !pending) { setPlan(saved ?? baselineForCorpus(state));setBaseRevision(revision); }
  },[saved,revision,state,dirty,pending]);
  useEffect(() => {
    try { if (dirty || pending) sessionStorage.setItem(key,JSON.stringify({plan,revision:baseRevision,pending}));else sessionStorage.removeItem(key); } catch { /* The open editor retains the draft. */ }
  },[key,plan,baseRevision,dirty,pending]);
  const job=state.jobs.find(row=>row.jobId===pending);
  useEffect(() => {
    if (!job || activeKnowledgeJob(job)) return;
    setPending('');
    if (job.state !== 'completed') { setMessage(job.error || job.result?.message || '处理未完成，可修改配置后重试。');return; }
    const corpus=state.corpora.find(row=>row.jobId===job.jobId), index=state.indexes.find(row=>row.jobId===job.jobId);
    if (corpus) { setPlan(current=>({...current,corpusId:corpus.jobId,corpusHash:corpus.corpusHash,parsing:'preserve',cleaning:{...corpus.intake.cleaning!},indexId:''}));setDirty(true);setMessage('资料处理完成，接着建立索引。'); }
    if (index) { setPlan(current=>({...current,indexId:index.jobId,embeddingModel:index.dense.provider.model ?? ''}));setDirty(true);setMessage('索引已建立，可以保存基线。'); }
  },[job,state]);
  const corpus=state.corpora.find(row=>row.jobId===plan.corpusId);
  const matched=matchingBaselineIndex(plan,state);
  const indexes=state.indexes.filter(row=>row.corpusHash===plan.corpusHash);
  const disabled=busy || working || Boolean(pending) || state.jobs.some(activeKnowledgeJob);
  const valid=Boolean(parseBaseline(plan)), semantic=matched ? matched.dense.provider.semantic : plan.embedding==='configured';
  const parserReady=plan.parsing==='preserve' || state.availableParsers?.some(row=>row.id===plan.parsing && row.available);
  const profile=(value: Partial<KnowledgeBaseline['profile']>) => patch({profile:{...plan.profile,...value}});
  const command=async (input: Record<string,JsonValue>) => {
    if (active.current || disabled) return;
    active.current=true;setWorking(true);setMessage('');
    try { const receipt=await onCommand(input);if (receipt?.job) {
      // The user can navigate away while admission is in flight. Keep the accepted
      // job identity even when this editor has already unmounted.
      try { sessionStorage.setItem(key,JSON.stringify({plan,revision:baseRevision,pending:receipt.job.jobId})); }catch{/* The Runtime still owns this job. */}
      setPending(receipt.job.jobId);onRefresh();
    }else setMessage('操作未确认，请核对页面中的原操作。'); }
    catch(error) { setMessage(projectError(error)); }
    finally { active.current=false;setWorking(false); }
  };
  const save=async () => {
    if (active.current || disabled || !valid) return;
    active.current=true;setWorking(true);setMessage('');
    try {
      const receipt=await onSave({...plan,indexId:matched?.jobId ?? ''},baseRevision);
      if (receipt?.artifact) { try {sessionStorage.removeItem(key);}catch{/* The saved artifact remains authoritative. */}setDirty(false);setBaseRevision(receipt.artifact.revision);setMessage(matched ? '基线已保存，后续评测沿用此配置。' : '方案已保存，待准备资料与索引。'); }
      else setMessage('保存未完成，编辑稿已保留。');
    }catch(error) { setMessage(projectError(error)); }
    finally { active.current=false;setWorking(false); }
  };
  return <section className="lab-baseline-editor" aria-label="知识库基线设计">
    <div className="lab-section-heading"><h3>知识库基线</h3><span>{saved ? '已保存 v'+revision : '尚未保存'}</span></div>
    <fieldset disabled={disabled}><legend>解析与清洗</legend><div className="lab-baseline-editor__grid">
      <label className="lab-baseline-editor__wide">资料版本<select aria-label="基线资料版本" value={plan.corpusId} onChange={event=>patch(baselineForCorpus(state,event.target.value))}>{state.corpora.map((row,i)=><option key={row.jobId} value={row.jobId}>v{state.corpora.length-i} · {row.intake.attemptedCount ?? row.documentCount} 个文件 · {row.documentCount} 个可读 · {row.intake.cleaning?.removeRepeatedMargins ? '已清洗' : '原始提取'}</option>)}</select></label>
      <label>解析方式<select aria-label="基线解析方式" value={plan.parsing} onChange={event=>patch({parsing:event.target.value as KnowledgeBaseline['parsing'],indexId:''})}><option value="preserve">沿用此版本的解析结果</option>{(state.availableParsers ?? [{id:'builtin',name:'内置解析',available:true}]).map(parser=><option value={parser.id} key={parser.id} disabled={!parser.available}>{parser.name}{parser.available ? '' : ' · 不可用'}</option>)}</select></label>
      <div className="lab-baseline-editor__checks"><label><input type="checkbox" checked={plan.cleaning.removeRepeatedMargins} disabled={plan.parsing==='preserve'} onChange={event=>patch({cleaning:{...plan.cleaning,removeRepeatedMargins:event.target.checked},indexId:''})} />移除重复页眉页脚</label><label><input type="checkbox" checked={plan.cleaning.normalizeWhitespace} disabled={plan.parsing==='preserve'} onChange={event=>patch({cleaning:{...plan.cleaning,normalizeWhitespace:event.target.checked},indexId:''})} />统一空白与换行</label></div>
    </div>{plan.parsing!=='preserve' ? <div className="lab-baseline-editor__action"><span>按所选方式处理全部 {corpus?.intake.attemptedCount ?? corpus?.documentCount} 个文件，生成新资料版本。</span><Button size="small" disabled={!parserReady} onClick={()=>void command({operation:'reclean_corpus',corpusId:plan.corpusId,parsing:{mode:plan.parsing},cleaning:plan.cleaning})}>处理资料</Button></div> : null}</fieldset>
    <fieldset disabled={disabled || plan.parsing!=='preserve'}><legend>分块与索引</legend><div className="lab-baseline-editor__grid">
      <label className="lab-baseline-editor__wide">已有索引<select aria-label="基线索引" value={plan.indexId} onChange={event=>{ const index=indexes.find(row=>row.jobId===event.target.value);if(index) { const next=baselineForCorpus(state,plan.corpusId,index.jobId);patch({...next,profile:{...plan.profile,mode:index.dense.provider.semantic ? plan.profile.mode : 'lexical',rerank:false}}); }else patch({indexId:'',embeddingModel:plan.embedding==='configured' ? state.embedding.model : ''}); }}><option value="">新建索引</option>{indexes.map((index,i)=><option key={index.jobId} value={index.jobId}>索引 {indexes.length-i} · {chunkLabels[index.chunking.strategy]} {index.chunking.size} / {index.chunking.overlap} · {embeddingModelLabel(index.dense.provider.model) || '关键词'} · {index.chunkCount.toLocaleString()} 块</option>)}</select></label>
      <label>分块方式<select aria-label="基线分块方式" value={plan.chunking.strategy} onChange={event=>patch({indexId:'',chunking:{...plan.chunking,strategy:event.target.value},embeddingModel:plan.embedding==='configured' ? state.embedding.model : ''})}>{Object.entries(chunkLabels).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
      <label>向量模型<select aria-label="基线向量模型" value={plan.embedding} onChange={event=>{ const embedding=event.target.value as KnowledgeBaseline['embedding'];patch({indexId:'',embedding,embeddingModel:embedding==='configured' ? state.embedding.model : '',profile:{...plan.profile,mode:embedding==='none' ? 'lexical' : 'hybrid',rerank:false}}); }}><option value="none">不使用向量 · 关键词索引</option><option value="configured" disabled={['none','local-hash','unavailable'].includes(state.embedding.provider)}>使用已配置模型</option></select><small>{embeddingModelLabel(plan.embeddingModel)}</small></label>
      <label>分块长度（字符）<input aria-label="基线分块长度" type="number" min={200} max={8000} value={plan.chunking.size} onChange={event=>patch({indexId:'',chunking:{...plan.chunking,size:Number(event.target.value)},embeddingModel:plan.embedding==='configured' ? state.embedding.model : ''})} /></label>
      <label>重叠长度（字符）<input aria-label="基线重叠长度" type="number" min={0} max={Math.min(plan.chunking.size-1,2000)} value={plan.chunking.overlap} onChange={event=>patch({indexId:'',chunking:{...plan.chunking,overlap:Number(event.target.value)},embeddingModel:plan.embedding==='configured' ? state.embedding.model : ''})} /></label>
    </div><div className="lab-baseline-editor__action"><span>{matched ? matched.documentCount+' 篇 · '+matched.chunkCount.toLocaleString()+' 个分块，复用已有索引' : '此配置尚未建立索引'}</span>{!matched ? <Button size="small" disabled={!valid} onClick={()=>void command({operation:'index',corpusId:plan.corpusId,chunking:plan.chunking,embedding:plan.embedding})}>建立索引</Button> : null}</div></fieldset>
    <fieldset disabled={disabled}><legend>检索</legend><div className="lab-baseline-editor__grid">
      <label>检索方式<select aria-label="基线检索方式" value={plan.profile.mode} onChange={event=>profile({mode:event.target.value as KnowledgeBaseline['profile']['mode']})}>{Object.entries(retrievalLabels).map(([id,label])=><option key={id} value={id} disabled={id!=='lexical' && !semantic}>{label}</option>)}</select></label>
      <label>返回片段数（Top K）<input aria-label="基线返回片段数" type="number" min={1} max={20} value={plan.profile.topK} onChange={event=>profile({topK:Number(event.target.value),candidateDepth:Math.max(plan.profile.candidateDepth,Number(event.target.value))})} /></label>
      <label>证据长度上限（字符）<input aria-label="基线证据长度" type="number" min={1000} max={60000} step={1000} value={plan.profile.contextChars} onChange={event=>profile({contextChars:Number(event.target.value)})} /></label>
      <div className="lab-baseline-editor__checks"><label><input type="checkbox" checked={plan.profile.rerank} disabled={!matched?.reranker.configured} onChange={event=>profile({rerank:event.target.checked})} />检索后重排{!matched?.reranker.configured ? ' · 未配置' : ''}</label></div>
    </div><details><summary>更多检索参数</summary><div className="lab-baseline-editor__grid"><label>候选片段数<input aria-label="基线候选片段数" type="number" min={plan.profile.topK} max={100} value={plan.profile.candidateDepth} onChange={event=>profile({candidateDepth:Number(event.target.value)})} /></label><label>匹配阈值<input aria-label="基线匹配阈值" type="number" min={0} max={1} step={0.05} value={plan.profile.threshold} onChange={event=>profile({threshold:Number(event.target.value)})} /></label></div></details></fieldset>
    {pending ? <div className="lab-baseline-editor__progress" role="status"><progress aria-label="基线准备进度" /><span>{job?.progress || '正在读取任务进度…'}</span><Button size="small" onClick={onRefresh}>刷新进度</Button></div> : null}
    {!valid ? <p role="alert">请检查分块长度、重叠长度与检索参数。</p> : null}
    {dirty && revision!==baseRevision ? <p role="alert">基线已有新版本，当前编辑稿已保留。<Button size="small" onClick={()=>{ setPlan(saved ?? baselineForCorpus(state));setBaseRevision(revision);setDirty(false); }}>载入已保存版本</Button></p> : null}
    <footer><span role="status">{message || (dirty ? '有未保存的更改' : '保存后用于后续基线评测与应用构建。')}</span><Button variant="primary" disabled={disabled || !valid || (dirty && revision!==baseRevision)} onClick={()=>void save()}>{working ? '正在保存…' : matched ? '保存基线' : '保存方案'}</Button></footer>
  </section>;
}
