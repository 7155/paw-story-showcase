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
    await page.goto('/?controlTransport=mock#/project-field');
    await expect(page.locator('.paw-desktop-root')).toBeVisible({ timeout: 30_000 });

    const evidence: AppAuditEvidence[] = [];

    for (const app of PAWOS_APPS) {
      await openAppFromLaunchpad(page, app.label);
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

  test('Room showcase dispatches implementers, streams one ordered lane, then starts Reviewer', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/?frontend=paw-os&showcase=room-flow#/agent?room=room-preview');

    const director = page.getByTestId('paw-room-flow-showcase');
    await expect(director).toBeVisible({ timeout: 30_000 });
    await expect(director).toContainText('PUBLIC SYNTHETIC EVENTS');
    await expect(director).toContainText('GATED');

    // The three implementation planets are real PAW participant windows. The
    // Reviewer must not exist while those WorkPatches are still incomplete.
    await expect(page.getByRole('region', { name: 'Mars窗口' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('region', { name: 'Venus窗口' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('region', { name: 'Jupiter窗口' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('region', { name: 'Saturn窗口' })).toHaveCount(0);

    // Sequence 25 is the durable 3/3 implementation receipt. Only the next
    // route_decision is allowed to open the independent test batch.
    await expect(director).toHaveAttribute('data-sequence', '25', { timeout: 35_000 });
    await expect(director).toContainText('3/3');
    await expect(director).toContainText('GATED');
    await expect(page.getByRole('region', { name: 'Saturn窗口' })).toHaveCount(0);

    await expect(page.getByRole('region', { name: 'Saturn窗口' })).toBeVisible({ timeout: 5_000 });
    await expect(director).toContainText('REVIEWER TEST');
    await expect(director).toContainText('TESTING');

    await expect(director).toHaveAttribute('data-sequence', '36', { timeout: 20_000 });
    await expect(director).toContainText('FINAL SUBMIT');
    await expect(director).toContainText('PASSED');
    await expect(director).toContainText('P0');
    await expect(director).toContainText('0');
    await expect(page.getByRole('main', { name: 'PAW 展示页制作 主 Room' })).toContainText('实施伙伴未执行最终测试');
  });
});

async function openAppFromLaunchpad(page: Page, label: string): Promise<void> {
  // The menu-bar system mark opens the same Launchpad ("打开全部 App"), so the
  // Dock button has to be named exactly or the audit stops on an ambiguity.
  await page.getByRole('button', { name: '全部 App', exact: true }).click();
  const launcher = page.getByRole('dialog', { name: '全部 App' });
  await expect(launcher).toBeVisible();
  await launcher.getByRole('button', { name: new RegExp(label) }).click();
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
