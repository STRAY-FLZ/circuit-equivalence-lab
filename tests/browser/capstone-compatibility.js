async page => {
  const button = name => page.getByRole('button', {name, exact:true}), label = name => page.getByLabel(name, {exact:true});
  const dialog = d => d.accept(); page.on('dialog', dialog);
  try {
    const prefix = new URL(page.url()).hostname === '127.0.0.1' ? 'capstone-local' : 'capstone-live';
    await button('V3综合实验').click();
    await label('综合实验文件').setInputFiles(`output/playwright/${prefix}-report.html`);
    await label('综合实验状态').filter({hasText:'工程已重开'}).waitFor();
    if (!(await label('实验有效性').innerText()).includes('历史')) throw Error('HTML must reopen historical');
    await button('典型电路图谱').click(); await label('搜索电路图谱').fill('运算放大器频率特性');
    await page.locator('[data-template-id="opamp-follower"]').click(); await button('运算放大器频率特性实验').click();
    await button('求解有限增益直流').click(); await label('运放分析状态').filter({hasText:'直流已验证'}).waitFor();
    const dc = await page.getByRole('region',{name:'运放直流结果',exact:true}).innerText();
    if (!dc.includes('Vout=0.099999')) throw Error('original finite follower DC');
    await button('运行运放频率扫描').click(); await label('运放分析状态').filter({hasText:'频率分析完成'}).waitFor();
    const closed = await page.getByRole('region',{name:'运放闭环结果',exact:true}).innerText();
    const loop = await page.getByRole('region',{name:'运放环路结果',exact:true}).innerText();
    const cutoff = Number(closed.match(/截止估计：([\d.eE+-]+)/)?.[1]), margin = Number(loop.match(/相位裕度：([\d.eE+-]+)/)?.[1]);
    if (Math.abs(cutoff/1000010-1) >= .005 || Math.abs(margin-90.000573) >= .05 || !Number.isFinite(cutoff+margin)) throw Error('original opamp metrics');
    const result = {status:'passed',htmlHistorical:true,dc,cutoff,margin}; await page.evaluate(x=>{globalThis.__capstoneTail=x},result); return result;
  } finally {page.off('dialog',dialog)}
}
