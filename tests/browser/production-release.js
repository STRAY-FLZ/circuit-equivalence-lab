// Playwright CLI replay against a loaded public app or built project-path preview.
async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const appUrl = page.url().split(/[?#]/)[0];
  const homepage = 'https://stray-flz.github.io/stray-articles/';
  const errors = [];
  const missing = [];
  const assets = [];
  const onError = error => errors.push(error.message);
  const onConsole = message => { if (message.type() === 'error') errors.push(message.text()); };
  const onResponse = response => {
    if (response.status() >= 400) missing.push({ url: response.url(), status: response.status() });
    if (/\.(js|css)(\?|$)/.test(response.url())) assets.push({ url: response.url(), status: response.status() });
  };
  const onFailed = request => missing.push({ url: request.url(), failure: request.failure()?.errorText });
  page.on('pageerror', onError);
  page.on('console', onConsole);
  page.on('response', onResponse);
  page.on('requestfailed', onFailed);
  page.setDefaultTimeout(15000);
  const viewports = [];
  try {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.evaluate(() => globalThis.localStorage.setItem('stray-theme', 'light'));
    const response = await page.reload({ waitUntil: 'networkidle' });
    assert(response.status() === 200, 'Application entry did not return HTTP 200');
    await page.getByRole('heading', { name: '电路等效变换实验室', exact: true }).waitFor();
    const resources = await page.evaluate(() => [...globalThis.document.querySelectorAll('script[src],link[rel="stylesheet"],link[rel="icon"]')]
      .map(element => element.getAttribute('src') || element.getAttribute('href')));
    assert(resources.every(url => url.startsWith('/circuit-equivalence-lab/')), 'Asset escaped the production project path');
    assert(!resources.some(url => url.includes('/src/')), 'Production HTML referenced a development module');
    for (const resource of resources) {
      const assetResponse = await page.request.get(new URL(resource, appUrl).href);
      assert(assetResponse.status() === 200, `Asset did not load: ${resource}`);
    }

    for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.locator('#example').selectOption('delta3');
      await page.getByRole('group', { name: '可用变换候选' }).getByRole('button', { name: /Δ → Y/ }).click();
      await page.getByRole('button', { name: '预览等效变换', exact: true }).click();
      assert((await page.getByRole('status').innerText()).includes('验证通过'), 'Delta-to-star preview failed');
      assert(await page.locator('svg.circuit-svg').count() === 2, 'Before/after SVG diagrams missing');
      const replacement = page.getByRole('group', { name: '变换后电路图', exact: true });
      assert(await replacement.locator('.resistor-symbol').count() === 3, 'Star preview resistor count is incorrect');
      const labels = await replacement.locator('[data-element-id]').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')));
      assert(labels.every(label => label.includes('1 Ω')), 'Symmetric delta preview did not produce three 1-ohm resistors');
      await page.getByRole('button', { name: '开始分步学习', exact: true }).click();
      const lesson = page.getByRole('region', { name: '分步学习', exact: true });
      const stages = [];
      let mathCount = 0;
      for (let step = 1; step <= 5; step++) {
        const heading = await lesson.getByRole('heading', { level: 2 }).innerText();
        assert(heading.startsWith(`第 ${step} / 5 步`), `Lesson stage ${step} is missing`);
        stages.push(heading);
        if (step === 2 || step === 3) {
          const math = await lesson.locator('math').evaluateAll(elements => elements.map(element => ({
            namespace: element.namespaceURI, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height,
          })));
          assert(math.length > 0 && math.every(item => item.namespace === 'http://www.w3.org/1998/Math/MathML' && item.width > 0 && item.height > 0), 'Native MathML formulas did not render');
          mathCount += math.length;
        }
        if (step < 5) await lesson.getByRole('button', { name: '下一步', exact: true }).click();
      }
      assert((await lesson.getByRole('status').innerText()).includes('已验证'), 'Final lesson evidence is missing');
      assert(await lesson.getByRole('table', { name: '端口等效电阻对照' }).locator('tbody tr').count() === 3, 'Final lesson did not compare all three terminal pairs');
      const themes = [];
      for (const theme of ['light', 'dark']) {
        const toggle = page.getByRole('switch', { name: '夜间模式' });
        if (await toggle.getAttribute('aria-checked') !== String(theme === 'dark')) await toggle.click();
        const geometry = await page.evaluate(() => ({
          theme: globalThis.document.documentElement.dataset.theme,
          viewport: globalThis.innerWidth, width: globalThis.document.documentElement.scrollWidth,
          paper: globalThis.getComputedStyle(globalThis.document.documentElement).getPropertyValue('--paper').trim(),
        }));
        assert(geometry.theme === theme && geometry.width === geometry.viewport, 'Theme or responsive page width is incorrect');
        assert(geometry.paper === (theme === 'light' ? '#f4f5f6' : '#1b1b1d'), 'M7 theme palette changed');
        themes.push(geometry);
        await page.evaluate(() => globalThis.scrollTo(0, 0));
        await page.screenshot({ path: `output/playwright/m8-production-${viewport.width}-${theme}.png`, fullPage: true });
      }
      viewports.push({ viewport, preview: 'three 1-ohm star resistors', stages, mathCount, themes });
      await lesson.getByRole('button', { name: '退出学习模式' }).click();
    }

    await page.reload({ waitUntil: 'networkidle' });
    assert(await page.getByRole('switch', { name: '夜间模式' }).getAttribute('aria-checked') === 'true', 'Direct refresh lost the saved dark theme');
    await page.getByRole('group', { name: '原始电路图', exact: true }).waitFor();
    const home = page.getByRole('link', { name: '返回首页', exact: true });
    assert(await home.getAttribute('href') === homepage, 'Return-home destination is incorrect');
    await home.click();
    await page.waitForURL(homepage);
    await page.getByRole('navigation', { name: '主导航' }).waitFor();
    if (new URL(appUrl).origin === new URL(homepage).origin) {
      assert(await page.evaluate(() => globalThis.document.documentElement.dataset.theme) === 'dark', 'Homepage did not inherit the application theme');
    }
    assert(assets.some(asset => asset.url.includes('/circuit-equivalence-lab/assets/') && asset.url.endsWith('.js')), 'No production JavaScript request observed');
    assert(assets.some(asset => asset.url.includes('/circuit-equivalence-lab/assets/') && asset.url.endsWith('.css')), 'No production stylesheet request observed');
    assert(errors.length === 0 && missing.length === 0, `Browser errors or failed requests: ${JSON.stringify({ errors, missing })}`);
    return { appUrl, resources, viewports, refresh: 'passed', returnHome: page.url(), errors, missing, assets };
  } finally {
    page.off('pageerror', onError);
    page.off('console', onConsole);
    page.off('response', onResponse);
    page.off('requestfailed', onFailed);
  }
}
