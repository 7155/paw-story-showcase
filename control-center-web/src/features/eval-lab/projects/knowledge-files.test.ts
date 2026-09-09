import { expect, it } from 'vitest';
import { droppedKnowledgeFiles, knowledgeFileName, supportedKnowledgeFile } from './knowledge-files';
it('keeps folder paths and reads every directory batch', async () => {
  const one = new File(['one'], 'one.md'); const two = new File(['two'], 'two.txt');
  let page = 0;
  const entries = [one, two].map((file) => ({ name: file.name, isFile: true, file: (callback: (file: File) => void) => callback(file) }));
  const folder = { name: 'Research', isDirectory: true, createReader: () => ({ readEntries: (callback: (entries: unknown[]) => void) => callback(page < 2 ? [entries[page++]] : []) }) };
  const data = { items: [{ kind: 'file', webkitGetAsEntry: () => folder }] } as unknown as DataTransfer;
  const result = await droppedKnowledgeFiles(data);
  expect(result.map(knowledgeFileName)).toEqual(['Research/one.md', 'Research/two.txt']);
});
it('accepts ZIP and supported text while excluding hidden metadata', () => {
  expect(supportedKnowledgeFile(new File(['zip'], 'papers.zip'))).toBe(true);
  expect(supportedKnowledgeFile(new File(['text'], '.hidden.txt'))).toBe(false);
});
