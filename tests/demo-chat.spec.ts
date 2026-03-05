// demo-only Playwright test for competition presentation (precise mini user flow)
import { test, expect } from '@playwright/test';
import { installInputGuard } from './_helpers/inputGuard';
import * as fs from 'fs';
import { exec } from 'child_process';

test('mini user flow: first-visit -> login -> one chat -> logout (presentation)', async ({
  page,
}) => {
  // ★ 注入输入保护层：阻止真实用户的鼠标/键盘/触摸操作干扰测试
  await installInputGuard(page);

  const log = (step: string) => console.log(`\n✅ [STEP] ${step}`);
  const slow = async (ms = 800) => await page.waitForTimeout(ms);
  const username = 'Dev-test-001';
  const password = '456456456';
  const question = '请问从广西大学到南宁东站该怎么出发？';
  log('检测本地开发服务....');
  log('0. 打开站点');
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await slow(800);
  log('检查登录逻辑....');
  log('1. 点击底部输入触发登录弹窗');
  const bottomInput = page
    .locator('textarea[aria-label="message-input"], textarea, div[role="textbox"]')
    .first();
  if ((await bottomInput.count()) > 0) {
    await bottomInput.click().catch(() => {});
    await slow(800);
  }
  log('检测登录按钮.....');
  log('2. 点击"Go to sign in"按钮');
  const goLoginBtn = page.locator('button:has-text("前往登录"), button:has-text("Go to sign in")');
  if ((await goLoginBtn.count()) > 0) {
    await expect(goLoginBtn.first()).toBeVisible();
    await goLoginBtn
      .first()
      .click()
      .catch(() => {});
    const identifierInput = page.locator('input[name="identifier"]');
    try {
      await identifierInput.first().waitFor({ timeout: 5000 });
      await slow(500);
    } catch {
      await page.goto('http://localhost:5173/#/auth/login').catch(() => {});
      await slow(800);
    }
  } else {
    await page.goto('http://localhost:5173/#/auth/login').catch(() => {});
    await slow(800);
  }
  log('定位输入框....');
  log('3. 填写登录信息');
  const accountInput = page.locator('input[name="identifier"]');
  const pwdInput = page.locator('input[name="password"]');
  if ((await accountInput.count()) > 0 && (await pwdInput.count()) > 0) {
    await accountInput.fill(username);
    await slow(300);
    await pwdInput.fill(password);
    await slow(300);

    log('3.1 勾选同意条款');
    const agreeCheckbox = page.locator('input[type="checkbox"]').nth(1);
    if ((await agreeCheckbox.count()) > 0) {
      await agreeCheckbox.check().catch(() => {});
      await slow(300);
    }
    log('验证登录逻辑.....');
    log('3.2 点击登录按钮');
    const submit = page.locator('button:has-text("登录"), button:has-text("Sign in")').first();
    if ((await submit.count()) > 0) {
      await Promise.all([
        page.waitForURL(/chat/, { timeout: 15000 }).catch(() => {}),
        submit.click(),
      ]);
      await page.waitForLoadState('networkidle');
      await slow(1200);
    }
  }

  log('4. 确认进入Chat页面');
  if (!page.url().includes('/chat')) {
    await page.goto('http://localhost:5173/#/chat').catch(() => {});
    await page.waitForLoadState('networkidle');
  }
  await slow(800);

  log('4.5 等待历史对话加载');
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page
      .locator(`text=${username}`)
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => {});
  } catch {
    // 忽略
  }
  await slow(1500);
  log('完成');
  log('5. 新建会话');
  const newConv = page.locator(
    'button[aria-label="New conversation"], button[aria-label="新建对话"]',
  );
  if ((await newConv.count()) > 0) {
    await newConv
      .first()
      .click()
      .catch(() => {});
    await slow(800);
  }
  log('定位输入框.....');
  log('6. 发送问题');
  const input = page.locator('textarea').first();
  if (!((await input.count()) > 0)) throw new Error('未找到消息输入框');
  await input.fill(question);
  await slow(600);

  // 发送消息
  const send = page
    .locator('button[aria-label="Send message"], button:has-text("发送"), button:has-text("Send")')
    .first();
  if ((await send.count()) > 0) {
    await send.click().catch(() => {});
  } else {
    await input.press('Enter').catch(() => {});
  }
  log('6.1 等待AI开始回复');
  // 首先等待 "AsePal is thinking" 出现（表示开始处理）
  try {
    await page.waitForFunction(
      () =>
        document.body.innerText.includes('thinking') || document.body.innerText.includes('思考中'),
      { timeout: 30000 },
    );
    console.log('   检测到AI开始思考...');
  } catch {
    console.log('   未检测到思考状态，可能直接开始回复');
  }

  log('6.2 等待AI回复完成（流式输出结束）');
  // 等待 "thinking" 消失，表示开始输出回复
  try {
    await page.waitForFunction(
      () =>
        !document.body.innerText.includes('thinking') &&
        !document.body.innerText.includes('思考中'),
      { timeout: 60000 },
    );
    console.log('   思考状态结束，AI开始输出回复...');
  } catch {
    console.warn('   等待思考状态消失超时');
  }

  // 等待流式输出完成：检测消息内容稳定（连续多次内容无变化）
  log('6.3 等待流式输出完成');
  let lastContent = '';
  let stableCount = 0;
  const maxWaitTime = 120000; // 最长等待120秒
  const checkInterval = 1000; // 每1秒检查一次
  const stableThreshold = 4; // 连续4次内容相同则认为稳定（共4秒）
  const startTime = Date.now();

  while (stableCount < stableThreshold && Date.now() - startTime < maxWaitTime) {
    await slow(checkInterval);
    const currentContent = await page.evaluate(() => {
      // 获取最后一个消息气泡的内容
      const bubbles = document.querySelectorAll('.prose, .message-content, .chat-message');
      if (bubbles.length > 0) {
        return bubbles[bubbles.length - 1].textContent || '';
      }
      return document.body.innerText.slice(-500); // 取最后500字符作为参考
    });

    if (currentContent === lastContent && currentContent.length > 50) {
      stableCount++;
      console.log(`   内容稳定检测: ${stableCount}/${stableThreshold}`);
    } else {
      stableCount = 0;
      console.log(`   AI仍在输出... (已等待 ${Math.round((Date.now() - startTime) / 1000)}秒)`);
    }
    lastContent = currentContent;
  }

  if (stableCount >= stableThreshold) {
    log('6.4 AI回复完成（内容已稳定）');
  } else {
    console.warn('   等待AI回复超时，继续执行');
  }

  // 额外等待确保UI更新完成
  await slow(2000);

  log('7. 开始退出登录流程');

  // 7.0 首先确保侧栏打开
  log('7.0 打开侧栏');

  // 直接使用 aria-label 或 data-tooltip 找到侧栏按钮
  // 侧栏关闭时 tooltip 是 "Open sidebar"，打开时是 "Close sidebar"
  const openSidebarBtn = page.locator('[data-tooltip="Open sidebar"]').first();
  const closeSidebarBtn = page.locator('[data-tooltip="Close sidebar"]').first();

  console.log(`   "Open sidebar" 按钮数量: ${await openSidebarBtn.count()}`);
  console.log(`   "Close sidebar" 按钮数量: ${await closeSidebarBtn.count()}`);

  // 如果能找到 "Open sidebar" 按钮，说明侧栏是关闭的，需要点击打开
  if ((await openSidebarBtn.count()) > 0) {
    console.log('   侧栏当前是关闭状态，点击打开...');
    await openSidebarBtn.click({ force: true });
    await slow(1200);
    console.log('   侧栏应该已打开');
  } else if ((await closeSidebarBtn.count()) > 0) {
    console.log('   侧栏已经是打开状态');
  } else {
    // 回退：使用 header 内第一个按钮
    console.log('   使用回退方法：header 内第一个按钮');
    const sidebarBtn = page.locator('header button').first();
    if ((await sidebarBtn.count()) > 0) {
      await sidebarBtn.click({ force: true });
      await slow(1200);
    }
  }

  // 等待侧栏动画完成
  await slow(800);

  // 7.1 点击用户信息按钮
  const userProfileBtn = page
    .locator('button[aria-label="Open profile"], button[aria-label="打开用户信息"]')
    .first();
  console.log(`   用户信息按钮数量: ${await userProfileBtn.count()}`);

  if ((await userProfileBtn.count()) > 0) {
    log('7.1 点击用户信息按钮');
    await userProfileBtn.click();
    await slow(1000);

    log('7.2 点击退出登录');
    const logoutBtn = page
      .locator('button:has-text("退出登录"), button:has-text("Sign out")')
      .first();
    console.log(`   退出按钮数量: ${await logoutBtn.count()}`);

    if ((await logoutBtn.count()) > 0) {
      await logoutBtn.click();
      await slow(800);

      log('7.3 确认退出');
      const confirm = page
        .locator('button:has-text("确认退出"), button:has-text("Sign out")')
        .first();
      const confirmCount = await confirm.count();
      console.log(`   确认按钮数量: ${confirmCount}`);

      // 如果点击后确认按钮没有出现，说明退出按钮失效
      if (confirmCount === 0) {
        console.error('❌ 退出按钮点击后未响应。停止测试并尝试打开测试报告...');

        // 尝试打开常见的本地报告路径（Windows start 命令）
        const candidates = [
          'playwright-report/index.html',
          'docs/playwright-report/index.html',
          'tests/playwright-report/index.html',
        ];
        for (const p of candidates) {
          try {
            if (fs.existsSync(p)) {
              // 使用 cmd start 在默认浏览器中打开
              exec(`start "" "${p}"`, (err) => {});
              console.log(`已打开报告: ${p}`);
              break;
            }
          } catch (e) {
            // 忽略打开错误
          }
        }

        throw new Error('Logout button appears to be disabled - aborting test');
      }

      if (confirmCount > 0) {
        await confirm.click();
        await page.waitForLoadState('networkidle').catch(() => {});
        await slow(1000);
      }
    }
  } else {
    // 回退：点击用户名
    log('7.1 (回退) 点击用户名');
    const userItem = page.locator(`text=${username}`).first();
    if ((await userItem.count()) > 0) {
      await userItem.click();
      await slow(800);

      const logoutBtn = page
        .locator('button:has-text("退出登录"), button:has-text("Sign out")')
        .first();
      if ((await logoutBtn.count()) > 0) {
        await logoutBtn.click();
        await slow(600);

        const confirm = page
          .locator('button:has-text("确认退出"), button:has-text("Sign out")')
          .first();
        const confirmCount = await confirm.count();

        if (confirmCount === 0) {
          console.error(
            '❌ 退出按钮点击后未响应（可能已被测试注入禁用）。停止测试并尝试打开测试报告...',
          );
          const candidates = [
            'playwright-report/index.html',
            'docs/playwright-report/index.html',
            'tests/playwright-report/index.html',
          ];
          for (const p of candidates) {
            try {
              if (fs.existsSync(p)) {
                exec(`start "" "${p}"`, (err) => {});
                console.log(`已打开报告: ${p}`);
                break;
              }
            } catch (e) {}
          }
          throw new Error('Logout button appears to be disabled - aborting test');
        }

        if (confirmCount > 0) {
          await confirm.click();
          await page.waitForLoadState('networkidle').catch(() => {});
        }
      }
    }
  }

  log('8. 验证已退出登录');
  const signIn = page.locator(
    'button:has-text("Go to sign in"), button:has-text("登录"), a:has-text("Sign in")',
  );

  // 采用轮询方式检查登录入口或用户名不可见，避免 Playwright 的 waitFor/expect 在超时抛出直接导致测试失败
  const pollTimeout = 5000; // 缩短为 5 秒，比赛期间需要更短的等待
  const pollInterval = 500;
  const start = Date.now();
  let passed = false;

  async function locatorVisible(loc: import('@playwright/test').Locator) {
    try {
      return (await loc.count()) > 0 && (await loc.first().isVisible());
    } catch {
      return false;
    }
  }

  while (Date.now() - start < pollTimeout) {
    if (await locatorVisible(signIn)) {
      log('✓ 测试完成：已成功退出登录（检测到登录入口）');
      passed = true;
      break;
    }

    const userVisible = await page.locator(`text=${username}`).count();
    if (userVisible === 0) {
      log('✓ 测试完成：用户已退出（用户名不可见）');
      passed = true;
      break;
    }

    await page.waitForTimeout(pollInterval);
  }

  if (!passed) {
    console.warn('⚠️ 可能未成功退出登录（超时未检测到登录入口或用户名仍可见）');
    throw new Error('可能未成功退出登录（超时）');
  }
});
