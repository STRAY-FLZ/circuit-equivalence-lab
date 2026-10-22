// Existing Playwright CLI. Open the built preview or actual public app first.
// Synthetic schema-1 fixtures in output/playwright are generated from tests/dc-fixtures.ts.
async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const url = page.url(), prefix = new URL(url).hostname === '127.0.0.1' ? 'dc-local' : 'dc-live';
  const errors = [], failed = [], journeys = [], dialogs = [];
  const onError = e => errors.push(e.message), onConsole = m => { if (m.type() === 'error') errors.push(m.text()); };
  const onResponse = r => { if (r.status() >= 400) failed.push({ url: r.url(), status: r.status() }); }, onFailed = r => failed.push({ url: r.url(), error: r.failure()?.errorText });
  const onDialog = async d => { dialogs.push(d.message()); await d.accept(); };
  page.on('pageerror', onError); page.on('console', onConsole); page.on('response', onResponse); page.on('requestfailed', onFailed); page.on('dialog', onDialog);
  page.setDefaultTimeout(15000);
  try {
    await page.goto(url); await page.evaluate(() => { globalThis.__dcVerification = { status: 'running' }; });
    await page.setViewportSize({ width: 1440, height: 1100 });
    const button = name => page.getByRole('button', { name, exact: true }), status = page.getByRole('status', { name: '直流分析状态' });
    const save = async (name, report = false) => { const pending = page.waitForEvent('download'); await button(report ? '导出直流分析报告 JSON' : '导出工程').click(); const path = `output/playwright/${prefix}-${name}`; await (await pending).saveAs(path); return path; };
    const analyze = async () => { await button('运行直流分析').click(); await status.filter({ hasText: '分析完成' }).waitFor(); };
    const row = ref => page.getByRole('region', { name: '支路结果表' }).getByRole('row').filter({ has: page.getByRole('button', { name: ref, exact: true }) });
    const check = async (ref, volts, amps, watts) => {
      const values = await row(ref).getByRole('cell').allTextContents();
      for (const [i, expected] of [[1, volts], [2, amps], [3, watts]]) assert(Math.abs(Number(values[i]) - expected) <= 1e-9 * Math.max(1, Math.abs(expected)), `${ref} value ${i}: ${values[i]} vs ${expected}`);
    };
    assert((await page.getByLabel('应用版本', { exact: true }).innerText()).includes('v2.3.0'), 'actual application version');
    const resources = await page.evaluate(() => [...globalThis.document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(e => e.getAttribute('src') || e.getAttribute('href')));
    assert(resources.every(s => s.startsWith('/circuit-equivalence-lab/')), 'production base');
    for (const resource of resources) assert((await page.request.get(new URL(resource, url).href)).status() === 200, `resource ${resource}`);
    await button('典型电路图谱').click();
    const search = page.getByRole('searchbox', { name: '搜索电路图谱' });
    await search.fill('电压源与电阻负载'); await page.locator('[data-template-id="voltage-load"]').click();
    await button('使用直流分析').click();
    assert(await page.getByRole('region', { name: '直流分析面板' }).isVisible(), 'direct Atlas DC mode');
    const reference = page.getByLabel('直流参考节点', { exact: true });
    assert((await reference.inputValue()).length > 0, 'visible COM/B reference');
    await reference.selectOption({ label: await reference.locator('option:checked').innerText() });
    await analyze(); await check('R1', 5, .005, .025); await check('V1', 5, -.005, -.025);
    await page.getByText('实际 MNA 方程与矩阵', { exact: true }).click();
    assert((await page.getByRole('region', { name: 'MNA 矩阵' }).innerText()).includes('0.001'), 'actual stamped conductance');
    await row('R1').getByRole('button').click();
    assert(await page.locator('.editor-component.dc-highlight').count() === 1, 'schematic branch highlight');
    assert((await page.locator('.dc-annotation').textContent()).includes('0.005 A'), 'schematic numerical annotation');
    const component = button('R1 元件'), id = await component.getAttribute('data-component-id');
    await component.click(); await page.getByLabel('电阻值', { exact: true }).fill('2000'); await button('应用属性').click();
    assert((await status.innerText()).includes('结果已过期'), 'changed resistance invalidates');
    assert(await page.getByRole('region', { name: '支路结果表' }).count() === 0 && await page.locator('.dc-annotation').count() === 0, 'stale values/highlight hidden');
    await analyze(); await check('R1', 5, .0025, .0125);
    assert(await component.getAttribute('data-component-id') === id, 'editing retains UUID');
    await save('load-report.json', true); const saved = await save('load.straylab.json');
    await button('新建工程').click(); await page.getByLabel('打开工程文件', { exact: true }).setInputFiles(saved);
    await page.getByRole('status').filter({ hasText: '工程已打开' }).waitFor();
    assert(await component.getAttribute('data-component-id') === id, 'native file reopen retains UUID');
    await button('直流分析').click(); await reference.selectOption({ label: (await reference.locator('option').allTextContents()).find(t => t.includes('COM ·') || t.includes('B ·')) });
    await analyze(); await check('R1', 5, .0025, .0125); await save('load-reopened.straylab.json');
    // Source changes invalidate as well; undo produces a new revision and still requires rerun.
    await button('V1 元件').click(); await page.getByLabel('电压值', { exact: true }).fill('10'); await button('应用属性').click();
    assert((await status.innerText()).includes('结果已过期'), 'changed source invalidates');
    await analyze(); await check('R1', 10, .005, .05); await button('撤销').click();
    assert((await status.innerText()).includes('结果已过期'), 'undo revision invalidates'); await analyze(); await check('R1', 5, .0025, .0125);
    journeys.push('Atlas direct entry, reference, MNA/V/I/P, highlight, resistor/source edits, stale/rerun, native save/reopen, undo');
    await page.getByText('实际 MNA 方程与矩阵', { exact: true }).click();
    for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
      const toggle = page.getByRole('switch', { name: '夜间模式' }); if (await toggle.getAttribute('aria-checked') !== String(theme === 'dark')) await toggle.click();
      assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1), 'no page overflow');
      await page.getByRole('region', { name: '直流分析面板' }).screenshot({ path: `output/playwright/${prefix}-${width}-${theme}.png` });
      journeys.push(`${width}px ${theme} real DC results/equations`);
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    // Four source families use independently hand-checked fixtures through the real file/editor path.
    for (const [kind, volts] of [['vcvs', 6], ['vccs', -6], ['ccvs', 2], ['cccs', -6]]) {
      await page.getByLabel('打开工程文件', { exact: true }).setInputFiles(`output/playwright/dc-${kind}.straylab.json`);
      await page.getByRole('status').filter({ hasText: '工程已打开' }).waitFor(); await button('直流分析').click();
      await analyze(); await check('R1', volts, volts / 1000, volts * volts / 1000);
      await save(`${kind}-report.json`, true);
      await button('D1 元件').click();
      if (kind === 'ccvs' || kind === 'cccs') assert(await page.getByLabel('控制电流支路').inputValue() === await button('V0 元件').getAttribute('data-component-id'), 'stable zero-V control UUID');
      else assert(await button('D1.3 引脚').count() === 1 && await button('D1.4 引脚').count() === 1, 'distinct voltage control pins');
      await page.getByRole('application', { name: '原理图编辑画布' }).screenshot({ path: `output/playwright/${prefix}-${kind}-schematic.png` });
      if (kind === 'cccs') { const savedControl = await save('controlled.straylab.json'); await page.getByLabel('打开工程文件', { exact: true }).setInputFiles(savedControl); await page.getByRole('status').filter({ hasText: '工程已打开' }).waitFor(); await button('直流分析').click(); await analyze(); await check('R1', -6, -.006, .036); await save('controlled-reopened.straylab.json'); }
      journeys.push(`${kind}: actual file/editor/result ${volts} V`);
    }
    await page.getByLabel('打开工程文件', { exact: true }).setInputFiles('output/playwright/dc-legacy.straylab.json');
    await page.getByRole('status').filter({ hasText: '工程已打开' }).waitFor(); await button('直流分析').click(); await analyze(); await check('R1', 10, .01, .1);
    journeys.push('exact legacy empty-binding source adapter');
    for (const [file, code] of [['floating', 'DC_UNDERDETERMINED'], ['contradiction', 'DC_INCONSISTENT'], ['unknown-binding', 'DC_MODEL_UNSUPPORTED']]) {
      await page.getByLabel('打开工程文件', { exact: true }).setInputFiles(`output/playwright/dc-${file}.straylab.json`);
      await page.getByRole('status').filter({ hasText: '工程已打开' }).waitFor(); await button('直流分析').click(); await button('运行直流分析').click();
      await page.getByRole('alert').filter({ hasText: code }).waitFor(); assert(await page.getByRole('region', { name: '支路结果表' }).count() === 0, 'no fabricated singular result');
      journeys.push(`${file}: explicit ${code}`);
    }
    await button('典型电路图谱').click(); await search.fill('RC 充电'); await page.locator('[data-template-id="rc-charge-topology"]').click();
    assert(await button('使用直流分析').count() === 0, 'unsupported template has no DC action');
    await button('在编辑器中打开').click(); await button('直流分析').click();
    await reference.selectOption({ label: (await reference.locator('option').allTextContents()).find(t => t.includes('COM ·') || t.includes('B ·')) });
    await button('运行直流分析').click(); await page.getByRole('alert').filter({ hasText: 'DC_MODEL_UNSUPPORTED' }).waitFor();
    journeys.push('C/L-capability guard and actual unsupported diagnostic');
    await button('信号实验室').click(); await button('生成并分析').click();
    await page.getByRole('status', { name: '信号处理状态' }).filter({ hasText: '合成采样已生成' }).waitFor();
    assert((await page.getByTestId('measurement-totalRms').innerText()).includes('0.7071068 V'), 'actual Signal Lab preserved');
    await button('等效变换与课程').click(); await page.locator('#example').selectOption('delta3');
    await page.getByRole('group', { name: '可用变换候选' }).getByRole('button', { name: /Δ → Y/ }).click(); await button('预览等效变换').click();
    assert((await page.locator('.workspace-panel:not([hidden])').getByRole('status').innerText()).includes('验证通过'), 'V1 independent verification preserved');
    await button('开始分步学习').click(); assert(await page.getByRole('region', { name: '分步学习' }).isVisible(), 'V1 lesson preserved');
    assert(await page.getByRole('link', { name: '返回首页', exact: true }).getAttribute('href') === 'https://stray-flz.github.io/stray-articles/', 'return-home preserved');
    journeys.push('existing signal numerical measurement, V1 transform verification/lesson, home link');
    assert(!errors.length && !failed.length, JSON.stringify({ errors, failed }));
    const result = { status: 'passed', version: '2.3.0', url, resources, browser: await page.evaluate(() => globalThis.navigator.userAgent), journeys, dialogs, errors, failed };
    await page.evaluate(result => { globalThis.__dcVerification = result; }, result); return result;
  } catch (error) { await page.evaluate(message => { globalThis.__dcVerification = { status: 'failed', error: message }; }, String(error)); throw error; }
  finally { page.off('pageerror', onError); page.off('console', onConsole); page.off('response', onResponse); page.off('requestfailed', onFailed); page.off('dialog', onDialog); }
}
