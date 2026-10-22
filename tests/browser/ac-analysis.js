// Existing offline Playwright CLI replay, against built preview or actual public root.
async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const root = page.url(), prefix = new URL(root).hostname === '127.0.0.1' ? 'ac-local' : 'ac-live';
  const errors = [], failed = [], journeys = [], downloads = [];
  const onError = e => errors.push(e.message), onConsole = m => { if (m.type() === 'error') errors.push(m.text()); };
  const onResponse = r => { if (r.status() >= 400) failed.push({ url: r.url(), status: r.status() }); }, onFailed = r => failed.push({ url: r.url(), error: r.failure()?.errorText });
  const onDialog = async d => { await d.accept(); };
  page.on('pageerror', onError); page.on('console', onConsole); page.on('response', onResponse); page.on('requestfailed', onFailed); page.on('dialog', onDialog);
  page.setDefaultTimeout(15000);
  const button = name => page.getByRole('button', { name, exact: true }), label = name => page.getByLabel(name, { exact: true });
  const status = page.getByRole('status', { name: '交流分析状态' });
  const analyze = async (sweep = true) => { await button(sweep ? '运行频率扫描' : '运行单频交流分析').click(); await status.filter({ hasText: '分析完成' }).waitFor(); };
  const atlas = async id => { await button('典型电路图谱').click(); await page.getByRole('searchbox', { name: '搜索电路图谱' }).fill(id === 'series-rlc' ? 'RLC 串联' : id === 'rlc-bandpass' ? 'RLC 电阻输出' : id === 'rl-lowpass' ? 'RL 低通' : id === 'rc-highpass' ? 'RC 高通' : 'RC 低通'); await page.locator(`[data-template-id="${id}"]`).click(); await page.getByLabel('所选电路详情', { exact: true }).getByRole('button', { name: '交流分析与滤波', exact: true }).click(); await label('交流分析面板').waitFor(); };
  const save = async (action, name) => { const pending = page.waitForEvent('download'); await button(action).click(); const path = `output/playwright/${prefix}-${name}`; await (await pending).saveAs(path); downloads.push(path); return path; };
  try {
    await page.goto(root); await page.evaluate(() => { globalThis.__acVerification = { status: 'running' }; });
    await page.setViewportSize({ width: 1440, height: 1100 });
    assert((await label('应用版本').innerText()).includes('v2.4.0'), 'actual version 2.4.0');
    const resources = await page.evaluate(() => [...globalThis.document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(e => e.getAttribute('src') || e.getAttribute('href')));
    for (const resource of resources) { assert(resource.startsWith('/circuit-equivalence-lab/'), 'preserved base'); assert((await page.request.get(new URL(resource, root).href)).status() === 200, resource); }
    await atlas('rc-lowpass'); await label('单频频率 / Hz').fill(String(1 / (2 * Math.PI * .001))); await analyze();
    assert((await page.getByTestId('ac-analytical').innerText()).includes('159.1549 Hz'), 'RC analytic cutoff');
    await label('频点游标').fill('88'); assert((await label('频点读数').innerText()).includes('158.4893 Hz'), 'actual sampled frequency');
    await label('频点游标').focus(); await page.keyboard.press('ArrowRight'); assert(await label('频点游标').inputValue() === '89', 'keyboard cursor');
    await page.getByText('实际复数 MNA 方程与矩阵', { exact: true }).click(); assert((await page.locator('.ac-results pre').innerText()).includes('0.001'), 'actual complex matrix');
    await save('导出交流分析报告 JSON', 'rc-cutoff-report.json');
    await page.getByRole('region', { name: '交流支路结果表' }).getByRole('button', { name: 'R1', exact: true }).click(); assert(await page.locator('.editor-component.dc-highlight').count() === 1, 'stable schematic highlight');
    await button('R1 元件').click(); const resistorId = await button('R1 元件').getAttribute('data-component-id');
    await label('电阻值').fill('2000'); await button('应用属性').click();
    assert((await status.innerText()).includes('结果已过期'), 'resistance invalidates'); assert(await page.locator('.ac-results').count() === 0 && await page.locator('.dc-annotation').count() === 0, 'stale curve and highlight hidden');
    await analyze(); assert((await page.getByTestId('ac-analytical').innerText()).includes('79.57747 Hz'), 'doubling R halves cutoff');
    await label('V1 相位 / °').fill('30'); assert((await status.innerText()).includes('结果已过期'), 'phase invalidates');
    await button('保存交流配置').click(); await analyze(); await save('导出交流分析报告 JSON', 'rc-edited-report.json');
    const saved = await save('导出工程', 'rc.straylab.json');
    await button('新建工程').click(); await label('打开工程文件').setInputFiles(saved); await page.getByRole('status').filter({ hasText: '工程已打开' }).waitFor();
    await button('交流分析与滤波').click(); assert(await label('V1 相位 / °').inputValue() === '30', 'source settings restored'); assert(await button('R1 元件').getAttribute('data-component-id') === resistorId, 'UUID preserved');
    await analyze(); assert((await page.getByTestId('ac-analytical').innerText()).includes('79.57747 Hz'), 'reopened actual cutoff'); await save('导出工程', 'rc-reopened.straylab.json');
    journeys.push('RC cutoff/phase/real matrix/cursor/highlight; R edit halves cutoff; stale hiding; native saved settings and UUID reopen');
    for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 }); const toggle = page.getByRole('switch', { name: '夜间模式' }); if (await toggle.getAttribute('aria-checked') !== String(theme === 'dark')) await toggle.click();
      const chart = label('Bode 频率响应'); await chart.scrollIntoViewIfNeeded();
      assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1), 'no page overflow');
      const font = await label('实际 Bode 幅频与相频曲线').evaluate(svg => Number.parseFloat(globalThis.getComputedStyle(svg.querySelector('text')).fontSize) * svg.getScreenCTM().a); assert(font >= 11, `axis readable ${font}`);
      await chart.screenshot({ path: `output/playwright/${prefix}-bode-${width}-${theme}.png` });
      journeys.push(`${width}px ${theme} Bode responsive axes/cursor and no overflow`);
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    for (const id of ['rc-highpass', 'rl-lowpass', 'series-rlc', 'rlc-bandpass']) {
      await atlas(id); await analyze(); assert(await label('Bode 频率响应').isVisible(), `${id} actual sweep`); await save('导出交流分析报告 JSON', `${id}-report.json`); journeys.push(`${id} live editable experiment`);
    }
    // Invalid inputs remain distinct and cannot leave stale successful plots.
    await label('起始频率 / Hz').fill('0'); await button('运行频率扫描').click(); await page.getByRole('alert').waitFor(); assert(await page.locator('.ac-results').count() === 0, 'invalid sweep hides results');
    await label('起始频率 / Hz').fill('1'); await label('输出负端').selectOption(await label('输出正端').inputValue()); await button('运行频率扫描').click(); await page.getByRole('alert').filter({ hasText: 'AC_PROBES' }).waitFor();
    journeys.push('invalid frequency and shorted probe diagnostics');
    // Existing DC entry uses unchanged real values.
    await button('典型电路图谱').click(); await page.getByRole('searchbox').fill('电压源与电阻负载'); await page.locator('[data-template-id="voltage-load"]').click(); await button('使用直流分析').click(); await button('运行直流分析').click(); await page.getByRole('status', { name: '直流分析状态' }).filter({ hasText: '分析完成' }).waitFor();
    assert((await page.getByRole('region', { name: '支路结果表' }).innerText()).includes('0.005'), 'retained DC 5mA'); journeys.push('unchanged DC Atlas path');
    // Sampled RC has actual input/output waveforms and FFTs, not arbitrary circuit transients.
    await button('信号实验室').click(); await button('生成并分析').click(); const signalStatus = label('信号处理状态'); await signalStatus.filter({ hasText: '合成采样已生成' }).waitFor();
    assert((await page.getByTestId('measurement-totalRms').innerText()).includes('0.7071068 V'), 'original sine RMS');
    await button('运行采样 RC 滤波').click(); await signalStatus.filter({ hasText: 'RC 采样滤波完成' }).waitFor();
    assert(await page.getByTestId('waveform-path').count() === 2, 'two actual waveform arrays'); const outputRms = Number.parseFloat(await page.getByTestId('measurement-totalRms').innerText()); assert(outputRms < .707 && outputRms > .5, 'sampled lowpass actual attenuation');
    assert((await page.getByTestId('fft-peak').innerText()).includes('100 Hz'), 'filtered actual FFT');
    await label('分析通道').selectOption({ index: 0 }); await signalStatus.filter({ hasText: '已基于当前完整采样记录更新分析' }).waitFor(); assert((await page.getByTestId('measurement-totalRms').innerText()).includes('0.7071068 V'), 'unchanged original samples');
    await label('分析通道').selectOption({ index: 1 }); await signalStatus.filter({ hasText: '已基于当前完整采样记录更新分析' }).waitFor();
    const captureId = await label('当前捕获').inputValue(), outputId = await label('分析通道').inputValue();
    await save('导出波形 CSV', 'rc-waveform.csv'); const signalFile = await save('导出完整工程', 'signal.straylab.json');
    await label('打开信号工程').setInputFiles(signalFile); await signalStatus.filter({ hasText: '工程已打开' }).waitFor(); assert(await label('当前捕获').inputValue() === captureId && await label('分析通道').inputValue() === outputId, 'derived capture and channel identities restored');
    assert(Math.abs(Number.parseFloat(await page.getByTestId('measurement-totalRms').innerText()) - outputRms) < 1e-7, 'restored actual filtered samples'); await save('导出完整工程', 'signal-reopened.straylab.json');
    for (const width of [1440, 390]) for (const theme of ['light', 'dark']) { await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 }); const toggle = page.getByRole('switch', { name: '夜间模式' }); if (await toggle.getAttribute('aria-checked') !== String(theme === 'dark')) await toggle.click(); await label('采样 RC 滤波').screenshot({ path: `output/playwright/${prefix}-filter-${width}-${theme}.png` }); assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1), 'signal no page overflow'); }
    journeys.push('actual RC input/output/RMS/FFT; original capture preserved; CSV/project native download/reopen; filter 1440/390 both themes');
    await page.setViewportSize({ width: 1440, height: 1100 }); await button('等效变换与课程').click(); await page.getByRole('button', { name: /串联化简 R1/ }).click(); await button('预览等效变换').click(); await button('开始分步学习').click(); assert(await page.getByRole('region', { name: '分步学习' }).isVisible(), 'retained lesson'); await button('下一步').click(); assert(await page.locator('math').count() > 0, 'retained MathML'); assert((await page.getByRole('link', { name: '返回首页', exact: true }).getAttribute('href')) === 'https://stray-flz.github.io/stray-articles/', 'home preserved');
    journeys.push('V1 transform lesson/MathML/home');
    assert(errors.length === 0 && failed.length === 0, JSON.stringify({ errors, failed }));
    const result = { status: 'passed', url: root, resources, journeys, downloads, errors, failed, browser: await page.evaluate(() => navigator.userAgent) };
    await page.evaluate(value => { globalThis.__acVerification = value; }, result); return result;
  } catch (error) { await page.evaluate(value => { globalThis.__acVerification = value; }, { status: 'failed', message: error.message, journeys, errors, failed }); throw error; }
  finally { page.off('pageerror', onError); page.off('console', onConsole); page.off('response', onResponse); page.off('requestfailed', onFailed); page.off('dialog', onDialog); }
}
