import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useControlTransport } from '@/app/control-transport';
import { Button } from '@/components/primitives';
import { useRichHtmlPreview } from '@/features/agent/file-preview/use-rich-html-url';
import { commandLabApp, externalWorkspaceUrl, pendingLabAppCommands, readLabAppSource, type LabApp, type LabAppCall, type LabAppCommand, type LabAppVersion } from './apps';
import type { SourceLocator } from '@/features/agent/portable/SourceReader';
import { PortableUsageSummary } from '@/features/agent/portable/PortableResearchReceipt';
import { portableObject } from '@/features/agent/portable/conversation-types';
import { requestLabControl } from '../control-request';
import { object, type JsonValue } from './types';
import { projectCommandRejected, projectError } from './api';

const bridge = `<script>(()=>{
  const pending=new Map();
  const request=(kind,fields={},onProgress)=>new Promise((resolve,reject)=>{
    const requestId=crypto.randomUUID();pending.set(requestId,{resolve,reject,onProgress});
    parent.postMessage({kind,requestId,...fields},'*');
  });
  window.pawApp=Object.freeze({mode:'paw',capabilities:Object.freeze({progress:true,cancel:true,sourceReader:true}),
    ready:()=>parent.postMessage({kind:'paw.lab-app.ready',requestId:crypto.randomUUID()},'*'),
    invoke:(actionId,input={},options={})=>{
      if(options.requestId!==undefined&&(typeof options.requestId!=='string'||!(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/).test(options.requestId)))return Promise.reject(Object.assign(new Error('请求标识需要规范 UUID。'),{state:'rejected'}));
      const requestId=options.requestId??crypto.randomUUID();
      if(pending.has(requestId))return Promise.reject(Object.assign(new Error('原调用仍在进行，请核对原记录。'),{state:'unconfirmed',requestId}));
      const stop=()=>parent.postMessage({kind:'paw.lab-app.cancel',requestId},'*');
      const result=new Promise((resolve,reject)=>{
        pending.set(requestId,{resolve,reject,onProgress:options.onProgress});
        parent.postMessage({kind:'paw.lab-app.invoke',requestId,actionId,input,model:options.model},'*');
        options.signal?.addEventListener('abort',stop,{once:true});if(options.signal?.aborted)stop();
      });
      return result.finally(()=>options.signal?.removeEventListener('abort',stop));
    },
    models:()=>request('paw.lab-app.models'),
    readSource:(locator)=>request('paw.lab-app.source',{locator}),
    reconcile:(callId)=>request('paw.lab-app.reconcile',{callId}),
    history:()=>request('paw.lab-app.history')});
  addEventListener('message',e=>{
    if(e.source!==parent||!['paw.lab-app.result','paw.lab-app.progress'].includes(e.data?.kind))return;
    const p=pending.get(e.data.requestId);if(!p)return;
    if(e.data.kind==='paw.lab-app.progress'){try{p.onProgress?.(e.data.progress)}catch{}return}
    pending.delete(e.data.requestId);
    if(e.data.ok)p.resolve(e.data.result);
    else p.reject(Object.assign(new Error(e.data.message||'应用调用未完成'),{state:e.data.state,requestId:e.data.requestId}));
  });
})();</script>`;
const policy = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">`;

