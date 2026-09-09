import { useState } from 'react';
import { Button } from '@/components/primitives';
import { knowledgeDocumentName, type CleaningConfig, type DocumentInspection, type KnowledgeCorpus, type KnowledgeJob } from './knowledge-types';
import type { JsonValue } from './types';

const warningNames: Record<string, string> = {
  builtin_pdf_layout_not_verified: '已提取文字；多栏顺序、表格和公式需核对原 PDF',
  page_mapping_unavailable: '页码未能可靠对应原 PDF', repeated_margins_detected: '发现重复页眉或页脚',
  empty_pages_need_review: '有空白提取页，需检查扫描页或图表', extraction_characters_need_review: '发现异常字符',
  sparse_text_pages_need_review: '部分页面提取文字较少', parser_warnings_need_review: '解析器报告修复或格式警告',
};
export function CleaningFields({ value, disabled, onChange }: { value: CleaningConfig; disabled: boolean; onChange: (value: CleaningConfig) => void }) {
  return <fieldset className="lab-knowledge-cleaning"><legend>PDF 转 Markdown 清洗</legend>
    <label className="lab-knowledge-check"><input type="checkbox" checked={value.removeRepeatedMargins} disabled={disabled} onChange={(event) => onChange({ ...value, removeRepeatedMargins: event.target.checked })} />移除重复页眉、页脚</label>
    <label className="lab-knowledge-check"><input type="checkbox" checked={value.normalizeWhitespace} disabled={disabled} onChange={(event) => onChange({ ...value, normalizeWhitespace: event.target.checked })} />合并多余空格和空行</label>
  </fieldset>;
}

