import { useEffect, useRef, useState } from 'react'
import type { AnalysisCapture } from '../analysis'
import { analogEngine, createAnalogInput, diodeLoadLine, idealOpampEngine, quasiStaticSweep, shockley, smallSignal } from '../analog'
import type { AnalogSolution, SweepPoint } from '../analog'
import { reviseProject } from '../engineering'
import type { EngineeringProject, JsonObject } from '../engineering'
import './analog.css'

const axis = (n: number) => { const text = Number(n.toPrecision(3)).toString(); return text.length > 8 ? n.toExponential(2) : text }
const fmt = (n: number) => Number(n.toPrecision(8)).toString()
const msg = (e: unknown) => e instanceof Error ? e.message : '分析失败。'
const regionNames: Readonly<Record<string, string>> = { forward: '正向', reverse: '反向', cutoff: '截止区', active: '放大区', saturation: '饱和区', triode: '三极区', 'ideal-negative-feedback': '理想负反馈', linear: '线性' }
function savedSettings(project: EngineeringProject, sheetId: string) {
  const raw = project.extensions['org.stray.analog']
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as JsonObject
  if (record.version !== 1 || record.sheetId !== sheetId) return null
  const settings = record.settings
  return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings as JsonObject : null
}
function Curve({ title, xLabel, yLabel, points, reference = [] }: { readonly title: string; readonly xLabel: string; readonly yLabel: string; readonly points: readonly (readonly [number, number])[]; readonly reference?: readonly (readonly [number, number])[] }) {
  if (!points.length) return null
  const xs = [...points, ...reference].map(p => p[0]), ys = [...points, ...reference].map(p => p[1]), xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(0, ...ys), ymax = Math.max(...ys)
  const x = (v: number) => 72 + (v - xmin) / (xmax - xmin || 1) * 460, y = (v: number) => 218 - (v - ymin) / (ymax - ymin || 1) * 180
  return <figure><figcaption>{title}</figcaption><svg viewBox="0 0 600 270" role="img" aria-label={title}><path className="analog-axis" d="M72 30V218H540" /><polyline className="analog-trace" points={points.map(([a, b]) => `${x(a)},${y(b)}`).join(' ')} />{!!reference.length && <polyline className="analog-loadline" points={reference.map(([a, b]) => `${x(a)},${y(b)}`).join(' ')} />}<text x="72" y="239">{axis(xmin)}</text><text x="470" y="239">{axis(xmax)}</text><text x="6" y="42">{axis(ymax)}</text><text x="6" y="215">{axis(ymin)}</text><text x="250" y="262">{xLabel}</text><text x="80" y="22">{yLabel}</text></svg></figure>
}
function loadLineData(result: AnalogSolution) {
  try {
    const line = diodeLoadLine(result), e = result.circuit.elements.find(e => e.id === line.componentId)!, d = result.devices.find(d => d.componentId === e.id)!, vd = d.terminalVolts[0]! - d.terminalVolts[1]!
    const min = Math.min(0, vd), max = Math.max(.05, vd + .025), points = Array.from({ length: 81 }, (_, i) => { const v = min + (max - min) * i / 80; return [v, shockley(v, e.parameters.saturationCurrent!, e.parameters.ideality!, e.parameters.temperature!).current] as const })
    return { line, d, vd, min, max, points }
  } catch (e) { return { error: msg(e) } }
}
function LoadLine({ result }: { readonly result: AnalogSolution }) {
  const data = loadLineData(result)
  if ('error' in data) return <p>{data.error}</p>
  const { line, d, vd, min, max, points } = data
  return <><p>实际工作点 VD={fmt(vd)} V，ID={fmt(d.terminalAmps[0]!)} A；线性外部网络 Vth={fmt(line.openVolts)} V，Rth={fmt(line.resistance)} Ω，负载线 ID=(Vth−VD)/Rth。</p><Curve title="二极管 I–V 与负载线 · 实线为器件，虚线为外部网络" xLabel="VD / V" yLabel="ID / A" points={points} reference={[[min, line.currentAt(min)], [max, line.currentAt(max)]]} /></>
}

