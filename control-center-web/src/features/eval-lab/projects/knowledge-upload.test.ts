import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { recoverKnowledgeUpload, uploadKnowledgeFile, type KnowledgeUploadCheckpoint } from './knowledge-upload';
import type { ProjectReceipt } from './types';
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());
const receipt = (upload: Record<string, unknown>) => ({ upload }) as ProjectReceipt;
describe('knowledge upload recovery', () => {
  for (const interrupted of ['upload_begin', 'upload_chunk', 'upload_seal']) {
    it(`resumes ${interrupted} from the original receipt without another upload`, async () => {
      const bytes = new TextEncoder().encode('abcdefgh');
      const file = new File([bytes], 'one.pdf'); Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
      let checkpoint: KnowledgeUploadCheckpoint | undefined; let pending: ProjectReceipt | undefined; let failed = false;
      const operations: string[] = [];
      const command = vi.fn(async (input) => {
        operations.push(input.operation);
        const output = receipt(input.operation === 'upload_begin' ? { uploadId: 'original', name: file.name, bytes: file.size, sha256: input.sha256, chunkBytes: 4 }
          : input.operation === 'upload_chunk' ? { uploadId: 'original', index: input.index, receivedBytes: 4 } : { uploadId: 'original', ready: true });
        if (input.operation === interrupted && !failed) { failed = true; pending = output; return undefined; }
        return output;
      });
      const save = (value: KnowledgeUploadCheckpoint) => { checkpoint = value; };
      await expect(uploadKnowledgeFile(file, command, () => {}, undefined, { save })).rejects.toThrow('尚未确认');
      checkpoint = recoverKnowledgeUpload(JSON.parse(JSON.stringify(checkpoint)), pending!.upload!);
      await expect(uploadKnowledgeFile(file, command, () => {}, undefined, { checkpoint, save })).resolves.toBe('original');
      expect(operations).toEqual(['upload_begin', 'upload_chunk', 'upload_chunk', 'upload_seal']);
      expect(checkpoint?.phase).toBe('complete');
    });
  }
  it('allows a rejected begin to be corrected without treating it as an unknown upload', async () => {
    const bytes = new TextEncoder().encode('text'); const file = new File([bytes], 'study.md');
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
    let checkpoint: KnowledgeUploadCheckpoint | undefined;
    const command = vi.fn(async () => { throw { status: 422, message: 'invalid request' }; });
    await expect(uploadKnowledgeFile(file, command, () => {}, undefined, { save: (value) => { checkpoint = value; } })).rejects.toMatchObject({ status: 422 });
    expect(checkpoint?.phase).toBe('idle');
    expect(checkpoint?.uploadId).toBeUndefined();
  });
  it('rejects a mismatched recovery receipt', () => {
    expect(() => recoverKnowledgeUpload({ name: 'one.pdf', bytes: 8, sha256: 'hash', uploadId: 'one', chunkBytes: 4, nextIndex: 0, phase: 'chunk' }, { uploadId: 'two', index: 0, receivedBytes: 4 })).toThrow('不属于原文件');
  });
});
