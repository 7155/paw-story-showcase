import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/primitives';
import { PortableUsageSummary } from '@/features/agent/portable/PortableResearchReceipt';
import { isExperimentResult } from '../golden/types';
import { QualityComparison, RetrievalComparison } from '../golden/QualityComparison';
import { object } from './types';
import { experimentKinds, experimentStates, historyRate, type ExperimentRecord } from './experiment-history';

const date=(time:number)=>new Date(time).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
function usageText(value:unknown) {
  const u=object(value),text:string[]=[];
  if(u.tokensComplete===true && typeof u.totalTokens==='number') text.push(u.totalTokens.toLocaleString()+' tokens');
  else if(typeof u.knownTotalTokens==='number') text.push('已记录 '+u.knownTotalTokens.toLocaleString()+' tokens');
  if(u.costComplete===true && typeof u.costUsd==='number') text.push('$'+u.costUsd.toFixed(4));
  else if(u.estimateComplete===true && typeof u.estimatedCostUsd==='number') text.push('目录估算 $'+u.estimatedCostUsd.toFixed(4));
  if((u.elapsedMsComplete===true || u.elapsedComplete===true) && typeof u.elapsedMs==='number') text.push('累计执行 '+(u.elapsedMs/1000).toFixed(1)+' s');
  return text.join(' · ');
}

export function AnswerExperimentResults({records,onOpen}:{records:ExperimentRecord[];onOpen:(id:string)=>void}) {
  const experiments=records.filter(row=>row.golden?.kind==='experiment');
  if(!experiments.length) return <p className="lab-status-note">暂无回答实验记录</p>;
  return <div className="lab-data-table"><table><thead><tr><th>回答实验</th><th>开发集</th><th>基线通过率</th><th>候选通过率</th><th>结论</th><th /></tr></thead><tbody>{experiments.map(row=>{
    const result=isExperimentResult(row.golden?.result) ? row.golden.result : undefined;
    return <tr key={row.id}><th>{date(row.createdAtMs)}<small>{row.config || row.title}</small></th><td>{result ? result.development.baselineMetrics.total+' 题' : '部分记录'}</td><td>{historyRate(result?.development.baselineMetrics.passRate)}</td><td>{historyRate(result?.development.candidateMetrics.passRate)}</td><td>{result ? result.comparison.decision==='improved' ? '本次对比改善' : result.comparison.decision==='no_improvement' ? '未改善' : '尚无定论' : experimentStates[row.state]}{result && !result.holdout ? <small>仅开发集</small> : null}</td><td><Button size="small" onClick={()=>onOpen(row.id)}>详情</Button></td></tr>;
  })}</tbody><caption>每行保留该次实验的题目范围。通过率来自冻结评审标准，不等于事实准确率。</caption></table></div>;
}

