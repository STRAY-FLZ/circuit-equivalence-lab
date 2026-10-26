import { createEngineeringProject, createId, freezeSnapshot } from '../engineering'
import type { EngineeringProject } from '../engineering'
import { analysisDigest } from '../analysis/snapshot'
import type { AnalysisEngine, AnalysisInput, Diagnostic } from '../analysis'
import { parseTransientSettings, settingsJson } from './configuration'
import { resolveTransientCircuit } from './circuit'
import { solveTransient, transientStep } from './solve'
import { sourceValue } from './configuration'
import { TransientError, TRANSIENT_ENGINE } from './types'
import type { TransientResult, TransientSettings } from './types'

export async function createTransientInput(project: EngineeringProject, sheetId: string, settings: TransientSettings): Promise<AnalysisInput> {
  parseTransientSettings(settings)
  const input = { project: createEngineeringProject(project), configuration: { id: createId(), analysisType: 'transient.linear', preferredEngine: TRANSIENT_ENGINE, scope: { kind: 'circuit' as const, sheetIds: [sheetId] }, options: settingsJson(settings) } }
  return freezeSnapshot({ ...input, inputDigest: await analysisDigest(input) })
}
export function transientDiagnostic(e: unknown): Diagnostic { return { code: e instanceof TransientError ? e.code : 'TRAN_INPUT', severity: 'error', message: e instanceof Error ? e.message : '暂态输入无效。', entityIds: e instanceof TransientError ? e.entityIds : [] } }
function prepare(input: AnalysisInput) {
  const c = input.configuration
  if (c.analysisType !== 'transient.linear' || c.scope.kind !== 'circuit' || c.scope.sheetIds.length !== 1) throw new TransientError('TRAN_SCOPE', '暂态仅支持单张平面图纸。', [], 'unsupported')
  if (c.preferredEngine && (c.preferredEngine.id !== TRANSIENT_ENGINE.id || c.preferredEngine.version !== '1')) throw new TransientError('TRAN_PROVIDER', '指定的暂态引擎版本不可用。', [], 'unsupported')
  if (!/^[a-f0-9]{64}$/.test(input.inputDigest)) throw new TransientError('TRAN_DIGEST', '暂态输入摘要格式无效。')
  const settings = parseTransientSettings(c.options), circuit = resolveTransientCircuit(input.project, c.scope.sheetIds[0]!, settings)
  return { settings, circuit }
}
export const transientEngine: AnalysisEngine<TransientResult> = {
  descriptor: { resource: TRANSIENT_ENGINE, family: 'electrical', execution: 'main-thread', analysisTypes: ['transient.linear'], modelVersions: [{ id: 'org.stray.adapter.transient-ideal-builtins', version: '1' }, { id: 'org.stray.model.resistor', version: '1' }] },
  inspect(input) { try { const { circuit, settings } = prepare(input); transientStep(circuit, Object.fromEntries(settings.initialConditions.map(s => [s.componentId, s.value])), Object.fromEntries(settings.sources.map(s => [s.componentId, sourceValue(s, 0)]))); return { kind: 'supported', diagnostics: [] } } catch (e) { return { kind: 'unsupported', diagnostics: [transientDiagnostic(e)] } } },
  async run(input, host) {
    const provenance = { engine: TRANSIENT_ENGINE, projectId: input.project.id, inputRevision: input.project.revision, inputDigest: input.inputDigest, analysisId: input.configuration.id, options: input.configuration.options }
    const finish = (outcome: Awaited<ReturnType<AnalysisEngine<TransientResult>['run']>>['outcome']) => freezeSnapshot({ provenance, outcome })
    if (host.signal.aborted) return finish({ kind: 'cancelled' })
    try {
      const { circuit, settings } = prepare(input)
      if (await analysisDigest({ project: input.project, configuration: input.configuration }) !== input.inputDigest) throw new TransientError('TRAN_DIGEST', '工程/配置与摘要不符；请重新运行。')
      const value = await solveTransient(circuit, settings, host)
      return finish(value ? { kind: 'success', value } : { kind: 'cancelled' })
    } catch (e) { const diagnostics = [transientDiagnostic(e)]; return finish(e instanceof TransientError && e.category === 'unsupported' ? { kind: 'unsupported', diagnostics } : { kind: 'failure', category: e instanceof TransientError ? e.category as 'invalid-input' | 'numerical' | 'resource' : 'invalid-input', diagnostics }) }
  },
}
