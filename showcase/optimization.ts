export type RepairVariant = 'baseline' | 'cheap' | 'repaired';
export type RepairFault = 'registration-503' | 'unknown-write-receipt' | 'duplicate-submit' | 'stale-revision' | 'cancel-after-write' | 'registration-timeout' | 'write-failed' | 'clean';
export const repairVariants = [
 {id:'baseline',name:'原流程',change:'写入与登记放在同一个 try/catch；任一步异常就恢复写入前的文件。',risk:'辅助登记不可用时，已经成功保存的合同也会消失。'},
 {id:'cheap',name:'候选 A · 只忽略登记异常',change:'删除文件回滚；减少回读与恢复步骤。',risk:'文件虽然保住了，但未知回执与登记待办仍可能丢失；省步骤不能替代正确性。'},
 {id:'repaired',name:'候选 B · 分开业务与登记回执',change:'先核对写入结果；登记失败保留待办；同一操作重复执行时回读已有结果。',risk:'只证明这些合成故障下的文件、版本和回执行为，不证明真实并发或 Provider 性能。'},
] as const;
export const repairCases: {id:RepairFault;title:string;trigger:string;expected:string;followUp:string}[] = [
 {id:'registration-503',title:'文件写好了，登记服务返回 503',trigger:'协作 Agent 保存 work-events.md 后，辅助登记服务暂不可用。OS 按登记表查找合同，因此表面上像是“没有交付”。',expected:'有效文件保留；登记缺口进入可恢复待办；不重新生成合同。',followUp:'服务恢复后，只补登记。重放同一操作不能再改文件 revision。'},
 {id:'unknown-write-receipt',title:'写入完成，但响应在途中丢失',trigger:'workspace_write 已在模拟工作区落盘，客户端收不到写入回执。超时不能说明写入没发生。',expected:'先读取文件与操作标识。只有读到相同内容和操作标识才能确认，禁止直接重写。',followUp:'把同一操作再提交一次，检查写入计数仍然为 1。'},
 {id:'duplicate-submit',title:'用户连点两次“交付合同”',trigger:'同一个 operationId 携带相同内容到达两次。第二次可能来自界面重试或断线恢复。',expected:'回读第一次的结果，不新增业务写入或重复登记。',followUp:'核对 revision、写入次数和登记次数；不是只看“成功”文案。'},
 {id:'stale-revision',title:'计划过期，文件已被另一条工作线更新',trigger:'方案基于 revision=3，但当前文件已是 revision=4。旧请求不能覆盖别人刚交付的内容。',expected:'拒绝陈旧写入并保留 revision=4，指出需要重新读取。',followUp:'确认拒绝发生在写入前，外部更新没有被补偿逻辑回滚。'},
 {id:'cancel-after-write',title:'文件保存后，用户停止当前任务',trigger:'停止信号发生在业务写入与辅助登记之间。停止后不应继续补做动作，也不能撤销有效成果。',expected:'保留文件，停止后续动作，注明登记未完成；恢复需要显式继续。',followUp:'区分“停止执行”和“撤销交付”，不要把二者当成同一动作。'},
 {id:'registration-timeout',title:'登记成功，但确认回执未知',trigger:'登记记录实际存在，响应却超时。盲目重试会产生两个相同目录项。',expected:'按相同操作标识查询登记结果；查到原记录后确认，不能再建一份。',followUp:'观察回执未知→回读确认的状态变化，以及登记写入计数。'},
 {id:'write-failed',title:'磁盘写入在提交前失败',trigger:'模拟工作区拒绝这次写入，文件未改变。辅助登记没有启动条件。',expected:'保留原文件，报告业务失败，不创建“已交付”目录项。',followUp:'这才是业务写入失败，不能套用“保留新文件、补登记”的成功路径。'},
 {id:'clean',title:'没有故障的对照任务',trigger:'版本相符，写入与登记都正常返回。用于检查修复是否损坏原本正常的工作。',expected:'文件与登记一致，写入各一次，回执可确认。',followUp:'正常样本也要复测；只修坏样本不等于可以采用候选。'},
];
/** Self-contained virtual workspace. Exported demos execute this same function. */
export function runRepairReplay(variant:RepairVariant,fault:RepairFault) {
 const before={content:'# 工作事件合同 v1\n业务文件与登记曾放在同一事务中。',revision:3,operationId:'prior-op'};
 const afterContent='# 工作事件合同 v2\n业务写入结果与辅助登记分别报告；保留已成功写入的文件；未知回执先回读；相同操作不重复写入。';
 const operationId='demo-work-events-092';
 let file={...before},writeCount=0,registrationCount=0,registrationExists=false;
 let fileReceipt='not_started',documentReceipt='not_started',outcome='running',recovery='none',cancelled=false;
 const events:{id:string;tool:string;phase:string;input:Record<string,unknown>;output:Record<string,unknown>;summary:string}[]=[];
 const log=(tool:string,phase:string,summary:string,input:Record<string,unknown>={},output:Record<string,unknown>={})=>events.push({id:`${fault}:${variant}:${events.length+1}`,tool,phase,input,output,summary});
 log('workspace_read','confirmed','读取合同正文与 revision，为写入建立比较基准。',{path:'demo/0.9.2/work-events.md'},{...file});
 if(fault==='stale-revision')file={content:'# 另一条工作线已更新的合同',revision:4,operationId:'external-op'};
 const write=()=>{
  if(variant==='repaired'&&file.operationId===operationId){fileReceipt='confirmed';log('workspace_read','deduplicated','相同操作已经写入，回读原结果。',{operationId},{...file});return;}
  if(file.revision!==before.revision&&!(fault==='duplicate-submit'&&variant!=='repaired')){outcome='conflict';fileReceipt='rejected';log('revision_check','rejected','当前版本已变化，拒绝覆盖。',{expected:before.revision},{actual:file.revision});return;}
  if(fault==='write-failed'){fileReceipt='failed';outcome='failed';log('workspace_write','failed','提交前写入失败；原文件没有变化。',{operationId},{committed:false});return;}
  file={content:afterContent,revision:file.revision+1,operationId};writeCount++;fileReceipt=fault==='unknown-write-receipt'?'unknown':'confirmed';
  log('workspace_write',fileReceipt,'模拟工作区提交文件。',{operationId,expectedRevision:before.revision},{receipt:fileReceipt,...(fileReceipt==='confirmed'?{revision:file.revision}:{} )});
  if(fileReceipt==='unknown') {
   if(variant==='repaired'){log('workspace_read','confirmed','先回读内容与操作标识，再确认写入。',{operationId},{...file});fileReceipt='confirmed';}
   else if(variant==='baseline'){writeCount++;file={...file,revision:file.revision+1};fileReceipt='confirmed';log('workspace_write','retried','没有回读就再次写入，业务写入已重复。',{operationId},{revision:file.revision});}
  }
 };
 write();
 if(outcome==='running') {
  if(fault==='cancel-after-write') {
   cancelled=true;outcome='cancelled';documentReceipt='not_started';recovery='explicit_resume';log('cancel','stopped','用户停止；未再执行登记。',{}, {fileRetained:true});
   if(variant==='baseline'){file={...before};log('workspace_restore','compensated','旧停止路径恢复原文件，撤销了有效交付。');}
  } else {
   const register=()=>{
    if(variant==='repaired'&&registrationExists){documentReceipt='confirmed';log('document_read','deduplicated','按相同操作标识回读已有登记。',{operationId},{exists:true});return;}
    if(fault==='registration-503'){documentReceipt='failed';log('document_register','failed','辅助登记服务返回 503。',{operationId},{status:503});
     if(variant==='baseline'){file={...before};fileReceipt='rolled_back';outcome='failed';log('workspace_restore','compensated','旧 catch 把登记失败当成整体失败，撤销刚保存的文件。');}
     else if(variant==='cheap'){outcome='completed';log('ignore_error','unverified','忽略错误并显示完成；未留下登记待办。');}
     else {outcome='partial_success';recovery='registration_pending';log('recovery_enqueue','recorded','仅记录登记待办，保留业务文件。',{operationId},{retryBusinessWrite:false});}
     return;
    }
    registrationExists=true;registrationCount++;documentReceipt=fault==='registration-timeout'?'unknown':'confirmed';log('document_register',documentReceipt,'写入辅助目录项。',{operationId},{receipt:documentReceipt});
    if(documentReceipt==='unknown'&&variant==='repaired'){documentReceipt='confirmed';log('document_read','confirmed','回读找到已有目录项，确认原登记。',{operationId},{exists:true});}
    else if(documentReceipt==='unknown'&&variant==='baseline'){registrationCount++;documentReceipt='confirmed';log('document_register','retried','未回读就重复登记，出现第二个目录项。',{operationId},{count:registrationCount});}
   };
   register();
   if(fault==='duplicate-submit'){log('request','received_again','再次收到相同 operationId。',{operationId});write();register();}
   if(outcome==='running')outcome='completed';
  }
 }
 const shouldWrite=!['write-failed','stale-revision'].includes(fault);
 const preserved=shouldWrite?file.content===afterContent:fault==='stale-revision'?file.operationId==='external-op':file.content===before.content;
 const checks=[
  {id:'file',label:shouldWrite?'有效合同保留':'原文件未被覆盖',passed:preserved,observed:`revision=${file.revision} · ${file.operationId}`},
  {id:'write-once',label:'业务写入不重复',passed:writeCount===(shouldWrite?1:0),observed:`${writeCount} 次业务写入`},
  {id:'registration-once',label:'登记不重复或抢跑',passed:registrationCount<=1&&(!shouldWrite?registrationCount===0:true),observed:`${registrationCount} 次登记`},
  {id:'truthful-receipt',label:'未知回执不冒充成功',passed:outcome!=='completed'||fileReceipt==='confirmed'&&documentReceipt==='confirmed',observed:`文件 ${fileReceipt} / 登记 ${documentReceipt}`},
  {id:'recovery',label:'失败或停止后可继续',passed:fault==='registration-503'?recovery==='registration_pending':fault==='cancel-after-write'?cancelled&&recovery==='explicit_resume':true,observed:recovery},
 ];
 const inputTokens=Math.ceil((before.content+afterContent).length/2)+events.length*32,outputTokens=events.reduce((sum,e)=>sum+Math.ceil(e.summary.length/2),0);
 const rates=variant==='baseline'?{input:1,output:3}:{input:.25,output:.75};
 return {variant,fault,operationId,before,after:file,events,writeCount,registrationCount,fileReceipt,documentReceipt,outcome,recovery,checks,passed:checks.every(c=>c.passed),
  estimate:{kind:'fictional-demo-estimate',inputTokens,outputTokens,ratesPerMillion:rates,amount:(inputTokens*rates.input+outputTokens*rates.output)/1e6,currency:'USD',formula:'(估算输入 token × 虚构输入费率 + 估算输出 token × 虚构输出费率) / 1,000,000'},providerCalls:0};
}
export function evaluateRepairSuite(variant:RepairVariant) {
 const runs=repairCases.map(c=>runRepairReplay(variant,c.id));
 return {variant,runs,total:runs.length,passed:runs.filter(r=>r.passed).length,decision:runs.every(r=>r.passed)?'keep':'reject',estimate:runs.reduce((sum,r)=>sum+r.estimate.amount,0),dataMode:'synthetic-executable-replay',providerCalls:0};
}
