// Coordinates express preference only, never a measured rate or currency amount.
export type OptimizationGoals = { accuracyPriority: number; costFlexibility: number };
export const DEFAULT_OPTIMIZATION_GOALS: OptimizationGoals = { accuracyPriority: .7, costFlexibility: .5 };
export function normalizeGoals(input: unknown): OptimizationGoals {
  const candidate = input && typeof input === 'object' ? input as Partial<OptimizationGoals> : {};
  const coordinate = (key: keyof OptimizationGoals) => {
    const value = candidate[key];
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.min(1, Math.max(0, value)) * 100) / 100 : DEFAULT_OPTIMIZATION_GOALS[key];
  };
  return { accuracyPriority: coordinate('accuracyPriority'), costFlexibility: coordinate('costFlexibility') };
}
export function goalLabels(goals: OptimizationGoals) {
  const value = normalizeGoals(goals);
  return {
    accuracy: value.accuracyPriority >= .8 ? '严格要求' : value.accuracyPriority >= .4 ? '较高要求' : '满足基本需求',
    cost: value.costFlexibility < .34 ? '优先控制成本' : value.costFlexibility < .67 ? '按效果适度投入' : '接受更高投入',
  };
}
export function requirementWithGoals(requirement: string, goals: OptimizationGoals): string {
  const labels = goalLabels(goals);
  return [
    requirement.trim(), '', '优化偏好：', '- 准确率：' + labels.accuracy + '。', '- 成本：' + labels.cost + '。',
    '以上表达相对偏好，不设通用通过率、金额或延时上限。用户在需求中明确给出的数值约束仍须保留。先建立当前任务的基线，记录答案质量、模型用量和实际或估算费用，再在同一题集与任务范围内比较候选方案。按任务规模、资料长度和调用方式解释成本差异；费用未知时如实标注。根据测评结果说明取舍，必要时与用户确定具体标准。',
  ].join('\n');
}
