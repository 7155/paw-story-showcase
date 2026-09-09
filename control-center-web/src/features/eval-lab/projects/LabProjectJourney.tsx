import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, FileText, FlaskConical, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/primitives';
import { PortableUsageSummary } from '@/features/agent/portable/PortableResearchReceipt';
import { portableObject } from '@/features/agent/portable/conversation-types';
import { useLabApps } from './apps';
import { projectError } from './api';
import { applicationChanges, comparableRetrievalRuns } from './journey-evidence';
import { activeKnowledgeJob, type KnowledgeEvaluation } from './knowledge-types';
import { LabAppDelivery } from './LabAppDelivery';
import { ProjectDocumentList, type MaterialTarget } from './ProjectDocumentList';
import { ProjectRequirements } from './ProjectRequirements';
import type { JsonValue, LabProject, ProjectReceipt } from './types';
import { baselineEvaluation, researchBuildMessage, useKnowledgeBaseline, type KnowledgeBaseline } from './knowledge-baseline';
import { ProjectKnowledgeBaseline } from './ProjectKnowledgeBaseline';
import { projectExperimentRecords, useProjectExperimentHistory } from './experiment-history';
import { AnswerExperimentResults, ProjectExperimentHistory } from './ProjectExperimentHistory';
import { journeyStages, type ProjectPage, type ProjectView } from './views';
import { useProjectKnowledge } from './use-project-knowledge';
import './lab-project-journey.css';

const operations: Record<string,string> = { import_corpus: '导入资料', index: '建立索引', search: '检索测试', evaluate: '检索评测', inspect_document: '阅读文档', reclean_corpus: '清洗资料', repair_document: '修复文档', reparse_document: '重新解析', import_dataset: '导入题集', import_golden_dataset: '复用评测题集' };
const states: Record<string,string> = { completed: '已完成', failed: '失败', interrupted: '已中断', cancelled: '已停止', running: '进行中', queued: '排队中', cancelling: '正在停止' };
const stages = journeyStages;
const date = (timestamp: number) => new Date(timestamp).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
const rate = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? (value * 100).toFixed(1) + '%' : '—';
const mode = (row: KnowledgeEvaluation) => ({ hybrid:'混合检索', dense:'语义检索', lexical:'关键词检索' })[row.profile.mode] + (row.profile.rerank ? ' + 重排' : '');

