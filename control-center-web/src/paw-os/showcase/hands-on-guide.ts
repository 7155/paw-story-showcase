export type GuideMatch = { selector: string; text?: string; exact?: boolean; enabled?: boolean };
export type GuideStep = { instruction: string; target: GuideMatch; after: GuideMatch };
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
    { instruction: '点击 System Monitor 的「Trace Agent」。', target: button('Trace Agent'), after: button('选择 Tool error · Workflow 事故') },
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
    { instruction: '打开「协作与交付」主题。', target: button('协作与交付', false), after: text('当前认识', 'h4') },
    { instruction: '展开「核对原始来源」。', target: button('核对原始来源', false), after: button('已清洗输入依据', false) },
    { instruction: '点击「已清洗输入依据」。', target: button('已清洗输入依据', false), after: button('在输入记录中打开原文') },
    { instruction: '点击「在输入记录中打开原文」。', target: button('在输入记录中打开原文'), after: { selector: '.history-detail__body', text: '伙伴需要明确的任务范围' } },
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
    target.click(); return true;
  }, destroy() { target?.classList.remove('paw-hands-on-target'); root.removeEventListener('click', onClick, true); } };
}
