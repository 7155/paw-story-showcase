import { useEffect,useRef,useState } from 'react';
import { useControlTransport } from '@/app/control-transport';
import { labConnectionKey } from '../control-request';
import { ArrowUpRight, Check, CircleAlert, FileText, LoaderCircle, Search, Upload } from 'lucide-react';
import { Button } from '@/components/primitives';
import type { KnowledgeState } from './knowledge-types';
import { activeKnowledgeJob, knowledgeDocumentName } from './knowledge-types';
import type { LabProject } from './types';

export type MaterialTarget = { sourceId: string; corpusId?: string };
export function ProjectDocumentList({ project, knowledge, loading, onOpen, onImport, corpusId }: {
  project: LabProject; knowledge?: KnowledgeState; loading: boolean; corpusId?: string;
  onOpen: (target: MaterialTarget) => void; onImport: () => void;
}) {
  const transport=useControlTransport();
  const corpus = knowledge?.corpora.find(row=>row.jobId===corpusId) ?? knowledge?.corpora[0];
  const key='paw.lab.file-list.v1:'+labConnectionKey(transport)+':'+project.projectId+':'+(corpus?.jobId ?? '');
  const [search,setSearch]=useState(()=>{try{return sessionStorage.getItem(key+':search') ?? '';}catch{return '';}}),list=useRef<HTMLUListElement>(null);
  const updateSearch=(value:string)=>{setSearch(value);try{sessionStorage.setItem(key+':search',value);}catch{/* Current search remains. */}};
  useEffect(()=>{try{setSearch(sessionStorage.getItem(key+':search') ?? '');if(list.current)list.current.scrollTop=Number(sessionStorage.getItem(key+':scroll') ?? 0);}catch{/* The list remains usable. */}},[key,corpus?.documentCount]);
  const documents = corpus?.intake.documents?.length ? corpus.intake.documents.map(doc => ({
    sourceId: 'knowledge:' + doc.sourceId, corpusId: corpus.jobId, title: knowledgeDocumentName(doc.sourceId, corpus.preview.find(row => row.sourceId === doc.sourceId)?.title),
    status: doc.status, pageCount: doc.pageCount, warnings: doc.warnings, message: doc.message,
  })) : (corpus?.preview ?? []).map(doc => ({ sourceId: 'knowledge:' + doc.sourceId, corpusId: corpus!.jobId, title: doc.title, status: 'ready', pageCount: undefined, warnings: [] as string[], message: '' }));
  const rows = [...documents, ...project.materialSet.materials.map(doc => ({ sourceId: 'text:' + doc.sourceId, corpusId: undefined, title: doc.title, status: 'ready', pageCount: undefined, warnings: [] as string[], message: '' }))];
  const active = knowledge?.jobs.find(job => activeKnowledgeJob(job) && ['import_corpus','reclean_corpus','reparse_document','repair_document'].includes(job.publicSpec.operation));
  const failed = corpus?.intake.failedCount ?? documents.filter(doc => doc.status === 'failed').length;
  const loaded = (corpus?.intake.successfulCount ?? corpus?.documentCount ?? 0) + project.materialSet.materials.length;
  const total = Math.max(loaded + failed, (corpus?.intake.attemptedCount ?? documents.length) + project.materialSet.materials.length);
  const filtered = rows.filter(row => (row.title + ' ' + row.sourceId).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <section className="lab-document-list" aria-label="资料载入">
    <div className="lab-document-list__progress">
      <div><strong>{loading ? '正在读取文件列表' : active ? '正在载入资料' : failed ? '部分文件载入失败' : total ? '资料已载入' : '尚未添加资料'}</strong><span>{total ? loaded + ' / ' + total + ' 个文件已载入' : ''}</span></div>
      {loading || active ? <progress aria-label="资料载入进度" /> : total ? <progress aria-label="资料载入进度" value={loaded} max={total} /> : null}
      {active ? <p role="status">{active.progress || '正在解析文件…'}</p> : failed ? <p>{failed} 个文件解析失败<Button size="small" onClick={onImport}>查看并修复</Button></p> : null}
    </div>
    <div className="lab-document-list__toolbar"><label><Search size={15} /><input type="search" aria-label="搜索文件" placeholder="搜索文件" value={search} onChange={event => updateSearch(event.target.value)} /></label><Button size="small" onClick={onImport}><Upload size={14} />导入资料</Button></div>
    {rows.length ? <><div className="lab-document-list__columns" aria-hidden="true"><span>文件名</span><span>页数</span><span>状态</span><span /></div><ul ref={list} onScroll={()=>{try{sessionStorage.setItem(key+':scroll',String(list.current?.scrollTop ?? 0));}catch{/* Current scroll remains. */}}}>{filtered.map(row => <li key={row.sourceId}><button onClick={() => onOpen({ sourceId: row.sourceId, corpusId: row.corpusId })} title={row.title}>
      <span className="lab-document-list__name"><FileText size={21} className={/\.pdf$/iu.test(row.title) ? 'is-pdf' : undefined} /><span>{row.title}</span></span><span className="lab-document-list__pages">{row.pageCount ?? '—'}</span>
      <span className={'lab-document-list__status ' + (row.status === 'failed' ? 'is-error' : row.warnings.length ? 'is-warning' : '')}>{row.status === 'failed' ? <CircleAlert size={15} /> : <Check size={15} />}{row.status === 'failed' ? '解析失败' : row.warnings.length ? '已载入 · 待检查' : '已载入'}</span><ArrowUpRight size={15} />
    </button></li>)}</ul>{!filtered.length ? <p className="lab-inline-empty">没有匹配的文件。</p> : null}</> : !loading ? <div className="lab-inline-empty"><FileText size={22} /><span>导入 PDF、文档或文件夹后，文件会显示在这里。</span></div> : <div className="lab-inline-empty"><LoaderCircle size={18} /><span>正在读取…</span></div>}
  </section>;
}
