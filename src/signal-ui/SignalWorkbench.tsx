import { useImperativeHandle, useMemo, useState } from 'react'
import type { Ref } from 'react'
import { createId, reviseProject } from '../engineering'
import type { JsonObject, JsonValue } from '../engineering'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import type { ProjectDocumentV1 } from '../project-format'
import { appendRcFilter, appendGenerated, appendSpectrum, assetBytes, decodeCsv, DEFAULT_GENERATOR, digestJson, emptySignalDocument, exportCsv, importCsv, loadWaveform, measurementsFor, parseCsv, SIGNAL_ENGINE, signalFftEngine } from '../signal'
import type { RcFilterOptions, AmplitudeSpectrum, CsvMapping, CsvTable, GeneratorOptions, LoadedWaveform, SpectrumOptions, WaveKind } from '../signal'
import packageText from '../../package.json?raw'
import { Oscilloscope, SpectrumChart } from './SignalCharts'
import { formatNumber } from './format'
import './signal.css'

const writer = { name: 'STRAY Electronics Lab', version: (JSON.parse(packageText) as { version: string }).version }
const waveNames: Readonly<Record<WaveKind, string>> = { sine: '正弦波', square: '方波', triangle: '三角波', pulse: '脉冲', noise: '均匀噪声' }
const measureNames: Readonly<Record<string, string>> = { minimum: '采样最小值', maximum: '采样最大值', peakToPeak: '峰峰值', mean: '算术平均值', totalRms: '总 RMS', acRms: '交流 RMS（去均值）', frequency: '频率估计' }
function messageFor(error: unknown): string { return error instanceof Error ? error.message : '操作失败，当前数据保持不变。' }
function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement('a')
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function storedFftOptions(doc: ProjectDocumentV1): SpectrumOptions {
  const extension = doc.project.extensions['org.stray.signal']
  const value = isJsonObject(extension) ? extension.fftOptions : null
  return isJsonObject(value) ? { window: value.window === 'hann' ? 'hann' : 'rectangular', removeMean: value.removeMean === true } : { window: 'rectangular', removeMean: false }
}
function isJsonObject(value: JsonValue | undefined): value is JsonObject { return value !== null && typeof value === 'object' && !Array.isArray(value) }
export interface SignalWorkbenchHandle { openDocument: (document: ProjectDocumentV1, preset?: GeneratorOptions, mode?: 'inspect') => Promise<boolean> }
export function SignalWorkbench({ ref, onCapture }: { readonly ref?: Ref<SignalWorkbenchHandle>; readonly onCapture?: ((document: ProjectDocumentV1, datasetId: string, channelId: string) => Promise<boolean>) | undefined }) {
  const [savedRevision, setSavedRevision] = useState('')
  const [rcOptions, setRcOptions] = useState<RcFilterOptions>({ resistanceOhms: 1000, capacitanceFarads: 1e-6, initialOutput: 0, mode: 'lowpass' })
  const [document, setDocument] = useState<ProjectDocumentV1 | null>(null), [activeId, setActiveId] = useState<string | null>(null), [channelId, setChannelId] = useState<string | null>(null)
  const [generator, setGenerator] = useState<GeneratorOptions>({ ...DEFAULT_GENERATOR }), [fftOptions, setFftOptions] = useState<SpectrumOptions>({ window: 'rectangular', removeMean: false })
  const [spectrum, setSpectrum] = useState<AmplitudeSpectrum | null>(null), [fftError, setFftError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('先生成测试信号，或导入带明确时间列的 CSV。'), [failed, setFailed] = useState(false)
  const [pendingCsv, setPendingCsv] = useState<{ bytes: Uint8Array; name: string; table: CsvTable } | null>(null), [mapping, setMapping] = useState<CsvMapping>({ timeColumn: 0, timeUnit: 's', channels: [] })
  const waveform = useMemo(() => document && activeId ? loadWaveform(document, activeId) : null, [document, activeId])
  const selectedId = waveform?.channels.some(c => c.channel.id === channelId) ? channelId! : waveform?.channels[0]?.channel.id ?? null
  const selected = waveform?.channels.find(c => c.channel.id === selectedId)
  const measured = useMemo(() => {
    if (!waveform || !selectedId) return { items: [], error: '' }
    try { return { items: measurementsFor(waveform, selectedId), error: '' } } catch (e) { return { items: [], error: messageFor(e) } }
  }, [waveform, selectedId])
  const announce = (text: string, error = false) => { setMessage(text); setFailed(error) }
  async function analyze(doc: ProjectDocumentV1, loaded: LoadedWaveform, targetChannel: string, options: SpectrumOptions, persist = true) {
    const configuration = { id: createId(), analysisType: 'signal.fft', preferredEngine: SIGNAL_ENGINE, scope: { kind: 'dataset' as const, datasetIds: [loaded.dataset.id] }, options: { channelId: targetChannel, scope: 'full-capture', ...options } }
    const inputDigest = await digestJson({ ...doc.project, revision: null, results: [], configuration })
    const result = await signalFftEngine.run({ project: doc.project, configuration, inputDigest }, { signal: new AbortController().signal, readAsset: id => Promise.resolve(assetBytes(doc, id)), onProgress: () => {} })
    if (result.outcome.kind !== 'success') {
      const text = result.outcome.kind === 'failure' || result.outcome.kind === 'unsupported' || result.outcome.kind === 'inconclusive' ? result.outcome.diagnostics.map(d => d.message).join('；') : '分析已取消。'
      return { document: doc, spectrum: null, error: text }
    }
    const next = persist ? await appendSpectrum(doc, loaded, targetChannel, result.outcome.value.spectrum, { configuration, provenance: result.provenance }) : doc
    return { document: next, spectrum: result.outcome.value.spectrum, error: '' }
  }
  async function showCapture(doc: ProjectDocumentV1, datasetId: string, targetChannel?: string, options = fftOptions) {
    const loaded = loadWaveform(doc, datasetId), target = targetChannel ?? loaded.channels[0]!.channel.id
    const result = await analyze(doc, loaded, target, options)
    setDocument(result.document); setActiveId(datasetId); setChannelId(target); setSpectrum(result.spectrum); setFftError(result.error)
  }
  async function runRcFilter() {
    if (busy || !document || !activeId || !selectedId) return; setBusy(true)
    try { const filtered = await appendRcFilter(document, activeId, selectedId, rcOptions); await showCapture(filtered.document, filtered.datasetId, filtered.channelId); announce('RC 采样滤波完成：原始捕获保留，当前显示输入与派生输出，FFT 默认分析输出通道。') }
    catch (e) { announce(messageFor(e), true) } finally { setBusy(false) }
  }
  async function generate() {
    if (busy) return; setBusy(true)
    try {
      const base = document ?? await emptySignalDocument(writer), generated = await appendGenerated(base, generator)
      await showCapture(generated.document, generated.datasetId)
      announce('合成采样已生成，示波器、测量与可用 FFT 已更新。')
    } catch (e) { announce(messageFor(e), true) } finally { setBusy(false) }
  }
  async function runFft(targetChannel = selectedId, datasetId = activeId) {
    if (busy || !document || !datasetId || !targetChannel) return; setBusy(true)
    try { await showCapture(document, datasetId, targetChannel); announce('已基于当前完整采样记录更新分析；FFT 不可用时保留时域数据。') }
    catch (e) { announce(messageFor(e), true) } finally { setBusy(false) }
  }
  async function selectDataset(id: string) {
    if (busy || !document) return; setBusy(true)
    try { await showCapture(document, id); announce('已切换捕获，原始数据及工程中的来源记录保留。') }
    catch (e) { announce(messageFor(e), true) } finally { setBusy(false) }
  }
  async function chooseCsv(file: File) {
    if (busy) return; setBusy(true)
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('CSV 最大 8 MiB，未截断或导入。')
      const bytes = new Uint8Array(await file.arrayBuffer()), table = parseCsv(decodeCsv(bytes))
      setPendingCsv({ bytes, table, name: file.name }); setMapping({ timeColumn: 0, timeUnit: 's', channels: [{ column: 1, name: table.headers[1]!, unit: 'V' }] }); announce('已读取表头；请确认时间列、通道及单位，再导入。')
    } catch (e) { setPendingCsv(null); announce(messageFor(e), true) } finally { setBusy(false) }
  }
  async function confirmCsv() {
    if (busy || !pendingCsv) return; setBusy(true)
    try { const imported = await importCsv(document ?? await emptySignalDocument(writer), pendingCsv.bytes, pendingCsv.name, mapping); await showCapture(imported.document, imported.datasetId); setPendingCsv(null); announce('CSV 已导入，原始字节和映射已保存；时域数据与分析已更新。') }
    catch (e) { announce(messageFor(e), true) } finally { setBusy(false) }
  }
  async function saveProject() {
    if (busy || !document) return; setBusy(true)
    try {
      const current = document.project.extensions['org.stray.signal']
      const project = reviseProject(document.project, document.project.revision, { extensions: { ...document.project.extensions, 'org.stray.signal': { ...(isJsonObject(current) ? current : {}), activeDatasetId: activeId, channelId: selectedId, fftOptions: { ...(spectrum?.options ?? fftOptions) } } } })
      const next = await createProjectDocument(project, writer, document.inlineAssets), text = await serializeProject(next)
      download(text, 'signal-project.straylab.json', 'application/json;charset=utf-8'); setDocument(next); setSavedRevision(next.project.revision); announce('完整信号工程已导出，含原始/派生数据、来源、处理设置与校验。')
    }
    catch (e) { announce(`工程未导出：${messageFor(e)}。没有截断或省略资产。`, true) } finally { setBusy(false) }
  }
  async function loadDocument(doc: ProjectDocumentV1, mode?: 'inspect') {
    const options = storedFftOptions(doc), captures = doc.project.measurements.filter(d => d.kind === 'waveform' && d.axis.kind === 'uniform-time' && d.axis.count <= 65536 && d.channels.length <= 4)
      const extension = doc.project.extensions['org.stray.signal'], preferred = isJsonObject(extension) ? extension.activeDatasetId : null
      const chosen = captures.find(d => d.id === preferred) ?? captures[0]
      if (chosen) {
        const loaded = loadWaveform(doc, chosen.id), preferredChannel = isJsonObject(extension) ? extension.channelId : null
        const channel = loaded.channels.find(c => c.channel.id === preferredChannel)?.channel.id ?? loaded.channels[0]!.channel.id
        const result = mode === 'inspect' || chosen.metadata.simulated === true || chosen.source.kind === 'simulated' && chosen.source.engine.id === 'org.stray.engine.transient-mna' ? { document: doc, spectrum: null, error: '暂态模拟波形未自动运行 FFT。请先检查时间窗口、采样点数与分析目的，再明确运行 FFT。' } : await analyze(doc, loaded, channel, options, false)
        setDocument(result.document); setActiveId(chosen.id); setChannelId(channel); setSpectrum(result.spectrum); setFftError(result.error)
      } else { setDocument(doc); setActiveId(null); setChannelId(null); setSpectrum(null); setFftError('') }
      setFftOptions(options); setPendingCsv(null); announce(chosen ? '工程已打开，原始采样、通道身份、来源和处理设置已恢复。' : '工程已打开并完整保留；没有本工作台支持的均匀捕获，可生成或导入新数据。')
    setSavedRevision(doc.project.revision)
  }
  useImperativeHandle(ref, () => ({ async openDocument(doc, preset, mode) {
    if (busy) return false
    if (document && document.project.revision !== savedRevision && !window.confirm('信号实验室有未导出的数据，载入电赛工程并替换当前数据？')) return false
    setBusy(true)
    try { await loadDocument(doc, mode); if (preset && !doc.project.measurements.some(d => d.kind === 'waveform')) setGenerator(preset); return true }
    catch (e) { announce(messageFor(e), true); return false } finally { setBusy(false) }
  } }))
  async function capture() {
    if (!document || !activeId || !selectedId || !onCapture || busy) return
    setBusy(true); try { const ok = await onCapture(document, activeId, selectedId); announce(ok ? '实际采样与测量已关联到电赛实验。' : '关联未完成，当前数据保留，请检查工作台提示。', !ok) } catch (e) { announce(messageFor(e), true) } finally { setBusy(false) }
  }
  async function openProject(file: File) {
    if (busy) return; setBusy(true)
    try {
      if (file.size > 32 * 1024 * 1024) throw new Error('工程超过 32 MiB 文件上限；当前数据保持不变。')
      const result = await deserializeProject(new Uint8Array(await file.arrayBuffer()))
      if (result.kind !== 'ready') throw new Error(result.kind === 'invalid' ? result.issues.map(i => `${i.path}: ${i.message}`).join('；') : '此工程格式、版本或所需扩展不受支持。')
      await loadDocument(result.document)
    } catch (e) { announce(`打开失败，当前数据保持不变：${messageFor(e)}`, true) } finally { setBusy(false) }
  }
  const editGenerator = (key: keyof GeneratorOptions, value: number | WaveKind) => setGenerator(o => ({ ...o, [key]: value }))
  return <section className="signal-workbench" aria-label="信号实验室工作区" aria-busy={busy}>
    <header className="signal-heading"><div><p className="eyebrow">工程 / 信号测量</p><h1>信号测量与分析实验室</h1><p>生成或导入采样，观察时域、测量有效值并分析频谱。</p></div><p className="signal-note">合成与导入数据工作台<br />不采集硬件；可检查独立暂态引擎的模拟波形</p></header>
    <p aria-label="信号处理状态" role={failed ? 'alert' : 'status'} className={`signal-message ${failed ? 'error' : ''}`}>{busy ? '正在处理完整采样与资产，请稍候…' : message}</p>
    {onCapture && <button disabled={busy || !waveform} onClick={() => void capture()}>关联到电赛实验</button>}
    <section className="signal-section" aria-label="信号发生器"><h2>01 / 信号发生器</h2><form onSubmit={e => { e.preventDefault(); void generate() }}><fieldset disabled={busy}><legend>离散合成参数</legend><div className="signal-form-grid"><label>波形<select aria-label="波形" value={generator.kind} onChange={e => editGenerator('kind', e.target.value as WaveKind)}>{Object.entries(waveNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
      {([
        ['frequencyHz', '频率 / Hz', 1, generator.kind === 'noise'], ['amplitude', '峰值幅值 / V', 0.1, false], ['offset', '直流偏置 / V', 0.1, false], ['phaseRadians', '初相位 / rad', 0.1, generator.kind === 'noise'], ['sampleRateHz', '采样率 / Hz', 1, false], ['count', '采样点数', 1, false], ['dutyCycle', '占空比（0–1）', 0.01, generator.kind !== 'square' && generator.kind !== 'pulse'], ['seed', '噪声种子（uint32）', 1, generator.kind !== 'noise'],
      ] as const).map(([key, label, step, disabled]) => <label key={key}>{label}<input aria-label={label} type="number" step={key === 'count' || key === 'seed' ? step : 'any'} disabled={disabled} required value={Number.isNaN(generator[key]) ? '' : generator[key]} onChange={e => editGenerator(key, e.target.value === '' ? NaN : Number(e.target.value))} /></label>)}</div><button type="submit">生成并分析</button></fieldset></form>
      <p className="signal-note">幅值约定：正弦/方波/三角波/噪声围绕偏置取 ±峰值；脉冲在偏置到“偏置＋幅值”之间。采集时长 N/fs = {formatNumber(generator.count / generator.sampleRateHz)} s；最后一个样本位于 (N−1)/fs。修改参数后点击生成，当前曲线才更新。</p>
    </section>
    <section className="signal-section" aria-label="CSV 与信号工程"><h2>数据 / 导入与导出</h2><div className="signal-file-controls"><label>选择 CSV 文件<input aria-label="选择 CSV 文件" type="file" accept=".csv,text/csv" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void chooseCsv(file) }} /></label><label>打开信号工程<input aria-label="打开信号工程" type="file" accept=".json,application/json" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void openProject(file) }} /></label><button disabled={!document || busy} onClick={() => void saveProject()}>导出完整工程</button><button disabled={!waveform || busy} onClick={() => { if (waveform) { download(exportCsv(waveform), waveform.dataset.metadata.simulated === true || waveform.dataset.source.kind === 'simulated' ? 'simulated-waveform.csv' : 'waveform.csv', 'text/csv;charset=utf-8'); announce('CSV 已导出全部样本；完整来源和处理记录请另存工程 JSON。') } }}>导出波形 CSV</button><button disabled={!waveform || busy || measured.items.length === 0} onClick={() => { if (waveform) download(JSON.stringify({ format: 'org.stray.signal.measurements', version: 1, title: waveform.dataset.title, datasetId: waveform.dataset.id, scope: 'full-capture', axis: waveform.axis, source: waveform.dataset.source, measurements: measured.items, spectrum: spectrum ? { ...spectrum.options, normalization: spectrum.normalization, coherentGain: spectrum.coherentGain, sampleCount: spectrum.sampleCount, sampleRateHz: spectrum.sampleRateHz, binSpacingHz: spectrum.binSpacingHz, peak: spectrum.peak } : null }, null, 2), 'measurements.json', 'application/json;charset=utf-8') }}>导出测量结果 JSON</button></div>
      <p className="signal-note">CSV：UTF-8、英文逗号、小数点；须有表头和明确单位。最多 65,536 行/4 通道/8 MiB；非均匀时间轴会报错，绝不静默插值。CSV 仅交换采样，完整工程另含来源、原 CSV 及校验资产。</p>
      {pendingCsv && <div className="signal-csv-review" aria-label="CSV 列映射"><h3>{pendingCsv.name} · {pendingCsv.table.rows.length} 个数据行</h3><div className="signal-inline-controls"><label>时间列<select aria-label="时间列" value={mapping.timeColumn} onChange={e => { const column = Number(e.target.value); setMapping(m => ({ ...m, timeColumn: column, channels: m.channels.filter(c => c.column !== column) })) }}>{pendingCsv.table.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></label><label>时间单位<select aria-label="时间单位" value={mapping.timeUnit} onChange={e => setMapping(m => ({ ...m, timeUnit: e.target.value as CsvMapping['timeUnit'] }))}><option value="s">秒 s</option><option value="ms">毫秒 ms</option><option value="us">微秒 μs</option></select></label></div>
        <div className="signal-csv-channels">{pendingCsv.table.headers.map((header, column) => column === mapping.timeColumn ? null : <div key={column}><label><input type="checkbox" aria-label={`导入通道 ${header}`} checked={mapping.channels.some(c => c.column === column)} onChange={e => setMapping(m => ({ ...m, channels: e.target.checked ? [...m.channels, { column, name: header, unit: 'V' }] : m.channels.filter(c => c.column !== column) }))} />{header}</label><label>幅值单位<select aria-label={`单位 ${header}`} value={mapping.channels.find(c => c.column === column)?.unit ?? 'V'} onChange={e => setMapping(m => ({ ...m, channels: m.channels.map(c => c.column === column ? { ...c, unit: e.target.value as CsvMapping['channels'][number]['unit'] } : c) }))}>{['V', 'mV', 'A', 'mA', '1'].map(unit => <option key={unit}>{unit}</option>)}</select></label></div>)}</div>
        <div className="table-scroll"><table><caption>原始数据预览（前 5 行，未转换单位）</caption><thead><tr>{pendingCsv.table.headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{pendingCsv.table.rows.slice(0, 5).map(row => <tr key={row.line}>{row.cells.map((v, i) => <td key={i}>{v}</td>)}</tr>)}</tbody></table></div><button disabled={busy} onClick={() => void confirmCsv()}>确认列与单位并导入</button></div>}
    </section>
    {document && <section className="signal-capture-row"><label>当前捕获<select aria-label="当前捕获" disabled={busy} value={activeId ?? ''} onChange={e => void selectDataset(e.target.value)}><option value="" disabled>选择时域捕获</option>{document.project.measurements.filter(d => d.kind === 'waveform').map(d => <option key={d.id} value={d.id}>{d.title} · {d.source.kind === 'simulated' ? '合成' : d.source.kind === 'imported' ? '导入' : d.source.kind}</option>)}</select></label>{waveform && <><p>来源：{waveform.dataset.source.kind === 'simulated' ? '合成采样' : waveform.dataset.source.kind === 'imported' ? `CSV 导入 · ${waveform.dataset.source.fileName}` : '已有工程数据'}<br />{waveform.axis.count} 点 · fs = {formatNumber(1 / waveform.axis.intervalSeconds)} Hz · Δt = {formatNumber(waveform.axis.intervalSeconds)} s · Nyquist = {formatNumber(1 / waveform.axis.intervalSeconds / 2)} Hz</p><details><summary>来源与数据身份</summary><pre>{JSON.stringify({ datasetId: waveform.dataset.id, source: waveform.dataset.source, metadata: waveform.dataset.metadata }, null, 2)}</pre></details></>}</section>}
    {waveform && <section className="signal-section" aria-label="采样 RC 滤波"><h2>采样 RC 滤波</h2><p>对当前分析通道执行理想 RC 的零阶保持（ZOH）处理。输入 x[n] 在 [t[n], t[n+1]) 保持；电容电压 y[0] 为指定初值，y[n] = a y[n−1] + (1−a)x[n−1]，a = exp(−Δt/RC)。低通输出 y，高通输出 x−y。仅此采样模型，不是任意电路暂态或硬件采集。</p><div className="signal-form-grid">{([['resistanceOhms', '滤波电阻 / Ω'], ['capacitanceFarads', '滤波电容 / F'], ['initialOutput', '初始电容电压 / 输入单位']] as const).map(([key, label]) => <label key={key}>{label}<input aria-label={label} type="number" step="any" value={Number.isNaN(rcOptions[key]) ? '' : rcOptions[key]} onChange={e => setRcOptions(o => ({ ...o, [key]: e.target.value === '' ? NaN : Number(e.target.value) }))} /></label>)}<label>滤波方式<select aria-label="滤波方式" value={rcOptions.mode} onChange={e => setRcOptions(o => ({ ...o, mode: e.target.value as RcFilterOptions['mode'] }))}><option value="lowpass">RC 低通</option><option value="highpass">RC 高通</option></select></label></div><button disabled={busy} onClick={() => void runRcFilter()}>运行采样 RC 滤波</button><p className="signal-note">当前输入：{selected?.channel.name}。运行后生成包含原始输入和滤波输出的新捕获；在“分析通道”切换可比较测量与 FFT。处理来源、参数及完整采样随工程保存，CSV 导出两列波形。修改上述参数不改变已有结果，需再次运行。</p></section>}
    {waveform && <><Oscilloscope key={waveform.dataset.id} waveform={waveform} /><section className="signal-section" aria-label="信号测量结果"><div className="signal-section-heading"><h2>03 / 测量 · 全采样记录</h2><label>分析通道<select aria-label="分析通道" disabled={busy} value={selectedId ?? ''} onChange={e => void runFft(e.target.value)}>{waveform.channels.map(c => <option key={c.channel.id} value={c.channel.id}>{c.channel.name} / {c.channel.samples.unit}</option>)}</select></label></div>
      {measured.error && <p role="alert">测量不可用：{measured.error}</p>}<div className="table-scroll"><table><caption>全捕获采样测量（不随图形缩放改变）</caption><thead><tr><th>量</th><th>值 / 单位</th></tr></thead><tbody>{measured.items.map(m => <tr key={m.name}><th scope="row">{measureNames[m.name] ?? m.name}</th><td data-testid={`measurement-${m.name}`}>{m.kind === 'available' ? `${formatNumber(m.value.value)} ${m.value.unit}` : `不可用：${m.reason}`}</td></tr>)}</tbody></table></div><details><summary>测量方法与范围</summary><p>最小/最大值和峰峰值来自离散样本。总 RMS = √mean(x²)；交流 RMS = √mean((x−mean(x))²)。频率采用上升过均值插值，至少三个稳定完整周期，每周期至少 8 点；噪声、周期不稳定或采样不足时不报告频率。结果不是仪器精度认证。</p></details>
    </section><section className="signal-section" aria-label="FFT 频谱分析"><h2>04 / FFT 频谱</h2><div className="signal-inline-controls"><label>窗函数<select aria-label="窗函数" disabled={busy} value={fftOptions.window} onChange={e => setFftOptions(o => ({ ...o, window: e.target.value as SpectrumOptions['window'] }))}><option value="rectangular">矩形窗</option><option value="hann">周期 Hann 窗</option></select></label><label><input type="checkbox" disabled={busy} checked={fftOptions.removeMean} onChange={e => setFftOptions(o => ({ ...o, removeMean: e.target.checked }))} />FFT 前去均值</label><button disabled={busy} onClick={() => void runFft()}>运行 FFT</button></div><p className="signal-note">修改窗/去均值后点击运行；下方标明上次实际使用的设置。支持 2 的幂点数，不截断、不填零。图和测量基于完整原始采样；这里不计算 RMS 频谱、功率或 PSD。</p>
      {fftError && <p role="alert">FFT 不可用：{fftError} 时域数据仍保留。</p>}{spectrum && selected && <><SpectrumChart spectrum={spectrum} unit={selected.channel.samples.unit} /><p data-testid="fft-peak">最大幅值分量（含 DC）：{spectrum.peak ? `${formatNumber(spectrum.peak.hertz)} Hz · ${formatNumber(spectrum.peak.amplitude)} ${selected.channel.samples.unit} 峰值` : '不可用：全零谱'}</p><p data-testid="fft-metadata">N = {spectrum.sampleCount} · fs = {formatNumber(spectrum.sampleRateHz)} Hz · Δf = {formatNumber(spectrum.binSpacingHz)} Hz · 采集时长 = {formatNumber(spectrum.captureSeconds)} s · {spectrum.options.window === 'hann' ? '周期 Hann 窗' : '矩形窗'} · coherent gain = {formatNumber(spectrum.coherentGain)} · {spectrum.options.removeMean ? '已去均值' : '未去均值'}</p></>}
    </section></>}
    <section className="signal-section signal-learning"><h2>理解采样与频谱</h2><p>fs 是每秒采样点数，Δt = 1/fs。Nyquist 频率为 fs/2；超过它的分量可能折回低频。方波、脉冲和三角波含高次谐波，即使基频低于 Nyquist，谐波仍可能混叠。</p><p>有限捕获通常不含整数周期，会出现谱泄漏。Hann 窗能减弱旁瓣，但会展宽谱峰；本工具按窗的 coherent gain 校正幅值，非整 bin 的谱峰仍可能低估。Δf = fs/N；增加零填充不能增加实际捕获时长所决定的分辨能力。</p><p>合成、CSV 导入、派生频谱来源分别记录。此版本不采集真实硬件，也没有将任意原理图转换为时域仿真的求解器。</p></section>
  </section>
}
