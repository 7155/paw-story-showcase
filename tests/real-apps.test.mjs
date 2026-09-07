import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../control-center-web/package.json',import.meta.url));
const {JSDOM}=require('jsdom');
const root=new URL('../real-apps/',import.meta.url);
const json=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const text=p=>readFileSync(new URL(p,root),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));
function dom(key){const d=new JSDOM(text(`${key}/index.html`),{url:`https://example.test/real-apps/${key}/index.html`,runScripts:'outside-only'});d.window.Response=Response;d.window.fetch=async path=>new Response(text(`${key}/${path.replace('./','')}`));return d;}
test('Original RAG viewer searches real corpus and keeps validation labels hidden',async()=>{
 const d=dom('enterprise-rag');try{d.window.eval(text('enterprise-rag/snapshot-api.js'));d.window.eval(text('enterprise-rag/app.js'));await tick();
 let response=await d.window.publicSnapshotFetch('/api/documents?source=slack&limit=2');let rows=await response.json();assert.equal(rows.total,2834);assert.equal(rows.items.length,2);
 response=await d.window.publicSnapshotFetch('/api/documents/'+encodeURIComponent(rows.items[0].documentId));const doc=await response.json();assert.ok(doc.text.length>0);
 response=await d.window.publicSnapshotFetch('/api/queries?split=validation&kind=retrieval');rows=await response.json();assert.equal(rows.total,16);assert.ok(rows.items.every(r=>!('gold'in r)));
 response=await d.window.publicSnapshotFetch('/api/queries?split=heldout');assert.equal((await response.json()).total,0);
 d.window.document.querySelector('[data-view="results"]').click();await tick();assert.match(d.window.document.getElementById('app').textContent,/89.2%/);
 }finally{d.window.close();}
});
for(const key of ['support','wix'])test(`${key}: original history controls restore actual result; new calls cannot fake success`,async()=>{
 const d=dom(key);try{d.window.eval(text('assistant-snapshot.js'));for(const script of d.window.document.querySelectorAll('script:not([src])'))d.window.eval(script.textContent);
 d.window.document.getElementById('history-toggle').click();await tick();const target=d.window.document.querySelector(key==='support'?'[data-history-index]':'#history-list button');assert.ok(target);target.click();await tick();
 assert.match(d.window.document.body.textContent,key==='support'?/历史结果/:/已恢复保存/);
 const history=await d.window.pawApp.history();assert.equal(history[0].state,'completed');await assert.rejects(d.window.pawApp.invoke('answer',{}),/历史调用/);
 }finally{d.window.close();}
});
test('Geo snapshot binds original completed jobs to downloadable artifacts and annual observations',()=>{
 const routes=json('geo/public/snapshot.json');assert.equal(routes['/api/plans'].plans.length,2);assert.equal(routes['/api/jobs'].jobs.length,5);assert.equal(routes['/api/environment'].authenticated,false);
 let tif=0,measurements=0;
 for(const job of routes['/api/jobs'].jobs){assert.equal(job.state,'completed');assert.ok(routes['/api/plans/'+job.planId]);for(const file of routes['/api/jobs/'+job.jobId+'/artifacts'].artifacts){assert.ok(existsSync(new URL('geo/public/'+file.path,root)));if(file.name.endsWith('.tif'))tif++;if(file.name==='yearly_metrics.json')measurements++;}}
 assert.equal(tif,1);assert.equal(measurements,4);
});