export function LabAppPreview({ app, version, calls, onActivity }: { app: LabApp; version: LabAppVersion; calls: LabAppCall[]; onActivity: () => void }) {
  const transport = useControlTransport();
  const inFlight = useRef(new Set<string>()); const delivered = useRef(new Set<string>());
  const requestCalls = useRef(new Map<string, string>());
  const progressSent = useRef(new Map<string, string>());
  const cancelWanted = useRef(new Set<string>()); const cancelSent = useRef(new Set<string>());
  const [integratedProgress, setIntegratedProgress] = useState(false);
  const [workspaceVisible, setWorkspaceVisible] = useState(false);
  const [workspaceOpened, setWorkspaceOpened] = useState(false);
  const external = version.spec.externalWorkspace;
  const split = external?.presentation === 'split';
  const destination = externalWorkspaceUrl(external?.url);
  // A cross-origin workspace keeps its own service identity and API cookies.
  // Never allow an App-authored URL to mount this control surface as a sibling.
  const workspaceUrl = destination && new URL(destination).origin !== window.location.origin ? destination : null;
  const [error, setError] = useState('');
  const [pending, setPending] = useState<LabAppCommand[]>(() => pendingLabAppCommands(transport, app.appId)
    .filter((command) => command.action === 'invoke' ? command.input.version === version.version : ['cancel', 'resume'].includes(command.action)));
  const html = useMemo(() => `<!doctype html>${policy}${bridge}${version.html}`, [version.html]);
  const { frame, key, onLoad, url: previewUrl } = useRichHtmlPreview(html);
  useEffect(() => { setIntegratedProgress(false); }, [version.html]);
  const send = useCallback(async (command: LabAppCommand, requestId?: string) => {
    setError('');
    try {
      const receipt = await commandLabApp(transport, command);
      setPending((items) => items.filter((item) => item.clientRequestId !== command.clientRequestId));
      if (receipt.call && requestId) requestCalls.current.set(receipt.call.callId, requestId);
      onActivity();
    } catch (reason) {
      const definite = projectCommandRejected(reason);
      setPending((items) => [...items.filter((item) => item.clientRequestId !== command.clientRequestId), ...(definite ? [] : [command])]);
      const message = projectError(reason, '应用请求暂未确认，已保留原输入。'); setError(message);
      if (definite && requestId) frame.current?.contentWindow?.postMessage({ kind: 'paw.lab-app.result', requestId, ok: false, state: 'rejected', message }, '*');
      if (definite) onActivity();
    }
  }, [transport, onActivity]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = object(event.data);
      if (typeof data.requestId !== 'string' || !/^[a-f0-9-]{36}$/u.test(data.requestId)) return;
      if (data.kind === 'paw.lab-app.ready') { setIntegratedProgress(true); return; }
      if (data.kind === 'paw.lab-app.cancel') {
        if (inFlight.current.has(data.requestId)) {
          cancelWanted.current.add(data.requestId);
          const call = calls.find((item) => requestCalls.current.get(item.callId) === data.requestId
            && item.appId === app.appId && item.version === version.version);
          if (call && ['queued', 'running', 'interrupted'].includes(call.state) && !cancelSent.current.has(call.callId)) {
            cancelSent.current.add(call.callId);
            void send({ action: 'cancel', appId: app.appId, expectedRevision: app.revision,
              clientRequestId: `app-frame-cancel:${data.requestId}`, input: { callId: call.callId } });
          }
          onActivity();
        }
        return;
      }
      if (data.kind === 'paw.lab-app.models') {
        void transport.request({ pathId: 'agent.role.models' }).then(catalog => {
          frame.current?.contentWindow?.postMessage({ kind: 'paw.lab-app.result', requestId: data.requestId, ok: true,
            result: { catalog, selected: version.spec.model } }, '*');
        }).catch(reason => frame.current?.contentWindow?.postMessage({ kind: 'paw.lab-app.result', requestId: data.requestId,
          ok: false, message: projectError(reason, '模型列表暂时不可读。') }, '*'));
        return;
      }
      if (data.kind === 'paw.lab-app.source') {
        const locator = object(data.locator) as SourceLocator & { appVersion?: number };
        const read = async () => {
          const selectedVersion = locator.appVersion ?? version.version;
          if (!Number.isSafeInteger(selectedVersion) || selectedVersion < 1) throw new Error('引用的应用版本无效。');
          let contentHash = version.contentHash;
          if (selectedVersion !== version.version) {
            if (!calls.some(call => call.appId === app.appId && call.version === selectedVersion)) throw new Error('此历史引用没有当前应用的原调用记录。');
            const response = object(await requestLabControl(transport, { pathId: 'agent.eval-lab.apps.get', query: { appId: app.appId, version: selectedVersion } }));
            const selected = object(response.version);
            if (response.ok !== true || selected.appId !== app.appId || selected.version !== selectedVersion
                || typeof selected.contentHash !== 'string' || !selected.contentHash) throw new Error('历史应用版本暂不可读，原引用已保留。');
            contentHash = selected.contentHash;
          }
          return readLabAppSource(transport, app.appId, selectedVersion, contentHash, locator);
        };
        void read().then(source => {
          frame.current?.contentWindow?.postMessage({ kind: 'paw.lab-app.result', requestId: data.requestId, ok: true, result: source }, '*');
        }).catch(reason => frame.current?.contentWindow?.postMessage({ kind: 'paw.lab-app.result', requestId: data.requestId,
          ok: false, state: 'rejected', message: projectError(reason, '引用来源暂不可读，原引用仍保留。') }, '*'));
        return;
      }
      if (data.kind === 'paw.lab-app.reconcile') {
        const call = calls.find(item => item.callId === data.callId || requestCalls.current.get(item.callId) === data.callId);
        frame.current?.contentWindow?.postMessage({ kind: 'paw.lab-app.result', requestId: data.requestId, ok: Boolean(call),
          result: call ? { requestId: call.callId, version: call.version, actionId: call.actionId, input: call.input,
            model: call.model, state: call.state, result: call.result, message: call.error, progress: call.progress } : undefined,
          message: '原请求尚未确认，请通过上方的核对原操作检查接收状态。' }, '*');
        onActivity();
        return;
      }
      if (data.kind === 'paw.lab-app.history') {
        const result = calls.filter((call) => call.appId === app.appId)
          .sort((left, right) => right.createdAtMs - left.createdAtMs).slice(0, 20)
          .map((call) => ({ requestId: call.callId, version: call.version, actionId: call.actionId,
            input: call.input, model: call.model, state: call.state, result: call.result, message: call.error, progress: call.progress,
            createdAtMs: call.createdAtMs, updatedAtMs: call.updatedAtMs }));
        frame.current?.contentWindow?.postMessage({ kind: 'paw.lab-app.result', requestId: data.requestId, ok: true, result }, '*');
        return;
      }
      let inputSize: number;
      try { inputSize = JSON.stringify(data.input ?? {}).length; } catch { return; }
      if (data.kind !== 'paw.lab-app.invoke' || inFlight.current.has(data.requestId)) return;
      if (typeof data.actionId !== 'string' || !version.spec.actions.some((action) => action.id === data.actionId) || inputSize > 32_000) {
        frame.current?.contentWindow?.postMessage({ kind: 'paw.lab-app.result', requestId: data.requestId, ok: false,
          state: 'rejected', message: inputSize > 32_000 ? '应用输入超过长度限制。' : '此应用版本没有声明该操作，请检查应用方法和界面配置。' }, '*');
        return;
      }
      inFlight.current.add(data.requestId);
      void send({ action: 'invoke', appId: app.appId, expectedRevision: app.revision,
        clientRequestId: `app-ui:${app.appId}:${data.requestId}`,
        input: { version: version.version, actionId: data.actionId, values: object(data.input) as Record<string, JsonValue>, ...(data.model ? { model: object(data.model) as Record<string, JsonValue> } : {}) } }, data.requestId);
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, [app.appId, app.revision, version.spec.actions, version.version, version.contentHash, calls, send, onActivity, transport, version.spec.model]);
  useEffect(() => {
    for (const call of calls) {
      const requestId = requestCalls.current.get(call.callId);
      if (!requestId || call.appId !== app.appId || call.version !== version.version || delivered.current.has(call.callId)) continue;
      if (cancelWanted.current.has(requestId) && !cancelSent.current.has(call.callId)
          && ['queued', 'running', 'interrupted'].includes(call.state)) {
        cancelSent.current.add(call.callId);
        void send({ action: 'cancel', appId: app.appId, expectedRevision: app.revision,
          clientRequestId: `app-frame-cancel:${requestId}`, input: { callId: call.callId } });
      }
      const progress = JSON.stringify(call.progress ?? {});
      if (progress !== progressSent.current.get(call.callId)) {
        frame.current?.contentWindow?.postMessage({ kind: 'paw.lab-app.progress', requestId, progress: call.progress ?? {} }, '*');
        progressSent.current.set(call.callId, progress);
      }
      if (!['completed', 'failed', 'cancelled'].includes(call.state)) continue;
      frame.current?.contentWindow?.postMessage({ kind: 'paw.lab-app.result', requestId, ok: call.state === 'completed', state: call.state, result: call.result, message: call.error }, '*');
      delivered.current.add(call.callId);
    }
  }, [calls, app.appId, app.revision, version.version, send]);
  const active = calls.filter((call) => call.appId === app.appId && ['queued', 'running', 'interrupted'].includes(call.state)
    && (!integratedProgress || !requestCalls.current.has(call.callId) || call.state === 'interrupted' || pending.length > 0 || error));
  return <div className={`lab-app-preview${split ? ' lab-app-preview--split' : ''}`} data-workspace-view={workspaceVisible ? 'workspace' : 'chat'}>
    {external ? <nav className="lab-app-preview__workspaces" aria-label="应用工作区">
      <button type="button" aria-pressed={!workspaceVisible} onClick={() => setWorkspaceVisible(false)}>资料问答</button>
      <button type="button" aria-pressed={workspaceVisible} onClick={() => { setWorkspaceOpened(true); setWorkspaceVisible(true); }}>{external.title}</button>
      {workspaceUrl ? <a href={workspaceUrl} target="_blank" rel="noopener noreferrer">在浏览器打开 ↗</a> : null}
    </nav> : null}
    {error || pending.length ? <div className="lab-project-error" role="alert"><p>{error || '有尚未确认的应用操作，已保留原请求。'}</p>{pending.map((command) => <Button key={command.clientRequestId} onClick={() => void send(command, command.action === 'invoke' ? command.clientRequestId.split(':').at(-1) : undefined)}>核对原操作</Button>)}</div> : null}
    {active.length ? <div className="lab-app-preview__activity" role="status">{active.map((call) => <span key={call.callId}>
      <small>应用 v{call.version}</small>
      {call.state === 'interrupted' ? '调用中断，保留原请求' : call.cancelRequested ? '正在停止…' : appProgressLabel(call.progress?.stage)}
      {call.state === 'interrupted' && !call.cancelRequested ? <Button size="small" onClick={() => void send({ action: 'resume', appId: app.appId, expectedRevision: app.revision, clientRequestId: `app-resume:${crypto.randomUUID()}`, input: { callId: call.callId } })}>恢复原调用</Button> : null}
      <Button size="small" disabled={call.cancelRequested && call.state !== 'interrupted'} onClick={() => void send({ action: 'cancel', appId: app.appId, expectedRevision: app.revision, clientRequestId: `app-cancel:${crypto.randomUUID()}`, input: { callId: call.callId } })}>{call.cancelRequested && call.state === 'interrupted' ? '重试停止' : '停止'}</Button>
    </span>)}</div> : null}
    <div className="lab-app-preview__panes">
    <iframe key={key} onLoad={onLoad} ref={frame} data-pane="chat" title={`${version.spec.title} · 应用预览`} hidden={!split && workspaceVisible} sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" src={previewUrl} />
    {external && (workspaceOpened || split) ? workspaceUrl
      ? <iframe data-pane="workspace" title={external.title} hidden={!split && !workspaceVisible} sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" src={workspaceUrl} />
      : <p hidden={!split && !workspaceVisible} className="lab-project-error" role="alert">工作台地址不可用。请检查应用声明的 HTTPS 或本机服务地址；不能嵌入当前控制服务。</p> : null}
    </div>
    {calls.length ? <details className="lab-app-preview__receipts"><summary>实际调用记录 · {calls.length}</summary>{calls.map((call) => <article key={call.callId}>
      <strong>{version.spec.actions.find((action) => action.id === call.actionId)?.title ?? call.actionId} · {call.state === 'completed' ? '已完成' : call.state === 'failed' ? '失败' : call.state === 'cancelled' ? '已停止' : call.state === 'interrupted' ? '中断' : '处理中'}</strong>
      <small>应用 v{call.version} · {call.sessionId || '等待 Runtime 接纳'}</small>
      {call.result.text ? <pre>{call.result.text}</pre> : call.progress?.text ? <><pre>{call.progress.text}</pre><small className="lab-app-preview__partial">以上为未完成进度文本，最终回执没有提供可用回答。</small></> : call.error ? <p>{call.error}</p> : null}
      <PortableUsageSummary value={{ usage: portableObject(call.result.usage), assistantUsage: portableObject(call.result.assistantUsage),
        usageScopes: portableObject(call.result.usageScopes), stageReceipts: portableObject(call.progress?.stageReceipts),
        knowledge: portableObject(call.result.knowledge ?? call.progress?.knowledge) }} />
    </article>)}</details> : null}
  </div>;
}

function appProgressLabel(stage?: string): string {
  const labels: Record<string, string> = { planning: '正在规划研究查询…', context_ready: '已读取应用资料', retrieving: '正在检索资料…', sources_ready: '来源已找到', model_starting: '正在连接模型…', model_wait: '正在等待模型响应…', thinking: '模型正在思考…', answering: '正在输出回答…' };
  return labels[stage ?? ''] ?? '应用正在处理…';
}
