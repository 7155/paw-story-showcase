import { Button } from '@/components/primitives';
import type { JsonValue, ProjectReceipt } from '@/features/eval-lab/projects/types';
import type { ProjectView } from '@/features/eval-lab/projects/views';
import './lab-flow-controls.css';
export function OptimizationControls({busy,dirty,status,onSubmit,onNavigate}:{busy:boolean;dirty:boolean;status:Record<string,unknown>;onSubmit:(input:Record<string,JsonValue>)=>Promise<ProjectReceipt|undefined>;onNavigate:(view:Partial<ProjectView>)=>void}) {
 const open=(artifactId:string)=>onNavigate({page:'artifact',artifactId,guideOpen:false});
 const run=(operation:string,id:string)=>void onSubmit({operation}).then(receipt=>{if(receipt)open(id);});
 return <section className="lab-flow-controls" aria-label="写入与登记优化演示">
  <nav aria-label="优化证据"><button onClick={()=>open('repair-story')}>任务与失败</button><button onClick={()=>open('repair-cases')}>八项检查条件</button><button onClick={()=>open('repair-config')}>修改候选与条件</button><button disabled={!status.hasRun} onClick={()=>open('repair-file')}>文件前后状态</button><button disabled={!status.hasReport} onClick={()=>open('repair-checks')}>逐题差异与失败原因</button></nav>
  <div className="lab-flow-controls__actions">
   <Button disabled={busy||dirty} onClick={()=>run('optimization_original','repair-trace')}>重放原流程</Button>
   <Button disabled={busy||dirty} onClick={()=>run('optimization_freeze','repair-freeze')}>冻结检查条件</Button>
   <Button variant="primary" disabled={busy||dirty||!status.frozen} onClick={()=>run('optimization_compare','repair-compare')}>同条件比较候选</Button>
   <Button disabled={busy||dirty} onClick={()=>run('optimization_run','repair-trace')}>重放当前配置</Button>
   <Button disabled={busy||dirty||!status.canKeep} title={keepReason(busy,dirty,status)} onClick={()=>run('optimization_keep','repair-decision')}>采用当前候选</Button>
  </div>
  <p role="status">{dirty?'配置尚未保存，先保存再比较。':status.adopted?'已在当前冻结条件下选择候选；修改后需重新比较。':status.current?'本轮比较已生成，可打开逐题失败原因。':status.frozen?'检查条件已冻结。配置变化后，旧报告不能直接用于采用。':'先复现文件回滚，再冻结条件、比较候选。'} <span>离线模拟 · Provider 调用 0 · 费用、耗时与 Token 未测量</span></p>
 </section>;
}

function keepReason(busy:boolean,dirty:boolean,status:Record<string,unknown>):string|undefined {
 if(busy)return '当前命令仍在执行，等待回执后再决定。';
 if(dirty)return '配置尚未保存；旧比较报告不能作为当前采用依据。';
 if(status.canKeep)return undefined;
 if(status.current&&status.selected==='cheap')return '当前选择是候选 A，仅通过 4 / 8；候选 B 的结果不能替 A 授权。';
 if(!status.current)return '当前保存配置尚无匹配的比较报告，请重新比较。';
 return '当前候选没有通过全部八项质量硬门槛。';
}
