"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import "./project-atlas.css";

const diagrams: { id: string; label: string; title: string; body: string; measured?: boolean }[] = [
  { id: "two-tracks", label: "两条主线", title: "个人持续工作，企业验证交付。", body: "个人侧组织复杂任务、上下文与后续工作；企业侧固定业务验收、比较候选，再形成 App。两边共用 Pi 执行基础。" },
  { id: "room-binding", label: "Room 协作", title: "先派发，再把真实回合绑定到共同任务。", body: "Room 保存 pending 身份，接受 Pi 回执后再关联 sessionTurn。迟到 ACK 不匹配时不能覆盖新的派发；公共事件不能按 Session 成员身份直接推断。" },
  { id: "context-delivery", label: "上下文", title: "保存过的信息，还要经过选择与送达。", body: "上下文先按状态、时间与预算选取，再为 delivery 预留。once 条目优先防重复，但预留后、发送前崩溃可能遗漏；不能承诺 exactly-once。" },
  { id: "trial-lifecycle", label: "实验执行", title: "实验先持久接受，再由工作线程执行。", body: "相同请求返回原任务，配置变化却复用身份会冲突。queued 经 claim 才进入 running；中断记录不会自动重新发起付费执行。" },
  { id: "eval-gates", label: "评测优化", title: "质量与证据先过门，成本随后比较。", body: "先看强模型基线，再看仅换模型，最后看配置适配。失败候选保留，缺失证据标为 unknown；通过当前验证不代表独立测试也通过。" },
  { id: "app-delivery", label: "App 交付", title: "选中的配置，还需要成为可验证的应用。", body: "现有 Extension App 候选绑定前端、Pi Package、Skill 与测试套件。源码校验和 sandbox 已有样例证据；通用独立 Web 导出与真实安装验收仍需分别证明。" },

  { id: "enterpriseops-stages", label: "企业操作：三阶段", title: "工具全成功，业务仍可能失败。", body: "同一组 3 任务、31 条 SQL 验收：Sol 31/31，Luna 只换模型 30/31，Prompt 适配后 31/31。先验收业务状态，再比较 Runtime 对账估算。", measured: true },
  { id: "enterpriseops-verifiers", label: "企业操作：逐条验收", title: "第三个任务，差的是第十五条验收。", body: "蓝色 1 表示通过，橙色 0 表示未通过，灰色表示没有该项。公开回执没有这条 SQL 的正文，不能把它编成具体字段故事。", measured: true },
  { id: "cloudops-cases", label: "CloudOps：逐题", title: "归属和机制分别改进，遗留错误仍然可见。", body: "Luna 适配后修复调度归属和一个性能案例；另一个性能案例的 FA/JRA 仍未通过。逐题图仅展示有记录的覆盖率、CA、FA、JRA。", measured: true },
  { id: "rag-retrieval", label: "RAG：检索", title: "检索更好，还要检查答案有没有用好证据。", body: "16 查询、14 配置的历史 Validation 中，混合检索加重排优于词面基准与强向量对照。排序指标不能直接变成最终问答准确率。", measured: true },
  { id: "rag-comparisons", label: "RAG：引用与标准", title: "模型适配和评分标准校准，是两种变化。", body: "上方是不同运行统一按 r6 评分；下方固定同一答案，离线改标准重评分，模型调用为零。r6 已观察候选，不能称独立隐藏测试。", measured: true },
  { id: "memory-tradeoffs", label: "Memory：模型配对", title: "成本降低，token 数反而增加。", body: "新 Pi 五例合成配对中，两模型聚合质量与恢复门通过。估算降低约 95.60%，总 token 却从 14,450 增到 15,078；与旧 CLI 实验分开。", measured: true },
  { id: "memory-rejected-compression", label: "Memory：失败候选", title: "输入变短，也可能不符合原成本合同。", body: "历史 JSON 压缩的输入减少 558、输出增加 67。质量门通过，但各用量类别不增加的合同未满足，所以拒绝。它不是新 Pi 配对的中间阶段。", measured: true },
];

export function ProjectAtlas() {
  const [selected, setSelected] = useState(0);
  const diagram = diagrams[selected];
  return <section className="project-atlas" id="project-atlas" aria-labelledby="project-atlas-title">
    <header><h2 id="project-atlas-title">从个人工作台，<br/>到企业场景应用。</h2><p>六张机制图串起协作与交付，七张真实数据图展开优化过程。选择一张查看，逐题失败和实验范围都保留。</p></header>
    <div className="project-atlas-controls" aria-label="选择项目图解">{diagrams.map((item, index) => <button type="button" key={item.id} aria-pressed={selected === index} onClick={() => setSelected(index)}>{item.label}</button>)}</div>
    <figure>
      <figcaption><h3>{diagram.title}</h3><p>{diagram.body}</p></figcaption>
      <a className="project-atlas-image" href={`/diagrams/course/${diagram.id}.svg`} target="_blank" rel="noreferrer" aria-label={`打开${diagram.label}原尺寸图`}>
        {/* SVG is an authored architecture diagram, with intrinsic dimensions for stable layout. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/diagrams/course/${diagram.id}.svg`} alt={`${diagram.label}：${diagram.body}`} width={diagram.measured ? 1200 : 1080} height={diagram.measured ? 860 : 810} loading="lazy"/>
      </a>
      <div className="project-atlas-links"><a href={`/diagrams/course/${diagram.id}.svg`} target="_blank" rel="noreferrer">放大查看<ArrowUpRight size={16}/></a>{diagram.measured ? <a href="/diagrams/course/vertical-figures.json" download>下载图表数据与来源</a> : <a href={`/diagrams/course/${diagram.id}.mmd`} download>下载 Mermaid 源图</a>}</div>
    </figure>
    <p className="project-atlas-note">图解基于 2026-09-05 源码与实验记录，不是实时运行。App 候选验证、安装和独立部署分别验收。</p>
  </section>;
}
