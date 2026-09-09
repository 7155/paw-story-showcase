import { describe, expect, it } from 'vitest';
import { researchReportMarkdown } from './research-report';
import type { PortableTurn } from './conversation-types';

const turn: PortableTurn = { id: 'one', requestId: 'request-one', question: 'Compare the studies.', actionId: 'research', values: {},
  createdAtMs: 1788912000000, state: 'completed', finalOutputConfirmed: true, output: 'The evidence differs [7].', version: 9, stages: [],
  sources: [{ sourceId: 'paper', citationNumber: 7, title: 'Study A', uri: 'https://example.org/paper', text: 'Measured result.',
    citation: { sourceId: 'paper', chunkId: 'chunk', snapshotSha256: 'frozen', page: 3 } }] };
describe('research report export', () => {
  it('preserves non-contiguous citation numbers, source excerpts, page and receipt identity', () => {
    const result = researchReportMarkdown('Research', turn);
    expect(result).toContain('The evidence differs [7].');
    expect(result).toContain('### [7] Study A');
    expect(result).toContain('引用页码：3');
    expect(result).toContain('> Measured result.');
    expect(result).toContain('request-one');
    expect(result).toContain('v9');
    expect(result).toContain('快照 SHA-256：frozen');
    expect(result).toContain('片段 ID：chunk');
  });
  it('does not export a partial or cancelled response as a final report', () => {
    expect(() => researchReportMarkdown('Research', { ...turn, finalOutputConfirmed: false })).toThrow('研究尚未完成');
    for (const state of ['answering', 'cancelled', 'unconfirmed', 'failed']) {
      expect(() => researchReportMarkdown('Research', { ...turn, state })).toThrow('研究尚未完成');
    }
  });
  it('excludes unsafe source links and makes missing evidence explicit', () => {
    expect(researchReportMarkdown('Research', { ...turn, sources: [{ ...turn.sources[0], uri: 'javascript:alert(1)' }] })).not.toContain('javascript:');
    expect(researchReportMarkdown('Research', { ...turn, sources: [] })).toContain('未提供可定位的来源');
  });
});
