// Scoped real integration checks; historical exhaustive V1/V2/V3 acceptance stays archived.
async page => {
  const root = page.url(), errors = [], journeys = [];
  const assert = (ok, message) => { if (!ok) throw Error(message); }, button = name => page.getByRole('button', { name, exact: true }), label = name => page.getByLabel(name, { exact: true });
  const dialog = d => d.accept(), error = e => errors.push(e.message); page.on('dialog', dialog); page.on('pageerror', error); page.setDefaultTimeout(15000);
  const atlas = async (id, query, action) => { await button('典型电路图谱').click(); await label('搜索电路图谱').fill(query); await page.locator(`[data-template-id="${id}"]`).click(); await button(action).click(); };
  try {
    await page.goto(root);
    const resources = await page.evaluate(() => [...globalThis.document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(e => e.getAttribute('src') || e.getAttribute('href')));
    for (const r of resources) assert(r.startsWith('/circuit-equivalence-lab/') && (await page.request.get(new URL(r, root).href)).status() === 200, `resource ${r}`);
    await atlas('voltage-load', '电压源与电阻负载', '使用直流分析'); await button('运行直流分析').click(); await label('直流分析状态').filter({ hasText: '分析完成' }).waitFor(); assert((await label('支路结果表').innerText()).includes('0.005'), 'DC actual 5mA'); journeys.push('DC 5mA');
    await atlas('rc-lowpass', 'RC 低通', '交流分析与滤波'); await button('运行频率扫描').click(); await label('交流分析状态').filter({ hasText: '分析完成' }).waitFor(); assert((await label('交流节点电压表').innerText()).includes('0.846733'), 'AC actual RMS output'); journeys.push('AC/Bode actual RC');
    await atlas('rc-charge-topology', 'RC 充电', '暂态教学实验'); await button('运行暂态分析').click(); await label('暂态分析状态').filter({ hasText: '模拟完成' }).waitFor(); await label('精确样本索引').fill('100'); const sample = await label('暂态精确样本读数').innerText(); assert(sample.includes('6.31782904 V'), 'original adaptive BE sample'); journeys.push('transient actual RC sample');
    await button('信号实验室').click(); await button('生成并分析').click(); await label('信号处理状态').filter({ hasText: '合成采样已生成' }).waitFor(); await button('运行 FFT').click(); journeys.push('Signal full sampling/FFT');
    await button('等效变换与课程').click(); await page.getByRole('button', { name: /串联化简 R1/ }).click(); await button('预览等效变换').click(); await button('开始分步学习').click(); await button('下一步').click(); assert(await page.locator('math').count() > 0, 'existing MathML'); assert(await page.getByRole('link', { name: '返回首页', exact: true }).getAttribute('href') === 'https://stray-flz.github.io/stray-articles/', 'home URL'); journeys.push('V1 transform/lesson/MathML/home');
    assert(!errors.length, JSON.stringify(errors)); const result = { status: 'passed', root, resources, sample, journeys, errors }; await page.evaluate(value => { globalThis.__analogCompatibility = value; }, result); return result;
  } catch (e) { const result = { status: 'failed', message: String(e), journeys, errors }; await page.evaluate(value => { globalThis.__analogCompatibility = value; }, result); throw e; }
  finally { page.off('dialog', dialog); page.off('pageerror', error); }
}
