import { defineConfig, devices } from '@playwright/test';
// Explicitly import `process` to satisfy TypeScript in environments
// where `@types/node` is not installed.
// If the environment doesn't provide Node types, declare a minimal `process`
// symbol so TypeScript won't error. Prefer installing `@types/node` in the
// project for a full typing experience.
declare const process: any;

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* 报告标题 */
  metadata: {
    title: 'Asepal AI前端自动化测试报告',
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only - 演示测试不重试 */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /**
     * 防人为干扰配置：
     * - headless: false  → 保持浏览器窗口可见（实时观察）
     * - --kiosk          → Kiosk（全屏）模式：隐藏地址栏、标题栏，
     *                       没有最小化 / 最大化 / 关闭按钮，
     *                       用户无法通过窗口控件关闭或最小化浏览器。
     *                       （Alt+F4 也会被页面级的 beforeunload 拦截，
     *                        且 Playwright 控制的浏览器默认忽略 beforeunload。）
     * - --disable-pinch  → 禁用缩放手势
     * - --overscroll-history-navigation=0 → 禁用滑动返回
     *
     * 页面内的所有用户点击/键盘事件由 inputGuard 脚本拦截，
     * 参见 tests/_helpers/inputGuard.ts。
     */
    headless: false,
    launchOptions: {
      args: [
        '--kiosk', // 全屏 kiosk 模式，隐藏标题栏和窗口按钮
        '--disable-pinch', // 禁用缩放手势
        '--overscroll-history-navigation=0', // 禁用滑动返回
        '--disable-infobars', // 隐藏 "Chrome is being controlled" 提示条
        '--disable-session-crashed-bubble', // 隐藏崩溃恢复提示
        '--noerrdialogs', // 隐藏错误对话框
      ],
    },

    /* 录像：可在测试失败时回放，方便排查 */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
