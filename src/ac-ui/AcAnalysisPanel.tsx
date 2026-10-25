import { useRef, useState } from 'react'
import { deriveElectricalNets } from '../engineering'
import type { EngineeringProject, JsonObject, ComplexValue } from '../engineering'
import { acEngine, createAcInput, parseAcSettings } from '../ac'
import type { AcPhasor, AcResult, AcSettings, SweepOptions } from '../ac'
import type { AnalysisCapture, AnalysisInput, AnalysisResult } from '../analysis'
import { BodeChart } from './BodeChart'
import { fmt } from './format'
import './ac.css'

export interface AcHighlight { readonly revision: string; readonly sheetId: string; readonly anchorIds: readonly string[]; readonly componentId?: string; readonly text: string }
const complex = (v: ComplexValue) => `${fmt(v.real)} ${v.imaginary < 0 ? '−' : '+'} j${fmt(Math.abs(v.imaginary))}`
const phasor = (v: AcPhasor) => `${complex(v.value)} | ${fmt(v.magnitudeRms)} ∠ ${v.phaseDegrees === null ? '未定义' : `${fmt(v.phaseDegrees)}°`}`
function initial(project: EngineeringProject, sheetId: string): { settings: AcSettings; error: string } {
  const extension = project.extensions['org.stray.ac'] as JsonObject | undefined, stored = extension?.[sheetId]
  if (stored) { try { return { settings: parseAcSettings(stored as JsonObject), error: '' } } catch (e) { return { settings: { frequencyHz: 100, sources: [] }, error: `已保存交流配置无效：${e instanceof Error ? e.message : '格式错误'}。请重新明确配置。` } } }
  return { settings: { frequencyHz: 100, sources: [] }, error: '' }
}
export function AcAnalysisPanel({ project, sheetId, onSave, onHighlight, onCapture }: { readonly project: EngineeringProject; readonly sheetId: string; readonly onSave: (settings: AcSettings) => void; readonly onCapture?: ((capture: AnalysisCapture<AcResult>) => Promise<boolean>) | undefined; readonly onHighlight: (value: AcHighlight | null) => void }) {
  const [loaded] = useState(() => initial(project, sheetId)), [settings, setSettings] = useState(loaded.settings), [error, setError] = useState(loaded.error), [running, setRunning] = useState(false), [progress, setProgress] = useState('')
  const [record, setRecord] = useState<{ input: AnalysisInput; result: AnalysisResult<AcResult>; controls: string } | null>(null), abort = useRef<AbortController | null>(null)
  const sheet = project.sheets.find(s => s.id === sheetId)!, topology = deriveElectricalNets(project)
  const nets = topology.nets.filter(n => n.anchorIds.some(id => sheet.anchors.some(a => a.id === id)))
  const sources = sheet.components.filter(c => ['voltage-source', 'current-source'].includes(project.definitions.find(d => d.id === c.definitionId)!.kind))
  const current: AcSettings = { ...settings, sources: sources.map(c => settings.sources.find(s => s.componentId === c.id) ?? { componentId: c.id, magnitudeRms: 0, phaseDegrees: 0 }) }
  const scan: SweepOptions = settings.sweep ?? { startHz: 1, endHz: 100000, points: 201, spacing: 'log', input: ['', ''], output: ['', ''], excitationSourceId: sources[0]?.id ?? '', passband: 'low' }
  const controls = JSON.stringify(current), stale = !!record && (record.result.provenance.inputRevision !== project.revision || record.result.provenance.projectId !== project.id || record.controls !== controls)
  const outcome = !stale ? record?.result.outcome : undefined, result = outcome?.kind === 'success' ? outcome.value : undefined, solution = result?.operatingPoint
  function update(next: AcSettings) { setSettings(next); onHighlight(null) }
  function updateScan(next: SweepOptions) { update({ ...current, sweep: next }) }
  function describe(ids: readonly string[]) { return [...sheet.ports.filter(p => ids.includes(p.anchorId)).map(p => p.label), ...sheet.components.flatMap(c => c.pins.filter(p => ids.includes(p.anchorId)).map(p => `${c.reference}.${p.definitionPinKey}`))].join(' · ') }
  function options() { return nets.flatMap(n => { const preferred = n.anchorIds.find(id => sheet.ports.some(p => p.anchorId === id)) ?? n.anchorIds[0]!; const selected = [current.referenceAnchorId, ...scan.input, ...scan.output].filter((id): id is string => !!id && n.anchorIds.includes(id)); return [...new Set([preferred, ...selected])].map(id => <option key={id} value={id}>N{topology.nets.indexOf(n) + 1} · {describe(n.anchorIds)}{id === preferred ? '' : '（已保存探针）'}</option>) }) }
  const field = (label: string, value: number, change: (n: number) => void) => <label>{label}<input aria-label={label} type="number" step="any" value={Number.isNaN(value) ? '' : value} onChange={e => change(e.target.value === '' ? NaN : Number(e.target.value))} /></label>
  async function run(sweep: boolean) {
    setRunning(true); setError(''); onHighlight(null); const controller = new AbortController(); abort.current = controller
    const single: AcSettings = { frequencyHz: current.frequencyHz, sources: current.sources, ...(current.referenceAnchorId ? { referenceAnchorId: current.referenceAnchorId } : {}) }
    try { const input = await createAcInput(project, sheetId, sweep ? { ...current, sweep: scan } : single); const result = await acEngine.run(input, { signal: controller.signal, readAsset: () => Promise.resolve(new Uint8Array()), onProgress: (n, total) => setProgress(`${n}/${total ?? '?'}`) }); setRecord({ input, result, controls }) }
    catch (e) { setError(e instanceof Error ? e.message : '交流分析失败。') }
    finally { setRunning(false); abort.current = null }
  }
  const highlight = (anchorIds: readonly string[], text: string, componentId?: string) => onHighlight({ revision: project.revision, sheetId, anchorIds, text, ...(componentId ? { componentId } : {}) })
  function save() { try { parseAcSettings({ ...current }); onSave(current); setError('') } catch (e) { setError(e instanceof Error ? e.message : '保存失败。') } }
  async function captureResult() { if (!record || stale || !solution || !onCapture) return; setRunning(true); try { const ok = await onCapture({ project: record.input.project, configuration: record.input.configuration, result: record.result }); if (!ok) setError('关联未完成，当前结果仍保留，请检查电赛工作台提示。') } catch (e) { setError(e instanceof Error ? e.message : '关联失败。') } finally { setRunning(false) } }
  function report() { if (!record || stale || !solution) return; const url = URL.createObjectURL(new Blob([JSON.stringify(record.result, null, 2)], { type: 'application/json;charset=utf-8' })), a = document.createElement('a'); a.href = url; a.download = 'stray-ac-report.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  return <section className="ac-panel" aria-label="交流分析面板">
    <header><p className="eyebrow">相量 / 频率响应 / 滤波</p><h2>交流分析与滤波</h2><p>理想线性 RLC、独立电压/电流源与四类线性受控源。正弦稳态采用余弦参考：v(t) = √2 |V| cos(2πft + φ)，相量为 RMS，采用 exp(+jωt)。</p></header>
    <div className="ac-controls">{field('单频频率 / Hz', current.frequencyHz, frequencyHz => update({ ...current, frequencyHz }))}<label>交流参考节点<select aria-label="交流参考节点" value={current.referenceAnchorId ?? ''} onChange={e => { const next = { ...current }; if (e.target.value) next.referenceAnchorId = e.target.value; else delete next.referenceAnchorId; update(next) }}><option value="">模拟参考标记 / 唯一 GND 网</option>{options()}</select></label></div>
    <p className="muted">参考只定义零电位，不连接网络。源的交流幅值须单独设置，未配置源为 0，不继承元件的直流数值。电流与电压正向 p → n（引脚 1 → 2）；正功率表示吸收。</p>
    <fieldset disabled={running}><legend>独立源 / RMS 激励</legend>{sources.length ? sources.map(source => { const value = current.sources.find(s => s.componentId === source.id)!; const edit = (delta: { magnitudeRms?: number; phaseDegrees?: number }) => update({ ...current, sources: current.sources.map(s => s.componentId === source.id ? { ...s, ...delta } : s) }); return <div className="ac-controls" key={source.id}>{field(`${source.reference} RMS / ${project.definitions.find(d => d.id === source.definitionId)!.kind === 'voltage-source' ? 'V' : 'A'}`, value.magnitudeRms, magnitudeRms => edit({ magnitudeRms }))}{field(`${source.reference} 相位 / °`, value.phaseDegrees, phaseDegrees => edit({ phaseDegrees }))}</div> }) : <p>当前图纸没有独立激励源。</p>}</fieldset>
    <details open><summary>频率扫描与电压传递比</summary><p>H = (Vout+ − Vout−)/(Vin+ − Vin−)。选择一个非零测试源，其余独立源须明确设为 0：电压源相当于短路，电流源相当于开路。输入接近零时不定义传递比。</p><div className="ac-controls">
      <label>测试激励源<select aria-label="测试激励源" value={scan.excitationSourceId} onChange={e => updateScan({ ...scan, excitationSourceId: e.target.value })}><option value="">选择源</option>{sources.map(c => <option key={c.id} value={c.id}>{c.reference}</option>)}</select></label>
      {(['input', 'output'] as const).flatMap(key => ([0, 1] as const).map(i => { const label = `${key === 'input' ? '输入' : '输出'}${i === 0 ? '正端' : '负端'}`; return <label key={`${key}${i}`}>{label}<select aria-label={label} value={scan[key][i]} onChange={e => { const pair: [string, string] = [...scan[key]]; pair[i] = e.target.value; updateScan({ ...scan, [key]: pair }) }}><option value="">选择稳定引脚 / 端口</option>{options()}</select></label> }))}
      {field('起始频率 / Hz', scan.startHz, startHz => updateScan({ ...scan, startHz }))}{field('结束频率 / Hz', scan.endHz, endHz => updateScan({ ...scan, endHz }))}{field('扫描点数', scan.points, points => updateScan({ ...scan, points }))}
      <label>采样间隔<select aria-label="采样间隔" value={scan.spacing} onChange={e => updateScan({ ...scan, spacing: e.target.value as SweepOptions['spacing'] })}><option value="log">对数</option><option value="linear">线性</option></select></label><label>通带参考<select aria-label="通带参考" value={scan.passband} onChange={e => updateScan({ ...scan, passband: e.target.value as SweepOptions['passband'] })}><option value="low">低频端（低通）</option><option value="high">高频端（高通）</option><option value="peak">采样峰值（带通）</option></select></label>
    </div></details>
    <div className="ac-actions"><button disabled={running} onClick={() => void run(false)}>运行单频交流分析</button><button disabled={running} onClick={() => void run(true)}>运行频率扫描</button><button disabled={!running} onClick={() => abort.current?.abort()}>取消分析</button><button disabled={running} onClick={save}>保存交流配置</button></div>
    <p className="muted">“保存交流配置”写入工程修订；随后导出工程可重开恢复。分析报告单独导出，结果属于当前修订。最多 64 个复未知量、256 个元件、401 频点，另有计算量限制。采样信号 RC 处理请使用信号实验室。</p>
    <p role="status" aria-label="交流分析状态">{stale ? '结果已过期，请重新运行。工程或交流设置已经改变。' : running ? `正在求解 ${progress}` : solution ? '分析完成：复数残差、KCL 与复功率检查通过。' : outcome?.kind === 'cancelled' ? '分析已取消。' : '请配置激励与参考并运行。'}</p>
    {error && <p role="alert">{error}</p>}{outcome && 'diagnostics' in outcome && <div role="alert">{outcome.diagnostics.map((d, i) => <p key={i}>{d.code} · {d.message}<small className="ac-provenance">{d.entityIds.join(', ')}</small></p>)}</div>}
    {solution && <div className="ac-results" data-input-revision={record!.result.provenance.inputRevision}>
      <h3>单频相量 · {fmt(solution.frequencyHz)} Hz</h3><p>直角坐标 | RMS 幅值 ∠ 相位；零相量相位未定义。ZL = jωL，ZC = 1/(jωC)。</p>
      <div className="ac-scroll" tabIndex={0} role="region" aria-label="交流节点电压表"><table><thead><tr><th>节点 / 定位</th><th>端口与引脚</th><th>电压 / V RMS</th><th>KCL / A</th></tr></thead><tbody>{solution.nodes.map(n => <tr key={n.key}><td><button onClick={() => highlight(n.anchorIds, `${n.name}: ${fmt(n.magnitudeRms)} V RMS`)}>{n.name}</button></td><td>{describe(n.anchorIds)}</td><td>{phasor(n)}</td><td>{complex(n.kclAmps)}</td></tr>)}</tbody></table></div>
      <div className="ac-scroll" tabIndex={0} role="region" aria-label="交流支路结果表"><table><thead><tr><th>支路 / 定位</th><th>电压 / V RMS</th><th>电流 / A RMS</th><th>Z / Ω</th><th>Y / S</th><th>P / W</th><th>Q / var</th><th>|S| / VA</th></tr></thead><tbody>{solution.branches.map(b => <tr key={b.id}><td><button onClick={() => highlight([], `${b.reference}: ${fmt(b.current.magnitudeRms)} A RMS`, b.id)}>{b.reference}</button></td><td>{phasor(b.voltage)}</td><td>{phasor(b.current)}</td><td>{b.impedance ? complex(b.impedance) : '源约束'}</td><td>{b.admittance ? complex(b.admittance) : '源约束'}</td><td>{fmt(b.power.realWatts)}</td><td>{fmt(b.power.reactiveVars)}</td><td>{fmt(b.power.apparentVA)}</td></tr>)}</tbody></table></div>
      <p>S = V conj(I) = P + jQ；正 Q 为感性，负 Q 为容性。复功率不平衡 {complex(solution.checks.powerImbalance)} VA；最大 KCL 残差 {fmt(solution.checks.maxKclAmps)} A；复数归一化残差 {fmt(solution.checks.complexBackwardError)}；缩放主元比 {fmt(solution.checks.scaledPivotRatio)}（非条件数）。</p>
      {result?.sweep && <BodeChart key={record!.result.provenance.inputDigest} sweep={result.sweep} />}
      <details><summary>实际复数 MNA 方程与矩阵</summary><p>Y(ω)V 与理想源约束组成 A(ω)x=b；以下为本次实际复数矩阵。行列缩放、完全主元复数消元，并重算原单位残差。</p><ol>{solution.equations.unknowns.map((u, i) => <li key={i}>x[{i}] = {u.name} / {u.unit} = {complex(solution.equations.solution[i]!)}</li>)}</ol><div className="ac-scroll" tabIndex={0}><pre>{solution.equations.rows.map((r, i) => `${r.name} [${r.unit}]\nA[${i}] = [${solution.equations.matrix[i]!.map(complex).join(', ')}]; b[${i}] = ${complex(solution.equations.rhs[i]!)}\n`).join('\n')}</pre></div></details>
      <div className="ac-actions">{onCapture && <button disabled={running} onClick={() => void captureResult()}>关联到电赛实验</button>}<button onClick={report}>导出交流分析报告 JSON</button><button onClick={() => onHighlight(null)}>清除交流高亮</button></div><details><summary>交流分析来源</summary><p className="ac-provenance">工程 {record!.result.provenance.projectId} · 修订 {record!.result.provenance.inputRevision}<br />{record!.result.provenance.engine.id} / {record!.result.provenance.engine.version}<br />SHA-256 {record!.result.provenance.inputDigest}</p></details>
    </div>}
  </section>
}
