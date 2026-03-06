/**
 * 自动化测试辅助工具 (Input Guard) - v9
 * ==========================================
 *
 * 功能：
 *   1. 提供容错工具函数（重试、状态恢复）
 *   2. 窗口最小化检测与恢复
 *
 * (视觉提示层已移除)
 */

import type { Page } from '@playwright/test';

/** 配置选项 */
export interface InputGuardOptions {
  /** 测试名称 (已弃用) */
  testName?: string;
}

/**
 * 安装视觉提示层 (空函数，为保持兼容性)
 */
export async function installInputGuard(
  page: Page,
  options: InputGuardOptions = {},
): Promise<void> {
  // 视觉提示已移除，此函数为空
  return Promise.resolve();
}

/**
 * 更新当前测试步骤 (空函数，为保持兼容性)
 */
export async function updateTestStep(page: Page, step: string): Promise<void> {
  // 视觉提示已移除，此函数为空
  return Promise.resolve();
}

/**
 * 移除视觉提示 (空函数，为保持兼容性)
 */
export async function removeInputGuard(page: Page): Promise<void> {
  // 视觉提示已移除，此函数为空
  return Promise.resolve();
}

// ==================== 容错工具函数 ====================

/** 重试选项 */
export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  description?: string;
  throwOnFail?: boolean;
}

/**
 * 带重试的操作执行器
 */
export async function withRetry<T>(
  action: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T | null> {
  const { maxRetries = 3, retryDelay = 500, description = '操作', throwOnFail = true } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `   [WARN] ${description} 第 ${attempt}/${maxRetries} 次尝试失败: ${lastError.message}`,
      );
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  if (throwOnFail) {
    throw new Error(`${description} 在 ${maxRetries} 次尝试后仍然失败: ${lastError?.message}`);
  }
  console.warn(`   [ERR] ${description} 最终失败，但继续执行`);
  return null;
}

/**
 * 带容错的点击操作
 */
export async function safeClick(
  page: Page,
  selectors: string | string[],
  options: RetryOptions & {
    force?: boolean;
    scrollIntoView?: boolean;
    timeout?: number;
  } = {},
): Promise<boolean> {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  const {
    maxRetries = 3,
    retryDelay = 500,
    description = '点击',
    throwOnFail = false,
    force = true,
    scrollIntoView = true,
    timeout = 5000,
  } = options;

  const locator = page.locator(selectorList.join(', ')).first();

  const result = await withRetry(
    async () => {
      if ((await locator.count()) === 0) {
        throw new Error('元素不存在');
      }
      await locator.waitFor({ state: 'visible', timeout });
      if (scrollIntoView) {
        await locator.scrollIntoViewIfNeeded().catch(() => {});
      }
      await locator.click({ force, timeout });
      return true;
    },
    { maxRetries, retryDelay, description, throwOnFail },
  );

  return result === true;
}

/**
 * 带容错的填充操作
 */
export async function safeFill(
  page: Page,
  selector: string,
  value: string,
  options: RetryOptions & { clearFirst?: boolean } = {},
): Promise<boolean> {
  const {
    maxRetries = 3,
    retryDelay = 500,
    description = '填充',
    throwOnFail = false,
    clearFirst = true,
  } = options;
  const locator = page.locator(selector).first();

  const result = await withRetry(
    async () => {
      if ((await locator.count()) === 0) {
        throw new Error('输入框不存在');
      }
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      if (clearFirst) {
        await locator.clear();
      }
      await locator.fill(value);
      return true;
    },
    { maxRetries, retryDelay, description, throwOnFail },
  );

  return result === true;
}

/**
 * 等待并验证页面状态
 */
export async function waitForState(
  page: Page,
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number; description?: string } = {},
): Promise<boolean> {
  const { timeout = 10000, interval = 500, description = '状态' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      if (await condition()) {
        console.log(`   [OK] ${description} 已达成`);
        return true;
      }
    } catch {
      /* 忽略 */
    }
    await page.waitForTimeout(interval);
  }

  console.warn(`   [WARN] 等待 ${description} 超时`);
  return false;
}

/**
 * 确保侧栏处于指定状态
 */
