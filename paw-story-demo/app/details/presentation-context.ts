import {world,worldMemoryStats} from '../../../showcase/world';
import type {PresentationDeck} from './presentation-types';
const evidence={label:'跨日来源与治理样例 · synthetic',href:'/evidence/world.v2.json'};
const source=(id:string)=>world.datasets.memory.sources.find(item=>item.id===id)!;
export const contextDeck:PresentationDeck={
 id:'context',title:'记忆、知识与上下文',summary:'稳定输入、生命周期治理、按范围检索与来源回溯。',
 slides:[
  {id:'context-owners',title:'三类上下文，三个事实来源',takeaway:'项目状态、参考资料与长期记忆分别维护。',
   visual:{kind:'layers',nodes:[{label:'项目文档',detail:'目标、已接受决定、接口与交付状态'},{label:'Knowledge',detail:'可检索文档、版本、段落与原文来源'},{label:'Memory',detail:'有授权的偏好、纠正关系与有效期'}],caption:'本轮上下文按当前任务与读取范围组装。'},
   notes:[source('source-034').text,'项目文档维护项目事实；Knowledge 为资料原文与检索索引；Memory 维护可用条目与来源。三个 owner 的结果在当前 Session 的上下文中汇合。'],sources:[evidence]},
  {id:'context-capture',title:'输入阶段与稳定历史',takeaway:`${worldMemoryStats.sampleCount} 条合成来源；${worldMemoryStats.committedCount} 条稳定提交，${worldMemoryStats.excludedPhaseCount} 条中间态。`,
   visual:{kind:'flow',nodes:[{label:'应用输入',detail:'Writer、Chat、Browser、Voice 等来源'},{label:'阶段判定',detail:'committed 与 composition / draft / partial 分开'},{label:'稳定历史',detail:'保留提交时间、应用、项目与完整文本'},{label:'治理入口',detail:'核对授权、保留范围与纠正关系'}],caption:'组合态、草稿与语音中间结果不进入稳定输入历史。'},
   notes:['来源分母为 world.datasets.memory.sources：64 条；58 committed、1 composition、3 draft、2 partial。','公开演示 preview-history-routes.ts 使用原始 sourceTime；Voice 的稳定提交保留 voice 来源。这里是数据投影检查，未测真实输入法前台捕获。'],sources:[evidence]},
  {id:'context-lifecycle',title:'保留、纠正与撤销',takeaway:'来源继续可查，失效内容从当前记忆集合移除。',
   visual:{kind:'contrast',before:{label:'原始来源',lines:['source-002：主页先试深色','source-012：课程读到第 4 节','source-029：允许保留昵称']},after:{label:'后续治理',lines:['source-003：纠正为白色 / 冷灰','source-042：更新课程进度','source-028：撤销昵称保留许可']},caption:'再次处理旧来源不会复活已撤销或被替代的条目。'},
   notes:[source('source-003').text,source('source-042').text,source('source-028').text,'离线 App 持久化被替代/撤销来源状态；Undo 同时恢复集合与失效关系。当前原生 corpus 仅投影有效条目，保留旧来源供核对。'],sources:[evidence]},
  {id:'context-retrieval',title:'范围过滤先于检索排序',takeaway:'当前项目、授权与有效状态决定可用候选集。',
   visual:{kind:'flow',nodes:[{label:'问题与范围',detail:'当前 Session / Room、项目与可见 owner'},{label:'候选过滤',detail:'active、授权、有效期与撤销状态'},{label:'检索与排序',detail:'词法 / 向量 / 相关性与上下文预算'},{label:'来源片段',detail:'正文、来源 ID、应用与时间'}],caption:'相关性分数只在获准候选中比较。'},
   notes:[source('source-051').text,'当前 PAW 调用链：SessionMemoryRecallBuilder.build → HybridRagQuery → retrieve_hybrid_rag_candidates → _active_docs。SQL 先限定 active、project/app、owner 与 scope，再进行有界检索。','代价：隐含的跨项目背景可能被过滤；需要显式补充范围。不能由相似度高低推出答案正确率。'],sources:[evidence,{label:'上下文来源与治理资料',href:'/evidence/agents/paw-runtime-ownership.svg'}]},
  {id:'context-recovery',title:'压缩恢复保留目标与来源',takeaway:'恢复胶囊承接进度；本轮召回继续受生命周期约束。',
   visual:{kind:'layers',nodes:[{label:'稳定指令',detail:'系统角色、项目规则与工具定义'},{label:'恢复胶囊',detail:'原目标、已接受决定、未完成项与下一步'},{label:'当前问题',detail:'最近对话与本轮用户输入'},{label:'有界来源',detail:'仅追加当前有效、相关且可读取的记忆'}],caption:'已撤销条目不会因旧摘要或压缩恢复重新成为当前认识。'},
   notes:[source('source-041').text,'上下文检查器提供轮次、最终消息、工具与来源片段。公开回放的 token 字段是合成运行字段，不能视为生产成本或质量结果。','原始历史、压缩恢复材料与最终发送消息分别保留来源关系。'],sources:[evidence]},
  {id:'context-native',title:'Memory 来源回溯',takeaway:'主题 → 当前认识 → 输入依据 → 原始文本与时间。',
   visual:{kind:'native',id:'memory',route:'/memory',title:'真实 PAW Memory 工作区'},
   notes:['使用真实 PAW Memory 与 History 前端，输入为公开合成数据。自动流程从“PAW · 写入、登记与恢复”主题回到 source-001 的原始输入。','业务规则、刷新恢复与回放经过离线验证；真实个人记忆长期有效性未测。'],sources:[evidence]}
 ]
};
