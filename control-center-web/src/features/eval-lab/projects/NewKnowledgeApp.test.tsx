import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { NewKnowledgeApp } from './NewKnowledgeApp';
import type { LabProject, ProjectReceipt } from './types';

const project = { projectId: 'research-project', revision: 1, guideSessionId: 'guide-one' } as LabProject;
const receipt = (extra = {}): ProjectReceipt => ({ ok: true, clientRequestId: 'one', replayed: false, project, ...extra });
function pdf(name: string) { const bytes = new TextEncoder().encode('%PDF-1.4 test upload bytes'); const file = new File([bytes], name, { type: 'application/pdf' }); Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer }); return file; }
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); });

describe('PDF and requirements to a Lab application', () => {
  it('seals every PDF before submitting one corpus, then returns to baseline design without starting the Guide', async () => {
    const operations: string[] = []; const create = vi.fn(async () => { operations.push('create'); return receipt(); });
    const ready = vi.fn(async (_receipt: ProjectReceipt, _message: string) => { operations.push('guide'); }); let number = 0;
    const command = vi.fn(async (input) => { operations.push(input.operation); if (input.operation === 'upload_begin') return receipt({ upload: { uploadId: `upload-${++number}`, chunkBytes: 524288 } }); if (input.operation === 'import_corpus') return receipt({ job: { jobId: 'corpus-job' } }); return receipt(); });
    const { container } = render(<NewKnowledgeApp connection="test" blocked={false} onCreate={create} onKnowledge={command} onReady={ready} />);
    expect(screen.getByRole('button', { name: '导入资料并设计基线' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: '应用要求' }), { target: { value: 'Build a cited research app.' } });
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(2);
    fireEvent.change(screen.getByRole('slider', { name: '准确率要求' }), { target: { value: '.95' } });
    fireEvent.change(screen.getByRole('slider', { name: '成本接受程度' }), { target: { value: '.15' } });
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [pdf('one.pdf'), pdf('two.pdf')] } });
    fireEvent.click(screen.getByRole('button', { name: '导入资料并设计基线' }));
    await waitFor(() => expect(ready).toHaveBeenCalledOnce());
    expect(operations).toEqual(['create', 'upload_begin', 'upload_chunk', 'upload_seal', 'upload_begin', 'upload_chunk', 'upload_seal', 'import_corpus', 'guide']);
    expect(create).toHaveBeenCalledWith({ description: expect.stringContaining('Build a cited research app.') });
    const submitted = (create.mock.calls[0] as unknown as [{description:string}])[0].description;
    expect(submitted).toContain('严格要求'); expect(submitted).toContain('优先控制成本');
    expect(submitted).not.toMatch(/\d\s*(%|元|秒)|P95|每 100 问/);
    expect(command.mock.calls.at(-1)?.[0]).toMatchObject({ operation: 'import_corpus', uploadIds: ['upload-1', 'upload-2'] });
    expect(ready.mock.calls[0]?.[0].job?.jobId).toBe('corpus-job');
    expect(ready.mock.calls[0]?.[1]).toBe('');
    expect(submitted).toContain('用户先在第一步设计知识库基线');
  });

  it('accepts a folder with text and Markdown and preserves relative names in the upload', async () => {
    const file = pdf('methods.md'); Object.defineProperty(file, 'webkitRelativePath', { value: 'Research/methods.md' });
    const command = vi.fn(async (input) => input.operation === 'upload_begin' ? receipt({ upload: { uploadId: 'file', chunkBytes: 524288 } }) : input.operation === 'import_corpus' ? receipt({ job: { jobId: 'corpus-job' } }) : receipt());
    const ready = vi.fn(async () => {});
    render(<NewKnowledgeApp connection="folder" blocked={false} onCreate={async () => receipt()} onKnowledge={command} onReady={ready} />);
    fireEvent.change(screen.getByRole('textbox', { name: '应用要求' }), { target: { value: 'Build from this folder.' } });
    fireEvent.change(screen.getByLabelText('选择资料文件夹'), { target: { files: [file] } });
    expect(screen.getByText('Research/methods.md')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '导入资料并设计基线' }));
    await waitFor(() => expect(ready).toHaveBeenCalledOnce());
    expect(command.mock.calls[0][0]).toMatchObject({ operation: 'upload_begin', name: 'Research/methods.md' });
  });

  it('recovers the original project creation without starting a second project or a premature Guide', async () => {
    const create = vi.fn(async () => undefined); const ready = vi.fn(async () => {});
    const command = vi.fn(async (input) => input.operation === 'upload_begin' ? receipt({ upload: { uploadId: 'file', chunkBytes: 524288 } }) : input.operation === 'import_corpus' ? receipt({ job: { jobId: 'corpus-job' } }) : receipt());
    const props = { connection: 'test', blocked: false, onCreate: create, onKnowledge: command, onReady: ready };
    const view = render(<NewKnowledgeApp {...props} />);
    fireEvent.change(screen.getByRole('textbox', { name: '应用要求' }), { target: { value: 'Research app' } });
    fireEvent.change(view.container.querySelector('input[type=file]')!, { target: { files: [pdf('one.pdf')] } });
    fireEvent.click(screen.getByRole('button', { name: '导入资料并设计基线' }));
    await screen.findByRole('alert'); expect(ready).not.toHaveBeenCalled(); expect(command).not.toHaveBeenCalled();
    view.rerender(<NewKnowledgeApp {...props} recoveredReceipt={receipt()} />);
    fireEvent.click(await screen.findByRole('button', { name: '继续上传资料' }));
    await waitFor(() => expect(ready).toHaveBeenCalledOnce()); expect(create).toHaveBeenCalledOnce();
  });
});
