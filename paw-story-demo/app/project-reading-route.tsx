import { ArrowDown, ArrowUpRight } from "lucide-react";
import "./project-reading-route.css";

const choices = [
  {
    title: "多 Agent，怎样完成同一件事？",
    answer: "Room 组织分工、交接与汇总，Pi Session 负责模型与工具执行。协作层需要知道谁负责、交付在哪里、什么时候结束。",
    tradeoff: "复用 Session 能减少重复状态；代价是必须处理派发确认、迟到事件与取消传播，不能只把多个聊天窗口放在一起。",
    demo: "#agents", detail: "/details/agents#decision-guide", label: "操作 Room",
  },
  {
    title: "改了一次，怎样知道真的更好？",
    answer: "先固定任务和验收条件，再比较基线、仅换模型和 Prompt 适配。质量通过后才比较成本，失败的候选也保留。",
    tradeoff: "固定验证题方便定位问题，却可能让优化适应这些题。验证集通过仍需独立检验，单轮结果也不能代表长期稳定收益。",
    demo: "#improvement", detail: "/details/sandbox#decision-guide", label: "比较候选",
  },
  {
    title: "下一次工作，怎样接上已有结果？",
    answer: "保留有来源的事实和产物引用，在新任务中按范围召回。存下了什么、检索到什么和本轮真正使用什么，需要分别解释。",
    tradeoff: "治理与检索能控制上下文，但增加了更新、失效与来源核对的成本。检索命中并不自动等于回答正确。",
    demo: "#memory", detail: "/details/context#decision-guide", label: "操作 Memory",
  },
];

export function ProjectReadingRoute() {
  return <section className="project-reading-route" id="project-overview" aria-labelledby="project-reading-title">
    <header><h2 id="project-reading-title">先看三个设计选择，<br/>再进入实际工作台。</h2><p>从协作如何发生，到改进如何验证，再到结果如何被下一次使用。每一条都可以继续展开实现与证据。</p></header>
    <div className="project-reading-choices">{choices.map(choice => <details key={choice.title}>
      <summary>{choice.title}<ArrowDown size={19} aria-hidden="true"/></summary>
      <div className="project-reading-answer"><p>{choice.answer}</p><p><strong>取舍</strong>　{choice.tradeoff}</p><nav aria-label={choice.title}><a href={choice.demo}>{choice.label}<ArrowDown size={16}/></a><a href={choice.detail}>读设计与证据<ArrowUpRight size={16}/></a></nav></div>
    </details>)}</div>
    <p className="project-reading-evidence">下方工作台使用真实前端与合成演示数据；实验结果来自单独的运行记录。两者分别说明交互与验证结论。</p>
  </section>;
}
