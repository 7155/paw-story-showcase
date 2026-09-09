import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LabKnowledgeIntake } from './LabKnowledgeIntake';
import { defaultCleaning, type KnowledgeCorpus, type KnowledgeJob } from './knowledge-types';

afterEach(cleanup);
const corpus: KnowledgeCorpus = { jobId: 'corpus-211', title: 'Papers', corpusHash: 'original', documentCount: 209, byteSize: 123,
  intake: { attemptedCount: 211, successfulCount: 209, failedCount: 2, pageCount: 3880, changedDocumentCount: 14,
    cleaning: defaultCleaning, documents: [
      { sourceId: 'paper.pdf', status: 'needs_review', pageCount: 2, pageMappingAvailable: true, warnings: ['repeated_margins_detected'], cleaningChanges: { removedMarginLines: 2 } },
      { sourceId: 'bad.pdf', status: 'failed', warnings: [], message: '文件名为 PDF，但内容缺少 PDF 标识；可能是下载错误的网页，请重新取得原论文。' },
    ] }, preview: [] };
describe('PDF intake inspection', () => {
  it('uses the original current page for MinerU and requires advertised readiness', () => {
    const onCommand = vi.fn(async () => undefined);
    const props = { corpus, jobs: [], disabled: false, cleaning: defaultCleaning, onCommand, onRepair: vi.fn() };
    const view = render(<LabKnowledgeIntake {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '对照正文' }));
    expect(screen.getByRole('button', { name: '用 MinerU 重解析第 1 页' })).toBeDisabled();
    view.rerender(<LabKnowledgeIntake {...props} mineruAvailable />);
    fireEvent.click(screen.getByRole('button', { name: '下一页正文' }));
    fireEvent.click(screen.getByRole('button', { name: '用 MinerU 重解析第 2 页' }));
    expect(onCommand).toHaveBeenLastCalledWith({ operation: 'reparse_document', corpusId: corpus.jobId, sourceId: 'paper.pdf', parsing: { mode: 'mineru' }, pages: [2] });
  });
  it('retains full attempted and failure counts, then inspects a stable source and page through the owner', () => {
    const onCommand = vi.fn(async () => undefined);
    const jobs: KnowledgeJob[] = [{ jobId: 'inspection-1', state: 'completed', progress: '', error: '', createdAtMs: 1, updatedAtMs: 1, publicSpec: { operation: 'inspect_document', projectId: 'project-1' }, result: { kind: 'document_inspection', corpusId: corpus.jobId,
      document: corpus.intake.documents![0], page: 1, pageCount: 2, rawMarkdown: 'JOURNAL HEADER\nActual evidence', cleanedMarkdown: 'Actual evidence', rawTruncated: false, cleanedTruncated: false } }];
    render(<LabKnowledgeIntake corpus={corpus} jobs={jobs} disabled={false} cleaning={defaultCleaning} onCommand={onCommand} onRepair={vi.fn()} />);
    expect(screen.getByText('尝试 211 篇 · 可读 209 篇 · 失败 2 篇 · 提取 3880 页')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '对照正文' }));
    expect(onCommand).toHaveBeenCalledWith({ operation: 'inspect_document', corpusId: 'corpus-211', sourceId: 'paper.pdf', page: 1 });
    expect(screen.getByText(/JOURNAL HEADER/)).toBeVisible();
    expect(screen.getByText('Actual evidence', { exact: true })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '下一页正文' }));
    expect(onCommand).toHaveBeenLastCalledWith({ operation: 'inspect_document', corpusId: 'corpus-211', sourceId: 'paper.pdf', page: 2 });
    expect(screen.queryByText(/JOURNAL HEADER/)).toBeNull();
  });
  it('creates a cleaning generation and repairs only the selected source through the upload callback', () => {
    const onCommand = vi.fn(async () => undefined); const onRepair = vi.fn(async () => undefined);
    render(<LabKnowledgeIntake corpus={corpus} jobs={[]} disabled={false} cleaning={{ ...defaultCleaning, removeRepeatedMargins: false }} onCommand={onCommand} onRepair={onRepair} />);
    fireEvent.click(screen.getByRole('button', { name: '按上方设置生成清洗新版本' }));
    expect(onCommand).toHaveBeenCalledWith({ operation: 'reclean_corpus', corpusId: 'corpus-211', cleaning: { removeRepeatedMargins: false, normalizeWhitespace: true } });
    fireEvent.change(screen.getByRole('combobox', { name: '解析状态' }), { target: { value: 'failed' } });
    expect(screen.queryByRole('button', { name: '对照正文' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '查看与修复' }));
    expect(screen.getByRole('status')).toHaveTextContent('内容缺少 PDF 标识');
    const file = new File(['%PDF-correct'], 'correct.pdf');
    fireEvent.change(screen.getByLabelText('选择修复文件'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '上传并修复此论文' }));
    expect(onRepair).toHaveBeenCalledWith('bad.pdf', file);
  });
});
