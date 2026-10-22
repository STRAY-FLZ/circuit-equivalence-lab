import { createEngineeringProject, createId, freezeSnapshot } from '../engineering'
import type { EngineeringProject } from '../engineering'
import { analysisDigest } from '../analysis/snapshot'
import type { AnalysisEngine, AnalysisInput, Diagnostic } from '../analysis'
import { DcError } from '../dc/types'
import { parseAcSettings } from './configuration'
import { resolveAcCircuit } from './circuit'
import { solveAc } from './mna'
import { analyticalReference, sweepFeatures, sweepFrequencies, transferAt } from './sweep'
import { AcError } from './types'
import type { AcResult, AcSettings, SweepPoint } from './types'

export const AC_ENGINE = { id: 'org.stray.engine.ac-mna', version: '1' } as const
export async function createAcInput(project: EngineeringProject, sheetId: string, settings: AcSettings): Promise<AnalysisInput> {
  const input = { project: createEngineeringProject(project), configuration: { id: createId(), analysisType: settings.sweep ? 'ac.sweep' : 'ac.steady-state', preferredEngine: AC_ENGINE, scope: { kind: 'circuit' as const, sheetIds: [sheetId] }, options: { ...settings } } }
  parseAcSettings(input.configuration.options)
  return freezeSnapshot({ ...input, inputDigest: await analysisDigest(input) })
}
export function acDiagnostic(error: unknown): Diagnostic {
  return error instanceof AcError || error instanceof DcError ? { code: error.code.replace(/^DC_/, 'AC_'), message: error instanceof DcError ? `交流复数系统：${error.message}` : error.message, severity: 'error', entityIds: error.entityIds } : { code: 'AC_INVALID_PROJECT', message: error instanceof Error ? error.message : '交流输入无效。', severity: 'error', entityIds: [] }
}
function prepare(input: AnalysisInput) {
  const config = input.configuration
  if (!['ac.steady-state', 'ac.sweep'].includes(config.analysisType) || config.scope.kind !== 'circuit' || config.scope.sheetIds.length !== 1) throw new AcError('AC_SCOPE', '交流分析只支持单张平面图纸。', [], 'unsupported')
  if (config.preferredEngine && (config.preferredEngine.id !== AC_ENGINE.id || config.preferredEngine.version !== AC_ENGINE.version)) throw new AcError('AC_PROVIDER', '指定的交流引擎版本不可用。', [], 'unsupported')
  if (!/^[a-f0-9]{64}$/.test(input.inputDigest)) throw new AcError('AC_DIGEST', '输入摘要格式无效。')
  const settings = parseAcSettings(config.options)
  if ((config.analysisType === 'ac.sweep') !== !!settings.sweep) throw new AcError('AC_CONFIGURATION', '分析类型与扫描配置不一致。')
  return { settings, circuit: resolveAcCircuit(input.project, config.scope.sheetIds[0]!, settings) }
}
export const acEngine: AnalysisEngine<AcResult> = {
  descriptor: { resource: AC_ENGINE, family: 'electrical', execution: 'main-thread', analysisTypes: ['ac.steady-state', 'ac.sweep'], modelVersions: [{ id: 'org.stray.model.resistor', version: '1' }, { id: 'org.stray.adapter.ac-ideal-builtins', version: '1' }, ...['voltage-source', 'current-source', 'vcvs', 'vccs', 'ccvs', 'cccs'].map(k => ({ id: `org.stray.model.dc.${k}`, version: '1' }))] },
  inspect(input) { try { prepare(input); return { kind: 'supported', diagnostics: [] } } catch (error) { return { kind: 'unsupported', diagnostics: [acDiagnostic(error)] } } },
  async run(input, host) {
    const provenance = { engine: AC_ENGINE, projectId: input.project.id, inputRevision: input.project.revision, inputDigest: input.inputDigest, analysisId: input.configuration.id, options: input.configuration.options }
    const finish = (outcome: Awaited<ReturnType<AnalysisEngine<AcResult>['run']>>['outcome']) => freezeSnapshot({ provenance, outcome })
    if (host.signal.aborted) return finish({ kind: 'cancelled' })
    try {
      const { circuit, settings } = prepare(input), total = settings.sweep ? settings.sweep.points + 1 : 1
      if (await analysisDigest({ project: input.project, configuration: input.configuration }) !== input.inputDigest) throw new AcError('AC_DIGEST', '工程/配置与输入摘要不一致，请重新运行。')
      if (host.signal.aborted) return finish({ kind: 'cancelled' })
      host.onProgress(0, total)
      if (host.signal.aborted) return finish({ kind: 'cancelled' })
      const operatingPoint = solveAc(circuit, settings)
      if (!settings.sweep) { host.onProgress(1, 1); return finish({ kind: 'success', value: { operatingPoint } }) }
      const points: SweepPoint[] = []
      for (const [index, f] of sweepFrequencies(settings.sweep).entries()) {
        if (host.signal.aborted) return finish({ kind: 'cancelled' })
        try { points.push(transferAt(solveAc(circuit, settings, f), settings.sweep)) }
        catch (error) { points.push({ kind: 'failed', frequencyHz: f, diagnostic: acDiagnostic(error) }) }
        host.onProgress(index + 2, total)
        if (index % 8 === 7) await new Promise<void>(resolve => setTimeout(resolve, 0))
      }
      if (host.signal.aborted) return finish({ kind: 'cancelled' })
      return finish({ kind: 'success', value: { operatingPoint, sweep: { options: settings.sweep, points, features: sweepFeatures(points, settings.sweep), analyticalReference: analyticalReference(circuit, settings) } } })
    } catch (error) {
      const diagnostics = [acDiagnostic(error)]
      if (error instanceof AcError && error.category === 'unsupported') return finish({ kind: 'unsupported', diagnostics })
      return finish({ kind: 'failure', category: error instanceof AcError ? error.category as 'invalid-input' | 'numerical' | 'resource' : error instanceof DcError ? 'numerical' : 'invalid-input', diagnostics })
    }
  },
}
