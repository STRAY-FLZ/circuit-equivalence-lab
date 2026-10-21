// Existing Playwright CLI replay. Open a fresh local/public application first.
async (page) => {
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  const button=name=>page.getByRole('button',{name,exact:true});
  const prefix=new URL(page.url()).hostname==='127.0.0.1'?'wire-local':'wire-live';
  const errors=[],failed=[],journeys=[];
  const onError=e=>errors.push(e.message);
  const onConsole=m=>{if(m.type()==='error')errors.push(m.text());};
  const onResponse=r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});};
  const onFailed=r=>failed.push({url:r.url(),failure:r.failure()?.errorText});
  page.on('pageerror',onError);page.on('console',onConsole);page.on('response',onResponse);page.on('requestfailed',onFailed);
  page.setDefaultTimeout(10000);
  try {
    await button('原理图编辑器').click();
    const canvas=page.getByRole('application',{name:'原理图编辑画布'});
    const preview=page.getByTestId('wire-preview');
    const summary=()=>page.getByTestId('editor-summary').innerText();
    const worldPoint=async(x,y)=>canvas.evaluate((svg,at)=>{const p=svg.createSVGPoint();p.x=at.x;p.y=at.y;const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};},{x,y});
    const pinPoint=async name=>button(name).evaluate(circle=>{const p=circle.ownerSVGElement.createSVGPoint();p.x=circle.cx.baseVal.value;p.y=circle.cy.baseVal.value;const out=p.matrixTransform(circle.getScreenCTM());return{x:out.x,y:out.y,worldX:p.x,worldY:p.y};});
    const save=async name=>{const pending=page.waitForEvent('download');await button('导出工程').click();await(await pending).saveAs(`output/playwright/${prefix}-${name}.straylab.json`);};
    const start=async()=>{await save('scratch');await button('新建工程').click();await button('电阻 R').click();await canvas.scrollIntoViewIfNeeded();for(const [x,y]of[[240,180],[760,400]]){const p=await worldPoint(x,y);await page.mouse.click(p.x,p.y);}await button('选择 V').click();};
    const dragStart=async()=>{await canvas.scrollIntoViewIfNeeded();const p=await pinPoint('R1.2 引脚');await page.mouse.move(p.x,p.y);await page.mouse.down();return p;};
    const checkPreview=async(source,end,target)=>{
      assert(await preview.isVisible(),'real visible wire path while pointer held');
      const data=await preview.evaluate(path=>({d:path.getAttribute('d'),stroke:globalThis.getComputedStyle(path).stroke,dash:globalThis.getComputedStyle(path).strokeDasharray,width:globalThis.getComputedStyle(path).strokeWidth,opacity:globalThis.getComputedStyle(path).opacity}));
      const d=source.worldX===end.x||source.worldY===end.y?`M${source.worldX} ${source.worldY} L${end.x} ${end.y}`:`M${source.worldX} ${source.worldY} L${end.x} ${source.worldY} L${end.x} ${end.y}`;
      const numbers=data.d.match(/-?[\d.]+/g).map(Number),expected=d.match(/-?[\d.]+/g).map(Number);
      assert(numbers.length===expected.length&&numbers.every((n,i)=>Math.abs(n-expected[i])<0.01),'preview follows exact source and pointer in SVG coordinates');
      assert(data.stroke!=='none'&&data.dash!=='none'&&Number.parseFloat(data.width)>0&&Number(data.opacity)>0,'contrasted dashed wire ink');
      assert((await preview.getAttribute('data-target-id'))===target,'exact snap identity');
      assert((await summary()).includes('0 条导线'),'preview must not commit graph');
      return data;
    };
    for(const width of[1440,390]){
      await page.setViewportSize({width,height:width===390?844:1100});
      for(const theme of['light','dark']){
        const toggle=page.getByRole('switch',{name:'夜间模式'});if(await toggle.getAttribute('aria-checked')!==String(theme==='dark'))await toggle.click();
        await start();
        // Preliminary pin selection followed by drag; direct drag is exercised below.
        await button('R1.2 引脚').click();const source=await dragStart();
        for(const [x,y]of[[360,240],[460,300],[560,340]]){const p=await worldPoint(x,y);await page.mouse.move(p.x,p.y);await checkPreview(source,{x,y},null);}
        await canvas.screenshot({path:`output/playwright/${prefix}-preview-${width}-${theme}.png`});
        const target=await pinPoint('R2.1 引脚'),targetId=await button('R2.1 引脚').getAttribute('data-anchor-id');
        await page.mouse.move(target.x+8,target.y);
        await checkPreview(source,{x:target.worldX,y:target.worldY},targetId);
        assert(await button('R2.1 引脚').evaluate(e=>e.parentElement.classList.contains('wire-target')),'visible valid target highlight');
        await canvas.screenshot({path:`output/playwright/${prefix}-snapped-${width}-${theme}.png`});
        await page.mouse.up();assert(await preview.count()===0,'preview removed after commit');
        assert((await summary()).includes('1 条导线 · 3 个电气网络'),'permanent graph and derived nets');
        await button('R1.2 引脚').click();assert(await page.getByText('2 个连接点 · 2 个元件引脚',{exact:true}).isVisible(),'real net inspection');
        await button('撤销').click();assert((await summary()).includes('0 条导线'),'one-step undo');
        await button('重做').click();assert((await summary()).includes('1 条导线'),'one-step redo');
        await save(`connected-${width}-${theme}`);
        await button('新建工程').click();await page.getByLabel('打开工程文件').setInputFiles(`output/playwright/${prefix}-connected-${width}-${theme}.straylab.json`);
        await page.getByRole('status').filter({hasText:'工程已打开'}).waitFor();
        assert((await summary()).includes('1 条导线 · 3 个电气网络'),'actual file persistence');
        await canvas.scrollIntoViewIfNeeded();const wirePoint=await worldPoint(500,180);await page.mouse.click(wirePoint.x,wirePoint.y);await button('删除导线').click();
        // Existing component body movement remains independent of a pin drag.
        await canvas.scrollIntoViewIfNeeded();const body=await worldPoint(240,180),next=await worldPoint(280,220);
        await page.mouse.move(body.x,body.y);await page.mouse.down();await page.mouse.move(next.x,next.y,{steps:3});await page.mouse.up();
        assert(await button('R1.2 引脚').getAttribute('cx')==='320','component body movement');await button('撤销').click();
        await button('放大画布').click();await button('平移').click();await canvas.scrollIntoViewIfNeeded();
        const empty=await worldPoint(480,500);await page.mouse.move(empty.x,empty.y);await page.mouse.down();await page.mouse.move(empty.x+20,empty.y+12,{steps:3});await page.mouse.up();await button('选择 V').click();
        const zoomSource=await dragStart(),zoomTarget=await pinPoint('R2.1 引脚');
        await page.mouse.move(zoomTarget.x+13,zoomTarget.y);await checkPreview(zoomSource,{x:zoomTarget.worldX,y:zoomTarget.worldY},await button('R2.1 引脚').getAttribute('data-anchor-id'));
        await page.mouse.move(zoomTarget.x+16,zoomTarget.y);assert(await preview.getAttribute('data-target-id')===null,'screen-pixel snap radius independent of zoom');
        await page.keyboard.press('Escape');await page.mouse.up();assert(await preview.count()===0&&(await summary()).includes('0 条导线'),'Escape cancellation');
        await dragStart();const invalid=await worldPoint(420,300);await page.mouse.move(invalid.x,invalid.y);await page.mouse.up();assert(await preview.count()===0&&(await summary()).includes('0 条导线'),'invalid release cancellation');
        await dragStart();const end=await pinPoint('R2.1 引脚');await page.mouse.move(end.x,end.y);await page.mouse.up();assert((await summary()).includes('1 条导线 · 3 个电气网络'),'direct drag after zoom/pan');
        assert(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),'responsive page width');
        journeys.push({width,theme,visiblePreview:'three intermediate positions and snapped endpoint',history:'undo/redo',persistence:'actual export/reopen',coordinates:'zoom/pan and 14px snap',cancellation:'Escape and invalid release'});
      }
    }
    // Chromium pen pointer through CDP, using the same browser event path as mouse.
    await page.setViewportSize({width:1440,height:1100});await start();await canvas.scrollIntoViewIfNeeded();
    const cdp=await page.context().newCDPSession(page),penSource=await pinPoint('R1.2 引脚'),penTarget=await pinPoint('R2.1 引脚');
    try{
      await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:penSource.x,y:penSource.y,button:'left',buttons:1,clickCount:1,pointerType:'pen'});
      await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:penTarget.x,y:penTarget.y,button:'left',buttons:1,pointerType:'pen'});
      await checkPreview(penSource,{x:penTarget.worldX,y:penTarget.worldY},await button('R2.1 引脚').getAttribute('data-anchor-id'));
      await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:penTarget.x,y:penTarget.y,button:'left',buttons:0,clickCount:1,pointerType:'pen'});
      assert((await summary()).includes('1 条导线 · 3 个电气网络'),'CDP pen-like pointer commit');
      journeys.push('Chromium CDP pen-like press/move/preview/release passed; not physical hardware');
    }finally{await cdp.detach();}
    assert(errors.length===0&&failed.length===0,JSON.stringify({errors,failed}));
    return{url:page.url(),browser:await page.context().browser().version(),version:await page.getByLabel('应用版本',{exact:true}).innerText(),journeys,errors,failed};
  }finally{page.off('pageerror',onError);page.off('console',onConsole);page.off('response',onResponse);page.off('requestfailed',onFailed);}
}
