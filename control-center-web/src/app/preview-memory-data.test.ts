import { describe, expect, it } from 'vitest';
import { previewActivityTimelineCalendar, previewLocalDate } from './preview-memory-data';

describe('Memory showcase timeline calendar', () => {
  it('marks the frozen current day as semantically organized with all five tasks', () => {
    const today = previewLocalDate();
    const calendar = previewActivityTimelineCalendar(
      today.slice(0, 7),
      new Map([[today, 'approved']]),
    );
    const days = calendar.days as Array<Record<string, unknown>>;
    const currentDay = days.find((day) => day.date === today);

    expect(currentDay).toMatchObject({
      status: 'approved',
      organized: true,
      modelOrganized: true,
      sourceEventCount: 1_284,
      segmentCount: 5,
    });
  });

  it('uses the local calendar day across the UTC midnight boundary', () => {
    const shortlyAfterLocalMidnight = new Date(2026, 7, 31, 0, 10).getTime();

    expect(previewLocalDate(shortlyAfterLocalMidnight)).toBe('2026-08-31');
  });
});
