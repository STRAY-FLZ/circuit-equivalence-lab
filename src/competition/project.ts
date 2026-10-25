import { createEngineeringProject, createId, reviseProject } from '../engineering'
import type { JsonObject } from '../engineering'
import { createProjectDocument } from '../project-format'
import type { ProjectDocumentV1 } from '../project-format'
import { instantiateTemplate } from '../atlas'
import { problemById } from './catalog'
import { readWorkspace } from './validation'
import { WORKSPACE_EXTENSION } from './types'
import type { Notebook, Requirement, WorkspaceState } from './types'

export const now = () => new Date().toISOString()
export function workspaceExtension(state: WorkspaceState): JsonObject { return JSON.parse(JSON.stringify(state)) as JsonObject }
export async function editWorkspace(document: ProjectDocumentV1, change: (state: WorkspaceState) => WorkspaceState): Promise<ProjectDocumentV1> {
  const state = change(readWorkspace(document.project))
  const project = reviseProject(document.project, document.project.revision, { extensions: { ...document.project.extensions, [WORKSPACE_EXTENSION]: workspaceExtension(state) }, experiments: document.project.experiments.map(e => { const notebook = state.notebooks.find(n => n.experimentId === e.id); return notebook ? { ...e, notes: notebook.conclusion || notebook.objective } : e }) })
  readWorkspace(project); return createProjectDocument(project, document.writer, document.inlineAssets)
}
export async function createCompetitionProject(problemId: string, writer: ProjectDocumentV1['writer']): Promise<ProjectDocumentV1> {
  const problem = problemById(problemId), base = instantiateTemplate(problemId === 'nuedc-2019-a' ? 'voltage-load' : 'rc-lowpass')
  const published: Requirement = { ...problem.publishedRequirement, id: createId(), origin: 'published', derivation: '' }
  const derived: Requirement = { id: createId(), title: '理想RC参考截止频率', origin: 'derived', sourceSection: '本训练推导，非原题指标', classification: 'unspecified', unit: 'Hz', criterion: { kind: 'exact', expected: 1 / (2 * Math.PI * 1000 * 1e-6), absoluteTolerance: .5, relativeTolerance: 0 }, conditions: '独立RC子训练：R=1 kΩ，C=1 µF，理想元件', method: 'fc=1/(2πRC)，与扫描插值估计分开', evidenceNeeded: '真实AC计算与完整输入设置', topics: ['RC', 'Bode', '频率响应'], limitation: '不代表原题放大器上限频率', derivation: '对理想一阶RC网络令幅值降至通带的1/√2，得到fc=1/(2πRC)。' }
  const training: Requirement = { id: createId(), title: '正弦采样有效值子训练', origin: 'training', sourceSection: '用户可调整的独立训练目标，非官方评分', classification: 'unspecified', unit: 'V', criterion: { kind: 'exact', expected: .1 / Math.sqrt(2), absoluteTolerance: .005, relativeTolerance: 0 }, conditions: '合成20 kHz正弦，峰值0.1 V，fs=256 kHz，4096点，零偏置；不认证硬件', method: '全采样记录sqrt(mean(x²))', evidenceNeeded: '真实合成/导入采样及来源；不是手填示例结果', topics: ['RMS', 'FFT', '采样'], limitation: '只是一个正弦用例，不能证明整道题的谐波/全频段与限时要求', derivation: '' }
  const requirements = [published, derived, training], experiments = ['周期信号测量子训练', 'RC频率响应子训练', '电气性能与自定义实验'].map(title => ({ id: createId(), title, analysisIds: [], datasetIds: [], notes: '独立训练子集，不代表整题实现或官方测试。' }))
  const competition = { id: createId(), title: `${problem.year} ${problem.letter} · ${problem.title}`, sourceUrls: [problem.sourceUrl, problem.publicationUrl], experimentIds: experiments.map(e => e.id) }
  const notebooks: Notebook[] = experiments.map((e, i) => ({ experimentId: e.id, objective: e.title, setup: '按训练说明配置软件或导入数据，记录真实条件。', parameters: '', observations: '', problems: '', adjustments: '', conclusion: '', review: '', nextSteps: '', requirementIds: [requirements[i === 0 ? 2 : i === 1 ? 1 : 0]!.id] }))
  const state: WorkspaceState = { version: 1, catalogVersion: 1, problemId, competitionId: competition.id, engineeringRevision: base.revision, sourceRevisions: [{ projectId: base.id, revision: base.revision }], requirements, notebooks, tasks: ['阅读原题与范围限制', '比较方案并明确假设', '运行实验并关联实际证据', '核对指标与导出报告'].map(title => ({ id: createId(), title, done: false })), alternatives: [], evidence: [], attempts: [], metrics: requirements.map(r => ({ id: createId(), requirementId: r.id, title: r.title, unit: r.unit, criterion: r.criterion, conditions: r.conditions, method: r.method })) }
  const project = createEngineeringProject({ ...base, title: `${competition.title} · 训练工程`, experiments, competitions: [competition], extensions: { ...base.extensions, [WORKSPACE_EXTENSION]: workspaceExtension(state) } })
  readWorkspace(project); return createProjectDocument(project, writer)
}
export async function replaceTrainingCircuit(document: ProjectDocumentV1, templateId: string): Promise<ProjectDocumentV1> {
  const usedSheets = document.project.analyses.some(a => a.scope.kind === 'circuit')
  if (usedSheets) throw new Error('已有分析引用当前图纸。请新建独立训练工程比较另一电路，或继续编辑现有元件。')
  const template = instantiateTemplate(templateId), state = readWorkspace(document.project)
  const project = reviseProject(document.project, document.project.revision, { definitions: template.definitions, symbols: template.symbols, sheets: template.sheets, extensions: { ...document.project.extensions, 'org.stray.ac': template.extensions['org.stray.ac'] ?? {}, [WORKSPACE_EXTENSION]: workspaceExtension({ ...state, engineeringRevision: template.revision, sourceRevisions: state.sourceRevisions.map(r => r.projectId === document.project.id ? { ...r, revision: template.revision } : r) }) } })
  return createProjectDocument(project, document.writer, document.inlineAssets)
}
