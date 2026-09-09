import { expect, it } from 'vitest';
import { applyPortableResult, portableRecordTurn, type PortableTurn } from './conversation-types';
import { researchReportMarkdown } from './research-report';
const partial: PortableTurn = { id: 'original', question: 'Question', actionId: 'research', values: {}, createdAtMs: 1, state: 'answering', output: 'Partial text', sources: [], stages: [] };
it('preserves streamed text without allowing export as a final report', () => {
  const result = applyPortableResult(partial, {});
  expect(result.output).toBe('Partial text');
  expect(result.finalOutputConfirmed).toBe(false);
  expect(() => researchReportMarkdown('Research', result)).toThrow('研究尚未完成');
  const restored = portableRecordTurn({ requestId: 'original', actionId: 'research', input: {}, state: 'completed', progress: { text: 'Partial text' } }, 'question');
  expect(restored.finalOutputConfirmed).toBe(false);
  expect(() => researchReportMarkdown('Research', restored)).toThrow('研究尚未完成');
  expect(researchReportMarkdown('Research', applyPortableResult(partial, { text: 'Final text' }))).toContain('Final text');
});
