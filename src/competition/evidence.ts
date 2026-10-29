import { createId, reviseProject } from '../engineering'
import type { MeasurementDataset, Quantity } from '../engineering'
import { createInlineAsset, createProjectDocument } from '../project-format'
import type { ProjectDocumentV1 } from '../project-format'
import { analysisDigest } from '../analysis/snapshot'
import { loadWaveform, measurementsFor } from '../signal'
import { compareMetric } from './metrics'
import { circuitDigest, editWorkspace, now, workspaceExtension } from './project'
import { demand, readWorkspace, sameJson } from './validation'
import { WORKSPACE_EXTENSION } from './types'
import type { Datum, Evidence, ToolTransfer, WorkspaceState } from './types'

const union = <T extends { readonly id: string }>(first: readonly T[], second: readonly T[]): T[] => {
  const result = [...first]
  for (const value of second) { const old = result.find(v => v.id === value.id); if (old) demand(sameJson(old, value), '同一稳定ID的不可变数据已改变；请保留原件并创建新对象。'); else result.push(value) }
  return result
}
export function evidenceStale(state: WorkspaceState, evidence: Evidence, pendingRevisions: Readonly<Record<string, string>> = {}): boolean { return (pendingRevisions[evidence.sourceProjectId] ?? state.sourceRevisions.find(r => r.projectId === evidence.sourceProjectId)?.revision) !== evidence.basisRevision }
export function evaluateAttempt(state: WorkspaceState, attemptId: string, pending: Readonly<Record<string, string>> = {}) {
  const attempt = state.attempts.find(a => a.id === attemptId), metric = state.metrics.find(m => m.id === attempt?.metricId), evidence = state.evidence.find(e => e.id === attempt?.evidenceId), datum = evidence?.data.find(d => d.key === attempt?.datumKey)
  if (!metric || !evidence) return { kind: 'indeterminate' as const, detail: '指标或证据缺失。' }
  return compareMetric(datum?.quantity, metric.unit, metric.criterion, !!evidence.conditions && !!evidence.method, evidenceStale(state, evidence, pending))
}
export async function addManualEvidence(document: ProjectDocumentV1, experimentId: string, quantity: Quantity, conditions: string, method: string, title: string): Promise<ProjectDocumentV1> {
  const state = readWorkspace(document.project), revision = state.sourceRevisions.find(r => r.projectId === document.project.id)?.revision ?? state.engineeringRevision
  const evidence: Evidence = { id: createId(), experimentId, title, origin: 'manual', acquisition: '用户手动填报；未连接或核验硬件', method, conditions, recordedAtUtc: now(), basisRevision: revision, sourceProjectId: document.project.id, sourceRevision: revision, inputDigest: '', analysisId: '', resultId: '', datasetIds: [], artifactAssetIds: [], data: [{ key: 'reported', title: '用户报告值', quantity }] }
  return editWorkspace(document, s => ({ ...s, evidence: [...s.evidence, evidence] }))
}
function sourceDescription(dataset: MeasurementDataset, all: readonly MeasurementDataset[], visited = new Set<string>()): string {
  demand(!visited.has(dataset.id), '派生数据来源存在循环。'); visited.add(dataset.id)
  if (dataset.source.kind === 'simulated') return `软件合成/模拟 ${dataset.source.engine.id} / ${dataset.source.engine.version}`
  if (dataset.source.kind === 'imported') return `CSV/文件导入 ${dataset.source.fileName}；仪器获取方式未经本应用核实`
  if (dataset.source.kind === 'hardware') return `工程文件声明硬件来源 ${dataset.source.instrument}；本应用未连接设备核验`
  return `派生 ${dataset.source.operation.id}，输入：${dataset.source.inputDatasetIds.map(id => { const input = all.find(d => d.id === id); demand(input, '输入数据集缺失。'); return sourceDescription(input, all, new Set(visited)) }).join('；')}`
}
export async function receiveToolTransfer(document: ProjectDocumentV1, experimentId: string, transfer: ToolTransfer): Promise<ProjectDocumentV1> {
  const state = readWorkspace(document.project), source = transfer.document, p = source.project
  demand(document.project.id === p.id, '来源工程ID不同；请从当前电赛工程打开工具。外部数据请先在该工程内导入CSV。')
  demand(document.project.experiments.some(e => e.id === experimentId), '实验已不存在。')
  let analyses = union(document.project.analyses, p.analyses), results = union(document.project.results, p.results), assets = union(document.project.assets, p.assets), inlineAssets = [...document.inlineAssets]
  for (const asset of source.inlineAssets) { const old = inlineAssets.find(a => a.assetId === asset.assetId); if (old) demand(sameJson(old, asset), '来源资产ID冲突。'); else inlineAssets.push(asset) }
  let evidence: Evidence | undefined
  if (transfer.kind !== 'snapshot') {
    const data: Datum[] = [], add = (key: string, title: string, value: number, unit: string) => { if (Number.isFinite(value)) data.push({ key, title, quantity: { value, unit } }) }
    let analysisId = '', resultId = '', datasetIds: string[] = [], origin: Evidence['origin'] = 'simulation'
    let inputDigest: string, method: string, acquisition: string, title: string, artifactValue: unknown
    if (transfer.kind === 'analysis') {
      const { configuration, result, project } = transfer.analysis
      demand(sameJson(project, p) && result.provenance.projectId === p.id && result.provenance.inputRevision === p.revision && result.provenance.analysisId === configuration.id, '结果与来源工程/修订不一致；请重新计算后关联。')
      demand(await analysisDigest({ project: p, configuration }) === result.provenance.inputDigest, '结果输入摘要与电路/设置不符。')
      demand(result.outcome.kind === 'success', '只有真实成功结果可关联为数值证据；失败诊断请记录在实验笔记。')
      analysisId = configuration.id; resultId = createId(); inputDigest = result.provenance.inputDigest
      analyses = union(analyses, [configuration]); acquisition = '实际软件分析；不代表硬件测量'; method = `${result.provenance.engine.id} / ${result.provenance.engine.version}`; title = configuration.analysisType.includes('ac.') ? '交流分析结果' : '直流分析结果'; artifactValue = result
      const value = result.outcome.value
      if ('devices' in value) {
        title = '模拟电子工作点'; method += '；声明的入门模型；不支持非线性暂态或真实器件精度保证'
        for (const d of value.devices) {
          d.terminalVolts.forEach((volts, i) => add(`${d.componentId}:voltage:${i}`, `${d.reference}端子${i + 1}对参考电压（${d.region}）`, volts, 'V'))
          d.terminalAmps.forEach((amps, i) => add(`${d.componentId}:current:${i}`, `${d.reference}流入端子${i + 1}电流（${d.region}）`, amps, 'A'))
        }
      } else if ('operatingPoint' in value) {
        for (const b of value.operatingPoint.branches) { add(`${b.id}:voltage`, `${b.reference}电压 RMS`, b.voltage.magnitudeRms, 'V'); add(`${b.id}:current`, `${b.reference}电流 RMS`, b.current.magnitudeRms, 'A'); add(`${b.id}:power`, `${b.reference}有功功率`, b.power.realWatts, 'W') }
        const sweep = value.sweep
        if (sweep) { sweep.features.halfPowerCrossingsHz.forEach((f, i) => add(`sweep:crossing:${i}`, `扫描半功率交点估计 ${i + 1}`, f, 'Hz')); if (sweep.features.sampledPeak) add('sweep:peak', '实际采样峰频率（未精确定位）', sweep.features.sampledPeak.frequencyHz, 'Hz'); if (sweep.features.estimatedBandwidthHz !== null) add('sweep:bandwidth', '扫描带宽估计', sweep.features.estimatedBandwidthHz, 'Hz'); for (const [i, point] of sweep.points.entries()) if (point.kind === 'available') { add(`sweep:gain:${i}`, `${point.frequencyHz} Hz幅值比`, point.magnitude, '1'); if (point.gainDb !== null) add(`sweep:db:${i}`, `${point.frequencyHz} Hz增益`, point.gainDb, 'dB') } }
      } else { for (const b of value.branches) { add(`${b.id}:voltage`, `${b.reference}电压`, b.volts, 'V'); add(`${b.id}:current`, `${b.reference}电流`, b.amps, 'A'); add(`${b.id}:power`, `${b.reference}功率`, b.watts, 'W') } }
    } else {
      const waveform = loadWaveform(source, transfer.datasetId), channel = waveform.channels.find(c => c.channel.id === transfer.channelId); demand(channel, '当前数据通道缺失。')
      datasetIds = [waveform.dataset.id]; origin = 'derived'; acquisition = sourceDescription(waveform.dataset, p.measurements); method = 'org.stray.signal.measurements / 1；全采样统计与频率估计'; title = `采样测量 · ${channel.channel.name}`
      for (const m of measurementsFor(waveform, transfer.channelId)) if (m.kind === 'available') add(m.name, m.name, m.value.value, m.value.unit)
      add('sampleRate', '采样率（数据时间轴，不代表硬件采集能力）', 1 / waveform.axis.intervalSeconds, 'Hz')
      inputDigest = await analysisDigest({ dataset: waveform.dataset, channelId: transfer.channelId, assets: p.assets })
      const analysis = [...p.analyses].reverse().find(a => a.scope.kind === 'dataset' && a.scope.datasetIds.includes(transfer.datasetId) && a.options.channelId === transfer.channelId), result = p.results.find(r => r.analysisId === analysis?.id && r.outcome === 'success')
      if (analysis && result) { analysisId = analysis.id; resultId = result.id }
      artifactValue = { datasetId: transfer.datasetId, channelId: transfer.channelId, inputDigest, method, acquisition, data }
    }
    demand(data.length > 0, '没有可用的有限数值，不会生成空证据。')
    const artifact = await createInlineAsset(new TextEncoder().encode(JSON.stringify(artifactValue)), 'application/json'); assets = [...assets, artifact.entry]; inlineAssets = [...inlineAssets, artifact.asset]
    if (transfer.kind === 'analysis') results = [...results, { id: resultId, analysisId, engine: transfer.analysis.result.provenance.engine, inputRevision: p.revision, inputDigest, outcome: 'success', artifactAssetIds: [artifact.entry.id] }]
    evidence = { id: createId(), experimentId, title, origin, acquisition, method, conditions: transfer.kind === 'analysis' ? JSON.stringify(transfer.analysis.configuration.options) : `数据集 ${datasetIds[0]}，通道 ${transfer.channelId}；采样与原始来源见记录`, recordedAtUtc: now(), basisRevision: p.revision, sourceProjectId: p.id, sourceRevision: p.revision, inputDigest, analysisId, resultId, datasetIds, artifactAssetIds: [artifact.entry.id], data }
  }
  const nextState: WorkspaceState = { ...state, circuitDigest: await circuitDigest(p), engineeringRevision: p.revision, sourceRevisions: [...state.sourceRevisions.filter(r => r.projectId !== p.id), { projectId: p.id, revision: p.revision }], evidence: evidence ? [...state.evidence, evidence] : state.evidence }
  const project = reviseProject(document.project, document.project.revision, { definitions: p.definitions, symbols: p.symbols, sheets: p.sheets, analyses, results, measurements: union(document.project.measurements, p.measurements), assets, experiments: (transfer.kind === 'snapshot' ? union(document.project.experiments, p.experiments) : document.project.experiments).map(e => e.id === experimentId && evidence ? { ...e, analysisIds: [...new Set([...e.analysisIds, ...(evidence.analysisId ? [evidence.analysisId] : [])])], datasetIds: [...new Set([...e.datasetIds, ...evidence.datasetIds])] } : e), extensions: { ...document.project.extensions, ...p.extensions, [WORKSPACE_EXTENSION]: workspaceExtension(nextState) } })
  readWorkspace(project); return createProjectDocument(project, document.writer, inlineAssets)
}
