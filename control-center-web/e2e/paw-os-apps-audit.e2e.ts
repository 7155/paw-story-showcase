import { expect, test, type Page } from '@playwright/test';
import { pawOsAppRegistry, type PawOsAppId } from '../src/features/paw-os/model/app-registry';

type AppAuditEvidence = {
  appId: PawOsAppId;
  label: string;
  windowVisible: boolean;
  windowWidth: number;
  windowHeight: number;
  mainTextLength: number;
  interactiveCount: number;
  errorAlerts: string[];
  issues: string[];
};

const PAWOS_APPS = pawOsAppRegistry.map((app) => ({ id: app.id, label: app.label }));

test.describe('PAWOS App interface audit (ops)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440x900', 'desktop PAWOS audit viewport');
  });

  test('each registered App opens with a usable window surface', async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    // Without the preview transport every request hits a local port nothing is
    // listening on, so the audit would grade eleven read-failure states instead
    // of the product.
    await page.goto('/?frontend=paw-os&controlTransport=mock#/project-field');
    await expect(page.locator('.paw-desktop-root')).toBeVisible({ timeout: 30_000 });

    const evidence: AppAuditEvidence[] = [];

    for (const app of PAWOS_APPS) {
      await openAppFromLaunchpad(page, app.id);
      const shell = page.locator(`.paw-window-shell[data-app="${app.id}"]`).last();
      await expect(shell).toBeVisible({ timeout: 15_000 });
      await settleAppWindow(page, app.id);

      const audit = await collectAppEvidence(page, app.id, app.label);
      evidence.push(audit);

      await testInfo.attach(`paw-os-${app.id}.png`, {
        body: await shell.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });

      await closeTopWindow(page);
    }

    await testInfo.attach('paw-os-apps-audit.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    });

    // One App failing must not hide the other ten: every window is graded, then
    // the whole audit reports together.
    expect(
      evidence.filter((item) => item.issues.length).map((item) => `${item.appId}: ${item.issues.join('; ')}`),
      'PAWOS App audit issues',
    ).toEqual([]);
  });

  test('Agent Lab moves from the human-readable matrix to detail and an HTML report', async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto('/?frontend=paw-os&controlTransport=mock#/project-field');
    await expect(page.locator('.paw-desktop-root')).toBeVisible({ timeout: 30_000 });

    await openAppFromLaunchpad(page, 'agent-lab');
    const shell = page.locator('.paw-window-shell[data-app="agent-lab"]').last();
    await expect(shell).toBeVisible({ timeout: 15_000 });
    await settleAppWindow(page, 'agent-lab');

    await expect(shell).toContainText('用同一批任务，比较每次改动真正带来的效果');
    await expect(shell).toContainText('锁定比较条件');
    await shell.getByRole('button', { name: '打开 企业客户支持 详情' }).click();
    await expect(shell).toContainText('验收标准如何产生');
    await expect(shell).toContainText('最初为什么不行');
    await expect(shell).toContainText('2 / 3');
    await expect(shell).toContainText('31 / 31');
    await expect(shell).toContainText('保留');

    await shell.getByRole('button', { name: '查看 业务流程对比 · 状态契约 的批次证据' }).click();
    const batch = page.getByRole('dialog', { name: '批次证据：业务流程对比 · 状态契约' });
    await expect(batch).toContainText('原始流程：任务 2/3');
    await expect(batch).toContainText('状态契约方案：任务 3/3');
    await expect(batch).toContainText('公开回执 SHA-256');
    await page.keyboard.press('Escape');
    await expect(batch).toBeHidden();

    await shell.getByRole('button', { name: '打开审计报告' }).click();
    const dialog = page.getByRole('dialog', { name: '企业客户支持 审计报告' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('为什么');
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: '下载独立 HTML' }).click();
    expect((await download).suggestedFilename()).toBe('enterpriseops-ci-audit.html');
  });

  test('Memory showcase uses real PAWOS Apps from input records through Agent recall', async ({ page }) => {
    test.setTimeout(70_000);
    await page.goto('/?frontend=paw-os&showcase=memory-flow#/history');

    const director = page.getByTestId('paw-memory-flow-showcase');
    await expect(director).toBeVisible({ timeout: 30_000 });
    await expect(director).toHaveAttribute('data-stage', 'capture');
    await expect(director).toHaveAttribute('data-stage-ready', 'true', { timeout: 15_000 });
    await expect(director.getByRole('button')).toHaveCount(7);
    const showcaseCursor = page.getByTestId('paw-memory-flow-cursor');
    await expect(showcaseCursor).toHaveAttribute('data-visible', 'true');
    const inputWindow = page.locator('.paw-window-shell[data-app="input-studio"]');
    await expect(inputWindow).toBeVisible();
    await expect(inputWindow).toContainText('输入记录');
    await expect(inputWindow).toContainText('1284');

    await expect(director).toHaveAttribute('data-cursor-target', '2', { timeout: 4_000 });
    await expect(director).toHaveAttribute('data-stage', 'organize', { timeout: 5_000 });
    await expect(director).toHaveAttribute('data-stage-ready', 'true', { timeout: 15_000 });
    const memoryWindow = page.locator('.paw-window-shell[data-app="memory"]');
    await expect(memoryWindow).toBeVisible();
    await expect(memoryWindow).toContainText('整理到今天');

    await expect(director).toHaveAttribute('data-stage', 'result', { timeout: 5_000 });
    await expect(director).toHaveAttribute('data-stage-ready', 'true', { timeout: 15_000 });
    await expect(memoryWindow).toContainText('时间线');
    await expect(memoryWindow).toContainText('5 个可核对任务');
    await page.waitForTimeout(1_500);
    await expect(director).toHaveAttribute('data-stage', 'result');

    await expect(director).toHaveAttribute('data-stage', 'greeting', { timeout: 8_000 });
    await expect(director).toHaveAttribute('data-stage-ready', 'true', { timeout: 15_000 });
    const agentWindow = page.locator('.paw-window-shell[data-app="agent"]');
    await expect(agentWindow).toBeVisible();
    await expect(agentWindow).toContainText('嗨，今天怎么样？');
    await expect(agentWindow).toContainText('你今天其实推进了不少');
    await expect(agentWindow).not.toContainText('还行，就是今天有点累');

    await expect(director).toHaveAttribute('data-stage', 'continue', { timeout: 7_000 });
    await expect(director).toHaveAttribute('data-stage-ready', 'true', { timeout: 15_000 });
    await expect(agentWindow).toContainText('还行，就是今天有点累。');
    await expect(agentWindow).toContainText('你最近反复在意的不是“功能堆得多”');
    await expect(agentWindow).toContainText('几个 Agent 之间最难的交接跑通了');
    await expect(agentWindow).toContainText('真实、有用');
    await expect(agentWindow).not.toContainText('行星之间真的能沟通');
    await expect(agentWindow).not.toContainText('我最近反复强调的偏好有哪些？');
    await expect(director).toContainText('模型等待已压缩');
  });

  test('PAW kickoff replays real user history, clicks through Room views, then reviews the integrated result', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/?frontend=paw-os&showcase=room-flow&showcaseSpeed=fast#/agent?room=room-preview');

    const director = page.getByTestId('paw-room-flow-showcase');
    await expect(director).toBeVisible({ timeout: 30_000 });
    await expect(director).toContainText('PUBLIC SYNTHETIC EVENTS');
    await expect(director).toContainText('GATED');
    await expect(page.getByTestId('paw-room-flow-cursor')).toHaveCount(1);
    await expect(page.getByRole('button', { name: '公开记录' })).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
    const mainRoom = page.getByRole('main', { name: 'PAW 立项 主 Room' });
    await expect(mainRoom).toContainText('Pi 可以做成网关型 Agent 吗');

    await expect(page.getByRole('button', { name: '任务表' })).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });

    await expect(page.getByRole('button', { name: '协同模式' })).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });

    // The four PAW product lanes are real participant windows. The
    // Reviewer must not exist while any WorkPatch or Docs integration remains.
    await expect(page.getByRole('region', { name: /^Mars · .*窗口$/u })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('region', { name: /^Venus · .*窗口$/u })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('region', { name: /^Jupiter · .*窗口$/u })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('region', { name: /^Saturn · .*窗口$/u })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('region', { name: /^Mercury · .*窗口$/u })).toHaveCount(0);
    await expect(page.getByRole('region', { name: /^Neptune · .*窗口$/u })).toHaveCount(0);

    await expect(page.getByRole('button', { name: '公开记录' })).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });

    // Sequence 57 is the integrated Docs receipt after all four WorkPatches.
    // Only the next route_decision may open the independent Reviewer batch.
    await expect(director).toHaveAttribute('data-sequence', '57', { timeout: 20_000 });
    await expect(director).toContainText('4/4');
    await expect(director).toContainText('GATED');
    await expect(page.getByRole('region', { name: /^Neptune · .*窗口$/u })).toHaveCount(0);

    await expect(page.getByRole('region', { name: /^Neptune · .*窗口$/u })).toBeVisible({ timeout: 5_000 });
    await expect(director).toContainText('REVIEWER TEST');
    await expect(director).toContainText('CHECKING');

    await expect(director).toHaveAttribute('data-sequence', '69', { timeout: 10_000 });
    await expect(director).toContainText('FINAL SUBMIT');
    await expect(director).toContainText('PASSED');
    await expect(director).toContainText('P0');
    await expect(director).toContainText('1 → 0');
    await expect(mainRoom).toContainText('行星通信');
    await expect(mainRoom).toContainText(
      '独立复核回执：PAW 立项产品线 4/4，行星通信 4/4，真实 App 路由 4/4',
    );
  });
});

