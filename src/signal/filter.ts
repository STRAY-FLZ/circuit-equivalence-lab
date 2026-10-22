import { createId, reviseProject } from '../engineering'
import type { MeasurementDataset } from '../engineering'
import { createInlineAsset, createProjectDocument } from '../project-format'
import type { ProjectDocumentV1 } from '../project-format'
import { digestJson, float64Bytes, loadWaveform } from './data'
import { SignalError, validateSamples } from './numerics'

export const RC_FILTER = { id: 'org.stray.signal.rc-zoh', version: '1' } as const
export type RcFilterOptions = { readonly resistanceOhms: number; readonly capacitanceFarads: number; readonly initialOutput: number; readonly mode: 'lowpass' | 'highpass' }
/** x[n] holds on [t[n],t[n+1]); y[0]=initialOutput; y[n]=a*y[n-1]+b*x[n-1]. */
export function filterRcSamples(values: ArrayLike<number>, intervalSeconds: number, options: RcFilterOptions): { readonly values: Float64Array; readonly a: number; readonly b: number } {
  validateSamples(values)
  const { resistanceOhms: r, capacitanceFarads: cap, initialOutput, mode } = options, tau = r * cap
  if (![r, cap, intervalSeconds, tau].every(x => Number.isFinite(x) && x > 0) || !Number.isFinite(initialOutput) || !['lowpass', 'highpass'].includes(mode)) throw new SignalError('rc-options', 'R、C、采样间隔及 RC 须为有限正数，初始电容电压须有限。')
  const a = Math.exp(-intervalSeconds / tau), b = -Math.expm1(-intervalSeconds / tau)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) throw new SignalError('rc-range', '采样间隔与时间常数之比无法可靠表示。')
  const output = new Float64Array(values.length)
  let state = initialOutput
  for (let i = 0; i < values.length; i++) { if (i > 0) state = a * state + b * values[i - 1]!; output[i] = mode === 'lowpass' ? state : values[i]! - state }
  validateSamples(output)
  return { values: output, a, b }
}
export async function appendRcFilter(document: ProjectDocumentV1, datasetId: string, channelId: string, options: RcFilterOptions): Promise<{ readonly document: ProjectDocumentV1; readonly datasetId: string; readonly channelId: string }> {
  const waveform = loadWaveform(document, datasetId), selected = waveform.channels.find(c => c.channel.id === channelId)
  if (!selected) throw new SignalError('rc-channel', '所选输入通道不在当前捕获中。')
  const filtered = filterRcSamples(selected.values, waveform.axis.intervalSeconds, options), output = await createInlineAsset(float64Bytes(filtered.values), 'application/octet-stream')
  const inputDigest = await digestJson({ inputRevision: document.project.revision, datasetId, channelId, inputAsset: document.project.assets.find(a => a.id === selected.channel.samples.assetId)!, axis: waveform.axis, options })
  const outputId = createId(), methodOptions = { ...options, intervalSeconds: waveform.axis.intervalSeconds, inputChannelId: channelId, inputRevision: document.project.revision, inputDigest, indexing: 'x[n] held on [t[n],t[n+1]); y[0]=initialOutput; y[n]=a*y[n-1]+(1-a)*x[n-1]', a: filtered.a, b: filtered.b }
  const dataset: MeasurementDataset = {
    id: createId(), title: `RC ${options.mode === 'lowpass' ? '低通' : '高通'} · ${waveform.dataset.title}`, kind: 'waveform', axis: { ...waveform.axis },
    source: { kind: 'derived', inputDatasetIds: [datasetId], operation: RC_FILTER, options: methodOptions },
    channels: [{ id: createId(), name: `原始输入 · ${selected.channel.name}`, samples: { ...selected.channel.samples } }, { id: outputId, name: `RC ${options.mode === 'lowpass' ? '低通' : '高通'}输出`, samples: { assetId: output.entry.id, encoding: 'float64-le', count: filtered.values.length, unit: selected.channel.samples.unit } }],
    metadata: { filterMethod: RC_FILTER, ...methodOptions, sampleRateHz: 1 / waveform.axis.intervalSeconds, physicalInterpretation: 'sampled ideal RC with zero-order-held input; not hardware acquisition or arbitrary RLC transient simulation' },
  }
  const project = reviseProject(document.project, document.project.revision, { measurements: [...document.project.measurements, dataset], assets: [...document.project.assets, output.entry], extensions: { ...document.project.extensions, 'org.stray.signal': { activeDatasetId: dataset.id, filter: { ...options } } } })
  return { document: await createProjectDocument(project, document.writer, [...document.inlineAssets, output.asset]), datasetId: dataset.id, channelId: outputId }
}
