// Run against the built preview and actual public V3.1.0 using installed CLI/Chrome.
async page => {
  const root = page.url(), prefix = new URL(root).hostname === '127.0.0.1' ? 'analog-local' : 'analog-live';
  const errors = [], failed = [], journeys = [], readings = {}, downloads = [];
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const near = (actual, expected, tolerance, name) => assert(Number.isFinite(actual) && Math.abs(actual - expected) < tolerance, `${name}: ${actual} vs ${expected}`);
  const button = name => page.getByRole('button', { name, exact: true }), label = name => page.getByLabel(name, { exact: true });
  const onError = e => errors.push(e.message), onConsole = m => { if (m.type() === 'error') errors.push(m.text()); }, onResponse = r => { if (r.status() >= 400 && r.url().startsWith(new URL(root).origin)) failed.push(r.url()); }, onDialog = d => d.accept();
  page.on('pageerror', onError); page.on('console', onConsole); page.on('response', onResponse); page.on('dialog', onDialog); page.setDefaultTimeout(15000);
  const panel = () => page.getByRole('region', { name: '模拟电子工作台', exact: true });
  const run = async () => { await button('运行模拟电子工作点').click(); await label('模拟分析状态').filter({ hasText: '工作点已通过' }).waitFor(); };
  const atlas = async id => { await button('典型电路图谱').click(); await label('搜索电路图谱').fill('模拟电子'); await page.locator(`[data-template-id="${id}"]`).click(); await button('模拟电子实验').click(); };
  const checkpoint = async name => { journeys.push(name); await page.evaluate(value => { globalThis.__analogVerification = value; }, { status: 'running', journeys: [...journeys] }); };
  const edit = async (reference, field, value) => { await button(`${reference} 元件`).press('Enter'); await label(field).fill(String(value)); await button('应用属性').click(); };
  const row = reference => panel().locator('tbody tr').filter({ has: page.getByRole('rowheader', { name: new RegExp(`^${reference} ·`) }) }).first();
  const volts = async reference => (await row(reference).locator('td').nth(1).innerText()).split('/').map(Number);
  const amps = async reference => (await row(reference).locator('td').nth(2).innerText()).split('/').map(Number);
  const saveFile = async suffix => { const pending = page.waitForEvent('download'); await button('导出工程').click(); const path = `output/playwright/${prefix}-${suffix}.json`; await (await pending).saveAs(path); downloads.push(path); return path; };
  try {
    await page.goto(root); await page.setViewportSize({ width: 1440, height: 1100 });
    assert((await label('应用版本').innerText()).includes('v3.1.0'), 'candidate application version');
    await atlas('analog-diode-bias'); await run();
    near((await volts('D1'))[0] - (await volts('D1'))[1], .5741915, 1e-7, 'diode drop');
    near((await amps('D1'))[0], .0044258085, 1e-10, 'diode current');
    await page.getByRole('img', { name: '二极管 I–V 与负载线 · 实线为器件，虚线为外部网络', exact: true }).waitFor();
    await edit('D1', '饱和电流 IS值', 2e-12); await panel().getByText('结果已过期', { exact: false }).waitFor(); await run();
    assert((await volts('D1'))[0] - (await volts('D1'))[1] < .5741915, 'actual IS parameter changes bias');
    readings.diode = { volts: await volts('D1'), amps: await amps('D1') };
    await button('运行准静态扫描').click(); await label('模拟分析状态').filter({ hasText: '41 个准静态工作点' }).waitFor();
    await page.getByRole('img', { name: '实际准静态输入与输出', exact: true }).waitFor();
    await button('将模拟分析记录写入工程').click(); const diodeFile = await saveFile('diode');
    await label('打开工程文件').setInputFiles(diodeFile); await page.getByRole('status').filter({ hasText: '工程已打开，连接' }).waitFor();
    await panel().getByText('工程内已保存的模拟记录', { exact: false }).waitFor();
    assert(await panel().locator('tbody tr').count() === 0, 'saved record is not silently trusted as a new verified run');
    await run(); near((await amps('D1'))[0], readings.diode.amps[0], 1e-10, 'reopened diode OP');
    await edit('D1', '理想因子 n值', 0); await button('运行模拟电子工作点').click(); await page.getByRole('alert').filter({ hasText: 'ANALOG_PARAMETER' }).waitFor();
    await checkpoint('diode actual OP, loadline, parameter change, 41-point sweep, file reopen, invalid model');

    for (const id of ['analog-diode-halfwave', 'analog-diode-limiter']) { await atlas(id); await run(); await button('运行准静态扫描').click(); await label('模拟分析状态').filter({ hasText: '41 个准静态工作点' }).waitFor(); await button('将模拟分析记录写入工程').click(); await saveFile(id); }
    await checkpoint('half-wave and limiter are actual independent quasi-static points');

    await atlas('analog-npn-base'); await run(); assert((await row('Q1').innerText()).includes('放大区'), 'NPN active');
    await button('计算局部电压增益').click(); await panel().getByRole('status').filter({ hasText: '局部电压增益 Av=' }).waitFor();
    readings.ce = await panel().getByRole('status').filter({ hasText: '局部电压增益 Av=' }).innerText(); const oldIc = (await amps('Q1'))[1];
    await edit('RB', '电阻值', 20000); await run(); assert((await amps('Q1'))[1] < oldIc, 'RB changes actual bias');
    await edit('V1', '电压值', -1); await run(); assert((await row('Q1').innerText()).includes('截止区'), 'NPN cutoff');
    await edit('V1', '电压值', 2); await run(); assert((await row('Q1').innerText()).includes('饱和区'), 'NPN saturation'); near((await volts('Q1'))[1], .2, 1e-8, 'saturation clamp');
    await button('计算局部电压增益').click(); await page.getByRole('alert').filter({ hasText: '仅在 NPN 放大区' }).waitFor();
    await button('将模拟分析记录写入工程').click(); await saveFile('npn-saturation');
    await checkpoint('NPN active/cutoff/saturation, base resistance and CE Jacobian gain');

    await atlas('analog-mos-bias'); await run(); near((await volts('M1'))[1], 8, 1e-8, 'MOS drain');
    await button('计算局部电压增益').click(); readings.cs = await panel().getByRole('status').filter({ hasText: 'Av=-2 V/V' }).innerText();
    await edit('V1', '电压值', .5); await run(); assert((await row('M1').innerText()).includes('截止区'), 'MOS cutoff');
    await edit('V1', '电压值', 3); await edit('V2', '电压值', 1); await run(); assert((await row('M1').innerText()).includes('三极区'), 'MOS triode');
    await checkpoint('MOS square-law bias/regions and CS gain −2');

    for (const [id, expected] of [['follower', .1], ['inverting', -1], ['noninverting', 1], ['summing', -2], ['differential', 2]]) {
      await atlas(`analog-opamp-${id}`); await run(); near((await volts('U1'))[2], expected, 1e-8, id); readings[id] = await volts('U1');
      if (id === 'inverting') { await button('计算局部电压增益').click(); await panel().getByRole('status').filter({ hasText: 'Av=-10 V/V' }).waitFor(); await button('将模拟分析记录写入工程').click(); await saveFile('opamp-inverting'); }
    }
    await checkpoint('all five ideal-opamp topologies, explicit negative feedback, numerical output');
    await atlas('analog-opamp-inverting'); await run(); await button('RF 元件').press('Enter'); await button('删除元件').click(); await button('运行模拟电子工作点').click(); await page.getByRole('alert').filter({ hasText: '负反馈' }).waitFor();
    await checkpoint('open feedback is rejected without imposing virtual short');

    await atlas('analog-opamp-inverting'); await run();
    for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(value => { globalThis.localStorage.setItem('stray-theme', value); globalThis.document.documentElement.dataset.theme = value; }, theme);
      await panel().scrollIntoViewIfNeeded(); await page.screenshot({ path: `output/playwright/${prefix}-${width}-${theme}.png`, fullPage: true });
      assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1), `no page overflow ${width}/${theme}`);
    }
    await page.setViewportSize({ width: 1440, height: 1100 }); await button('计算局部电压增益').focus(); await page.keyboard.press('Enter'); await panel().getByRole('status').filter({ hasText: 'Av=-10 V/V' }).waitFor();
    await checkpoint('desktop/narrow light/dark and keyboard activation');

    await button('电子设计竞赛').click(); await button('创建独立训练工程').click(); await button('开始训练实验').click(); await label('训练电路模板').selectOption('analog-opamp-inverting'); await button('采用训练电路模板').click(); await button('打开模拟电子').click(); await run(); await button('关联模拟工作点到电赛实验').click();
    await page.getByRole('status').filter({ hasText: '实际结果与原始数据已关联' }).waitFor();
    assert((await label('已关联证据').innerText()).includes('模拟电子工作点'), 'actual analog evidence is present');
    await checkpoint('competition analog template, current-project capture and actual numerical evidence');
    assert(errors.length === 0 && failed.length === 0, `console/resources ${JSON.stringify({ errors, failed })}`);
    const result = { status: 'passed', root, browser: await page.evaluate(() => navigator.userAgent), journeys, readings, downloads, errors, failed };
    await page.evaluate(value => { globalThis.__analogVerification = value; }, result); return result;
  } catch (error) { const result = { status: 'failed', message: String(error), journeys, readings, downloads, errors, failed }; await page.evaluate(value => { globalThis.__analogVerification = value; }, result); throw error; }
  finally { page.off('pageerror', onError); page.off('console', onConsole); page.off('response', onResponse); page.off('dialog', onDialog); }
}
