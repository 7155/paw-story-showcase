/// <reference types="node" />
import { createRequire } from 'node:module';
import { afterEach, expect, it } from 'vitest';
import { verticalAppDocument } from '../../../showcase/vertical-app';
import { labFlowSamples, evaluateLabDemo } from '../../../showcase/lab-flow';
import type { LabKey } from '../../../showcase/lab-evidence';
const { JSDOM } = createRequire(import.meta.url)('jsdom');
const windows: Window[] = [];
afterEach(() => { for (const window of windows.splice(0)) window.close(); });
function open(key: LabKey) {
  const data = labFlowSamples[key];
  const html = verticalAppDocument(key, data, 'bounded', evaluateLabDemo(key, data, 'bounded'), `test-${key}`);
  const dom = new JSDOM(html, { url: 'https://app.example', runScripts: 'dangerously', pretendToBeVisual: true });
  const window = dom.window as Window; windows.push(window);
  const doc = window.document;
  const click = (selector: string) => { const element = doc.querySelector<HTMLButtonElement>(selector); expect(element, selector).not.toBeNull(); element!.click(); };
  return { doc, window, click };
}
it('executes an eligible assignment, restores its prior owner, and refuses a region mismatch', () => {
  const { doc, click } = open('enterpriseops');
  click('[data-record="customer-a"]'); click('[data-action="apply-assignment"]');
  expect(doc.querySelector('[data-current-owner]')!.textContent).toBe('候选负责人 01');
  click('[data-action="undo"]'); expect(doc.querySelector('[data-current-owner]')!.textContent).toBe('原负责人 01');
  click('[data-record="customer-b"]'); expect(doc.querySelector<HTMLButtonElement>('[data-action="apply-assignment"]')!.disabled).toBe(true);
  click('[data-action="apply-assignment"]'); expect(doc.querySelector('[data-current-owner]')!.textContent).toBe('原负责人 02');
});
it('retrieves a real corpus excerpt, saves its source, and abstains on an unsupported query', () => {
  const { doc, click, window } = open('rag');
  click('[data-example="refund-case"]'); click('[data-action="open-source"]');
  expect(doc.querySelector('.source')!.textContent).toContain('退款申请应在收货后七天内提出');
  click('[data-action="save-answer"]');
  expect(JSON.parse(window.localStorage.getItem('paw.vertical-work.v1:test-rag')!).answers).toEqual([expect.objectContaining({ id: 'refund' })]);
  (doc.querySelector('#query') as HTMLInputElement).value = 'qzzxunsupported';
  doc.querySelector('#query-form')!.dispatchEvent(new (window as unknown as { Event: typeof Event }).Event('submit', { bubbles: true, cancelable: true }));
  expect(doc.querySelector('#result')!.textContent).toBe('没有找到支持材料');
  expect(doc.querySelector('[data-action="save-answer"]')).toBeNull();
});
it('diagnoses the gateway layer and stores a plan without claiming production repair', () => {
  const { doc, click, window } = open('cloudops');
  click('[data-record="incident-b"]'); click('[data-action="diagnose"]');
  expect(doc.querySelector('.diagnosis h2')!.textContent).toBe('网关层');
  (doc.querySelector('#plan') as HTMLTextAreaElement).value = '核对网关错误日志与最近变更';
  click('[data-action="save-ticket"]');
  expect(JSON.parse(window.localStorage.getItem('paw.vertical-work.v1:test-cloudops')!).tickets['incident-b']).toBe('核对网关错误日志与最近变更');
  expect(doc.querySelector('.saved')!.textContent).toContain('未执行生产修复');
});
it('keeps durable memory with its source and leaves temporary input out of long-term recall', () => {
  const { doc, click, window } = open('memory');
  click('[data-record="memory-b"]'); click('[data-action="accept-memory"]');
  expect(JSON.parse(window.localStorage.getItem('paw.vertical-work.v1:test-memory')!).memories).toEqual({});
  click('[data-record="memo-session-1"]'); click('[data-action="accept-memory"]'); click('[data-nav="library"]');
  expect(doc.querySelectorAll('[data-record]')).toHaveLength(1);
  click('[data-action="show-memory-source"]'); expect(doc.querySelector('.source')!.textContent).toContain('design:session:1');
  click('[data-action="undo"]'); expect(doc.querySelectorAll('[data-record]')).toHaveLength(0);
});
