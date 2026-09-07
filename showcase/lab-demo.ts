import type { LabKey } from './lab-evidence';

export const labDemoScenarios: Record<LabKey, { title: string; task: string; inspect: string }> = {
  enterpriseops: {
    title: '企业业务工作流',
    task: '让 Agent 按角色、地区和任期约束完成业务操作，逐项核对最终业务状态。',
    inspect: '先看任务与约束，再打开候选矩阵，检查 3 个任务与 31 项业务验收。',
  },
  rag: {
    title: '企业知识问答',
    task: '从企业资料中检索证据，补齐事实缺口，让每项回答都有能回到原文的引用。',
    inspect: '查看引用质量和失败候选，并展开 candidate-aware 评审条件。',
  },
  cloudops: {
    title: '云故障诊断',
    task: '沿告警和观测证据定位故障，分别检查故障类别、负责组件与具体机制。',
    inspect: '比较 CA、FA 与 JRA，观察 Tool 执行可靠性是否真的带来诊断质量。',
  },
  memory: {
    title: '长期记忆整理',
    task: '从任务上下文中整理可保留的记忆，核对来源、生命周期、检索与回滚重放。',
    inspect: '查看 5 次整理决策和 6 个受治理 atom，检查只换模型后的记忆生命周期。',
  },
};

export const labDemoProjectId = (key: LabKey) => `lab-showcase-${key}`;