async function openAppFromLaunchpad(page: Page, appId: PawOsAppId): Promise<void> {
  // The menu-bar system mark opens the same Launchpad ("打开全部 App"), so the
  // Dock button has to be named exactly or the audit stops on an ambiguity.
  await page.getByRole('button', { name: '全部 App', exact: true }).click();
  const launcher = page.getByRole('dialog', { name: '全部 App' });
  await expect(launcher).toBeVisible();
  await launcher.locator(`button[data-app="${appId}"]`).click();
  await expect(launcher).toBeHidden({ timeout: 5_000 });
}

/**
 * A window is ready to grade once its App body has replaced the open-progress
 * status and no read is still pending. Grading on a fixed timeout measures the
 * machine, not the interface.
 */
async function settleAppWindow(page: Page, appId: PawOsAppId): Promise<void> {
  const shell = page.locator(`.paw-window-shell[data-app="${appId}"]`).last();
  // Two boot states, not one: `.paw-app-boot` waits for the App chunk and
  // `.paw-app-loading` for whatever that chunk lazily loads next. Grading
  // after only the second still grades an opening window.
  await expect
    .poll(() => shell.locator('.paw-app-boot, .paw-app-loading').count(), { timeout: 20_000 })
    .toBe(0);
  await expect
    .poll(
      () => shell.locator('.mgmt-loading, [aria-busy="true"], .ui-skeleton').count(),
      { timeout: 20_000 },
    )
    .toBe(0);
  await page.waitForTimeout(160);
}

