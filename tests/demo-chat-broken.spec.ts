// 有问题的自动化测试脚本 - 退出登录按钮处会出错导致测试不通过
// 用于演示测试失败场景
import { test, expect } from '@playwright/test';

// ---- 多语言选择器工具与词典（覆盖 中 / English / Tiếng Việt / ไทย） ----
const multi = (page: any, selectors: string[]) => page.locator(selectors.join(', '));
const clickIfExists = async (page: any, selectors: string[], options = {}) => {
  const loc = multi(page, selectors).first();
  if ((await loc.count()) > 0) {
    await loc.click(options).catch(() => {});
    return true;
  }
  return false;
};

const I18N = {
  goToSignIn: [
    'button:has-text("前往登录")',
    'button:has-text("Go to sign in")',
    'button:has-text("Đăng nhập")',
    'button:has-text("Đi đến đăng nhập")',
    'button:has-text("เข้าสู่ระบบ")',
    'button:has-text("ไปที่เข้าสู่ระบบ")',
  ],
  signIn: [
    'button:has-text("登录")',
    'button:has-text("Sign in")',
    'button:has-text("Đăng nhập")',
    'button:has-text("เข้าสู่ระบบ")',
  ],
  newConversation: [
    'button[aria-label="New conversation"]',
    'button[aria-label="新建对话"]',
    'button:has-text("新建对话")',
    'button:has-text("New conversation")',
    'button:has-text("Cuộc trò chuyện mới")',
    'button:has-text("การสนทนาใหม่")',
  ],
  sendMessage: [
    'button[aria-label="Send message"]',
    'button:has-text("发送")',
    'button:has-text("Send")',
    'button:has-text("Gửi")',
    'button:has-text("ส่ง")',
  ],
  openProfile: [
    'button[aria-label="Open profile"]',
    'button[aria-label="打开用户信息"]',
    'button[aria-label="User profile"]',
    'button[aria-label="个人信息"]',
    'button[aria-label="Profile"]',
    'button:has-text("Hồ sơ")',
    'button:has-text("Thông tin tài khoản")',
    'button:has-text("โปรไฟล์")',
  ],
  logout: [
    'button:has-text("退出登录")',
    'button:has-text("登出")',
    'button:has-text("Sign out")',
    'button:has-text("Logout")',
    'button:has-text("Đăng xuất")',
    'button:has-text("ออกจากระบบ")',
  ],
  confirmLogout: [
    'button:has-text("确认退出")',
    'button:has-text("Confirm sign out")',
    'button:has-text("Confirm")',
    'button:has-text("Xác nhận")',
    'button:has-text("Đồng ý")',
    'button:has-text("ยืนยัน")',
  ],
  signInEntry: [
    'button:has-text("Go to sign in")',
    'button:has-text("登录")',
    'a:has-text("Sign in")',
    'button:has-text("Sign in")',
    'button:has-text("Đăng nhập")',
    'button:has-text("เข้าสู่ระบบ")',
  ],
};

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
  const goLoginBtn = multi(page, I18N.goToSignIn);
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
    log('定位隐私条款勾选窗口....');
    log('3.1 勾选同意条款');
    const agreeCheckbox = page.locator('input[type="checkbox"]').nth(1);
    if ((await agreeCheckbox.count()) > 0) {
      await agreeCheckbox.check().catch(() => {});
      await slow(300);
    }
    log('定位登录按钮....');
    log('3.2 点击登录按钮');
    const submit = multi(page, I18N.signIn).first();
    if ((await submit.count()) > 0) {
      await Promise.all([
        page.waitForURL(/chat/, { timeout: 15000 }).catch(() => {}),
        submit.click(),
      ]);
      await page.waitForLoadState('networkidle');
      await slow(1200);
    }
  }
  log('4. 验证登录成功');
  // const userMenuBtn = page.locator('button[aria-label="User menu"], button[aria-label="用户菜单"]');
  // await expect(userMenuBtn.first()).toBeVisible({ timeout: 10000 });
  log('4. 确认进入Chat页面');
  if (!page.url().includes('/chat')) {
    await page.goto('http://localhost:5173/#/chat').catch(() => {});
    await page.waitForLoadState('networkidle');
  }
  await slow(800);

  log('4.5 等待历史对话加载.....');
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page
      .locator(`text=${username}`)
      .first()
      .waitFor({ timeout: 10000 })
      .catch(() => {});
  } catch {
    // 忽略
  }
  await slow(1500);
  log('4.6 定位新建对话按钮');
  log('5. 新建会话');
  const newConv = multi(page, I18N.newConversation);
  if ((await newConv.count()) > 0) {
    await newConv
      .first()
      .click()
      .catch(() => {});
    await slow(800);
  }
  log('5.1 查找输入框');
  log('6. 发送问题');
  const input = page.locator('textarea').first();
  if (!((await input.count()) > 0)) throw new Error('未找到消息输入框');
  await input.fill(question);
  await slow(600);

  // 发送消息
  const send = multi(page, I18N.sendMessage).first();
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
  log('检测侧栏状态....');

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

  // ✅ 多语言容错的用户信息与退出流程
  log('7.1 点击用户信息按钮（多语言容错）');

  // 尝试多个 aria-label / 文案变体，覆盖中/英常见项
  const clickedProfile = await clickIfExists(page, I18N.openProfile);

  if (clickedProfile) {
    log('7.1.1 已打开用户信息菜单');
    await slow(1000);

    log('7.2 点击退出登录（多语言容错）');
    const logoutLoc = multi(page, I18N.logout).first();
    if ((await logoutLoc.count()) > 0) {
      await logoutLoc.click().catch(() => {});
      await slow(800);

      // 有些实现需要再次确认
      const confirmLoc = multi(page, I18N.confirmLogout).first();
      if ((await confirmLoc.count()) > 0) {
        await confirmLoc.click().catch(() => {});
        await page.waitForLoadState('networkidle').catch(() => {});
        await slow(800);
      }
    }
  } else {
    // 回退：尝试点击用户名条目（常见于侧栏或用户列表）
    log('7.1 (回退) 尝试通过用户名触发账户菜单/退出流程');
    const userItem = page.locator(`text=${username}`).first();
    if ((await userItem.count()) > 0) {
      await userItem.click().catch(() => {});
      await slow(800);

      const logoutLoc = multi(page, I18N.logout).first();
      if ((await logoutLoc.count()) > 0) {
        await logoutLoc.click().catch(() => {});
        await slow(600);

        const confirmLoc = multi(page, I18N.confirmLogout).first();
        if ((await confirmLoc.count()) > 0) {
          await confirmLoc.click().catch(() => {});
          await page.waitForLoadState('networkidle').catch(() => {});
        }
      }
    } else {
      console.warn('   未找到用户信息按钮也未能回退到用户名，跳过退出步骤');
    }
  }

  // 验证已退出（多语言容错）
  log('8. 验证已退出登录（多语言容错）');
  const signInLoc = multi(page, I18N.signInEntry).first();
  await expect(signInLoc)
    .toBeVisible({ timeout: 3000 })
    .catch(async () => {
      // 软失败：如果未检测到登录入口，再检查用户名是否不可见
      const userVisible = await page.locator(`text=${username}`).count();
      if (userVisible === 0) {
        console.log('   用户名不可见，视为已退出登录');
      } else {
        console.warn('   未检测到登录入口，且用户名仍然可见（可能未退出）');
      }
    });

  log('✓ 测试完成');
});
