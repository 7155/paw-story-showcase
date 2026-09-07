// Guided clicks use only original rendered controls. Completion requires visible results.
(() => {
 const id=new URL(location.href).searchParams.get('showcaseInstance'); if(!id)return;
 const geo=location.pathname.includes('/geo/'), support=location.pathname.includes('/support/'), wix=location.pathname.includes('/wix/');
 const buttonText=(selector,text)=>[...document.querySelectorAll(selector)].find(e=>e.textContent.includes(text));
 const steps=support||wix?[
  {label:'打开记录',instruction:'在原版 App 中读取已保存的调用。',target:()=>document.querySelector('#history-toggle'),done:()=>!!document.querySelector(support?'[data-history-index]':'#history-list button')},
  {label:'恢复结果',instruction:'恢复原问题和已完成的结果，不发送新请求。',target:()=>document.querySelector(support?'[data-history-index]':'#history-list button'),done:()=>support?document.querySelector('#result')?.textContent.includes('历史结果'):document.querySelector('#status')?.textContent.includes('已恢复保存')},
  ...(wix?[{label:'核对来源',instruction:'展开实际检索的文档，核对来源原文。',target:()=>document.querySelector('#sources summary'),done:()=>!!document.querySelector('#sources details[open]')}]:[]),
 ]:geo?[
  {label:'查看结论',instruction:'查看原任务的研判结论与计算指标。',target:()=>document.querySelector('.result-tabs button'),done:()=>!!document.querySelector('.analysis-results .result-summary, .analysis-results .investigation-results, .analysis-results .result-verdict')},
  {label:'查看运行',instruction:'打开历史运行记录。',target:()=>buttonText('.result-tabs button','运行')||document.querySelector('.result-tabs button:last-child'),done:()=>!!document.querySelector('.run-row')},
  {label:'核对产物',instruction:'选中原任务，核对时间、任务编号和产物文件。',target:()=>document.querySelector('.run-row'),done:()=>!!document.querySelector('.job-detail a[href*="seed/jobs/"]')},
 ]:[
  {label:'打开语料',instruction:'在原版实验台中打开 5,101 份实验文档。',target:()=>document.querySelector('[data-view="corpus"]'),done:()=>!!document.querySelector('[data-document-id]')},
  {label:'核对原文',instruction:'打开实验输入文档，查看完整原文。',target:()=>document.querySelector('[data-document-id]'),done:()=>!!document.querySelector('.doc-detail-text')},
  {label:'查看结果',instruction:'查看真实检索实验结果及未验证边界。',target:()=>document.querySelector('[data-view="results"]'),done:()=>document.querySelector('[data-view="results"]')?.classList.contains('active')&&!!document.querySelector('[data-candidate]')},
 ];
 let playing=false,index=0,due=Date.now()+1600,attempted=false,clickPending=false;
 const cursor=document.createElement('div');cursor.setAttribute('aria-hidden','true');cursor.style.cssText='position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transition:transform 650ms ease;display:none';cursor.innerHTML='<svg width="28" height="32" viewBox="0 0 28 32"><path d="M2 1.5v22l5.7-5.5 4.7 10.4 4.3-2-4.8-10.2H21Z" fill="#171a21" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';document.body.append(cursor);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)cursor.style.transition='none';
 addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.channel==='paw.hands-on-control'&&e.data.instanceId===id)playing=e.data.playing===true;});
 setInterval(()=>{
  const complete=index>=steps.length,step=steps[Math.min(index,steps.length-1)],target=step.target();
  parent.postMessage({channel:'paw.hands-on',version:1,instanceId:id,labels:steps.map(s=>s.label),instruction:complete?'已打开原始记录；可继续自行查看。':step.instruction,step:Math.min(index+1,steps.length),total:steps.length,complete,found:!!target},location.origin);
  if(!playing||document.hidden||complete){cursor.style.display='none';return;}
  if(attempted&&step.done()){index++;attempted=false;due=Date.now()+2200;return;}
  if(!target||Date.now()<due||clickPending)return;
  target.scrollIntoView({block:'nearest'});const r=target.getBoundingClientRect();cursor.style.display='block';cursor.style.transform=`translate(${r.left+r.width*.5}px,${r.top+r.height*.5}px)`;
  clickPending=true;setTimeout(()=>{clickPending=false;if(!playing||document.hidden)return;target.click();attempted=true;due=Date.now()+3000;},750);
 },350);
})();
