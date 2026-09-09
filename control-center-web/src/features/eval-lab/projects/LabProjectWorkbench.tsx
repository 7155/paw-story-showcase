import { ResearchFlowControls } from '@/paw-os/showcase/ResearchFlowControls';
import { OptimizationControls } from '@/paw-os/showcase/OptimizationControls';
import { LabFlowControls } from '@/paw-os/showcase/LabFlowControls';
import { ProjectRequirements } from './ProjectRequirements';
import { ArrowLeft, ArrowUpRight, FileText, FolderOpen, History, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, RefreshCw, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useControlTransport } from '@/app/control-transport';
import { Button, IconButton } from '@/components/primitives';
import { useAgentLiveStore } from '@/features/agent/state/live-store';
import { GoldenWorkflow } from '../golden/GoldenWorkflow';
import { SceneTrialPanel } from '../trials/SceneTrialPanel';
import { ArtifactSurface, type ArtifactDraft } from './ArtifactSurface';
import { projectError, readLabProject, useLabArtifact, useLabProjects } from './api';
import { acceptedProjectMessage, initialProjectMessage, pendingProjectMessages, ProjectGuide, retainProjectMessage, sendProjectGuideMessage, type PendingProjectMessage } from './ProjectGuide';
import { readArtifactDrafts, writeArtifactDrafts } from './drafts';
import { LabAppDelivery } from './LabAppDelivery';
import { LabKnowledge } from './LabKnowledge';
import { NewKnowledgeApp } from './NewKnowledgeApp';
import { ProjectMaterials } from './ProjectMaterials';
import { LabProjectJourney } from './LabProjectJourney';
import { baselineKind } from './knowledge-baseline';
import { defaultProjectView, journeyStages, nextProjectView, readProjectViews, writeProjectViews, type ProjectPage, type ProjectView } from './views';
import { object, type ArtifactAction, type JsonValue, type LabBinding, type LabProject, type ProjectReceipt } from './types';
import './lab-project-workbench.css';