export function LabProjectJourney({ project, view, onViewChange, busy = false, onNavigate, onKnowledge, onApplication, onMaterial, onSaveRequirements, onSaveBaseline, onCommand, onOpenSuite, onPrepareApp, onAsk, showcaseControls }: {
  showcaseControls?: ReactNode;
  project: LabProject; view:ProjectView; onViewChange:(patch:Partial<ProjectView>)=>void; busy?: boolean; onNavigate: (page: ProjectPage) => void;
  onKnowledge: (page: 'sources' | 'index' | 'evaluation',jobId?:string) => void;
  onApplication: (appId: string, version: number) => void; onMaterial: (target: MaterialTarget) => void;
  onSaveRequirements: (description: string) => Promise<boolean>;
  onSaveBaseline: (plan: KnowledgeBaseline, expectedRevision: number) => Promise<ProjectReceipt | undefined>;
  onCommand: (input: Record<string,JsonValue>) => Promise<ProjectReceipt | undefined>;
  onOpenSuite: (suiteId: string,jobId?:string) => void;
  onPrepareApp: (directory: string, appId?: string) => Promise<boolean>;
  onAsk: (message: string) => void;
}) {
  const knowledge = useProjectKnowledge(project.projectId), catalog = useLabApps(project.projectId);
  const [appId] = useState(''), selectedApp = appId || catalog.data?.items[0]?.appId || '';
  const application = useLabApps(project.projectId, selectedApp);
  const step=view.journeyStep ?? 0,intakeTab=view.intakeTab ?? 'files',experimentId=view.experimentId ?? '';
  const setIntakeTab=(intakeTab:'files'|'baseline')=>onViewChange({intakeTab});
  const savedBaseline=useKnowledgeBaseline(project), history=useProjectExperimentHistory(project.projectId,step>=2);
  const [event,setEvent] = useState(''), detail = useRef<HTMLElement>(null), workspace = useRef<HTMLDivElement>(null);
  const data = knowledge.data, corpus = data?.corpora.find(row=>row.jobId===savedBaseline.plan?.corpusId) ?? data?.corpora[0], comparable = comparableRetrievalRuns(data);
  const versions = application.data?.versions ?? [], calls = application.data?.calls ?? [], jobs = data?.jobs ?? [], active = jobs.filter(activeKnowledgeJob);
  const records=projectExperimentRecords(project,data,history.data?.trials ?? [],history.data?.suites ?? [],versions,calls);
  const datasets = data?.datasets.filter(row => !corpus || row.corpusHash === corpus.corpusHash) ?? [];
  const coverage = [corpus ? (corpus.intake.attemptedCount ?? corpus.documentCount) + ' 个文件' : project.materialCount ? project.materialCount + ' 份文本' : '待导入',
    '需求 v' + project.briefVersion, datasets.length ? datasets.length + ' 份题集' : '待准备题集',
    history.data ? records.length + ' 条记录' : '查看实验记录', comparable.length > 1 ? comparable.length + ' 组可对比' : '待评测', catalog.data?.items.length ? catalog.data.items.length + ' 个应用' : '待生成'];
  const selectedJob = jobs.find(row => 'job:' + row.jobId === event), selectedCall = calls.find(row => 'call:' + row.callId === event), selectedVersion = versions.find(row => 'version:' + row.version === event);
  const changeStep = (next: number) => { onViewChange({journeyStep:next}); setEvent(''); workspace.current?.scrollIntoView({ block:'start' }); };
  useEffect(() => { if (event) { detail.current?.scrollIntoView({ block:'nearest', behavior:'instant' }); detail.current?.focus({ preventScroll:true }); } }, [event]);
  const baseline = savedBaseline.plan ? baselineEvaluation(data,savedBaseline.plan) : comparable[0];
  return <section className="lab-journey" aria-label="应用优化过程">
    <nav className="lab-journey__steps" aria-label="优化步骤">{stages.map((title,i) => <button type="button" key={title} aria-current={step === i ? 'step' : undefined} onClick={() => changeStep(i)}><span className="lab-journey__step-number">{i + 1}</span><span><strong>{title}</strong><small>{coverage[i]}</small></span></button>)}</nav>
    <div className="lab-journey__workspace" ref={workspace}>
      <header className="lab-journey__header"><h2>{stages[step]}</h2><Button size="small" onClick={() => { void knowledge.refetch(); void catalog.refetch(); void application.refetch(); if(step>=2) void history.refetch(); }}><RefreshCw size={14} />刷新</Button></header>
      {showcaseControls}
      {knowledge.isError ? <p role="alert" className="lab-project-error">{projectError(knowledge.error)}</p> : null}
      {step >= 3 && (catalog.isError || application.isError) ? <p role="alert" className="lab-project-error">{projectError(catalog.error ?? application.error)}</p> : null}
      {step === 0 ? <>
        <div className="lab-intake-tabs" aria-label="资料与基线内容"><button aria-pressed={intakeTab==='files'} onClick={()=>setIntakeTab('files')}>文件 <span>{corpus?.intake.attemptedCount ?? corpus?.documentCount ?? 0}</span></button><button aria-pressed={intakeTab==='baseline'} onClick={()=>setIntakeTab('baseline')}>知识库基线 <span>{savedBaseline.summary ? 'v'+savedBaseline.summary.revision : '待设计'}</span></button></div>
        {intakeTab==='files' ? <ProjectDocumentList corpusId={corpus?.jobId} project={project} knowledge={data} loading={knowledge.isPending} onOpen={onMaterial} onImport={() => onKnowledge('sources')} />
          : savedBaseline.isError ? <p role="alert">{projectError(savedBaseline.error)}</p> : savedBaseline.summary && savedBaseline.isPending ? <p role="status">正在读取基线…</p>
          : data?.corpora.length ? <ProjectKnowledgeBaseline projectId={project.projectId} state={data} saved={savedBaseline.plan} revision={savedBaseline.summary?.revision ?? 0} busy={busy} onSave={onSaveBaseline} onCommand={onCommand} onRefresh={()=>void knowledge.refetch()} /> : <p className="lab-inline-empty">资料载入后即可设计知识库基线。</p>}
      </> : null}
      {step === 1 ? <ProjectRequirements project={project} busy={busy} onSave={onSaveRequirements} /> : null}
      {step === 2 ? <section className="lab-journey__baseline">
        {savedBaseline.plan ? <div className="lab-baseline-reference"><span>知识库基线 v{savedBaseline.summary?.revision} · {({fixed:'固定长度',paper:'论文结构',general:'段落结构',markdown:'Markdown 结构',qa:'问答结构'} as Record<string,string>)[savedBaseline.plan.chunking.strategy]} {savedBaseline.plan.chunking.size} / {savedBaseline.plan.chunking.overlap} · K {savedBaseline.plan.profile.topK} · {savedBaseline.plan.indexId ? '索引已绑定' : '待建立索引'}</span><Button size="small" onClick={()=>onViewChange({journeyStep:0,intakeTab:'baseline'})}>编辑基线</Button>{!showcaseControls && <Button size="small" onClick={()=>onAsk(researchBuildMessage(savedBaseline.summary!.artifactId,savedBaseline.summary!.revision))}>按此基线继续构建</Button>}</div> : null}
        <div className="lab-section-heading"><h3>评测题集</h3><Button size="small" onClick={() => onKnowledge('evaluation')}>管理题集<ArrowUpRight size={13} /></Button></div>
        {datasets.length ? <div className="lab-data-table"><table><thead><tr><th>题集</th><th>题目</th><th>开发 / 留出</th><th>参考答案</th><th /></tr></thead><tbody>{datasets.map(dataset => <tr key={dataset.datasetId}><th>{dataset.title}</th><td>{dataset.caseCount}</td><td>{dataset.splits.development} / {dataset.splits.holdout}</td><td>{dataset.referenceAnswerCount}</td><td><Button size="small" onClick={() => onKnowledge('evaluation')}>查看题目</Button></td></tr>)}</tbody></table></div>
          : <div className="lab-inline-empty"><FileText size={22} /><span>暂无评测题集</span><Button size="small" onClick={() => onAsk('请根据本项目已有资料准备有代表性的评测题，覆盖常见问题、跨资料问题和证据不足的情况，列出参考答案与来源。先展示题集和运行方案，说明预计用量，不立即运行模型评测。')}>准备评测题集</Button></div>}
        {datasets.length ? <details className="lab-compact-details"><summary>题目预览</summary>{datasets.flatMap(dataset => dataset.preview.map(item => <p key={dataset.datasetId + ':' + item.caseId}>{item.question}</p>))}</details> : null}
        <div className="lab-section-heading"><h3>基线结果</h3><span>{baseline ? savedBaseline.plan ? '已保存基线的开发集结果' : '首次完整开发集评测' : '待评测'}</span></div>
        {baseline ? <div className="lab-data-table"><table><thead><tr><th>检索配置</th><th>计分 / 计划</th><th>来源召回率</th><th>平均耗时</th><th /></tr></thead><tbody>{[baseline].map(row => <tr key={row.jobId}><th>{mode(row)}<small>Top K = {row.profile.topK} · {row.split === 'development' ? '开发集' : '留出集'}</small></th><td>{row.evaluatedCount} / {row.plannedCount}</td><td>{rate(row.report.metrics.metrics.recallAtK[String(row.profile.topK)])}</td><td>{row.report.costs.meanRetrievalLatencyMs.toFixed(0)} ms</td><td><Button size="small" onClick={() => setEvent('job:' + row.jobId)}>查看详情</Button></td></tr>)}</tbody></table></div>
          : <div className="lab-inline-empty"><FlaskConical size={22} /><span>暂无基线结果</span><Button size="small" onClick={() => onKnowledge('evaluation')}>设置基线评测</Button></div>}
        {project.bindings.length ? <div className="lab-section-link"><span>回答评测</span><Button size="small" onClick={() => onNavigate('runs')}>查看运行结果<ArrowUpRight size={13} /></Button></div> : null}
      </section> : null}
      {step === 3 ? <ProjectExperimentHistory projectId={project.projectId} onSelectRecord={experimentId=>onViewChange({experimentId})} records={records} loading={history.isPending} errors={history.data?.errors ?? []} initialRecord={experimentId} onApplication={onApplication} onKnowledge={onKnowledge} onSuite={onOpenSuite} /> : null}
      {step === 4 ? <>
        <div className="lab-section-heading"><h3>来源召回率</h3><Button size="small" onClick={() => onKnowledge('evaluation')}>全部评测<ArrowUpRight size={13} /></Button></div>
        {comparable.length > 1 ? <>
          <p className="lab-status-note">同一资料与题集 · 每组 {comparable[0].plannedCount} 题 · Top K = {comparable[0].profile.topK}</p>
          <div className="lab-journey__comparison">{comparable.map((row,i) => { const recall = row.report.metrics.metrics.recallAtK[String(row.profile.topK)], initial = comparable[0].report.metrics.metrics.recallAtK[String(comparable[0].profile.topK)], delta = (recall - initial) * 100; return <button key={row.jobId} onClick={() => setEvent('job:' + row.jobId)}><span>{mode(row)}<small>{i === 0 ? '对比基准' : '候选 ' + i}</small></span><meter value={recall} min={0} max={1} aria-label={mode(row) + '来源召回率'} /><strong>{rate(recall)}</strong><span className={delta > 0 ? 'is-positive' : delta < 0 ? 'is-error' : ''}>{i === 0 ? '基准' : (delta > 0 ? '+' : '') + delta.toFixed(1) + ' pp'}</span></button>; })}</div>
          <div className="lab-data-table"><table><caption>pp 为百分点变化；以上为检索指标。</caption><thead><tr><th>配置</th><th>来源精确率</th><th>F1</th><th>MRR</th><th>平均耗时</th></tr></thead><tbody>{comparable.map(row => <tr key={row.jobId}><th>{mode(row)}</th><td>{rate(row.report.metrics.metrics.precisionAtK?.[String(row.profile.topK)])}</td><td>{rate(row.report.metrics.metrics.f1AtK?.[String(row.profile.topK)])}</td><td>{row.report.metrics.metrics.mrr.toFixed(3)}</td><td>{row.report.costs.meanRetrievalLatencyMs.toFixed(0)} ms</td></tr>)}</tbody></table></div>
        </> : <div className="lab-inline-empty"><FlaskConical size={22} /><span>{comparable.length ? '已有一组结果，待评测候选方案' : '暂无可比较的评测结果'}</span><Button size="small" onClick={() => onKnowledge('evaluation')}>设置对比评测</Button></div>}
        <div className="lab-section-heading"><h3>回答质量与成本</h3>{project.bindings.length ? <Button size="small" onClick={() => onNavigate('runs')}>查看回答评测<ArrowUpRight size={13} /></Button> : <span>待评测</span>}</div>
        <AnswerExperimentResults records={records} onOpen={experimentId=>onViewChange({journeyStep:3,experimentId})} />
        {calls.length ? <div className="lab-journey__calls lab-journey__call-costs">{calls.map(call => <article key={call.callId}><button onClick={() => setEvent('call:' + call.callId)}><span className="lab-version-label">v{call.version}</span><span>{String(call.input.question ?? Object.values(call.input)[0] ?? '应用调用')}</span><small>{states[call.state]}</small><span>回答详情</span><ArrowRight size={14} /></button><PortableUsageSummary compact value={call.result ?? {}} /></article>)}</div> : <p className="lab-status-note">暂无应用调用记录</p>}
      </> : null}
      {step === 5 ? <LabAppDelivery projectId={project.projectId} preparing={busy} onPrepare={onPrepareApp} /> : null}
      {active.length && step !== 0 ? <div className="lab-journey__active" role="status">{active.map(job => <div key={job.jobId}><strong>{operations[job.publicSpec.operation] ?? job.publicSpec.operation} · {states[job.state]}</strong><progress aria-label="当前任务进度" /><span>{job.progress || '正在执行…'}</span><Button size="small" onClick={() => setEvent('job:' + job.jobId)}>查看任务</Button></div>)}</div> : null}
      {event ? <section className="lab-journey__detail" ref={detail} tabIndex={-1} aria-label="实验详情"><header><h3>{selectedJob ? operations[selectedJob.publicSpec.operation] ?? '任务详情' : selectedCall ? 'v' + selectedCall.version + ' 调用结果' : selectedVersion ? 'v' + selectedVersion.version + ' 版本详情' : '记录不可用'}</h3><Button size="small" onClick={() => setEvent('')}>收起</Button></header>
        {selectedJob ? <><p>{states[selectedJob.state]} · {date(selectedJob.createdAtMs)}</p>{selectedJob.error || selectedJob.result?.message || selectedJob.progress ? <p>{selectedJob.error || selectedJob.result?.message || selectedJob.progress}</p> : null}<details><summary>操作配置</summary><pre>{JSON.stringify(selectedJob.publicSpec,null,2)}</pre></details><details><summary>完整结果</summary><pre>{JSON.stringify(selectedJob.result,null,2)}</pre></details><Button onClick={() => onKnowledge(selectedJob.publicSpec.operation === 'evaluate' ? 'evaluation' : ['index','search'].includes(selectedJob.publicSpec.operation) ? 'index' : 'sources', selectedJob.jobId)}>打开实验</Button></> : null}
        {selectedCall ? <><h4>{String(selectedCall.input.question ?? Object.values(selectedCall.input)[0] ?? '')}</h4><p>{states[selectedCall.state]} · {date(selectedCall.createdAtMs)}</p><div className="lab-journey__answer"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedCall.result?.text || selectedCall.error || '等待回答…'}</ReactMarkdown></div><PortableUsageSummary value={{ usage: portableObject(selectedCall.result?.usage), assistantUsage: portableObject(selectedCall.result?.assistantUsage), usageScopes: portableObject(selectedCall.result?.usageScopes), stageReceipts: portableObject(selectedCall.result?.stageReceipts ?? selectedCall.progress?.stageReceipts), knowledge: portableObject(selectedCall.result?.knowledge ?? selectedCall.progress?.knowledge) }} /><Button onClick={() => onApplication(selectedCall.appId,selectedCall.version)}>打开应用与引用<ArrowUpRight size={14} /></Button></> : null}
        {selectedVersion ? <><ul>{applicationChanges(versions.find(row => row.version === selectedVersion.version-1),selectedVersion).map(change => <li key={change}>{change}</li>)}</ul><details><summary>回答要求</summary>{selectedVersion.spec.actions.map(action => <section key={action.id}><h4>{action.title}</h4><p>{action.prompt}</p></section>)}</details><details><summary>模型与检索配置</summary><pre>{JSON.stringify({ model:selectedVersion.spec.model, knowledge:selectedVersion.spec.knowledge },null,2)}</pre></details><Button onClick={() => onApplication(selectedVersion.appId,selectedVersion.version)}>试用此版本<ArrowUpRight size={14} /></Button></> : null}
      </section> : null}
      <footer className="lab-journey__footer">{step > 0 ? <Button size="small" onClick={() => changeStep(step-1)}><ArrowLeft size={14} />{stages[step-1]}</Button> : <span />}{step < 5 ? <Button size="small" onClick={() => changeStep(step+1)}>下一步：{stages[step+1]}<ArrowRight size={14} /></Button> : null}</footer>
    </div>
  </section>;
}
