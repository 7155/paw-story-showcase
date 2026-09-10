import type { LabKey } from '../../../showcase/lab-evidence';
import researchSources from './lab-page04-research-sources.json';

export type Page04Run = { id: string; label: string; passed: number; total: number; note: string };
export type Page04Trial = { id: string; prompt: string; status: 'supported_by_excerpts' | 'missing_answer_despite_hits' | 'no_hit' | 'passed'; result: string };
export type Page04Scenario = {
  key: LabKey; title: string; task: string; materials: { id: string; title: string; text: string }[];
  intake: { total: number; accepted: number; exclusions: { kind: 'duplicate' | 'parse_failed' | 'cross_project' | 'superseded' | 'evaluation_only'; label: string; reason: string }[] };
  runs: Page04Run[]; trials: Page04Trial[]; requiredSourceCount?: number;
  citationAudit: { claim: string; claimSupported: boolean; finding: string };
  delivery: { appId: string; version: number; generated: boolean; downloaded: boolean; productionDeployed: boolean; exportReceiptId?: string };
};

const researchMaterials = researchSources.map(({ id, title, text }) => ({ id, title, text }));

const exclusions: Page04Scenario['intake']['exclusions'] = [
  { kind: 'duplicate', label: '重复文件', reason: '内容 hash 相同，只保留别名，不增加来源数。' },
  { kind: 'parse_failed', label: '未解析扫描页', reason: '没有文本层且本轮未配置 OCR，不能声称已读取。' },
  { kind: 'cross_project', label: '跨项目资料', reason: '不属于 project:harbor 授权范围，正文不进入语料。' },
  { kind: 'superseded', label: '过期版本', reason: 'mock-v2 已生效，旧版只留审计。' },
  { kind: 'evaluation_only', label: '评分标签', reason: 'expectedSourceIds 只供评分，不能成为检索输入。' },
];

const scenario = (value: Omit<Page04Scenario, 'delivery'> & { delivery: Pick<Page04Scenario['delivery'], 'appId'> }): Page04Scenario => ({
  ...value, delivery: { ...value.delivery, version: 1, generated: false, downloaded: false, productionDeployed: false },
});

