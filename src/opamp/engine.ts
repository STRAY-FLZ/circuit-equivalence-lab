import { analysisDigest } from '../analysis/snapshot'
import type { AnalysisEngine, AnalysisInput, AnalysisResult, Diagnostic } from '../analysis'
import { createEngineeringProject, createId, freezeSnapshot } from '../engineering'
import type { EngineeringProject, JsonObject } from '../engineering'
import { abs, mul, sub, solveAc, sweepFrequencies, transferAt } from '../ac'
import type { AcCircuit, AcSettings, SweepOptions, SweepPoint } from '../ac'
import { AcError } from '../ac/types'
import { DcError } from '../dc/types'
import { prepareOpamp } from './circuit'
import { crossing, openLoopGain, pointFromComplex } from './model'
import type { OpampPrepared, OpampResult, OpampSettings } from './types'

const resource = { id: 'org.stray.engine.opamp-frequency', version: '1' } as const
export async function createOpampInput(project: EngineeringProject, sheetId: string, settings: OpampSettings): Promise<AnalysisInput> {
  const value = { project: createEngineeringProject(project), configuration: { id: createId(), analysisType: 'analog.opamp-frequency', preferredEngine: resource, scope: { kind: 'circuit' as const, sheetIds: [sheetId] }, options: { ...settings } as unknown as JsonObject } }
  return freezeSnapshot({ ...value, inputDigest: await analysisDigest(value) })
}
function diagnostic(error: unknown): Diagnostic {
  if (error instanceof AcError || error instanceof DcError) return { code: error.code, severity: 'error', message: error.message, entityIds: error.entityIds }
  return { code: 'OPAMP_NUMERICAL', severity: 'error', message: error instanceof Error ? error.message : '分析失败。', entityIds: [] }
}
const sweepOptions = (s: OpampSettings): SweepOptions => ({ startHz: s.startHz, endHz: s.endHz, points: s.points, spacing: s.spacing, excitationSourceId: s.excitationSourceId, input: s.input, output: s.output, passband: 'low' })
function sourceSettings(circuit: AcCircuit, settings: OpampSettings): AcSettings {
  return { referenceAnchorId: settings.referenceAnchorId, frequencyHz: settings.frequencyHz, sources: circuit.elements.filter(e => e.kind === 'voltage-source' || e.kind === 'current-source').map(e => ({ componentId: e.id, magnitudeRms: e.id === settings.excitationSourceId ? settings.magnitudeRms : 0, phaseDegrees: e.id === settings.excitationSourceId ? settings.phaseDegrees : 0 })) }
}
/** Output injection with all original independent sources suppressed. */
export function feedbackAt(prepared: OpampPrepared, frequencyHz: number) {
  const { passive, model, settings } = prepared, id = `${model.id}:return-probe`, pin = model.pinIds[2]
  const circuit: AcCircuit = { ...passive, elements: [...passive.elements, { id, reference: `${model.reference} return probe`, kind: 'voltage-source', value: 1, p: model.output, n: passive.referenceKey, fromPinId: pin, toPinId: pin }] }
  const source = sourceSettings(circuit, { ...settings, excitationSourceId: id, magnitudeRms: 1, phaseDegrees: 0 })
  const result = solveAc(circuit, source, frequencyHz), v = (key: string) => result.nodes.find(n => n.key === key)!.value
  return sub(v(model.minus), v(model.plus))
}
function phaseMargin(points: readonly SweepPoint[], where: ReturnType<typeof crossing>): number | null {
  if (!where || points.some(p => p.kind === 'failed')) return null
  const raw = points.map(p => p.kind === 'available' ? p.phaseDegrees : null)
  if (raw.some(x => x === null) || Math.abs(raw[0]!) > 90) return null
  const phases: number[] = [raw[0]!]
  for (let i = 1; i < raw.length; i++) {
    let x = raw[i]!
    while (x - phases[i - 1]! > 180) x -= 360
    while (x - phases[i - 1]! < -180) x += 360
    phases.push(x)
  }
  return 180 + phases[where.index - 1]! + where.t * (phases[where.index]! - phases[where.index - 1]!)
}
export const opampEngine: AnalysisEngine<OpampResult> = {
  descriptor: { resource, family: 'electrical', execution: 'main-thread', analysisTypes: ['analog.opamp-frequency'], modelVersions: [{ id: 'org.stray.model.opamp.single-pole', version: '1' }] },
  inspect(input) { try { if (!/^[0-9a-f]{64}$/.test(input.inputDigest)) throw new AcError('OPAMP_DIGEST', '输入摘要格式无效。'); prepareOpamp(input); return { kind: 'supported', diagnostics: [] } } catch (e) { return { kind: 'unsupported', diagnostics: [diagnostic(e)] } } },
  async run(input, host): Promise<AnalysisResult<OpampResult>> {
    const provenance = { engine: resource, projectId: input.project.id, inputRevision: input.project.revision, inputDigest: input.inputDigest, analysisId: input.configuration.id, options: input.configuration.options }
    const result = (outcome: AnalysisResult<OpampResult>['outcome']) => freezeSnapshot({ provenance, outcome })
    if (host.signal.aborted) return result({ kind: 'cancelled' })
    try {
      if (await analysisDigest({ project: input.project, configuration: input.configuration }) !== input.inputDigest) throw new AcError('OPAMP_DIGEST', '输入快照摘要不一致，请重新创建分析。')
      const prepared = prepareOpamp(input, host.signal), settings = prepared.settings, options = sweepOptions(settings), sources = sourceSettings(prepared.dynamic, settings)
      const single = solveAc(prepared.dynamic, sources); transferAt(single, options)
      const betaAtFrequency = feedbackAt(prepared, settings.frequencyHz)
      const points: SweepPoint[] = [], openLoop: SweepPoint[] = [], loop: SweepPoint[] = []
      host.onProgress(0, settings.points)
      for (const [i, frequencyHz] of sweepFrequencies(options).entries()) {
        if (host.signal.aborted) return result({ kind: 'cancelled' })
        const gain = openLoopGain(prepared.model.gain, prepared.model.poleHz, frequencyHz)
        openLoop.push(pointFromComplex(frequencyHz, gain))
        try { points.push(transferAt(solveAc(prepared.dynamic, sources, frequencyHz), options)) } catch (e) { points.push({ kind: 'failed', frequencyHz, diagnostic: diagnostic(e) }) }
        try { loop.push(pointFromComplex(frequencyHz, mul(gain, feedbackAt(prepared, frequencyHz)))) } catch (e) { loop.push({ kind: 'failed', frequencyHz, diagnostic: diagnostic(e) }) }
        host.onProgress(i + 1, settings.points)
        if (i % 8 === 7) await new Promise<void>(resolve => setTimeout(resolve, 0))
      }
      if (host.signal.aborted) return result({ kind: 'cancelled' })
      const first = points[0], last = points.at(-1), threshold = prepared.dcTransfer === 0 ? null : 20 * Math.log10(Math.abs(prepared.dcTransfer)) - 10 * Math.log10(2)
      const bandwidth = threshold !== null && first?.kind === 'available' && last?.kind === 'available' && first.gainDb !== null && last.gainDb !== null && first.gainDb > threshold && last.gainDb < threshold ? crossing(points, threshold, settings.spacing) : null
      // With resistors only, the independently injected passive return is a
      // frequency-independent positive β and Aβ is strictly monotone. General
      // RC networks can hide additional crossings/phase wraps between samples;
      // show their calculated loop response but do not certify a margin.
      const constantReturn = prepared.passive.elements.every(e => e.kind !== 'capacitor')
      const firstLoop = loop[0], lastLoop = loop.at(-1), loopCrossing = constantReturn && firstLoop?.kind === 'available' && lastLoop?.kind === 'available' && firstLoop.magnitude > 1 && lastLoop.magnitude < 1 ? crossing(loop, 0, settings.spacing) : null
      const pm = phaseMargin(loop, loopCrossing), a = prepared.model.gain, fp = prepared.model.poleHz
      const notes = ['闭环截止为相对实际直流增量传递比的 −3.0103 dB 采样插值；缺失、多个交点或频率覆盖不足时不报告。', '环路 L=Aβ，β 为独立源置零并在运放输出注入 1 V 后求得的差分返回量；不是通用多环路稳定性证明。']
      if (!bandwidth) notes.push('未建立唯一带宽交点。')
      if (!constantReturn) notes.push('含电容网络仅展示实际返回频响；当前版本不认证其交越或相位裕度。')
      if (pm === null) notes.push('未建立唯一有效环路交越或连续相位，相位裕度不可用。')
      return result({ kind: 'success', value: { prepared, single, points, openLoop, loop, unityHz: a > 1 ? fp * Math.sqrt(a * a - 1) : null, approximateGbwHz: a * fp, bandwidthHz: bandwidth?.frequencyHz ?? null, crossoverHz: loopCrossing?.frequencyHz ?? null, phaseMarginDegrees: pm, notes, betaAtFrequency } })
    } catch (e) {
      if (host.signal.aborted) return result({ kind: 'cancelled' })
      if ((e instanceof AcError || e instanceof DcError) && e.category === 'unsupported') return result({ kind: 'unsupported', diagnostics: [diagnostic(e)] })
      const category = e instanceof AcError || e instanceof DcError ? e.category : 'numerical'
      return result({ kind: 'failure', category: category === 'unsupported' ? 'invalid-input' : category, diagnostics: [diagnostic(e)] })
    }
  },
}
export function opampMagnitude(value: { readonly real: number; readonly imaginary: number }): number { return abs(value) }
