import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { Button, IconButton } from '@/components/primitives';
import './source-reader.css';

export type SourceLocator = { sourceId: string; chunkId: string; snapshotSha256: string;
  page?: number | null; heading?: string; ordinal?: number; offset?: number };
export type PortableSource = { sourceId: string; title: string; uri?: string; text: string;
  chunkId?: string; citationNumber?: number; citation?: SourceLocator; originalFilename?: string; sourceSha256?: string };
export type SourceRead = { schemaVersion?: string; kind: 'extracted_source';
  source: { sourceId: string; title: string; uri?: string; originalFilename?: string; sourceSha256?: string; textSha256?: string };
  citation: SourceLocator; chunks: { chunkId: string; ordinal: number; page: number | null; heading?: string;
    text: string; isCited: boolean; contentSha256?: string }[];
  offset: number; totalChunks: number; nextOffset: number | null; previousOffset?: number | null; originalUrl: string | null };

export function parseSourceRead(value: unknown, expected: SourceLocator): SourceRead {
  if (!value || typeof value !== 'object') throw new Error('来源读取结果不完整。');
  const result = value as SourceRead;
  if (result.kind !== 'extracted_source' || result.source?.sourceId !== expected.sourceId
      || result.citation?.sourceId !== expected.sourceId || result.citation?.chunkId !== expected.chunkId
      || result.citation?.snapshotSha256 !== expected.snapshotSha256 || !Array.isArray(result.chunks)
      || result.chunks.length > 24 || !result.chunks.every(row => typeof row.chunkId === 'string'
        && typeof row.text === 'string' && typeof row.isCited === 'boolean'
        && Number.isSafeInteger(row.ordinal) && row.ordinal >= 0
        && (row.page === null || (Number.isSafeInteger(row.page) && row.page > 0)))
      || result.chunks.reduce((sum, row) => sum + row.text.length, 0) > 256000
      || !Number.isSafeInteger(result.offset) || result.offset < 0
      || !Number.isSafeInteger(result.totalChunks) || result.totalChunks < result.chunks.length
      || ![result.nextOffset, result.previousOffset ?? null].every(offset => offset === null
        || (Number.isSafeInteger(offset) && offset >= 0 && offset < result.totalChunks))) {
    throw new Error('此来源与引用的冻结版本不一致，原引用已保留。');
  }
  return result;
}

export function safeOriginalSourceUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 4000) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

/** Shared by the exported Agent conversation and PAW. Reads never invoke a model. */
export function SourceReader({ source, readSource, onClose }: {
  source: PortableSource;
  readSource?: (locator: SourceLocator) => Promise<SourceRead>;
  onClose?: () => void;
}) {
  const [document, setDocument] = useState<SourceRead>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reader = useRef(readSource); reader.current = readSource;
  const sequence = useRef(0);
  const cited = useRef<HTMLElement>(null);
  const locator = source.citation;
  const sourceId = locator?.sourceId; const chunkId = locator?.chunkId; const snapshotSha256 = locator?.snapshotSha256;
  const load = useCallback(async (offset?: number) => {
    const request = ++sequence.current;
    if (!reader.current || !sourceId || !chunkId || !snapshotSha256) return;
    const target = { sourceId, chunkId, snapshotSha256, ...(offset !== undefined ? { offset } : {}) };
    setBusy(true); setError('');
    try {
      const result = parseSourceRead(await reader.current(target), target);
      if (request === sequence.current) setDocument(result);
    } catch (reason) {
      if (request === sequence.current) setError(reason instanceof Error ? reason.message : '来源暂不可读，引用片段仍保留。');
    } finally { if (request === sequence.current) setBusy(false); }
  }, [sourceId, chunkId, snapshotSha256]);
  useEffect(() => {
    setDocument(undefined); setError(''); setBusy(false); void load();
    return () => { sequence.current += 1; };
  }, [load]);
  useEffect(() => { if (document) cited.current?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' }); }, [document]);
  const original = safeOriginalSourceUrl(document?.originalUrl ?? source.uri);
  const filename = document?.source.originalFilename ?? source.originalFilename;
  return <aside className="paw-source-reader" aria-label="引用来源">
    <header className="paw-source-reader__header"><div><small>冻结提取文本</small><h3>{document?.source.title ?? source.title}</h3>
      {filename ? <p>{filename}</p> : null}</div>{onClose ? <IconButton icon={<X size={16} />} label="关闭来源" onClick={onClose} /> : null}</header>
    <p className="paw-source-reader__note">这是本次应用保存的提取文本，按原有切片阅读；并非原 PDF 的版面呈现。</p>
    {original ? <a className="paw-source-reader__original" href={original} data-original-source target="_blank" rel="noopener noreferrer">打开来源链接 <ExternalLink size={13} /></a> : null}
    {busy ? <p role="status">正在读取引用所在位置…</p> : null}
    {error ? <div role="alert"><p>{error}</p><Button size="small" onClick={() => void load()}>重新读取来源</Button></div> : null}
    {!document ? <article className="paw-source-reader__chunk" data-cited="true"><h4>本次回答采用的片段{source.citation?.page ? ` · 第 ${source.citation.page} 页` : ''}</h4><p>{source.text}</p>
      {!readSource || !source.citation ? <small>此历史记录只保留了回答片段，尚未提供完整来源定位。</small> : null}</article> : <>
      <nav className="paw-source-reader__navigation" aria-label="来源阅读位置"><span>{document.offset + 1}–{document.offset + document.chunks.length} / {document.totalChunks} 段</span>
        <Button size="small" disabled={busy || document.offset === 0} onClick={() => void load(0)}>从头阅读</Button>
        <Button size="small" disabled={busy} onClick={() => void load()}>回到引用</Button></nav>
      <div className="paw-source-reader__body">{document.chunks.map(chunk => <article key={chunk.chunkId} ref={chunk.isCited ? cited : undefined}
        className="paw-source-reader__chunk" data-cited={chunk.isCited || undefined}>
        <h4>{chunk.page ? `第 ${chunk.page} 页` : '页码未建立'} · 第 {chunk.ordinal + 1} 段{chunk.isCited ? ' · 本次引用' : ''}</h4>
        {chunk.heading ? <small>{chunk.heading}</small> : null}<p>{chunk.text}</p></article>)}</div>
      <nav className="paw-source-reader__navigation" aria-label="继续阅读来源">
        <Button size="small" disabled={busy || document.previousOffset == null} onClick={() => void load(document.previousOffset!)}>前面的内容</Button>
        <Button size="small" disabled={busy || document.nextOffset === null} onClick={() => void load(document.nextOffset!)}>后面的内容</Button></nav>
      {(document.source.sourceSha256 || document.source.textSha256) ? <details className="paw-source-reader__identity"><summary>来源版本</summary>
        {document.source.sourceSha256 ? <p>原文件 SHA-256 <code>{document.source.sourceSha256}</code></p> : null}
        {document.source.textSha256 ? <p>提取文本 SHA-256 <code>{document.source.textSha256}</code></p> : null}</details> : null}
    </>}
  </aside>;
}
