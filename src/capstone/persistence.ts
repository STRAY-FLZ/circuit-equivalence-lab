import { createId, createEngineeringProject, reviseProject } from '../engineering'
import type { JsonObject, MeasurementDataset } from '../engineering'
import { analysisDigest } from '../analysis/snapshot'
import { createInlineAsset, createProjectDocument, decodeInlineAsset } from '../project-format'
import type { ProjectDocumentV1 } from '../project-format'
import type { CapstoneStudy, StudyScenario } from './types'
import { sourceDigest, validateStudyParameter } from './study'
import { capstoneExperiments } from './experiments'
import { float64Bytes } from '../signal'

export const CAPSTONE_EXTENSION = 'org.stray.capstone'
export async function storeStudy(document: ProjectDocumentV1, study: CapstoneStudy, conclusion: string): Promise<ProjectDocumentV1> {
  if (document.project.id !== study.source.id || document.project.revision !== study.source.revision || await sourceDigest(document.project) !== study.sourceDigest) throw Error('源工程已改变，请重新运行后保存。')
  const bytes = new TextEncoder().encode(JSON.stringify(study))
  if (bytes.byteLength > 8 * 1024 * 1024) throw Error('实验记录超过 8 MiB 单资产预算，请减少场景。')
  const artifact = await createInlineAsset(bytes, 'application/json'), configs = study.scenarios.flatMap(s => s.captures.map(c => c.input.configuration))
  const staged = [artifact], measurements: MeasurementDataset[] = []
  for (const scenario of study.scenarios) for (const curve of scenario.curves.filter(c => c.xUnit === 's' && (c.yUnit === 'V' || c.yUnit === 'A') && c.y.every(v => v !== null))) {
    const captured = scenario.captures.find(c => c.input.configuration.analysisType === 'transient.linear')
    if (!captured || curve.x.length < 2) continue
    const asset = await createInlineAsset(float64Bytes(curve.y as readonly number[]), 'application/octet-stream'); staged.push(asset)
    measurements.push({ id: createId(), title: `${scenario.requestedValue} ${study.parameter.unit} · ${curve.label}`, kind: 'waveform', axis: { kind: 'uniform-time', startSeconds: curve.x[0]!, intervalSeconds: curve.x[1]! - curve.x[0]!, count: curve.x.length }, channels: [{ id: createId(), name: curve.label, samples: { assetId: asset.entry.id, encoding: 'float64-le', count: curve.x.length, unit: curve.yUnit } }], source: { kind: 'simulated', engine: captured.input.configuration.preferredEngine!, projectRevision: captured.input.project.revision, analysisId: captured.input.configuration.id, inputDigest: captured.input.inputDigest }, metadata: { studyId: study.id, scenarioId: scenario.id, sourceProjectId: study.source.id } })
  }
  const results = study.scenarios.flatMap(s => s.captures.map(c => ({ id: createId(), engine: c.input.configuration.preferredEngine!, analysisId: c.input.configuration.id, inputRevision: c.input.project.revision, inputDigest: c.input.inputDigest, outcome: (c.result.outcome as JsonObject).kind as 'success' | 'failure' | 'unsupported' | 'cancelled', artifactAssetIds: [artifact.entry.id] })))
  const project = reviseProject(document.project, document.project.revision, { assets: [...document.project.assets, ...staged.map(a => a.entry)], measurements: [...document.project.measurements, ...measurements], analyses: [...document.project.analyses, ...configs], results: [...document.project.results, ...results], experiments: [...document.project.experiments, { id: study.id, title: study.title, analysisIds: configs.map(c => c.id), datasetIds: measurements.map(d => d.id), notes: conclusion }], extensions: { ...document.project.extensions, [CAPSTONE_EXTENSION]: { version: 1, studyId: study.id, assetId: artifact.entry.id, kind: study.kind, sourceDigest: study.sourceDigest, sourceRevision: study.source.revision, conclusion, origin: 'simulation' } } })
  return createProjectDocument(project, document.writer, [...document.inlineAssets, ...staged.map(a => a.asset)])
}
export async function readStudy(document: ProjectDocumentV1): Promise<CapstoneStudy | null> {
  const raw = document.project.extensions[CAPSTONE_EXTENSION]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as JsonObject, asset = document.inlineAssets.find(a => a.assetId === record.assetId)
  if (record.version !== 1 || !asset) throw Error('综合实验记录或资产引用无效。')
  const study = JSON.parse(new TextDecoder().decode(decodeInlineAsset(asset))) as CapstoneStudy
  if (study.version !== 1 || study.id !== record.studyId || !capstoneExperiments.some(e => e.kind === study.kind) || !Array.isArray(study.scenarios) || study.scenarios.length < 1 || study.scenarios.length > 5) throw Error('实验场景记录不完整。')
  createEngineeringProject(study.source); validateStudyParameter(study.source, study.parameter)
  if (await sourceDigest(study.source) !== study.sourceDigest || study.source.id !== document.project.id || record.sourceDigest !== study.sourceDigest) throw Error('保存的源工程摘要不一致。')
  const ids = new Set<string>()
  for (const scenario of study.scenarios as readonly StudyScenario[]) {
    if (ids.has(scenario.id) || !Number.isFinite(scenario.requestedValue) || !['success', 'partial', 'failure', 'unsupported'].includes(scenario.status) || !Array.isArray(scenario.messages)) throw Error('场景身份或状态无效。')
    ids.add(scenario.id); createEngineeringProject(scenario.project)
    if (scenario.project.id !== study.source.id || scenario.captures.length > 2 || scenario.curves.length > 8 || scenario.metrics.length > 30) throw Error('场景数据超过已声明范围。')
    for (const curve of scenario.curves) if (!['s', 'Hz'].includes(curve.xUnit) || !['V', 'A', 'dB', '°'].includes(curve.yUnit) || curve.x.length < 1 || curve.x.length > 801 || curve.x.length !== curve.y.length || !curve.x.every((x, i) => Number.isFinite(x) && (curve.xUnit !== 'Hz' || x > 0) && (i === 0 || x > curve.x[i - 1]!)) || !curve.y.every(v => v === null || Number.isFinite(v))) throw Error('曲线样本或单位无效。')
    for (const metric of scenario.metrics) if (metric.value !== null && !Number.isFinite(metric.value)) throw Error('比较数值无效。')
    for (const c of scenario.captures) {
      createEngineeringProject(c.input.project)
      const p = c.result.provenance as JsonObject
      if (c.input.project.revision !== scenario.project.revision || await analysisDigest({ project: c.input.project, configuration: c.input.configuration }) !== c.input.inputDigest || p.inputDigest !== c.input.inputDigest || p.inputRevision !== scenario.project.revision || p.projectId !== study.source.id || p.analysisId !== c.input.configuration.id) throw Error('原始分析来源或摘要不一致。')
    }
  }
  return study
}
