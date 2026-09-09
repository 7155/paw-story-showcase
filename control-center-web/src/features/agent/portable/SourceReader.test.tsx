import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SourceReader, type PortableSource, type SourceRead } from './SourceReader';

const source: PortableSource = { sourceId: 'paper', title: 'An actual cited paper', originalFilename: 'science.pdf',
  uri: 'knowledge-source:paper', text: 'Saved answer evidence.', chunkId: 'chunk-9', citationNumber: 2,
  citation: { sourceId: 'paper', chunkId: 'chunk-9', snapshotSha256: 'a'.repeat(64), page: 9, ordinal: 8, heading: 'Methods' } };
const result = (): SourceRead => ({ kind: 'extracted_source', source: { sourceId: 'paper', title: source.title, originalFilename: 'science.pdf', sourceSha256: 'b'.repeat(64) },
  citation: source.citation!, originalUrl: 'https://journal.example/science.pdf#page=9', offset: 6, totalChunks: 30, nextOffset: 9, previousOffset: 0,
  chunks: [{ chunkId: 'chunk-8', ordinal: 7, page: 8, heading: 'Background', text: 'Neighboring evidence.', isCited: false },
    { chunkId: 'chunk-9', ordinal: 8, page: 9, heading: 'Methods', text: 'The exact cited passage.', isCited: true }] });

afterEach(cleanup);

describe('frozen App citation reader', () => {
  it('reads the exact source and chunk, highlights its actual page, and preserves original identity', async () => {
    const readSource = vi.fn(async () => result());
    const { container } = render(<SourceReader source={source} readSource={readSource} />);
    await screen.findByText('The exact cited passage.');
    expect(readSource).toHaveBeenCalledWith({ sourceId: 'paper', chunkId: 'chunk-9', snapshotSha256: 'a'.repeat(64) });
    expect(container.querySelector('[data-cited="true"]')).toHaveTextContent('第 9 页');
    expect(container.querySelector('[data-cited="true"]')).toHaveTextContent('The exact cited passage.');
    expect(screen.getByText('science.pdf')).toBeVisible();
    expect(screen.getByText('冻结提取文本')).toBeVisible();
    expect(screen.getByRole('link', { name: '打开来源链接' })).toHaveAttribute('href', 'https://journal.example/science.pdf#page=9');
    fireEvent.click(screen.getByText('来源版本'));
    expect(screen.getByText('b'.repeat(64))).toBeVisible();
  });

  it('can read the full frozen source in pages and return to the cited passage', async () => {
    const readSource = vi.fn(async () => result());
    render(<SourceReader source={source} readSource={readSource} />);
    await screen.findByText('The exact cited passage.');
    fireEvent.click(screen.getByRole('button', { name: '后面的内容' }));
    await waitFor(() => expect(readSource).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 9 })));
    await waitFor(() => expect(screen.getByRole('button', { name: '从头阅读' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '从头阅读' }));
    await waitFor(() => expect(readSource).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0 })));
    await waitFor(() => expect(screen.getByRole('button', { name: '回到引用' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '回到引用' }));
    await waitFor(() => expect(readSource).toHaveBeenLastCalledWith({ sourceId: 'paper', chunkId: 'chunk-9', snapshotSha256: 'a'.repeat(64) }));
  });

  it('does not replace a citation with a different snapshot or turn private URIs into links', async () => {
    render(<SourceReader source={source} readSource={async () => ({ ...result(), citation: { ...source.citation!, snapshotSha256: 'c'.repeat(64) } })} />);
    await screen.findByRole('alert');
    expect(screen.queryByText('The exact cited passage.')).not.toBeInTheDocument();
    expect(screen.getByText('Saved answer evidence.')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('keeps the newer selected citation when an earlier source read settles late', async () => {
    let finish!: (value: SourceRead) => void;
    const readSource = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce({ ...result(), citation: { ...source.citation!, chunkId: 'chunk-10' },
        chunks: [{ chunkId: 'chunk-10', page: 10, ordinal: 9, text: 'New selection.', isCited: true }] });
    const view = render(<SourceReader source={source} readSource={readSource} />);
    view.rerender(<SourceReader source={{ ...source, citation: { ...source.citation!, chunkId: 'chunk-10' } }} readSource={readSource} />);
    await screen.findByText('New selection.');
    await act(async () => finish(result()));
    expect(screen.getByText('New selection.')).toBeVisible();
    expect(screen.queryByText('The exact cited passage.')).not.toBeInTheDocument();
  });
});
