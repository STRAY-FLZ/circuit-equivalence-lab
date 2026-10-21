// Existing Playwright CLI: open the local built preview or actual public app first.
async (page) => {
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  const appUrl=page.url(),prefix=new URL(appUrl).hostname==='127.0.0.1'?'signal-local':'signal-live';
  const errors=[],failed=[],journeys=[];
  const onError=e=>errors.push(e.message),onConsole=m=>{if(m.type()==='error')errors.push(m.text());};
  const onResponse=r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});},onFailed=r=>failed.push({url:r.url(),failure:r.failure()?.errorText});
  page.on('pageerror',onError);page.on('console',onConsole);page.on('response',onResponse);page.on('requestfailed',onFailed);
  page.setDefaultTimeout(15000);
  try{
    await page.goto(appUrl);await page.setViewportSize({width:1440,height:1100});
    const button=name=>page.getByRole('button',{name,exact:true}),label=name=>page.getByLabel(name,{exact:true});
    const status=page.getByRole('status',{name:'信号处理状态'});
    const save=async(buttonName,file)=>{const pending=page.waitForEvent('download');await button(buttonName).click();const download=await pending;await download.saveAs(`output/playwright/${prefix}-${file}`);};
    const rms=async()=>Number.parseFloat(await page.getByTestId('measurement-totalRms').innerText());
    const generate=async frequency=>{await label('频率 / Hz').fill(String(frequency));await button('生成并分析').click();await status.filter({hasText:'合成采样已生成'}).waitFor();};
    await button('信号实验室').click();await generate(100);
    assert(Math.abs(await rms()-Math.SQRT1_2)<1e-7,'100 Hz 1V peak sampled RMS');
    assert((await page.getByTestId('fft-peak').innerText()).includes('100 Hz · 1 V 峰值'),'bin-centered FFT frequency/amplitude');
    assert((await page.getByTestId('fft-metadata').innerText()).includes('N = 1024 · fs = 1024 Hz · Δf = 1 Hz'),'real FFT axis and sampling metadata');
    const originalPath=await page.getByTestId('waveform-path').getAttribute('d');
    const plot=page.getByRole('application',{name:'CH1 时域波形'});await plot.scrollIntoViewIfNeeded();
    const point=await plot.evaluate(svg=>{const p=svg.createSVGPoint();p.x=70+123/1023*(svg.viewBox.baseVal.width-88);p.y=100;const at=p.matrixTransform(svg.getScreenCTM());return{x:at.x,y:at.y};});
    await page.mouse.click(point.x,point.y);assert((await label('CH1 光标读数').innerText()).includes('样本 123'),'cursor reads original sample index');
    await label('时间缩放').selectOption('4');await label('水平位置').focus();await page.keyboard.press('End');
    assert(Math.abs(await rms()-Math.SQRT1_2)<1e-7,'display zoom does not change full-capture measurement');
    await generate(200);assert((await page.getByTestId('fft-peak').innerText()).includes('200 Hz'),'frequency control updates spectrum');assert(await page.getByTestId('waveform-path').getAttribute('d')!==originalPath,'frequency control updates actual waveform');
    journeys.push('100Hz / 1V peak / 1024Hz / 1024 samples: waveform, cursor, RMS≈0.7071068V and FFT 100Hz/1V; 200Hz updates both views');
    await label('采样点数').fill('65536');const started=Date.now();await generate(200);const generationMs=Date.now()-started;
    assert((await page.getByTestId('fft-metadata').innerText()).includes('N = 65536'),'maximum supported capture processed in full');
    assert((await page.getByTestId('waveform-path').getAttribute('d')).split('L').length<=2048,'display bounded separately from original samples');
    journeys.push({capturePoints:65536,generationAndAnalysisMs:generationMs,display:'bounded min/max envelope, statistics and FFT use full capture'});
    await label('选择 CSV 文件').setInputFiles('output/playwright/signal-input.csv');
    await button('确认列与单位并导入').waitFor();await label('时间单位').selectOption('ms');await label('单位 CH1_mV').selectOption('mV');await label('导入通道 CH2_mA').check();await label('单位 CH2_mA').selectOption('mA');
    await button('确认列与单位并导入').click();await status.filter({hasText:'CSV 已导入'}).waitFor();
    assert(await page.getByTestId('waveform-path').count()===2,'multi-channel actual CSV waveforms');assert(Math.abs(await rms()-Math.SQRT1_2)<1e-7,'explicit millivolt conversion');
    await label('分析通道').selectOption({label:'CH2_mA / A'});await status.filter({hasText:'已基于当前完整采样记录更新分析'}).waitFor();assert(Math.abs(await rms()-0.01*Math.SQRT1_2)<1e-9,'second current channel measurement with canonical A units');
    await label('分析通道').selectOption({label:'CH1_mV / V'});await status.filter({hasText:'已基于当前完整采样记录更新分析'}).waitFor();
    await label('窗函数').selectOption('hann');await label('FFT 前去均值').check();await button('运行 FFT').click();await status.filter({hasText:'已基于当前完整采样记录更新分析'}).waitFor();
    assert((await page.getByTestId('fft-metadata').innerText()).includes('coherent gain = 0.5'),'Hann normalization metadata');assert((await page.getByTestId('fft-peak').innerText()).includes('100 Hz · 1 V 峰值'),'Hann coherent gain preserves bin-centered sine amplitude');
    await save('导出波形 CSV','waveform.csv');await save('导出测量结果 JSON','measurements.json');await save('导出完整工程','project.straylab.json');
    journeys.push('CSV headers confirmed; ms/mV/mA converted explicitly; two synchronized channels measured; Hann + DC removal; actual CSV/report/project downloads');
    for(const width of[1440,390])for(const theme of['light','dark']){
      await page.setViewportSize({width,height:width===390?844:1100});const toggle=page.getByRole('switch',{name:'夜间模式'});if(await toggle.getAttribute('aria-checked')!==String(theme==='dark'))await toggle.click();
      await label('时间缩放').selectOption('16');
      const scope=page.getByRole('region',{name:'虚拟示波器',exact:true}),fft=page.getByRole('region',{name:'FFT 频谱分析',exact:true});
      await scope.screenshot({path:`output/playwright/${prefix}-scope-${width}-${theme}.png`});await fft.screenshot({path:`output/playwright/${prefix}-fft-${width}-${theme}.png`});
      assert(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),'no page-level horizontal overflow');
      const fontPixels=await page.getByRole('application',{name:'CH1_mV 时域波形'}).evaluate(svg=>Number.parseFloat(globalThis.getComputedStyle(svg.querySelector('text')).fontSize)*svg.getScreenCTM().a);assert(fontPixels>=10,'legible responsive chart axes');
      const separated=await page.locator('.signal-chart svg').evaluateAll(charts=>charts.every(svg=>{const labels=Array.from(svg.querySelectorAll('text')).filter(t=>t.getAttribute('y')==='202').map(t=>t.getBoundingClientRect()).sort((a,b)=>a.left-b.left);return labels.length>=2&&labels.every((label,i)=>i===0||labels[i-1].right+2<=label.left);}));assert(separated,'time/frequency tick labels must not overlap');
      journeys.push({width,theme,scopeAndSpectrum:'actual SVG samples/axes, no page overflow',axisFontPixels:fontPixels,tickLabelsSeparated:separated});
    }
    await page.setViewportSize({width:1440,height:1100});
    await label('选择 CSV 文件').setInputFiles('output/playwright/signal-invalid.csv');await button('确认列与单位并导入').click();await page.getByRole('alert',{name:'信号处理状态'}).waitFor();
    assert((await page.getByRole('alert',{name:'信号处理状态'}).innerText()).includes('第 '),'invalid CSV has physical row/column feedback');assert(Math.abs(await rms()-Math.SQRT1_2)<1e-7,'invalid import leaves current dataset intact');
    // Real project reopening on a fresh workbench, preserving stable source and processing settings.
    await page.goto(appUrl);await button('信号实验室').click();await label('打开信号工程').setInputFiles(`output/playwright/${prefix}-project.straylab.json`);await status.filter({hasText:'工程已打开'}).waitFor();
    assert(Math.abs(await rms()-Math.SQRT1_2)<1e-7,'project reopens actual samples');assert(await label('窗函数').inputValue()==='hann'&&await label('FFT 前去均值').isChecked(),'FFT settings preserved');
    await save('导出完整工程','reopened.straylab.json');
    await label('选择 CSV 文件').setInputFiles(`output/playwright/${prefix}-waveform.csv`);await label('导入通道 CH2_A').check();await label('单位 CH2_A').selectOption('A');await button('确认列与单位并导入').click();await status.filter({hasText:'CSV 已导入'}).waitFor();
    assert(Math.abs(await rms()-Math.SQRT1_2)<1e-7&&await page.getByTestId('waveform-path').count()===2,'actual CSV export/import round trip');
    journeys.push('Malformed CSV rejected without replacing active data; real project export/reopen retains samples and Hann/DC settings; exported CSV reimports both channels');
    await button('原理图编辑器').click();await button('电阻 R').click();const canvas=page.getByRole('application',{name:'原理图编辑画布'});await canvas.scrollIntoViewIfNeeded();
    const pos=await canvas.evaluate(svg=>{const p=svg.createSVGPoint();p.x=240;p.y=200;const q=p.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};});await page.mouse.click(pos.x,pos.y);assert((await page.getByTestId('editor-summary').innerText()).startsWith('1 个元件'),'existing one-shot schematic placement');
    await button('等效变换与课程').click();await button('串联化简 R1 + R2').click();await button('预览等效变换').click();assert(await page.getByRole('group',{name:'变换后电路图',exact:true}).isVisible(),'existing V1 transformation preview');
    await button('信号实验室').click();assert(Math.abs(await rms()-Math.SQRT1_2)<1e-7,'signal dataset retained across navigation');
    journeys.push('Existing editor placement and V1 transformation preview remain available; active signal data survives tab navigation');
    assert(errors.length===0&&failed.length===0,JSON.stringify({errors,failed}));
    return{appUrl,version:await page.getByLabel('应用版本',{exact:true}).innerText(),browser:await page.context().browser().version(),journeys,errors,failed};
  }finally{page.off('pageerror',onError);page.off('console',onConsole);page.off('response',onResponse);page.off('requestfailed',onFailed);}
}