type Intake = { sourceId?: string; title: string; kind?: string; text: string };
export function LabProjectWorkbench({ initialProjectId = '', initialProjectPage, initialView, onOpenHistory, onProjectSelect }: { initialProjectId?: string; initialProjectPage?: ProjectPage; initialView?:Partial<ProjectView>; onOpenHistory?: () => void; onProjectSelect?: (id: string,view?:ProjectView) => void }) {
  const transport = useControlTransport(); const [projectId, setProjectId] = useState(initialProjectId);
  const currentProjectId = useRef(projectId); currentProjectId.current = projectId;
  const workflow = useLabProjects(projectId); const project = workflow.project.data?.project;
  const demoFlow = transport.kind === 'mock' && /^lab-showcase-(enterpriseops|cloudops|memory)$/.test(projectId);
  const guideMessages = useAgentLiveStore((state) => state.projections[project?.guideSessionId ?? '']?.messagesById);
  const [views, setViews] = useState<Record<string, ProjectView>>(() => readProjectViews(workflow.connection)); const viewsRef = useRef(views);
  const projectDefaultView: ProjectView = { ...defaultProjectView, ...(demoFlow ? { page:'materials', journeyStep:0 } : transport.kind==='mock' && (projectId==='lab-showcase-rag' || projectId.startsWith('lab-project-showcase-')) ? {page:'journey',journeyStep:0} : {}), guideOpen:project?.workspace.layout !== 'focus' };
  const view = views[projectId] ?? projectDefaultView; const { page, guideOpen } = view;
  const [drafts, setDrafts] = useState<Record<string, ArtifactDraft>>(() => readArtifactDrafts(workflow.connection));
  const draftsRef = useRef(drafts);
  const [notice, setNotice] = useState(''); const [sending, setSending] = useState(false);
  const [historyImportOpen, setHistoryImportOpen] = useState(false);
  const [appIntakeReceipt, setAppIntakeReceipt] = useState<ProjectReceipt>();
  const appIntakeKey = `paw.lab.active-app-intake:${workflow.connection}`;
  const appIntakeActive = useRef(false);
  try { if (sessionStorage.getItem(appIntakeKey) === 'true') appIntakeActive.current = true; } catch { /* The current form retains its mode. */ }
  const [pendingMessages, setPendingMessages] = useState<PendingProjectMessage[]>([]);
  const [draftRequest, setDraftRequest] = useState<{ id: number; text: string }>();
  const [stagedAction, setStagedAction] = useState<{ text: string; title: string }>();
  const binding = project?.bindings.find((item) => item.bindingId === view.bindingId); const [intakeOpen, setIntakeOpen] = useState(false);
  const restored = useRef(''); const selectionKey = `paw.lab.project-selection.v1:${workflow.connection}`;
  const updateView = (patch: Partial<ProjectView>, publish=true) => {
    const next = { ...viewsRef.current, [projectId]: nextProjectView(viewsRef.current[projectId] ?? projectDefaultView, patch) };
    viewsRef.current = next; setViews(next);
    if (!writeProjectViews(workflow.connection, next)) setNotice('当前浏览器未能保存查看位置，已保存的项目和运行不受影响。');
    if(publish && projectId) onProjectSelect?.(projectId,next[projectId]);
  };
  const setPage = (next: ProjectPage) => updateView({ page:next });
  const goJourney=(journeyStep=view.journeyStep ?? 0,intakeTab=view.intakeTab)=>updateView({page:demoFlow ? journeyStep===0?'materials':journeyStep===1?'brief':journeyStep===5?'apps':'artifact' : 'journey',artifactId:journeyStep===0?'demo-config':'demo-report',journeyStep,intakeTab,guideOpen:false});
  const returnToJourney=()=>goJourney(view.returnStep ?? view.journeyStep ?? 0);
  const navigationSignature=JSON.stringify(initialView ?? (initialProjectPage ? {page:initialProjectPage} : {}));
  const setGuideOpen = (next: boolean | ((current: boolean) => boolean)) => updateView({ guideOpen:typeof next === 'function' ? next(viewsRef.current[projectId]?.guideOpen ?? projectDefaultView.guideOpen) : next });
  const setBinding = (next?: LabBinding) => updateView({ bindingId:next?.bindingId });
  const updateDraft = (key: string, draft?: ArtifactDraft) => {
    const next = { ...draftsRef.current }; if (draft) next[key] = draft; else delete next[key];
    draftsRef.current = next; setDrafts(next);
    if (!writeArtifactDrafts(workflow.connection, next)) setNotice('浏览器暂时无法保存草稿；本窗口仍保留输入，请先保存成果再关闭。');
  };
  useEffect(() => {
    if (restored.current === workflow.connection) return;
    restored.current = workflow.connection;
    const savedDrafts = readArtifactDrafts(workflow.connection); draftsRef.current = savedDrafts; setDrafts(savedDrafts);
    const savedViews = readProjectViews(workflow.connection); viewsRef.current = savedViews; setViews(savedViews);
    if (initialProjectId) return;
    try { setProjectId(localStorage.getItem(selectionKey) ?? ''); } catch { /* Start at the project list. */ }
  }, [workflow.connection, initialProjectId, selectionKey]);
  useEffect(() => { if (initialProjectId) setProjectId(initialProjectId); }, [initialProjectId]);
  useEffect(() => {
    const requested=JSON.parse(navigationSignature) as Partial<ProjectView>;
    if(initialProjectId && Object.keys(requested).length && projectId===initialProjectId) updateView({artifactId:undefined,bindingId:undefined,knowledgeJobId:undefined,goldenJobId:undefined,materialSourceId:undefined,materialCorpusId:undefined,materialPage:undefined,appId:undefined,appVersion:undefined,useBaseline:undefined,experimentId:undefined,...requested,guideOpen:viewsRef.current[projectId]?.guideOpen ?? false},false);
  },[initialProjectId,navigationSignature,projectId]);
  useEffect(() => {
    if (!project) { setPendingMessages([]); return; }
    const pending = pendingProjectMessages(transport, project);
    for (const row of pending) if (acceptedProjectMessage(project, row.clientMessageId)) retainProjectMessage(transport, project, row, true);
    setPendingMessages(pendingProjectMessages(transport, project));
  }, [transport, project?.projectId, project?.guideSessionId, guideMessages]);
  const openProject = (id: string) => {
    currentProjectId.current = id;
    setProjectId(id); setPendingMessages([]); setNotice(''); setStagedAction(undefined);
    try { if (id) localStorage.setItem(selectionKey, id); else localStorage.removeItem(selectionKey); } catch { /* The current view remains usable. */ }
    onProjectSelect?.(id, id ? viewsRef.current[id] : undefined);
  };
  const selectedId = project ? view.artifactId ?? project.workspace.primaryArtifactId : '';
  const selected = project?.artifacts.find((item) => item.artifactId === selectedId);
  const artifact = useLabArtifact(projectId, selected?.artifactId ?? '', selected?.revision);
  const draftKey = `${workflow.connection}:${projectId}:${selectedId}`;
  const busy = Boolean(workflow.pending) || workflow.mutation.isPending;
  const activeError = workflow.mutation.error ?? workflow.project.error ?? workflow.catalog.error;
  const refresh = () => { void workflow.catalog.refetch(); if (projectId) void workflow.project.refetch(); };
  const start = async (current: LabProject, message = initialProjectMessage) => {
    setSending(true); setNotice('');
    try { await sendProjectGuideMessage(transport, current, message, `lab-project-start:${current.projectId}`); }
    catch (error) { setNotice(projectError(error, '消息未完成，已保留在项目对话中。')); }
    finally { setSending(false); if (currentProjectId.current === current.projectId) setPendingMessages(pendingProjectMessages(transport, current)); }
  };
  const created = async (receipt?: ProjectReceipt, message = initialProjectMessage) => {
    if (!receipt) return;
    appIntakeActive.current = false;
    setAppIntakeReceipt(undefined);
    try { sessionStorage.removeItem(appIntakeKey); } catch { /* Creation is already durable. */ }
    try { sessionStorage.removeItem(`paw.lab.new-project.v1:${workflow.connection}`); } catch { /* The created project is already durable. */ }
    if (message !== initialProjectMessage) {
      const next = { ...viewsRef.current, [receipt.project.projectId]: { ...defaultProjectView, page: 'journey' as const, guideOpen: false } };
      viewsRef.current = next; setViews(next); writeProjectViews(workflow.connection, next);
    }
    openProject(receipt.project.projectId);
    if (message && receipt.project.guideSessionId) await start(receipt.project, message);
  };
  const ensureGuide = async () => {
    if (!project) return;
    const receipt = await workflow.submit('ensure_guide', {}, project);
    if (receipt) await start(receipt.project);
  };
  const act = async (action: ArtifactAction, values: Record<string, JsonValue>, staged = false) => {
    if (!project || !selected) return;
    const text = `${action.prompt}\n\n当前成果：${selected.title}\n成果引用：${selected.artifactId} · v${selected.revision}\n用户输入：${JSON.stringify(values)}`;
    setGuideOpen(true);
    if (staged) { setStagedAction({ text, title: selected.title }); return; }
    setSending(true); setNotice('');
    try { await sendProjectGuideMessage(transport, project, text, `lab-artifact-action:${crypto.randomUUID()}`); }
    catch (error) { setNotice(projectError(error)); }
    finally { setSending(false); if (currentProjectId.current === project.projectId) setPendingMessages(pendingProjectMessages(transport, project)); }
  };
  const recoverMessage = async (message: PendingProjectMessage) => {
    if (!project || sending) return;
    // A completed send removes its durable pending entry before React may refresh this banner.
    // Never reconstruct that request from a now-running Session's delivery mode.
    const pending = pendingProjectMessages(transport, project);
    if (!pending.some((row) => row.clientMessageId === message.clientMessageId)) { setPendingMessages(pending); return; }
    if (acceptedProjectMessage(project, message.clientMessageId)) { retainProjectMessage(transport, project, message, true); setPendingMessages(pendingProjectMessages(transport, project)); return; }
    setSending(true); setNotice(''); setGuideOpen(true);
    const clientId = message.outcome === 'unknown' ? message.clientMessageId : `lab-project-retry:${crypto.randomUUID()}`;
    if (message.outcome === 'rejected') retainProjectMessage(transport, project, message, true);
    try { await sendProjectGuideMessage(transport, project, message.message, clientId); }
    catch (reason) { setNotice(projectError(reason)); }
    finally { setSending(false); if (currentProjectId.current === project.projectId) setPendingMessages(pendingProjectMessages(transport, project)); }
  };
  return <main className="eval-lab lab-project-workbench" aria-label="Agent Lab 项目工作台">
    <header className="lab-project-header">
      <div className="lab-project-heading">{projectId ? <IconButton icon={<ArrowLeft size={17} />} label="返回 Lab 项目" onClick={() => openProject('')} /> : <span className="lab-project-logo" aria-hidden="true">L</span>}
        <div><h1>{project?.title ?? (projectId ? '正在读取项目' : '项目')}</h1></div></div>
      <div className="lab-project-header__actions">{!projectId ? <Button size="small" onClick={() => { window.location.href = '/lab-demo/index.html'; }}><ArrowUpRight size={14} />演示流程</Button> : null}<IconButton icon={<RefreshCw size={16} />} label="重新读取 Lab 项目" onClick={refresh} disabled={workflow.catalog.isFetching || workflow.project.isFetching} />
        {project ? <><Button size="small" onClick={() => setIntakeOpen(true)}><Upload size={14} />添加材料</Button><IconButton icon={guideOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />} label={guideOpen ? '收起项目 Agent' : '展开项目 Agent'} onClick={() => setGuideOpen((value) => !value)} /></> : null}
        {!projectId ? <Button size="small" onClick={() => setHistoryImportOpen(true)}><History size={14} />导入已有实验</Button> : null}
        {onOpenHistory ? <Button size="small" onClick={onOpenHistory}><History size={14} />已有实验</Button> : null}</div>
    </header>
    {workflow.pending?.outcome === 'unknown' ? <div className="lab-project-notice" role="status"><p>上次操作的回执尚未确认，原请求和输入已保留。</p><Button disabled={workflow.mutation.isPending} onClick={() => void workflow.reconcile().then((receipt) => { if (receipt && appIntakeActive.current && ['create', 'knowledge'].includes(workflow.pending?.command.action ?? '')) setAppIntakeReceipt(receipt); else if (receipt && workflow.pending?.command.action === 'create') void created(receipt); else if (receipt && workflow.pending?.command.action === 'import_history') { setHistoryImportOpen(false); openProject(receipt.project.projectId); } })}>核对原操作</Button></div> : null}
    {activeError ? <p className="lab-project-error" role="alert">{projectError(activeError)}</p> : null}
    {notice && !pendingMessages.length ? <p className="lab-project-notice" role="status">{notice}</p> : null}
    {pendingMessages.map((message) => <div className="lab-project-notice" role="status" key={message.clientMessageId}><p>{message.error || '项目消息的接纳结果尚未确认，原输入已保留。'}</p><Button disabled={sending} onClick={() => void recoverMessage(message)}>{message.outcome === 'unknown' ? '核对原消息' : '重新发送项目消息'}</Button></div>)}
    {transport.kind === 'mock' && project?.projectId === 'lab-showcase-repair' ? <OptimizationControls busy={busy} dirty={Boolean(drafts[`${workflow.connection}:${projectId}:repair-config`])} status={object(object(workflow.project.data).optimization)} onSubmit={async input => { const receipt = await workflow.submit('knowledge', input, project); if (receipt) await workflow.project.refetch(); return receipt; }} onNavigate={updateView}/> : null}
    {demoFlow && project ? <LabFlowControls project={project} view={view} busy={busy} configurationDirty={Boolean(drafts[`${workflow.connection}:${projectId}:demo-config`])} status={object(object(workflow.project.data).demoFlow)} onSubmit={async (action, input) => { const receipt = await workflow.submit(action, input, project); if (receipt) await workflow.project.refetch(); return receipt; }} onNavigate={updateView} onImport={() => setIntakeOpen(true)} /> : null}
    {!projectId ? <div className="lab-project-home">
      <section className="lab-project-start"><h2>创建深度研究应用</h2><p>导入资料，设计知识库基线，再评测与优化。</p>
        <NewKnowledgeApp key={`knowledge:${workflow.connection}`} connection={workflow.connection} blocked={busy || sending} recoveredReceipt={appIntakeReceipt}
          onCreate={(input) => { appIntakeActive.current = true; try { sessionStorage.setItem(appIntakeKey, 'true'); } catch { /* The current form retains its mode. */ } return workflow.submit('create', input); }} onKnowledge={(input, target) => workflow.submit('knowledge', input, target, true)} onReadProject={async (id) => (await readLabProject(transport, id)).project!} onReady={created} />
        <details className="lab-project-other-input"><summary>其他项目：文本、源码或已有执行目录</summary><NewProject key={workflow.connection} connection={workflow.connection} busy={busy || sending} onCreate={async (input) => created(await workflow.submit('create', input))} /></details></section>
      <section className="lab-project-list" aria-label="最近的优化项目"><header><h2>最近项目</h2><span>{workflow.catalog.data?.items.length ?? '—'}</span></header>
        {workflow.catalog.isPending ? <p role="status">正在读取项目…</p> : !workflow.catalog.data?.items.length && !workflow.catalog.isError ? <p className="lab-project-muted">暂无项目</p> : null}
        {workflow.catalog.data?.items.map((item) => <button key={item.projectId} onClick={() => { if (!viewsRef.current[item.projectId]) { const next = { ...viewsRef.current, [item.projectId]: { ...defaultProjectView, page: 'journey' as const, guideOpen: false } }; viewsRef.current = next; setViews(next); writeProjectViews(workflow.connection, next); } openProject(item.projectId); }} className="lab-project-list__item"><span className="lab-project-list__icon"><FolderOpen size={20} /></span><span><strong>{item.title}</strong><small>{item.artifactCount} 份成果{item.materialCount ? ` · ${item.materialCount} 份补充文本` : ''}</small></span><ArrowUpRight size={17} /></button>)}
      </section>
    </div> : !project ? <div className="lab-project-loading" role="status">{workflow.project.isError ? '项目未能读取，已保存的工作仍保留。' : '正在恢复项目与成果…'}</div>
      : <div className="lab-project-body" data-guide-open={guideOpen}>
        {guideOpen ? <ProjectGuide key={project.projectId} project={project} draftRequest={draftRequest} onNewProject={() => openProject('')} onProjectActivity={refresh} onEnsure={() => void ensureGuide()} /> : null}
        <div className="lab-project-results">
          <nav className="lab-project-tabs" aria-label="项目成果"><button aria-current={page === 'journey' ? 'page' : undefined} onClick={()=>returnToJourney()}>优化过程</button>
            <div className="lab-project-tabs__artifacts">{project.workspace.artifactOrder.map((id) => project.artifacts.find((item) => item.artifactId === id)).filter((item) => item !== undefined).map((item) => <button key={item.artifactId} title={item.title} aria-current={page === 'artifact' && selectedId === item.artifactId ? 'page' : undefined} onClick={() => item.kind===baselineKind ? goJourney(0,'baseline') : updateView({ artifactId:item.artifactId, page:'artifact', bindingId:undefined })}><FileText size={14} /><span>{item.title}</span></button>)}</div>
            <div className="lab-project-tabs__resources"><button aria-current={page === 'materials' ? 'page' : undefined} onClick={() => goJourney(0,'files')}>资料</button>
            <button aria-current={page === 'knowledge' ? 'page' : undefined} onClick={() => goJourney(0,'baseline')}>知识库实验</button>
            {project.bindings.length ? <button aria-current={page === 'runs' ? 'page' : undefined} onClick={() => goJourney(2)}>运行</button> : null}
            <button aria-current={page === 'apps' ? 'page' : undefined} onClick={() => goJourney(5)}>应用交付</button>
            <button aria-current={page === 'brief' ? 'page' : undefined} onClick={() => goJourney(1)}>项目说明</button>
            </div>
          </nav>
          {stagedAction ? <div className="lab-project-notice" role="status"><span>“{stagedAction.title}”提供了一项交互输入。</span><Button size="small" onClick={() => { setDraftRequest({ id: Date.now(), text: stagedAction.text }); setStagedAction(undefined); setGuideOpen(true); }}>带入对话</Button><Button size="small" onClick={() => setStagedAction(undefined)}>关闭</Button></div> : null}
          {page!=='journey' ? <nav className="lab-project-breadcrumb" aria-label="当前位置"><Button size="small" onClick={returnToJourney}><ArrowLeft size={14}/>返回{journeyStages[view.returnStep ?? view.journeyStep ?? 0]}</Button><span>/</span><span>{page==='apps' ? '应用预览'+(view.appVersion ? ' · v'+view.appVersion : '') : page==='artifact' ? selected?.title ?? '成果记录' : {materials:'查看资料',knowledge:'知识库实验',runs:'回答评测',brief:'项目需求'}[page]}</span></nav> : null}
          <div className="lab-project-stage">
            {page === 'artifact' && selected ? <p className="lab-project-notice">成果记录 · 更新于 {new Date(selected.updatedAtMs).toLocaleString('zh-CN')}。最新资料、实验与应用版本可从“优化过程”查看。</p> : null}
            {page === 'journey' ? <LabProjectJourney showcaseControls={transport.kind==='mock' && (projectId==='lab-showcase-rag' || projectId.startsWith('lab-project-showcase-')) ? <ResearchFlowControls project={project} view={view} busy={busy} onNavigate={updateView} onSubmit={(action,input)=>workflow.submit(action,input,project)}/> : undefined} key={project.projectId} view={view} onViewChange={updateView} project={project} busy={busy} onSaveBaseline={async (plan, expectedRevision) => {
              const summary=project.artifacts.find(row=>row.kind===baselineKind);
              return workflow.submit('publish_artifact', { ...(summary ? {artifactId:summary.artifactId} : {}), expectedArtifactRevision:expectedRevision, kind:baselineKind, title:'知识库基线', view:'json', content:plan, summary:plan.indexId ? '已绑定资料与索引，用于后续基线评测。' : '已保存处理方案，待准备索引。' }, project);
            }} onCommand={input=>workflow.submit('knowledge',input,project)} onOpenSuite={(suiteId,goldenJobId)=>updateView({page:'runs',goldenJobId,bindingId:project.bindings.find(row=>row.ownerRef.id===suiteId)?.bindingId})} onSaveRequirements={async (description) => Boolean(await workflow.submit('update_brief', { description }, project))} onPrepareApp={async (directory, appId) => Boolean(await workflow.submit('prepare_app', { directory, ...(appId ? { appId } : {}) }, project))} onMaterial={({corpusId, sourceId}) => updateView({page:'materials', materialCorpusId:corpusId, materialSourceId:sourceId,materialPage:1})} onNavigate={setPage} onKnowledge={(knowledgePage,knowledgeJobId) => updateView({page:'knowledge',knowledgePage,knowledgeJobId,useBaseline:!knowledgeJobId && view.journeyStep===2})} onApplication={(appId, appVersion) => updateView({ page: 'apps', appId, appVersion })} onAsk={(text) => { setGuideOpen(true); setDraftRequest({ id: Date.now(), text }); }} />
              : page === 'materials' ? <ProjectMaterials key={project.projectId + ':' + (view.materialSourceId ?? '')} initialCorpusId={view.materialCorpusId} initialSourceId={view.materialSourceId} initialPage={view.materialPage} onSelectionChange={(materialCorpusId,materialSourceId,materialPage)=>updateView({materialCorpusId,materialSourceId,materialPage})} project={project} busy={busy} onAdd={() => setIntakeOpen(true)} onKnowledge={() => updateView({page:'knowledge',knowledgePage:'sources',knowledgeJobId:undefined})} onCommand={(input) => workflow.submit('knowledge', input, project)} />
              : page === 'knowledge' ? <LabKnowledge key={`${project.projectId}:${view.knowledgePage ?? 'saved'}:${view.knowledgeJobId ?? ''}`} initialPage={view.knowledgePage} initialJobId={view.knowledgeJobId} initialBaseline={view.useBaseline} initialCorpusId={view.materialCorpusId} project={project} busy={busy} onCommand={(input) => workflow.submit('knowledge', input, project)} onBind={(input) => workflow.submit('bind_execution', input, project)} onOpenBinding={(binding) => updateView({ page: 'runs', bindingId: binding.bindingId })} />
              : page === 'apps' ? <LabAppDelivery key={`${project.projectId}:${view.appId ?? ''}:${view.appVersion ?? 'latest'}`} initialAppId={view.appId} initialVersion={view.appVersion} projectId={project.projectId} preparing={busy} onPrepare={async (directory, appId) => Boolean(await workflow.submit('prepare_app', { directory, ...(appId ? { appId } : {}) }, project))} />
              : page === 'brief' && demoFlow ? <ProjectRequirements project={project} busy={busy} onSave={async description => Boolean(await workflow.submit('update_brief', {description}, project))}/>
              : page === 'brief' ? <section className="lab-project-brief"><small>项目需求 · v{project.briefVersion}</small><h2>{project.title}</h2><p>{project.description}</p><p className="lab-project-muted">在“设定目标”中编辑需求与偏好。</p></section>
                : page === 'runs' ? binding?.ownerRef.kind === 'golden_suite' ? <GoldenWorkflow key={binding.bindingId} initialSuiteId={binding.ownerRef.id} initialJobId={view.goldenJobId} onSelectJob={goldenJobId=>updateView({goldenJobId})} onClose={returnToJourney} />
                  : binding?.ownerRef.kind === 'scene_trial' ? <section className="lab-project-bindings"><h2>继续场景验证</h2><p>历史对照保存在项目成果中。这里使用执行器当前登记的资料与规则，新运行单独记录；不会覆盖历史成绩。</p><SceneTrialPanel sceneId={binding.ownerRef.id} /></section>
                  : <section className="lab-project-bindings"><h2>已连接的执行能力</h2>{project.bindings.map((item) => <button key={item.bindingId} onClick={() => setBinding(item)}><span><strong>{item.adapterId === 'golden.context_qa' ? '资料问答评测' : item.adapterId === 'golden.knowledge_qa' ? '知识库回答评测' : item.adapterId === 'scene.trial' ? '场景验证' : item.adapterId}</strong><small>{item.summary || '进入查看当前标准、任务和实际运行结果'}</small></span><ArrowUpRight size={18} /></button>)}</section>
                  : selected ? artifact.isPending ? <p className="lab-project-loading" role="status">正在读取成果…</p> : artifact.isError ? <div className="lab-project-error" role="alert"><p>{projectError(artifact.error)}</p><Button onClick={() => void artifact.refetch()}>重新读取成果</Button></div>
                    : artifact.data ? <ArtifactSurface artifact={artifact.data} draft={drafts[draftKey]} busy={busy || sending}
                      onDraft={(draft) => updateDraft(draftKey, draft)}
                      onSave={async (content, revision) => Boolean(await workflow.submit('publish_artifact', { artifactId: artifact.data!.artifactId, expectedArtifactRevision: revision, content }, project))}
                      onAction={(action, values, staged) => void act(action, values, staged)} /> : null
                    : <section className="lab-project-empty"><span><MessageSquare size={24} /></span><h2>暂无项目成果</h2><p>项目对话中生成的文档、表格和应用会显示在这里。</p>{!guideOpen ? <Button onClick={() => setGuideOpen(true)}>打开项目对话</Button> : null}</section>}
          </div>
        </div>
      </div>}
    <Dialog.Root open={intakeOpen && Boolean(project)} onOpenChange={setIntakeOpen}><Dialog.Overlay className="lab-project-modal-backdrop" /><Dialog.Content className="lab-project-modal" aria-describedby={undefined}><header><Dialog.Title asChild><h2>添加项目材料</h2></Dialog.Title><Dialog.Close asChild><Button size="small">关闭</Button></Dialog.Close></header>{project ? <MaterialIntake busy={busy} onAdd={async (input) => { const receipt = await workflow.submit('import_materials', input, project); if (receipt) { setIntakeOpen(false); setPage('materials'); } }} /> : null}</Dialog.Content></Dialog.Root>
    <Dialog.Root open={historyImportOpen} onOpenChange={setHistoryImportOpen}><Dialog.Overlay className="lab-project-modal-backdrop" /><Dialog.Content className="lab-project-modal" aria-describedby="lab-history-import-description"><header><Dialog.Title asChild><h2>导入已有实验</h2></Dialog.Title><Dialog.Close asChild><Button size="small">关闭</Button></Dialog.Close></header><p id="lab-history-import-description">把已有基线、候选、失败记录和原始指标保留为项目成果。导入不会运行模型或重新评分。</p>
      {workflow.catalog.data?.historyUnavailable ? <p role="alert">已有实验来源暂时不可读取，请重新读取后再试。</p> : null}
      {workflow.catalog.data?.historyCollections?.map((source) => { const imported = workflow.catalog.data?.items.find((item) => item.historyOrigin?.sceneId === source.sceneId); return <section key={source.sceneId} className="lab-project-bindings" aria-label={source.title}><h3>{source.title}</h3><p>{source.experimentCount} 条实验记录 · {source.datasetIds.length} 个数据集版本</p><Button disabled={busy} onClick={() => { if (imported) { setHistoryImportOpen(false); openProject(imported.projectId); } else void workflow.submit('import_history', { sceneId: source.sceneId, sourceHash: source.sourceHash }).then((receipt) => { if (receipt) { setHistoryImportOpen(false); openProject(receipt.project.projectId); } }); }}>{imported ? '打开已导入项目' : '导入为项目'}</Button></section>; })}
      {!workflow.catalog.isPending && !workflow.catalog.data?.historyUnavailable && !workflow.catalog.data?.historyCollections?.length ? <p>当前执行器没有可导入的已有实验。</p> : null}
    </Dialog.Content></Dialog.Root>
  </main>;
}

