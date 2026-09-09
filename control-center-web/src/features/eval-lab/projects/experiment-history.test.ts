import { describe, expect, it } from 'vitest';
import { projectExperimentRecords } from './experiment-history';
import type { TrialJob } from '../trials/api';
import type { GoldenSuite } from '../golden/types';
import type { LabProject } from './types';
import type { LabAppCall, LabAppVersion } from './apps';

describe('complete project experiment history',()=>{
  it('keeps all 72 real records, including stopped work, without importing another project',()=>{
    const project={projectId:'full-papers',bindings:[]} as unknown as LabProject;
    const trials=Array.from({length:37},(_,i)=>({jobId:'trial-'+i,clientRequestId:'request-'+i,cancelRequested:false,progress:'',sessions:[],updatedAtMs:i,resumeAvailable:false,sceneId:'knowledge-resource',publicSpec:{projectId:'full-papers',operation:i<13 ? 'evaluate' : 'search',profile:{mode:'lexical',topK:16}},result:null,state:i===0 ? 'interrupted' : 'completed',createdAtMs:i,error:''})) as TrialJob[];
    const suite={suiteId:'suite',title:'Research',knowledge:{projectId:'full-papers'},jobs:Array.from({length:15},(_,i)=>({jobId:'golden-'+i,kind:'experiment',state:'cancelled',createdAtMs:100+i,result:null,error:'',progress:''}))} as GoldenSuite;
    const versions=Array.from({length:11},(_,i)=>({appId:'research-app',version:i+1,createdAtMs:200+i,contentHash:'hash',html:'',fileCount:1,byteSize:10,spec:{title:'research',description:'',html:'index.html',context:[],model:{provider:'codex',model:'luna',thinkingLevel:'high'},actions:[],skill:'SKILL.md'},sourceFiles:[]})) as LabAppVersion[];
    const calls=Array.from({length:9},(_,i)=>({callId:'call-'+i,actionId:'research',sessionId:'session-'+i,result:{},cancelRequested:false,updatedAtMs:300+i,appId:'research-app',version:11,input:{question:'Research'},state:'completed',createdAtMs:300+i,error:''})) as LabAppCall[];
    const foreign={...trials[0],jobId:'foreign',publicSpec:{...trials[0].publicSpec,projectId:'two-paper-demo'}};
    const rows=projectExperimentRecords(project,undefined,[...trials,foreign],[suite,{...suite,suiteId:'other',knowledge:{...suite.knowledge!,projectId:'two-paper-demo'}}],versions,calls);
    expect(rows).toHaveLength(72);expect(rows.some(row=>row.id==='trial-36')).toBe(true);
    expect(rows.some(row=>row.id==='foreign')).toBe(false);
    expect(rows.filter(row=>row.kind==='检索评测')).toHaveLength(13);
    expect(rows.find(row=>row.id==='trial-0')?.state).toBe('interrupted');
    expect(rows.find(row=>row.id==='golden-0')?.outcome).not.toContain('通过');
  });
});
