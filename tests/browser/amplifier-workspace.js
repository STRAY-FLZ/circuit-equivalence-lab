// Real Chrome replay for built preview and production, using the existing CLI.
async page => {
  const root = page.url(), prefix = new URL(root).hostname === '127.0.0.1' ? 'amp-local' : 'amp-live', errors = [], failed = [], journeys = [], downloads = [], readings = {};
  const assert = (ok, message) => { if (!ok) throw Error(message); }, button = name => page.getByRole('button', { name, exact: true }), label = name => page.getByLabel(name, { exact: true }), panel = () => page.getByRole('region', { name: '放大器频率响应工作台', exact: true });
  const dialog = d => d.accept(), error = e => errors.push(e.message), consoleError = m => { if (m.type() === 'error') errors.push(m.text()); }, response = r => { if (r.status() >= 400 && r.url().startsWith(new URL(root).origin)) failed.push(`${r.status()} ${r.url()}`); };
  page.on('dialog', dialog); page.on('pageerror', error); page.on('console', consoleError); page.on('response', response); page.setDefaultTimeout(20000);
  const checkpoint = async name => { journeys.push(name); await page.evaluate(v => { globalThis.__ampVerification = v; }, { status: 'running', journeys: [...journeys] }); };
  const atlas = async id => { await button('典型电路图谱').click(); await label('搜索电路图谱').fill('放大器频率响应'); await page.locator(`[data-template-id="${id}"]`).click(); await button('放大器频率响应实验').click(); };
  const bias = async () => { await button('验证直流偏置').click(); await label('放大器分析状态').filter({ hasText: '直流工作点已验证' }).waitFor(); };
  const run = async () => { await button('运行放大器频率扫描').click(); await label('放大器分析状态').filter({ hasText: '频率分析完成' }).waitFor(); };
  const edit = async (ref, field, value) => { await button(`${ref} 元件`).press('Enter'); await label(field).fill(String(value)); await button('应用属性').click(); };
  const gain = async () => { const text = await page.getByRole('region', { name: '单频相量结果', exact: true }).innerText(), m = text.match(/\|H\|=([\d.eE+-]+)/); assert(m, `missing single-frequency gain: ${text}`); return Number(m[1]); };
  const cursorGain = async () => { await label('频点游标').fill('178'); const text = await label('频点读数').innerText(), m = text.match(/\|H\| = ([\d.eE+-]+)/); assert(m, `missing sweep cursor: ${text}`); return Number(m[1]); };
  const save = async suffix => { await button('将频率分析记录写入工程').click(); await label('放大器分析状态').filter({ hasText: '全部实际频点已写入工程' }).waitFor(); const pending = page.waitForEvent('download'); await button('导出工程').click(); const path = `output/playwright/${prefix}-${suffix}.json`; await (await pending).saveAs(path); downloads.push(path); return path; };
  try {
    await page.goto(root); await page.setViewportSize({ width: 1440, height: 1100 });
    assert((await label('应用版本').innerText()).includes('v3.2.0'), 'actual V3.2.0 application');
    const resources = await page.evaluate(() => [...globalThis.document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(e => e.getAttribute('src') || e.getAttribute('href')));
    for (const resource of resources) assert(resource.startsWith('/circuit-equivalence-lab/') && (await page.request.get(new URL(resource, root).href)).status() === 200, `resource ${resource}`);
    await atlas('amplifier-ce-bypass'); await bias();
    assert((await label('已验证偏置').innerText()).includes('NPN 放大区'), 'actual NPN forward-active bias');
    await edit('RS', '电阻值', 1500); await edit('RL', '电阻值', 2200);
    await label('放大器激励 RMS').fill('0.00008'); await label('放大器频点数').fill('201'); await run();
    assert((await page.getByRole('region', { name: '中频与带宽' }).innerText()).includes('下截止：') && (await page.getByRole('region', { name: '中频与带宽' }).innerText()).includes('带宽：'), 'actual measured cutoff display');
    readings.ceInitial = { bias: await label('已验证偏置').innerText(), single: await page.getByRole('region', { name: '单频相量结果' }).innerText(), band: await page.getByRole('region', { name: '中频与带宽' }).innerText(), gain: await gain() };
    await page.getByRole('img', { name: '实际 Bode 幅频与相频曲线', exact: true }).waitFor(); await save('ce-initial'); await run();
    await edit('CIN', '电容值', 1e-8); await panel().getByText('结果已过期', { exact: false }).first().waitFor(); await run(); readings.ceCouplingGain = await gain();
    assert(readings.ceCouplingGain < readings.ceInitial.gain * .8, 'changing the actual input coupling capacitor changes 1 kHz response');
    const oldBias = await label('已验证偏置').innerText(); await edit('RBIAS2', '电阻值', 30000); await panel().getByText('结果已过期', { exact: false }).first().waitFor(); await run();
    readings.ceChangedBias = await label('已验证偏置').innerText(); assert(readings.ceChangedBias !== oldBias && readings.ceChangedBias.includes('NPN 放大区'), 'bias resistor forces fresh valid DC solution');
    await label('放大器起始频率 / Hz').fill('0.2'); await run(); const ceFile = await save('ce-changed');
    await label('打开工程文件').setInputFiles(ceFile); await page.getByRole('status').filter({ hasText: '工程已打开，连接' }).waitFor();
    assert(Number(await label('放大器起始频率 / Hz').inputValue()) === .2, 'saved scan settings restored');
    await page.getByText('工程内已保存的频响设置与记录（重算后验证当前电路）', { exact: true }).click(); assert((await label('已保存频响来源').innerText()).includes('输入摘要：'), 'saved original provenance displayed');
    assert(await page.getByRole('region', { name: '单频相量结果' }).count() === 0, 'saved results are not silently trusted as current'); await bias(); await run();
    await checkpoint('CE bias, exact gm, Bode, coupling and bias edits, stale state, project reopen/provenance');

    await atlas('amplifier-cs-parasitic'); await bias(); assert((await label('已验证偏置').innerText()).includes('nMOS 饱和区'), 'actual MOS saturation'); await run();
    readings.mosInitial = { bias: await label('已验证偏置').innerText(), single: await page.getByRole('region', { name: '单频相量结果' }).innerText(), high: await cursorGain() };
    await save('mos-initial'); await run();
    await edit('CGD', '电容值', 2e-10); await panel().getByText('结果已过期', { exact: false }).first().waitFor(); await run();
    readings.mosChanged = { bias: await label('已验证偏置').innerText(), high: await cursorGain() };
    assert(readings.mosChanged.bias === readings.mosInitial.bias, 'explicit Cgd is open in DC and cannot change operating point');
    assert(Math.abs(readings.mosChanged.high - readings.mosInitial.high) > .01 * readings.mosInitial.high, 'Cgd changes the real high-frequency response');
    await save('mos-changed'); await run();
    await edit('V2', '电压值', 0); await button('验证直流偏置').click(); await page.getByRole('alert').filter({ hasText: '饱和区' }).waitFor();
    await checkpoint('CS saturation, actual Cgd frequency effect, unchanged DC bias, invalid bias rejection');

    await atlas('amplifier-ce-basic'); await button('电感 L').click(); await page.getByRole('application', { name: '原理图编辑画布', exact: true }).click({ position: { x: 25, y: 25 } }); await button('验证直流偏置').click(); await page.getByRole('alert').filter({ hasText: '其他器件' }).waitFor();
    await checkpoint('unsupported device rejected explicitly');

    await atlas('amplifier-ce-bypass'); await run();
    for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 }); const switcher = page.getByRole('switch', { name: '夜间模式', exact: true });
      if ((await switcher.getAttribute('aria-checked') === 'true') === (theme === 'dark')) await switcher.click();
      await switcher.click();
      assert(await page.evaluate(value => globalThis.localStorage.getItem('stray-theme') === value, theme), `theme preference ${theme}`);
      await label('频点读数').scrollIntoViewIfNeeded(); await page.screenshot({ path: `output/playwright/${prefix}-${width}-${theme}.png`, fullPage: true });
      assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1), `page overflow ${width}/${theme}`);
    }
    await label('频点游标').focus(); await page.keyboard.press('End'); assert((await label('频点读数').innerText()).includes('100000000 Hz'), 'keyboard cursor reaches final real sample');
    await checkpoint('actual theme switch, desktop/narrow layout, keyboard-accessible frequency cursor');
    assert(errors.length === 0 && failed.length === 0, `console/resources ${JSON.stringify({ errors, failed })}`);
    const result = { status: 'passed', root, browser: await page.evaluate(() => globalThis.navigator.userAgent), resources, journeys, readings, downloads, errors, failed };
    await page.evaluate(v => { globalThis.__ampVerification = v; }, result); return result;
  } catch (e) { const result = { status: 'failed', message: String(e), journeys, readings, downloads, errors, failed }; await page.evaluate(v => { globalThis.__ampVerification = v; }, result); throw e; }
  finally { page.off('dialog', dialog); page.off('pageerror', error); page.off('console', consoleError); page.off('response', response); }
}
