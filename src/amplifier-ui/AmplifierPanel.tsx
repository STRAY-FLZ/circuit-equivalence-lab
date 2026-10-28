import { useEffect, useRef, useState } from 'react'
import type { AnalysisCapture, AnalysisInput } from '../analysis'
import { amplifierEngine, createAmplifierInput, prepareAmplifier } from '../amplifier'
import type { AmplifierBias, AmplifierResult, AmplifierSettings } from '../amplifier'
import { abs, phase, sub, transferAt } from '../ac'
import type { SweepOptions, SweepResult } from '../ac'
import { BodeChart } from '../ac-ui/BodeChart'
import { reviseProject } from '../engineering'
import type { EngineeringProject, JsonObject } from '../engineering'
import '../ac-ui/ac.css'
import './amplifier.css'

const fmt = (n: number) => Number(n.toPrecision(8)).toString()
const errorText = (error: unknown) => error instanceof Error ? error.message : '分析失败。'
function initialSettings(project: EngineeringProject, sheetId: string): AmplifierSettings {
  const sheet = project.sheets.find(s => s.id === sheetId)!, port = (name: string) => sheet.ports.find(p => p.label === name)?.anchorId ?? ''
  const source = sheet.components.find(c => c.reference === 'V1' && project.definitions.find(d => d.id === c.definitionId)?.kind === 'voltage-source') ?? sheet.components.find(c => project.definitions.find(d => d.id === c.definitionId)?.kind === 'voltage-source')
  const defaults: AmplifierSettings = { referenceAnchorId: port('COM'), excitationSourceId: source?.id ?? '', magnitudeRms: .0001, phaseDegrees: 0, input: [port('IN'), port('COM')], output: [port('OUT'), port('COM')], frequencyHz: 1000, startHz: .1, endHz: 1e8, points: 201, spacing: 'log' }
  const raw = project.extensions['org.stray.amplifier-frequency']
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults
  const record = raw as JsonObject
  if (record.version !== 1 || record.sheetId !== sheetId || !record.settings || typeof record.settings !== 'object' || Array.isArray(record.settings)) return defaults
  const s = record.settings as JsonObject, finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v), pair = (v: unknown): v is [string, string] => Array.isArray(v) && v.length === 2 && v.every(id => typeof id === 'string')
  if (typeof s.referenceAnchorId !== 'string' || typeof s.excitationSourceId !== 'string' || !pair(s.input) || !pair(s.output) || !finite(s.magnitudeRms) || !finite(s.phaseDegrees) || !finite(s.frequencyHz) || !finite(s.startHz) || !finite(s.endHz) || !finite(s.points) || s.spacing !== 'linear' && s.spacing !== 'log') return defaults
  return { referenceAnchorId: s.referenceAnchorId, excitationSourceId: s.excitationSourceId, magnitudeRms: s.magnitudeRms, phaseDegrees: s.phaseDegrees, input: s.input, output: s.output, frequencyHz: s.frequencyHz, startHz: s.startHz, endHz: s.endHz, points: s.points, spacing: s.spacing }
}
const sweepOptions = (s: AmplifierSettings): SweepOptions => ({ startHz: s.startHz, endHz: s.endHz, points: s.points, spacing: s.spacing, excitationSourceId: s.excitationSourceId, input: s.input, output: s.output, passband: 'peak' })
function bode(result: AmplifierResult): SweepResult {
  const { points, features, bias } = result, peak = points.filter(p => p.kind === 'available' && p.gainDb !== null).reduce<{ frequencyHz: number; gainDb: number } | null>((best, p) => p.kind === 'available' && p.gainDb !== null && (!best || p.gainDb > best.gainDb) ? { frequencyHz: p.frequencyHz, gainDb: p.gainDb } : best, null)
  return { options: sweepOptions(bias.settings), points, analyticalReference: null, features: { sampledPeak: peak, halfPowerCrossingsHz: [features.lowerHz, features.upperHz].filter((v): v is number => v !== null), estimatedBandwidthHz: features.bandwidthHz, notes: features.notes } }
}
export function AmplifierPanel({ project, sheetId, onCommit }: { readonly project: EngineeringProject; readonly sheetId: string; readonly onCommit: (project: EngineeringProject, expectedRevision: string) => boolean }) {
  const sheet = project.sheets.find(s => s.id === sheetId)!, sources = sheet.components.filter(c => project.definitions.find(d => d.id === c.definitionId)?.kind === 'voltage-source')
  const [settings, setSettings] = useState(() => initialSettings(project, sheetId)), [bias, setBias] = useState<{ input: AnalysisInput; value: AmplifierBias; key: string } | null>(null), [capture, setCapture] = useState<AnalysisCapture<AmplifierResult> | null>(null), [resultKey, setResultKey] = useState('')
  const [busy, setBusy] = useState(false), [status, setStatus] = useState('先验证当前直流偏置，再运行频率分析。'), [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort() } }, [])
  const key = JSON.stringify(settings), biasStale = !!bias && (bias.input.project.revision !== project.revision || bias.key !== key), stale = !!capture && (capture.project.revision !== project.revision || resultKey !== key)
  const result = capture?.result.outcome.kind === 'success' ? capture.result.outcome.value : null
  const update = (changes: Partial<AmplifierSettings>) => setSettings(current => ({ ...current, ...changes }))
  const anchorName = (id: string) => sheet.ports.find(p => p.anchorId === id)?.label ?? id.slice(0, 8)
  async function verifyBias() {
    setBusy(true); setError(''); setStatus('正在求解当前直流偏置…'); const snapshot = project, currentSettings = settings, currentKey = key, abort = new AbortController(); controller.current = abort
    try {
      const input = await createAmplifierInput(snapshot, sheetId, currentSettings), value = prepareAmplifier(input, abort.signal)
      if (mounted.current) { setBias({ input, value, key: currentKey }); setCapture(null); setStatus('直流工作点已验证；增量参数来自此工作点的器件导数。') }
    } catch (e) { if (mounted.current) { setBias(null); setCapture(null); setError(errorText(e)); setStatus('偏置无效或超出支持范围，未构造增量模型。') } } finally { if (mounted.current) setBusy(false) }
  }
  async function run() {
    setBusy(true); setError(''); setStatus('正在重新验证直流偏置并计算复数频率响应…'); const snapshot = project, currentSettings = settings, currentKey = key, abort = new AbortController(); controller.current = abort
    try {
      const input = await createAmplifierInput(snapshot, sheetId, currentSettings)
      const result = await amplifierEngine.run(input, { signal: abort.signal, readAsset: () => Promise.reject(new Error('本分析不读取资产。')), onProgress: () => {} })
      if (!mounted.current) return
      if (result.outcome.kind === 'success') { setCapture({ project: snapshot, configuration: input.configuration, result }); setBias({ input, value: result.outcome.value.bias, key: currentKey }); setResultKey(currentKey); setStatus(`频率分析完成：已重新验证偏置，并计算 ${result.outcome.value.points.length} 个实际频点。`) }
      else { setCapture(null); setBias(null); setError('diagnostics' in result.outcome ? result.outcome.diagnostics.map(d => `${d.code}：${d.message}`).join('；') : '分析已取消。'); setStatus('未产生已验证的频率响应。') }
    } catch (e) { if (mounted.current) { setCapture(null); setError(errorText(e)); setStatus('未产生已验证的频率响应。') } } finally { if (mounted.current) setBusy(false) }
  }
  function save() {
    if (!capture || !result || stale) return
    try {
      const record = JSON.parse(JSON.stringify({ version: 1, sheetId, settings, provenance: capture.result.provenance, configuration: capture.configuration, result })) as JsonObject
      const next = reviseProject(project, project.revision, { extensions: { ...project.extensions, 'org.stray.amplifier-frequency': record } })
      if (!onCommit(next, project.revision)) throw new Error('工程已改变；结果未写入。')
      setStatus('频响设置、偏置、源修订、摘要及全部实际频点已写入工程；导出文件保存。重开后请重新验证。')
    } catch (e) { setError(errorText(e)) }
  }
  const d = bias?.value.device, element = bias?.value.dc.circuit.elements.find(e => e.id === d?.componentId), f = result?.features
  const storedValue = project.extensions['org.stray.amplifier-frequency'], stored = storedValue && typeof storedValue === 'object' && !Array.isArray(storedValue) ? storedValue as JsonObject : undefined
  const savedValue = stored?.provenance, saved = savedValue && typeof savedValue === 'object' && !Array.isArray(savedValue) ? savedValue as JsonObject : undefined
  const single = result ? transferAt(result.single, sweepOptions(result.bias.settings)) : null
  const atAnchor = (id: string) => result?.single.nodes.find(n => n.anchorIds.includes(id))?.value
  const inputA = result && atAnchor(result.bias.settings.input[0]), inputB = result && atAnchor(result.bias.settings.input[1]), outputA = result && atAnchor(result.bias.settings.output[0]), outputB = result && atAnchor(result.bias.settings.output[1])
  const voltageDescription = (a: typeof inputA, b: typeof inputB) => { if (!a || !b) return '不可用'; const value = sub(a, b), angle = phase(value); return `${fmt(value.real)} ${value.imaginary < 0 ? '−' : '+'} j${fmt(Math.abs(value.imaginary))} V RMS · |V|=${fmt(abs(value))} V · ${angle === null ? '相位未定义' : `${fmt(angle)}°`}` }
  return <section className="amplifier-panel" aria-label="放大器频率响应工作台" aria-busy={busy}>
    <h3>放大器频率响应</h3><p>真实直流偏置 → 检查晶体管区域 → 同模型增量导数 → 单一 RMS 交流测试源 → 实际复数 MNA 频扫。电容是显式假设；不是非线性大信号或暂态仿真。</p>
    <div className="amplifier-controls"><label>求解参考<select aria-label="放大器参考节点" value={settings.referenceAnchorId} onChange={e => update({ referenceAnchorId: e.target.value })}><option value="">请选择</option>{sheet.anchors.map(a => <option key={a.id} value={a.id}>{anchorName(a.id)}</option>)}</select></label><button disabled={busy} onClick={() => void verifyBias()}>验证直流偏置</button>{busy && <button onClick={() => controller.current?.abort()}>取消频率分析</button>}</div>
    {(biasStale || stale) && <p className="amplifier-warning" role="status">结果已过期：工程或频响配置已变化，请重新计算当前修订。</p>}{error && <p role="alert">{error}</p>}<p role="status" aria-label="放大器分析状态">{status}</p>
    {d && element && <div className="amplifier-bias" aria-label="已验证偏置"><h4>直流偏置与增量模型 {biasStale ? '（旧修订）' : ''}</h4><p>{d.reference} · {d.kind === 'npn' ? 'NPN 放大区' : 'nMOS 饱和区'}；{d.kind === 'npn' ? `VBE=${fmt(d.terminalVolts[0]! - d.terminalVolts[2]!)} V，VCE=${fmt(d.terminalVolts[1]! - d.terminalVolts[2]!)} V，IB=${fmt(d.terminalAmps[0]!)} A，IC=${fmt(d.terminalAmps[1]!)} A` : `VGS=${fmt(d.terminalVolts[0]! - d.terminalVolts[2]!)} V，VDS=${fmt(d.terminalVolts[1]! - d.terminalVolts[2]!)} V，ID=${fmt(d.terminalAmps[1]!)} A`}；{d.kind === 'npn' ? '发射极' : '源极'}对选定参考 {fmt(bias.value.displayNodeVolts[element.nodes[2]!]!)} V。</p><p>gm={fmt(d.gm!)} S{d.rpi !== undefined ? `，rπ=${fmt(d.rpi)} Ω` : ''}{d.gds !== undefined ? `，gds=${fmt(d.gds)} S` : ''}；最大直流 KCL 残差 {fmt(bias.value.dc.maxKclAmps)} A。{bias.value.modelExplanation}</p></div>}
    <fieldset disabled={busy}><legend>交流激励与频率配置</legend><div className="amplifier-controls"><label>唯一增量测试电压源<select aria-label="放大器交流源" value={settings.excitationSourceId} onChange={e => update({ excitationSourceId: e.target.value })}><option value="">请选择</option>{sources.map(c => <option key={c.id} value={c.id}>{c.reference} · 直流值保持不变</option>)}</select></label><label>激励 / V RMS<input aria-label="放大器激励 RMS" type="number" step="any" value={settings.magnitudeRms} onChange={e => update({ magnitudeRms: Number(e.target.value) })} /></label><label>激励相位 / °<input aria-label="放大器激励相位" type="number" step="any" value={settings.phaseDegrees} onChange={e => update({ phaseDegrees: Number(e.target.value) })} /></label></div>
      <p>正余弦 RMS 约定：其他独立电压源的增量置零（短路），电流源的增量置零（开路），直流源值不变。</p><div className="amplifier-controls">{([['input', 0, '输入正端'], ['input', 1, '输入负端'], ['output', 0, '输出正端'], ['output', 1, '输出负端']] as const).map(([keyName, index, label]) => <label key={label}>{label}<select aria-label={`放大器${label}`} value={settings[keyName][index]} onChange={e => { const pair: [string, string] = [...settings[keyName]]; pair[index] = e.target.value; update({ [keyName]: pair }) }}><option value="">请选择</option>{sheet.anchors.map(a => <option key={a.id} value={a.id}>{anchorName(a.id)}</option>)}</select></label>)}</div>
      <div className="amplifier-controls">{([['frequencyHz', '单频 / Hz'], ['startHz', '起始频率 / Hz'], ['endHz', '终止频率 / Hz'], ['points', '频点数']] as const).map(([field, label]) => <label key={field}>{label}<input aria-label={`放大器${label}`} type="number" step={field === 'points' ? '1' : 'any'} value={settings[field]} onChange={e => update({ [field]: Number(e.target.value) })} /></label>)}<label>间隔<select aria-label="放大器频率间隔" value={settings.spacing} onChange={e => update({ spacing: e.target.value as AmplifierSettings['spacing'] })}><option value="log">对数</option><option value="linear">线性</option></select></label></div><button onClick={() => void run()}>运行放大器频率扫描</button></fieldset>
    {result && single?.kind === 'available' && <><section aria-label="单频相量结果"><h4>单频复数结果 · {fmt(result.single.frequencyHz)} Hz</h4><p>输入：{voltageDescription(inputA, inputB)}；输出：{voltageDescription(outputA, outputB)}。</p><p>实际电压增益 H={fmt(single.transfer.real)} {single.transfer.imaginary < 0 ? '−' : '+'} j{fmt(Math.abs(single.transfer.imaginary))}，|H|={fmt(single.magnitude)}，{single.gainDb === null ? '零传输 dB 未定义' : `${fmt(single.gainDb)} dB`}，{single.phaseDegrees === null ? '相位未定义' : `${fmt(single.phaseDegrees)}°`}。最大复 KCL 残差 {fmt(result.single.checks.maxKclAmps)} A，矩阵后向误差 {fmt(result.single.checks.complexBackwardError)}。</p><details><summary>实际支路复电流与等效模型</summary><div className="table-scroll"><table><thead><tr><th>支路</th><th>电流 / A RMS（实部 + j虚部）</th></tr></thead><tbody>{result.single.branches.map(b => <tr key={b.id}><td>{b.reference}</td><td>{fmt(b.current.value.real)} {b.current.value.imaginary < 0 ? '−' : '+'} j{fmt(Math.abs(b.current.value.imaginary))}</td></tr>)}</tbody></table></div></details></section>
      <section aria-label="中频与带宽"><h4>中频与半功率估计</h4><p>{f?.plateau ? `实际近似平台：${fmt(f.plateau.fromHz)}–${fmt(f.plateau.toHz)} Hz，${f.plateau.samples} 点；|H|=${fmt(f.plateau.magnitude)}，${fmt(f.plateau.gainDb)} dB。` : '没有足够平坦且连续的中频平台，无法定义截止点。'}</p><p>下截止：{f?.lowerHz === null || f?.lowerHz === undefined ? '未确定' : `${fmt(f.lowerHz)} Hz`}；上截止：{f?.upperHz === null || f?.upperHz === undefined ? '未确定' : `${fmt(f.upperHz)} Hz`}；带宽：{f?.bandwidthHz === null || f?.bandwidthHz === undefined ? '未确定' : `${fmt(f.bandwidthHz)} Hz`}。</p><p>交点相对上述平台下降 3.0103 dB，采用相邻实测频点插值；不把单个峰值当作中频。</p></section>
      <BodeChart key={capture!.result.provenance.inputDigest} sweep={bode(result)} />
      <button disabled={busy || stale} onClick={save}>将频率分析记录写入工程</button></>}
    <details><summary>模型与局限</summary><p>交流模型使用当前直流工作点的解析导数。NPN 的 gπ=IS·exp(VBE/VT)/VT、gm=βgπ；nMOS 饱和区 gm=k(VGS−Vth)，当前模型 gds=0。输入、输出、源和负载均为电路实际连接；不引入额外 Early 电阻。</p><p>图中的 Cπ、Cμ、Cgs、Cgd、耦合和旁路电容为显式元件与教学假设；没有自动按数据手册计算。显式连接的跨端电容已经包含反馈作用，不再叠加虚构的 Miller 修正。不支持完整晶体管高频物理、噪声、热效应、非线性暂态或多级通用仿真。</p></details>
    {stored && <details><summary>工程内已保存的频响设置与记录（重算后验证当前电路）</summary><p>频率设置和原分析修订/摘要随工程保存。已保存的记录不会自动作为当前有效结果。</p>{saved && <p aria-label="已保存频响来源">原输入修订：{typeof saved.inputRevision === 'string' ? saved.inputRevision : '未知'}；输入摘要：{typeof saved.inputDigest === 'string' ? saved.inputDigest : '未知'}；分析 ID：{typeof saved.analysisId === 'string' ? saved.analysisId : '未知'}。</p>}</details>}
  </section>
}
