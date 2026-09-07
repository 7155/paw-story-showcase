import { describe, expect, it, vi } from 'vitest';
import { commandLabProject, readLabProject } from '@/features/eval-lab/projects/api';
import { parseKnowledgeState } from '@/features/eval-lab/projects/knowledge-types';
import { parseLabAppRead } from '@/features/eval-lab/projects/apps';
import { parseGoldenRead } from '@/features/eval-lab/golden/types';
import { parseTrialList } from '@/features/eval-lab/trials/api';
import { createPreviewTransport } from './preview-control-transport';
import { currentLabExperiments } from '../../../showcase/lab-evidence';
import { labDemoProjectId } from '../../../showcase/lab-demo';

describe('current PAW Lab showcase transport', () => {
  it('binds all four vertical projects to the same public candidate evidence', async () => {
    const transport = createPreviewTransport();
    for (const experiment of currentLabExperiments) {
      const projectId = labDemoProjectId(experiment.key);
      const { project, artifact } = await readLabProject(transport, projectId, 'candidate-matrix');
      expect(project?.workspace.primaryArtifactId).toBe('demo-intake');
      expect(project?.materialCount).toBe(0);
      const table = artifact?.content as { rows: { quality: string; cost: string; decision: string }[]; caption: string };
      expect(table.rows.map((row) => row.quality)).toEqual(experiment.stages.map((stage) => stage.quality));
      expect(table.rows.map((row) => row.cost)).toEqual(experiment.stages.map((stage) => stage.cost));
      expect(table.rows.map((row) => row.decision)).toEqual(experiment.stages.map((stage) => stage.decision.toUpperCase()));
      expect(table.caption).toContain(experiment.id);
      const receipt = await readLabProject(transport, projectId, 'public-receipt');
      expect(receipt.artifact?.content).toMatchObject({ experimentId: experiment.id, baseline: experiment.baseline, candidate: experiment.candidate });
    }
  });
  it('opens a project and its actual artifact through the production readers', async () => {
    const transport = createPreviewTransport();
    const catalog = await readLabProject(transport);
    const id = catalog.items[0].projectId;
    const { project } = await readLabProject(transport, id);
    expect(project?.title).toBe('PAW 文档问答 · 演示');
    expect(project?.materialCount).toBeGreaterThan(0);
    const selected = project!.artifacts.find((item) => item.artifactId === project!.workspace.primaryArtifactId)!;
    const { artifact } = await readLabProject(transport, id, selected.artifactId, selected.revision);
    expect(artifact?.content).toContain('公开合成');
  });

  it('keeps artifact revisions and deduplicates an acknowledged edit', async () => {
    const transport = createPreviewTransport();
    const catalog = await readLabProject(transport);
    const { project } = await readLabProject(transport, catalog.items[0].projectId);
    const original = project!.artifacts[0];
    const command = { action: 'publish_artifact' as const, projectId: project!.projectId,
      expectedRevision: project!.revision, clientRequestId: 'lab-project:showcase-edit',
      input: { artifactId: original.artifactId, expectedArtifactRevision: original.revision, content: '# 更新后的演示成果' } };
    const saved = await commandLabProject(transport, command);
    const replay = await commandLabProject(transport, command);
    expect(saved.artifact?.revision).toBe(original.revision + 1);
    expect(replay.replayed).toBe(true);
    expect(replay.project.revision).toBe(saved.project.revision);
    const history = await readLabProject(transport, project!.projectId, original.artifactId, original.revision);
    expect(history.artifact?.content).toContain('公开合成');
    await expect(commandLabProject(transport, { ...command, clientRequestId: 'lab-project:stale-edit' })).rejects.toThrow('版本');
  });

  it('shows Knowledge sources and searches only the in-memory demonstration', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected external request'));
    try {
      const transport = createPreviewTransport();
      const catalog = await readLabProject(transport);
      const detail = await readLabProject(transport, catalog.items[0].projectId);
      const knowledge = parseKnowledgeState(detail.knowledge);
      expect(knowledge.indexes[0].corpusHash).toBe(knowledge.corpora[0].corpusHash);
      const searched = await commandLabProject(transport, { action: 'knowledge', projectId: detail.project!.projectId,
        expectedRevision: detail.project!.revision, clientRequestId: 'lab-project:showcase-search',
        input: { operation: 'search', indexId: knowledge.indexes[0].jobId, query: 'Session' } });
      expect(searched.job?.result?.hits?.[0].content).toContain('Pi');
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });

  it('returns valid empty runtime resources and rejects real execution explicitly', async () => {
    const transport = createPreviewTransport();
    expect(parseLabAppRead(await transport.request({ pathId: 'agent.eval-lab.apps.get' })).items).toEqual([]);
    expect(parseGoldenRead(await transport.request({ pathId: 'agent.eval-lab.golden.get' })).items).toEqual([]);
    expect(parseTrialList(await transport.request({ pathId: 'agent.eval-lab.trials.get' })).jobs).toEqual([]);
    const catalog = await readLabProject(transport);
    const { project } = await readLabProject(transport, catalog.items[0].projectId);
    await expect(commandLabProject(transport, { action: 'prepare_app', projectId: project!.projectId,
      expectedRevision: project!.revision, clientRequestId: 'lab-project:no-runtime', input: { directory: '/workspace/demo' } })).rejects.toThrow('公开演示');
  });
});
