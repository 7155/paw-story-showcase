import type { KnowledgeEvaluation, KnowledgeState } from './knowledge-types';
import type { LabAppVersion } from './apps';

// Only compare completed, fully scored development runs on the same evidence contract.
export function comparableRetrievalRuns(state: KnowledgeState | undefined): KnowledgeEvaluation[] {
  const complete = (state?.evaluations ?? []).filter(row => row.split === 'development' && row.plannedCount > 0
    && row.evaluatedCount === row.plannedCount && row.unlabeledCount === 0
    && Number.isFinite(row.report.metrics.metrics.recallAtK[String(row.profile.topK)]));
  const newest = complete[0]; if (!newest) return [];
  return complete.filter(row => row.datasetHash === newest.datasetHash && row.corpusHash === newest.corpusHash
    && row.profile.topK === newest.profile.topK && row.plannedCount === newest.plannedCount).sort((a,b) => {
    const time = (id: string) => state?.jobs.find(job => job.jobId === id)?.createdAtMs ?? 0;
    return time(a.jobId) - time(b.jobId);
  });
}

export function applicationChanges(before: LabAppVersion | undefined, after: LabAppVersion): string[] {
  if (!before) return ['初始版本：保存界面、研究方法与知识配置。'];
  const changes: string[] = [];
  const a = before.spec, b = after.spec;
  const modes: Record<string,string> = { adaptive_research: '按需搜索与阅读', bilingual_multiquery: '多查询研究' };
  const oldWorkflow = a.knowledge?.workflow?.kind ?? '一次检索', newWorkflow = b.knowledge?.workflow?.kind ?? '一次检索';
  if (oldWorkflow !== newWorkflow) changes.push(`研究方式：${modes[oldWorkflow] ?? oldWorkflow} → ${modes[newWorkflow] ?? newWorkflow}。`);
  const oldProfile = a.knowledge?.profile, newProfile = b.knowledge?.profile;
  if (oldProfile?.contextChars !== newProfile?.contextChars) changes.push(`证据上限：${oldProfile?.contextChars ?? '未配置'} → ${newProfile?.contextChars ?? '未配置'} 字符。`);
  if (oldProfile?.topK !== newProfile?.topK) changes.push(`默认检索片段数：${oldProfile?.topK ?? '未配置'} → ${newProfile?.topK ?? '未配置'}。`);
  if (JSON.stringify(a.model) !== JSON.stringify(b.model)) changes.push(`回答模型：${a.model.model} / ${a.model.thinkingLevel} → ${b.model.model} / ${b.model.thinkingLevel}。`);
  if (a.skill !== b.skill || before.sourceFiles.find(file => file.path === a.skill)?.sha256 !== after.sourceFiles.find(file => file.path === b.skill)?.sha256) changes.push('研究方法文件已更新。');
  if (a.knowledge?.sourceIndexId !== b.knowledge?.sourceIndexId) changes.push('知识索引已更换。');
  if (oldProfile?.mode !== newProfile?.mode) changes.push(`检索方式：${({lexical:'关键词',dense:'语义',hybrid:'混合'} as Record<string,string>)[oldProfile?.mode ?? ''] ?? '未配置'} → ${({lexical:'关键词',dense:'语义',hybrid:'混合'} as Record<string,string>)[newProfile?.mode ?? ''] ?? '未配置'}。`);
  if (JSON.stringify(a.actions) !== JSON.stringify(b.actions)) changes.push('研究任务与回答要求已调整。');
  const changedFiles=after.sourceFiles.filter(file=>before.sourceFiles.find(old=>old.path===file.path)?.sha256!==file.sha256).map(file=>file.path);
  if(changedFiles.some(path=>['index.html','agent-ui.js','agent-ui.css'].includes(path))) changes.push('研究对话界面已更新。');
  if(changedFiles.some(path=>path==='knowledge_runtime.py' || path.startsWith('knowledge_owner/'))) changes.push('检索执行代码已更新。');
  if(changedFiles.includes('REPORT_GUIDE.md')) changes.push('研究报告要求已更新。');
  if (!changes.length) changes.push(changedFiles.length ? '更新文件：'+changedFiles.join('、')+'。' : '重新保存应用版本，源文件与配置一致。');
  return changes;
}
