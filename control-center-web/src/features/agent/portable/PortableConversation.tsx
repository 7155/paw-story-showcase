import { useEffect, useRef, useState } from 'react';
import { BookOpen, Download, History, MessageSquarePlus, Search, Send, Square, X } from 'lucide-react';
import { Button, IconButton } from '@/components/primitives';
import { ComposerShell } from '@/features/composer/ComposerShell';
import { ConversationSurface } from '@/features/conversation-ui/components/ConversationSurface';
import { conversationClock, NO_CAPABILITIES, type ConversationSurfaceController } from '@/features/conversation-ui/ConversationSurfaceContext';
import type { TranscriptMessage } from '@/features/conversation-ui/model/types';
import { AgentRecoveryActions } from '@/features/agent/AgentRecoveryActions';
import { ModelPicker } from '@/features/agent/composer/ModelPicker';
import { parsePiModelCatalogOptions, type PiModelOption } from '@/features/agent/model-catalog-options';
import { publicAgentErrorText } from '@/features/agent/public-error';
import { MarkdownBody, MarkdownCitations } from '@/features/agent/timeline/MarkdownRenderer';
import { SourceReader, type PortableSource } from './SourceReader';
import { PortableResearchReceipt } from './PortableResearchReceipt';
import { downloadResearchReport } from './research-report';
import { applyPortableProgress, applyPortableResult, portableRecordTurn, portableStageLabels, unresolvedPortableState,
  type PortableBridge, type PortableConversationOptions, type PortableRecord, type PortableSelection, type PortableTurn } from './conversation-types';
import '@/design/workspace.css';
import '@/features/agent/agent.css';
import '@/features/conversation-ui/conversation-ui.css';
import './portable-conversation.css';

const terminal = (state: string) => ['completed', 'failed', 'cancelled', 'rejected', 'unconfirmed', 'interrupted'].includes(state);
const failure = (reason: unknown) => reason && typeof reason === 'object' ? reason as { state?: string; message?: string; requestId?: string } : { message: String(reason) };
function savedView(key: string): { draft: string; turns: PortableTurn[] } {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? '{}');
    return { draft: typeof value.draft === 'string' ? value.draft : '', turns: Array.isArray(value.turns) ? value.turns.filter((row: PortableTurn) => typeof row.id === 'string' && typeof row.question === 'string' && typeof row.output === 'string' && Array.isArray(row.sources) && Array.isArray(row.stages)).slice(-30).map((row: PortableTurn) => ({ ...row, restored: true, state: terminal(row.state) || unresolvedPortableState(row.state) ? row.state : 'unconfirmed' })) : [] };
  } catch { return { draft: '', turns: [] }; }
}

/** Adapts frozen App receipts to the same reading surface and composer shell as Agent.
 * Invocation, cancellation and reconciliation remain with pawApp's runtime owner. */
