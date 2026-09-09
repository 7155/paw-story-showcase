import { useEffect, useRef, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { Button } from '@/components/primitives';
import { useControlTransport } from '@/app/control-transport';
import { labConnectionKey } from '../control-request';
import { OptimizationGoalSpace } from './OptimizationGoalSpace';
import { DEFAULT_OPTIMIZATION_GOALS, goalLabels, normalizeGoals, requirementWithGoals, type OptimizationGoals } from './optimization-goals';
import type { LabProject } from './types';

function businessDescription(description: string) {
  const positions = ['\n\n优化偏好：', '\n\n应用优化目标（用户设置的验收约束）：'].map(marker => description.lastIndexOf(marker)).filter(index => index >= 0);
  return positions.length ? description.slice(0, Math.min(...positions)) : description;
}
function savedGoals(description: string): OptimizationGoals | undefined {
  const marker = description.lastIndexOf('\n\n优化偏好：');
  if (marker < 0) return undefined;
  const section = description.slice(marker);
  return { accuracyPriority: section.includes('准确率：严格要求') ? .95 : section.includes('准确率：满足基本需求') ? .2 : .7,
    costFlexibility: section.includes('成本：优先控制成本') ? .15 : section.includes('成本：接受更高投入') ? .85 : .5 };
}
export function ProjectRequirements({ project, busy, onSave }: {
  project: LabProject; busy: boolean; onSave: (description: string) => Promise<boolean>;
}) {
  const transport = useControlTransport();
  const draftKey = 'paw.lab.requirements-draft.v1:' + labConnectionKey(transport) + ':' + project.projectId;
  const [draft] = useState(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? 'null'); return saved && typeof saved.description === 'string' && typeof saved.baseDescription === 'string' ? { description:saved.description as string, baseDescription:saved.baseDescription as string, goals:normalizeGoals(saved.goals) } : undefined; }
    catch { return undefined; }
  });
  const source = useRef(draft?.baseDescription ?? project.description);
  const [editing, setEditing] = useState(Boolean(draft)), [description, setDescription] = useState(draft?.description ?? businessDescription(project.description));
  const [goals, setGoals] = useState(draft?.goals ?? savedGoals(project.description) ?? DEFAULT_OPTIMIZATION_GOALS);
  const [dirty, setDirty] = useState(Boolean(draft)), [saving, setSaving] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    if (!dirty) { source.current = project.description; setDescription(businessDescription(project.description)); setGoals(savedGoals(project.description) ?? DEFAULT_OPTIMIZATION_GOALS); }
  }, [project.description, dirty]);
  useEffect(() => {
    try { if (dirty) sessionStorage.setItem(draftKey,JSON.stringify({ description,goals,baseDescription:source.current })); else sessionStorage.removeItem(draftKey); }
    catch { /* Editing remains available when browser storage is unavailable. */ }
  }, [draftKey,description,goals,dirty]);
  const update = async () => {
    if (dirty && source.current !== project.description) { setMessage('项目需求已有更新，请对照完整需求合并更改。'); return; }
    setSaving(true); setMessage('');
    try {
      if (await onSave(requirementWithGoals(description, goals))) { setDirty(false); setEditing(false); setMessage('已保存'); }
      else setMessage('保存未完成，请检查页面提示后重试。');
    } catch { setMessage('保存失败，请重试。'); }
    finally { setSaving(false); }
  };
  const saved = savedGoals(project.description), labels = saved ? goalLabels(saved) : undefined;
  return <section className="lab-requirements">
    <div className="lab-section-heading"><h3>应用需求</h3><Button size="small" disabled={busy || saving} onClick={() => setEditing(value => !value)}><Pencil size={13} />{editing ? '收起编辑' : '编辑需求'}</Button></div>
    {editing ? <label className="lab-requirements__editor">需求正文<textarea rows={7} value={description} disabled={busy || saving} onChange={event => { setDescription(event.target.value); setDirty(true); setMessage(''); }} /></label>
      : <><p className="lab-requirements__summary">{businessDescription(project.description).split(/[。\n]/u)[0] || '尚未填写应用需求'}。</p><details className="lab-compact-details"><summary>完整需求 · v{project.briefVersion}</summary><p className="lab-requirements__full">{project.description}</p></details></>}
    <OptimizationGoalSpace value={goals} disabled={busy || saving} onChange={value => { setGoals(value); setDirty(true); setMessage(''); }} />
    <div className="lab-requirements__save"><span>{dirty ? '有未保存的更改' : labels ? '已保存：' + labels.accuracy + ' · ' + labels.cost : '尚未保存优化偏好'}</span><Button variant="primary" disabled={busy || saving || !description.trim() || (!dirty && Boolean(saved))} onClick={() => void update()}>{saving ? '正在保存…' : '保存需求与偏好'}</Button>{message ? <span role="status">{message === '已保存' ? <Check size={14} /> : null}{message}</span> : null}{message === '项目需求已有更新，请对照完整需求合并更改。' ? <Button disabled={busy || saving} onClick={() => { source.current = project.description; void update(); }}>已合并，保存编辑稿</Button> : null}</div>
  </section>;
}