export function ProjectExperimentHistory({projectId,records,loading,errors,initialRecord='',onSelectRecord,onApplication,onKnowledge,onSuite}: {
  projectId:string; onSelectRecord:(id:string)=>void; records:ExperimentRecord[];loading:boolean;errors:string[];initialRecord?:string;
  onApplication:(appId:string,version:number)=>void;onKnowledge:(page:'sources'|'index'|'evaluation',jobId?:string)=>void;onSuite:(suiteId:string,jobId?:string)=>void;
}) {
  const storageKey='paw.lab.experiment-view.v1:'+projectId;
  const [saved]=useState(()=>{try{return object(JSON.parse(sessionStorage.getItem(storageKey) ?? '{}'));}catch{return {};}});
  const [filter,setFilter]=useState(typeof saved.filter==='string' ? saved.filter : '全部'),[search,setSearch]=useState(typeof saved.search==='string' ? saved.search : ''),[page,setPage]=useState(typeof saved.page==='number' ? saved.page : 0);
  const selected=initialRecord,setSelected=onSelectRecord;
  useEffect(()=>{try{sessionStorage.setItem(storageKey,JSON.stringify({filter,search,page}));}catch{/* Current filters remain available. */}},[storageKey,filter,search,page]);
  const detail=useRef<HTMLElement>(null);
  const filtered=records.filter(row=>(filter==='全部' || row.kind===filter) && (row.title+' '+row.config+' '+row.outcome+' '+row.id).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const pages=Math.max(1,Math.ceil(filtered.length/20)),current=Math.min(page,pages-1),selection=records.find(row=>row.id===selected);
  useEffect(()=>{ if(selected) { detail.current?.scrollIntoView({block:'nearest'});detail.current?.focus({preventScroll:true}); } },[selected]);
  const result=selection?.golden && isExperimentResult(selection.golden.result) ? selection.golden.result : undefined;
  return <section className="lab-experiment-history" aria-label="完整实验记录">
    <div className="lab-section-heading"><h3>实验记录</h3><span>{loading ? '正在读取…' : records.length+' 条记录'}</span></div>
    {errors.length ? <p role="alert">部分历史未能读取，请刷新。{errors.join('；')}</p> : null}
    <div className="lab-experiment-history__filters" aria-label="实验记录分类">{['全部',...experimentKinds].map(kind=><button key={kind} aria-pressed={filter===kind} onClick={()=>{setFilter(kind);setPage(0);}}>{kind}<span>{kind==='全部' ? records.length : records.filter(row=>row.kind===kind).length}</span></button>)}</div>
    <label className="lab-experiment-history__search"><Search size={15}/><input type="search" aria-label="搜索实验记录" value={search} placeholder="搜索配置、结果或记录" onChange={event=>{setSearch(event.target.value);setPage(0);}} /></label>
    {filtered.length ? <div className="lab-data-table lab-experiment-history__table"><table><thead><tr><th>时间 / 类型</th><th>实验与配置</th><th>结果</th></tr></thead><tbody>{filtered.slice(current*20,(current+1)*20).map(row=><tr key={row.id} data-selected={selected===row.id}><td><time>{date(row.createdAtMs)}</time><small>{row.kind}</small></td><th><button onClick={()=>setSelected(row.id)}>{row.title}</button>{row.config ? <small>{row.config}</small> : null}</th><td><span className={['failed','interrupted'].includes(row.state) ? 'is-error' : ''}>{experimentStates[row.state]}</span><small>{row.outcome}</small>{row.golden ? <small>{usageText(row.golden.result?.usage)}</small> : null}</td></tr>)}</tbody></table></div> : !loading ? <p className="lab-inline-empty">没有匹配的记录。</p> : null}
    {filtered.length>20 ? <div className="lab-experiment-history__pagination"><span>{current*20+1}–{Math.min((current+1)*20,filtered.length)} / {filtered.length}</span><Button size="small" disabled={current===0} onClick={()=>setPage(current-1)}>上一页</Button><span>{current+1} / {pages}</span><Button size="small" disabled={current===pages-1} onClick={()=>setPage(current+1)}>下一页</Button></div> : null}
    {selection ? <section className="lab-journey__detail" ref={detail} tabIndex={-1} aria-label="选中的实验"><header><h3>{selection.title}</h3><Button size="small" onClick={()=>setSelected('')}>收起详情</Button></header><p>{date(selection.createdAtMs)} · {experimentStates[selection.state]} · {selection.outcome}</p>
      {selection.config ? <p>{selection.config}</p> : null}
      {result ? <><div className="lab-data-table"><table><thead><tr><th>参数</th><th>基线</th><th>候选</th></tr></thead><tbody><tr><th>模型</th><td>{result.baseline.model} · {result.baseline.thinkingLevel}</td><td>{result.candidate.model} · {result.candidate.thinkingLevel}</td></tr>{['mode','topK','contextChars','candidateDepth'].map(key=><tr key={key}><th>{{mode:'检索方式',topK:'返回片段数',contextChars:'证据字符上限',candidateDepth:'候选片段数'}[key]}</th><td>{String(result.knowledgeVariants?.baseline.profile[key] ?? '—')}</td><td>{String(result.knowledgeVariants?.candidate.profile[key] ?? '—')}</td></tr>)}</tbody></table></div>
        <p>{result.comparison.reasons.join(' ')}</p><p>{usageText(result.usage)}</p>
        <RetrievalComparison title="开发集" baseline={result.development.baselineMetrics} candidate={result.development.candidateMetrics} />
        <details><summary>回答质量各项指标</summary><QualityComparison title="开发集" baseline={result.development.baselineMetrics} candidate={result.development.candidateMetrics} /></details>
        <details><summary>回答要求变化</summary><h4>基线</h4><p>{result.baseline.prompt || '使用默认提示'}</p><h4>候选</h4><p>{result.candidate.prompt || '使用默认提示'}</p></details>
      </> : null}
      {selection.call ? <><div className="lab-journey__answer"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selection.call.result?.text || selection.call.error || '暂无回答正文'}</ReactMarkdown></div><PortableUsageSummary value={selection.call.result ?? {}} /><Button onClick={()=>onApplication(selection.call!.appId,selection.call!.version)}>打开此版本与引用</Button></> : null}
      {selection.version ? <Button onClick={()=>onApplication(selection.version!.appId,selection.version!.version)}>试用 v{selection.version.version}</Button> : null}
      {selection.trial ? <Button onClick={()=>onKnowledge(selection.trial!.publicSpec.operation==='evaluate' ? 'evaluation' : ['index','search'].includes(String(selection.trial!.publicSpec.operation)) ? 'index' : 'sources',selection.trial!.jobId)}>打开知识库实验</Button> : null}
      {selection.suiteId ? <Button onClick={()=>onSuite(selection.suiteId!,selection.golden?.jobId)}>打开评测题集与逐题结果</Button> : null}
      <details><summary>原始配置与回执</summary><pre>{JSON.stringify(selection.trial ?? selection.golden ?? selection.version ?? selection.call,null,2)}</pre></details>
    </section> : null}
  </section>;
}
