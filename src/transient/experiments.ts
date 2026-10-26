import { reviseProject } from '../engineering'
import type { EngineeringProject } from '../engineering'
import { applyEdit } from '../editing'
import { settingsJson } from './configuration'
import { TRANSIENT_EXTENSION } from './types'
import type { TransientSettings } from './types'

export const transientTemplateIds = ['rc-charge-topology', 'rc-discharge-topology', 'rl-series-topology', 'rl-zero-input-topology', 'series-rlc', 'parallel-rlc', 'rc-lowpass', 'rc-highpass', 'rl-lowpass', 'rlc-bandpass'] as const
export const transientScenarios = [
  { id: 'zero-state', name: '零状态 · 0→10 V 阶跃' }, { id: 'zero-input', name: '零输入 · 非零初始能量' }, { id: 'complete', name: '全响应 · 初始能量与 10 V 激励' },
  { id: 'under', name: 'RLC 欠阻尼' }, { id: 'critical', name: 'RLC 临界阻尼' }, { id: 'over', name: 'RLC 过阻尼' },
] as const
export type TransientScenario = typeof transientScenarios[number]['id']
export function defaultTransientSettings(project: EngineeringProject, sheetId: string): TransientSettings {
  const sheet = project.sheets.find(s => s.id === sheetId)!
  const source = sheet.components.filter(c => ['voltage-source', 'current-source'].includes(project.definitions.find(d => d.id === c.definitionId)!.kind))
  const storage = sheet.components.filter(c => ['capacitor', 'inductor'].includes(project.definitions.find(d => d.id === c.definitionId)!.kind))
  return { version: 1, method: 'backward-euler-adaptive', durationSeconds: .005, intervalSeconds: .00001, relativeTolerance: 1e-5,
    ...(sheet.ports.find(p => ['COM', 'B'].includes(p.label)) ? { referenceAnchorId: sheet.ports.find(p => ['COM', 'B'].includes(p.label))!.anchorId } : {}),
    sources: source.map(c => ({ componentId: c.id, unit: project.definitions.find(d => d.id === c.definitionId)!.kind === 'voltage-source' ? 'V' : 'A', mode: 'constant', value: 0 })),
    initialConditions: storage.map(c => ({ componentId: c.id, unit: project.definitions.find(d => d.id === c.definitionId)!.kind === 'capacitor' ? 'V' : 'A', value: 0 })),
  }
}
/** Reuses actual Atlas instances. Parameters/configuration change together as one editor transaction. */
export function configureTransientExperiment(input: EngineeringProject, sheetId: string, scenario: TransientScenario): EngineeringProject {
  let project = input
  const sheet = project.sheets.find(s => s.id === sheetId)!, kinds = sheet.components.map(c => project.definitions.find(d => d.id === c.definitionId)!.kind), second = kinds.includes('capacitor') && kinds.includes('inductor'), parallel = second && !kinds.includes('voltage-source')
  for (const c of sheet.components) {
    const kind = project.definitions.find(d => d.id === c.definitionId)!.kind
    const value = kind === 'resistor' ? second ? parallel ? scenario === 'critical' ? 100 : scenario === 'over' ? 50 : 200 : scenario === 'critical' ? 400 : scenario === 'over' ? 600 : 200 : kinds.includes('capacitor') ? 1000 : 100 : kind === 'capacitor' ? second ? 25e-6 : 1e-6 : kind === 'inductor' ? second ? 1 : .1 : undefined
    if (value !== undefined) { const parameter = kind === 'resistor' ? 'resistance' : kind === 'capacitor' ? 'capacitance' : 'inductance', unit = kind === 'resistor' ? 'ohm' : kind === 'capacitor' ? 'F' : 'H'; project = applyEdit(project, sheetId, { type: 'properties', id: c.id, reference: c.reference, parameters: { ...c.parameters, [parameter]: { kind: 'quantity', quantity: { value, unit } } } }) }
  }
  const base = defaultTransientSettings(project, sheetId), natural = scenario === 'zero-input' || base.sources.length === 0
  const settings: TransientSettings = { ...base, durationSeconds: second ? .08 : .005, intervalSeconds: second ? .0001 : .00001,
    sources: base.sources.map(s => ({ componentId: s.componentId, unit: s.unit, mode: 'step', initial: 0, final: natural ? 0 : s.unit === 'V' ? 10 : .01, atSeconds: 0 })),
    initialConditions: base.initialConditions.map(s => ({ ...s, value: natural || scenario === 'complete' ? s.unit === 'V' ? 5 : second ? 0 : .04 : 0 })),
  }
  const old = project.extensions[TRANSIENT_EXTENSION], container = old && typeof old === 'object' && !Array.isArray(old) ? old : {}
  return reviseProject(project, project.revision, { extensions: { ...project.extensions, [TRANSIENT_EXTENSION]: { ...container, [sheetId]: settingsJson(settings) } } })
}