export const labPage04: Record<LabKey, Page04Scenario> = {
  rag: scenario({ key: 'rag', title: '海岚服务台 · 可追溯交接研究助手', task: '从获准材料中回答交接规则，逐条保留引用，并明确资料没有回答的内容。',
    materials: researchMaterials, intake: { total: 15, accepted: 10, exclusions }, requiredSourceCount: 25,
    runs: [
      { id: 'eval-page04-rag-base', label: '原版基线 · 900 字', passed: 8, total: 16, note: 'Recall@4 73.4375% · 必需来源全齐' },
      { id: 'eval-page04-rag-a', label: '候选 A · 600 字', passed: 11, total: 16, note: 'Recall@4 82.8125% · 必需来源全齐' },
      { id: 'eval-page04-rag-b', label: '候选 B · 1800 字', passed: 16, total: 16, note: 'Recall@4 100% · 必需来源全齐' },
    ],
    citationAudit: { claim: '16 题来源全齐，所以可以生产上线。', claimSupported: false, finding: '引用只支持本地演示交付，没有生产安全、上线日期或可用性保证。' },
    trials: [
      { id: 'trial-rag-01', prompt: '交接申请和负责人分别需要满足什么条件？', status: 'supported_by_excerpts', result: '返回申请资格与负责人约束，并可回跳原文。' },
      { id: 'trial-rag-02', prompt: '负责人恰好满载时呢？', status: 'supported_by_excerpts', result: 'activeLoad 等于 capacity 已满载，拒绝交接。' },
      { id: 'trial-rag-03', prompt: '海岚生产版本哪一天上线？', status: 'missing_answer_despite_hits', result: '找到交付范围材料，但材料没有上线日期；回答“未记录”。' },
      { id: 'trial-rag-04', prompt: '火星仓库量子结算费率是多少？', status: 'no_hit', result: '没有相关来源，请补充资料或更换问题。' },
    ], delivery: { appId: 'app-page04-rag' } }),
  cloudops: scenario({ key: 'cloudops', title: '云上故障诊断', task: '区分单异常、多重独立异常和证据不足。', materials: [], intake: { total: 6, accepted: 6, exclusions: [] },
    runs: [
      { id: 'eval-page04-cloudops-base', label: '固定猜 worker', passed: 1, total: 6, note: '只返回一个组件' },
      { id: 'eval-page04-cloudops-a', label: '候选 A · 观测定位', passed: 5, total: 6, note: '双异常时遗漏 database' },
      { id: 'eval-page04-cloudops-b', label: '候选 B · 多异常识别', passed: 6, total: 6, note: '保留 multiple 与 unknown' },
    ], citationAudit: { claim: '有告警就能唯一定位一个组件。', claimSupported: false, finding: '双异常必须保留多个组件；证据不足必须返回 unknown。' },
    trials: [{ id: 'trial-cloudops-04', prompt: 'alert-04', status: 'passed', result: 'multiple：gateway、database' }, { id: 'trial-cloudops-05', prompt: 'alert-05', status: 'passed', result: 'unknown：证据不足' }], delivery: { appId: 'app-page04-cloudops' } }),
  enterpriseops: scenario({ key: 'enterpriseops', title: '企业交付', task: '按角色、任期、冻结、地区、资质和容量完成负责人筛选。', materials: [], intake: { total: 6, accepted: 6, exclusions: [] },
    runs: [
      { id: 'eval-page04-enterpriseops-base', label: '只按负载与任期', passed: 4, total: 6, note: '低负载会掩盖硬约束' },
      { id: 'eval-page04-enterpriseops-a', label: '候选 A · 完整交接约束', passed: 6, total: 6, note: '六项硬约束全部检查' },
    ], citationAudit: { claim: '负载最低的负责人应该优先采用。', claimSupported: false, finding: '角色、任期、冻结、地区、资质和容量任何一项失败都不可采用。' },
    trials: [{ id: 'trial-enterpriseops-01', prompt: 'customer-01', status: 'passed', result: '允许；保留 revision、在途工单与回访。' }, { id: 'trial-enterpriseops-02', prompt: 'customer-02', status: 'passed', result: '拒绝；原负责人保持不变。' }], delivery: { appId: 'app-page04-enterpriseops' } }),
  memory: scenario({ key: 'memory', title: '记忆整理', task: '区分保留、合并、纠正、撤销与拒记。', materials: [], intake: { total: 6, accepted: 6, exclusions: [] },
    runs: [
      { id: 'eval-page04-memory-base', label: '全部保留', passed: 1, total: 6, note: '忽略生命周期' },
      { id: 'eval-page04-memory-a', label: '候选 A · 长期信息过滤', passed: 3, total: 6, note: '仍遗漏关联变更' },
      { id: 'eval-page04-memory-b', label: '候选 B · 关联与变更治理', passed: 6, total: 6, note: '覆盖合并、纠正和撤销' },
    ], citationAudit: { claim: '输入出现过就应该写入长期记忆。', claimSupported: false, finding: '临时内容和未提交片段拒记；纠正与撤销必须保留关系。' },
    trials: [{ id: 'trial-memory-04', prompt: 'mem-04', status: 'passed', result: '撤销，并关联原记忆。' }, { id: 'trial-memory-06', prompt: 'mem-06', status: 'passed', result: '未提交片段，不保留。' }], delivery: { appId: 'app-page04-memory' } }),
};

export const labPage04ProjectId = (key: LabKey) => `lab-page04-${key}`;
export const labPage04Key = (projectId: string) => (Object.keys(labPage04) as LabKey[]).find((key) => labPage04ProjectId(key) === projectId);
