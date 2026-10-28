// Scoped real integration boundary: V3.1 analog and competition evidence.
async page => {
  const root = page.url(), errors = [], journeys = [], button = name => page.getByRole('button', { name, exact: true }), label = name => page.getByLabel(name, { exact: true });
  const assert = (ok, message) => { if (!ok) throw Error(message); }, dialog = d => d.accept(), error = e => errors.push(e.message); page.on('dialog', dialog); page.on('pageerror', error); page.setDefaultTimeout(20000);
  try {
    await page.goto(root); await button('典型电路图谱').click(); await label('搜索电路图谱').fill('理想运放反相放大'); await page.locator('[data-template-id="analog-opamp-inverting"]').click(); await button('模拟电子实验').click(); await button('运行模拟电子工作点').click(); await label('模拟分析状态').filter({ hasText: '工作点已通过' }).waitFor();
    assert((await page.getByRole('rowheader', { name: 'U1 · 理想负反馈', exact: true }).locator('..').innerText()).includes('0 / 0 / -1'), 'existing analog opamp −1 V'); journeys.push('V3.1 analog actual opamp');
    await button('电子设计竞赛').click(); await button('创建独立训练工程').click(); await button('开始训练实验').click(); await label('训练电路模板').selectOption('analog-opamp-inverting'); await button('采用训练电路模板').click(); await button('打开模拟电子').click(); await button('运行模拟电子工作点').click(); await label('模拟分析状态').filter({ hasText: '工作点已通过' }).waitFor(); await button('关联模拟工作点到电赛实验').click();
    await label('电赛工作台状态').filter({ hasText: '实际结果与原始数据已关联' }).waitFor(); assert((await label('已关联证据').innerText()).includes('模拟电子工作点'), 'existing competition evidence captured'); journeys.push('competition actual analog evidence');
    assert(!errors.length, JSON.stringify(errors)); const result = { status: 'passed', root, journeys, errors }; await page.evaluate(value => { globalThis.__ampExisting = value; }, result); return result;
  } catch (e) { const result = { status: 'failed', message: String(e), journeys, errors }; await page.evaluate(value => { globalThis.__ampExisting = value; }, result); throw e; }
  finally { page.off('dialog', dialog); page.off('pageerror', error); }
}
