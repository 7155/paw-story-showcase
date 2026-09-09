import { useLabApps } from '@/features/eval-lab/projects/apps';
import { useState } from 'react';
import { Button } from '@/components/primitives';
import { baselineEvaluation, useKnowledgeBaseline } from '@/features/eval-lab/projects/knowledge-baseline';
import { useProjectKnowledge } from '@/features/eval-lab/projects/use-project-knowledge';
import type { JsonValue, LabProject, ProjectAction, ProjectReceipt } from '@/features/eval-lab/projects/types';
import type { ProjectView } from '@/features/eval-lab/projects/views';
import './lab-flow-controls.css';

/** Offline commands attached to the product Journey; PAW owns all content views. */
export function ResearchFlowControls({ project, view, busy, onSubmit, onNavigate }: {
  project: LabProject; view: ProjectView; busy: boolean;
  onSubmit: (action: ProjectAction, input: Record<string, JsonValue>) => Promise<ProjectReceipt | undefined>;
  onNavigate: (view: Partial<ProjectView>) => void;
}) {
  const catalog=useLabApps(project.projectId);
  const knowledge = useProjectKnowledge(project.projectId), saved = useKnowledgeBaseline(project);
  const [running, setRunning] = useState(false), [selected, setSelected] = useState('');
  const plan = saved.plan, state = knowledge.data, step = view.journeyStep ?? 0;
  const dataset = state?.datasets.find(row => row.corpusHash === plan?.corpusHash);
  const baseline = baselineEvaluation(state, plan);
  const completed = state?.evaluations.filter(row => row.corpusHash === plan?.corpusHash
    && row.datasetId === dataset?.datasetId && row.evaluatedCount === row.plannedCount && row.plannedCount > 0) ?? [];
  const chosen = completed.find(row => row.jobId === selected) ?? [...completed].sort((a,b)=>b.report.metrics.metrics.recallAtK[String(b.profile.topK)]-a.report.metrics.metrics.recallAtK[String(a.profile.topK)] || a.profile.contextChars-b.profile.contextChars)[0];
  const locked = busy || running;
  const evaluate = async (indexId: string) => onSubmit('knowledge', { operation:'evaluate', indexId,
    datasetId:dataset!.datasetId, profile:plan!.profile, split:'development' });
  const run = async (candidate: boolean) => {
    if (!plan?.indexId || !dataset) return;
    setRunning(true);
    try {
      if (!candidate) await evaluate(plan.indexId);
      else for (const size of [600, 1800]) {
        const receipt = await onSubmit('knowledge', { operation:'index', corpusId:plan.corpusId, embedding:'none',
          chunking:{ strategy:'general', size, overlap:Math.min(plan.chunking.overlap, size - 1) } });
        if (!receipt?.job) break;
        if (!await evaluate(receipt.job.jobId)) break;
      }
      await knowledge.refetch();
    } finally { setRunning(false); }
  };
  return <section className="lab-flow-controls" aria-label="本轮研究操作">
    <div className="lab-flow-controls__actions">
      {step === 0 && project.projectId==='lab-showcase-rag' && <Button size="small" onClick={() => onNavigate({page:'artifact',artifactId:'paper-experiment-history'})}>查看论文项目 72 条历史记录</Button>}
      {step === 2 && <Button variant="primary" disabled={locked || !plan?.indexId || !dataset} onClick={() => void run(false)}>运行已保存基线</Button>}
      {step === 3 && <><Button variant="primary" disabled={locked || !baseline || !dataset} onClick={() => void run(true)}>比较两种切片方案</Button><Button disabled={locked} onClick={() => onNavigate({page:'knowledge',knowledgePage:'index',useBaseline:false})}>自定义候选参数</Button></>}
      {step === 4 && <><label>采用的检索方案 <select aria-label="采用的检索方案" value={chosen?.jobId ?? ''} disabled={locked || !completed.length} onChange={event => setSelected(event.target.value)}>
        {completed.map(row => <option key={row.jobId} value={row.jobId}>{state?.indexes.find(index => index.jobId === row.indexId)?.chunking.size} 字切片 · K {row.profile.topK} · 召回 {(row.report.metrics.metrics.recallAtK[String(row.profile.topK)] * 100).toFixed(1)}%</option>)}
      </select></label><Button variant="primary" disabled={locked || !chosen} onClick={() => void onSubmit('prepare_app',{directory:'showcase',evaluationJobId:chosen!.jobId}).then(async receipt => { if (receipt) { const apps=await catalog.refetch();const app=apps.data?.items[0];onNavigate({page:'apps',journeyStep:5,appId:app?.appId,appVersion:app?.latestVersion}); } })}>用此方案生成应用</Button></>}
    </div>
    <p>{running ? '正在执行本地检索测评…' : step === 2 && !plan?.indexId ? '先在第一步保存知识库基线并准备索引。'
      : step === 3 ? '候选使用同一资料、题集和检索参数，只改变切片；基线保持原样。'
      : step === 4 ? '导出绑定所选评测的资料、切片与检索配置。召回率只衡量来源检索。'
      : '公开演示在浏览器中处理资料和运行关键词检索；不调用模型。'}</p>
  </section>;
}
