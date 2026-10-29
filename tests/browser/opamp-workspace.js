// Real Chrome workflow against the built preview or production. The live URL is
// supplied by the caller; downloaded project data come from actual UI actions.
async page => {
  const root = page.url(), prefix = new URL(root).hostname === '127.0.0.1' ? 'opamp-local' : 'opamp-live', errors = [], failed = [], journeys = [], downloads = [], readings = {};
  const assert = (ok, message) => { if (!ok) throw Error(message); }, button = name => page.getByRole('button', { name, exact: true }), label = name => page.getByLabel(name, { exact: true });
  const dialog = d => d.accept(), error = e => errors.push(e.message), consoleError = m => { if (m.type() === 'error') errors.push(m.text()); }, response = r => { if (r.status() >= 400 && r.url().startsWith(new URL(root).origin)) failed.push(`${r.status()} ${r.url()}`); };
  page.on('dialog', dialog); page.on('pageerror', error); page.on('console', consoleError); page.on('response', response); page.setDefaultTimeout(20000);
  const checkpoint = async name => { journeys.push(name); await page.evaluate(v => { globalThis.__opampVerification = v; }, { status: 'running', journeys: [...journeys] }); };
  const atlas = async id => { await button('典型电路图谱').click(); await label('搜索电路图谱').fill('运算放大器频率特性'); await page.locator(`[data-template-id="${id}"]`).click(); await button('运算放大器频率特性实验').click(); };
  const dc = async () => { await button('求解有限增益直流').click(); await label('运放分析状态').filter({ hasText: '直流已验证' }).waitFor(); };
  const run = async () => { await button('运行运放频率扫描').click(); await label('运放分析状态').filter({ hasText: '频率分析完成' }).waitFor(); };
  const region = name => page.getByRole('region', { name, exact: true });
  const measurement = async () => {
    const d = await region('运放直流结果').innerText(), f = await region('运放闭环结果').innerText(), l = await region('运放环路结果').innerText();
    const transfer = d.match(/直流增量传递比 ([\d.eE+-]+)/), bandwidth = f.match(/截止估计：([\d.eE+-]+)/), margin = l.match(/相位裕度：([\d.eE+-]+)/);
    return { dc: d, response: f, loop: l, transfer: transfer && Number(transfer[1]), bandwidth: bandwidth && Number(bandwidth[1]), margin: margin && Number(margin[1]) };
  };
  const save = async suffix => {
    await button('将运放分析记录写入工程').click(); await label('运放分析状态').filter({ hasText: '结果、设置、原修订和摘要已写入工程' }).waitFor();
    const pending = page.waitForEvent('download'); await button('导出工程').click(); const download = await pending, path = `output/playwright/${prefix}-${suffix}.json`;
    await download.saveAs(path); downloads.push(path); const stream = await download.createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk);
    return { path, document: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
  };
  try {
    await page.goto(root); await page.setViewportSize({ width: 1440, height: 1100 });
    assert((await label('应用版本').innerText()).includes('v3.3.0'), 'actual V3.3.0 candidate');
    const resources = await page.evaluate(() => [...globalThis.document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(e => e.getAttribute('src') || e.getAttribute('href')));
    for (const resource of resources) assert(resource.startsWith('/circuit-equivalence-lab/') && (await page.request.get(new URL(resource, root).href)).status() === 200, `resource ${resource}`);
    await atlas('opamp-follower');
    assert((await region('运放开环响应').innerText()).includes('999999.99995 Hz'), 'exact unity frequency distinct from approximate GBW');
    await dc(); assert((await region('运放直流结果').innerText()).includes('Vout=0.099999'), 'finite follower DC'); await run();
    readings.follower = await measurement();
    assert(Math.abs(readings.follower.transfer - 100000 / 100001) < 1e-7, 'finite follower gain');
    assert(Math.abs(readings.follower.bandwidth / 1000010 - 1) < .005, 'actual follower bandwidth estimate');
    assert(Math.abs(readings.follower.margin - 90.000573) < .05, 'single-pole follower phase margin');
    const saved = await save('follower'); assert(saved.document.formatVersion === 1 && saved.document.writer.version === '3.3.0', 'schema 1 and writer 3.3.0');
    const record = saved.document.project.extensions['org.stray.opamp-frequency'];
    assert(record.result.points.length === 201 && record.result.loop.length === 201 && record.provenance.inputDigest.length === 64, 'actual frequency points and provenance');
    await label('打开工程文件').setInputFiles(saved.path); await page.getByRole('status').filter({ hasText: '工程已打开' }).waitFor();
    assert(await region('运放闭环结果').count() === 0, 'saved result not silently trusted');
    await page.getByText('工程内保存的运放分析记录', { exact: true }).click(); assert((await label('已保存运放来源').innerText()).includes(record.provenance.inputDigest), 'original saved digest visible');
    await run(); await label('运放开环增益').fill('50000'); await button('应用运放模型').click(); await page.getByText('结果已过期', { exact: false }).first().waitFor(); await run();
    readings.lowerGain = await measurement(); assert(readings.lowerGain.bandwidth < readings.follower.bandwidth * .52, 'edited A0 changes actual closed-loop bandwidth');
    await label('运放主极点').fill('20'); await button('应用运放模型').click(); await page.getByText('结果已过期', { exact: false }).first().waitFor(); await run();
    readings.higherPole = await measurement(); assert(readings.higherPole.bandwidth > readings.lowerGain.bandwidth * 1.95, 'edited dominant pole changes actual closed-loop bandwidth');
    await checkpoint('follower: model, finite DC, open/closed/loop, A0/pole edits, stale and actual file reopen');

    await atlas('opamp-inverting'); await run(); readings.inverting = await measurement();
    assert(Math.abs(readings.inverting.transfer + 9.99890012) < .00001 && Math.abs(readings.inverting.bandwidth / 90919.09 - 1) < .005 && readings.inverting.dc.includes('输出理想近似：-1 V'), 'inverting independent references and ideal comparison');
    await button('RF 元件').press('Enter'); await label('电阻值').fill('200000'); await button('应用属性').click(); await page.getByText('结果已过期', { exact: false }).first().waitFor(); await run();
    readings.invertingEdited = await measurement(); assert(readings.invertingEdited.transfer < -19.99 && readings.invertingEdited.bandwidth < readings.inverting.bandwidth * .54 && readings.invertingEdited.dc.includes('输出理想近似：-2 V'), 'actual Rf edit changes gain, ideal comparison and bandwidth');
    await save('inverting-edited'); await checkpoint('inverting gain, ideal comparison, real Rf edit and changed bandwidth');

    await atlas('opamp-active-lowpass'); await run(); readings.rc = await measurement();
    assert(readings.rc.loop.includes('相位裕度：不可用') && readings.rc.loop.includes('当前版本不认证'), 'RC feedback shows response without an unjustified margin');
    await save('active-lowpass'); await checkpoint('frequency-dependent RC feedback with unavailable margin');

    const invalid = saved.document, sheet = invalid.project.sheets[0], amp = sheet.components.find(c => c.reference === 'U1'), minus = amp.pins.find(p => p.definitionPinKey === '-').anchorId, ground = sheet.ports.find(p => p.label === 'COM').anchorId;
    const wire = sheet.connections.find(c => c.endpoints.includes(minus)), endpoint = wire.endpoints[0] === minus ? 1 : 0; wire.endpoints[endpoint] = ground;
    const a = sheet.geometry.anchorPositions[minus], b = sheet.geometry.anchorPositions[ground]; sheet.geometry.connectionRoutes[wire.id] = a.x === b.x || a.y === b.y ? [a, b] : [a, { x: b.x, y: a.y }, b];
    invalid.project.revision = globalThis.crypto.randomUUID(); delete invalid.project.extensions['org.stray.opamp-frequency'];
    await label('打开工程文件').setInputFiles({ name: 'no-feedback.straylab.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
    await page.getByRole('status').filter({ hasText: '工程已打开' }).waitFor(); await button('运行运放频率扫描').click();
    await page.getByRole('alert').filter({ hasText: 'OPAMP_FEEDBACK' }).waitFor(); assert(await region('运放闭环结果').count() === 0, 'unsupported feedback has no successful response');
    await checkpoint('unsupported feedback rejected in actual editor');

    await atlas('opamp-follower'); await run();
    for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 }); const switcher = page.getByRole('switch', { name: '夜间模式', exact: true });
      if ((await switcher.getAttribute('aria-checked') === 'true') === (theme === 'dark')) await switcher.click();
      await switcher.click();
      assert(await page.evaluate(value => globalThis.localStorage.getItem('stray-theme') === value, theme), `theme ${theme}`);
      const bode = region('运放闭环结果').getByLabel('频点游标', { exact: true }); await bode.focus(); await page.keyboard.press('End');
      assert((await region('运放闭环结果').getByLabel('频点读数', { exact: true }).innerText()).includes('100000000 Hz'), 'keyboard cursor selects actual last frequency');
      assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1), `page overflow ${width}/${theme}`);
      await page.screenshot({ path: `output/playwright/${prefix}-${width}-${theme}.png`, fullPage: true });
    }
    await checkpoint('desktop/narrow layout, both themes and keyboard chart cursor');
    assert(errors.length === 0 && failed.length === 0, `console/resources ${JSON.stringify({ errors, failed })}`);
    const result = { status: 'passed', root, browser: await page.evaluate(() => globalThis.navigator.userAgent), resources, journeys, readings, downloads, errors, failed };
    await page.evaluate(v => { globalThis.__opampVerification = v; }, result); return result;
  } catch (e) { const result = { status: 'failed', message: String(e), journeys, readings, downloads, errors, failed }; await page.evaluate(v => { globalThis.__opampVerification = v; }, result); throw e; }
  finally { page.off('dialog', dialog); page.off('pageerror', error); page.off('console', consoleError); page.off('response', response); }
}
