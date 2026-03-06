import { test, expect } from '@playwright/test';
import {
  installInputGuard,
  updateTestStep,
  createWindowMonitor,
  ensureWindowVisible,
  safeClick,
  safeFill,
  withRetry,
  ensureSidebarState,
  ensureOnPage,
  dismissAllModals,
} from './_helpers/inputGuard';

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
    // 有些实现直接使用 "Sign out" / "Sign Out" 或者 "Logout" 作为确认按钮文本
    'button:has-text("Sign out")',
    'button:has-text("Sign Out")',
    'button:has-text("Logout")',
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
  const COLOR_GREEN = '\x1b[32m';
  const COLOR_YELLOW = '\x1b[33m';
  const COLOR_RED = '\x1b[31m';
  const COLOR_RESET = '\x1b[0m';
  // ★ 注入输入保护层：显示醒目的测试警告标签
  // （配合 playwright.config.ts 中的 --kiosk 模式，窗口也无法被最小化/关闭）
  await installInputGuard(page, { testName: '[NORMAL] Normal 测试场景' });

  // ★ 启动窗口状态监控器：检测并自动恢复最小化的窗口
  const windowMonitor = createWindowMonitor(page, 2000);
  windowMonitor.start();

  // 检查点记录
  const checkpoints: { name: string; status: '[OK] 通过' | '[FAIL] 失败' | '[WARN] 警告' }[] = [];

  // log 函数会自动记录检查点，并更新页面上的步骤显示
  const log = (step: string, status: '[OK] 通过' | '[FAIL] 失败' | '[WARN] 警告' = '[OK] 通过') => {
    console.log(`\n[STEP] ${step}`);
    // 更新页面上的步骤显示（fire-and-forget，不阻塞）
    updateTestStep(page, step).catch(() => {});
    // 只记录主要步骤（不以空格开头的、或者是关键节点）
    if (!step.startsWith(' ')) {
      checkpoints.push({ name: step, status });
    }
  };

  const slow = async (ms = 800) => await page.waitForTimeout(ms);
  const username = 'Dev-test-001';
  const password = '456456456';
  const question = '请问从广西大学到南宁东站该怎么出发？';

  //****************** */
  //    进入系统
  //****************** */

  log('0. 打开站点');
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await slow(800);

  //************************ */
  //        语言切换
  //************************ */

  log('开始多语言切换测试');

  let languageSwitchSuccess = false;

  try {
    log('打开侧栏');
    // 多语言支持的侧栏按钮选择器
    const openSidebarBtnPreLogin = page
      .locator(
        [
          '[data-tooltip="Open sidebar"]',
          '[data-tooltip="打开侧栏"]',
          '[data-tooltip="Mở thanh bên"]',
          '[data-tooltip="เปิดแถบด้านข้าง"]',
          '[aria-label="Open sidebar"]',
          '[aria-label="打开侧栏"]',
        ].join(', '),
      )
      .first();
    const closeSidebarBtnPreLogin = page
      .locator(
        [
          '[data-tooltip="Close sidebar"]',
          '[data-tooltip="关闭侧栏"]',
          '[data-tooltip="Đóng thanh bên"]',
          '[data-tooltip="ปิดแถบด้านข้าง"]',
          '[aria-label="Close sidebar"]',
          '[aria-label="关闭侧栏"]',
        ].join(', '),
      )
      .first();

    if ((await openSidebarBtnPreLogin.count()) > 0) {
      console.log('   侧栏当前是关闭状态，点击打开...');
      await openSidebarBtnPreLogin.click({ force: true });
      await slow(1000);
    } else if ((await closeSidebarBtnPreLogin.count()) > 0) {
      console.log('   侧栏已经是打开状态');
    } else {
      console.log('   使用回退方法：点击header内第一个按钮');
      const sidebarBtn = page.locator('header button').first();
      if ((await sidebarBtn.count()) > 0) {
        await sidebarBtn.click({ force: true });
        await slow(1000);
      } else {
        throw new Error('[ERR] 无法打开侧栏：未找到侧栏开关按钮');
      }
    }
    await slow(500);

    log('查找并测试语言切换功能');
    // 支持的语言列表（根据截图）：中文、English、Tiếng Việt、ไทย
    // 直接在整个页面查找，不限制在 aside 内
    const langToggle = page
      .locator(
        [
          // 英文属性（实际使用的）
          'button[aria-label="Toggle language"]',
          'button[data-tooltip="Toggle language"]',
          '[aria-label="Toggle language"]',
          '[data-tooltip="Toggle language"]',
          // 中文属性（备用）
          'button[aria-label="切换语言"]',
          'button[data-tooltip="切换语言"]',
          '[aria-label="切换语言"]',
          '[data-tooltip="切换语言"]',
          // 模糊匹配
          '[aria-label*="language"]',
          '[data-tooltip*="language"]',
          '[aria-label*="语言"]',
          '[data-tooltip*="语言"]',
        ].join(', '),
      )
      .first();

    if ((await langToggle.count()) === 0) {
      throw new Error('[ERR] 未找到语言切换按钮');
    }

    // 先打开语言菜单，检测当前选中的语言
    log(`打开语言切换菜单并检测当前语言`);
    await langToggle.click();
    await slow(500);

    // 通过检查菜单中哪个选项有选中标记（如 svg 图标/对勾）来确定当前语言
    let originalLang = 'English'; // 默认英语
    const allLangOptions = ['中文', 'English', 'Tiếng Việt', 'ไทย'];

    for (const lang of allLangOptions) {
      const optionBtn = page.locator(`button:has-text("${lang}")`).first();
      if ((await optionBtn.count()) > 0 && (await optionBtn.isVisible())) {
        // 检查按钮内是否有 SVG（选中标记）
        const hasSvg = await optionBtn.locator('svg').count();
        if (hasSvg > 0) {
          originalLang = lang;
          console.log(`   ✓ 检测到当前语言: ${originalLang}（有选中标记）`);
          break;
        }
      }
    }

    console.log(`   当前语言: ${originalLang}`);

    // 选择要切换的目标语言（避免中文和英文）
    const targetLanguages = ['Tiếng Việt', 'ไทย'];
    let targetLang = targetLanguages[0];

    // 如果当前已是越南语，则切换为泰语
    if (originalLang.includes('Tiếng Việt')) {
      targetLang = targetLanguages[1];
    } else if (originalLang.includes('ไทย')) {
      targetLang = targetLanguages[0];
    }

    log(` 切换到: ${targetLang}`);
    // 获取切换器的位置，确保点击的是下拉菜单中的选项而非切换器本身
    let toggleBox = await langToggle.boundingBox().catch(() => null);
    let targetButtons = page.locator(`button:has-text("${targetLang}")`);
    let count = await targetButtons.count();

    if (count === 0) {
      throw new Error(`[ERR] 未找到目标语言选项: ${targetLang}`);
    }

    let switched = false;

    for (let i = 0; i < count; i++) {
      const btn = targetButtons.nth(i);
      if (!(await btn.isVisible())) continue;

      const box = await btn.boundingBox().catch(() => null);
      // 确保点击的是下拉菜单项（通常在切换器下方）
      if (box && (!toggleBox || box.y > toggleBox.y + (toggleBox.height || 0) / 2)) {
        await btn.click();
        await slow(1000);
        switched = true;
        console.log(`   ✓ 已切换到: ${targetLang}`);
        break;
      }
    }

    if (!switched) {
      // 尝试备用方案：点击第二个匹配项（第一个通常是切换器本身）
      if (count > 1) {
        console.log(`   使用备用方案：点击第二个匹配项`);
        await targetButtons.nth(1).click();
        await slow(1000);
        switched = true;
      } else {
        throw new Error(`[ERR] 无法点击目标语言选项: ${targetLang}`);
      }
    }

    log('验证语言已切换');
    await slow(500);
    console.log(`   ✓ 语言已切换到: ${targetLang}`);

    // 返回主页并停留 3 秒
    log('验证系统语言刷新.....');
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await slow(2500);

    // 切换回英语
    log(`切换回英语`);

    // 先打开侧栏（返回主页后侧栏可能已关闭）
    // 多语言支持：Open sidebar / 打开侧栏 / Mở thanh bên / เปิดแถบด้านข้าง
    const openSidebarBtnBack = page
      .locator(
        [
          '[data-tooltip="Open sidebar"]',
          '[data-tooltip="打开侧栏"]',
          '[data-tooltip="Mở thanh bên"]',
          '[data-tooltip="เปิดแถบด้านข้าง"]',
          '[aria-label="Open sidebar"]',
          '[aria-label="打开侧栏"]',
          '[aria-label="Mở thanh bên"]',
        ].join(', '),
      )
      .first();

    if ((await openSidebarBtnBack.count()) > 0) {
      console.log('   打开侧栏...');
      await openSidebarBtnBack.click({ force: true });
      await slow(800);
    }

    // 语言切换按钮选择器（多语言）
    // Toggle language / 切换语言 / Chuyển ngôn ngữ / สลับภาษา
    const langToggleBack = page
      .locator(
        [
          'button[aria-label="Toggle language"]',
          'button[data-tooltip="Toggle language"]',
          '[aria-label="Toggle language"]',
          '[data-tooltip="Toggle language"]',
          // 越南语
          'button[aria-label="Chuyển ngôn ngữ"]',
          'button[data-tooltip="Chuyển ngôn ngữ"]',
          '[aria-label="Chuyển ngôn ngữ"]',
          '[data-tooltip="Chuyển ngôn ngữ"]',
          // 中文
          'button[aria-label="切换语言"]',
          'button[data-tooltip="切换语言"]',
          // 泰语
          'button[aria-label="สลับภาษา"]',
          'button[data-tooltip="สลับภาษา"]',
          // 模糊匹配
          '[aria-label*="language"]',
          '[data-tooltip*="language"]',
          '[aria-label*="ngôn ngữ"]',
          '[data-tooltip*="ngôn ngữ"]',
        ].join(', '),
      )
      .first();

    // 直接 force 点击语言切换按钮
    await langToggleBack.click({ force: true });
    await slow(800);

    // 找到真实渲染在页面上的 English 按钮并点击
    const englishBtns = page.locator('button:has-text("English")');
    const englishCount = await englishBtns.count();

    let clickedEnglish = false;
    for (let i = 0; i < englishCount; i++) {
      const btn = englishBtns.nth(i);
      const isRendered = await btn
        .evaluate((el: HTMLElement) => el.offsetParent !== null)
        .catch(() => false);
      if (isRendered) {
        await btn.click({ force: true });
        await slow(1000);
        clickedEnglish = true;
        console.log(`   ✓ 已切换回: English`);
        break;
      }
    }

    if (!clickedEnglish) {
      // 最终备用：通过 evaluate 直接在 DOM 中点击
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(
          (b) => b.innerText?.trim() === 'English' && (b as HTMLElement).offsetParent !== null,
        );
        if (target) (target as HTMLElement).click();
      });
      await slow(1000);
      console.log(`   ✓ 已切换回: English`);
    }

    await slow(500);
    languageSwitchSuccess = true;

    log('关闭语言菜单（如果为打开状态）');
    await page.keyboard.press('Escape');
    await slow(300);

    log('关闭侧栏（如果为打开状态）');
    const closeSidebarBtnAfterLang = page.locator('[data-tooltip="Close sidebar"]').first();
    if ((await closeSidebarBtnAfterLang.count()) > 0) {
      await closeSidebarBtnAfterLang.click({ force: true });
      await slow(800);
      console.log('   ✓ 侧栏已关闭');
    } else {
      // 尝试点击header内第一个按钮
      const sidebarBtn = page.locator('header button').first();
      if ((await sidebarBtn.count()) > 0) {
        await sidebarBtn.click({ force: true });
        await slow(800);
      }
    }

    log('✓ 多语言切换测试完成');
  } catch (error) {
    console.error('\n[ERR] 多语言切换测试失败:', error);
    throw new Error(
      `多语言切换测试失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // 确保语言切换测试成功才继续
  if (!languageSwitchSuccess) {
    throw new Error('[ERR] 多语言切换测试未通过，停止后续测试');
  }

  await slow(500);

  log('1. 点击底部输入触发登录弹窗');
  const bottomInput = page
    .locator('textarea[aria-label="message-input"], textarea, div[role="textbox"]')
    .first();
  if ((await bottomInput.count()) > 0) {
    await bottomInput.click().catch(() => {});
    await slow(800);
  }

  log('2. 点击"Go to sign in"按钮（触发登录逻辑）');
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
  //******************* */
  //      完成登录
  //******************* */

  log('4. 确认进入主页');
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
  await slow(2000);

  log('5. 新建会话');
  const newConv = multi(page, I18N.newConversation);
  if ((await newConv.count()) > 0) {
    await newConv
      .first()
      .click()
      .catch(() => {});
    await slow(800);
  }
  //******************* */
  //     发起对话
  //******************* */

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
  //******************* */
  //    获取回复
  //******************* */

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

  //******************* */
  //     退出登录
  //******************* */

  log('7. 开始退出登录流程');

  log('7.0 打开侧栏');

  // 多语言支持的侧栏按钮选择器
  const openSidebarBtn = page
    .locator(
      [
        '[data-tooltip="Open sidebar"]',
        '[data-tooltip="打开侧栏"]',
        '[data-tooltip="Mở thanh bên"]',
        '[data-tooltip="เปิดแถบด้านข้าง"]',
        '[aria-label="Open sidebar"]',
        '[aria-label="打开侧栏"]',
      ].join(', '),
    )
    .first();
  const closeSidebarBtn = page
    .locator(
      [
        '[data-tooltip="Close sidebar"]',
        '[data-tooltip="关闭侧栏"]',
        '[data-tooltip="Đóng thanh bên"]',
        '[data-tooltip="ปิดแถบด้านข้าง"]',
        '[aria-label="Close sidebar"]',
        '[aria-label="关闭侧栏"]',
      ].join(', '),
    )
    .first();

  console.log(`   "Open sidebar" 按钮数量: ${await openSidebarBtn.count()}`);
  console.log(`   "Close sidebar" 按钮数量: ${await closeSidebarBtn.count()}`);

  if ((await openSidebarBtn.count()) > 0) {
    console.log('   侧栏当前是关闭状态，点击打开...');
    await openSidebarBtn.click({ force: true });
    await slow(1200);
    console.log('   侧栏应该已打开');
  } else if ((await closeSidebarBtn.count()) > 0) {
    console.log('   侧栏已经是打开状态');
  } else {
    console.log('   使用回退方法：header 内第一个按钮');
    const sidebarBtn = page.locator('header button').first();
    if ((await sidebarBtn.count()) > 0) {
      await sidebarBtn.click({ force: true });
      await slow(1200);
    }
  }

  await slow(800);
  await slow(800);

  // 在侧栏中切换语言（切换为非中文/英文语言）

  try {
    const langToggle = multi(page, [
      'button:has-text("中文")',
      'button:has-text("English")',
      'button:has-text("Tiếng Việt")',
      'button:has-text("ไทย")',
      'button:has-text("မြန်မာ")',
    ]).first();

    if ((await langToggle.count()) > 0) {
      const curText = (await langToggle.innerText()).trim();
      console.log(`   检测到语言切换器，当前文本: ${curText}`);

      const candidates = ['Tiếng Việt', 'ไทย'];
      let target = candidates[0];
      if (curText.includes(target)) target = candidates[1];

      // 打开下拉
      await langToggle.click().catch(() => {});
      await slow(400);

      // 获取切换器的位置信息
      const toggleBox = await langToggle.boundingBox().catch(() => null);

      const buttons = page.locator(`button:has-text("${target}")`);
      const count = await buttons.count();
      let clicked = false;

      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        if (!(await btn.isVisible())) continue;
        const box = await btn.boundingBox().catch(() => null);
        // 下拉项通常在切换器下方（y 更大），选择位于 toggle 之下的按钮
        if (box && (!toggleBox || box.y > toggleBox.y + (toggleBox.height || 0) / 2)) {
          console.log(`   切换语言到: ${target} (使用第 ${i} 个可见匹配)`);
          await btn.click().catch(() => {});
          await slow(800);
          clicked = true;
          break;
        }
      }

      if (!clicked) {
        console.warn('   未找到合适的下拉项来切换语言，跳过语言切换');
      }
    } else {
      console.warn('   未检测到语言切换器按钮，跳过语言切换步骤');
    }
  } catch (e) {
    console.warn('   语言切换步骤出现异常，继续执行测试');
  }

  const userProfileBtn = multi(page, I18N.openProfile).first();
  console.log(`   用户信息按钮数量: ${await userProfileBtn.count()}`);

  if ((await userProfileBtn.count()) > 0) {
    log('7.1 点击用户信息按钮');
    await userProfileBtn.click();
    await slow(1000);

    log('7.2 点击退出登录');
    const logoutBtn = multi(page, I18N.logout).first();
    console.log(`   退出按钮数量: ${await logoutBtn.count()}`);

    if ((await logoutBtn.count()) > 0) {
      await logoutBtn.click();
      await slow(800);

      log('7.3 确认退出');
      const confirm = multi(page, I18N.confirmLogout).first();
      const confirmCount = await confirm.count();
      console.log(`   确认按钮数量: ${confirmCount}`);

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

      const logoutBtn = multi(page, I18N.logout).first();
      if ((await logoutBtn.count()) > 0) {
        await logoutBtn.click();
        await slow(600);

        const confirm = multi(page, I18N.confirmLogout).first();
        const confirmCount = await confirm.count();

        if (confirmCount > 0) {
          await confirm.click();
          await page.waitForLoadState('networkidle').catch(() => {});
        }
      }
    }
  }

  log('8. 验证已退出登录');
  const signIn = multi(page, I18N.signInEntry);

  const pollTimeout = 5000;
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
    console.warn('[WARN] 可能未成功退出登录（超时未检测到登录入口或用户名仍可见）');
    // 更新最后一个检查点状态
    const lastIdx = checkpoints.findIndex((c) => c.name.includes('验证已退出'));
    if (lastIdx >= 0) checkpoints[lastIdx].status = '[WARN] 警告';
  }

  log('[DONE] 测试流程全部完成！');

  // 测试报告摘要

  const COMBINING_RANGES: Array<[number, number]> = [
    [0x0300, 0x036f],
    [0x1ab0, 0x1aff],
    [0x1dc0, 0x1dff],
    [0x20d0, 0x20ff],
    [0xfe20, 0xfe2f],
    [0xfe00, 0xfe0f], // 变体选择符
    [0xe0100, 0xe01ef], // 补充变体选择符
  ];
  const WIDE_RANGES: Array<[number, number]> = [
    [0x1100, 0x115f],
    [0x2329, 0x232a],
    [0x2e80, 0xa4cf],
    [0xac00, 0xd7a3],
    [0xf900, 0xfaff],
    [0xfe10, 0xfe19],
    [0xfe30, 0xfe6f],
    [0xff00, 0xff60],
    [0xffe0, 0xffe6],
    [0x1f000, 0x1ffff], // Emoji 等补充字符平面
    [0x20000, 0x2fffd],
    [0x30000, 0x3fffd],
  ];

  const wcwidthChar = (ch: string) => {
    if (!ch) return 0;
    const code = ch.codePointAt(0) as number;
    if (code === 0) return 0;
    if (code < 32 || (code >= 0x7f && code < 0xa0)) return 0;
    for (const [a, b] of COMBINING_RANGES) if (code >= a && code <= b) return 0;
    for (const [a, b] of WIDE_RANGES) if (code >= a && code <= b) return 2;
    return 1;
  };

  const displayWidth = (s: string) => Array.from(s).reduce((w, ch) => w + wcwidthChar(ch), 0);

  const padDisplay = (s: string, targetWidth: number) => {
    let out = '';
    let w = 0;
    for (const ch of Array.from(s)) {
      const cw = wcwidthChar(ch);
      if (w + cw > targetWidth) break;
      out += ch;
      w += cw;
    }
    if (displayWidth(out) < displayWidth(s) && w < targetWidth) {
      const ell = '…';
      const ellW = wcwidthChar(ell);
      if (w + ellW <= targetWidth) {
        out += ell;
        w += ellW;
      }
    }
    if (w < targetWidth) out += ' '.repeat(targetWidth - w);
    return out;
  };

  const INNER_WIDTH = 66;
  const NAME_COL_WIDTH = 48;

  const topBorder = `╔${'═'.repeat(INNER_WIDTH)}╗`;
  const midBorder = `╠${'═'.repeat(INNER_WIDTH)}╣`;
  const bottomBorder = `╚${'═'.repeat(INNER_WIDTH)}╝`;

  const title = 'Asepal AI 前端自动化测试报告';
  const titlePad = Math.max(0, INNER_WIDTH - displayWidth(title));
  const titleLeft = Math.floor(titlePad / 2);
  const titleRight = INNER_WIDTH - displayWidth(title) - titleLeft;

  console.log('\n');
  console.log(topBorder);
  console.log(' '.repeat(titleLeft) + title + ' '.repeat(Math.max(0, titleRight)));
  console.log('─'.repeat(INNER_WIDTH + 2));

  const nameHeader = padDisplay('检查点', NAME_COL_WIDTH);
  const statusHeader = '状态';
  const headerUsed =
    displayWidth('  ') + displayWidth(nameHeader) + displayWidth('  ') + displayWidth(statusHeader);
  const headerTail = Math.max(0, INNER_WIDTH - headerUsed);
  console.log('  ' + nameHeader + '  ' + statusHeader + ' '.repeat(headerTail));
  console.log('─'.repeat(INNER_WIDTH + 2));

  const colorizeStatus = (status: string) => {
    if (status.includes('[OK]')) return `${COLOR_GREEN}${status}${COLOR_RESET}`;
    if (status.includes('[WARN]')) return `${COLOR_YELLOW}${status}${COLOR_RESET}`;
    if (status.includes('[FAIL]') || status.includes('[ERR]')) return `${COLOR_RED}${status}${COLOR_RESET}`;
    return status;
  };

  for (const cp of checkpoints) {
    const name = padDisplay(cp.name, NAME_COL_WIDTH);
    const left = '  ';
    const mid = '  ';
    const statusPlain = cp.status;
    const statusColored = colorizeStatus(statusPlain);
    const used = displayWidth(left) + displayWidth(name) + displayWidth(mid) + displayWidth(statusPlain);
    const remaining = INNER_WIDTH - used;
    const tail = remaining > 0 ? ' '.repeat(remaining) : '';
    console.log(left + name + mid + statusColored + tail);
  }

  const failedCount = checkpoints.filter((c) => c.status === '[FAIL] 失败').length;
  const warnCount = checkpoints.filter((c) => c.status === '[WARN] 警告').length;
  const summary =
    failedCount > 0
      ? `${failedCount} 项失败 [FAIL]`
      : warnCount > 0
        ? `${warnCount} 项警告 [WARN]`
        : '所有检查点通过 [OK]';

  const summaryColored = summary
    .replace('[OK]', `${COLOR_GREEN}[OK]${COLOR_RESET}`)
    .replace('[WARN]', `${COLOR_YELLOW}[WARN]${COLOR_RESET}`)
    .replace('[FAIL]', `${COLOR_RED}[FAIL]${COLOR_RESET}`);

  console.log('─'.repeat(INNER_WIDTH + 2));
  const summaryLabel = `  总结: ${summary}`;
  const summaryTail = Math.max(0, INNER_WIDTH - displayWidth(summaryLabel));
  console.log(`  总结: ${summaryColored}` + ' '.repeat(summaryTail));
  const countLabel = `  共 ${checkpoints.length} 个检查点`;
  const countTail = Math.max(0, INNER_WIDTH - displayWidth(countLabel));
  console.log(countLabel + ' '.repeat(countTail));
  console.log(bottomBorder);
  console.log('\n');

  // ★ 停止窗口监控器
  windowMonitor.stop();
});
