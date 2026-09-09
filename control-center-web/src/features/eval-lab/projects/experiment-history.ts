import { useQuery } from '@tanstack/react-query';
import { useControlTransport } from '@/app/control-transport';
import { getGoldenSuites } from '../golden/api';
import { isExperimentResult, type GoldenJob, type GoldenSuite } from '../golden/types';
import { parseTrialList, type TrialJob } from '../trials/api';
import { labConnectionKey, requestLabControl } from '../control-request';
import { applicationChanges } from './journey-evidence';
import { chunkLabels, retrievalLabels } from './knowledge-baseline';
import { embeddingModelLabel, type KnowledgeState } from './knowledge-types';
import { object, type LabProject } from './types';
import type { LabAppCall, LabAppVersion } from './apps';

export const experimentKinds = ['检索评测','回答实验','资料与索引','应用版本','应用调用','题集与校准','阅读记录'] as const;
export type ExperimentKind = typeof experimentKinds[number];
export type ExperimentRecord = { id:string; kind:ExperimentKind; title:string; config:string; outcome:string; state:string; createdAtMs:number;
  trial?:TrialJob; golden?:GoldenJob; suiteId?:string; version?:LabAppVersion; call?:LabAppCall };
export const experimentStates: Record<string,string> = { completed:'已完成',failed:'失败',cancelled:'已停止',interrupted:'已中断',running:'进行中',queued:'排队中',cancelling:'正在停止',saved:'已保存' };
const historyMessage=(value:string)=>value==='Execution owner stopped; inspect the original bindings. Resume is unavailable.' ? '执行已中断，原始记录已保留。' : value;
const operationLabels: Record<string,string> = {import_corpus:'导入资料',reclean_corpus:'清洗资料',repair_document:'替换问题文件',reparse_document:'重解析文档',connect_base:'连接知识库',index:'建立索引',search:'检索测试',evaluate:'检索评测',inspect_document:'阅读文档',import_dataset:'导入题集',import_golden_dataset:'复用冻结题集'};
export const historyRate=(n:unknown)=>typeof n==='number' && Number.isFinite(n) ? (n*100).toFixed(1)+'%' : '未计分';

export function goldenOutcome(job: GoldenJob): string {
  if (job.kind==='experiment' && isExperimentResult(job.result)) {
    const result=job.result, a=result.development.baselineMetrics, b=result.development.candidateMetrics;
    return `开发集 ${a.total} 题 · 通过 ${historyRate(a.passRate)} → ${historyRate(b.passRate)}${result.holdout ? ' · 含留出验证' : ' · 未做留出验证'}`;
  }
  const value=object(job.result);
  if(job.kind==='calibrate') { const calibration=object(value.calibration),metrics=object(calibration.metrics);if(typeof metrics.total==='number') return `一致率 ${historyRate(metrics.agreement)} · ${metrics.comparable ?? 0} / ${metrics.total} 个样本`; }
  if(job.kind==='draft' && Array.isArray(value.cases)) return value.cases.length+' 道题';
  if(value.partial===true) { const runs=value.caseRuns;return Array.isArray(runs) ? '部分结果 · '+runs.length+' 条回答记录' : '部分结果，详见原始回执'; }
  return job.error || job.progress || experimentStates[job.state];
}

