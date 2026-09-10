export type GuideMatch = { selector: string; text?: string; label?: string; value?: string; exact?: boolean; enabled?: boolean };
export type GuideStep = { instruction: string; target: GuideMatch; after: GuideMatch; action?: { type: 'select'; value: string } };
export type GuidePlan = { labels?: string[]; steps: GuideStep[]; completion: string };
const button = (text: string, exact = true): GuideMatch => ({ selector: 'button,summary,[role="tab"],input[type="checkbox"]', text, exact, enabled: true });
const text = (value: string, selector = 'h1,h2,h3,h4,p,strong,span'): GuideMatch => ({ selector, text: value });
export const handsOnPlans: Record<string, GuidePlan> = {
  agents: { labels: ['消息流', '完整记录', '汇总结果', '伙伴交付', '交付文件'], steps: [
    { instruction: '点击「消息流」，查看伙伴之间的任务交接。', target: button('消息流'), after: { selector: '[data-room-view="messages"][aria-pressed="true"]' } },
    { instruction: '点击「完整记录」，查看协作过程。', target: button('完整记录'), after: { selector: '[data-room-view="conversation"][aria-pressed="true"]' } },
    { instruction: '点击「对话与结果」，回到汇总与伙伴交付。', target: button('对话与结果'), after: { selector: '[data-room-view="rounds"][aria-pressed="true"]' } },
    { instruction: '点击 Mars「查看结果」。', target: button('Mars 实施 查看结果'), after: { selector: 'a', text: '打开文件 input-method-plan.md' } },
    { instruction: '点击 input-method-plan.md，打开交付文件。', target: { selector: 'a', text: '打开文件 input-method-plan.md' }, after: text('公开合成 Room 交付', '.paw-files-preview p,.paw-files-markdown p,p') },
  ], completion: '已从伙伴交付打开真实 Files 预览。' },
  reliability: { labels: ['诊断入口', '选择事故', '开始诊断', '查看报告'], steps: [
    { instruction: '点击「新建优化任务」，选择需要检查的工作记录。', target: button('新建优化任务'), after: button('选择 Tool error · Workflow 事故') },
    { instruction: '勾选「Tool error · Workflow 事故」。', target: button('选择 Tool error · Workflow 事故'), after: { selector: 'input[type="checkbox"][aria-label="选择 Tool error · Workflow 事故"]:checked' } },
    { instruction: '点击「开始诊断」。这里只处理公开合成案例。', target: button('开始诊断'), after: button('打开网页报告') },
    { instruction: '点击「打开网页报告」，查看诊断依据。', target: button('打开网页报告'), after: { selector: '.trace-audit', text: '公开合成' } },
  ], completion: '已打开真实报告组件；本轮没有执行模型推理或修复。' },
  improvement: { labels: ['选择实验', '实验设置', '检查结果'], steps: [
    { instruction: '点击「已有实验」。', target: button('已有实验'), after: button('设置实验') },
    { instruction: '点击「设置实验」，查看固定任务与基线。', target: button('设置实验'), after: text('本轮保持不变') },
    { instruction: '点击「检查结果」，核对候选与质量口径。', target: button('检查结果'), after: { selector: '[aria-label="当前实验结论"]' } },
  ], completion: '已通过真实实验界面查看设置与结果；未启动新模型实验。' },
  memory: { labels: ['选择主题', '核对来源', '输入依据', '查看原文'], steps: [
    { instruction: '打开「PAW · 写入、登记与恢复」主题。', target: button('PAW · 写入、登记与恢复', false), after: text('当前认识', 'h4') },
    { instruction: '展开「核对原始来源」。', target: button('核对原始来源', false), after: button('已清洗输入依据', false) },
    { instruction: '点击「已清洗输入依据」。', target: button('已清洗输入依据', false), after: button('在输入记录中打开原文') },
    { instruction: '点击「在输入记录中打开原文」。', target: button('在输入记录中打开原文'), after: { selector: '.history-detail__body', text: '文件已经写成功' } },
  ], completion: '已从主题回溯到原始输入详情。' },
  input: { labels: ['打开词库', '加入词条', '撤销更新'], steps: [
    { instruction: '点击 Input Studio 的「词库」。', target: button('词库'), after: button('加入所选词条') },
    { instruction: '点击「加入所选词条」，检查回执。', target: button('加入所选词条'), after: button('撤销这次更新') },
    { instruction: '点击「撤销这次更新」，检查撤销结果。', target: button('撤销这次更新'), after: text('词库更新已撤销') },
  ], completion: '已通过真实词库界面完成加入与撤销；操作仅作用于演示数据。' },
  'framework-overview': { labels: ['选择轮次', '展开指令', '导出报告'], steps: [
    { instruction: '选择「首轮装配」。', target: button('01 首轮装配', false), after: text('首轮装配', 'h2') },
    { instruction: '展开「系统指令」，查看本轮实际字段。', target: button('系统指令', false), after: text('You are the local RagIme coding agent.', 'pre,code') },
    { instruction: '点击「生成 HTML 报告」。', target: button('生成 HTML 报告'), after: { selector: 'a', text: '下载报告', exact: true } },
  ], completion: '已打开真实上下文报告，可继续查看或导出。' },
  optimization: { labels: ['重放失败', '冻结条件', '选择 A', '保存配置', '比较候选', '检查失败', '切换 B', '重新比较', '人工采用'], steps: [
    { instruction: '重放原流程，检查登记失败后的文件回滚。', target: button('重放原流程'), after: text('旧 catch 把登记失败当成整体失败', 'td') },
    { instruction: '冻结相同的八项故障与对照条件。', target: button('冻结检查条件'), after: button('同条件比较候选') },
    { instruction: '打开配置，先选择负对照候选 A。', target: button('修改候选与条件'), after: { selector: 'select', label: '拟采用的候选' } },
    { instruction: '选择候选 A，检查它为什么不能采用。', target: { selector: 'select', label: '拟采用的候选' }, action: { type: 'select', value: '候选 A · 只忽略登记异常' }, after: { selector: 'select', label: '拟采用的候选', value: '候选 A · 只忽略登记异常' } },
    { instruction: '保存 A 的配置；旧比较不会自动成为当前依据。', target: button('保存新版本'), after: button('同条件比较候选') },
    { instruction: '执行三个候选，并比较每项实际状态检查。', target: button('同条件比较候选'), after: text('同条件候选比较') },
    { instruction: '打开逐题差异，查看省步骤的候选为什么仍被拒绝。', target: button('逐题差异与失败原因'), after: text('具体差异', 'th') },
    { instruction: '回到配置，切换到八项全部通过的候选 B。', target: button('修改候选与条件'), after: { selector: 'select', label: '拟采用的候选', value: '候选 A · 只忽略登记异常' } },
    { instruction: '选择候选 B；保存后仍需针对当前签名重新比较。', target: { selector: 'select', label: '拟采用的候选' }, action: { type: 'select', value: '候选 B · 分开业务与登记回执' }, after: { selector: 'select', label: '拟采用的候选', value: '候选 B · 分开业务与登记回执' } },
    { instruction: '保存 B 的配置，旧报告继续保留但不再授权采用。', target: button('保存新版本'), after: button('同条件比较候选') },
    { instruction: '按当前 B 配置重新比较全部八项条件。', target: button('同条件比较候选'), after: text('候选 B · 分开业务与登记回执 8/8') },
    { instruction: '全部通过仍不等于已采用；点击后才生成采用回执。', target: button('采用当前候选'), after: text('adoption-page03-b-001') },
  ], completion: '已复现失败、验证 A 被拒绝、重新比较 B 并取得有范围的采用回执；这次没有调用模型。' },
  lab: { labels: ['导入数据', '运行测评', '生成 App', '导出 App'], steps: [
    { instruction: '点击「导入示例数据」。', target: button('导入示例数据'), after: button('运行演示测评') },
    { instruction: '点击「运行演示测评」，等待逐题结果。', target: button('运行演示测评'), after: button('生成 App') },
    { instruction: '点击「生成 App」，打开应用预览。', target: button('生成 App'), after: button('下载独立 App') },
    { instruction: '可以先在 App 中试用，再点击「下载独立 App」。', target: button('下载独立 App'), after: button('下载独立 App') },
  ], completion: '已点击导出。请检查浏览器保存结果；部分内置浏览器会阻止下载。' },
};