export function LabKnowledgeIntake({ corpus, jobs, disabled, cleaning, mineruAvailable = false, onCommand, onRepair }: {
  corpus: KnowledgeCorpus; jobs: KnowledgeJob[]; disabled: boolean; cleaning: CleaningConfig;
  mineruAvailable?: boolean;
  onCommand: (value: Record<string, JsonValue>) => Promise<unknown>; onRepair: (sourceId: string, file: File) => Promise<void>;
}) {
  const [filter, setFilter] = useState('all'); const [search, setSearch] = useState(''); const [listPage, setListPage] = useState(0);
  const [sourceId, setSourceId] = useState(''); const [page, setPage] = useState(1); const [replacement, setReplacement] = useState<File>();
  const intake = corpus.intake; const documents = intake.documents ?? [];
  if (!documents.length) return null;
  const name=(id:string)=>knowledgeDocumentName(id,corpus.preview.find(row=>row.sourceId===id)?.title);
  const selected = documents.find((row) => row.sourceId === sourceId);
  const filtered = documents.filter((row) => (filter === 'all' || (filter === 'failed' ? row.status === 'failed' : row.status === 'needs_review')) && `${name(row.sourceId)} ${row.sourceId}`.toLowerCase().includes(search.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12)); const visiblePage = Math.min(listPage, pageCount - 1);
  const inspection = jobs.find((job) => job.state === 'completed' && job.result?.kind === 'document_inspection'
    && job.result.corpusId === corpus.jobId && (job.result.document as { sourceId?: string })?.sourceId === sourceId
    && job.result.page === page)?.result as DocumentInspection | undefined;
  const inspect = (id: string, number = 1) => { setSourceId(id); setPage(number); setReplacement(undefined); void onCommand({ operation: 'inspect_document', corpusId: corpus.jobId, sourceId: id, page: number }); };
  return <section className="lab-knowledge-intake" aria-label="PDF 解析与清洗检查">
    <h3>解析结果</h3>
    <p className="lab-knowledge-intake-summary">尝试 {intake.attemptedCount ?? documents.length} 篇 · 可读 {intake.successfulCount ?? corpus.documentCount} 篇 · 失败 {intake.failedCount ?? 0} 篇 · 提取 {intake.pageCount ?? 0} 页</p>
    <p className="lab-knowledge-note">{intake.changedDocumentCount ?? 0} 篇发生清洗变化，{intake.emptyPageCount ?? 0} 页未提取到文字。</p>
    <div className="lab-knowledge-inline"><span className="lab-knowledge-note">本版：重复页边文字{intake.cleaning?.removeRepeatedMargins ? '移除' : '保留'}，空白{intake.cleaning?.normalizeWhitespace ? '规范化' : '保留'}</span><Button disabled={disabled} onClick={() => void onCommand({ operation: 'reclean_corpus', corpusId: corpus.jobId, cleaning: { ...cleaning } })}>按上方设置生成清洗新版本</Button></div>
    <div className="lab-knowledge-fields"><label>查找论文<input type="search" value={search} placeholder="文件名或来源 ID" onChange={(event) => { setSearch(event.target.value); setListPage(0); }} /></label>
      <label>解析状态<select value={filter} onChange={(event) => { setFilter(event.target.value); setListPage(0); }}><option value="all">全部论文</option><option value="failed">解析失败</option><option value="needs_review">需要核对</option></select></label></div>
    <div className="lab-knowledge-table"><table className="lab-knowledge-documents"><caption>{filtered.length} 篇符合条件 · 第 {visiblePage + 1} / {pageCount} 页</caption><thead><tr><th>论文</th><th>结果</th><th>变化</th><th>检查</th></tr></thead><tbody>{filtered.slice(visiblePage * 12, visiblePage * 12 + 12).map((row) => <tr key={row.sourceId} aria-selected={row.sourceId === sourceId}><th>{name(row.sourceId)}</th><td>{row.status === 'failed' ? '解析失败' : row.status === 'needs_review' ? '可读 · 待核对' : '可读'}<small>{row.pageCount ? `${row.pageCount} 页` : row.message}</small></td><td>{row.cleaningChanges?.removedMarginLines ?? 0} 行页边文字<small>{row.cleaningChanges?.whitespaceChangedPages ?? 0} 页空白调整</small></td><td><Button size="small" disabled={disabled} onClick={() => inspect(row.sourceId)}>{row.status === 'failed' ? '查看与修复' : '对照正文'}</Button></td></tr>)}</tbody></table></div>
    {!filtered.length ? <p>没有符合条件的论文。可以调整筛选或搜索。</p> : null}
    <div className="lab-knowledge-inline"><Button size="small" disabled={visiblePage === 0} onClick={() => setListPage(visiblePage - 1)}>上一组论文</Button><Button size="small" disabled={visiblePage + 1 >= pageCount} onClick={() => setListPage(visiblePage + 1)}>下一组论文</Button></div>
    {selected ? <article className="lab-knowledge-document" aria-label="论文正文检查"><h4>{name(selected.sourceId)}</h4>
      {selected.message ? <p role="status">{selected.message}</p> : null}
      {selected.warnings.length ? <ul>{selected.warnings.map((warning) => <li key={warning}>{warningNames[warning] ?? warning}</li>)}</ul> : null}
      {selected.emptyPages?.length ? <p>未提取到文字的页码：{selected.emptyPages.join('、')}</p> : null}
      {selected.parseWarnings?.length ? <details><summary>解析器诊断 · {selected.parseWarnings.length} 条</summary><pre>{selected.parseWarnings.join('\n')}</pre></details> : null}
      {selected.status !== 'failed' && selected.sourceId.toLowerCase().endsWith('.pdf') ? <div className="lab-knowledge-inline"><Button disabled={disabled || !mineruAvailable || !selected.pageMappingAvailable} onClick={() => void onCommand({ operation: 'reparse_document', corpusId: corpus.jobId, sourceId, parsing: { mode: 'mineru' }, pages: [page] })}>用 MinerU 重解析第 {page} 页</Button><span className="lab-knowledge-note">{mineruAvailable ? '仅重解析当前页并生成新版本，保留原文和其他页面。' : '在系统设置的「文档解析服务」中启用本机 MinerU 后可用。'}</span></div> : null}
      {selected.status !== 'failed' ? <><div className="lab-knowledge-inline"><Button size="small" disabled={disabled || page <= 1} onClick={() => inspect(sourceId, page - 1)}>上一页正文</Button><span>第 {page} / {selected.pageCount ?? 1} 页</span><Button size="small" disabled={disabled || !selected.pageMappingAvailable || page >= (selected.pageCount ?? 1)} onClick={() => inspect(sourceId, page + 1)}>下一页正文</Button></div>
        {inspection ? <div className="lab-knowledge-page-comparison"><section><h5>提取原文</h5><pre>{inspection.rawMarkdown || '此页未提取到文字。'}</pre>{inspection.rawTruncated ? <p>此页超过展示长度，仅显示前 12,000 字符。</p> : null}</section><section><h5>清洗后 Markdown</h5><pre>{inspection.cleanedMarkdown || '此页未提取到文字。'}</pre>{inspection.cleanedTruncated ? <p>此页超过展示长度，仅显示前 12,000 字符。</p> : null}</section></div> : <p role="status">{disabled ? '正在读取此页正文…' : '此页尚未返回。'}{!disabled ? <Button size="small" onClick={() => inspect(sourceId, page)}>重新读取此页</Button> : null}</p>}</> : null}
      <details className="lab-knowledge-repair" open={selected.status === 'failed'}><summary>替换文件并重新解析</summary><p className="lab-knowledge-note">选择同一篇论文的有效文件，保留来源 ID 并生成资料新版本。原文件和失败记录仍可追溯。</p><div className="lab-knowledge-inline"><label className="lab-project-file-picker">{replacement?.name ?? '选择修复文件'}<input type="file" accept=".pdf,.txt,.md,.markdown,.html,.htm" disabled={disabled} onChange={(event) => setReplacement(event.target.files?.[0])} /></label><Button disabled={disabled || !replacement} onClick={() => { if (replacement) void onRepair(sourceId, replacement); }}>上传并修复此论文</Button></div></details>
    </article> : null}
  </section>;
}
