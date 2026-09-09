/// <reference types="node" />
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { webcrypto, createHash } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { runInNewContext } from 'node:vm';
import { commandLabProject, readLabProject } from '@/features/eval-lab/projects/api';
import { createPreviewTransport } from './preview-control-transport';
import { labFlowSamples } from '../../../showcase/lab-flow';
import type { LabKey } from '../../../showcase/lab-evidence';
import { parseLabAppRead } from '@/features/eval-lab/projects/apps';

beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());

it.each(['cloudops','enterpriseops','memory'] as LabKey[])('imports, evaluates and exports a runnable %s App using exactly the evaluated data', async (key) => {
  const transport = createPreviewTransport(); const projectId = `lab-showcase-${key}`;
  let project = (await readLabProject(transport, projectId)).project!;
  let sequence = 0;
  const command = async (action: Parameters<typeof commandLabProject>[1]['action'], input: Parameters<typeof commandLabProject>[1]['input']) => {
    const result = await commandLabProject(transport, { action, input, projectId, expectedRevision: project.revision, clientRequestId: `${key}:${++sequence}` });
    project = result.project; return result;
  };
  await command('import_materials', { materials: [{ title: `${key}.json`, text: JSON.stringify(labFlowSamples[key]) }] });
  const evaluated = await command('knowledge', { operation: 'showcase_evaluate' });
  expect(evaluated.artifact?.summary).toContain(`/${labFlowSamples[key].cases.length}`);
  expect(evaluated.artifact?.summary).toContain('用户基线');
  await command('prepare_app', { directory: 'showcase' });
  const catalog = parseLabAppRead(await transport.request({ pathId: 'agent.eval-lab.apps.get', query: { projectId } }));
  const appId = catalog.items[0].appId;
  const app = parseLabAppRead(await transport.request({ pathId: 'agent.eval-lab.apps.get', query: { projectId, appId } }), appId);
  expect(app.version?.spec.model.provider).toBe('offline-showcase');
  const download = await transport.request({ pathId: 'agent.eval-lab.apps.download', query: { appId, version: 1, target: 'standalone' } }) as { base64: string; sha256: string; byteSize: number };
  const bytes = Buffer.from(download.base64, 'base64');
  expect(bytes.length).toBe(download.byteSize);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(download.sha256);
  const files: Record<string, string> = {}; let cursor = 0;
  while (bytes.readUInt32LE(cursor) === 0x04034b50) {
    const size = bytes.readUInt32LE(cursor + 18); const nameLength = bytes.readUInt16LE(cursor + 26); const extra = bytes.readUInt16LE(cursor + 28);
    const name = bytes.subarray(cursor + 30, cursor + 30 + nameLength).toString();
    const start = cursor + 30 + nameLength + extra; const body = bytes.subarray(start, start + size);
    expect(crc32(body)).toBe(bytes.readUInt32LE(cursor + 14)); files[name] = body.toString(); cursor = start + size;
  }
  expect(Object.keys(files)).toEqual(['index.html', 'data.json', 'evaluation.json', 'parameters.json', 'README.md']);
  expect(JSON.parse(files['data.json'])).toEqual(labFlowSamples[key]);
  expect(JSON.parse(files['evaluation.json'])).toMatchObject({ passed: labFlowSamples[key].cases.length, total: labFlowSamples[key].cases.length });
  const source = files['index.html'].match(/<script>([\s\S]*?);const records=/)![1];
  const execute = runInNewContext(`${source};execute`);
  for (const item of labFlowSamples[key].cases) expect(execute(key, labFlowSamples[key].records, item.input, 'bounded').value).toBe(item.expected);
  await command('import_materials', { materials: [{ title: 'change.txt', text: '数据版本发生变化' }] });
  await expect(command('prepare_app', { directory: 'showcase' })).rejects.toThrow('当前数据');
});
