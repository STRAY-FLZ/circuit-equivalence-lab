// Focused live verification after the application and website entry are deployed.
async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const homepage = 'https://stray-flz.github.io/stray-articles/';
  const appUrl = 'https://stray-flz.github.io/circuit-equivalence-lab/';
  const description = '交互式电路等效变换与电阻网络学习工具，支持串并联、Y-Δ 变换及逐步推导。';
  const existing = [
    { title: 'PDF 与 Word 互转', href: 'https://stray-flz.github.io/stray-articles/tools/pdf-word/index.html' },
    { title: '视频下载与音轨分离', href: 'https://stray-flz.github.io/stray-articles/tools/video/index.html' },
    { title: 'agent入门', href: 'https://stray-agent-learning.stray9728.chatgpt.site/' },
    { title: '英语背词', href: 'https://stray-flz.github.io/stray-vocabulary-site/' },
  ];
  const errors = [];
  const failed = [];
  const journeys = [];
  const onError = error => errors.push(error.message);
  const onConsole = message => { if (message.type() === 'error') errors.push(message.text()); };
  const onResponse = response => { if (response.status() >= 400) failed.push({ url: response.url(), status: response.status() }); };
  const onFailed = request => failed.push({ url: request.url(), failure: request.failure()?.errorText });
  page.on('pageerror', onError);
  page.on('console', onConsole);
  page.on('response', onResponse);
  page.on('requestfailed', onFailed);
  page.setDefaultTimeout(15000);
  try {
    await page.goto(homepage, { waitUntil: 'networkidle' });
    await page.getByRole('switch', { name: '夜间模式' }).waitFor();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
      for (const theme of ['light', 'dark']) {
        await page.goto(homepage);
        const toggle = page.getByRole('switch', { name: '夜间模式' });
        if (await toggle.getAttribute('aria-checked') !== String(theme === 'dark')) await toggle.click();
        await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '工具', exact: true }).click();
        await page.waitForURL(/\/stray-articles\/tools\/(index\.html)?$/);
        await page.getByRole('heading', { name: '工具', exact: true }).waitFor();
        const entries = await page.locator('a.tool-entry').evaluateAll(elements => elements.map(element => ({
          title: element.querySelector('h2').textContent, href: element.href,
          description: element.querySelector('p').textContent,
        })));
        assert(entries.length === 5, 'The tools page does not contain five entries');
        assert(existing.every((entry, index) => entries[index].title === entry.title && entries[index].href === entry.href), 'Existing tool titles, order or destinations changed');
        assert(entries[4].title === '电路实验室' && entries[4].href === appUrl && entries[4].description === description, 'Circuit tool entry does not match the requested content');
        assert((await page.locator('.category-count').innerText()).startsWith('5 个工具'), 'Tool count was not updated');
        const geometry = await page.evaluate(() => ({ theme: globalThis.document.documentElement.dataset.theme,
          viewport: globalThis.innerWidth, width: globalThis.document.documentElement.scrollWidth }));
        assert(geometry.theme === theme && geometry.viewport === geometry.width, 'Tools theme or mobile layout is incorrect');
        await page.evaluate(() => globalThis.scrollTo(0, 0));
        await page.screenshot({ path: `output/playwright/m8-tools-${width}-${theme}.png`, fullPage: true });
        const toolsUrl = page.url();
        await page.getByRole('link', { name: '电路实验室', exact: true }).click();
        await page.waitForURL(appUrl);
        await page.getByRole('heading', { name: '电路等效变换实验室', exact: true }).waitFor();
        assert(await page.getByRole('switch', { name: '夜间模式' }).getAttribute('aria-checked') === String(theme === 'dark'), 'Application did not inherit the website theme');
        await page.getByRole('group', { name: '原始电路图', exact: true }).waitFor();
        await page.getByRole('link', { name: '返回首页', exact: true }).click();
        await page.waitForURL(homepage);
        assert(await page.getByRole('switch', { name: '夜间模式' }).getAttribute('aria-checked') === String(theme === 'dark'), 'Return-home lost the shared theme');
        journeys.push({ width, theme, flow: [homepage, toolsUrl, appUrl, page.url()] });
      }
    }

    // Different project paths under github.io must synchronize in both directions.
    const peer = await page.context().newPage();
    try {
      await peer.goto(appUrl);
      await peer.getByRole('switch', { name: '夜间模式' }).click();
      await page.waitForFunction(() => globalThis.document.documentElement.dataset.theme === 'light');
      await page.getByRole('switch', { name: '夜间模式' }).click();
      await peer.waitForFunction(() => globalThis.document.documentElement.dataset.theme === 'dark');
      await peer.reload();
      assert(await peer.getByRole('switch', { name: '夜间模式' }).getAttribute('aria-checked') === 'true', 'Shared preference did not persist after reload');
    } finally { await peer.close(); }

    const availability = [];
    const toolPage = await page.context().newPage();
    try {
      for (const entry of existing) {
        const response = await toolPage.goto(entry.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const title = await toolPage.title();
        assert(response.status() === 200 && title.length > 0, `Existing tool entry is unavailable: ${entry.title} (${response.status()})`);
        availability.push({ ...entry, status: response.status(), title });
      }
    } finally { await toolPage.close(); }
    assert(errors.length === 0 && failed.length === 0, `Navigation browser errors: ${JSON.stringify({ errors, failed })}`);
    return { journeys, existing: availability, crossProjectThemeSync: 'passed in both directions and after reload', errors, failed };
  } finally {
    page.off('pageerror', onError);
    page.off('console', onConsole);
    page.off('response', onResponse);
    page.off('requestfailed', onFailed);
  }
}
