import { defineConfig } from '@playwright/test';

const port = 4_177;

export default defineConfig({
  testDir: './e2e',
  testMatch: 'paw-os-apps-audit.e2e.ts',
  outputDir: './test-results/showcase-playwright',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  reporter: [['line']],
  projects: [
    {
      name: 'desktop-1440x900',
      use: {
        viewport: { width: 1_440, height: 900 },
      },
    },
  ],
  use: {
    actionTimeout: 15_000,
    baseURL: `http://127.0.0.1:${port}`,
    channel: process.env.PAW_E2E_SYSTEM_CHROME === '1' ? 'chrome' : undefined,
    colorScheme: 'light',
    locale: 'zh-CN',
    screenshot: 'off',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `VITE_CONTROL_TRANSPORT=mock VITE_BUILD_CHANNEL=preview exec node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/?frontend=paw-os&controlTransport=mock#/project-field`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
