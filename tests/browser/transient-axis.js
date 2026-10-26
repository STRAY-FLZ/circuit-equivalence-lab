// Actual mobile text bounds, including small negative currents/energies in saved numerical data.
async page => {
  const root = page.url(), prefix = new URL(root).hostname === '127.0.0.1' ? 'transient-local' : 'transient-live';
  const button = name => page.getByRole('button', { name, exact: true }), label = name => page.getByLabel(name, { exact: true }), accept = async d => d.accept(); page.on('dialog', accept);
  try {
    await page.goto(root); await button('原理图编辑器').click(); await label('打开工程文件').setInputFiles(`output/playwright/${prefix}-parallel-under.straylab.json`); await page.getByRole('status').filter({ hasText: '工程已打开，连接' }).waitFor(); await button('暂态分析').click(); await page.getByRole('heading', { name: '已保存的实际模拟波形', exact: true }).waitFor(); await page.getByText('选择节点电压、支路电压/电流与储能（最多4条）', { exact: true }).click();
    while (await page.locator('.transient-selections input:checked').count()) await page.locator('.transient-selections input:checked').first().uncheck();
    for (const name of ['U(C1) / V', 'I(L1) / A', 'E(C1) / J', 'E(L1) / J']) await page.getByRole('checkbox', { name, exact: true }).check();
    await label('时间缩放').selectOption('4'); await label('水平位置').focus(); await page.keyboard.press('End'); await page.setViewportSize({ width: 390, height: 844 }); await label('I(L1) 时域波形').scrollIntoViewIfNeeded(); await page.screenshot({ path: `output/playwright/${prefix}-compact-axis.png` });
    const charts = [];
    for (const svg of await label('暂态模拟结果').locator('.signal-chart svg').all()) { const ticks = await svg.evaluate(svg => { const b = svg.getBoundingClientRect(); return [...svg.querySelectorAll('text')].map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent, visible: r.left >= b.left - 1 && r.right <= b.right + 1 }; }); }); if (ticks.some(t => !t.visible)) throw Error(JSON.stringify(ticks)); charts.push(ticks.map(t => t.text)); }
    const result = { status: 'passed', charts: charts.length, negativeSmallTicksVisible: true, labels: charts, resources: await page.evaluate(() => [...globalThis.document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(e => e.getAttribute('src') || e.getAttribute('href'))) }; await page.evaluate(result => { globalThis.__transientAxisVerification = result; }, result); return result;
  } catch (e) { await page.evaluate(message => { globalThis.__transientAxisVerification = { status: 'failed', message }; }, String(e)); throw e; }
  finally { page.off('dialog', accept); }
}
