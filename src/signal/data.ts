import { assertJsonData, createEmptyProject, createId, reviseProject } from '../engineering'
import type { AnalysisConfiguration, EngineeringProject, JsonObject, JsonValue, MeasurementDataset, ScalarMeasurement, WaveformChannel } from '../engineering'
import type { ResultProvenance } from '../analysis'
import { createInlineAsset, createProjectDocument, decodeInlineAsset } from '../project-format'
import type { InlineAsset, ProjectDocumentV1 } from '../project-format'
import { estimateFrequency, generateSamples, MAX_CHANNELS, sampleStatistics, SIGNAL_ENGINE, SignalError, validateAxis, validateSamples } from './numerics'
import type { AmplitudeSpectrum, GeneratorOptions, UniformAxis } from './numerics'

export const GENERATOR_ENGINE = Object.freeze({ id: 'org.stray.signal.generator', version: '1' })
export interface LoadedWaveform {
  readonly dataset: MeasurementDataset; readonly axis: UniformAxis
  readonly channels: readonly { readonly channel: WaveformChannel; readonly values: Float64Array }[]
}
export async function digestJson(value: unknown): Promise<string> {
  assertJsonData(value)
  const canonical = (input: JsonValue): JsonValue => {
    if (Array.isArray(input)) return input.map((item: JsonValue) => canonical(item))
    if (input !== null && typeof input === 'object') { const record = input as JsonObject; return Object.fromEntries(Object.keys(record).sort().map(key => [key, canonical(record[key]!)])) }
    return input
  }
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(value as JsonValue))), hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('')
}
export function float64Bytes(values: ArrayLike<number>): Uint8Array {
  const bytes = new Uint8Array(values.length * 8), view = new DataView(bytes.buffer)
  for (let i = 0; i < values.length; i++) view.setFloat64(i * 8, values[i]!, true)
  return bytes
}
export function readFloat64(bytes: Uint8Array, count: number): Float64Array {
  if (bytes.byteLength !== count * 8) throw new SignalError('asset-length', 'float64-le 资产字节数与点数不一致。')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), values = new Float64Array(count)
  for (let i = 0; i < count; i++) values[i] = view.getFloat64(i * 8, true)
  validateSamples(values); return values
}
export async function emptySignalDocument(writer: ProjectDocumentV1['writer']): Promise<ProjectDocumentV1> {
  return createProjectDocument(createEmptyProject('信号测量工程'), writer)
}
export function readSeries(document: ProjectDocumentV1, channel: WaveformChannel): Float64Array {
  const asset = document.inlineAssets.find(a => a.assetId === channel.samples.assetId)
  if (!asset) throw new SignalError('missing-asset', '通道资产缺失。')
  return readFloat64(decodeInlineAsset(asset), channel.samples.count)
}
export function loadWaveform(document: ProjectDocumentV1, datasetId: string): LoadedWaveform {
  const dataset = document.project.measurements.find(d => d.id === datasetId)
  if (!dataset || dataset.kind !== 'waveform') throw new SignalError('waveform', '请选择时域波形数据。')
  if (dataset.axis.kind !== 'uniform-time') throw new SignalError('uniform-time', '此工作台只分析均匀时间轴；未对非均匀采样静默重采样。')
  validateAxis(dataset.axis)
  if (dataset.channels.length > MAX_CHANNELS) throw new SignalError('channel-limit', `当前工作台最多支持 ${MAX_CHANNELS} 个同步通道，未截断数据。`)
  return { dataset, axis: dataset.axis, channels: dataset.channels.map(channel => ({ channel, values: readSeries(document, channel) })) }
}
export function measurementsFor(waveform: LoadedWaveform, channelId: string): readonly ScalarMeasurement[] {
  const selected = waveform.channels.find(c => c.channel.id === channelId)
  if (!selected) throw new SignalError('channel', '通道不存在。')
  const stats = sampleStatistics(selected.values), frequency = estimateFrequency(selected.values, waveform.axis)
  const common = { datasetId: waveform.dataset.id, channelId, method: { id: 'org.stray.signal.sample-statistics', version: '1' }, options: { scope: 'full-capture', count: selected.values.length, intervalSeconds: waveform.axis.intervalSeconds } }
  const measurements: ScalarMeasurement[] = (['minimum', 'maximum', 'peakToPeak', 'mean', 'totalRms', 'acRms'] as const).map(name => ({ kind: 'available', name, value: { value: stats[name], unit: selected.channel.samples.unit }, ...common }))
  measurements.push(frequency.kind === 'available' ? { kind: 'available', name: 'frequency', value: { value: frequency.hertz, unit: 'Hz' }, ...common, method: { id: 'org.stray.signal.rising-mean-crossings', version: '1' }, options: { ...common.options, periods: frequency.periods, relativeSpread: frequency.relativeSpread, maxRelativeSpread: 0.02, minimumSamplesPerPeriod: 8 } } : { kind: 'unavailable', name: 'frequency', reason: frequency.reason, datasetId: waveform.dataset.id, channelId })
  return measurements
}
export interface SampleChannelInput { readonly name: string; readonly unit: string; readonly values: Float64Array }
export async function appendWaveform(document: ProjectDocumentV1, input: {
  readonly title: string; readonly axis: UniformAxis; readonly channels: readonly SampleChannelInput[]
  readonly source: MeasurementDataset['source']; readonly metadata: JsonObject
  readonly extraAssets?: readonly Awaited<ReturnType<typeof createInlineAsset>>[]
  readonly project?: EngineeringProject
}): Promise<{ readonly document: ProjectDocumentV1; readonly datasetId: string }> {
  validateAxis(input.axis)
  if (input.channels.length < 1 || input.channels.length > MAX_CHANNELS) throw new SignalError('channel-limit', `请选择 1–${MAX_CHANNELS} 个通道。`)
  const staged = [...input.extraAssets ?? []], channels: WaveformChannel[] = []
  for (const channel of input.channels) {
    validateSamples(channel.values, input.axis.count)
    const asset = await createInlineAsset(float64Bytes(channel.values), 'application/octet-stream'); staged.push(asset)
    channels.push({ id: createId(), name: channel.name, samples: { assetId: asset.entry.id, encoding: 'float64-le', count: channel.values.length, unit: channel.unit } })
  }
  const dataset: MeasurementDataset = { id: createId(), title: input.title, kind: 'waveform', source: input.source, axis: input.axis, channels, metadata: input.metadata }
  const p = input.project ?? document.project
  const project = reviseProject(p, p.revision, { measurements: [...p.measurements, dataset], assets: [...p.assets, ...staged.map(a => a.entry)], extensions: { ...p.extensions, 'org.stray.signal': { activeDatasetId: dataset.id } } })
  const next = await createProjectDocument(project, document.writer, [...document.inlineAssets, ...staged.map(a => a.asset)])
  return { document: next, datasetId: dataset.id }
}
export async function appendGenerated(document: ProjectDocumentV1, options: GeneratorOptions): Promise<{ readonly document: ProjectDocumentV1; readonly datasetId: string }> {
  const generated = generateSamples(options), analysisId = createId(), inputDigest = await digestJson(options)
  const configuration = { id: analysisId, analysisType: 'signal.generate', preferredEngine: GENERATOR_ENGINE, scope: { kind: 'dataset' as const, datasetIds: [] }, options: { ...options } }
  const project = reviseProject(document.project, document.project.revision, { analyses: [...document.project.analyses, configuration] })
  return appendWaveform(document, { project, title: `${options.kind} · ${options.frequencyHz} Hz`, axis: generated.axis, channels: [{ name: 'CH1', unit: 'V', values: generated.values }], source: { kind: 'simulated', engine: GENERATOR_ENGINE, projectRevision: project.revision, analysisId, inputDigest }, metadata: { generator: { ...options }, diagnostics: [...generated.diagnostics], amplitudeConvention: options.kind === 'pulse' ? '0..amplitude plus DC offset' : 'plus/minus amplitude around DC offset', sampleRateHz: 1 / generated.axis.intervalSeconds, captureSeconds: generated.axis.count * generated.axis.intervalSeconds } })
}
export async function appendSpectrum(document: ProjectDocumentV1, waveform: LoadedWaveform, channelId: string, spectrum: AmplitudeSpectrum, execution: { readonly configuration: AnalysisConfiguration; readonly provenance: ResultProvenance }): Promise<ProjectDocumentV1> {
  const channel = waveform.channels.find(c => c.channel.id === channelId)!.channel
  const axis = await createInlineAsset(float64Bytes(spectrum.frequencies), 'application/octet-stream'), amplitude = await createInlineAsset(float64Bytes(spectrum.amplitudes), 'application/octet-stream')
  const options = execution.configuration.options
  const metadata: JsonObject = { spectrumVersion: 1, normalization: spectrum.normalization, sampleCount: spectrum.sampleCount, sampleRateHz: spectrum.sampleRateHz, binSpacingHz: spectrum.binSpacingHz, captureSeconds: spectrum.captureSeconds, coherentGain: spectrum.coherentGain, window: spectrum.options.window, removeMean: spectrum.options.removeMean, inputChannelId: channelId, role: 'amplitude', zeroPadding: false }
  const dataset: MeasurementDataset = { id: createId(), title: `FFT · ${channel.name}`, kind: 'spectrum', source: { kind: 'derived', inputDatasetIds: [waveform.dataset.id], operation: SIGNAL_ENGINE, options }, axis: { kind: 'frequency', frequencies: { assetId: axis.entry.id, encoding: 'float64-le', count: spectrum.frequencies.length, unit: 'Hz' } }, channels: [{ id: createId(), name: `${channel.name} 单边峰值幅度`, samples: { assetId: amplitude.entry.id, encoding: 'float64-le', count: spectrum.amplitudes.length, unit: channel.samples.unit } }], metadata }
  const analysis = execution.configuration, { inputRevision, inputDigest } = execution.provenance
  if (execution.provenance.projectId !== document.project.id || execution.provenance.analysisId !== analysis.id) throw new SignalError('analysis-source', '分析来源与当前工程或配置不一致，未保存派生结果。')
  const artifact = await createInlineAsset(new TextEncoder().encode(JSON.stringify({ provenance: execution.provenance, outcome: { kind: 'success', datasetId: dataset.id, measurements: measurementsFor(waveform, channelId), metadata }, diagnostics: [] })), 'application/json')
  const staged = [axis, amplitude, artifact]
  const project = reviseProject(document.project, inputRevision, { measurements: [...document.project.measurements, dataset], analyses: [...document.project.analyses, analysis], assets: [...document.project.assets, ...staged.map(a => a.entry)], results: [...document.project.results, { id: createId(), analysisId: analysis.id, engine: SIGNAL_ENGINE, inputRevision, inputDigest, outcome: 'success', artifactAssetIds: [artifact.entry.id] }], extensions: { ...document.project.extensions, 'org.stray.signal': { activeDatasetId: waveform.dataset.id, fftOptions: { ...spectrum.options }, lastSpectrumId: dataset.id } } })
  return createProjectDocument(project, document.writer, [...document.inlineAssets, ...staged.map(a => a.asset)])
}
export function assetBytes(document: ProjectDocumentV1, id: string): Uint8Array {
  const asset: InlineAsset | undefined = document.inlineAssets.find(a => a.assetId === id)
  if (!asset) throw new SignalError('missing-asset', '工程缺少所引用的资产。')
  return decodeInlineAsset(asset)
}
