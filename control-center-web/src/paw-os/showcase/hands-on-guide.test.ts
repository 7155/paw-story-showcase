import { afterEach, expect, it, vi } from 'vitest';
import { createHandsOnGuide, type GuidePlan } from './hands-on-guide';
const plan: GuidePlan = { steps: [{ instruction: '点打开', target: { selector: 'button', text: '打开', exact: true }, after: { selector: '[data-result]' } }], completion: '已看到结果' };
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });
function visibleElements() { vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 32 } as DOMRect); }
it('does not advance on time, an unrelated click, or pre-existing content', () => {
  visibleElements(); document.body.innerHTML = '<button>打开</button><button>其他</button><p data-result>结果</p>';
  const publish = vi.fn(); const guide = createHandsOnGuide(document, plan, publish);
  guide.refresh(); document.querySelectorAll('button')[1].click(); guide.refresh();
  expect(publish.mock.lastCall?.[0]).toMatchObject({ step: 1, complete: false });
  document.querySelector('button')!.click(); guide.refresh();
  expect(publish.mock.lastCall?.[0]).toMatchObject({ complete: true }); guide.destroy();
});
it('waits for the real result after the highlighted control is clicked', () => {
  visibleElements(); document.body.innerHTML = '<button>打开</button><p role="alert">失败</p>';
  const publish = vi.fn(); const guide = createHandsOnGuide(document, plan, publish);
  guide.refresh(); document.querySelector('button')!.click(); guide.refresh();
  expect(publish.mock.lastCall?.[0]).toMatchObject({ complete: false });
  document.body.insertAdjacentHTML('beforeend', '<p data-result>结果</p>'); guide.refresh();
  expect(publish.mock.lastCall?.[0]).toMatchObject({ complete: true }); guide.destroy();
});
it('does not highlight a disabled or hidden control', () => {
  visibleElements(); document.body.innerHTML = '<button disabled>打开</button><div hidden><button>打开</button></div>';
  const publish = vi.fn(); const guide = createHandsOnGuide(document, { ...plan, steps: [{ ...plan.steps[0], target: { ...plan.steps[0].target, enabled: true } }] }, publish);
  guide.refresh(); expect(publish.mock.lastCall?.[0]).toMatchObject({ found: false, complete: false }); guide.destroy();
});

it('matches an accessible tab name without its decorative step number', () => {
  visibleElements(); document.body.innerHTML = '<button role="tab"><span aria-hidden="true">1</span>设置实验</button>';
  const publish = vi.fn(); const guide = createHandsOnGuide(document, { ...plan, steps: [{ ...plan.steps[0], target: { selector: '[role="tab"]', text: '设置实验', exact: true } }] }, publish);
  guide.refresh(); expect(publish.mock.lastCall?.[0]).toMatchObject({ found: true }); guide.destroy();
});

it('automatic click executes the actual control once and waits for its result', () => {
  visibleElements(); document.body.innerHTML = '<button>打开</button>';
  const handler = vi.fn(); document.querySelector('button')!.addEventListener('click', handler);
  const publish = vi.fn(); const guide = createHandsOnGuide(document, plan, publish);
  guide.refresh(); expect(guide.clickCurrent()).toBe(true); guide.refresh();
  expect(guide.clickCurrent()).toBe(false); expect(handler).toHaveBeenCalledTimes(1);
  expect(publish.mock.lastCall?.[0]).toMatchObject({ complete: false });
  document.body.insertAdjacentHTML('beforeend', '<p data-result>结果</p>'); guide.refresh();
  expect(publish.mock.lastCall?.[0]).toMatchObject({ complete: true }); guide.destroy();
});