export function projectExperimentRecords(project: LabProject, state: KnowledgeState | undefined, trials: TrialJob[], suites: GoldenSuite[], versions: LabAppVersion[], calls: LabAppCall[]): ExperimentRecord[] {
  const records:ExperimentRecord[]=[];
  for(const trial of trials.filter(row=>row.sceneId==='knowledge-resource' && row.publicSpec.projectId===project.projectId)) {
    const op=String(trial.publicSpec.operation), result=object(trial.result), profile=object(trial.publicSpec.profile);
    const index=state?.indexes.find(row=>row.jobId===(trial.publicSpec.indexId ?? trial.jobId)), chunk=index?.chunking;
    const config=op==='inspect_document' ? String(trial.publicSpec.sourceId ?? '') : [chunk ? `${chunkLabels[chunk.strategy] ?? chunk.strategy} ${chunk.size} / ${chunk.overlap}` : '',index?.dense.provider.semantic ? embeddingModelLabel(index.dense.provider.model) : '',profile.mode ? `${retrievalLabels[String(profile.mode)] ?? profile.mode} · K ${profile.topK}` : '',profile.contextChars ? `${profile.contextChars} 字符` : ''].filter(Boolean).join(' · ');
    const metrics=object(object(object(result.report).metrics).metrics);
    const outcome=trial.state==='completed' ? result.kind==='evaluation' ? `召回 ${historyRate(object(metrics.recallAtK)[String(profile.topK)])} · ${result.evaluatedCount} / ${result.plannedCount} 题 · ${result.split==='development' ? '开发集' : '留出集'}`
      : result.kind==='index' ? `${result.documentCount} 篇 · ${Number(result.chunkCount).toLocaleString()} 块`
      : result.kind==='corpus' ? `${result.documentCount} 个可读 · ${object(result.intake).failedCount ?? 0} 个失败`
      : result.kind==='search' ? `${Array.isArray(result.hits) ? result.hits.length : 0} 个检索结果`
      : result.kind==='dataset' ? `${object(result.dataset).caseCount ?? '—'} 道题` : experimentStates[trial.state]
      : trial.error || String(result.message || experimentStates[trial.state]);
    const kind:ExperimentKind=op==='evaluate' ? '检索评测' : op==='inspect_document' ? '阅读记录' : op.includes('dataset') ? '题集与校准' : '资料与索引';
    records.push({id:trial.jobId,kind,title:operationLabels[op] ?? op,config,outcome:historyMessage(outcome),state:trial.state,createdAtMs:trial.createdAtMs,trial});
  }
  const bound=new Set(project.bindings.filter(b=>b.ownerRef.kind==='golden_suite').map(b=>b.ownerRef.id));
  for(const suite of suites.filter(s=>s.knowledge?.projectId===project.projectId || !s.knowledge?.projectId && bound.has(s.suiteId))) for(const golden of suite.jobs) {
    const result=object(golden.result),a=object(result.baseline),b=object(result.candidate),variants=object(result.knowledgeVariants);
    const workflow=(value:unknown)=>{ const kind=object(object(value).workflow).kind;return kind==='adaptive_research' ? '按需搜索与阅读' : kind==='bilingual_multiquery' ? '多查询研究' : '单次检索'; };
    const config=golden.kind==='experiment' ? [a.model ? `${a.model} ${a.thinkingLevel} → ${b.model ?? a.model} ${b.thinkingLevel ?? a.thinkingLevel}` : '',variants.baseline ? `${workflow(variants.baseline)} → ${workflow(variants.candidate)}` : ''].filter(Boolean).join(' · ') : suite.title;
    records.push({id:golden.jobId,kind:golden.kind==='experiment' ? '回答实验' : '题集与校准',title:golden.kind==='experiment' ? '回答方案对比' : golden.kind==='draft' ? '准备评测题' : golden.reprocessOnly ? '重新核对评审记录' : '校准评审',config,outcome:goldenOutcome(golden),state:golden.state,createdAtMs:golden.createdAtMs,golden,suiteId:suite.suiteId});
  }
  for(const version of versions) records.push({id:'version:'+version.appId+':'+version.version,kind:'应用版本',title:'深度研究 v'+version.version,config:applicationChanges(versions.find(row=>row.appId===version.appId && row.version===version.version-1),version).join(' '),outcome:version.spec.knowledge ? version.spec.knowledge.sourceCount+' 篇来源 · '+version.spec.knowledge.chunkCount.toLocaleString()+' 块' : '已保存源文件',state:'saved',createdAtMs:version.createdAtMs,version});
  for(const call of calls) records.push({id:call.callId,kind:'应用调用',title:'v'+call.version+' · '+String(call.input.question ?? Object.values(call.input)[0] ?? '应用调用'),config:call.model ? `${call.model.model} · ${call.model.thinkingLevel}` : '',outcome:call.error || (Array.isArray(call.result?.sources) ? call.result.sources.length+' 条来源记录' : call.state==='completed' ? '已保存回答与过程' : experimentStates[call.state]),state:call.state,createdAtMs:call.createdAtMs,call});
  return [...new Map(records.map(row=>[row.id,row])).values()].sort((a,b)=>b.createdAtMs-a.createdAtMs || a.id.localeCompare(b.id));
}

export function useProjectExperimentHistory(projectId:string,enabled:boolean) {
  const transport=useControlTransport();
  return useQuery({queryKey:['lab-project-history',labConnectionKey(transport),projectId],enabled,retry:false,refetchOnWindowFocus:true,
    queryFn:async({signal})=>{
      const results=await Promise.allSettled([requestLabControl(transport,{pathId:'agent.eval-lab.trials.get',signal}).then(parseTrialList),getGoldenSuites(transport,'',signal)]);
      const [trials,golden]=results;
      return {trials:trials.status==='fulfilled' ? trials.value.jobs : [],suites:golden.status==='fulfilled' ? golden.value.items : [],errors:results.filter(result=>result.status==='rejected').map(result=>String((result as PromiseRejectedResult).reason))};
    },refetchInterval:query=>query.state.data?.trials.some(row=>row.publicSpec.projectId===projectId && ['queued','running','cancelling'].includes(row.state)) || query.state.data?.suites.some(s=>s.knowledge?.projectId===projectId && s.jobs.some(j=>['queued','running'].includes(j.state))) ? 2000 : false});
}
