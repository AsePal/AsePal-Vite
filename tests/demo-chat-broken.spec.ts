// 有问题的自动化测试脚本 - 退出登录按钮处会出错导致测试不通过
// 用于演示测试失败场景
import { test, expect } from '@playwright/test';

test('Asepal AI前端自动化测试报告', async ({ page }) => {
  const log = (step: string) => console.log(`\n✅ [STEP] ${step}`);
  const slow = async (ms = 800) => await page.waitForTimeout(ms);
  const username = 'Dev-test-001';
  const password = '456456456';
  const question = '请问从广西大学到南宁东站该怎么出发？';

  log('0. 打开站点');
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await slow(800);

  log('1. 点击底部输入触发登录弹窗');
  const bottomInput = page
    .locator('textarea[aria-label="message-input"], textarea, div[role="textbox"]')
    .first();
  if ((await bottomInput.count()) > 0) {
    await bottomInput.click().catch(() => {});
    await slow(800);
  }

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

  log('6.2 等待AI回复完成');
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

  log('6.3 等待流式输出完成');
  let lastContent = '';
  let stableCount = 0;
  const maxWaitTime = 120000;
  const checkInterval = 1000;
  const stableThreshold = 4;
  const startTime = Date.now();

  while (stableCount < stableThreshold && Date.now() - startTime < maxWaitTime) {
    await slow(checkInterval);
    const currentContent = await page.evaluate(() => {
      const bubbles = document.querySelectorAll('.prose, .message-content, .chat-message');
      if (bubbles.length > 0) {
        return bubbles[bubbles.length - 1].textContent || '';
      }
      return document.body.innerText.slice(-500);
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

  await slow(2000);

  log('7. 开始退出登录流程');

  log('7.0 打开侧栏');

  const openSidebarBtn = page.locator('[data-tooltip="Open sidebar"]').first();
  const closeSidebarBtn = page.locator('[data-tooltip="Close sidebar"]').first();

  if ((await openSidebarBtn.count()) > 0) {
    console.log('   侧栏当前是关闭状态，点击打开...');
    await openSidebarBtn.click({ force: true });
    await slow(1200);
  } else if ((await closeSidebarBtn.count()) > 0) {
    console.log('   侧栏已经是打开状态');
  } else {
    const sidebarBtn = page.locator('header button').first();
    if ((await sidebarBtn.count()) > 0) {
      await sidebarBtn.click({ force: true });
      await slow(1200);
    }
  }

  await slow(800);

  // 🔴 使用一个不存在的选择器，导致测试失败
  log('7.1 点击用户信息按钮');

  // 使用一个肯定不存在的选择器
  const brokenUserProfileBtn = page.locator('button[aria-label="NonExistentButton-12345"]').first();

  console.log(`   按钮数量: ${await brokenUserProfileBtn.count()}`);

  console.log('   ⚠️ 发现异常按钮（尝试重新触发）...');
  console.log('   ⚠️ 退出按钮异常！测试中断！');

  // 使用一个会超时的断言来模拟失败
  await expect(brokenUserProfileBtn).toBeVisible({ timeout: 1000 });

  // 以下代码永远不会执行到
  log('7.2 点击退出登录');
  const logoutBtn = page
    .locator('button:has-text("退出登录"), button:has-text("Sign out")')
    .first();
  await logoutBtn.click();

  log('8. 验证已退出登录');
  const signIn = page.locator('button:has-text("Go to sign in"), button:has-text("登录")');
  await expect(signIn.first()).toBeVisible({ timeout: 5000 });

  log('✓ 测试完成');
});
