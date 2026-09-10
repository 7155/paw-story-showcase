import { evaluateRepairSuite, repairCases, repairVariants, runRepairReplay, type RepairFault, type RepairVariant } from '../../../showcase/optimization';
import { object, type LabArtifact, type LabProject } from '@/features/eval-lab/projects/types';
export const OPTIMIZATION_PROJECT_ID='lab-showcase-repair';
type Publish=(project:LabProject,value:Omit<LabArtifact,'revision'|'createdAtMs'|'updatedAtMs'|'templateRef'|'actions'>)=>LabArtifact;
export class PreviewOptimizationProject {
 private supportedMaterialContents='';
 private conditions(project:LabProject){return `${project.materialSetId}:${project.artifacts.find(a=>a.artifactId==='repair-cases')?.revision}`;}
 private updated(project:LabProject,id:string){return project.artifacts.find(a=>a.artifactId===id)?.updatedAtMs??0;}
 private isFrozen(project:LabProject){const frozen=this.updated(project,'repair-freeze');return frozen>=this.updated(project,'repair-cases')&&frozen>=(project.materialSet.createdAtMs??0);}
 private isCurrent(project:LabProject){const compared=this.updated(project,'repair-compare');return this.isFrozen(project)&&compared>=this.updated(project,'repair-config')&&compared>=this.updated(project,'repair-freeze');}
 private materialContents(project:LabProject){return JSON.stringify(project.materialSet.materials.map(({title,text})=>({title,text})));}
 private assertSupportedInputs(project:LabProject,read:(id:string)=>LabArtifact|undefined){
  if(this.materialContents(project)!==this.supportedMaterialContents)throw new Error('当前优化演示只执行内置模拟材料；新增或修改的材料不会进入执行器。请恢复初始材料后再冻结或重放。');
  const content=object(read('repair-cases')?.content);const rows=Array.isArray(content.rows)?content.rows.map(object):[];
  const supported=rows.length===repairCases.length&&new Set(rows.map(row=>row.id)).size===repairCases.length&&rows.every(row=>{
   const original=repairCases.find(item=>item.id===row.id);
   return original&&Object.keys(row).length===Object.keys(original).length&&Object.entries(original).every(([key,value])=>row[key]===value);
  });
  if(!supported)throw new Error('当前优化演示只支持内置八项故障及固定检查标准；已编辑的题目不会进入执行器。请恢复内置题目后再冻结或重放。');
 }
 status(project:LabProject,read:(id:string)=>LabArtifact|undefined){
  const config=object(object(read('repair-config')?.content).values);const selected=repairVariants.find(v=>v.name===config.variant)?.id??'repaired';
  const frozen=this.isFrozen(project);const current=this.isCurrent(project);
  const adopted=current&&this.updated(project,'repair-decision')>=this.updated(project,'repair-compare');
  return {hasRun:project.artifacts.some(a=>a.artifactId==='repair-file'),hasReport:project.artifacts.some(a=>a.artifactId==='repair-checks'),frozen,current,canKeep:current&&evaluateRepairSuite(selected).decision==='keep',adopted,selected};
 }
 initialize(project:LabProject,put:Publish){
  this.supportedMaterialContents=this.materialContents(project);
  put(project,{artifactId:'repair-story',title:'任务与失败现象',kind:'brief',view:'markdown',summary:'同一份工作事件合同，从失败到重新交付',content:'# 合同写好了，为什么 OS 找不到？\n\n输入与 Memory 已交付接口，协作 Agent 保存 `demo/0.9.2/work-events.md`。写入成功后，辅助登记服务返回 503。旧流程把异常当成整体失败，恢复了写入前的文件。OS 无法读取合同，后续窗口投影因此受阻。\n\n## 本轮要回答\n\n1. 内容没有生成、文件写入失败，还是登记后的补偿误删了文件？\n2. 只删除回滚能否解决未知回执和重复执行？\n3. 修复是否保住正常路径，也处理旧版本、取消和真实写入失败？\n\n先重放原流程，打开每一步的输入与结果；再冻结八种条件、比较候选。结论依据模拟工作区的最终内容、revision 和计数，不依据 Agent 的自我总结。\n\n公开合成、离线执行。没有调用模型或修改真实工作区。'});
  put(project,{artifactId:'repair-config',title:'候选与故障条件',kind:'configuration',view:'form',summary:'修改后需要重新比较，旧报告继续保留',content:{fields:[{key:'variant',label:'拟采用的候选',type:'select',required:true,options:repairVariants.map(v=>v.name)},{key:'fault',label:'单题检查条件',type:'select',required:true,options:repairCases.map(c=>c.title)}],values:{variant:repairVariants[2].name,fault:repairCases[0].title},description:'候选 A 省去部分回读步骤；候选 B 保留独立回执与恢复路径。质量硬门槛先于成本；本页没有真实费用、耗时或 Token 测量。保存修改后旧报告失效，需要重新比较。'}});
  put(project,{artifactId:'repair-cases',title:'八项复测条件',kind:'evaluation',view:'table',summary:'故障、预期结果、复查方式均可核对',content:{columns:[{key:'title',label:'条件'},{key:'trigger',label:'发生了什么'},{key:'expected',label:'应该保留的业务事实'},{key:'followUp',label:'怎样复查'}],rows:repairCases.map(c=>({...c})),caption:'八道公开合成故障题；预期写在独立检查中，执行器按实际状态判定。'}});
  project.workspace.artifactOrder=['repair-story','repair-config','repair-cases'];project.workspace.primaryArtifactId='repair-story';project.workspace.layout='focus';
 }
 command(project:LabProject,input:Record<string,unknown>,put:Publish,read:(id:string)=>LabArtifact|undefined){
  const op=String(input.operation);const config=object(object(read('repair-config')?.content).values);
  const selected=repairVariants.find(v=>v.name===config.variant)?.id;
  const fault=repairCases.find(c=>c.title===config.fault)?.id;
  if(!selected||!fault)throw new Error('请选择当前支持的候选和故障条件，再保存配置。');
  if(op==='optimization_freeze') {this.assertSupportedInputs(project,read);return put(project,{artifactId:'repair-freeze',title:'已冻结检查条件',kind:'evidence',view:'markdown',summary:'八项内置条件已冻结，可以执行同条件比较',content:`# 已冻结 8 项内置检查条件\n\n材料版本：${project.materialSetId}\n\n实际执行内置模拟文件与八项故障，逐题核对有效文件、业务写入次数、登记次数、回执状态和恢复路径。\n\n此演示不执行自定义材料或改写的检查标准；恢复初始材料和内置题目后可以重新冻结。候选配置变化后需要重新比较。`});}
  if(op==='optimization_original'||op==='optimization_run') {
   this.assertSupportedInputs(project,read);
   const variant:RepairVariant=op==='optimization_original'?'baseline':selected;
   const result=runRepairReplay(variant,op==='optimization_original'?'registration-503':fault as RepairFault);
   put(project,{artifactId:'repair-file',title:'文件前后状态',kind:'evidence',view:'markdown',summary:`${result.outcome} · 业务写入 ${result.writeCount} 次`,content:`# 文件前后状态\n\n条件：${result.fault} · 候选：${result.variant}\n\n## 写入前\n\n\`\`\`markdown\n${result.before.content}\n\`\`\`\n\n## 执行后\n\n\`\`\`markdown\n${result.after.content}\n\`\`\`\n\nrevision ${result.before.revision} → ${result.after.revision}\n\n文件回执 ${result.fileReceipt} / 登记回执 ${result.documentReceipt}\n\n${result.checks.map(c=>`- ${c.passed?'通过':'失败'}：${c.label} — ${c.observed}`).join('\n')}\n\n业务写入 ${result.writeCount} 次；登记 ${result.registrationCount} 次；恢复：${result.recovery}。`});
   return put(project,{artifactId:'repair-trace',title:'当前重放 Trace',kind:'evidence',view:'table',summary:`${result.passed?'通过':'未通过'} · ${result.events.length} 个实际模拟步骤`,content:{columns:[{key:'order',label:'顺序'},{key:'tool',label:'操作'},{key:'phase',label:'结果'},{key:'summary',label:'解释'},{key:'input',label:'输入'},{key:'output',label:'回读与回执'}],rows:result.events.map((e,i)=>({...e,order:i+1,input:JSON.stringify(e.input),output:JSON.stringify(e.output)})),caption:'步骤由离线模拟执行器生成。请打开“文件前后状态”核对实际内容，不能只看最后一条成功消息。'}});
  }
  if(op==='optimization_compare') {
   if(!this.isFrozen(project))throw new Error('请先冻结当前材料与八项检查条件。');
   this.assertSupportedInputs(project,read);
   const suites=repairVariants.map(v=>evaluateRepairSuite(v.id));
   put(project,{artifactId:'repair-checks',title:'逐题差异与失败原因',kind:'evaluation',view:'table',summary:'逐题对照三个候选的文件、计数、回执和恢复行为',content:{columns:[{key:'case',label:'复测条件'},{key:'baseline',label:'原流程'},{key:'cheap',label:'候选 A'},{key:'repaired',label:'候选 B'},{key:'difference',label:'具体差异'}],rows:repairCases.map((c,i)=>({case:c.title,baseline:suites[0].runs[i].passed?'通过':'失败',cheap:suites[1].runs[i].passed?'通过':'失败',repaired:suites[2].runs[i].passed?'通过':'失败',difference:suites.map((s,j)=>`${repairVariants[j].name}：${s.runs[i].checks.filter(k=>!k.passed).map(k=>`${k.label}（${k.observed}）`).join('；')||'检查全部通过'}`).join('\n')})),caption:'每列使用相同八种条件、相同初始文件与判定函数。没有修改 Gold 来提高候选得分。'}});
   return put(project,{artifactId:'repair-compare',title:'同条件候选比较',kind:'evaluation',view:'table',summary:suites.map((s,i)=>`${repairVariants[i].name} ${s.passed}/${s.total}`).join(" · "),content:{columns:[{key:'candidate',label:'候选'},{key:'change',label:'改了什么'},{key:'quality',label:'任务与恢复门槛'},{key:'decision',label:'本轮判定'},{key:'cost',label:'真实费用 / 耗时 / Token'},{key:'boundary',label:'适用边界'}],rows:suites.map((s,i)=>({candidate:repairVariants[i].name,change:repairVariants[i].change,quality:`${s.passed}/${s.total}`,decision:s.decision.toUpperCase(),cost:'未测量',boundary:repairVariants[i].risk})),caption:'每题的文件事实、业务写入次数、登记次数、回执真实性和恢复路径五项必须全部满足。质量失败不能由平均分或成本抵消；本页没有 Provider usage、真实延迟或生产节省数据。'}});
  }
  if(op==='optimization_keep') {
   if(!this.isCurrent(project))throw new Error('当前条件或配置已变化；旧报告可查看，但不能作为当前采用依据。请重新比较。');
   const suite=evaluateRepairSuite(selected);if(suite.decision!=='keep')throw new Error(`当前候选仅通过 ${suite.passed}/${suite.total}，仍有失败项，不能采用。`);
   return put(project,{artifactId:'repair-decision',title:'候选采用回执',kind:'evidence',view:'markdown',summary:'候选 B 已在当前冻结条件下选用',content:`# 已选择 ${repairVariants.find(v=>v.id===selected)!.name}\n\n回执：adoption-page03-b-001\n\n当前八项合成复测全部通过。原流程及候选 A 的失败报告保留，不覆盖历史。第二页已接受的 profile-trace-demo-b2 保持不变，本页不重复应用或回退它。\n\n## 采用范围\n\n仅本演示的写入／登记材料与当前配置。第二页 12 项流程复验和本页 8 项故障对照保持独立分母。未修改真实 Pi/PAW 源码，未证明真实文件并发、网络时序、Provider 质量或生产成本。\n\n## 下一次遇到登记失败\n\n先回读文件与 operationId；保留有效内容，只恢复辅助登记。未知回执仍需核对。\n\n## 变更之后\n\n修改材料、检查条件或已保存配置后，此回执不再代表新版本的验证。`});
  }
  throw new Error('不支持的优化演示操作。');
 }
}