export function AnalogPanel({ project, sheetId, onCommit, onCapture }: { readonly project: EngineeringProject; readonly sheetId: string; readonly onCommit: (next: EngineeringProject, expectedRevision: string) => boolean; readonly onCapture?: ((capture: AnalysisCapture<AnalogSolution>) => Promise<boolean>) | undefined }) {
  const sheet = project.sheets.find(s => s.id === sheetId)!, sources = sheet.components.filter(c => project.definitions.find(d => d.id === c.definitionId)!.kind === 'voltage-source')
  const [saved] = useState(() => savedSettings(project, sheetId))
  const anchor = (value: unknown) => typeof value === 'string' && sheet.anchors.some(a => a.id === value) ? value : undefined
  const [reference, setReference] = useState(() => anchor(saved?.referenceAnchorId) ?? sheet.ports.find(p => p.label === 'COM')?.anchorId ?? ''), [sourceId, setSourceId] = useState(() => typeof saved?.sourceId === 'string' && sources.some(c => c.id === saved.sourceId) ? saved.sourceId : sources.find(c => c.reference === 'V1')?.id ?? sources[0]?.id ?? ''), [output, setOutput] = useState(() => anchor(saved?.outputAnchorId) ?? sheet.ports.find(p => p.label === 'OUT')?.anchorId ?? '')
  const [capture, setCapture] = useState<AnalysisCapture<AnalogSolution> | null>(null), [sweep, setSweep] = useState<readonly SweepPoint[]>([]), [gain, setGain] = useState<ReturnType<typeof smallSignal> | null>(null)
  const [range, setRange] = useState(() => { const r = saved?.range; if (r && typeof r === 'object' && !Array.isArray(r)) { const { start, end, count } = r as JsonObject; if (typeof start === 'number' && typeof end === 'number' && typeof count === 'number' && start < end && Number.isInteger(count) && count >= 2 && count <= 121) return { start, end, count } } return { start: -2, end: 2, count: 41 } }), [amplitude, setAmplitude] = useState(() => typeof saved?.amplitude === 'number' && saved.amplitude > 0 ? saved.amplitude : .0001), [error, setError] = useState(''), [status, setStatus] = useState('选择参考与端口，运行实际模型。'), [busy, setBusy] = useState(false)
  const [settingsRevision, setSettingsRevision] = useState(0), [resultSettings, setResultSettings] = useState(-1)
  const abort = useRef<AbortController | null>(null), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; abort.current?.abort() } }, [])
  const result = capture?.result.outcome.kind === 'success' ? capture.result.outcome.value : null
  const stale = !!capture && (capture.project.revision !== project.revision || resultSettings !== settingsRevision)
  const changed = () => { setSettingsRevision(n => n + 1); setGain(null); setSweep([]) }
  async function run() {
    setBusy(true); setError(''); setGain(null); setSweep([])
    const controller = new AbortController(); abort.current = controller
    const snapshot = project, settings = settingsRevision
    try {
      const input = await createAnalogInput(snapshot, sheetId, reference || undefined), engine = input.configuration.analysisType === 'analog.ideal-opamp' ? idealOpampEngine : analogEngine
      const value = await engine.run(input, { signal: controller.signal, readAsset: () => Promise.reject(new Error('本分析不读取波形资产。')), onProgress: () => {} })
      if (!mounted.current) return
      setCapture({ project: snapshot, configuration: input.configuration, result: value }); setResultSettings(settings)
      if (value.outcome.kind !== 'success') { setError('diagnostics' in value.outcome ? value.outcome.diagnostics.map(d => `${d.code}：${d.message}`).join('；') : '分析已取消。'); setStatus('未生成已验证工作点。') }
      else setStatus('工作点已通过原始 KCL、约束残差与器件区域检查。')
    } catch (e) { if (mounted.current) { setError(msg(e)); setCapture(null) } } finally { if (mounted.current) setBusy(false) }
  }
  async function scan() {
    if (!result || stale) return
    setBusy(true); setError(''); const controller = new AbortController(); abort.current = controller
    try { const points = await quasiStaticSweep(result.circuit, sourceId, output, range.start, range.end, range.count, controller.signal); if (mounted.current) { setSweep(points); setStatus(`已实际求解 ${points.length} 个准静态工作点；横轴为输入电压，不是时间。`) } } catch (e) { if (mounted.current) { setSweep([]); setError(msg(e)) } } finally { if (mounted.current) setBusy(false) }
  }
  function localGain() { if (!result || stale) return; try { setGain(smallSignal(result, sourceId, output, amplitude)); setError('') } catch (e) { setGain(null); setError(msg(e)) } }
  function save() {
    if (!capture || !result || stale) return
    try {
      const record = JSON.parse(JSON.stringify({ version: 1, sheetId, provenance: capture.result.provenance, configuration: capture.configuration, settings: { referenceAnchorId: reference, sourceId, outputAnchorId: output, amplitude, range }, result, sweep, gain })) as JsonObject
      const next = reviseProject(project, project.revision, { extensions: { ...project.extensions, 'org.stray.analog': record } })
      if (!onCommit(next, project.revision)) throw new Error('工程已经变化，分析未写入。')
      setStatus('模型参数、端口方向、来源摘要与完整小型扫描已写入工程；导出文件保存。记录绑定原分析修订，重开后重新运行核验。')
    } catch (e) { setError(msg(e)) }
  }
  const diode = result?.devices.find(d => d.kind === 'diode')
  const sweepDiode = diode ? sweep.map(p => { const d = p.devices.find(d => d.componentId === diode.componentId)!; return [d.terminalVolts[0]! - d.terminalVolts[1]!, d.terminalAmps[0]!] as const }).sort((a, b) => a[0] - b[0]) : []
  return <section className="analog-panel" aria-label="模拟电子工作台" aria-busy={busy}>
    <h3>模拟电子 · 工作点与局部模型</h3>
    <p>支持：Shockley 二极管、单个接地发射极 NPN、长沟道增强 nMOS；独立理想负反馈运放。非线性暂态、击穿、热效应与高频模型不支持。</p>
    <div className="analog-form"><label>求解参考<select aria-label="模拟电子参考" value={reference} onChange={e => { setReference(e.target.value); changed() }}><option value="">使用显式标记 / GND</option>{sheet.anchors.map(a => <option key={a.id} value={a.id}>{sheet.ports.find(p => p.anchorId === a.id)?.label ?? a.id.slice(0, 8)}</option>)}</select></label><button disabled={busy} onClick={() => void run()}>运行模拟电子工作点</button>{busy && <button onClick={() => abort.current?.abort()}>取消分析</button>}</div>
    {stale && <p role="status" className="analog-warning">结果已过期：工程或分析设置已改变，请重新运行。</p>}
    {error && <p role="alert">{error}</p>}<p role="status" aria-label="模拟分析状态">{status}</p>
    {result && <><p>牛顿迭代 {result.iterations} 次 · 最大 KCL 残差 {fmt(result.maxKclAmps)} A · 电压约束残差 {fmt(result.maxConstraintVolts)} V{result.feedbackFactor !== undefined ? ` · 负反馈系数 ${fmt(result.feedbackFactor)}` : ''}</p>
      <div className="table-scroll"><table><caption>实际工作点 · 电流为流入每个模型端子（顺序见端子列）</caption><thead><tr><th>元件 / 区域</th><th>模型端子</th><th>对参考电压 / V</th><th>流入端子电流 / A</th><th>偏置差值 / V</th><th>局部参数</th></tr></thead><tbody>{result.devices.map(d => <tr key={d.componentId}><th>{d.reference} · {regionNames[d.region] ?? d.region}</th><td>{d.kind === 'npn' ? 'B / C / E' : d.kind === 'nmos' ? 'G / D / S' : d.kind === 'diode' ? 'A / K' : d.kind === 'ideal-opamp' ? '+ / − / OUT' : '1 / 2'}</td><td>{d.terminalVolts.map(fmt).join(' / ')}</td><td>{d.terminalAmps.map(fmt).join(' / ')}</td><td>{d.kind === 'npn' ? `VBE=${fmt(d.terminalVolts[0]! - d.terminalVolts[2]!)}，VCE=${fmt(d.terminalVolts[1]! - d.terminalVolts[2]!)}` : d.kind === 'nmos' ? `VGS=${fmt(d.terminalVolts[0]! - d.terminalVolts[2]!)}，VDS=${fmt(d.terminalVolts[1]! - d.terminalVolts[2]!)}` : `V(1−2)=${fmt(d.terminalVolts[0]! - d.terminalVolts[1]!)}`}</td><td>{d.gm !== undefined && <>gm={fmt(d.gm)} S </>}{d.gd !== undefined && <>gd={fmt(d.gd)} S </>}{d.rpi !== undefined && <>rπ={fmt(d.rpi)} Ω </>}{d.gds !== undefined && <>gds={fmt(d.gds)} S</>}</td></tr>)}</tbody></table></div>
      {diode && <LoadLine result={result} />}
      <div className="analog-form"><label>扰动电压源<select aria-label="模拟输入源" value={sourceId} onChange={e => { setSourceId(e.target.value); changed() }}>{sources.map(c => <option key={c.id} value={c.id}>{c.reference}</option>)}</select></label><label>输出连接点<select aria-label="模拟输出连接点" value={output} onChange={e => { setOutput(e.target.value); changed() }}><option value="">请选择</option>{sheet.anchors.map(a => <option key={a.id} value={a.id}>{sheet.ports.find(p => p.anchorId === a.id)?.label ?? a.id.slice(0, 8)}</option>)}</select></label></div>
      <fieldset disabled={busy || stale}><legend>小信号 · 同工作点雅可比低频导数</legend><label>输入扰动 / V<input aria-label="小信号扰动幅度" type="number" step="any" value={amplitude} onChange={e => { setAmplitude(Number(e.target.value)); setGain(null) }} /></label><button onClick={localGain}>计算局部电压增益</button>{gain && <p role="status">局部电压增益 Av={fmt(gain.gain)} V/V；扰动 {fmt(gain.amplitudeVolts)} V。{gain.description}</p>}</fieldset>
      <fieldset disabled={busy || stale}><legend>准静态输入扫描 · 逐点非线性直流（不是瞬态）</legend><div className="analog-form">{(['start', 'end', 'count'] as const).map((key, i) => <label key={key}>{['起始输入 / V', '终止输入 / V', '点数'][i]}<input aria-label={['扫描起始电压', '扫描终止电压', '扫描点数'][i]} type="number" step={key === 'count' ? '1' : 'any'} value={range[key]} onChange={e => { setRange({ ...range, [key]: Number(e.target.value) }); setSweep([]) }} /></label>)}<button onClick={() => void scan()}>运行准静态扫描</button></div></fieldset>
      {!!sweep.length && <><Curve title="实际准静态输入与输出" xLabel="输入 / V" yLabel="输出 / V" points={sweep.map(p => [p.inputVolts, p.outputVolts])} />{!!sweepDiode.length && <Curve title="二极管 I–V 与实际扫描工作点" xLabel="VD / V" yLabel="ID / A" points={sweepDiode} />}<details><summary>完整扫描数值与区域</summary><div className="table-scroll"><table><thead><tr><th>输入 / V</th><th>输出 / V</th><th>器件区域</th><th>KCL / A</th></tr></thead><tbody>{sweep.map((p, i) => <tr key={i}><td>{fmt(p.inputVolts)}</td><td>{fmt(p.outputVolts)}</td><td>{p.devices.filter(d => !['resistor', 'voltage-source', 'current-source'].includes(d.kind)).map(d => `${d.reference} ${regionNames[d.region]}`).join('；')}</td><td>{fmt(p.maxKclAmps)}</td></tr>)}</tbody></table></div></details></>}
      <button disabled={busy || stale} onClick={save}>将模拟分析记录写入工程</button>
      {onCapture && <button disabled={busy || stale} onClick={() => { if (capture) void onCapture(capture).then(accepted => { if (mounted.current) setStatus(accepted ? '实际工作点已关联到电赛实验。' : '证据未关联，请检查来源工程。') }).catch(e => { if (mounted.current) setError(msg(e)) }) }}>关联模拟工作点到电赛实验</button>}
    </>}
    <details><summary>模型公式与假设</summary><p>二极管：ID=IS·(exp(VD/(n·VT))−1)，VT=kB·T/q；gd=(ID+IS)/(n·VT)。IS 固定，不模拟温漂、结电容或击穿。</p><p>NPN：IB=IS·max(exp(VBE/VT)−1,0)，放大区 IC=β·IB；饱和区约束 VCE=VCEsat 并独立求 IC，检查 IC≤β·IB。gm=β·IS·exp(VBE/VT)/VT，rπ=β/gm；没有完整 Ebers–Moll、Early 效应或储存时间。</p><p>nMOS：u=VGS−Vth；截止 ID=0；三极区 ID=k·(u·VDS−VDS²/2)；饱和 ID=k·u²/2，gm=k·u。k 单位 A/V²；仅正向 VDS，无体效应、体二极管或沟道长度调制。</p><p>理想运放：先检验负反馈，再约束 V+=V−，输入电流为零；不能预测电源轨饱和、带宽、转换速率和噪声。</p></details>
    {project.extensions['org.stray.analog'] && <details><summary>工程内已保存的模拟记录（重新运行后验证当前电路）</summary><pre className="analog-record">{JSON.stringify(project.extensions['org.stray.analog'], null, 2)}</pre></details>}
  </section>
}
