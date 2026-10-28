import { analysisDigest } from '../analysis/snapshot'
import type { AnalysisEngine, AnalysisInput, AnalysisResult, Diagnostic } from '../analysis'
import { createEngineeringProject, createId, freezeSnapshot } from '../engineering'
import type { EngineeringProject, JsonObject } from '../engineering'
import { abs, add, c, sub, solveAc, sweepFrequencies, transferAt } from '../ac'
import { neg } from '../ac/complex'
import type { AcSettings, AcSolution, SweepOptions } from '../ac'
import { AcError } from '../ac/types'
import { AnalogError } from '../analog'
import { prepareAmplifier } from './circuit'
import { midbandFeatures } from './features'
import type { AmplifierBias, AmplifierPoint, AmplifierResult, AmplifierSettings } from './types'

const resource = { id: 'org.stray.engine.amplifier-frequency', version: '1' } as const
export async function createAmplifierInput(project: EngineeringProject, sheetId: string, settings: AmplifierSettings): Promise<AnalysisInput> {
  const value = { project: createEngineeringProject(project), configuration: { id: createId(), analysisType: 'analog.amplifier-frequency', preferredEngine: resource, scope: { kind: 'circuit' as const, sheetIds: [sheetId] }, options: { ...settings } as unknown as JsonObject } }
  return freezeSnapshot({ ...value, inputDigest: await analysisDigest(value) })
}
function diagnostic(error: unknown): Diagnostic {
  if (error instanceof AcError) return { code: error.code, severity: 'error', message: error.message, entityIds: error.entityIds }
  if (error instanceof AnalogError) return { code: error.code, severity: 'error', message: error.message, entityIds: [] }
  return { code: 'AMP_NUMERICAL', severity: 'error', message: error instanceof Error ? error.message : '分析失败。', entityIds: [] }
}
function optionsFor(bias: AmplifierBias): SweepOptions {
  const s = bias.settings
  return { startHz: s.startHz, endHz: s.endHz, points: s.points, spacing: s.spacing, excitationSourceId: s.excitationSourceId, input: s.input, output: s.output, passband: 'peak' }
}
function settingsFor(bias: AmplifierBias): AcSettings {
  const s = bias.settings
  return { frequencyHz: s.frequencyHz, referenceAnchorId: s.referenceAnchorId, sources: bias.circuit.elements.filter(e => e.kind === 'voltage-source' || e.kind === 'current-source').map(e => ({ componentId: e.id, magnitudeRms: e.id === s.excitationSourceId ? s.magnitudeRms : 0, phaseDegrees: e.id === s.excitationSourceId ? s.phaseDegrees : 0 })) }
}
/** Check the peak sinusoidal excursion against the same local model's region. */
function checkedPoint(bias: AmplifierBias, solution: AcSolution): AmplifierPoint {
  const device = bias.dc.circuit.elements.find(e => e.id === bias.device.componentId)!, node = (key: string) => solution.nodes.find(n => n.key === key)!.value
  const [first, second, third] = device.nodes as readonly [string, string, string], vfirst = node(first), vsecond = node(second), vthird = node(third)
  const vcontrol = sub(vfirst, vthird), voutput = sub(vsecond, vthird), peak = Math.SQRT2
  if (bias.device.perturbationLimitVolts !== undefined && peak * abs(vcontrol) > bias.device.perturbationLimitVolts) throw new AcError('AMP_EXCURSION', '交流峰值扰动超过该工作点声明的局部线性范围；请减小 RMS 激励。', [device.id], 'unsupported')
  const [dcFirst, dcSecond, dcThird] = bias.device.terminalVolts as readonly [number, number, number]
  if (device.kind === 'npn' && dcSecond - dcThird - device.parameters.saturationVoltage! <= peak * abs(voutput)) throw new AcError('AMP_EXCURSION', '交流峰值可能使 NPN 跨越饱和区边界。', [device.id], 'unsupported')
  if (device.kind === 'nmos') {
    const overdrive = dcFirst - dcThird - device.parameters.threshold!, margin = dcSecond - dcFirst + device.parameters.threshold!
    if (overdrive <= peak * abs(vcontrol) || margin <= peak * abs(sub(vsecond, vfirst))) throw new AcError('AMP_EXCURSION', '交流峰值可能使 nMOS 跨越截止或三极区边界。', [device.id], 'unsupported')
  }
  const gmCurrent = solution.branches.find(b => b.id === `${device.id}:gm`)!.current.value
  const inputCurrent = device.kind === 'npn' ? solution.branches.find(b => b.id === `${device.id}:rpi`)!.current.value : c()
  const point = transferAt(solution, optionsFor(bias))
  return { ...point, terminalVolts: [vfirst, vsecond, vthird], terminalAmps: [inputCurrent, gmCurrent, neg(add(inputCurrent, gmCurrent))], maxKclAmps: solution.checks.maxKclAmps, backwardError: solution.checks.complexBackwardError }
}
export const amplifierEngine: AnalysisEngine<AmplifierResult> = {
  descriptor: { resource, family: 'electrical', execution: 'main-thread', analysisTypes: ['analog.amplifier-frequency'], modelVersions: ['npn', 'nmos'].map(k => ({ id: `org.stray.model.analog.${k}`, version: '1' })) },
  inspect(input) { try { if (!/^[0-9a-f]{64}$/.test(input.inputDigest)) throw new AcError('AMP_DIGEST', '输入摘要格式无效。'); prepareAmplifier(input); return { kind: 'supported', diagnostics: [] } } catch (e) { return { kind: 'unsupported', diagnostics: [diagnostic(e)] } } },
  async run(input, host): Promise<AnalysisResult<AmplifierResult>> {
    const provenance = { engine: resource, projectId: input.project.id, inputRevision: input.project.revision, inputDigest: input.inputDigest, analysisId: input.configuration.id, options: input.configuration.options }
    const result = (outcome: AnalysisResult<AmplifierResult>['outcome']) => freezeSnapshot({ provenance, outcome })
    if (host.signal.aborted) return result({ kind: 'cancelled' })
    try {
      if (await analysisDigest({ project: input.project, configuration: input.configuration }) !== input.inputDigest) throw new AcError('AMP_DIGEST', '输入快照摘要不一致；请重新创建分析。')
      const bias = prepareAmplifier(input, host.signal), settings = settingsFor(bias), sweep = optionsFor(bias)
      host.onProgress(0, sweep.points + 1)
      const single = solveAc(bias.circuit, settings); checkedPoint(bias, single)
      const points: AmplifierPoint[] = []
      for (const [index, frequencyHz] of sweepFrequencies(sweep).entries()) {
        if (host.signal.aborted) return result({ kind: 'cancelled' })
        try { points.push(checkedPoint(bias, solveAc(bias.circuit, settings, frequencyHz))) }
        catch (e) { points.push({ kind: 'failed', frequencyHz, diagnostic: diagnostic(e) }) }
        host.onProgress(index + 2, sweep.points + 1)
        if (index % 8 === 7) await new Promise<void>(resolve => setTimeout(resolve, 0))
      }
      if (host.signal.aborted) return result({ kind: 'cancelled' })
      return result({ kind: 'success', value: { bias, single, points, features: midbandFeatures(points, sweep.spacing) } })
    } catch (e) {
      if (host.signal.aborted) return result({ kind: 'cancelled' })
      if (e instanceof AcError && e.category === 'unsupported' || e instanceof AnalogError && e.category === 'unsupported') return result({ kind: 'unsupported', diagnostics: [diagnostic(e)] })
      const category = e instanceof AcError || e instanceof AnalogError ? e.category : 'numerical'
      return result({ kind: 'failure', category: category === 'unsupported' ? 'invalid-input' : category, diagnostics: [diagnostic(e)] })
    }
  },
}
