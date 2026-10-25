import { assertJsonData } from '../engineering'
import type { EngineeringProject, JsonObject, JsonValue } from '../engineering'
import { problemById } from './catalog'
import { units, validateCriterion } from './metrics'
import { WORKSPACE_EXTENSION } from './types'
import type { WorkspaceState } from './types'

const list = (v: unknown): v is readonly unknown[] => Array.isArray(v)
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function demand(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message) }
const strings = (list: unknown): list is readonly string[] => Array.isArray(list) && list.length <= 256 && list.every(v => typeof v === 'string' && v.length <= 20000)
const text = (v: unknown) => typeof v === 'string' && v.length <= 20000
const nonempty = (v: unknown) => text(v) && (v as string).trim().length > 0
const stamp = (v: unknown) => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v))
export function sameJson(a: unknown, b: unknown): boolean {
  const canonical = (v: JsonValue): JsonValue => Array.isArray(v) ? v.map((x: JsonValue) => canonical(x)) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical((v as JsonObject)[k]!)])) : v
  assertJsonData(a); assertJsonData(b); return JSON.stringify(canonical(a as JsonValue)) === JSON.stringify(canonical(b as JsonValue))
}
export function readWorkspace(project: EngineeringProject): WorkspaceState {
  const raw = project.extensions[WORKSPACE_EXTENSION]; assertJsonData(raw)
  demand(raw && typeof raw === 'object' && !Array.isArray(raw), '此工程没有受支持的电赛工作台记录。')
  const s = raw as unknown as WorkspaceState
  demand(s.version === 1 && s.catalogVersion === 1, '电赛工作台扩展版本不受支持，未替换当前工程。')
  const problem = problemById(s.problemId), competition = project.competitions.find(c => c.id === s.competitionId)
  demand(competition && competition.sourceUrls.includes(problem.sourceUrl) && competition.sourceUrls.includes(problem.publicationUrl), '赛题身份或原始出处不匹配。')
  demand(uuid.test(s.engineeringRevision), '工程依据修订无效。')
  for (const list of [s.requirements, s.tasks, s.alternatives, s.notebooks, s.metrics, s.evidence, s.attempts, s.sourceRevisions]) demand(Array.isArray(list) && list.length <= 256, '工作台记录缺失或超过每类256条的当前上限。')
  const seen = new Set<string>(), id = (value: string) => { demand(uuid.test(value) && !seen.has(value), '工作台对象ID无效或重复。'); seen.add(value) }
  const experiment = (value: string) => demand(competition.experimentIds.includes(value) && project.experiments.some(e => e.id === value), '实验引用失效。')
  for (const r of s.requirements) {
    demand(r && typeof r === 'object', '需求记录无效。'); id(r.id)
    demand([r.title, r.sourceSection, r.conditions, r.method, r.evidenceNeeded, r.limitation, r.derivation].every(text) && nonempty(r.title) && nonempty(r.sourceSection) && ['published', 'derived', 'training'].includes(r.origin) && ['basic', 'advanced', 'unspecified'].includes(r.classification) && !!units[r.unit] && strings(r.topics), '需求归属、方法或单位无效。')
    validateCriterion(r.criterion)
    if (r.origin === 'published') { const expected = { ...problem.publishedRequirement, origin: 'published', derivation: '' }, { id: _id, ...actual } = r; demand(sameJson(actual, expected), '官方需求被改写；请另建派生解释或自定训练目标。'); void _id }
    if (r.origin === 'derived') demand(nonempty(r.derivation), '派生需求必须记录推导依据。')
    if (r.origin !== 'published') demand(r.classification === 'unspecified', '自定训练或派生解释不能标为官方基本/发挥要求。')
  }
  const requirementIds = new Set(s.requirements.map(r => r.id))
  for (const t of s.tasks) { id(t.id); demand(nonempty(t.title) && typeof t.done === 'boolean', '任务记录无效。') }
  for (const a of s.alternatives) { id(a.id); demand([a.title, a.approach, a.parameters, a.advantages, a.disadvantages, a.risks, a.rationale, a.references, a.revisionNote].every(text) && nonempty(a.title) && uuid.test(a.basedOnRevision) && stamp(a.recordedAtUtc), '方案或修订来源无效。') }
  const notebooks = new Set<string>()
  for (const n of s.notebooks) { experiment(n.experimentId); demand(!notebooks.has(n.experimentId), '实验笔记重复。'); notebooks.add(n.experimentId); demand([n.objective, n.setup, n.parameters, n.observations, n.problems, n.adjustments, n.conclusion, n.review, n.nextSteps].every(text) && strings(n.requirementIds) && n.requirementIds.every(id => requirementIds.has(id)), '实验笔记或需求引用无效。') }
  for (const m of s.metrics) { id(m.id); demand(requirementIds.has(m.requirementId) && [m.title, m.conditions, m.method].every(nonempty) && !!units[m.unit], '指标需有需求、单位、测试条件和方法。'); validateCriterion(m.criterion); const r = s.requirements.find(r => r.id === m.requirementId)!; demand(r.unit === m.unit && sameJson(r.criterion, m.criterion), '指标与需求规则不符；请先建立新的训练目标。') }
  const sourceIds = new Set<string>()
  for (const r of s.sourceRevisions) { demand(uuid.test(r.projectId) && uuid.test(r.revision) && !sourceIds.has(r.projectId), '来源工程修订无效或重复。'); sourceIds.add(r.projectId) }
  for (const e of s.evidence) {
    id(e.id); experiment(e.experimentId)
    demand([e.title, e.acquisition, e.method, e.conditions].every(nonempty) && ['simulation', 'imported', 'manual', 'derived'].includes(e.origin) && stamp(e.recordedAtUtc) && [e.basisRevision, e.sourceProjectId, e.sourceRevision].every(v => uuid.test(v)) && sourceIds.has(e.sourceProjectId), '证据来源、时间、条件或修订无效。')
    demand(strings(e.datasetIds) && e.datasetIds.every(id => project.measurements.some(d => d.id === id)) && strings(e.artifactAssetIds) && e.artifactAssetIds.every(id => project.assets.some(a => a.id === id)), '证据数据集或资产缺失。')
    if (e.origin === 'manual') demand(e.analysisId === '' && e.resultId === '' && e.inputDigest === '', '手动记录不得伪装为软件执行。')
    else demand(/^[0-9a-f]{64}$/.test(e.inputDigest), '软件或数据证据须有输入摘要。')
    if (e.analysisId) demand(project.analyses.some(a => a.id === e.analysisId) && project.experiments.find(x => x.id === e.experimentId)!.analysisIds.includes(e.analysisId) && project.results.some(r => r.id === e.resultId && r.analysisId === e.analysisId), '分析与实验/结果引用失效。')
    demand(list(e.data) && e.data.length > 0 && e.data.length <= 4096, '证据观测值缺失或超限。')
    const keys = new Set<string>(); for (const d of e.data) { demand(nonempty(d.key) && !keys.has(d.key) && nonempty(d.title) && d.quantity && Number.isFinite(d.quantity.value) && !!units[d.quantity.unit], '观测值、单位或标识无效。'); keys.add(d.key) }
  }
  for (const a of s.attempts) { id(a.id); demand(nonempty(a.label) && stamp(a.recordedAtUtc) && s.metrics.some(m => m.id === a.metricId) && s.evidence.some(e => e.id === a.evidenceId && e.data.some(d => d.key === a.datumKey)), '尝试记录的指标或证据引用无效。') }
  return s
}
