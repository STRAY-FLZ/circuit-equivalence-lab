import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnalysisCapture, AnalysisResult } from '../analysis'
import { reviseProject } from '../engineering'
import type { EngineeringProject } from '../engineering'
import { createProjectDocument } from '../project-format'
import type { InlineAsset, ProjectDocumentV1 } from '../project-format'
import { exportCsv } from '../signal'
import type { LoadedWaveform } from '../signal'
import { Oscilloscope } from '../signal-ui/SignalCharts'
import { appendTransient, configureTransientExperiment, createTransientInput, defaultTransientSettings, loadTransientSeries, parseTransientSettings, readTransientRecord, resolveTransientCircuit, selectTransientWaveforms, settingsJson, storedTransientSettings, TRANSIENT_EXTENSION, transientBasis, transientEngine, transientReference, transientScenarios } from '../transient'
import type { Excitation, TransientResult, TransientSettings } from '../transient'
import './transient.css'

const fmt = (v: number) => Number.isFinite(v) ? Number(v.toPrecision(9)).toString() : '不可用'
const message = (e: unknown) => e instanceof Error ? e.message : '操作失败；工程保持不变。'
function initialSettings(project: EngineeringProject, sheetId: string) { try { return { settings: storedTransientSettings(project, sheetId) ?? defaultTransientSettings(project, sheetId), error: '' } } catch (e) { return { settings: defaultTransientSettings(project, sheetId), error: message(e) } } }
export function TransientPanel({ project, sheetId, assets, writer, onCommit, onPreset, onOpenSignal, onCapture, onDirty }: {
  readonly project: EngineeringProject; readonly sheetId: string; readonly assets: readonly InlineAsset[]; readonly writer: ProjectDocumentV1['writer']
  readonly onCommit: (document: ProjectDocumentV1, expectedRevision: string) => boolean
  readonly onPreset: (project: EngineeringProject, expectedRevision: string) => boolean
  readonly onOpenSignal?: ((document: ProjectDocumentV1) => Promise<boolean>) | undefined
  readonly onCapture?: ((document: ProjectDocumentV1, datasetId: string, channelId: string) => Promise<boolean>) | undefined
  readonly onDirty: (dirty: boolean) => void
}) {
  const [initial] = useState(() => initialSettings(project, sheetId)), [form, setForm] = useState(initial.settings), [configError, setConfigError] = useState(initial.error)
  const [capture, setCapture] = useState<AnalysisCapture<TransientResult> | null>(null), [outcome, setOutcome] = useState<AnalysisResult<TransientResult>['outcome'] | null>(null)
  const [running, setRunning] = useState(false), [computing, setComputing] = useState(false), [status, setStatus] = useState('配置激励、初值与时间范围后运行。'), [error, setError] = useState(''), [progress, setProgress] = useState('')
  const [selection, setSelection] = useState<readonly number[] | null>(null), [sampleIndex, setSampleIndex] = useState(0), [basis, setBasis] = useState({ revision: '', value: '' })
  const abort = useRef<AbortController | null>(null), mounted = useRef(true)
  const sheet = project.sheets.find(s => s.id === sheetId)!, defaults = defaultTransientSettings(project, sheetId)
  const settings: TransientSettings = { ...form, sources: defaults.sources.map(s => form.sources.find(v => v.componentId === s.componentId && v.unit === s.unit) ?? s), initialConditions: defaults.initialConditions.map(s => form.initialConditions.find(v => v.componentId === s.componentId && v.unit === s.unit) ?? s) }
  const settingsKey = JSON.stringify(settings)
  const storedKey = JSON.stringify(initialSettings(project, sheetId).settings)
  useEffect(() => { onDirty(!!capture || settingsKey !== storedKey) }, [capture, settingsKey, storedKey, onDirty])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; abort.current?.abort() } }, [])
  useEffect(() => { let current = true; void transientBasis(project).then(value => { if (current) setBasis({ revision: project.revision, value }) }); return () => { current = false } }, [project])
  const document = useMemo<ProjectDocumentV1>(() => ({ format: 'org.stray.electronics.project', formatVersion: 1, requiredExtensions: [], writer, project, inlineAssets: assets }), [writer, project, assets])
  const restored = useMemo(() => { try { const record = readTransientRecord(document, sheetId); return { record, series: record ? loadTransientSeries(document, record) : null, error: '' } } catch (e) { return { record: null, series: null, error: message(e) } } }, [document, sheetId])
  const record = restored.record, live = capture?.result.outcome.kind === 'success' ? capture.result.outcome.value : null
  const view = live ?? (record && restored.series ? { ...record, series: restored.series } : null)
  const stale = live ? capture!.project.revision !== project.revision || JSON.stringify(live.settings) !== settingsKey : !!record && (basis.revision !== project.revision || basis.value !== record.basisDigest || JSON.stringify(record.settings) !== settingsKey)
  const selected = selection?.filter(i => view && i < view.series.length) ?? (view ? [view.series.findIndex(s => s.quantity === 'branch-voltage' && s.name.startsWith('U(C')), view.series.findIndex(s => s.quantity === 'branch-current' && s.name.startsWith('I(L')), view.series.findIndex(s => s.quantity === 'branch-current' && s.name.startsWith('I(R'))].filter(i => i >= 0).slice(0, 2) : [])
  const index = view ? Math.max(0, Math.min(view.axis.count - 1, sampleIndex)) : 0
  const reference = (() => { try { const parsed: unknown = JSON.parse(settingsKey); const valid = parseTransientSettings(parsed); return transientReference(resolveTransientCircuit(project, sheetId, valid), valid) } catch { return null } })()
  const plotted: LoadedWaveform | null = view && !stale && selected.length ? { axis: view.axis, dataset: { id: record?.datasetIds[0] ?? capture!.configuration.id, title: '真实暂态模拟', kind: 'waveform', axis: view.axis, channels: [], source: { kind: 'simulated', engine: transientEngine.descriptor.resource, projectRevision: capture?.project.revision ?? record!.provenance.inputRevision, analysisId: capture?.configuration.id ?? record!.provenance.analysisId, inputDigest: capture?.result.provenance.inputDigest ?? record!.provenance.inputDigest }, metadata: {} }, channels: selected.map(i => ({ channel: { id: `transient-view-${i}`, name: view.series[i]!.name, samples: { assetId: '', count: view.axis.count, encoding: 'float64-le', unit: view.series[i]!.unit } }, values: Float64Array.from(view.series[i]!.values) })) } : null
  const update = (next: TransientSettings) => { setForm(next); setError('') }
  const field = (label: string, value: number, change: (value: number) => void) => <label key={label}>{label}<input aria-label={label} type="number" step="any" value={Number.isFinite(value) ? value : ''} onChange={e => change(e.target.valueAsNumber)} /></label>
  const refName = (id: string) => sheet.components.find(c => c.id === id)?.reference ?? id
  async function run() {
    if (running || configError) return; setRunning(true); setError(''); setStatus('正在准备暂态输入…'); setCapture(null); setOutcome(null)
    const controller = new AbortController(); abort.current = controller; setComputing(true)
    try {
      const input = await createTransientInput(project, sheetId, settings), capability = transientEngine.inspect(input)
      if (capability.kind === 'unsupported') { setError(capability.diagnostics.map(d => `${d.code} · ${d.message}`).join('；')); setStatus('输入未通过适用性检查。'); return }
      const result = await transientEngine.run(input, { signal: controller.signal, readAsset: () => Promise.reject(new Error('no input samples required')), onProgress: (n, total) => { if (n % 16 === 0 || n === total) setProgress(`${n}/${total ?? '?'}`) } })
      if (!mounted.current) return
      setOutcome(result.outcome)
      if (result.outcome.kind === 'success') { setCapture({ project: input.project, configuration: input.configuration, result }); setSelection(null); setSampleIndex(0); setStatus('模拟完成：实际 MNA、局部误差、KCL 与含数值耗散的能量核对通过。请保存模拟到工程后导出文件。') }
      else setStatus(result.outcome.kind === 'cancelled' ? '分析已取消，未保存部分结果。' : '分析未成功；请查看诊断。')
    } catch (e) { setError(message(e)); setStatus('未生成成功结果。') } finally { if (mounted.current) { setRunning(false); setComputing(false) } }
  }
  async function saveConfiguration() {
    if (running || configError) return; setRunning(true); setError('')
    try { const valid = parseTransientSettings(settings), old = project.extensions[TRANSIENT_EXTENSION], container = old && typeof old === 'object' && !Array.isArray(old) ? old : {}; const next = reviseProject(project, project.revision, { extensions: { ...project.extensions, [TRANSIENT_EXTENSION]: { ...container, [sheetId]: settingsJson(valid) } } }); if (!onCommit(await createProjectDocument(next, writer, assets), project.revision)) throw Error('工程已改变，配置未覆盖。'); setStatus('暂态配置已保存到工程；请导出工程文件。已有分析需重新运行。') } catch (e) { setError(message(e)) } finally { setRunning(false) }
  }
  async function save() {
    if (!capture || stale || running) return; setRunning(true); setError('')
    try { const base = await createProjectDocument(project, writer, assets), result = await appendTransient(base, capture, sheetId); if (!onCommit(result.document, project.revision)) throw new Error('工程已改变，模拟未写回；请重新运行。'); setCapture(null); setStatus('本次模拟已完整保存到工程；请使用编辑器“导出工程”下载文件。重开保留来源与样本。') } catch (e) { setError(message(e)) } finally { setRunning(false) }
  }
  async function transfer(kind: 'signal' | 'competition') {
    if (!record || stale || capture || running || !selected.length) return; setRunning(true); setError('')
    try {
      const result = await selectTransientWaveforms(await createProjectDocument(project, writer, assets), record, selected)
      if (!onCommit(result.document, project.revision)) throw new Error('工程已改变，未覆盖现有工程。')
      const accepted = kind === 'signal' ? await onOpenSignal?.(result.document) : await onCapture?.(result.document, result.datasetId, result.document.project.measurements.find(d => d.id === result.datasetId)!.channels[0]!.id)
      setStatus(accepted ? '已打开所选真实模拟波形，原始数据和来源保留。' : '目标工作区保留原数据；所选波形仍已保存在编辑器工程内。')
    } catch (e) { setError(message(e)) } finally { setRunning(false) }
  }
  function csv() { if (!plotted || stale) return; const url = URL.createObjectURL(new Blob([exportCsv(plotted)], { type: 'text/csv;charset=utf-8' })), a = window.document.createElement('a'); a.href = url; a.download = 'stray-transient-simulated.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  function preset(id: typeof transientScenarios[number]['id']) { try { const next = configureTransientExperiment(project, sheetId, id); if (!onPreset(next, project.revision)) throw Error('工程已改变，未应用教学参数。'); setForm(storedTransientSettings(next, sheetId)!); setCapture(null); setConfigError(''); setStatus('教学参数与激励/初值已作为一次事务应用；这是数学激励实验，不是物理开关接触仿真。') } catch (e) { setError(message(e)) } }
  const referenceSeries = reference && view?.series.find(s => s.entityId === reference.entityId && s.quantity === reference.quantity)
  return <section className="transient-panel" aria-label="暂态分析面板" aria-busy={running}>
    <header><p className="eyebrow">初始状态 / 数值积分 / 动态响应</p><h2>暂态分析</h2><p>线性集总 R/C/L 与独立电压/电流源。波形由实际电路方程计算；后向欧拉采用内部步长倍分误差控制，均匀输出与内部积分步长分别记录。</p></header>
    <details><summary>应用教学参数</summary><p>会修改本图纸的 R/C/L 和激励初值，保留元件 ID 与历史记录。RC：1 kΩ/1 µF；RL：100 Ω/0.1 H；RLC：1 H/25 µF，串联 R=200/400/600 Ω，并联 R=200/100/50 Ω。按当前拓扑运行，适用性仍需引擎检查。</p><div className="transient-actions">{transientScenarios.map(s => <button key={s.id} disabled={running} onClick={() => preset(s.id)}>{s.name}</button>)}</div></details>
    {configError && <div role="alert"><p>已保存配置无效：{configError}。未改写原文件。</p><button onClick={() => { setForm(defaults); setConfigError(''); setStatus('已明确重置为零激励、零储能初值，请检查所有字段。') }}>明确重置暂态配置</button></div>}
    <fieldset disabled={running}><legend>时间与求解设置</legend><div className="transient-controls">{field('模拟时长 / s', settings.durationSeconds, durationSeconds => update({ ...settings, durationSeconds }))}{field('输出采样间隔 / s', settings.intervalSeconds, intervalSeconds => update({ ...settings, intervalSeconds }))}{field('局部相对容差', settings.relativeTolerance, relativeTolerance => update({ ...settings, relativeTolerance }))}<label>暂态参考节点<select aria-label="暂态参考节点" value={settings.referenceAnchorId ?? ''} onChange={e => { const next = { ...settings }; if (e.target.value) next.referenceAnchorId = e.target.value; else delete next.referenceAnchorId; update(next) }}><option value="">模拟参考标记 / 唯一 GND 网</option>{sheet.anchors.map(a => <option key={a.id} value={a.id}>{sheet.ports.find(p => p.anchorId === a.id)?.label ?? sheet.components.flatMap(c => c.pins.filter(p => p.anchorId === a.id).map(p => `${c.reference}.${p.definitionPinKey}`))[0] ?? a.id.slice(0, 8)}</option>)}</select></label></div><p>参考只选择零电位，不创建连接。输出 2–8193 点；时长须为输出间隔整数倍。局部绝对容差：10⁻⁸ V / 10⁻¹⁰ A；相对容差 10⁻⁸–10⁻³，不能解释为全局精度保证。</p></fieldset>
    <fieldset disabled={running}><legend>显式时间域激励</legend><p>每个独立源单独声明；未继承 DC 数值或 AC RMS 相量。电压/电流正向按引脚 1→2。事件处储能状态保持、代数变量可跳变；不支持脉冲解或拓扑切换。</p>{settings.sources.length ? settings.sources.map(s => {
      const edit = (next: Excitation) => update({ ...settings, sources: settings.sources.map(v => v.componentId === s.componentId ? next : v) })
      return <div className="transient-source" key={s.componentId}><h3>{refName(s.componentId)} / {s.unit}</h3><div className="transient-controls"><label>{refName(s.componentId)} 激励类型<select aria-label={`${refName(s.componentId)} 激励类型`} value={s.mode} onChange={e => edit(e.target.value === 'constant' ? { componentId: s.componentId, unit: s.unit, mode: 'constant', value: 0 } : e.target.value === 'step' ? { componentId: s.componentId, unit: s.unit, mode: 'step', initial: 0, final: s.unit === 'V' ? 10 : .01, atSeconds: 0 } : { componentId: s.componentId, unit: s.unit, mode: 'pulse', initial: 0, final: s.unit === 'V' ? 10 : .01, startSeconds: 0, endSeconds: settings.durationSeconds / 2 })}><option value="constant">恒定 DC</option><option value="step">阶跃</option><option value="pulse">有限矩形脉冲</option></select></label>{s.mode === 'constant' ? field(`${refName(s.componentId)} 恒定值 / ${s.unit}`, s.value, value => edit({ ...s, value })) : <>{field(`${refName(s.componentId)} 初始值 / ${s.unit}`, s.initial, initial => edit({ ...s, initial }))}{field(`${refName(s.componentId)} 激励值 / ${s.unit}`, s.final, final => edit({ ...s, final }))}{s.mode === 'step' ? field(`${refName(s.componentId)} 阶跃时刻 / s`, s.atSeconds, atSeconds => edit({ ...s, atSeconds })) : <>{field(`${refName(s.componentId)} 脉冲开始 / s`, s.startSeconds, startSeconds => edit({ ...s, startSeconds }))}{field(`${refName(s.componentId)} 脉冲结束 / s`, s.endSeconds, endSeconds => edit({ ...s, endSeconds }))}</>}</>}</div></div>
    }) : <p>当前无独立源；可通过非零初始条件进行零输入实验。</p>}</fieldset>
    <fieldset disabled={running}><legend>储能初始条件 · 0⁻ 的指定状态</legend><p>先用指定 vC/iL 和 0⁺ 激励重求一致代数解，不自动求 DC 工作点。有限条件下 vC、iL 连续；理想约束不相容时拒绝结果。</p><div className="transient-controls">{settings.initialConditions.map(s => field(`${refName(s.componentId)} 初始${s.unit === 'V' ? '电压 / V' : '电流 / A'}`, s.value, value => update({ ...settings, initialConditions: settings.initialConditions.map(v => v.componentId === s.componentId ? { ...v, value } : v) })))}</div></fieldset>
    <div className="transient-actions"><button className="primary-button" disabled={running || !!configError} onClick={() => void run()}>运行暂态分析</button><button disabled={!computing} onClick={() => abort.current?.abort()}>取消暂态分析</button><button disabled={running || !!configError} onClick={() => void saveConfiguration()}>保存暂态配置</button><button disabled={running || !capture || stale} onClick={() => void save()}>保存本次模拟到工程</button></div>
    <p role="status" aria-label="暂态分析状态">{stale ? '结果已过期：电路或暂态配置已改变，请重新运行。历史样本仍保留在工程中。' : running ? `正在计算 / 保存 ${progress}` : status}</p>
    {error && <p role="alert">{error}</p>}{restored.error && <p role="alert">已存暂态记录不可用：{restored.error}</p>}{outcome && 'diagnostics' in outcome && outcome.diagnostics.map(d => <p role="alert" key={d.code}>{d.code} · {d.message}</p>)}
    {reference && <section className="transient-teaching" aria-label="暂态解析参考"><h3>独立解析参考 · {reference.kind}</h3><p>{reference.description}</p><p>初值 {fmt(reference.initial)} {reference.unit}；恒定激励极限值 {fmt(reference.final)} {reference.unit}。{reference.tauSeconds !== undefined && <>τ = {fmt(reference.tauSeconds)} s；零输入、零状态和全响应由实际初值/激励区分。</>}</p>{reference.alpha !== undefined && <p>α = {fmt(reference.alpha)} s⁻¹；ω₀ = {fmt(reference.omega0!)} rad/s；{reference.damping === 'underdamped' ? '欠阻尼' : reference.damping === 'critical' ? '临界阻尼' : '过阻尼'}。{reference.omegaD !== undefined ? `ωd = ${fmt(reference.omegaD)} rad/s。` : '无实数阻尼振荡频率。'}</p>}<p>只对已识别的一阶闭合回路、串联 RLC 或无源并联 RLC、0⁺ 后恒定激励成立；解析值与数值值分别显示。</p></section>}
    {!reference && <p className="muted">此拓扑/脉冲没有已识别的闭式教学参考；可支持的电路仍由数值引擎求解，不使用任意拓扑阻尼公式。</p>}
    {view && !stale && <section className="transient-results" aria-label="暂态模拟结果"><h3>{capture ? '本次实际数值波形 · 尚未保存' : '已保存的实际模拟波形'}</h3><p>R: v=Ri；C: i=C·dv/dt；L: v=L·di/dt；每步满足节点 KCL。共 {view.axis.count} 个均匀样本，输出间隔 {fmt(view.axis.intervalSeconds)} s。</p><details><summary>选择节点电压、支路电压/电流与储能（最多4条）</summary><div className="transient-selections">{view.series.map((s, i) => <label key={`${s.entityId}:${s.quantity}`}><input type="checkbox" checked={selected.includes(i)} disabled={!selected.includes(i) && selected.length >= 4} onChange={e => setSelection(e.target.checked ? [...selected, i] : selected.filter(x => x !== i))} />{s.name} / {s.unit}</label>)}</div></details>
      <label>精确样本索引<input aria-label="精确样本索引" type="number" min="0" max={view.axis.count - 1} step="1" value={index} onChange={e => { if (Number.isFinite(e.target.valueAsNumber)) setSampleIndex(Math.round(e.target.valueAsNumber)) }} /></label><output aria-label="暂态精确样本读数">样本 {index} · t={fmt(index * view.axis.intervalSeconds)} s；{selected.map(i => `${view.series[i]!.name}=${fmt(view.series[i]!.values[index]!)} ${view.series[i]!.unit}`).join('；')}{reference && referenceSeries && <>；解析参考 {fmt(reference.at(index * view.axis.intervalSeconds))} {reference.unit}；数值−解析={fmt(referenceSeries.values[index]! - reference.at(index * view.axis.intervalSeconds))} {reference.unit}</>}</output>
      {plotted && <Oscilloscope waveform={plotted} sampleIndex={index} onSampleIndex={setSampleIndex} />}
      <section aria-label="能量与数值核对"><h3>能量与数值核对</h3><p>EC=½Cv²；EL=½Li²。初始能量 {fmt(view.checks.initialEnergyJ)} J；最终能量 {fmt(view.checks.finalEnergyJ)} J；源供能 {fmt(view.checks.sourceDeliveredJ)} J；电阻耗散 {fmt(view.checks.resistorDissipationJ)} J。</p><p>后向欧拉数值耗散 {fmt(view.checks.numericalDissipationJ)} J（属于近似误差，不能计作物理损耗）；ΔE+电阻耗散−源供能+数值耗散={fmt(view.checks.energyBalanceErrorJ)} J。</p><p>实际积分步 {view.checks.acceptedSteps}；拒绝重试 {view.checks.rejectedSteps}；内部步长 {fmt(view.checks.minimumStepSeconds)}–{fmt(view.checks.maximumStepSeconds)} s；线性求解 {view.checks.linearSolves} 次；最大局部误差比 {fmt(view.checks.maxLocalErrorRatio)}；最大 KCL 残差 {fmt(view.checks.maxKclAmps)} A。</p><p>源事件：{view.checks.eventTimes.length ? view.checks.eventTimes.map(fmt).join('、') : '仅 0⁺ 或无事件'} s。内部积分对齐事件；输出采样间隔过大时可能看不到窄脉冲，需缩小输出间隔；内部误差控制不能代替采样分辨率检查。</p></section>
      <div className="transient-actions"><button disabled={!plotted || running} onClick={csv}>导出所选模拟波形 CSV</button>{onOpenSignal && <button disabled={!record || !!capture || running || !selected.length} onClick={() => void transfer('signal')}>在信号实验室打开所选波形</button>}{onCapture && <button disabled={!record || !!capture || running || !selected.length} onClick={() => void transfer('competition')}>关联暂态波形到电赛实验</button>}</div><p>先保存本次模拟，再打开信号工具或关联电赛。电赛统计默认采用所选第一通道，可在信号实验室选择其他通道。所有数据均为模拟，不是硬件采集。</p>
      <details><summary>模拟来源与精度边界</summary><p className="transient-provenance">工程 {project.id} · 输入修订 {capture?.result.provenance.inputRevision ?? record?.provenance.inputRevision}<br />{transientEngine.descriptor.resource.id} / 1<br />SHA-256 {capture?.result.provenance.inputDigest ?? record?.provenance.inputDigest}</p><p>局部误差接受阈值不表示全局精确解。可减小输出间隔、收紧容差并重复计算比较；不合适的刚性/极端约束可能明确失败。最多 48 个未知量、64 个元件、500000 输出标量、60000 次内部线性求解及 80000000 估算工作量。文件预算不足时整个保存事务失败，保留原工程。</p></details>
    </section>}
    {record && stale && <details><summary>历史模拟来源（当前不可作为新结果）</summary><p className="transient-provenance">原始输入修订 {record.provenance.inputRevision} · {record.axis.count} 点 · {record.createdAtUtc}<br />{record.provenance.inputDigest}</p></details>}
  </section>
}
