// Playwright CLI replay for the local app; no hosted deployment is required.
async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const homepage = 'https://stray-flz.github.io/stray-articles/';
  const appUrl = page.url().split('#')[0];
  const context = page.context();
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.evaluate(() => globalThis.localStorage.setItem('stray-theme', 'dark'));

  // Hold the React entry request: the head initializer must already choose dark.
  let resume;
  const heldRequest = new Promise(resolve => { resume = resolve; });
  await page.route('**/src/main.tsx*', route => resume(route));
  await page.goto(appUrl, { waitUntil: 'commit' });
  const heldRoute = await heldRequest;
  await page.waitForFunction(() => globalThis.document.documentElement.dataset.theme === 'dark');
  assert(await page.locator('#root').innerHTML() === '', 'Theme initialization waited for React');
  await heldRoute.continue();
  await page.unroute('**/src/main.tsx*');
  await page.getByRole('switch', { name: '夜间模式' }).waitFor();
  assert(await page.getByRole('switch').getAttribute('aria-checked') === 'true', 'Switch disagrees with bootstrap');

  const peer = await context.newPage();
  try {
    await peer.goto(appUrl);
    await peer.getByRole('switch', { name: '夜间模式' }).click();
    await page.waitForFunction(() => globalThis.document.documentElement.dataset.theme === 'light');
    await page.reload();
    assert(await page.getByRole('switch').getAttribute('aria-checked') === 'false', 'Manual preference did not persist');
    await page.emulateMedia({ colorScheme: 'dark' });
    assert(await page.evaluate(() => globalThis.document.documentElement.dataset.theme) === 'light', 'System overrode manual preference');
    await peer.evaluate(() => globalThis.localStorage.removeItem('stray-theme'));
    await page.waitForFunction(() => globalThis.document.documentElement.dataset.theme === 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => globalThis.document.documentElement.dataset.theme === 'light');
  } finally { await peer.close(); }

  const restricted = await context.newPage();
  try {
    await restricted.addInitScript(() => {
      globalThis.Storage.prototype.getItem = () => { throw new Error('Restricted storage'); };
      globalThis.Storage.prototype.setItem = () => { throw new Error('Restricted storage'); };
    });
    await restricted.emulateMedia({ colorScheme: 'dark' });
    await restricted.goto(appUrl);
    assert(await restricted.getByRole('switch').getAttribute('aria-checked') === 'true', 'Restricted storage broke initialization');
    await restricted.getByRole('switch').click();
    assert(await restricted.getByRole('switch').getAttribute('aria-checked') === 'false', 'Restricted storage broke switching');
  } finally { await restricted.close(); }

  await page.setViewportSize({ width: 1440, height: 1100 });
  const brand = page.getByRole('link', { name: 'Stray，返回首页' });
  const home = page.getByRole('link', { name: '返回首页', exact: true });
  assert(await brand.getAttribute('href') === homepage && await home.getAttribute('href') === homepage, 'Homepage link is relative or incorrect');
  const header = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const styles = globalThis.getComputedStyle(root);
    return { width: globalThis.document.querySelector('.header-inner').getBoundingClientRect().width,
      height: globalThis.document.querySelector('.header-inner').getBoundingClientRect().height,
      paper: styles.getPropertyValue('--paper').trim(), blue: styles.getPropertyValue('--blue').trim() };
  });
  assert(header.width === 1240 && header.height === 92 && header.paper === '#f4f5f6' && header.blue === '#284b79', 'Desktop reference tokens/proportions mismatch');
  await page.getByRole('group', { name: '可用变换候选' }).getByRole('button').first().click();
  await page.getByRole('button', { name: '预览等效变换', exact: true }).click();
  assert((await page.getByRole('status').innerText()).includes('验证通过'), 'Styled preview failed');
  assert(await page.getByRole('group', { name: '变换后电路图' }).locator('g[data-state="replacement"]').count() === 1, 'Replacement highlighting missing');
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.screenshot({ path: 'output/playwright/m7-after-desktop-light.png', fullPage: true });

  await page.getByRole('combobox').selectOption('delta3');
  await page.getByRole('group', { name: '可用变换候选' }).getByRole('button').first().click();
  await page.getByRole('button', { name: '开始分步学习', exact: true }).click();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '下一步', exact: true }).click();
  assert((await page.getByLabel('数值代入').innerText()).includes('(3 × 3) / (3 + 3 + 3) = 1 Ω'), 'Styled MathML lost content');
  await page.getByRole('switch').click();
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.screenshot({ path: 'output/playwright/m7-after-desktop-dark.png', fullPage: true });
  const samples = [];
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
    for (const theme of ['light', 'dark']) {
      if (await page.evaluate(() => globalThis.document.documentElement.dataset.theme) !== theme) await page.getByRole('switch').click();
      const metrics = await page.evaluate(() => {
        const toggle = globalThis.document.querySelector('.theme-toggle').getBoundingClientRect();
        const home = globalThis.document.querySelector('.return-home').getBoundingClientRect();
        const separator = globalThis.document.querySelector('.header-separator').getBoundingClientRect();
        const math = globalThis.document.querySelector('math');
        return { width: globalThis.innerWidth, pageWidth: globalThis.document.documentElement.scrollWidth,
          order: toggle.right < separator.left && separator.right < home.left, touchHeight: Math.min(toggle.height, home.height),
          math: math.namespaceURI, mathWidth: math.getBoundingClientRect().width,
          motion: globalThis.getComputedStyle(globalThis.document.querySelector('.theme-toggle__thumb')).transitionDuration,
          diagrams: globalThis.getComputedStyle(globalThis.document.querySelector('.diagram-grid')).gridTemplateColumns };
      });
      assert(metrics.pageWidth === width && metrics.order && metrics.touchHeight >= 44, 'Header or page overflow/touch target defect');
      assert(metrics.math === 'http://www.w3.org/1998/Math/MathML' && metrics.mathWidth > 0 && metrics.motion === '0s', 'MathML/reduced motion defect');
      samples.push({ theme, ...metrics });
    }
  }
  await page.getByRole('combobox').selectOption('parallel');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '下一步', exact: true }).click();
  for (const theme of ['light', 'dark']) {
    if (await page.evaluate(() => globalThis.document.documentElement.dataset.theme) !== theme) await page.getByRole('switch').click();
    const row = page.getByLabel('数值代入').locator('.equation-row');
    await row.press('ArrowRight');
    await page.waitForFunction(() => globalThis.document.querySelector('[aria-label="数值代入"] .equation-row').scrollLeft > 0);
    await page.evaluate(() => globalThis.scrollTo(0, 0));
    await page.waitForFunction(() => globalThis.scrollY === 0);
    await page.screenshot({ path: 'output/playwright/m7-after-mobile-' + theme + '.png', fullPage: true });
  }
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  await page.getByRole('button', { name: '下一步', exact: true }).press('Enter');
  assert((await page.getByRole('status').innerText()).includes('已验证'), 'Lesson final navigation failed');
  await page.getByRole('button', { name: '上一步', exact: true }).press('Space');
  await page.getByRole('button', { name: '重新开始课程', exact: true }).click();
  await page.getByRole('button', { name: '退出学习模式', exact: true }).click();
  assert(await page.getByRole('group', { name: '变换后电路图' }).count() === 1, 'Exit lost cached preview');
  await page.getByRole('button', { name: '重置预览', exact: true }).click();
  assert(await page.getByRole('group', { name: '变换后电路图' }).count() === 0, 'Reset failed');

  await home.click();
  await page.waitForURL(homepage);
  await page.goBack();
  await page.getByRole('switch', { name: '夜间模式' }).waitFor();
  // Reach the header through Tab, verifying the visible focus treatment.
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    if (await page.getByRole('switch').evaluate(el => el === globalThis.document.activeElement)) break;
  }
  const focus = await page.getByRole('switch').evaluate(el => ({ active: el === globalThis.document.activeElement, visible: el.matches(':focus-visible'), outline: globalThis.getComputedStyle(el).outlineWidth }));
  assert(focus.active && focus.visible && focus.outline === '3px', 'Header keyboard focus missing');
  return { bootstrapBeforeReact: true, crossPageSync: true, restrictedStorage: true, header, samples, focus, actualHomeNavigation: true };
}