function NewProject({ connection, busy, onCreate }: { connection: string; busy: boolean; onCreate: (input: Record<string, JsonValue>) => Promise<void> }) {
  const key = `paw.lab.new-project.v1:${connection}`;
  const [saved] = useState(() => { try { return object(JSON.parse(sessionStorage.getItem(key) ?? '{}')); } catch { return {}; } });
  const [description, setDescription] = useState(typeof saved.description === 'string' ? saved.description : '');
  const [path, setPath] = useState(typeof saved.path === 'string' ? saved.path : '');
  const [materials, setMaterials] = useState<Intake[]>(() => Array.isArray(saved.materials) ? saved.materials.filter((item): item is Intake => typeof object(item).title === 'string' && typeof object(item).text === 'string') : []);
  const [error, setError] = useState(''); const [reading, setReading] = useState(false);
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify({ description, path, materials })); }
    catch { setError('浏览器暂时无法保存草稿，请保持当前页面并完成创建。'); }
  }, [key, description, path, materials]);
  const chooseFiles = async (list: FileList | null) => {
    if (!list?.length || reading || busy) return;
    setReading(true); setError('');
    try { setMaterials(await loadFiles(list)); setPath(''); }
    catch (reason) { setError(projectError(reason)); }
    finally { setReading(false); }
  };
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!description.trim() || busy || reading) return; await onCreate({ description: description.trim(), ...(materials.length ? { materials } : path.trim() ? { path: path.trim() } : {}) }); };
  return <form className="lab-project-compose" onSubmit={(event) => void submit(event)}><textarea aria-label="描述你的项目" placeholder="例如：我有一个处理售后问题的 Agent，希望它依据规则完成操作。也可以从一个新的业务想法开始。" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} disabled={busy} />
    <div className="lab-project-compose__materials"><label className="lab-project-file-picker"><Upload size={15} />{reading ? '正在读取文件…' : '添加文件'}<input type="file" multiple disabled={busy || reading} onChange={(event) => { void chooseFiles(event.target.files); event.target.value = ''; }} /></label>
      {materials.length ? <><span>{materials.length} 份文件已选，创建时上传</span><Button type="button" size="small" disabled={busy || reading} onClick={() => setMaterials([])}>移除已选文件</Button></> : <input aria-label="连接执行器上的材料路径" value={path} placeholder="或填写已连接执行器上的绝对路径" disabled={busy || reading} onChange={(event) => setPath(event.target.value)} />}</div>
    {error ? <p role="alert" className="lab-project-error">{error}</p> : null}<footer><span>创建后进入项目对话。</span><Button type="submit" variant="primary" disabled={busy || reading || !description.trim()}>{busy ? '正在建立项目…' : reading ? '正在读取材料…' : '创建并开始'}<ArrowUpRight size={16} /></Button></footer>
  </form>;
}
function MaterialIntake({ busy, onAdd }: { busy: boolean; onAdd: (input: Record<string, JsonValue>) => Promise<void> }) {
  const [path, setPath] = useState(''); const [title, setTitle] = useState(''); const [text, setText] = useState(''); const [error, setError] = useState('');
  return <div className="lab-project-intake"><label className="lab-project-file-picker"><Upload size={16} />上传文本或源码文件<input type="file" multiple disabled={busy} onChange={(event) => void loadFiles(event.target.files).then((materials) => onAdd({ materials })).catch((reason) => setError(projectError(reason)))} /></label>
    <label>已连接执行器上的路径<input value={path} placeholder="绝对路径" onChange={(event) => setPath(event.target.value)} disabled={busy} /></label><Button disabled={busy || !path.trim()} onClick={() => void onAdd({ path: path.trim() })}>读取路径</Button>
    <hr /><label>粘贴材料标题<input value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} /></label><label>材料正文<textarea rows={7} value={text} onChange={(event) => setText(event.target.value)} disabled={busy} /></label>
    <Button disabled={busy || !title.trim() || !text.trim()} onClick={() => void onAdd({ materials: [{ title: title.trim(), text }] })}>保存文本材料</Button>{error ? <p role="alert" className="lab-project-error">{error}</p> : null}</div>;
}
async function loadFiles(list: FileList | null): Promise<Intake[]> {
  const files = [...(list ?? [])]; if (!files.length || files.length > 100 || files.reduce((total, file) => total + file.size, 0) > 2_000_000) throw new Error('请选择 1–100 份文件，合计不超过 2 MB。');
  return Promise.all(files.map(async (file) => {
    if (file.size > 500_000) throw new Error(`${file.name} 超过 500 KB，请拆分后添加。`);
    let text: string; try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); } catch { throw new Error(`${file.name} 尚不能作为 UTF-8 文本读取。`); }
    if (!text.trim() || text.includes('\0')) throw new Error(`${file.name} 没有可用的文本内容。`);
    return { title: file.name, text, kind: file.name === 'SKILL.md' ? 'skill' : /\.(?:py|[cm]?js|jsx|ts|tsx|go|rs|java|swift)$/iu.test(file.name) ? 'code' : 'document' };
  }));
}