async function closeTopWindow(page: Page): Promise<void> {
  const close = page.locator('.paw-window-shell[data-active] .paw-window-traffic-close').first();
  if (await close.count()) {
    await close.click();
    await page.waitForTimeout(120);
  }
}

async function collectAppEvidence(page: Page, appId: PawOsAppId, label: string): Promise<AppAuditEvidence> {
  return page.locator(`.paw-window-shell[data-app="${appId}"]`).last().evaluate((shell, values) => {
    // `main` means a different scope in every App — the whole workspace in
    // one, only the preview pane or the page viewport in another — so grading
    // it compares Apps against different questions. The window body is the
    // unit the user actually opened.
    const main = shell.querySelector('.paw-window-body') || shell.querySelector('main') || shell;
    const isVisible = (element: Element) => {
      const style = getComputedStyle(element as HTMLElement);
      const rect = (element as HTMLElement).getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) > 0
        && rect.width > 0
        && rect.height > 0;
    };
    const rect = shell.getBoundingClientRect();
    const interactives = [...main.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [role="tab"]',
    )].filter(isVisible);
    const errorAlerts = [...main.querySelectorAll<HTMLElement>('[role="alert"], .paw-browser-error')]
      .filter(isVisible)
      .map((element) => (element.innerText || element.textContent || '').trim().slice(0, 120))
      .filter(Boolean);
    const issues: string[] = [];
    if (rect.width < 320) issues.push(`window width ${Math.round(rect.width)}px`);
    if (rect.height < 240) issues.push(`window height ${Math.round(rect.height)}px`);
    const text = (main as HTMLElement).innerText?.trim() ?? '';
    if (text.length <= 6) issues.push('empty or nearly empty main surface');
    if (!interactives.length) issues.push('no visible interactive controls');
    if (errorAlerts.length) issues.push(`error alerts: ${errorAlerts.join('; ')}`);
    return {
      appId: values.appId,
      label: values.label,
      windowVisible: rect.width > 0 && rect.height > 0,
      windowWidth: rect.width,
      windowHeight: rect.height,
      mainTextLength: text.length,
      interactiveCount: interactives.length,
      errorAlerts,
      issues,
    };
  }, { appId, label });
}
