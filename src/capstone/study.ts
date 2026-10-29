import { analysisDigest } from '../analysis/snapshot'
import type { AnalysisInput, AnalysisResult, EngineHost } from '../analysis'
import { createEngineeringProject, createId, freezeSnapshot } from '../engineering'
import type { EngineeringProject, JsonObject } from '../engineering'
import { applyEdit } from '../editing'
import { acEngine, createAcInput } from '../ac'
import type { SweepPoint } from '../ac'
import { createTransientInput, defaultTransientSettings, transientEngine, transientReference } from '../transient'
import { amplifierEngine, createAmplifierInput } from '../amplifier'
import { createOpampInput, opampEngine } from '../opamp'
import type { AmplifierSettings } from '../amplifier'
import { capstoneExperiments } from './experiments'
import type { CapstoneKind, CapstoneStudy, StudyParameter, StudyCurve, StudyMetric, StoredCapture, StudyScenario } from './types'

export const sourceDigest = (project: EngineeringProject) => analysisDigest({ id: project.id, revision: project.revision, definitions: project.definitions, sheets: project.sheets })
const json = (value: unknown): JsonObject => JSON.parse(JSON.stringify(value)) as JsonObject
export function parameterChoices(project: EngineeringProject) {
  return project.sheets[0]!.components.flatMap(c => Object.entries(c.parameters).flatMap(([key, p]) => p.kind === 'quantity' && ['resistance', 'capacitance', 'openLoopGain', 'poleHz', 'voltage'].includes(key) ? [{ componentId: c.id, key, unit: p.quantity.unit, value: p.quantity.value, label: `${c.reference}.${key} / ${p.quantity.unit}` }] : []))
}
export function validateStudyParameter(project: EngineeringProject, parameter: StudyParameter): void {
  const choice = parameterChoices(project).find(c => c.componentId === parameter.componentId && c.key === parameter.key && c.unit === parameter.unit)
  if (!choice || !parameter.values.length || parameter.values.length > 5 || parameter.values.some(v => !Number.isFinite(v)) || new Set(parameter.values).size !== parameter.values.length) throw Error('选择实际支持参数和正确单位；场景必须是 1–5 个不同有限数值。')
}
function bode(points: readonly SweepPoint[], prefix: string): StudyCurve[] {
  return (['dB', '°'] as const).map(unit => ({ label: `${prefix} ${unit === 'dB' ? '增益' : '相位'}`, xUnit: 'Hz', yUnit: unit, x: points.map(p => p.frequencyHz), y: points.map(p => p.kind === 'available' ? unit === 'dB' ? p.gainDb : p.phaseDegrees : null) }))
}
export async function runStudy(source: EngineeringProject, kind: CapstoneKind, parameter: StudyParameter, host: EngineHost): Promise<CapstoneStudy> {
  source = createEngineeringProject(source); validateStudyParameter(source, parameter)
  if (source.sheets.length !== 1) throw Error('综合实验仅支持单图纸。')
  const definition = capstoneExperiments.find(e => e.kind === kind)
  if (!definition) throw Error('实验类型不支持。')
  const scenarios: StudyScenario[] = []
  for (const requestedValue of parameter.values) {
    if (host.signal.aborted) throw new DOMException('分析已取消。', 'AbortError')
    const captures: StoredCapture[] = [], metrics: StudyMetric[] = [], curves: StudyCurve[] = [], messages: string[] = []
    let project = source
    const metric = (label: string, value: number | null | undefined, unit: string, origin: StudyMetric['origin'] = 'simulation') => metrics.push({ label, value: value === undefined ? null : value, unit, origin })
    const capture = <T>(input: AnalysisInput, result: AnalysisResult<T>): T | null => {
      captures.push({ input, result: json(result) })
      if (result.outcome.kind === 'success') return result.outcome.value
      messages.push(result.outcome.kind + ('diagnostics' in result.outcome ? ': ' + result.outcome.diagnostics.map(d => `${d.code} ${d.message}`).join('；') : ''))
      return null
    }
    try {
      const old = source.sheets[0]!.components.find(c => c.id === parameter.componentId)!
      project = applyEdit(source, source.sheets[0]!.id, { type: 'properties', id: old.id, reference: old.reference, parameters: { ...old.parameters, [parameter.key]: { kind: 'quantity', quantity: { value: requestedValue, unit: parameter.unit } } } })
      const sheet = project.sheets[0]!, port = (label: string) => sheet.ports.find(p => p.label === label)?.anchorId ?? '', sourceId = sheet.components.find(c => c.reference === 'V1')?.id ?? ''
      const common: AmplifierSettings = { referenceAnchorId: port('COM'), excitationSourceId: sourceId, magnitudeRms: kind === 'ce' || kind === 'cs' ? .0001 : .01, phaseDegrees: 0, input: [port('IN'), port('COM')], output: [port('OUT'), port('COM')], frequencyHz: 1000, startHz: .1, endHz: 1e8, points: 201, spacing: 'log' }
      const silentHost = { ...host, onProgress: () => {} }
      if (kind === 'rc' || kind === 'rlc') {
        const defaults = defaultTransientSettings(project, sheet.id)
        const settings = { ...defaults, durationSeconds: kind === 'rc' ? .005 : .08, intervalSeconds: kind === 'rc' ? .00001 : .0001, sources: defaults.sources.map(s => { const c = sheet.components.find(c => c.id === s.componentId)!, value = c.parameters.voltage; return { componentId: s.componentId, unit: s.unit, mode: 'step' as const, initial: 0, final: value?.kind === 'quantity' ? value.quantity.value : 0, atSeconds: 0 } }) }
        const input = await createTransientInput(project, sheet.id, settings), transient = capture(input, await transientEngine.run(input, silentHost))
        let frequencyHz = 100
        if (transient) {
          const reference = transientReference(transient.circuit, settings), cap = transient.circuit.elements.find(e => e.kind === 'capacitor')
          for (const s of transient.series.filter(s => s.entityId === cap?.id && s.quantity === 'branch-voltage' || s.quantity === 'branch-current' && transient.circuit.elements.find(e => e.id === s.entityId)?.kind === 'resistor')) curves.push({ label: s.name, xUnit: 's', yUnit: s.unit as 'V' | 'A', x: s.values.map((_, i) => i * transient.axis.intervalSeconds), y: s.values })
          if (reference?.tauSeconds) {
            frequencyHz = 1 / (2 * Math.PI * reference.tauSeconds)
            metric('τ 解析参考', reference.tauSeconds, 's', 'reference'); metric('fc 解析参考', frequencyHz, 'Hz', 'reference')
            const samples = transient.series.find(s => s.entityId === reference.entityId && s.quantity === reference.quantity), i = Math.round(reference.tauSeconds / transient.axis.intervalSeconds)
            metric('τ 附近采样时间', samples && i < samples.values.length ? i * transient.axis.intervalSeconds : null, 's')
            metric('τ 附近实际采样', samples?.values[i] ?? null, reference.unit)
            metric('同采样时刻解析参考', samples && i < samples.values.length ? reference.at(i * transient.axis.intervalSeconds) : null, reference.unit, 'reference')
          }
          if (reference?.omega0) { frequencyHz = reference.omega0 / (2 * Math.PI); metric('自然频率参考', frequencyHz, 'Hz', 'reference'); metric('α 参考', reference.alpha, '1/s', 'reference'); metric('阻尼振荡频率参考', reference.omegaD === undefined ? null : reference.omegaD / (2 * Math.PI), 'Hz', 'reference'); messages.push('阻尼类型：' + reference.damping + '；自然频率、阻尼振荡频率与驱动峰值分别定义。') }
          metric('暂态最大 KCL', transient.checks.maxKclAmps, 'A')
        }
        const inputPair = [port('IN'), port('COM')] as const, output = kind === 'rlc' ? [port('R+'), port('R-')] as const : [port('OUT'), port('COM')] as const
        const acInput = await createAcInput(project, sheet.id, { frequencyHz, referenceAnchorId: port('COM'), sources: settings.sources.map(s => ({ componentId: s.componentId, magnitudeRms: s.componentId === sourceId ? 1 : 0, phaseDegrees: 0 })), sweep: { startHz: .01, endHz: 1e6, points: 201, spacing: 'log', excitationSourceId: sourceId, input: inputPair, output, passband: kind === 'rc' ? 'low' : 'peak' } })
        const ac = capture(acInput, await acEngine.run(acInput, silentHost))
        if (ac?.sweep) { curves.push(...bode(ac.sweep.points, '实际交流')); metric('采样半功率交点', ac.sweep.features.halfPowerCrossingsHz[0] ?? null, 'Hz'); metric('采样峰值频率', ac.sweep.features.sampledPeak?.frequencyHz, 'Hz'); if (kind === 'rc') { const tau = metrics.find(m => m.label === 'τ 解析参考')?.value, cutoff = ac.sweep.features.halfPowerCrossingsHz; metric('τ×采样fc', tau && cutoff.length === 1 ? tau * cutoff[0]! : null, '1', 'derived') } }
      } else if (kind === 'ce' || kind === 'cs') {
        const input = await createAmplifierInput(project, sheet.id, common), result = capture(input, await amplifierEngine.run(input, silentHost))
        if (result) { const d = result.bias.device; metric('gm', d.gm, 'S'); metric('rπ', d.rpi, 'ohm'); metric('gds', d.gds, 'S'); metric('偏置输出支路电流', d.terminalAmps[1], 'A'); metric('中频增益', result.features.plateau?.magnitude, 'V/V'); metric('下截止估计', result.features.lowerHz, 'Hz'); metric('上截止估计', result.features.upperHz, 'Hz'); metric('带宽估计', result.features.bandwidthHz, 'Hz'); curves.push(...bode(result.points, '晶体管频响')); messages.push('已验证区域：' + d.region, result.bias.modelExplanation, ...result.features.notes) }
      } else {
        const input = await createOpampInput(project, sheet.id, common), result = capture(input, await opampEngine.run(input, silentHost))
        if (result) { metric('理想直流输出', result.prepared.idealDcOutput, 'V', 'reference'); metric('有限直流输出', result.prepared.dc.nodes.find(n => n.key === result.prepared.model.output)?.volts, 'V'); metric('有限直流增益', result.prepared.dcTransfer, 'V/V'); metric('精确单位增益频率', result.unityHz, 'Hz', 'reference'); metric('近似 GBW', result.approximateGbwHz, 'Hz', 'reference'); metric('截止估计', result.bandwidthHz, 'Hz'); metric('相位裕度', result.phaseMarginDegrees, '°'); curves.push(...bode(result.openLoop, '开环'), ...bode(result.points, '闭环'), ...bode(result.loop, '环路')); messages.push(...result.notes) }
      }
    } catch (error) { messages.push(error instanceof Error ? error.message : '场景失败。') }
    if (host.signal.aborted) throw new DOMException('分析已取消。', 'AbortError')
    const successes = captures.filter(c => (c.result.outcome as JsonObject).kind === 'success').length
    const status = successes === captures.length && successes > 0 ? 'success' : successes ? 'partial' : captures.some(c => (c.result.outcome as JsonObject).kind === 'unsupported') ? 'unsupported' : 'failure'
    scenarios.push({ id: createId(), requestedValue, project, status, captures, metrics, curves, messages })
    host.onProgress(scenarios.length, parameter.values.length)
    await new Promise<void>(resolve => setTimeout(resolve, 0))
  }
  return freezeSnapshot({ version: 1, id: createId(), kind, title: definition.title, source, sourceDigest: await sourceDigest(source), parameter, scenarios, createdAtUtc: new Date().toISOString() })
}