export async function ensureSidebarState(
  page: Page,
  shouldBeOpen: boolean,
  options: RetryOptions = {},
): Promise<boolean> {
  const openSelectors = [
    '[data-tooltip="Open sidebar"]',
    '[data-tooltip="打开侧栏"]',
    '[data-tooltip="Mở thanh bên"]',
    '[data-tooltip="เปิดแถบด้านข้าง"]',
    '[aria-label="Open sidebar"]',
    '[aria-label="打开侧栏"]',
  ];
  const closeSelectors = [
    '[data-tooltip="Close sidebar"]',
    '[data-tooltip="关闭侧栏"]',
    '[data-tooltip="Đóng thanh bên"]',
    '[data-tooltip="ปิดแถบด้านข้าง"]',
    '[aria-label="Close sidebar"]',
    '[aria-label="关闭侧栏"]',
  ];

  const openBtn = page.locator(openSelectors.join(', ')).first();
  const closeBtn = page.locator(closeSelectors.join(', ')).first();

  const isCurrentlyClosed = (await openBtn.count()) > 0;
  const isCurrentlyOpen = (await closeBtn.count()) > 0;

  if (shouldBeOpen && isCurrentlyClosed) {
    console.log('   侧栏当前关闭，正在打开...');
    return await safeClick(page, openSelectors, { ...options, description: '打开侧栏' });
  } else if (!shouldBeOpen && isCurrentlyOpen) {
    console.log('   侧栏当前打开，正在关闭...');
    return await safeClick(page, closeSelectors, { ...options, description: '关闭侧栏' });
  } else {
    console.log(`   侧栏已是${shouldBeOpen ? '打开' : '关闭'}状态`);
    return true;
  }
}

// ==================== 窗口最小化处理 ====================

/**
 * 确保窗口处于可见状态（使用 CDP）
 */
export async function ensureWindowVisible(page: Page): Promise<boolean> {
  try {
    const client = await page.context().newCDPSession(page);
    const { windowId } = await client.send('Browser.getWindowForTarget');
    const { bounds } = await client.send('Browser.getWindowBounds', { windowId });

    if (bounds.windowState === 'minimized') {
      console.log('   [WARN] 检测到窗口最小化，正在恢复...');
      await client.send('Browser.setWindowBounds', {
        windowId,
        bounds: { windowState: 'normal' },
      });
      await page.waitForTimeout(500);
      console.log('   [OK] 窗口已恢复');
    }
    return true;
  } catch (error) {
    // CDP 可能在某些浏览器上不可用，静默处理
    return true;
  }
}

/**
 * 创建窗口状态监控器
 */
export function createWindowMonitor(
  page: Page,
  intervalMs: number = 2000,
): {
  start: () => void;
  stop: () => void;
} {
  let timer: ReturnType<typeof setInterval> | null = null;
  let isRunning = false;

  return {
    start: () => {
      if (isRunning) return;
      isRunning = true;
      timer = setInterval(async () => {
        if (!isRunning) return;
        await ensureWindowVisible(page).catch(() => {});
      }, intervalMs);
      console.log('[WindowMonitor] [OK] 窗口监控已启动');
    },
    stop: () => {
      isRunning = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      console.log('[WindowMonitor] [STOP] 窗口监控已停止');
    },
  };
}

/**
 * 在操作前确保窗口可见
 */
export async function withVisibleWindow<T>(page: Page, action: () => Promise<T>): Promise<T> {
  await ensureWindowVisible(page);
  return await action();
}

// ==================== 状态恢复工具 ====================

/**
 * 检查并恢复到预期页面
 */
export async function ensureOnPage(
  page: Page,
  expectedUrlPattern: string | RegExp,
  fallbackUrl: string,
): Promise<boolean> {
  const currentUrl = page.url();
  const matches =
    typeof expectedUrlPattern === 'string'
      ? currentUrl.includes(expectedUrlPattern)
      : expectedUrlPattern.test(currentUrl);

  if (!matches) {
    console.warn(`   [WARN] 当前页面 ${currentUrl} 不符合预期，正在导航到 ${fallbackUrl}`);
    await page.goto(fallbackUrl);
    await page.waitForLoadState('networkidle');
    return false;
  }
  return true;
}

/**
 * 关闭所有可能的弹窗/模态框
 */
export async function dismissAllModals(page: Page): Promise<void> {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(200);

  const closeButtons = page.locator(
    [
      'button[aria-label="Close"]',
      'button[aria-label="关闭"]',
      '.modal-close',
      '[data-dismiss="modal"]',
      'button:has-text("取消")',
      'button:has-text("Cancel")',
    ].join(', '),
  );

  const count = await closeButtons.count();
  for (let i = 0; i < Math.min(count, 3); i++) {
    await closeButtons
      .nth(i)
      .click({ force: true })
      .catch(() => {});
    await page.waitForTimeout(100);
  }
}