export function findGuideTarget(root: Document, match: GuideMatch): HTMLElement | undefined {
  return [...root.querySelectorAll<HTMLElement>(match.selector)].find(element => {
    if (element.closest('[hidden],[aria-hidden="true"],[inert]') || element.getBoundingClientRect().width === 0 || element.getBoundingClientRect().height === 0) return false;
    if (match.enabled && (element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true')) return false;
    if (match.value !== undefined && (element as HTMLInputElement).value !== match.value) return false;
    if (match.label) {
      const labels = 'labels' in element ? [...((element as HTMLInputElement).labels ?? [])].map(label => label.textContent || '') : [];
      if (!labels.some(value => value.replace(/\s+/g, '').includes(match.label!.replace(/\s+/g, '')))) return false;
    }
    if (!match.text) return true;
    const needle = match.text.replace(/\s+/g, '');
    const visibleCopy = element.cloneNode(true) as HTMLElement;
    visibleCopy.querySelectorAll('[aria-hidden="true"],svg').forEach(node => node.remove());
    return [element.getAttribute('aria-label'), element.getAttribute('title'), visibleCopy.textContent].some(value => { const candidate = (value || '').replace(/\s+/g, ''); return match.exact ? candidate === needle : candidate.includes(needle); });
  });
}

/** Advances only on a real control click and its rendered result. Automatic playback uses the same DOM controls. */
export function createHandsOnGuide(root: Document, plan: GuidePlan, publish: (state: { step: number; total: number; instruction: string; labels: string[]; found: boolean; complete: boolean }) => void) {
  let step = 0;
  let clicked = false;
  let target: HTMLElement | undefined;
  let previous = '';
  const refresh = (force = false) => {
    if (clicked && step < plan.steps.length && findGuideTarget(root, plan.steps[step].after)) { step++; clicked = false; }
    const next = step < plan.steps.length ? findGuideTarget(root, plan.steps[step].target) : undefined;
    if (target !== next) {
      target?.classList.remove('paw-hands-on-target');
      target = next;
      target?.classList.add('paw-hands-on-target');
      // Scroll only native containers; scrolling an iframe target into view can
      // also move the host page underneath its fixed navigation.
      if (target) for (let parent = target.parentElement; parent && parent !== root.documentElement; parent = parent.parentElement) {
        if (!/(auto|scroll)/.test(root.defaultView?.getComputedStyle(parent).overflowY || '') || parent.scrollHeight <= parent.clientHeight) continue;
        const item = target.getBoundingClientRect(); const bounds = parent.getBoundingClientRect();
        if (item.top < bounds.top) parent.scrollTop -= bounds.top - item.top;
        else if (item.bottom > bounds.bottom) parent.scrollTop += item.bottom - bounds.bottom;
      }
    }
    const state = { labels: plan.labels || plan.steps.map((_, index) => `步骤 ${index + 1}`), step: Math.min(step + 1, plan.steps.length), total: plan.steps.length, instruction: step < plan.steps.length ? plan.steps[step].instruction : plan.completion, found: Boolean(target), complete: step === plan.steps.length };
    const key = JSON.stringify(state);
    if (force || key !== previous) { previous = key; publish(state); }
  };
  const onClick = (event: MouseEvent) => { if (target && event.target instanceof Node && target.contains(event.target)) clicked = true; };
  root.addEventListener('click', onClick, true);
  return { refresh, clickCurrent() {
    if (!target || clicked || !findGuideTarget(root, plan.steps[step].target)) return false;
    const action = plan.steps[step].action;
    if (action?.type === 'select' && target instanceof HTMLSelectElement) {
      target.value = action.value;
      target.dispatchEvent(new Event('change', { bubbles: true }));
      clicked = true;
    } else target.click();
    return true;
  }, destroy() { target?.classList.remove('paw-hands-on-target'); root.removeEventListener('click', onClick, true); } };
}
