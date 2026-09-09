import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ControlTransportProvider } from '@/app/control-transport';
import { MockControlTransport } from '@/test/mock-transport';
import { ProjectKnowledgeBaseline } from './ProjectKnowledgeBaseline';
import { baselineForCorpus } from './knowledge-baseline';
import type { KnowledgeState } from './knowledge-types';
import type { ProjectReceipt } from './types';

const state:KnowledgeState={schemaVersion:'paw.lab-knowledge-resource.v1',corpora:[{jobId:'corpus',title:'211 papers',corpusHash:'hash',documentCount:209,byteSize:1000,intake:{attemptedCount:211,failedCount:2,cleaning:{removeRepeatedMargins:true,normalizeWhitespace:true}},preview:[]}],indexes:[{jobId:'index',title:'full corpus',corpusId:'corpus',corpusHash:'hash',configHash:'config',documentCount:209,chunkCount:20017,chunking:{strategy:'fixed',size:900,overlap:120},dense:{available:false,provider:{provider:'none',semantic:false},vectorCount:0},reranker:{configured:false}}],jobs:[],datasets:[],evaluations:[],embedding:{provider:'sentence-transformers',model:'granite'},availableParsers:[{id:'builtin',name:'内置解析',available:true,status:'ready'},{id:'mineru',name:'MinerU',available:true,status:'ready'}]};
const transport=new MockControlTransport();
afterEach(()=>{cleanup();sessionStorage.clear();});
function mount(onSave=vi.fn(async()=>({artifact:{revision:1}} as ProjectReceipt)),onCommand=vi.fn(async()=>undefined as ProjectReceipt|undefined)) {
  const props={projectId:'project',state,revision:0,busy:false,onSave,onCommand,onRefresh:vi.fn()};
  return {...render(<ControlTransportProvider transport={transport}><ProjectKnowledgeBaseline {...props}/></ControlTransportProvider>),props};
}
describe('first-step knowledge baseline design',()=>{
  it('keeps an admitted job when navigating away before its response arrives',async()=>{
    let resolve!:(receipt:ProjectReceipt)=>void;
    const promise=new Promise<ProjectReceipt>(done=>{resolve=done;});
    const command=vi.fn(()=>promise),first=mount(undefined,command);
    fireEvent.change(screen.getByRole('combobox',{name:'基线解析方式'}),{target:{value:'mineru'}});
    fireEvent.click(screen.getByRole('button',{name:'处理资料'}));first.unmount();
    await act(async()=>resolve({job:{jobId:'accepted-parse'}} as ProjectReceipt));
    mount(undefined,command);
    expect(screen.getByRole('button',{name:'处理资料'})).toBeDisabled();
    expect(screen.getByRole('progressbar',{name:'基线准备进度'})).toBeInTheDocument();
    expect(command).toHaveBeenCalledOnce();
  });
  it('saves the full corpus and selected retrieval profile without rebuilding or invoking a model',async()=>{
    const {props}=mount();
    fireEvent.change(screen.getByRole('spinbutton',{name:'基线返回片段数'}),{target:{value:'8'}});
    fireEvent.click(screen.getByRole('button',{name:'保存基线'}));
    await waitFor(()=>expect(props.onSave).toHaveBeenCalledWith({...baselineForCorpus(state),profile:{...baselineForCorpus(state).profile,topK:8}},0));
    expect(props.onCommand).not.toHaveBeenCalled();
    expect(screen.getByText('209 篇 · 20,017 个分块，复用已有索引')).toBeInTheDocument();
  });
  it('sends the chosen parser and cleaning settings to the real operation',async()=>{
    const {props}=mount();
    fireEvent.change(screen.getByRole('combobox',{name:'基线解析方式'}),{target:{value:'mineru'}});
    fireEvent.click(screen.getByRole('checkbox',{name:'移除重复页眉页脚'}));
    fireEvent.click(screen.getByRole('button',{name:'处理资料'}));
    await waitFor(()=>expect(props.onCommand).toHaveBeenCalledWith({operation:'reclean_corpus',corpusId:'corpus',parsing:{mode:'mineru'},cleaning:{removeRepeatedMargins:false,normalizeWhitespace:true}}));
    expect(props.onSave).not.toHaveBeenCalled();
  });
  it('does not treat a changed chunking plan as a prepared index',async()=>{
    const {props}=mount();
    fireEvent.change(screen.getByRole('spinbutton',{name:'基线分块长度'}),{target:{value:'1600'}});
    expect(screen.queryByRole('button',{name:'保存基线'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'建立索引'}));
    await waitFor(()=>expect(props.onCommand).toHaveBeenCalledWith({operation:'index',corpusId:'corpus',chunking:{strategy:'fixed',size:1600,overlap:120},embedding:'none'}));
  });
});
