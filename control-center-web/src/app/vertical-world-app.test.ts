import { createRequire } from 'node:module';
import { afterEach, expect, it } from 'vitest';
import { verticalAppDocument } from '../../../showcase/vertical-app';
import { labFlowSamples, evaluateLabDemo } from '../../../showcase/lab-flow';
import type { LabKey } from '../../../showcase/lab-evidence';
const { JSDOM } = createRequire(import.meta.url)('jsdom');
const opened: Window[]=[];
afterEach(()=>opened.splice(0).forEach(window=>window.close()));
function app(key:LabKey) {
 const data=labFlowSamples[key];
 const ticks:(()=>void)[]=[]; const messages:{step:number;complete:boolean}[]=[];
 const window=new JSDOM(verticalAppDocument(key,data,'bounded',evaluateLabDemo(key,data,'bounded'),`world-${key}`),{url:'https://app.example',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(window:Window){window.setInterval=(callback:()=>void)=>{ticks.push(callback);return ticks.length;};window.postMessage=(value:{step:number;complete:boolean})=>{messages.push(value);};}}).window as Window;
 opened.push(window);const doc=window.document;
 const click=(selector:string)=>{const button=doc.querySelector<HTMLButtonElement>(selector);expect(button,selector).not.toBeNull();button!.click();};
 const state=()=>JSON.parse(window.localStorage.getItem(`paw.vertical-work.v1:world-${key}`)!);
 const guide=()=>{ticks.forEach(tick=>tick());return messages.at(-1)!;};
 return {window,doc,click,state,guide};
}
it('preserves customer context and reverses a completed assignment',()=>{
 const {doc,click,state}=app('enterpriseops');
 click('[data-record="customer-001"]');
 expect(doc.body.textContent).toContain('在途工单');expect(doc.body.textContent).toContain('ticket-001-a');
 const before=doc.querySelector('[data-current-owner]')!.textContent;
 click('[data-action="apply-assignment"]');expect(state().assignments['customer-001']).not.toBe(before);
 click('[data-action="undo"]');expect(doc.querySelector('[data-current-owner]')!.textContent).toBe(before);
 const frozen=labFlowSamples.enterpriseops.records.find(row=>row.locked)!;click(`[data-record="${frozen.id}"]`);
 expect(doc.querySelector<HTMLButtonElement>('[data-action="apply-assignment"]')!.disabled).toBe(true);
});
it('uses the correct policy and abstains on unavailable private records',()=>{
 const {doc,click}=app('rag');
 click('[data-example="gold-rag-012"]');click('[data-action="open-source"]');expect(doc.querySelector('.source')!.textContent).toContain('doc-013');
 click('[data-example="gold-rag-022"]');expect(doc.querySelector('#result')!.textContent).toBe('没有找到支持材料');expect(doc.querySelector('[data-action="save-answer"]')).toBeNull();
 click('[data-example="gold-rag-002"]');expect((doc.querySelector('#search-scope') as HTMLSelectElement).value).toBe('project:paw');expect(doc.querySelector('#detail')!.textContent).toContain('登记');
});
it('applies correction and revocation to their exact sources and can undo either',()=>{
 const {click,state}=app('memory');
 for(const id of ['source-012','source-042']){click(`[data-record="${id}"]`);click('[data-action="accept-memory"]');}
 expect(state().memories['source-012']).toBeUndefined();expect(state().memories['source-042']).toBeDefined();
 click('[data-action="undo"]');expect(state().memories['source-012']).toBeDefined();expect(state().memories['source-042']).toBeUndefined();
 for(const id of ['source-029','source-028']){click(`[data-record="${id}"]`);click('[data-action="accept-memory"]');}
 expect(state().memories['source-029']).toBeUndefined();expect(state().memories['source-028']).toBeUndefined();
 click('[data-action="undo"]');expect(state().memories['source-029']).toBeDefined();
 click('[data-record="source-006"]');click('[data-action="accept-memory"]');expect(state().memories['source-006']).toBeUndefined();
});

it('advances the RAG guide after the real scoped query and saved answer',()=>{
 const {click,guide,state}=app('rag');
 click('[data-example="gold-rag-001"]');expect(guide().step).toBe(2);
 click('[data-action="open-source"]');expect(guide().step).toBe(3);
 click('[data-action="save-answer"]');expect(guide().complete).toBe(true);expect(state().answers).toHaveLength(1);
});
it('advances the Memory guide after applying the collection and opening its source',()=>{
 const {click,guide,state}=app('memory');
 click('[data-record="source-001"]');expect(guide().step).toBe(2);
 click('[data-action="accept-memory"]');expect(guide().step).toBe(3);expect(state().memories['source-001']).toBeDefined();
 click('[data-nav="library"]');expect(guide().step).toBe(4);
 click('[data-action="show-memory-source"]');expect(guide().complete).toBe(true);
});
it('keeps retired memory sources retired across replay until the retiring operation is undone',()=>{
 const {click,state}=app('memory');
 for(const id of ['source-029','source-028','source-029']){click(`[data-record="${id}"]`);click('[data-action="accept-memory"]');}
 expect(state().memories['source-029']).toBeUndefined();
 click('[data-action="undo"]');expect(state().memories['source-029']).toBeDefined();
 for(const id of ['source-012','source-042','source-012']){click(`[data-record="${id}"]`);click('[data-action="accept-memory"]');}
 expect(state().memories['source-012']).toBeUndefined();expect(state().memories['source-042']).toBeDefined();
});
it('consumes shared owner capacity, increments revisions and makes repeated handovers idempotent',()=>{
 const {doc,click,state}=app('enterpriseops');
 click('[data-record="customer-001"]');click('[data-action="apply-assignment"]');
 expect(state().assignmentRevisions['customer-001']).toBe(2);expect(state().actions).toHaveLength(1);
 click('[data-action="apply-assignment"]');expect(state().actions).toHaveLength(1);
 for(const record of labFlowSamples.enterpriseops.records){click(`[data-record="${record.id}"]`);const button=doc.querySelector<HTMLButtonElement>('[data-action="apply-assignment"]')!;if(!button.disabled)button.click();}
 const owners=JSON.parse(String(labFlowSamples.enterpriseops.records[0].owners));
 for(const owner of owners)expect(owner.activeLoad+(state().ownerLoadDelta[owner.id]||0)).toBeLessThanOrEqual(owner.capacity);
 expect(Object.keys(state().assignments).length).toBeLessThan(44);
 const beforeUndo=state().actions.length;click('[data-action="undo"]');expect(state().actions).toHaveLength(beforeUndo-1);
});
it('rejects a shown handover after another view changes its revision',()=>{
 const {window,click,state,doc}=app('enterpriseops');
 click('[data-record="customer-001"]');const concurrent=state();concurrent.assignmentRevisions={'customer-001':2};
 window.localStorage.setItem('paw.vertical-work.v1:world-enterpriseops',JSON.stringify(concurrent));
 click('[data-action="apply-assignment"]');expect(state().assignments['customer-001']).toBeUndefined();expect(doc.querySelector('#notice')!.textContent).toContain('版本');
});
