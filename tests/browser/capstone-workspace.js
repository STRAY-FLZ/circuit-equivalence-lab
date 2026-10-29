// Replay against a real production preview or the actual public release.
async page => {
  const root = page.url(), prefix = new URL(root).hostname === '127.0.0.1' ? 'capstone-local' : 'capstone-live', journeys = [], downloads = [], errors = [], failed = [];
  const button = name => page.getByRole('button', { name, exact: true }), label = name => page.getByLabel(name, { exact: true }), assert = (ok, text) => { if (!ok) throw Error(text); };
  const dialog = d => d.accept(), error = e => errors.push(e.message), consoleError = e => { if (e.type() === 'error') errors.push(e.text()); }, response = r => { if (r.status() >= 400 && r.url().startsWith(new URL(root).origin)) failed.push(`${r.status()} ${r.url()}`); };
  page.on('dialog', dialog); page.on('pageerror', error); page.on('console', consoleError); page.on('response', response); page.setDefaultTimeout(30000);
  const checkpoint = async text => { journeys.push(text); await page.evaluate(value => { globalThis.__capstoneAcceptance = value; }, { status: 'running', journeys: [...journeys], downloads: [...downloads] }); };
  const open = async kind => { await label('综合实验类型').selectOption(kind); await button('打开综合实验').click(); };
  const parameter = async reference => { const options = await label('研究参数').locator('option').allTextContents(), text = options.find(s => s.startsWith(reference)); assert(text, `parameter ${reference}`); await label('研究参数').selectOption({ label: text }); };
  const run = async values => { await label('场景值列表').fill(values); await button('运行综合参数研究').click(); await label('综合实验状态').filter({ hasText: '综合实验完成' }).waitFor({ timeout: 60000 }); assert((await label('实验有效性').innerText()).includes('当前运行已验证'), 'current verified state'); };
  const save = async suffix => { await button('保存综合实验记录').click(); await label('综合实验状态').filter({ hasText: '实验记录已归档' }).waitFor(); const pending = page.waitForEvent('download'); await button('导出综合实验JSON').click(); const file = `${prefix}-${suffix}.json`, path = `output/playwright/${file}`; await (await pending).saveAs(path); downloads.push(path); return path; };
  try {
    await page.goto(root); await page.setViewportSize({ width: 1440, height: 1100 }); assert((await label('应用版本').innerText()).includes('v3.4.0'), 'V3.4.0 build');
    const resources = await page.evaluate(() => [...globalThis.document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(e => e.getAttribute('src') || e.getAttribute('href')));
    for (const resource of resources) assert((await page.request.get(new URL(resource, root).href)).status() === 200, `resource ${resource}`);
    await button('V3综合实验').click(); await button('打开综合实验').click(); await run('1000,2000');
    let table = await page.getByRole('region', { name: '参数场景比较' }).innerText(); assert(table.includes('0.001 s') && table.includes('0.002 s') && await page.locator('[data-study-status=success]').count() > 0, 'actual RC time/frequency scenario outputs');
    await label('源参数值').fill('1500'); await button('应用源参数').click(); await label('实验有效性').filter({ hasText: '过期' }).waitFor(); await run('1500,3000');
    table = await page.getByRole('region', { name: '参数场景比较' }).innerText(); assert(table.includes('0.0015 s') && table.includes('0.003 s'), 'changed R recomputes both analyses');
    await label('用户实验结论').fill('改变R后重新计算；参考值与实际数值分别列出。'); const rc = await save('rc');
    const reportPending = page.waitForEvent('download'); await button('导出综合实验HTML报告').click(); const report = `output/playwright/${prefix}-report.html`; await (await reportPending).saveAs(report); downloads.push(report);
    await button('在信号实验室查看实际波形').click(); assert(await button('生成并分析').isVisible(), 'actual saved waveform opens Signal'); await button('V3综合实验').click();
    await button('编辑源电路').click(); await button('R1 元件').press('Enter'); await label('电阻值').fill('1250'); await button('应用属性').click(); await button('回传当前工程到综合实验').click(); await label('实验有效性').filter({ hasText: '过期' }).waitFor();
    await label('综合实验文件').setInputFiles(rc); await label('综合实验状态').filter({ hasText: '工程已重开' }).waitFor(); assert((await label('实验有效性').innerText()).includes('历史'), 'import does not verify historical captures');
    await checkpoint('RC actual transient+AC, R edits, comparison, source editor return, JSON/HTML reopen and actual Signal samples');

    await open('rlc'); await run('200,400'); table = await page.getByRole('region', { name: '参数场景比较' }).innerText(); assert(table.includes('自然频率参考') && table.includes('阻尼振荡频率参考'), 'separate RLC frequency definitions'); await save('rlc'); await checkpoint('actual RLC transient and driven AC with damping references');
    await open('ce'); await parameter('RS.resistance'); await run('1000,2000'); assert((await page.getByRole('region', { name: '参数场景比较' }).innerText()).includes('gm'), 'actual NPN derivatives'); await save('ce');
    await open('cs'); await parameter('RS.resistance'); await run('1000,2000'); assert((await page.getByRole('region', { name: '参数场景比较' }).innerText()).includes('gm'), 'actual nMOS derivatives');
    await parameter('V2.voltage'); await run('10,0'); assert(await page.locator('[data-study-status=success]').count() === 1 && await page.locator('[data-study-status=unsupported],[data-study-status=failure]').count() === 1, 'invalid bias has its own outcome'); await save('cs-invalid'); await checkpoint('CE/CS fresh bias, small-signal data and invalid-region scenario');

    await open('follower'); await parameter('U1.openLoopGain'); await run('100000,50000'); table = await page.getByRole('region', { name: '参数场景比较' }).innerText(); assert(table.includes('0.99999') && table.includes('理想直流输出') && table.includes('相位裕度'), 'ideal/finite/actual feedback comparison'); await save('follower');
    await open('active-lowpass'); await parameter('U1.poleHz'); await run('10,20'); table = await page.getByRole('region', { name: '参数场景比较' }).innerText(); assert(table.includes('不可用 °'), 'unsupported RC margin remains unavailable'); await save('opamp-rc'); await checkpoint('op-amp ideal/finite/open/closed/loop and conditional margin comparisons');

    await open('rc'); await run('1000');
    for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 }); const toggle = page.getByRole('switch', { name: '夜间模式', exact: true }); if ((await toggle.getAttribute('aria-checked') === 'true') === (theme === 'dark')) await toggle.click(); await toggle.click();
      const cursor = page.getByRole('slider').first(); await cursor.focus(); await page.keyboard.press('End'); assert(Number(await cursor.inputValue()) > 100, 'keyboard reaches actual waveform samples');
      assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1), `page overflow ${width}/${theme}`); await page.screenshot({ path: `output/playwright/${prefix}-${width}-${theme}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1100 }); await page.getByText('学习与能力地图（部分覆盖）', { exact: true }).click(); assert(await page.locator('.capstone-map ol li').count() === 18, 'verified 18 chapter themes with partial/unimplemented scope');
    await checkpoint('desktop/narrow themes, keyboard sample cursor and partial textbook capability map');

    await button('电子设计竞赛').click(); await button('创建独立训练工程').click(); await button('开始训练实验').click(); await button('打开综合参数实验').click(); await run('1000'); await save('competition'); await button('回传综合归档到电赛').click(); await label('电赛工作台状态').filter({ hasText: '当前电路工程已回传' }).waitFor();
    await checkpoint('actual competition source to capstone and archived evidence return');
    assert(!errors.length && !failed.length, JSON.stringify({ errors, failed })); const result = { status: 'passed', root, resources, journeys, downloads, errors, failed }; await page.evaluate(value => { globalThis.__capstoneAcceptance = value; }, result); return result;
  } catch (e) { const result = { status: 'failed', message: String(e), journeys, downloads, errors, failed }; await page.evaluate(value => { globalThis.__capstoneAcceptance = value; }, result); throw e; }
  finally { page.off('dialog', dialog); page.off('pageerror', error); page.off('console', consoleError); page.off('response', response); }
}
