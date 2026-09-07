import { Download, Play, Upload, Package } from 'lucide-react';
import { Button } from '@/components/primitives';
import type { LabProject, ProjectAction, ProjectReceipt, JsonValue } from '@/features/eval-lab/projects/types';
import type { ProjectView } from '@/features/eval-lab/projects/views';
import { labFlowSamples } from '../../../../showcase/lab-flow';
import type { LabKey } from '../../../../showcase/lab-evidence';
import './lab-flow-controls.css';

export function LabFlowControls({ project, view, busy, configurationDirty, status, onSubmit, onNavigate, onImport }: {
  project: LabProject; view: ProjectView; busy: boolean; configurationDirty: boolean;
  status: { evaluationCurrent?: boolean; canGenerate?: boolean; decision?: string; appVersion?: number };
  onSubmit: (action: ProjectAction, input: Record<string, JsonValue>) => Promise<ProjectReceipt | undefined>;
  onNavigate: (view: Partial<ProjectView>) => void; onImport: () => void;
}) {
  const key = project.projectId.replace('lab-showcase-', '') as LabKey;
  const sample = labFlowSamples[key];
  if (!sample) return null;
  const filename = `${key}-demo.json`;
  const text = JSON.stringify(sample, null, 2);
  const openArtifact = (artifactId: string) => onNavigate({ page: 'artifact', artifactId });
  const downloadSample = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  const step = view.page === 'apps' ? 4 : view.artifactId === 'demo-report' && view.page === 'artifact' ? 3
    : view.artifactId === 'demo-config' && view.page === 'artifact' ? 2 : 1;
  return <section className="lab-flow-controls" aria-label="从数据到 App 的演示流程">
    <nav aria-label="Lab 演示流程">
      <button aria-current={step === 1 ? 'step' : undefined} onClick={() => onNavigate({ page: 'materials' })}>1 导入数据</button>
      <button aria-current={step === 2 ? 'step' : undefined} onClick={() => openArtifact('demo-config')}>2 测评标准</button>
      <button aria-current={step === 3 ? 'step' : undefined} disabled={!project.artifacts.some((item) => item.artifactId === 'demo-report')} onClick={() => openArtifact('demo-report')}>3 测评结果</button>
      <button aria-current={step === 4 ? 'step' : undefined} disabled={!status.appVersion} onClick={() => onNavigate({ page: 'apps' })}>4 试用与导出 App</button>
    </nav>
    <div className="lab-flow-controls__actions">
      {!project.materialCount ? <><Button variant="primary" disabled={busy} onClick={() => void onSubmit('import_materials', { materials: [{ title: filename, text }] }).then((receipt) => { if (receipt) onNavigate({ page: 'materials' }); })}><Upload size={14}/>导入示例数据</Button><Button disabled={busy} onClick={onImport}>上传自己的数据</Button></> : <>
        <Button disabled={busy} onClick={() => openArtifact('demo-config')}>设置候选策略</Button>
        <Button variant="primary" disabled={busy || configurationDirty} onClick={() => void onSubmit('knowledge', { operation: 'showcase_evaluate' }).then((receipt) => { if (receipt) openArtifact('demo-report'); })}><Play size={14}/>运行演示测评</Button>
        <Button disabled={busy || configurationDirty || !status.canGenerate} onClick={() => void onSubmit('prepare_app', { directory: 'showcase' }).then((receipt) => { if (receipt) onNavigate({ page: 'apps' }); })}><Package size={14}/>生成 App</Button>
      </>}
      <Button size="small" disabled={busy} onClick={downloadSample}><Download size={14}/>下载示例 JSON</Button>
    </div>
    <p>{!project.materialCount ? '从本场景示例开始，或上传包含 records 与 cases 的 JSON；数据只保存在当前演示中。'
      : configurationDirty ? '测评策略仍有未保存的修改。请在「本轮测评标准」中保存新版本，再运行测评。'
      : status.decision && !status.evaluationCurrent ? '数据或已保存配置已改变，请重新测评后再生成 App。'
      : status.canGenerate ? '当前数据与策略已逐题通过，可以生成 App。修改输入或配置后需要重新测评。'
      : status.decision === 'reject' ? '候选还有失败项。检查逐题差异，调整策略并保存，再重新测评。'
      : '查看导入记录，保存候选策略，然后对同一组题目比较基线与候选。'}<span>本轮执行离线规则，不调用模型；历史 Agent 实验另附回执。</span></p>
  </section>;
}
