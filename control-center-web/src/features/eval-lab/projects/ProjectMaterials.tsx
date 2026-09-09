import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/primitives';
import { projectError } from './api';
import { activeKnowledgeJob, knowledgeDocumentName, type DocumentInspection } from './knowledge-types';
import type { JsonValue, LabProject, ProjectReceipt } from './types';
import { useProjectKnowledge } from './use-project-knowledge';

export function ProjectMaterials({ project, busy, onAdd, onKnowledge, onCommand, initialCorpusId, initialSourceId, initialPage=1, onSelectionChange }: {
  initialCorpusId?: string; initialSourceId?: string; initialPage?:number; onSelectionChange?:(corpusId:string,sourceId:string,page:number)=>void;
  project: LabProject; busy: boolean; onAdd: () => void; onKnowledge: () => void;
  onCommand: (input: Record<string, JsonValue>) => Promise<ProjectReceipt | undefined>;
}) {
  const query = useProjectKnowledge(project.projectId);
  const [corpusId, setCorpusId] = useState(initialCorpusId ?? ''); const [sourceId, setSourceId] = useState(initialSourceId ?? '');
  const [page, setPage] = useState(initialPage); const [reading, setReading] = useState(false); const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const corpus = query.data?.corpora.find(row => row.jobId === corpusId) ?? query.data?.corpora[0];
  // The preview only contains the first eight sources; intake owns the full inventory.
  const documents = corpus?.intake.documents?.length ? corpus.intake.documents.map(doc => ({
    ...doc, title: knowledgeDocumentName(doc.sourceId, corpus.preview.find(row => row.sourceId === doc.sourceId)?.title),
    excerpt: corpus.preview.find(row => row.sourceId === doc.sourceId)?.excerpt ?? '',
  })) : (corpus?.preview ?? []).map(doc => ({ ...doc, pageCount: undefined, status: 'ready', warnings: [] as string[] }));
  const textMaterials = project.materialSet.materials;
  const selectedKey = sourceId || (documents[0] ? `knowledge:${documents[0].sourceId}` : textMaterials[0] ? `text:${textMaterials[0].sourceId}` : '');
  const selected = documents.find(doc => `knowledge:${doc.sourceId}` === selectedKey);
  const text = textMaterials.find(doc => `text:${doc.sourceId}` === selectedKey);
  const index = query.data?.indexes.find(row => row.corpusId === corpus?.jobId);
  const inspection = query.data?.jobs.find(job => job.state === 'completed' && job.result?.kind === 'document_inspection'
    && job.result.corpusId === corpus?.jobId && (job.result.document as { sourceId?: string })?.sourceId === selected?.sourceId && job.result.page === page)?.result as DocumentInspection | undefined;
  const readJob = query.data?.jobs.find(job => {
    const spec = job.publicSpec as Record<string, unknown> | undefined;
    return spec?.operation === 'inspect_document' && spec.corpusId === corpus?.jobId && spec.sourceId === selected?.sourceId && spec.page === page;
  });
  const readFailure = readJob?.state === 'failed' ? readJob.error || (typeof readJob.result?.message === 'string' ? readJob.result.message : '正文读取失败，请重试或进入解析设置。') : '';
  const disabled = busy || reading || Boolean(query.data?.jobs.some(activeKnowledgeJob));
  const initialRead = useRef('');
  useEffect(()=>{setCorpusId(initialCorpusId ?? '');setSourceId(initialSourceId ?? '');setPage(initialPage);},[initialCorpusId,initialSourceId,initialPage]);
  const inspect = async (id: string, nextPage = 1) => {
    setSourceId(`knowledge:${id}`); setPage(nextPage); setError('');
    if (!corpus || disabled) return;
    setReading(true);
    try {
      const receipt = await onCommand({ operation: 'inspect_document', corpusId: corpus.jobId, sourceId: id, page: nextPage });
      if (!receipt) setError('正文读取尚未确认，请核对原操作后重试。');
      await query.refetch();
      if(receipt) onSelectionChange?.(corpus.jobId,`knowledge:${id}`,nextPage);
    } catch (reason) { setError(projectError(reason)); }
    finally { setReading(false); }
  };
  const includes = (value: string) => value.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  useEffect(() => {
    if (!initialSourceId || selectedKey!==initialSourceId || page!==initialPage || !selected || !corpus || disabled || selected.status === 'failed' || inspection) return;
    const key = corpus.jobId + ':' + initialSourceId + ':' + page;
    if (initialRead.current === key) return;
    initialRead.current = key;
    void inspect(selected.sourceId,page);
  }, [initialPage,page,initialSourceId, selected?.sourceId, selected?.status, corpus?.jobId, disabled, inspection]);
  return <section className="lab-project-materials" aria-label="项目资料">
    <header><div><h2>资料</h2></div><Button onClick={() => void query.refetch()}><RefreshCw size={14} />重新读取</Button></header>
    {query.isPending ? <p role="status">正在读取知识库资料…</p> : null}
    {query.isError ? <p className="lab-project-error" role="alert">{projectError(query.error)} 已有文本材料仍可查看。</p> : null}
    {error || readFailure ? <p className="lab-project-error" role="alert">{error || readFailure}</p> : null}
    <div className="lab-material-inventory"><strong>{corpus?.documentCount ?? 0} 份知识资料{corpus?.intake.pageCount ? ` · ${corpus.intake.pageCount} 页` : ''}{index ? ` · ${index.chunkCount.toLocaleString()} 个检索片段` : ''}</strong>{textMaterials.length ? <span>{textMaterials.length} 份补充文本</span> : null}<Button size="small" onClick={onKnowledge}>解析设置</Button></div>
    {corpus && (corpus.intake.failedCount || corpus.intake.skippedCount) ? <p role="status">{corpus.intake.failedCount ?? 0} 份解析失败，{corpus.intake.skippedCount ?? 0} 项未读取。进入解析检查可查看原因和修复入口。</p> : null}
    {(query.data?.corpora.length ?? 0) > 1 ? <label className="lab-material-snapshot">资料版本<select value={corpus?.jobId} onChange={event => { setCorpusId(event.target.value); setSourceId(''); setPage(1);onSelectionChange?.(event.target.value,'',1); }}>{query.data?.corpora.map((row,i) => <option key={row.jobId} value={row.jobId}>{row.title} · {row.documentCount} 份 · {i === 0 ? '最近版本' : `历史快照 ${i}`}</option>)}</select></label> : null}
    {!selected && !text && !query.isPending && !query.isError ? <div className="lab-project-empty"><FileText size={25} /><h3>暂无资料</h3><p>导入文件或添加补充文本。</p><Button onClick={onKnowledge}>导入资料</Button><Button onClick={onAdd}><Plus size={14} />添加补充材料</Button></div> : selected || text ? <div className="lab-project-materials__body lab-material-browser"><nav aria-label="资料文件"><input type="search" aria-label="查找资料" placeholder="查找文件名" value={search} onChange={event => setSearch(event.target.value)} />
      {documents.filter(doc => includes(doc.title) || includes(doc.sourceId)).map(doc => <button key={doc.sourceId} aria-current={selected?.sourceId === doc.sourceId ? 'page' : undefined} onClick={() => { if (doc.status === 'failed') { setSourceId(`knowledge:${doc.sourceId}`); setPage(1); setError('');onSelectionChange?.(corpus?.jobId ?? '',`knowledge:${doc.sourceId}`,1); } else void inspect(doc.sourceId); }}><FileText size={14} /><span>{doc.title}<small>{doc.pageCount ? `${doc.pageCount} 页` : '知识资料'}{doc.status === 'failed' ? ' · 解析失败' : doc.warnings.length ? ' · 待核对版式' : ''}</small></span></button>)}
      {textMaterials.filter(doc => includes(doc.title)).map(doc => <button key={`text:${doc.sourceId}`} aria-current={text?.sourceId === doc.sourceId ? 'page' : undefined} onClick={() => { setSourceId(`text:${doc.sourceId}`); setError('');onSelectionChange?.('',`text:${doc.sourceId}`,1); }}><FileText size={14} /><span>{doc.title}<small>补充文本</small></span></button>)}
      {!documents.some(doc => includes(doc.title) || includes(doc.sourceId)) && !textMaterials.some(doc => includes(doc.title)) ? <p>没有匹配的文件，试试其他关键词。</p> : null}
    </nav><article>
      <header><h3>{selected?.title ?? text?.title}</h3><details className="lab-material-location"><summary>文件位置</summary><p>{selected?.sourceId ?? text?.uri}</p></details></header>
      {selected ? <><div className="lab-material-reader-actions"><Button size="small" disabled={disabled || page <= 1} onClick={() => void inspect(selected.sourceId, page-1)}>上一页</Button><span>第 {page} / {selected.pageCount ?? 1} 页</span><Button size="small" disabled={disabled || page >= (selected.pageCount ?? 1)} onClick={() => void inspect(selected.sourceId, page+1)}>下一页</Button><Button size="small" disabled={disabled || selected.status === 'failed'} onClick={() => void inspect(selected.sourceId, page)}>{reading ? '正在读取…' : inspection ? '重新读取正文' : '读取此页正文'}</Button></div>
        {selected.warnings.length ? <p className="lab-material-reading-note">解析提示：请核对多栏、表格与公式。</p> : null}
        {inspection ? <><div className="lab-material-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{inspection.cleanedMarkdown || '本页没有提取到文字。'}</ReactMarkdown></div>{inspection.cleanedTruncated ? <p>正文超过展示上限，仅显示前 12,000 字符。</p> : null}<details><summary>对照清洗前文本</summary><pre>{inspection.rawMarkdown || '本页没有提取到文字。'}</pre></details></> : <><h4>{page === 1 ? '内容摘要' : `第 ${page} 页正文`}</h4><pre>{reading || disabled ? '正在读取所选页面…' : page > 1 ? '此页正文尚未返回，请点击读取此页正文。' : selected.excerpt || (selected.status === 'failed' ? '这份文件解析失败，请在解析检查中修复。' : '点击“读取此页正文”开始阅读。')}</pre><p className="lab-project-muted">{page === 1 ? '文档摘要，完整内容请按页阅读。' : '正在等待页面内容。'}</p></>}
      </> : <><p>{text?.byteSize.toLocaleString()} bytes · 已保存文本快照</p><pre>{text?.text}</pre></>}
    </article></div> : null}
  </section>;
}
