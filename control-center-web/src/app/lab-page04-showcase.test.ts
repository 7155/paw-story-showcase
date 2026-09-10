import { describe, expect, it } from 'vitest';
import { labPage04, labPage04ProjectId } from './lab-page04-showcase';

describe('Agent Lab page04 showcase contract', () => {
  it('keeps the reviewed research intake and frozen comparisons exact', () => {
    const research = labPage04.rag;
    expect(research.intake).toMatchObject({ total: 15, accepted: 10 });
    expect(research.intake.exclusions.map((row) => row.kind)).toEqual([
      'duplicate', 'parse_failed', 'cross_project', 'superseded', 'evaluation_only',
    ]);
    expect(research.runs.map((run) => [run.label, run.passed, run.total])).toEqual([
      ['原版基线 · 900 字', 8, 16],
      ['候选 A · 600 字', 11, 16],
      ['候选 B · 1800 字', 16, 16],
    ]);
    expect(research.requiredSourceCount).toBe(25);
    expect(research.materials).toHaveLength(10);
    expect(research.materials.every((row) => row.text.length > 900)).toBe(true);
  });

  it('keeps each business scenario on its own denominator', () => {
    expect(labPage04.cloudops.runs.map((run) => run.passed)).toEqual([1, 5, 6]);
    expect(labPage04.enterpriseops.runs.map((run) => run.passed)).toEqual([4, 6]);
    expect(labPage04.memory.runs.map((run) => run.passed)).toEqual([1, 3, 6]);
    expect(Object.values(labPage04).map((scenario) => scenario.runs[0].total)).toEqual([16, 6, 6, 6]);
  });

  it('separates citation coverage, answer support and delivery states', () => {
    expect(labPage04.rag.citationAudit.claimSupported).toBe(false);
    expect(labPage04.rag.trials.map((trial) => trial.status)).toContain('no_hit');
    expect(labPage04.rag.trials.map((trial) => trial.status)).toContain('missing_answer_despite_hits');
    expect(labPage04.rag.delivery).toMatchObject({ generated: false, downloaded: false, productionDeployed: false });
    expect(labPage04ProjectId('rag')).toBe('lab-page04-rag');
  });
});
