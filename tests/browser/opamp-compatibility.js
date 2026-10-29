// Scoped V3.2 integration check; other prior-module paths use the existing
// analog-compatibility and amplifier-existing browser scripts.
async page => {
  const root = page.url(), errors = [], failed = [], button = name => page.getByRole('button', { name, exact: true }), label = name => page.getByLabel(name, { exact: true });
  const dialog = d => d.accept(), error = e => errors.push(e.message), response = r => { if (r.status() >= 400 && r.url().startsWith(new URL(root).origin)) failed.push(`${r.status()} ${r.url()}`); };
  page.on('dialog', dialog); page.on('pageerror', error); page.on('response', response); page.setDefaultTimeout(20000);
  try {
    await page.goto(root); await page.setViewportSize({ width: 1440, height: 1100 }); await button('典型电路图谱').click(); await label('搜索电路图谱').fill('放大器频率响应'); await page.locator('[data-template-id="amplifier-ce-bypass"]').click(); await button('放大器频率响应实验').click();
    await button('验证直流偏置').click(); await label('放大器分析状态').filter({ hasText: '直流工作点已验证' }).waitFor();
    if (!(await label('已验证偏置').innerText()).includes('NPN 放大区')) throw Error('V3.2 active bias');
    await button('运行放大器频率扫描').click(); await label('放大器分析状态').filter({ hasText: '频率分析完成' }).waitFor();
    const single = await page.getByRole('region', { name: '单频相量结果', exact: true }).innerText(); if (!single.includes('|H|=4.6175198')) throw Error(`V3.2 actual gain ${single}`);
    if (errors.length || failed.length) throw Error(JSON.stringify({ errors, failed }));
    const result = { status: 'passed', root, single, errors, failed }; await page.evaluate(value => { globalThis.__opampCompatibility = value; }, result); return result;
  } catch (e) { await page.evaluate(value => { globalThis.__opampCompatibility = value; }, { status: 'failed', message: String(e), errors, failed }); throw e; }
  finally { page.off('dialog', dialog); page.off('pageerror', error); page.off('response', response); }
}
