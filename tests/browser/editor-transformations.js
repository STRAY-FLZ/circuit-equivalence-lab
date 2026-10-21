// Open the local preview or public application before running this existing CLI replay.
async (page) => {
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  const button=name=>page.getByRole('button',{name,exact:true});
  const errors=[],failed=[],journeys=[];
  const appUrl=page.url();
  const evidencePrefix=new URL(appUrl).hostname==='127.0.0.1'?'patch-local':'patch-live';
  const evidencePath=name=>`output/playwright/${evidencePrefix}-${name}`;
  const onError=e=>errors.push(e.message);
  const onConsole=m=>{if(m.type()==='error')errors.push(m.text());};
  const onResponse=r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});};
  const onFailed=r=>failed.push({url:r.url(),failure:r.failure()?.errorText});
  page.on('pageerror',onError);page.on('console',onConsole);page.on('response',onResponse);page.on('requestfailed',onFailed);
  page.setDefaultTimeout(10000);
  try {
    await page.setViewportSize({width:1440,height:1100});
    await page.goto(appUrl);
    assert((await page.getByLabel('应用版本',{exact:true}).innerText()).includes('v2.0.1'),'published application version 2.0.1');
    await button('原理图编辑器').click();
    const canvas=page.getByRole('application',{name:'原理图编辑画布'});
    const summary=()=>page.getByTestId('editor-summary').innerText();
    const clickWorld=async(x,y)=>{
      await canvas.scrollIntoViewIfNeeded();
      const point=await canvas.evaluate((svg,at)=>{const p=svg.createSVGPoint();p.x=at.x;p.y=at.y;const result=p.matrixTransform(svg.getScreenCTM());return {x:result.x,y:result.y};},{x,y});
      await page.mouse.click(point.x,point.y);
    };
    const newProject=async()=>{
      // Keep fixture replacement on the real save path; the CLI pauses at native dialogs.
      await save('integration-fixture-scratch.straylab.json');await button('新建工程').click();
    };
    const setPort=async(label,pin)=>{
      await button('外部端口').click();await page.getByLabel('标注名称',{exact:true}).fill(label);await button(pin).click();
    };
    const discover=async(type)=>{
      await button('识别可用变换').click();
      await page.getByRole('button',{name:new RegExp(`^${type} · `)}).first().click();
      await button('预览所选变换').click();
    };
    const save=async filename=>{
      const pending=page.waitForEvent('download');await button('导出工程').click();const download=await pending;
      await download.saveAs(evidencePath(filename));
    };
    const screenshot=async path=>{await page.evaluate(()=>globalThis.scrollTo(0,0));await page.screenshot({path:evidencePath(path.split('/').at(-1)),fullPage:true});};
    await page.getByLabel('工程名称',{exact:true}).fill('V2.0-D 串联集成验收');await button('更新名称').click();
    await button('电阻 R').click();await clickWorld(240,200);await clickWorld(560,200);
    await page.getByLabel('电阻值',{exact:true}).fill('220');await button('应用属性').click();
    const originalId=await button('R1 元件').getAttribute('data-component-id');
    await button('接线 W').click();await button('R1.2 引脚').click();await button('R2.1 引脚').click();
    await setPort('A','R1.1 引脚');await setPort('B','R2.2 引脚');
    await button('选择 V').click();
    await button('R1.2 引脚').click();
    assert(await page.getByText('2 个连接点 · 2 个元件引脚',{exact:true}).isVisible(),'derived electrical-net inspection');
    await discover('串联化简');
    assert(await page.getByText('已验证：外部端口行为在数值容差内一致',{exact:true}).isVisible(),'independent numerical equivalence');
    assert((await summary()).startsWith('2 个元件'),'preview must not mutate engineering project');
    assert(await canvas.locator('.editor-component.candidate-highlight').count()===2,'stable IDs highlight candidate');
    assert(await page.getByRole('group',{name:'工程原始电路图',exact:true}).isVisible(),'readable before diagram');
    assert(await page.getByRole('group',{name:'工程变换后电路图',exact:true}).isVisible(),'readable after diagram');
    await screenshot('output/playwright/integration-series-preview.png');
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:width===390?844:1100});
      for(const theme of ['light','dark']){
        const toggle=page.getByRole('switch',{name:'夜间模式'});
        if(await toggle.getAttribute('aria-checked')!==String(theme==='dark'))await toggle.click();
        assert(await page.evaluate(expected=>globalThis.document.documentElement.dataset.theme===expected,theme),'shared theme');
        assert(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),'no page overflow');
        await screenshot(`output/playwright/integration-${width}-${theme}.png`);
        await page.getByRole('region',{name:'工程等效变换与课程'}).screenshot({path:evidencePath(`integration-panel-${width}-${theme}.png`)});
      }
    }
    await page.setViewportSize({width:1440,height:1100});
    await button('学习此电路的变换').click();
    const lesson=page.getByRole('region',{name:'分步学习'});
    const stages=[];
    for(let step=1;step<=5;step++){
      const heading=await lesson.getByRole('heading',{level:2}).innerText();assert(heading.includes(`第 ${step} / 5 步`),'five-stage source lesson');stages.push(heading);
      if(step===3)assert((await lesson.getByLabel('数值代入').innerText()).includes('320'),'actual 100 + 220 substitution');
      if(step<5)await lesson.getByRole('button',{name:'下一步',exact:true}).click();
    }
    await screenshot('output/playwright/integration-lesson.png');
    await button('退出学习模式').click();await button('应用已验证变换').click();
    assert((await summary()).startsWith('1 个元件'),'atomic application');
    const replacementId=await button('R3 元件').getAttribute('data-component-id');
    await button('撤销').click();assert(await button('R1 元件').getAttribute('data-component-id')===originalId,'undo original UUID');
    await button('重做').click();assert(await button('R3 元件').getAttribute('data-component-id')===replacementId,'redo replacement UUID');
    await save('integration-transformed.straylab.json');
    await newProject();assert((await summary()).startsWith('0 个元件'),'empty project');
    await page.getByLabel('打开工程文件').setInputFiles(evidencePath('integration-transformed.straylab.json'));
    await page.getByRole('status').filter({hasText:'工程已打开'}).waitFor();
    assert(await button('R3 元件').getAttribute('data-component-id')===replacementId,'saved transformation stable identity');
    await button('R3 元件').click();assert(Math.abs(Number(await page.getByLabel('电阻值',{exact:true}).inputValue())-320)<1e-8,'actual reopened resistance');
    await save('integration-reopened.straylab.json');
    journeys.push({workflow:'draw → ports → discover → preview → verify → apply → undo → redo → save → reopen',stages});

    // Theme and responsive checks on an eligible user-created circuit, including its preview.
    await button('电阻 R').click();await clickWorld(560,400);
    await button('接线 W').click();await button('R3.2 引脚').click();await button('R1.1 引脚').click();
    await setPort('C','R1.2 引脚');await button('选择 V').click();
    await button('识别可用变换').click();
    // The reopened A/B boundary intentionally prevents eliminating the former B node.
    assert(await page.getByText(/未找到适用候选/).isVisible(),'existing observed B boundary protected');
    journeys.push('1440/390 widths and both themes; persisted observation boundary remains protected');

    // Draw distinct valid fixtures for all remaining transformation categories.
    await page.setViewportSize({width:1440,height:1100});
    const categories=[
      {name:'并联化简',groups:[['R1.1 引脚','R2.1 引脚'],['R1.2 引脚','R2.2 引脚']],ports:[['A','R1.1 引脚'],['B','R1.2 引脚']],count:2},
      {name:'Δ → Y',groups:[['R1.2 引脚','R2.1 引脚'],['R2.2 引脚','R3.1 引脚'],['R3.2 引脚','R1.1 引脚']],ports:[['A','R1.1 引脚'],['B','R2.1 引脚'],['C','R3.1 引脚']],count:3},
      {name:'Y → Δ',groups:[['R1.2 引脚','R2.2 引脚'],['R1.2 引脚','R3.2 引脚']],ports:[['A','R1.1 引脚'],['B','R2.1 引脚'],['C','R3.1 引脚']],count:3},
    ];
    for(const fixture of categories){
      await newProject();await button('电阻 R').click();
      for(let i=0;i<fixture.count;i++)await clickWorld(180+i*280,200+i*100);
      await button('接线 W').click();for(const [a,b]of fixture.groups){await button(a).click();await button(b).click();}
      for(const [label,pin]of fixture.ports)await setPort(label,pin);
      await button('选择 V').click();await discover(fixture.name);
      assert(await page.getByText('已验证：外部端口行为在数值容差内一致',{exact:true}).isVisible(),`${fixture.name} numerical verification`);
      assert(await page.getByRole('group',{name:'工程原始电路图',exact:true}).isVisible(),`${fixture.name} source diagram`);
      assert(await page.getByRole('group',{name:'工程变换后电路图',exact:true}).isVisible(),`${fixture.name} result diagram`);
      await screenshot(`output/playwright/integration-${fixture.count===2?'parallel':fixture.name==='Δ → Y'?'delta':'star'}.png`);
      await button('应用已验证变换').click();
      assert((await summary()).startsWith(fixture.count===2?'1 个元件':'3 个元件'),`${fixture.name} committed`);
      journeys.push(`${fixture.name}: drawn, observed, verified and committed`);
    }
    await newProject();await button('电阻 R').click();await clickWorld(240,200);await clickWorld(560,200);
    await button('接线 W').click();await button('R1.2 引脚').click();await button('R2.1 引脚').click();
    await discover('串联化简');assert(await button('应用已验证变换').isDisabled(),'inconclusive no-port writeback disabled');
    assert(await page.getByText('无法确定：数值验证未能建立等效性',{exact:true}).isVisible(),'honest inconclusive evidence');
    await button('电容 C').click();await clickWorld(700,400);await button('识别可用变换').click();
    assert(await page.getByText('当前配置不支持等效变换。',{exact:true}).isVisible(),'unsupported mixed circuit');
    assert((await summary()).startsWith('3 个元件'),'unsupported capacitor not discarded');
    journeys.push('inconclusive preview cannot commit; disconnected capacitor makes complete sheet unsupported');
    await button('等效变换与课程').click();
    assert(await page.getByRole('combobox',{name:'01 / 选择电路'}).locator('option').count()===9,'eight original V1 examples plus existing symmetric delta');
    await button('串联化简 R1 + R2').click();await button('预览等效变换').click();
    assert(await page.getByRole('group',{name:'原始电路图',exact:true}).isVisible(),'V1 source preview');
    assert(await page.getByRole('group',{name:'变换后电路图',exact:true}).isVisible(),'V1 transformed preview');
    assert(await page.getByRole('link',{name:'返回首页',exact:true}).getAttribute('href')==='https://stray-flz.github.io/stray-articles/','home link');
    journeys.push('V1 examples/previews/navigation and return-home destination retained');
    assert(errors.length===0,`browser errors ${JSON.stringify(errors)}`);assert(failed.length===0,`HTTP failures ${JSON.stringify(failed)}`);
    return {appUrl,applicationVersion:'2.0.1',evidencePrefix,browser:await page.context().browser().version(),journeys,errors,failed};
  } finally {
    page.off('pageerror',onError);page.off('console',onConsole);page.off('response',onResponse);page.off('requestfailed',onFailed);
  }
}
