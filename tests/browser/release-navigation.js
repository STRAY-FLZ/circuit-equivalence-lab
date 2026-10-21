// Focused production website -> tool -> return-home acceptance. No website mutations.
async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const homepage = 'https://stray-flz.github.io/stray-articles/';
  const appUrl = 'https://stray-flz.github.io/circuit-equivalence-lab/';
  const errors = [], failed = [], journeys = [];
  const onError = error => errors.push(error.message);
  const onConsole = message => { if (message.type() === 'error') errors.push(message.text()); };
  const onResponse = response => { if (response.status() >= 400) failed.push({ url: response.url(), status: response.status() }); };
  const onFailed = request => failed.push({ url: request.url(), failure: request.failure()?.errorText });
  page.on('pageerror', onError); page.on('console', onConsole);
  page.on('response', onResponse); page.on('requestfailed', onFailed);
  page.setDefaultTimeout(20000);
  try {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
      for (const theme of ['light', 'dark']) {
        await page.goto(homepage, { waitUntil: 'networkidle' });
        const toggle = page.getByRole('switch', { name: '夜间模式' });
        if (await toggle.getAttribute('aria-checked') !== String(theme === 'dark')) await toggle.click();
        await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '工具', exact: true }).click();
        await page.waitForURL(/\/stray-articles\/tools\/(index\.html)?$/);
        const entry = page.getByRole('link', { name: '电路实验室', exact: true });
        assert(await entry.getAttribute('href') === appUrl, 'Production tool destination');
        await entry.click();
        await page.waitForURL(appUrl);
        assert((await page.getByLabel('应用版本', { exact: true }).innerText()).includes('v2.0.0'), 'Live release version');
        await page.getByRole('group', { name: '原始电路图', exact: true }).waitFor();
        assert(await page.getByRole('switch', { name: '夜间模式' }).getAttribute('aria-checked') === String(theme === 'dark'), 'Inherited theme');
        await page.screenshot({ path: `output/playwright/release-live-navigation-${width}-${theme}.png`, fullPage: true });
        await page.getByRole('link', { name: '返回首页', exact: true }).click();
        await page.waitForURL(homepage);
        assert(await page.getByRole('switch', { name: '夜间模式' }).getAttribute('aria-checked') === String(theme === 'dark'), 'Return-home theme');
        journeys.push({ width, theme, path: 'homepage -> tools -> V2.0.0 -> homepage' });
      }
    }
    assert(errors.length === 0 && failed.length === 0, JSON.stringify({ errors, failed }));
    return { browser: await page.context().browser().version(), journeys, errors, failed };
  } finally {
    page.off('pageerror', onError); page.off('console', onConsole);
    page.off('response', onResponse); page.off('requestfailed', onFailed);
  }
}
