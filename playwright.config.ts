import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4174', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The engines differ in focus, top layer, inert and scrolling: the `@cross` tests run there
    // too — always in CI, locally with PW_CROSS=1 (WebKit needs the host libraries CI installs).
    ...(process.env.CI || process.env.PW_CROSS
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@cross/ },
          { name: 'webkit', use: { ...devices['Desktop Safari'] }, grep: /@cross/ },
        ]
      : []),
  ],
  webServer: [
    {
      command: 'pnpm --filter playground build && pnpm --filter playground preview',
      url: 'http://localhost:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter docs build && pnpm --filter docs preview --ignore-lock',
      url: 'http://localhost:4322/awesome-tour/',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
