import { describe, expect, it } from 'vitest';
import { evaluateLabDemo, labFlowSamples, parseLabDemoDataset, runLabDemo } from '../../../showcase/lab-flow';
import { previewRoomSnapshot } from './preview-room-data';
import { worldRoomFiles } from './preview-world-room';
import { publicMemoryCorpus, corpusAtoms } from './preview-memory-corpus';
import { createHash } from 'node:crypto';
describe('long public world scenarios', () => {
  it('imports every scenario with scalar business inputs and separate gold', () => {
    for (const [key,sample] of Object.entries(labFlowSamples)) {
      expect(parseLabDemoDataset([JSON.stringify(sample)])).toEqual(sample);
      expect(sample.records.every(row=> !('expectedAction' in row) && !('expectedService' in row) && !('acceptableOwnerIds' in row))).toBe(true);
      const report = evaluateLabDemo(key as keyof typeof labFlowSamples,sample,'bounded');
      process.stdout.write(JSON.stringify({key,passed:report.candidatePassed,total:report.total,failed:report.rows.filter(row=>row.candidate==='失败').map(row=>`${row.caseId}:${row.actual}!=${row.expected}`)})+'\n');
      expect(report.total).toBeGreaterThanOrEqual(18);
      expect(report.candidatePassed).toBeGreaterThanOrEqual(report.baselinePassed);
    }
  });
  it('refuses frozen handovers and diagnoses ambiguous evidence explicitly', () => {
    const ops=labFlowSamples.enterpriseops; const frozen=ops.records.find(row=>row.locked)!;
    expect(runLabDemo('enterpriseops',ops.records,String(frozen.id),'bounded').value).toBe('拒绝');
    expect(runLabDemo('cloudops',labFlowSamples.cloudops.records,'incident-017','bounded').value).toBe('multiple');
    expect(runLabDemo('cloudops',labFlowSamples.cloudops.records,'incident-015','bounded').value).toBe('unknown');
  });
  it('never publishes composing or revoked memory as active atoms', () => {
    const memory=labFlowSamples.memory.records;
    for(const row of memory.filter(row=>row.phase!=='committed'||!row.consent)) expect(runLabDemo('memory',memory,String(row.id),'bounded').value).toBe('不保留');
    expect(corpusAtoms().some(row=>row.id==='atom:corpus-world-source-029')).toBe(false);
    expect(publicMemoryCorpus.some(row=>row.id==='world-source-029'&&row.scope==='superseded')).toBe(true);
  });
  it('retains sequence recovery and real readable artifact hashes', () => {
    const all=previewRoomSnapshot('room-preview'); const partial=previewRoomSnapshot('room-preview',{throughSequence:44,baseTimeMs:0});
    expect(all.events).toHaveLength(69); expect(partial.events.at(-1)?.sequence).toBe(44);
    expect(JSON.stringify(partial.events)).toContain('输入事件 v2');
    for(const file of Object.values(worldRoomFiles)) expect(createHash('sha256').update(file.content).digest('hex')).toBe(file.sha256);
  });
});
