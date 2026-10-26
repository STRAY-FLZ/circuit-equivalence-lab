import { createId, reviseProject } from '../engineering'
import type { EngineeringProject, JsonObject, JsonValue, MeasurementDataset } from '../engineering'
import type { AnalysisCapture, ResultProvenance } from '../analysis'
import { analysisDigest } from '../analysis/snapshot'
import { createInlineAsset, createProjectDocument, decodeInlineAsset } from '../project-format'
import type { ProjectDocumentV1 } from '../project-format'
import { float64Bytes, readSeries } from '../signal'
import { parseTransientSettings, settingsJson } from './configuration'
import { TRANSIENT_ENGINE, TRANSIENT_EXTENSION, TransientError } from './types'
import type { TransientCircuit, TransientResult, TransientSeries, TransientSettings } from './types'

export interface StoredTransient {
  readonly kind: 'org.stray.transient.record'; readonly version: 1; readonly resultId: string; readonly sheetId: string
  readonly provenance: ResultProvenance; readonly basisDigest: string; readonly createdAtUtc: string
  readonly circuit: TransientCircuit
  readonly settings: TransientSettings; readonly axis: TransientResult['axis']; readonly checks: TransientResult['checks']; readonly diagnostics: TransientResult['diagnostics']
  readonly datasetIds: readonly string[]
  readonly series: readonly (Omit<TransientSeries, 'values'> & { readonly datasetId: string; readonly channelId: string })[]
}
const isObject = (value: JsonValue | undefined): value is JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value)
const isArray = (value: unknown): boolean => Array.isArray(value)
export function transientBasis(project: EngineeringProject): Promise<string> {
  const sorted = <T extends { readonly id: string }>(a: readonly T[]) => [...a].sort((x, y) => x.id < y.id ? -1 : x.id > y.id ? 1 : 0)
  return analysisDigest({ definitions: sorted(project.definitions), sheets: sorted(project.sheets).map(s => ({ ...s, components: sorted(s.components), anchors: sorted(s.anchors), connections: sorted(s.connections), labels: sorted(s.labels), references: sorted(s.references), ports: sorted(s.ports), geometry: { ...s.geometry, placements: [...s.geometry.placements].sort((a, b) => a.componentId.localeCompare(b.componentId)) } })) })
}
export async function appendTransient(document: ProjectDocumentV1, capture: AnalysisCapture<TransientResult>, sheetId: string): Promise<{ readonly document: ProjectDocumentV1; readonly record: StoredTransient }> {
  const { project, configuration, result } = capture
  if (project.id !== document.project.id || project.revision !== document.project.revision || result.provenance.inputRevision !== project.revision || result.provenance.projectId !== project.id || result.provenance.analysisId !== configuration.id || result.provenance.engine.id !== TRANSIENT_ENGINE.id || result.provenance.engine.version !== '1' || configuration.analysisType !== 'transient.linear' || configuration.scope.kind !== 'circuit' || configuration.scope.sheetIds.length !== 1 || configuration.scope.sheetIds[0] !== sheetId || await analysisDigest({ project: document.project, configuration }) !== result.provenance.inputDigest || result.outcome.kind !== 'success') throw new TransientError('TRAN_STALE', '暂态结果与当前工程/配置不一致，请重新运行后保存。')
  const value = result.outcome.value, resultId = createId(), basisDigest = await transientBasis(project), settings = parseTransientSettings(configuration.options)
  const staged: Awaited<ReturnType<typeof createInlineAsset>>[] = [], datasets: MeasurementDataset[] = [], mapped: StoredTransient['series'][number][] = []
  // Groups obey the existing four-channel Signal Laboratory contract; every series is retained.
  for (let start = 0; start < value.series.length; start += 4) {
    const datasetId = createId(), channels: MeasurementDataset['channels'][number][] = []
    for (const series of value.series.slice(start, start + 4)) {
      const asset = await createInlineAsset(float64Bytes(series.values), 'application/octet-stream'), channelId = createId(); staged.push(asset)
      channels.push({ id: channelId, name: series.name, samples: { assetId: asset.entry.id, encoding: 'float64-le', count: value.axis.count, unit: series.unit }, ...(series.quantity === 'node-voltage' ? { probeAnchorId: series.entityId } : {}) })
      mapped.push({ entityId: series.entityId, name: series.name, quantity: series.quantity, unit: series.unit, datasetId, channelId })
    }
    datasets.push({ id: datasetId, title: `暂态模拟 · ${start / 4 + 1}`, kind: 'waveform', axis: value.axis, channels, source: { kind: 'simulated', engine: TRANSIENT_ENGINE, projectRevision: result.provenance.inputRevision, analysisId: configuration.id, inputDigest: result.provenance.inputDigest }, metadata: { version: 1, sourceProjectId: project.id, sheetId, basisDigest, circuit: JSON.parse(JSON.stringify(value.circuit)) as JsonObject, method: settings.method, relativeTolerance: settings.relativeTolerance, absoluteVoltageTolerance: 1e-8, absoluteCurrentTolerance: 1e-10, initialConvention: 'specified state at 0-; finite consistent algebraic solve at 0+', eventConvention: 'integrate left forcing to event, preserve states, solve right algebraic values', settings: settingsJson(settings), numerical: JSON.parse(JSON.stringify(value.checks)) as JsonObject } })
  }
  const record: StoredTransient = { kind: 'org.stray.transient.record', version: 1, resultId, sheetId, provenance: result.provenance, basisDigest, createdAtUtc: new Date().toISOString(), circuit: value.circuit, settings, axis: value.axis, checks: value.checks, diagnostics: value.diagnostics, datasetIds: datasets.map(d => d.id), series: mapped }
  const artifact = await createInlineAsset(new TextEncoder().encode(JSON.stringify(record)), 'application/json'); staged.push(artifact)
  const old = project.extensions[TRANSIENT_EXTENSION], container = isObject(old) ? old : {}
  const previousLast = container.lastResultIds, lastResultIds = isObject(previousLast) ? previousLast : {}
  const next = reviseProject(project, project.revision, { measurements: [...project.measurements, ...datasets], analyses: [...project.analyses, configuration], results: [...project.results, { id: resultId, engine: TRANSIENT_ENGINE, analysisId: configuration.id, inputRevision: result.provenance.inputRevision, inputDigest: result.provenance.inputDigest, outcome: 'success', artifactAssetIds: [artifact.entry.id] }], assets: [...project.assets, ...staged.map(a => a.entry)], extensions: { ...project.extensions, [TRANSIENT_EXTENSION]: { ...container, [sheetId]: settingsJson(settings), lastResultIds: { ...lastResultIds, [sheetId]: resultId } } } })
  return { document: await createProjectDocument(next, document.writer, [...document.inlineAssets, ...staged.map(a => a.asset)]), record }
}
/** File assets have already passed schema/SHA validation; validate this provider's manifest as well. */
export function readTransientRecord(document: ProjectDocumentV1, sheetId: string): StoredTransient | null {
  const extension = document.project.extensions[TRANSIENT_EXTENSION]
  const last = isObject(extension) ? extension.lastResultIds : null
  const targetId = isObject(last) ? last[sheetId] : null
  if (!targetId) return null
  for (const result of [...document.project.results].reverse()) {
    if (result.id !== targetId || result.engine.id !== TRANSIENT_ENGINE.id || result.engine.version !== '1' || result.outcome !== 'success') continue
    const asset = document.inlineAssets.find(a => a.assetId === result.artifactAssetIds[0]); if (!asset) continue
    const r = JSON.parse(new TextDecoder().decode(decodeInlineAsset(asset))) as StoredTransient
    if (r.kind !== 'org.stray.transient.record' || r.version !== 1 || r.resultId !== result.id || r.sheetId !== sheetId) continue
    parseTransientSettings(r.settings)
    if (r.provenance.projectId !== document.project.id || !/^[a-f0-9]{64}$/.test(r.basisDigest) || !r.circuit || !isArray(r.circuit.elements) || !isArray(r.circuit.nodes) || !r.circuit.elements.every(e => Number.isFinite(e.value) && ['resistor', 'capacitor', 'inductor', 'voltage-source', 'current-source'].includes(e.kind)) || r.axis.startSeconds !== 0) throw new TransientError('TRAN_RECORD', '原始暂态电路参数/来源快照缺失。')
    if (r.provenance.inputDigest !== result.inputDigest || r.provenance.inputRevision !== result.inputRevision || r.provenance.analysisId !== result.analysisId || !isArray(r.series) || r.series.length === 0 || r.axis.kind !== 'uniform-time' || r.axis.count !== Math.round(r.settings.durationSeconds / r.settings.intervalSeconds) + 1 || r.axis.intervalSeconds !== r.settings.intervalSeconds) throw new TransientError('TRAN_RECORD', '暂态记录身份/时间轴不完整。')
    for (const s of r.series) { const d = document.project.measurements.find(d => d.id === s.datasetId), ch = d?.channels.find(c => c.id === s.channelId); if (!d || !ch || d.source.kind !== 'simulated' || d.source.inputDigest !== result.inputDigest || ch.samples.count !== r.axis.count || ch.samples.unit !== s.unit) throw new TransientError('TRAN_RECORD', '暂态记录引用的模拟数据/单位缺失。') }
    return r
  }
  throw new TransientError('TRAN_RECORD', '当前暂态记录 ID 无法解析，原始文件与资产保持不变。')
}
export function loadTransientSeries(document: ProjectDocumentV1, record: StoredTransient): readonly TransientSeries[] {
  return record.series.map(s => ({ entityId: s.entityId, name: s.name, quantity: s.quantity, unit: s.unit, values: Array.from(readSeries(document, document.project.measurements.find(d => d.id === s.datasetId)!.channels.find(c => c.id === s.channelId)!)) }))
}
/** A selected oscilloscope view references the existing bytes, preserving original dataset/channel identities. */
export async function selectTransientWaveforms(document: ProjectDocumentV1, record: StoredTransient, indices: readonly number[]): Promise<{ readonly document: ProjectDocumentV1; readonly datasetId: string }> {
  if (indices.length < 1 || indices.length > 4 || new Set(indices).size !== indices.length) throw new TransientError('TRAN_SELECTION', '请选择 1–4 条同步波形。')
  const selected = indices.map(i => record.series[i]); if (selected.some(s => !s)) throw new TransientError('TRAN_SELECTION', '所选波形不存在。')
  const dataset: MeasurementDataset = { id: createId(), title: '暂态模拟 · 所选波形', kind: 'waveform', axis: record.axis, source: { kind: 'derived', inputDatasetIds: [...new Set(selected.map(s => s!.datasetId))], operation: { id: 'org.stray.transient.channel-selection', version: '1' }, options: { resultId: record.resultId, inputChannelIds: selected.map(s => s!.channelId) } }, metadata: { simulated: true, inputDigest: record.provenance.inputDigest, inputRevision: record.provenance.inputRevision, basisDigest: record.basisDigest, solver: TRANSIENT_ENGINE, settings: settingsJson(record.settings) }, channels: selected.map(s => { const d = document.project.measurements.find(d => d.id === s!.datasetId), ch = d?.channels.find(c => c.id === s!.channelId); if (!ch) throw new TransientError('TRAN_SELECTION', '原始通道缺失。'); return { ...ch, id: createId() } }) }
  const project = reviseProject(document.project, document.project.revision, { measurements: [...document.project.measurements, dataset], extensions: { ...document.project.extensions, 'org.stray.signal': { activeDatasetId: dataset.id } } })
  return { document: await createProjectDocument(project, document.writer, document.inlineAssets), datasetId: dataset.id }
}
