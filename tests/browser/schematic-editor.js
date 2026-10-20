// Run with the existing playwright-cli run-code --filename command against a local preview.
async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const button = name => page.getByRole('button', { name, exact: true });
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) failed.push({url:r.url(),status:r.status()}); });
  const results = [];
  page.setDefaultTimeout(10000);
  await page.setViewportSize({width:1440,height:1100});
  await page.goto('http://127.0.0.1:4173/circuit-equivalence-lab/');
  await button('原理图编辑器').click();
  const canvas = page.getByRole('application', {name:'原理图编辑画布'});
  const screenPoint = async (x,y) => {
    await canvas.scrollIntoViewIfNeeded();
    return canvas.evaluate((svg,at) => {
      const p=svg.createSVGPoint();p.x=at.x;p.y=at.y;
      const result=p.matrixTransform(svg.getScreenCTM());
      return {x:result.x,y:result.y};
    },{x,y});
  };
  const clickWorld = async (x,y) => { const p=await screenPoint(x,y);await page.mouse.click(p.x,p.y); };
  const summary = () => page.getByTestId('editor-summary').innerText();
  const downloadProject = async filename => {
    const pending=page.waitForEvent('download');await button('导出工程').click();
    const download=await pending;await download.saveAs(`output/playwright/${filename}`);
    return download;
  };
  const openProject = async path => {
    await page.getByLabel('打开工程文件').setInputFiles(path);
    await page.getByRole('status').filter({hasText:'工程已打开'}).waitFor();
  };
  await page.getByLabel('工程名称',{exact:true}).fill('Chrome 电阻连接实验');await button('更新名称').click();
  await button('电阻 R').click();await clickWorld(240,200);await clickWorld(560,200);
  const firstId=await button('R1 元件').getAttribute('data-component-id');
  const firstPin=await button('R1.2 引脚').getAttribute('data-anchor-id');
  await button('接线 W').click();await button('R1.2 引脚').click();await button('R2.1 引脚').click();
  assert((await summary()).includes('2 个元件 · 1 条导线 · 3 个电气网络'),'real pin connectivity');
  await button('选择 V').click();await button('R1.2 引脚').click();
  assert(await page.getByText('2 个连接点 · 2 个元件引脚',{exact:true}).isVisible(),'derived net inspector');
  results.push('two resistors connected and derived net inspected');
  await button('R1 元件').click();await page.getByLabel('电阻值',{exact:true}).fill('330');await button('应用属性').click();
  await button('选择 V').click();
  const start=await screenPoint(240,200),end=await screenPoint(280,300);
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();
  assert(await button('R1.1 引脚').getAttribute('cx')==='240','drag snapped x');
  assert(await button('R1.1 引脚').getAttribute('cy')==='300','drag snapped y');
  await button('撤销').click();
  assert(await button('R1.1 引脚').getAttribute('cy')==='200','one drag is one undo transaction');
  await button('重做').click();
  assert(await button('R1.1 引脚').getAttribute('cy')==='300','redo drag');
  await button('R1 元件').click();await canvas.focus();await page.keyboard.press('r');
  assert(await button('R1.1 引脚').getAttribute('cx')==='280','keyboard rotation');
  assert(await button('R1.1 引脚').getAttribute('cy')==='260','rotated pin y');
  results.push('property update; real pointer drag with one undo/redo transaction; keyboard rotation');
  await button('接地 GND').click();await button('R1.1 引脚').click();
  await button('求解参考').click();await button('R2.2 引脚').click();
  assert((await summary()).includes('3 个电气网络'),'reference marker does not connect ground');
  await button('选择 V').click();
  await downloadProject('editor-circuit.straylab.json');
  await button('新建工程').click();assert((await summary()).startsWith('0 个元件'),'new empty project');
  await openProject('output/playwright/editor-circuit.straylab.json');
  assert(await button('R1 元件').getAttribute('data-component-id')===firstId,'component UUID round trip');
  assert(await button('R1.2 引脚').getAttribute('data-anchor-id')===firstPin,'pin anchor UUID round trip');
  assert(await button('R1.1 引脚').getAttribute('cy')==='260','geometry round trip');
  await button('R1 元件').click();assert(await page.getByLabel('电阻值',{exact:true}).inputValue()==='330','parameter round trip');
  assert((await summary()).includes('2 个元件 · 1 条导线 · 3 个电气网络'),'graph round trip');
  await downloadProject('editor-reopened.straylab.json');
  results.push('actual browser download then file import retains graph, IDs, values, geometry and markers');
  await button('适合视图').click();
  if(await page.getByRole('switch',{name:'夜间模式'}).getAttribute('aria-checked')!=='true')await page.getByRole('switch',{name:'夜间模式'}).click();
  for (const theme of ['light','dark']) {
    const toggle=page.getByRole('switch',{name:'夜间模式'});
    if (await toggle.getAttribute('aria-checked')!==String(theme==='dark'))await toggle.click();
    await page.waitForFunction(expected=>globalThis.localStorage.getItem('stray-theme')===expected,theme);
    await page.screenshot({path:`output/playwright/editor-desktop-${theme}.png`,fullPage:true});
  }
  assert(await page.getByRole('link',{name:'返回首页',exact:true}).getAttribute('href')==='https://stray-flz.github.io/stray-articles/','home link retained');
  await button('等效变换与课程').click();
  await button('串联化简 R1 + R2').click();await button('预览等效变换').click();
  assert(await page.getByRole('group',{name:'原始电路图'}).isVisible(),'original V1 preview');
  assert(await page.getByRole('group',{name:'变换后电路图'}).isVisible(),'transformed V1 preview');
  await button('开始分步学习').click();
  const lesson=page.getByRole('region',{name:'分步学习'});
  for(let step=1;step<=5;step++) {
    assert((await lesson.getByRole('heading',{level:2}).innerText()).includes(`第 ${step} / 5 步`),'V1 lesson stage');
    if(step<5)await button('下一步').click();
  }
  results.push('both themes, home link and V1 original/transformed previews plus all five lesson stages');
  await button('原理图编辑器').click();assert(await button('R1 元件').getAttribute('data-component-id')===firstId,'navigation keeps engineering project');
  await page.setViewportSize({width:390,height:844});
  await button('适合视图').click();
  assert(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),'390px no page overflow');
  await button('R1 元件').click();
  assert(await page.getByLabel('电阻值',{exact:true}).inputValue()==='330','narrow property editor');
  for(const theme of ['light','dark']) {
    const toggle=page.getByRole('switch',{name:'夜间模式'});
    if(await toggle.getAttribute('aria-checked')!==String(theme==='dark'))await toggle.click();
    await page.screenshot({path:`output/playwright/editor-mobile-${theme}.png`,fullPage:true});
  }
  results.push('390px responsive layout, narrow selection/property access and both themes');
  for(let i=0;i<3;i++)await button('放大画布').click();
  await button('平移').click();await canvas.scrollIntoViewIfNeeded();
  const box=await canvas.boundingBox(),before=await canvas.getAttribute('viewBox');
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+150,box.y+box.height/2+10,{steps:10});await page.mouse.up();
  assert(await canvas.getAttribute('viewBox')!==before,'narrow pan after zoom');
  assert(await button('撤销').isDisabled(),'viewport creates no engineering revision');
  await button('选择 V').click();await page.evaluate(()=>globalThis.scrollTo(0,0));
  await page.screenshot({path:'output/playwright/editor-mobile-detail.png',fullPage:true});
  results.push('narrow zoom/pan detail with no data revision');
  await page.setViewportSize({width:1440,height:1100});await button('新建工程').click();
  await button('接线 W').click();
  for(const [x,y]of [[100,200],[500,200],[300,100],[300,300]])await clickWorld(x,y);
  assert((await summary()).includes('2 条导线 · 2 个电气网络'),'crossing stays disconnected');
  await button('结点 J').click();await clickWorld(300,200);
  assert((await summary()).includes('4 条导线 · 1 个电气网络'),'explicit junction connects both wires');
  await page.screenshot({path:'output/playwright/editor-junction.png',fullPage:true});
  await button('撤销').click();assert((await summary()).includes('2 条导线 · 2 个电气网络'),'junction undo');
  await button('重做').click();assert((await summary()).includes('4 条导线 · 1 个电气网络'),'junction redo');
  for(const [name,x]of [['电阻 R',140],['电容 C',300],['电感 L',460],['电压源 V',620],['电流源 I',780]]){
    await button(name).click();await clickWorld(x,440);
  }
  assert((await summary()).startsWith('5 个元件'),'five real palette kinds');
  await page.screenshot({path:'output/playwright/editor-palette.png',fullPage:true});
  results.push('real disconnected crossings, explicit junction, undo/redo and all five palette kinds');
  assert(errors.length===0,`browser errors: ${JSON.stringify(errors)}`);
  assert(failed.length===0,`HTTP failures: ${JSON.stringify(failed)}`);
  return {browser:await page.context().browser().version(),results,errors,failed,summary:await summary()};
}
