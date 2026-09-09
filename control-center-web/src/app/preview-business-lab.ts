import { candidateConfigs, defaultLabConfig, documentsFromDataset, evaluateGuidedLab, validateLabConfig, type LabConfig, type LabRun } from '../../../showcase/guided-lab';
import type { LabKey } from '../../../showcase/lab-evidence';
import { evaluateLabDemo, type DemoDataset } from '../../../showcase/lab-flow';

export type BusinessEvaluation = { signature:string; dataset:DemoDataset; mode:'bounded';
  runs:LabRun[]; result:{ decision:string; total:number; baselinePassed:number; candidatePassed:number }; config:LabConfig };
export function businessFields(key:LabKey) {
  const field = (key:string,label:string,type='boolean') => ({key,label,type,required:true});
  if (key === 'cloudops') return [field('useSignals','使用日志与配置观测'),field('multiple','识别多个独立异常')];
  if (key === 'enterpriseops') return [field('minTenure','最短任期（天）','number'),field('constraints','核对地区、行业、认证、冻结与容量')];
  return [field('durableOnly','只保留已提交的长期信息'),field('changes','识别纠正与撤销'),field('merge','合并同范围同概念来源')];
}
export function businessConfig(key:LabKey, values:Record<string,unknown>):LabConfig {
  const config = {...defaultLabConfig};
  for (const field of businessFields(key)) {
    const value = values[field.key];
    if (field.type === 'boolean' && typeof value !== 'boolean') throw new Error(`请设置「${field.label}」并保存。`);
    if (field.type === 'number' && (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > 3650)) throw new Error('任期需要是 0–3650 天的整数。');
    Object.assign(config,{[field.key]:value});
  }
  validateLabConfig(config); return config;
}
export function evaluateBusiness(key:LabKey,dataset:DemoDataset,config:LabConfig,candidates:boolean,signature:string):BusinessEvaluation {
  // Reuse the schema check before the parameterized evaluator sees the data.
  evaluateLabDemo(key,dataset,'baseline');
  const documents=documentsFromDataset(dataset);
  const runs=[evaluateGuidedLab(key,documents,dataset.cases,config,'用户基线')];
  if(candidates) for(const candidate of candidateConfigs(key,config)) runs.push(evaluateGuidedLab(key,documents,dataset.cases,candidate.config,candidate.name));
  const best=[...runs].sort((a,b)=>b.passed-a.passed || a.contextChars-b.contextChars)[0];
  return {signature,dataset,mode:'bounded',runs,config:best.config,result:{decision:best.passed===best.total?'keep':'reject',
    total:best.total,baselinePassed:runs[0].passed,candidatePassed:best.passed}};
}
