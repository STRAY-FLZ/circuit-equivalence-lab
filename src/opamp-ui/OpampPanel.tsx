import { useEffect, useRef, useState } from 'react'
import type { AnalysisCapture, AnalysisInput } from '../analysis'
import { createOpampInput, opampEngine, openLoopGain, prepareOpamp, validateOpampModel } from '../opamp'
import type { OpampPrepared, OpampResult, OpampSettings } from '../opamp'
import { pointFromComplex } from '../opamp/model'
import { sweepFrequencies, transferAt } from '../ac'
import type { SweepOptions, SweepPoint, SweepResult } from '../ac'
import { BodeChart } from '../ac-ui/BodeChart'
import { applyEdit } from '../editing'
import { reviseProject } from '../engineering'
import type { EngineeringProject, JsonObject } from '../engineering'
import '../ac-ui/ac.css'
import '../amplifier-ui/amplifier.css'

const fmt = (n: number) => Number(n.toPrecision(8)).toString()
const errorText = (error: unknown) => error instanceof Error ? error.message : '分析失败。'
function initialSettings(project: EngineeringProject, sheetId: string): OpampSettings {
  const sheet = project.sheets.find(s => s.id === sheetId)!, port = (name: string) => sheet.ports.find(p => p.label === name)?.anchorId ?? ''
  const source = sheet.components.find(c => c.reference === 'V1' && project.definitions.find(d => d.id === c.definitionId)?.kind === 'voltage-source') ?? sheet.components.find(c => project.definitions.find(d => d.id === c.definitionId)?.kind === 'voltage-source')
  const defaults: OpampSettings = { referenceAnchorId: port('COM'), excitationSourceId: source?.id ?? '', magnitudeRms: .01, phaseDegrees: 0, input: [port('IN'), port('COM')], output: [port('OUT'), port('COM')], frequencyHz: 1000, startHz: .1, endHz: 1e8, points: 201, spacing: 'log' }
  const raw = project.extensions['org.stray.opamp-frequency']
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults
  const record = raw as JsonObject, s = record.settings
  if (record.version !== 1 || record.sheetId !== sheetId || !s || typeof s !== 'object' || Array.isArray(s)) return defaults
  const value = s as JsonObject, finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n), pair = (p: unknown): p is [string, string] => Array.isArray(p) && p.length === 2 && p.every(x => typeof x === 'string')
  if (typeof value.referenceAnchorId !== 'string' || typeof value.excitationSourceId !== 'string' || !pair(value.input) || !pair(value.output) || !finite(value.magnitudeRms) || !finite(value.phaseDegrees) || !finite(value.frequencyHz) || !finite(value.startHz) || !finite(value.endHz) || !finite(value.points) || value.spacing !== 'linear' && value.spacing !== 'log') return defaults
  return { referenceAnchorId: value.referenceAnchorId, excitationSourceId: value.excitationSourceId, magnitudeRms: value.magnitudeRms, phaseDegrees: value.phaseDegrees, input: value.input, output: value.output, frequencyHz: value.frequencyHz, startHz: value.startHz, endHz: value.endHz, points: value.points, spacing: value.spacing }
}
const options = (s: OpampSettings): SweepOptions => ({ startHz: s.startHz, endHz: s.endHz, points: s.points, spacing: s.spacing, excitationSourceId: s.excitationSourceId, input: s.input, output: s.output, passband: 'low' })
function chart(points: readonly SweepPoint[], settings: OpampSettings, crossings: readonly number[] = [], notes: readonly string[] = [], bandwidth: number | null = null): SweepResult {
  const peak = points.reduce<{ frequencyHz: number; gainDb: number } | null>((best, p) => p.kind === 'available' && p.gainDb !== null && (!best || p.gainDb > best.gainDb) ? { frequencyHz: p.frequencyHz, gainDb: p.gainDb } : best, null)
  return { options: options(settings), points, analyticalReference: null, features: { sampledPeak: peak, halfPowerCrossingsHz: crossings, estimatedBandwidthHz: bandwidth, notes } }
}
export function OpampPanel({ project, sheetId, onCommit }: { readonly project: EngineeringProject; readonly sheetId: string; readonly onCommit: (project: EngineeringProject, expectedRevision: string) => boolean }) {
  const sheet = project.sheets.find(s => s.id === sheetId)!, sources = sheet.components.filter(c => project.definitions.find(d => d.id === c.definitionId)?.kind === 'voltage-source')
  const amps = sheet.components.filter(c => project.definitions.find(d => d.id === c.definitionId)?.kind === 'dynamic-opamp'), amp = amps.length === 1 ? amps[0] : undefined
  const gain = amp?.parameters.openLoopGain, pole = amp?.parameters.poleHz
  const [settings, setSettings] = useState(() => initialSettings(project, sheetId)), [bias, setBias] = useState<{ input: AnalysisInput; value: OpampPrepared; key: string } | null>(null)
  const [capture, setCapture] = useState<AnalysisCapture<OpampResult> | null>(null), [captureKey, setCaptureKey] = useState('')
  const [busy, setBusy] = useState(false), [status, setStatus] = useState('设置单极点模型，先求解当前直流，再运行频率扫描。'), [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort() } }, [])
  const key = JSON.stringify(settings), biasStale = !!bias && (bias.input.project.revision !== project.revision || bias.key !== key), stale = !!capture && (capture.project.revision !== project.revision || captureKey !== key)
  const result = !stale && capture?.result.outcome.kind === 'success' ? capture.result.outcome.value : null
  const update = (changes: Partial<OpampSettings>) => setSettings(current => ({ ...current, ...changes }))
  const anchorName = (id: string) => sheet.ports.find(p => p.anchorId === id)?.label ?? id.slice(0, 8)
  let open: SweepPoint[] | null = null
  try {
    if (gain?.kind === 'quantity' && pole?.kind === 'quantity' && settings.startHz > 0 && settings.endHz > settings.startHz && Number.isSafeInteger(settings.points) && settings.points >= 3 && settings.points <= 401) open = sweepFrequencies(options(settings)).map(f => pointFromComplex(f, openLoopGain(gain.quantity.value, pole.quantity.value, f)))
  } catch { open = null }
  function updateModel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!amp) return
    try {
      const data = new FormData(event.currentTarget), a = Number(data.get('gain')), fp = Number(data.get('pole'))
      validateOpampModel(a, fp)
      const next = applyEdit(project, sheetId, { type: 'properties', id: amp.id, reference: amp.reference, parameters: { ...amp.parameters, openLoopGain: { kind: 'quantity', quantity: { value: a, unit: '1' } }, poleHz: { kind: 'quantity', quantity: { value: fp, unit: 'Hz' } } } })
      if (!onCommit(next, project.revision)) throw new Error('工程已改变，参数未写入。')
      setError(''); setStatus('模型参数已更新；请重新求解当前修订。')
    } catch (e) { setError(errorText(e)) }
  }
  async function verifyDc() {
    setBusy(true); setError(''); setStatus('正在求解有限增益直流及反馈网络…')
    const abort = new AbortController(); controller.current = abort
    try { const input = await createOpampInput(project, sheetId, settings), value = prepareOpamp(input, abort.signal); if (mounted.current) { setBias({ input, value, key }); setCapture(null); setStatus('有限增益直流已验证；交流与环路结果需要单独运行。') } }
    catch (e) { if (mounted.current) { setBias(null); setCapture(null); setError(errorText(e)); setStatus('没有已验证的直流工作点。') } }
    finally { if (mounted.current) setBusy(false) }
  }
  async function run() {
    setBusy(true); setError(''); setStatus('正在重新求解直流、闭环和反馈网络…')
    const snapshot = project, current = settings, currentKey = key, abort = new AbortController(); controller.current = abort
    try {
      const input = await createOpampInput(snapshot, sheetId, current), next = await opampEngine.run(input, { signal: abort.signal, readAsset: () => Promise.reject(new Error('本分析不读取资产。')), onProgress: () => {} })
      if (!mounted.current) return
      if (next.outcome.kind === 'success') { setCapture({ project: snapshot, configuration: input.configuration, result: next }); setCaptureKey(currentKey); setBias({ input, value: next.outcome.value.prepared, key: currentKey }); setStatus(`频率分析完成：${next.outcome.value.points.length} 个实际闭环和返回网络频点。`) }
      else { setCapture(null); setBias(null); setError('diagnostics' in next.outcome ? next.outcome.diagnostics.map(d => `${d.code}：${d.message}`).join('；') : '分析已取消。'); setStatus('未产生已验证的频率响应。') }
    } catch (e) { if (mounted.current) { setCapture(null); setError(errorText(e)); setStatus('未产生已验证的频率响应。') } }
    finally { if (mounted.current) setBusy(false) }
  }
  function save() {
    if (!capture || !result || stale) return
    try {
      const record = JSON.parse(JSON.stringify({ version: 1, sheetId, settings, provenance: capture.result.provenance, configuration: capture.configuration, result })) as JsonObject
      const next = reviseProject(project, project.revision, { extensions: { ...project.extensions, 'org.stray.opamp-frequency': record } })
      if (!onCommit(next, project.revision)) throw new Error('工程已改变；记录未写入。')
      setStatus('结果、设置、原修订和摘要已写入工程；重开后必须重新分析。')
    } catch (e) { setError(errorText(e)) }
  }
  const currentBias = !biasStale ? bias?.value : null, dc = currentBias?.dc, m = currentBias?.model, v = (node: string) => dc?.nodes.find(n => n.key === node)?.volts
  const single = result ? transferAt(result.single, options(result.prepared.settings)) : null
  const storedValue = project.extensions['org.stray.opamp-frequency'], stored = storedValue && typeof storedValue === 'object' && !Array.isArray(storedValue) ? storedValue as JsonObject : undefined
  const provenanceValue = stored?.provenance, provenance = provenanceValue && typeof provenanceValue === 'object' && !Array.isArray(provenanceValue) ? provenanceValue as JsonObject : undefined
  return <section className="amplifier-panel opamp-panel" aria-label="运算放大器频率特性工作台" aria-busy={busy}>
    <h3>运算放大器频率特性</h3><p>单极点有限增益教学模型：A(jω)=A0/(1+jf/fp)。理想输入电流为零、输出电阻为零；选择的参考网络同时作为此模型输出电压及输出电流的返回端，不会因此连接其他网络。不模拟供电轨、饱和、限流、转换速率或商用器件寄生。</p>
    {amp && gain?.kind === 'quantity' && pole?.kind === 'quantity' ? <form key={`${amp.id}:${project.revision}`} onSubmit={updateModel} className="amplifier-controls"><label>开环直流增益 A0 / V/V<input aria-label="运放开环增益" name="gain" type="number" step="any" required defaultValue={gain.quantity.value} /></label><label>主极点 / Hz<input aria-label="运放主极点" name="pole" type="number" step="any" required defaultValue={pole.quantity.value} /></label><button disabled={busy}>应用运放模型</button></form> : <p role="status">请选择一张含且仅含一个单极点有限增益运放的图纸；理想运放保持独立模型。</p>}
    <fieldset disabled={busy}><legend>参考、激励与频率</legend><div className="amplifier-controls"><label>参考节点<select aria-label="运放参考节点" value={settings.referenceAnchorId} onChange={e => update({ referenceAnchorId: e.target.value })}><option value="">请选择</option>{sheet.anchors.map(a => <option key={a.id} value={a.id}>{anchorName(a.id)}</option>)}</select></label><label>唯一交流测试电压源<select aria-label="运放交流源" value={settings.excitationSourceId} onChange={e => update({ excitationSourceId: e.target.value })}><option value="">请选择</option>{sources.map(c => <option key={c.id} value={c.id}>{c.reference}</option>)}</select></label><label>激励 / V RMS<input aria-label="运放激励 RMS" type="number" step="any" value={settings.magnitudeRms} onChange={e => update({ magnitudeRms: Number(e.target.value) })} /></label><label>相位 / °<input aria-label="运放激励相位" type="number" step="any" value={settings.phaseDegrees} onChange={e => update({ phaseDegrees: Number(e.target.value) })} /></label></div>
      <div className="amplifier-controls">{([['input', 0, '输入正端'], ['input', 1, '输入负端'], ['output', 0, '输出正端'], ['output', 1, '输出负端']] as const).map(([field, index, label]) => <label key={label}>{label}<select aria-label={`运放${label}`} value={settings[field][index]} onChange={e => { const pair: [string, string] = [...settings[field]]; pair[index] = e.target.value; update({ [field]: pair }) }}><option value="">请选择</option>{sheet.anchors.map(a => <option key={a.id} value={a.id}>{anchorName(a.id)}</option>)}</select></label>)}</div>
      <div className="amplifier-controls">{([['frequencyHz', '单频 / Hz'], ['startHz', '起始频率 / Hz'], ['endHz', '终止频率 / Hz'], ['points', '频点数']] as const).map(([field, label]) => <label key={field}>{label}<input aria-label={`运放${label}`} type="number" step={field === 'points' ? 1 : 'any'} value={settings[field]} onChange={e => update({ [field]: Number(e.target.value) })} /></label>)}<label>间隔<select aria-label="运放频率间隔" value={settings.spacing} onChange={e => update({ spacing: e.target.value as OpampSettings['spacing'] })}><option value="log">对数</option><option value="linear">线性</option></select></label></div>
      <button onClick={() => void verifyDc()}>求解有限增益直流</button><button onClick={() => void run()}>运行运放频率扫描</button></fieldset>{busy && <button onClick={() => controller.current?.abort()}>取消运放分析</button>}
    {(biasStale || stale) && <p className="amplifier-warning" role="status">结果已过期：工程或设置已变化，请重新计算。</p>}{error && <p role="alert">{error}</p>}<p role="status" aria-label="运放分析状态">{status}</p>
    {open && gain?.kind === 'quantity' && pole?.kind === 'quantity' && <section aria-label="运放开环响应"><h4>开环单极点模型</h4><p>直流 A0={fmt(gain.quantity.value)} V/V（{fmt(20 * Math.log10(gain.quantity.value))} dB），fp={fmt(pole.quantity.value)} Hz；{gain.quantity.value > 1 ? `精确单位增益频率 ${Number((pole.quantity.value * Math.sqrt(gain.quantity.value ** 2 - 1)).toPrecision(14))} Hz` : '无正频率单位增益交点'}；近似 GBW=A0·fp={fmt(gain.quantity.value * pole.quantity.value)} Hz。</p><BodeChart sweep={chart(open, settings)} heading="开环频率响应" ratio="A" /></section>}
    {dc && m && <section aria-label="运放直流结果"><h4>实际有限增益直流</h4><p>V+={fmt(v(m.plus)!)} V，V−={fmt(v(m.minus)!)} V，差模={fmt(v(m.plus)! - v(m.minus)!)} V；Vout={fmt(v(m.output)!)} V。直流输入电流为零；输出支路及所有节点 KCL 按实际网络求解。</p><p>输出理想近似：{currentBias.idealDcOutput === null ? '不可用' : `${fmt(currentBias.idealDcOutput)} V；偏差 ${fmt(v(m.output)! - currentBias.idealDcOutput)} V`}。β(0)={fmt(currentBias.betaDc)}，低频噪声增益 1/β(0)={fmt(1 / currentBias.betaDc)}；直流增量传递比 {fmt(currentBias.dcTransfer)} V/V。最大 KCL 残差 {fmt(dc.checks.maxKclAmps)} A。</p><details><summary>直流支路电流</summary><ul>{dc.branches.map(b => <li key={b.id}>{b.reference}：{fmt(b.amps)} A（p→n）</li>)}</ul></details></section>}
    {result && single?.kind === 'available' && <><section aria-label="运放闭环结果"><h4>闭环与增益带宽</h4><p>{fmt(result.single.frequencyHz)} Hz：H={fmt(single.transfer.real)} {single.transfer.imaginary < 0 ? '−' : '+'} j{fmt(Math.abs(single.transfer.imaginary))}，|H|={fmt(single.magnitude)}，相位 {single.phaseDegrees === null ? '未定义' : `${fmt(single.phaseDegrees)}°`}；复 KCL 残差 {fmt(result.single.checks.maxKclAmps)} A，矩阵后向误差 {fmt(result.single.checks.complexBackwardError)}，缩放主元比 {fmt(result.single.checks.scaledPivotRatio)}。</p><p>相对实际直流增量增益的 −3.0103 dB 截止估计：{result.bandwidthHz === null ? '未建立' : `${fmt(result.bandwidthHz)} Hz`}。独立源的直流值不变；未选中的交流电压源短路、电流源开路。扫描 {settings.points} 点、{settings.spacing === 'log' ? '对数' : '线性'}间隔。</p><details><summary>单频复数节点与支路电流</summary><p>RMS 正余弦约定；内部支路是单极点模型的临时数值投影，不改变原图连接。</p><div className="table-scroll"><table><thead><tr><th>节点</th><th>复电压 / V RMS</th></tr></thead><tbody>{result.single.nodes.map(n => <tr key={n.key}><td>{n.name}</td><td>{fmt(n.value.real)} + j({fmt(n.value.imaginary)})</td></tr>)}</tbody></table><table><thead><tr><th>支路</th><th>复电流 / A RMS，p→n</th></tr></thead><tbody>{result.single.branches.map(b => <tr key={b.id}><td>{b.reference}</td><td>{fmt(b.current.value.real)} + j({fmt(b.current.value.imaginary)})</td></tr>)}</tbody></table></div></details><BodeChart sweep={chart(result.points, settings, result.bandwidthHz === null ? [] : [result.bandwidthHz], [], result.bandwidthHz)} heading="闭环频率响应" /></section>
      <section aria-label="运放环路结果"><h4>返回网络与环路</h4><p>L=Aβ，β 为独立源置零并在输出注入 1 V 后求出的 V−−V+。环路 0 dB 交越：{result.crossoverHz === null ? '未建立' : `${fmt(result.crossoverHz)} Hz`}；相位裕度：{result.phaseMarginDegrees === null ? '不可用' : `${fmt(result.phaseMarginDegrees)}°`}。仅对当前单运放模型和返回网络有效，不能证明任意多环路或真实器件稳定。</p><BodeChart sweep={chart(result.loop, settings, [], result.notes)} heading="环路增益" ratio="L" /></section><button disabled={busy} onClick={save}>将运放分析记录写入工程</button></>}
    {stored && <details><summary>工程内保存的运放分析记录</summary><p>记录保留原设置、频点和来源；重新打开后须重新分析，不能直接视为当前验证结果。</p>{provenance && <p aria-label="已保存运放来源">原输入修订：{typeof provenance.inputRevision === 'string' ? provenance.inputRevision : '未知'}；摘要：{typeof provenance.inputDigest === 'string' ? provenance.inputDigest : '未知'}。</p>}</details>}
  </section>
}
