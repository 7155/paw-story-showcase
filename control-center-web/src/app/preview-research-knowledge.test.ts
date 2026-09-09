/// <reference types="node" />
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PreviewResearchKnowledge } from './preview-research-knowledge';
import { parseKnowledgeState, defaultRetrieval } from '@/features/eval-lab/projects/knowledge-types';
import { createLocalResearchBridge, searchWithResearchProfile } from '../../../showcase/portable-research-app';
import { defaultLabConfig, searchResearch } from '../../../showcase/guided-lab';
import { parseSourceRead } from '@/features/agent/portable/SourceReader';

beforeEach(()=>vi.stubGlobal('crypto',webcrypto));
afterEach(()=>vi.unstubAllGlobals());

it('runs a real corpus evaluation and gives the exported bridge exactly the evaluated sources',async()=>{
  const resource=new PreviewResearchKnowledge('test-research',true);await resource.ready;
  const state=parseKnowledgeState(resource.state);
  expect(state.corpora[0].intake.successfulCount).toBe(200);
  const corpus=state.corpora[0],dataset=state.datasets[0];
  const indexed=await resource.command({operation:'index',corpusId:corpus.jobId,embedding:'none',chunking:{strategy:'general',size:700,overlap:100}});
  const profile={...defaultRetrieval,mode:'lexical' as const,topK:4,candidateDepth:20,contextChars:3000,threshold:.25};
  const evaluated=await resource.command({operation:'evaluate',indexId:indexed.job!.jobId,datasetId:dataset.datasetId,split:'development',profile});
  const selected=resource.exportEvaluation(evaluated.job!.jobId);
  expect(selected.evaluation.evaluatedCount).toBe(16);
  const bridge=createLocalResearchBridge({title:'Research',version:1,corpusHash:corpus.corpusHash,documentCount:200,
    chunks:selected.chunks,config:defaultLabConfig,profile,questions:[]},searchResearch,searchWithResearchProfile);
  for(const question of selected.questions){
    const hits=resource.search(selected.index,question.input,profile);
    const output=await bridge.invoke('research',{question:question.input});
    expect(output.sources.map(row=>Reflect.get(row,'sourceId'))).toEqual(hits.map(hit=>hit.sourceId));
    expect(output.sources.map(row=>Reflect.get(row,'text'))).toEqual(hits.map(hit=>hit.content));
  }
  const old=resource.state.indexes[0];
  const chunk=selected.chunks[0],locator={sourceId:chunk.sourceId,chunkId:chunk.id,snapshotSha256:corpus.corpusHash};
  const source=parseSourceRead(await bridge.readSource(locator),locator);
  expect(source.chunks.find(row=>row.isCited)?.text).toBe(chunk.text);
  await expect(bridge.readSource({...locator,snapshotSha256:'wrong'})).rejects.toThrow('不匹配');
  await resource.command({operation:'index',corpusId:corpus.jobId,embedding:'none',chunking:{strategy:'fixed',size:2000,overlap:0}});
  expect(resource.exportEvaluation(evaluated.job!.jobId).index).toEqual(old);
  await expect(resource.command({operation:'evaluate',indexId:old.jobId,datasetId:dataset.datasetId,split:'holdout',profile})).rejects.toThrow('没有独立留出集');
});

it('validates uploaded bytes, keeps readable and failed files visible, and refuses unrelated dataset binding',async()=>{
  const resource=new PreviewResearchKnowledge('upload-test',false);await resource.ready;
  const upload=async(name:string,text:string)=>{
    const bytes=new TextEncoder().encode(text),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
    const begin=await resource.command({operation:'upload_begin',name,bytes:bytes.length,sha256:hash});
    const uploadId=begin.upload!.uploadId;
    await expect(resource.command({operation:'upload_chunk',uploadId,index:1,data:btoa(text)})).rejects.toThrow('顺序');
    await resource.command({operation:'upload_chunk',uploadId,index:0,data:btoa(text)});
    await resource.command({operation:'upload_seal',uploadId});return uploadId;
  };
  const ready=await upload('source.txt','Observed glacier retreat in 2024.'),failed=await upload('unreadable.bin','invalid');
  await resource.command({operation:'import_corpus',uploadIds:[ready,failed]});
  const corpus=resource.state.corpora[0];expect(corpus.intake).toMatchObject({attemptedCount:2,successfulCount:1,failedCount:1});
  const sourceId=corpus.intake.documents!.find(row=>row.status==='ready')!.sourceId;
  const read=await resource.command({operation:'inspect_document',corpusId:corpus.jobId,sourceId,page:1});
  expect(read.job!.result).toMatchObject({cleanedMarkdown:'Observed glacier retreat in 2024.'});
  await expect(resource.command({operation:'import_dataset',corpusId:corpus.jobId,rows:[{id:'bad',question:'Which glacier?',expectedSourceIds:['unrelated']}]})).rejects.toThrow('不在当前资料');
  await resource.command({operation:'import_dataset',corpusId:corpus.jobId,fields:{id:'key',question:'prompt',sources:'citations',answer:'reference'},
    rows:[{key:'mapped-question',prompt:'Which year?',citations:[sourceId],reference:'2024'}]});
  expect(resource.state.datasets[0]).toMatchObject({referenceAnswerCount:1,preview:[{caseId:'mapped-question',question:'Which year?'}]});
});
