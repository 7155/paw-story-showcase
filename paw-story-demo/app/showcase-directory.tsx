import { ArrowRight, Users, Search, GitCompareArrows, FlaskConical, Brain, Keyboard, Layers3, AppWindow } from 'lucide-react';

export const showcaseChapters = [
  { id: 'agents', title: '协作', action: '看 Agent 怎样分工', hint: '从 3D 星球展开工作窗口，查看四条线的交接、合同和待复验问题。', href: '/details/agents', Icon: Users },
  { id: 'reliability', title: '诊断', action: '找到失败的原因', hint: '选择事故，开始诊断，再打开报告查看依据。', href: '/details/sandbox', Icon: Search },
  { id: 'improvement', title: '改进', action: '检查候选与实验', hint: '重放登记失败，冻结八项条件，比较候选并检查具体差异。', href: '/details/sandbox', Icon: GitCompareArrows },
  { id: 'lab', title: 'Lab', action: '把数据做成 App', hint: '客户、知识、运维和记忆：导入完整材料，逐题检查，再试用与导出。', href: '/lab', Icon: FlaskConical },
  { id: 'apps', title: '应用', action: '试用交付的应用', hint: '深度研究、云上故障诊断、企业交付与记忆整理，打开并下载实验后的应用。', href: '/apps', Icon: AppWindow },
  { id: 'memory', title: '记忆', action: '让下一次接着做', hint: '查看保存的决定，再带着来源把它找回来。', href: '/details/context', Icon: Brain },
  { id: 'input', title: '输入', action: '管理词条与撤销', hint: '打开 Input Studio 的功能页，查看词库、输入记录与语音。', href: '/details/input', Icon: Keyboard },
  { id: 'framework-overview', title: '上下文', action: '检查运行上下文', hint: '在真实上下文检查器中，查看输入来源与本轮组装结果。', href: '/details/frontend', Icon: Layers3 },
];

export function ShowcaseDirectory({ current = 'agents' }: { current?: string }) {
  return <nav className="showcase-directory guided-directory" aria-label="选择演示阶段">
    {showcaseChapters.map((item,index) => <a key={item.id} href={`#${item.id}`} aria-current={current === item.id ? 'step' : undefined}>
      <span className="guided-step-icon"><item.Icon size={20}/></span><span className="guided-step-name"><strong>{item.title}</strong><small>{item.action}</small></span><ArrowRight className="guided-step-arrow" size={16}/><span className="sr-only">第 {index+1} 阶段</span>
    </a>)}
  </nav>;
}