export function PortableConversation({ options, bridge }: { options: PortableConversationOptions; bridge: PortableBridge }) {
  const key = `paw.app.conversation.v2:${options.title}`;
  const initial = useRef(savedView(key));
  const [draft, setDraft] = useState(initial.current.draft); const [turns, setTurns] = useState<PortableTurn[]>(initial.current.turns);
  const [selected, setSelected] = useState<PortableSelection>(); const [models, setModels] = useState<PiModelOption[]>([]);
  const [modelError, setModelError] = useState(''); const [modelLoading, setModelLoading] = useState(true); const [modelOpen, setModelOpen] = useState(0);
  const [busy, setBusy] = useState(false); const [stopping, setStopping] = useState(false); const [source, setSource] = useState<(PortableSource & { appVersion?: number })>(); const [checking, setChecking] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false); const [history, setHistory] = useState<PortableRecord[]>([]); const [historyError, setHistoryError] = useState(''); const [historyLoading, setHistoryLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => `app:${options.title}:${initial.current.turns[0]?.id ?? 'new'}`);
  const [scrollToLatestRequest, setScrollToLatestRequest] = useState(0);
  const mounted = useRef(true); const busyRef = useRef(false); const abort = useRef<AbortController | undefined>(undefined); const textarea = useRef<HTMLTextAreaElement>(null);
  const turnRef = useRef(turns); turnRef.current = turns;
  const questionField = options.questionField ?? 'question'; const answerAction = options.actionId ?? 'answer';
  const updateTurn = (id: string, update: (row: PortableTurn) => PortableTurn) => { if (mounted.current) setTurns((rows) => rows.map((row) => row.id === id ? update(row) : row)); };
  const setRunning = (value: boolean) => { busyRef.current = value; if (mounted.current) { setBusy(value); if (!value) setStopping(false); } };
  const loadModels = async () => {
    setModelLoading(true); setModelError('');
    try {
      const value = await bridge.models(); if (!mounted.current) return;
      const catalog = parsePiModelCatalogOptions(value.catalog).models;
      setSelected(value.selected); setModels(catalog.length ? catalog : [{ id: value.selected.model, name: value.selected.model, provider: value.selected.provider,
        reference: `${value.selected.provider}/${value.selected.model}`, thinkingLevels: [value.selected.thinkingLevel] }]);
    } catch (reason) { if (mounted.current) setModelError(publicAgentErrorText(reason)); }
    finally { if (mounted.current) setModelLoading(false); }
  };
  useEffect(() => {
    mounted.current = true; void loadModels(); bridge.ready?.();
    // Refresh a saved view from receipts; restoring never submits a new model call.
    if (initial.current.turns.length && bridge.history) void bridge.history().then((records) => {
      if (!mounted.current || busyRef.current) return;
      setTurns((rows) => rows.map((row) => { const record = records.find((item) => item.requestId === row.requestId); return record ? { ...portableRecordTurn(record, questionField, row), id: row.id } : row; }));
    }).catch(() => { /* Saved partial output and its explicit reconciliation action remain. */ });
    return () => { mounted.current = false; };
  }, [bridge]);
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify({ draft, turns: turns.slice(-30).map((row) => ({ ...row, output: row.output.slice(0, 64000) })) })); }
    catch { /* Runtime history remains authoritative if browser storage is unavailable. */ }
  }, [draft, key, turns]);
  const showHistory = async () => {
    setHistoryOpen(true); setHistoryError(''); setHistoryLoading(true);
    try { const records = await bridge.history?.(); if (mounted.current) setHistory(records ?? []); }
    catch (reason) { if (mounted.current) setHistoryError(publicAgentErrorText(reason)); }
    finally { if (mounted.current) setHistoryLoading(false); }
  };
  const check = async (turn: PortableTurn) => {
    if (busyRef.current || !turn.requestId || !bridge.reconcile) return;
    setChecking(true); setRunning(true);
    try { const row = await bridge.reconcile(turn.requestId); updateTurn(turn.id, (previous) => ({ ...portableRecordTurn(row, questionField, previous), id: turn.id })); }
    catch (reason) { updateTurn(turn.id, (row) => ({ ...row, state: 'unconfirmed', error: publicAgentErrorText(reason) })); }
    finally { if (mounted.current) setChecking(false); setRunning(false); }
  };
  const run = async (actionId = answerAction, retry?: PortableTurn) => {
    if (busyRef.current || !bridge.invoke || !selected || modelLoading) return;
    const question = retry?.question ?? draft.trim(); if (!question) return;
    if (retry && unresolvedPortableState(retry.state)) { await check(retry); return; }
    const unresolved = [...turnRef.current].reverse().find((row) => row.question === question && row.actionId === actionId && unresolvedPortableState(row.state));
    if (unresolved) { await check(unresolved); return; }
    const values = retry ? { ...retry.values } : { [questionField]: question };
    if (!retry && options.contextField && actionId !== options.sourcesActionId) {
      const context = turnRef.current.filter((row) => row.state === 'completed' && row.actionId !== options.sourcesActionId).slice(-4).map((row) => ({ question: row.question, answer: row.output }));
      while (context.length && JSON.stringify(context).length > 14000) context.shift();
      if (context.length) values[options.contextField] = JSON.stringify(context);
    }
    const requestId = crypto.randomUUID(); const id = retry?.id ?? requestId;
    const turn: PortableTurn = { id, requestId, question, actionId, values, createdAtMs: Date.now(), state: 'queued', output: '', sources: [], stages: [] };
    setScrollToLatestRequest((value) => value + 1);
    setRunning(true); setSource(undefined); setHistoryOpen(false); setDraft('');
    setTurns((rows) => retry ? rows.map((row) => row.id === retry.id ? turn : row) : [...rows, turn]);
    const controller = new AbortController(); abort.current = controller;
    try {
      const result = await bridge.invoke(actionId, values, { requestId, model: { ...selected }, signal: controller.signal,
        onProgress: (progress) => updateTurn(id, (row) => applyPortableProgress(row, progress)) });
      updateTurn(id, (row) => applyPortableResult(row, { ...result, ...(result.text === undefined && actionId === options.sourcesActionId && !row.output ? { text: '检索已完成，点击来源查看证据。' } : {}) }));
    } catch (reason) {
      const value = failure(reason);
      updateTurn(id, (row) => ({ ...row, requestId: value.requestId ?? row.requestId, state: value.state ?? 'unconfirmed', error: publicAgentErrorText(value.message ?? reason) }));
      if (mounted.current) setDraft(question);
    } finally { abort.current = undefined; setRunning(false); }
  };
  const restore = (record: PortableRecord) => {
    if (busyRef.current) return;
    const row = portableRecordTurn(record, questionField); const previous: PortableTurn[] = [];
    if (options.contextField) try {
      const context = JSON.parse(record.input?.[options.contextField] ?? '[]');
      if (Array.isArray(context)) for (const item of context.slice(-4)) if (typeof item.question === 'string' && typeof item.answer === 'string') {
        const original = history.find(candidate => candidate.requestId !== record.requestId && candidate.actionId === answerAction
          && candidate.version === record.version && candidate.state === 'completed'
          && candidate.input?.[questionField] === item.question && candidate.result?.text === item.answer);
        const id = `context:${record.requestId}:${previous.length}`;
        previous.push(original ? { ...portableRecordTurn(original, questionField), id }
          : { id, question: item.question, output: item.answer, actionId: answerAction, values: {}, state: 'completed', sources: [], stages: [], createdAtMs: row.createdAtMs, restored: true });
      }
    } catch { /* The recorded turn remains readable without optional past context. */ }
    setTurns([...previous, row]); setConversationId(`app:${options.title}:${row.id}`); setHistoryOpen(false); setSource(undefined); setDraft(row.state === 'completed' ? '' : row.question);
  };
  const byId = new Map(turns.map((row) => [`${row.id}:assistant`, row]));
  const messages: TranscriptMessage[] = turns.flatMap((row) => [
    { id: `${row.id}:user`, role: 'user', text: row.question, timestamp: row.createdAtMs },
    { id: `${row.id}:assistant`, role: 'assistant', timestamp: row.createdAtMs, turnId: row.id, blocks: [
      { id: `${row.id}:activity`, kind: 'thinking', summary: row.restored && row.state === 'completed' ? '已恢复保存的结果' : row.restored && unresolvedPortableState(row.state) ? '原调用状态待核对' : portableStageLabels[row.state] ?? '正在处理', status: terminal(row.state) || row.restored || (!busy && unresolvedPortableState(row.state)) ? 'done' : 'running',
        detail: row.stages.map((stage) => `${conversationClock(stage.at)}  ${stage.label}`).join('\n') || (row.restored ? '此内容来自保存记录，本次没有调用模型。' : undefined) },
      { id: `${row.id}:answer`, kind: 'text', text: row.output, streaming: !terminal(row.state) && !row.restored && busy },
    ] },
  ]);
  const controller: ConversationSurfaceController = { conversationId, messages, phase: stopping ? 'stopping' : busy ? 'responding' : 'idle', scrollToLatestRequest, capabilities: NO_CAPABILITIES, formatTimestamp: conversationClock,
    renderBlock: (block, message) => {
      if (block.kind !== 'text') return undefined;
      const row = byId.get(message.id); const references = row?.sources.filter((item) => Number.isInteger(item.citationNumber)) ?? [];
      return <MarkdownCitations numbers={references.map((item) => item.citationNumber!)} onOpen={(number) => { const found = references.find((item) => item.citationNumber === number); if (found) setSource({ ...found, appVersion: row?.version }); }}>
        <MarkdownBody allowTraceDiagnosticReceipt={false} documentKey={block.id} streamingTail={Boolean(block.streaming)} text={block.text} />
      </MarkdownCitations>;
    },
    renderMessageFooter: (message) => {
      const row = byId.get(message.id); if (!row) return undefined;
      const uncertain = unresolvedPortableState(row.state); const failed = ['failed', 'cancelled', 'rejected'].includes(row.state);
      return <><div className="paw-portable-sources">{row.sources.map((item) => <button type="button" key={`${item.sourceId}:${item.chunkId ?? ''}:${item.citationNumber ?? ''}`} onClick={() => setSource({ ...item, appVersion: row.version })}><BookOpen size={13} />{item.citationNumber ? <span>{item.citationNumber}</span> : null}<span>{item.title}</span>{item.citation?.page ? <small>p.{item.citation.page}</small> : null}</button>)}</div>
        <PortableResearchReceipt turn={row} onOpen={(item) => setSource({ ...item, appVersion: row.version })} />
        {bridge.capabilities?.reportExport !== false && row.state === 'completed' && row.finalOutputConfirmed === true && row.output.trim() && row.actionId !== options.sourcesActionId ? <Button size="small" onClick={() => { if (!bridge.downloadReport?.(row)) downloadResearchReport(options.title, row); }}><Download size={14} />导出研究报告</Button> : null}
        {(!busy || row.restored) && (uncertain || failed) ? <div className="paw-app-recovery" role="status"><p>{uncertain ? '原调用尚未确认。已收到的文字和来源仍保留，先核对记录再继续。' : row.error || '本轮已停止，问题已保留。'}</p><AgentRecoveryActions disabled={busy} label={uncertain ? '核对原调用' : undefined} onRetry={uncertain ? () => void check(row) : () => void run(row.actionId, row)} onSwitchModel={() => setModelOpen((value) => value + 1)} /></div> : null}
        {row.state === 'completed' && !row.finalOutputConfirmed && row.output ? <p className="paw-portable-note">最终报告尚未确认，已收到的文字与来源仍保留。</p> : null}
        {row.state === 'completed' && !row.output ? <p className="paw-portable-note">本次未返回可用回答，来源和调用记录已保留。</p> : null}
      </>;
    } };
  return <section className="paw-portable-app" aria-label={options.title}>
    <header className="paw-portable-header"><div><h1>{options.title}</h1>{options.description ? <p>{options.description}</p> : null}</div><div className="paw-portable-toolbar">
      {bridge.history ? <IconButton icon={<History size={18} />} label="最近对话" disabled={busy} onClick={() => void showHistory()} /> : null}
      <IconButton icon={<MessageSquarePlus size={18} />} label="新对话" disabled={busy} onClick={() => { setTurns([]); setDraft(''); setSource(undefined); setHistoryOpen(false); setConversationId(`app:${options.title}:${crypto.randomUUID()}`); textarea.current?.focus(); }} /></div></header>
    <div className="paw-portable-workspace" data-source-open={Boolean(source)}>
      <ConversationSurface label="Agent 对话" controller={controller} empty={<div className="paw-portable-welcome"><BookOpen size={28} strokeWidth={1.5} /><h2>{options.welcome ?? '从一个问题开始。'}</h2><p>{options.description}</p><div>{options.suggestions?.map((question) => <button key={question} type="button" onClick={() => { setDraft(question); textarea.current?.focus(); }}>{question}<Send size={14} /></button>)}</div></div>}>
        <div className="paw-portable-composer-dock">
          {modelError ? <div className="paw-app-recovery" role="alert"><p>{modelError}</p><Button size="small" disabled={modelLoading} onClick={() => void loadModels()}>重新读取模型</Button></div> : null}
          <ComposerShell surface="session" busy={busy} attachments={[]} onRemoveAttachment={() => {}} onSurfacePress={() => textarea.current?.focus()}
            textarea={<textarea ref={textarea} className="agent-composer__textarea" aria-label="消息" value={draft} readOnly={busy} placeholder={options.placeholder ?? '提出问题，或继续追问…'} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void run(); } }} />}
            controls={<><ModelPicker options={selected ? { models, modelReference: `${selected.provider}/${selected.model}`, thinking: selected.thinkingLevel } : undefined} disabled={busy} pending={modelLoading} requestOpen={modelOpen} onChange={(provider, model, thinkingLevel) => setSelected({ provider, model, thinkingLevel })} />{options.sourcesActionId ? <IconButton icon={<Search size={16} />} label="只检索来源" disabled={busy || !draft.trim() || modelLoading || !selected} onClick={() => void run(options.sourcesActionId)} /> : null}</>}
            actions={busy ? <IconButton icon={<Square size={17} />} label={checking ? '正在核对原调用' : stopping ? '正在停止' : '停止本轮'} disabled={checking || stopping || !bridge.capabilities?.cancel} onClick={() => { setStopping(true); abort.current?.abort(); }} /> : <IconButton className="agent-composer__send" icon={<Send size={18} />} label="发送" disabled={!draft.trim() || modelLoading || !selected || !bridge.invoke} onClick={() => void run()} />} />
          <p className="paw-portable-footer">{options.footer ?? '回答基于本次检索资料。点击引用核对来源。'}</p>
        </div>
      </ConversationSurface>
      {source ? <SourceReader key={`${source.sourceId}:${source.chunkId}`} source={source} readSource={bridge.readSource ? (locator) => bridge.readSource!({ ...locator, ...(source.appVersion !== undefined ? { appVersion: source.appVersion } : {}) }) : undefined} onClose={() => setSource(undefined)} /> : null}
    </div>
    {historyOpen ? <aside className="paw-portable-history" aria-label="最近对话记录"><header><h2>最近对话</h2><IconButton icon={<X size={17} />} label="关闭最近对话" onClick={() => setHistoryOpen(false)} /></header>{historyLoading ? <p role="status">正在读取保存记录…</p> : historyError ? <div role="alert"><p>{historyError}</p><Button onClick={() => void showHistory()}>重新读取记录</Button></div> : history.length ? history.slice(0, 30).map((row) => <button key={row.requestId} onClick={() => restore(row)}><span>{row.input?.[questionField] || '应用调用'}</span><small>{portableStageLabels[row.state] ?? row.state}{row.version ? ` · v${row.version}` : ''}</small></button>) : <p>还没有调用记录。</p>}</aside> : null}
  </section>;
}
