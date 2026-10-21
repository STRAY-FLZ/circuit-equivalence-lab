import type { AnalysisEngine, AnalysisInput, AnalysisResult, Diagnostic } from '../analysis'
import type { ScalarMeasurement } from '../engineering'
import { createInlineAsset } from '../project-format'
import { amplitudeSpectrum, SIGNAL_ENGINE, SignalError, validateAxis } from './numerics'
import type { AmplitudeSpectrum, SpectrumOptions } from './numerics'
import { readFloat64 } from './data'

export interface SignalAnalysisOutput { readonly spectrum: AmplitudeSpectrum; readonly channelId: string }
const diagnostic = (code: string, message: string): Diagnostic => ({ code, message, severity: 'error', entityIds: [] })
function resolve(input: AnalysisInput) {
  const config = input.configuration
  if (config.analysisType !== 'signal.fft' || config.scope.kind !== 'dataset' || config.scope.datasetIds.length !== 1) throw new SignalError('analysis-type', '此提供器需要一份波形的 signal.fft 配置。')
  const dataset = input.project.measurements.find(d => d.id === (config.scope.kind === 'dataset' ? config.scope.datasetIds[0] : ''))
  if (!dataset || dataset.kind !== 'waveform' || dataset.axis.kind !== 'uniform-time') throw new SignalError('uniform-time', 'FFT 只支持均匀时域波形；非均匀采样未被隐式处理。')
  validateAxis(dataset.axis)
  const channel = dataset.channels.find(c => c.id === config.options.channelId)
  if (!channel || (config.options.window !== 'rectangular' && config.options.window !== 'hann') || typeof config.options.removeMean !== 'boolean') throw new SignalError('analysis-options', 'FFT 配置需要有效通道、窗函数和去均值选项。')
  return { dataset, channel, axis: dataset.axis, options: { window: config.options.window, removeMean: config.options.removeMean } as SpectrumOptions }
}
/** Explicit asynchronous provider. Bounded work; no dynamic plugin framework. */
export const signalFftEngine: AnalysisEngine<SignalAnalysisOutput> = {
  descriptor: { resource: SIGNAL_ENGINE, family: 'signal', analysisTypes: ['signal.fft'], execution: 'main-thread', modelVersions: [] },
  inspect(input) {
    try { resolve(input); return { kind: 'supported', diagnostics: [] } } catch (e) { return { kind: 'unsupported', diagnostics: [diagnostic('unsupported', e instanceof Error ? e.message : '不支持的 FFT 输入。')] } }
  },
  async run(input, host): Promise<AnalysisResult<SignalAnalysisOutput>> {
    const provenance = { engine: SIGNAL_ENGINE, projectId: input.project.id, inputRevision: input.project.revision, inputDigest: input.inputDigest, analysisId: input.configuration.id, options: input.configuration.options }
    if (host.signal.aborted) return { provenance, outcome: { kind: 'cancelled' } }
    const capability = this.inspect(input)
    if (capability.kind === 'unsupported') return { provenance, outcome: capability }
    try {
      const { channel, axis, options } = resolve(input)
      host.onProgress(0, 1)
      const bytes = await host.readAsset(channel.samples.assetId)
      if (host.signal.aborted) return { provenance, outcome: { kind: 'cancelled' } }
      const manifest = input.project.assets.find(a => a.id === channel.samples.assetId), verified = await createInlineAsset(bytes, 'application/octet-stream', channel.samples.assetId)
      if (!manifest || manifest.byteLength !== bytes.byteLength || manifest.sha256 !== verified.entry.sha256) throw new SignalError('asset-integrity', '分析输入资产长度或 SHA-256 校验失败。')
      const spectrum = amplitudeSpectrum(readFloat64(bytes, channel.samples.count), axis, options)
      if (host.signal.aborted) return { provenance, outcome: { kind: 'cancelled' } }
      host.onProgress(1, 1)
      return { provenance, outcome: { kind: 'success', value: { spectrum, channelId: channel.id } } }
    } catch (e) { return { provenance, outcome: { kind: 'failure', category: e instanceof SignalError ? e.code === 'numerical-range' ? 'numerical' : e.code === 'sample-limit' ? 'resource' : 'invalid-input' : 'io', diagnostics: [diagnostic(e instanceof SignalError ? e.code : 'signal-error', e instanceof Error ? e.message : '信号分析失败。')] } } }
  },
}
export interface MeasurementReport { readonly datasetId: string; readonly title: string; readonly scope: 'full-capture'; readonly measurements: readonly ScalarMeasurement[] }
