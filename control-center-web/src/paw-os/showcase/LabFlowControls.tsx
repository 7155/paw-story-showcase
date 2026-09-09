import { useLabApps } from '@/features/eval-lab/projects/apps';
import { useState } from 'react';
import { journeyStages } from '@/features/eval-lab/projects/views';
import { Download, Play, Upload, Package } from 'lucide-react';
import { Button } from '@/components/primitives';
import type { LabProject, ProjectAction, ProjectReceipt, JsonValue } from '@/features/eval-lab/projects/types';
import type { ProjectView } from '@/features/eval-lab/projects/views';
import { labFlowSamples } from '../../../../showcase/lab-flow';
import type { LabKey } from '../../../../showcase/lab-evidence';
import './lab-flow-controls.css';

export function LabFlowControls({ project, view, busy, configurationDirty, status, onSubmit, onNavigate, onImport }: {
  project: LabProject; view: ProjectView; busy: boolean; configurationDirty: boolean;
  status: { runs?:{id:string;name:string;passed:number;total:number}[]; evaluationCurrent?: boolean; canGenerate?: boolean; decision?: string; appVersion?: number };
  onSubmit: (action: ProjectAction, input: Record<string, JsonValue>) => Promise<ProjectReceipt | undefined>;
  onNavigate: (view: Partial<ProjectView>) => void; onImport: () => void;
}) {
  const catalog=useLabApps(project.projectId);
  const [selected,setSelected]=useState('');
  const chosen=status.runs?.find(run=>run.id===selected) ?? [...(status.runs ?? [])].sort((a,b)=>b.passed-a.passed)[0];
  const key = project.projectId.replace('lab-showcase-', '') as LabKey;
  const sample = labFlowSamples[key];
  if (!sample) return null;
  const filename = `${key}-demo.json`;
  const text = JSON.stringify(sample, null, 2);
  const downloadSample = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  const step = view.journeyStep ?? 0;
  const navigate = (next:number) => onNavigate({page:next===0?'materials':next===1?'brief':next===5?'apps':'artifact',
    artifactId:next===0?'demo-config':'demo-report',journeyStep:next});
  return <section className="lab-flow-controls" aria-label="从数据到 App 的演示流程">
    <nav aria-label="Lab 演示流程">
      {journeyStages.map((title,index)=><button key={title} aria-current={step===index?'step':undefined} onClick={()=>navigate(index)}>{index+1} {title}</button>)}
    </nav>
    <div className="lab-flow-controls__actions">
      {step===0 && <><Button disabled={busy} onClick={onImport}><Upload size={14}/>上传数据</Button>
        {!project.materialCount && <Button variant="primary" disabled={busy} onClick={()=>void onSubmit('import_materials',{materials:[{title:filename,text}]}).then(receipt=>{if(receipt)navigate(0);})}>导入示例数据</Button>}
        <Button disabled={busy} onClick={()=>onNavigate({page:'artifact',artifactId:'demo-config',journeyStep:0})}>设计基线策略</Button></>}
      {step===2 && <Button variant="primary" disabled={busy || configurationDirty || !project.materialCount} onClick={()=>void onSubmit('knowledge',{operation:'showcase_evaluate',phase:'baseline'}).then(receipt=>{if(receipt)navigate(2);})}><Play size={14}/>运行用户基线</Button>}
      {step===3 && <Button variant="primary" disabled={busy || configurationDirty || !project.materialCount} onClick={()=>void onSubmit('knowledge',{operation:'showcase_evaluate',phase:'candidates'}).then(receipt=>{if(receipt)navigate(4);})}><Play size={14}/>运行候选比较</Button>}
      {step===4 && <><label>采用方案 <select aria-label="采用方案" value={chosen?.id ?? ''} onChange={event=>setSelected(event.target.value)} disabled={busy}>{status.runs?.map(run=><option key={run.id} value={run.id}>{run.name} · {run.passed}/{run.total}</option>)}</select></label><Button variant="primary" disabled={busy || configurationDirty || !status.evaluationCurrent || !chosen || chosen.passed!==chosen.total} onClick={()=>void onSubmit('prepare_app',{directory:'showcase',runId:chosen!.id}).then(async receipt=>{if(receipt){const apps=await catalog.refetch();const app=apps.data?.items[0];onNavigate({page:'apps',journeyStep:5,appId:app?.appId,appVersion:app?.latestVersion});}})}><Package size={14}/>用此方案生成应用</Button></>}
      <Button size="small" disabled={busy} onClick={downloadSample}><Download size={14}/>下载示例 JSON</Button>
    </div>
    <p>{!project.materialCount ? '从本场景示例开始，或上传包含 records 与 cases 的 JSON；数据保存在当前浏览器中。'
      : configurationDirty ? '测评策略仍有未保存的修改。请在「基线处理策略」中保存新版本，再运行测评。'
      : status.decision && !status.evaluationCurrent ? '数据或已保存配置已改变，请重新测评后再生成 App。'
      : status.canGenerate ? '当前数据与策略已逐题通过，可以生成 App。修改输入或配置后需要重新测评。'
      : status.decision === 'reject' ? '方案还有失败项。检查逐题差异，调整策略并保存，再重新测评。'
      : '查看导入记录，在第一步设计基线，再对同一组题目比较候选。'}<span>本轮执行离线规则，不调用模型；历史 Agent 实验另附回执。</span></p>
  </section>;
}
