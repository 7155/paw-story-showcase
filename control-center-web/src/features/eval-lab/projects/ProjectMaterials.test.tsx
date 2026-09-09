import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ControlTransportProvider } from '@/app/control-transport';
import { MockControlTransport } from '@/test/mock-transport';
import { ProjectMaterials } from './ProjectMaterials';
import type { LabProject, ProjectReceipt } from './types';
import type { KnowledgeState } from './knowledge-types';

const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); });
const project: LabProject = { schemaVersion: 'rag-ime.agent-lab-project.v1', projectId: 'p', revision: 1, title: 'Paper app', description: 'Research', briefVersion: 1,
  materialCount: 0, artifactCount: 0, guideSessionId: '', createdAtMs: 1, updatedAtMs: 1, materialSetId: '', materialSet: { materialSetId: '', version: 0, materials: [], createdAtMs: null }, materialVersions: [],
  intake: { state: 'needs_materials', requestedPath: '', resolvedPath: '', readCount: 0, readBytes: 0, skippedCount: 0, partial: false, issues: [], checkedAtMs: null }, artifacts: [], bindings: [], workspace: { artifactOrder: [], primaryArtifactId: '', layout: 'split' }, workspaceBinding: null };

it('lists knowledge PDFs when text materials are empty, including sources outside the eight-item preview, and reads the selected page', async () => {
  const state: KnowledgeState = { schemaVersion: 'paw.lab-knowledge-resource.v1', corpora: [{ jobId: 'corpus', title: 'Papers', corpusHash: 'hash', documentCount: 9, byteSize: 1000,
    intake: { pageCount: 18, documents: Array.from({ length:9 }, (_,i) => ({ sourceId:`paper-${i+1}.pdf`, pageCount:2, status:'ready' as const, warnings:[] })) },
    preview: [{ sourceId:'paper-1.pdf', title:'First paper', uri:'source:1', byteSize:100, excerpt:'First page excerpt' }] }], indexes: [], datasets: [], evaluations: [], jobs: [], embedding: { provider:'none', model:'' } };
  const client = new QueryClient({ defaultOptions: { queries: { retry:false } } }); clients.push(client);
  const transport = new MockControlTransport({ routes: { 'agent.eval-lab.projects.get': () => ({ ok:true, items:[project], project, supportedViews:[], knowledge:state }) } });
  const command = vi.fn(async (input): Promise<ProjectReceipt> => {
    state.jobs = [{ jobId:'inspection', state:'completed', progress:'', error:'', createdAtMs:2, updatedAtMs:3, publicSpec:{ operation:'inspect_document', projectId:'p' }, result: { kind:'document_inspection', corpusId:'corpus', document:{ sourceId:input.sourceId }, page:input.page, cleanedMarkdown:`Full paper nine page ${input.page}`, rawMarkdown:'Raw extracted text' } }];
    return { ok:true, project, clientRequestId:'read', replayed:false };
  });
  render(<QueryClientProvider client={client}><ControlTransportProvider transport={transport}><ProjectMaterials project={project} busy={false} onAdd={vi.fn()} onKnowledge={vi.fn()} onCommand={command} /></ControlTransportProvider></QueryClientProvider>);
  expect(await screen.findByText('9 份知识资料 · 18 页')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name:/paper-9.pdf/ }));
  expect(await screen.findByText('Full paper nine page 1')).toBeVisible();
  expect(command).toHaveBeenLastCalledWith({ operation:'inspect_document', corpusId:'corpus', sourceId:'paper-9.pdf', page:1 });
  fireEvent.click(screen.getByRole('button', { name:'下一页' }));
  expect(await screen.findByText('Full paper nine page 2')).toBeVisible();
  expect(command).toHaveBeenCalledTimes(2);
});

it('shows the failed page read receipt instead of silently leaving the document summary', async () => {
  const knowledge = { schemaVersion:'paw.lab-knowledge-resource.v1', corpora:[{ jobId:'corpus', title:'Papers', corpusHash:'hash', documentCount:1, byteSize:100,
    intake:{ documents:[{sourceId:'paper.pdf',pageCount:1,status:'ready',warnings:[]}] }, preview:[] }], indexes:[], datasets:[], evaluations:[],
    jobs:[{jobId:'read',state:'failed',publicSpec:{operation:'inspect_document',projectId:'p',corpusId:'corpus',sourceId:'paper.pdf',page:1},result:{status:'failed',message:'逐页快照缺失。'},error:'',progress:'failed',createdAtMs:1,updatedAtMs:2}], embedding:{provider:'none',model:''} };
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}}); clients.push(client);
  const transport = new MockControlTransport({routes:{'agent.eval-lab.projects.get':()=>({ok:true,items:[project],project,supportedViews:[],knowledge})}});
  render(<QueryClientProvider client={client}><ControlTransportProvider transport={transport}><ProjectMaterials project={project} busy={false} onAdd={vi.fn()} onKnowledge={vi.fn()} onCommand={vi.fn()}/></ControlTransportProvider></QueryClientProvider>);
  expect(await screen.findByRole('alert')).toHaveTextContent('逐页快照缺失。');
});
