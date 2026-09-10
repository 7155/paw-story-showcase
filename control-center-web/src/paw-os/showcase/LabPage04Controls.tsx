import { CheckCircle2, Download, FileSearch, FlaskConical, Package, Play, Upload } from 'lucide-react';
import { Button } from '@/components/primitives';
import { object, type JsonValue, type LabProject, type ProjectAction, type ProjectReceipt } from '@/features/eval-lab/projects/types';
import type { Page04Run, Page04Trial } from '@/app/lab-page04-showcase';
import type { ProjectView } from '@/features/eval-lab/projects/views';
import './lab-flow-controls.css';

type Status = { key?: string; phase?: number; runs?: Page04Run[]; trials?: Page04Trial[]; generated?: boolean; downloaded?: boolean; accepted?: boolean; productionDeployed?: boolean };

export function LabPage04Controls({ project, busy, status: raw, onSubmit, onNavigate }: {
  project: LabProject; busy: boolean; status: Record<string, unknown>;
  onSubmit: (action: ProjectAction, input: Record<string, JsonValue>) => Promise<ProjectReceipt | undefined>;
  onNavigate: (view: Partial<ProjectView>) => void;
}) {
  const status = object(raw) as Status; const phase = Number(status.phase ?? -1); const rag = status.key === 'rag';
  const visibleRuns = phase < 2 ? [] : phase === 2 ? status.runs?.slice(0, 1) ?? [] : status.runs ?? [];
  const act = (operation: string) => void onSubmit('knowledge', { operation }).then((receipt) => {
    if (receipt?.artifact) onNavigate({ page:'artifact', artifactId:receipt.artifact.artifactId });
  });
  const stages = ['确认标准', '审核材料', '回放基线', '比较候选', '审查引用', '生成应用', '预览试用', ...(rag ? ['取得下载回执'] : []), '人工验收'];
  const active = Math.min(stages.length - 1, Math.max(0, phase + 1));
  return <section className="lab-flow-controls lab-page04-controls" aria-label="第四页应用实验室流程">
    <nav aria-label="应用实验室 Mock 流程">{stages.map((title, index) => <button key={title} aria-current={index === active ? 'step' : undefined} disabled>{index + 1} {title}</button>)}</nav>
    <div className="lab-flow-controls__actions">
      {phase < 0 ? <Button variant="primary" disabled={busy} onClick={() => act('page04_align')}><CheckCircle2 size={14}/>确认范围与验收标准</Button> : null}
      {phase === 0 ? <Button variant="primary" disabled={busy} onClick={() => act('page04_import')}><Upload size={14}/>导入并审核 {rag ? '15 项材料' : '6 条记录'}</Button> : null}
      {phase === 1 ? <Button variant="primary" disabled={busy} onClick={() => act('page04_baseline')}><Play size={14}/>保存并运行基线</Button> : null}
      {phase === 2 ? <Button variant="primary" disabled={busy} onClick={() => act('page04_compare')}><FlaskConical size={14}/>{rag ? '比较 600 / 1800 字候选' : '运行候选比较'}</Button> : null}
      {phase === 3 ? <Button variant="primary" disabled={busy} onClick={() => act('page04_audit')}><FileSearch size={14}/>展开失败与引用审查</Button> : null}
      {phase === 4 ? <Button variant="primary" disabled={busy} onClick={() => act('page04_generate')}><Package size={14}/>用通过候选生成 Mock 应用</Button> : null}
      {phase === 5 ? <Button variant="primary" disabled={busy} onClick={() => act('page04_preview')}><Play size={14}/>打开预览并试用</Button> : null}
      {phase === 6 && rag ? <Button variant="primary" disabled={busy} onClick={() => act('page04_download')}><Download size={14}/>取得 Mock 下载回执</Button> : null}
      {((rag && phase === 7) || (!rag && phase === 6)) ? <Button variant="primary" disabled={busy} onClick={() => act('page04_accept')}><CheckCircle2 size={14}/>人工验收当前场景</Button> : null}
      {status.accepted ? <span><CheckCircle2 size={14}/> 已验收 · 未部署生产</span> : null}
    </div>
    {visibleRuns.length ? <div className="lab-page04-controls__runs" aria-label="当前可见的 Mock 比较结果">{visibleRuns.map((run) => <span key={run.id}><strong>{run.label}</strong> {run.passed}/{run.total}</span>)}</div> : null}
    <p>{phase < 0 ? `先确认资料范围、成功定义、development 标签和记忆授权；当前项目已有 ${project.artifactCount} 份初始成果。`
      : phase === 0 ? '范围与验收标准已冻结。下一步才读取和审核材料。'
      : phase === 1 ? rag ? '15 项入口中 10 份正文进入语料；重复、扫描页、跨项目、旧版和评分标签分别排除。' : '本场景的 6 条合成记录已经导入，和其他标签完全隔离。'
      : phase === 2 ? '同一材料和题集已经冻结；候选比较不会修改基线或评分标签。'
      : phase === 3 ? '先检查失败项和引用是否真的支持结论，再决定是否生成应用。'
      : phase === 4 ? '候选已通过引用审查；生成、下载与生产部署仍是独立状态。'
      : phase === 5 ? '应用版本已生成。预览只回放保存的 Mock 试用结果，不调用模型或业务服务。'
      : phase === 6 && rag ? '预览区分无来源与有相关来源但没有答案；现在可以取得独立的 Mock 下载回执。'
      : status.accepted ? '验收只覆盖本页合成流程；生产部署始终为 false。' : '下载回执已保存，仍未生产部署；人工验收后才结束本场景。'}</p>
  </section>;
}
