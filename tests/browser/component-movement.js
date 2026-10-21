// Focused regression: each palette click places once; holding/dragging moves the original.
async (page) => {
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  const appUrl=page.url(),journeys=[],errors=[],failed=[];
  const evidencePrefix=new URL(appUrl).hostname==='127.0.0.1'?'component-move-local':'component-move-live';
  const button=name=>page.getByRole('button',{name,exact:true});
  const onError=e=>errors.push(e.message),onConsole=m=>{if(m.type()==='error')errors.push(m.text());};
  const onResponse=r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});};
  const onFailed=r=>failed.push({url:r.url(),failure:r.failure()?.errorText});
  page.on('pageerror',onError);page.on('console',onConsole);page.on('response',onResponse);page.on('requestfailed',onFailed);
  try{
    for(const width of[1440,390])for(const theme of['light','dark']){
      await page.goto(appUrl);await page.setViewportSize({width,height:width===390?844:1100});
      assert((await page.getByLabel('应用版本',{exact:true}).innerText()).includes('v2.0.2'),'release version 2.0.2');
      const toggle=page.getByRole('switch',{name:'夜间模式'});if(await toggle.getAttribute('aria-checked')!==String(theme==='dark'))await toggle.click();
      await button('原理图编辑器').click();
      const canvas=page.getByRole('application',{name:'原理图编辑画布'}),summary=()=>page.getByTestId('editor-summary').innerText();
      const at=async(x,y)=>canvas.evaluate((svg,p)=>{const v=svg.createSVGPoint();v.x=p.x;v.y=p.y;const q=v.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};},{x,y});
      const click=async(x,y)=>{await canvas.scrollIntoViewIfNeeded();const p=await at(x,y);await page.mouse.click(p.x,p.y);};
      const drag=async(x,y,toX,toY)=>{await canvas.scrollIntoViewIfNeeded();const a=await at(x,y),b=await at(toX,toY);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();};
      await button('电感 L').click();await click(240,200);
      const id=await button('L1 元件').getAttribute('data-component-id');
      await click(760,400);assert((await summary()).startsWith('1 个元件'),'placement must be single-use');
      await button('L1 元件').click();await drag(240,200,440,320);
      assert((await summary()).startsWith('1 个元件'),'held drag must not duplicate');
      assert(await button('L1 元件').getAttribute('data-component-id')===id,'same original identity');
      assert(await button('L1.1 引脚').getAttribute('cx')==='400'&&await button('L1.1 引脚').getAttribute('cy')==='320','original moved');
      await button('撤销').click();assert(await button('L1.1 引脚').getAttribute('cx')==='200','undo movement only');
      await button('重做').click();assert(await button('L1.1 引脚').getAttribute('cx')==='400','redo movement only');
      await button('电感 L').click();await drag(440,320,600,400);
      assert((await summary()).startsWith('1 个元件'),'drag existing component while placement armed must move');
      await click(760,200);assert((await summary()).startsWith('1 个元件'),'moving cancels armed placement');
      await button('电感 L').click();await click(240,200);
      assert((await summary()).startsWith('2 个元件')&&await button('L2 元件').count()===1,'explicit palette action permits one new component');
      await click(760,200);assert((await summary()).startsWith('2 个元件'),'second placement requires another palette click');
      assert(await button('L1 元件').getAttribute('data-component-id')===id,'identity preserved after explicit new component');
      await canvas.screenshot({path:`output/playwright/${evidencePrefix}-${width}-${theme}.png`});
      journeys.push({width,theme,heldDrag:'650ms, same UUID and count',armedPlacement:'cancelled by moving existing',newComponent:'one per palette click',undoRedo:'movement preserved'});
    }
    assert(errors.length===0&&failed.length===0,JSON.stringify({errors,failed}));
    return{appUrl,version:await page.getByLabel('应用版本',{exact:true}).innerText(),browser:await page.context().browser().version(),journeys,errors,failed};
  }finally{page.off('pageerror',onError);page.off('console',onConsole);page.off('response',onResponse);page.off('requestfailed',onFailed);}
}
