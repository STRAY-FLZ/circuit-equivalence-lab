import { analysisDigest } from '../analysis/snapshot'
import type { AnalysisEngine, AnalysisInput, AnalysisResult } from '../analysis'
import { createEngineeringProject, createId, freezeSnapshot, ANALOG_DEVICES } from '../engineering'
import { resolveAnalogCircuit } from './circuit'
import { solveAnalog } from './mna'
import { AnalogError } from './types'
import type { AnalogSolution } from './types'

export async function createAnalogInput(project: AnalysisInput['project'], sheetId: string, referenceAnchorId?: string): Promise<AnalysisInput> {
  const opamp = project.sheets.find(s => s.id === sheetId)?.components.some(c => project.definitions.find(d => d.id === c.definitionId)?.modelBindings.some(b => b.model.id === 'org.stray.model.analog.ideal-opamp'))
  const input = { project: createEngineeringProject(project), configuration: { id: createId(), analysisType: opamp ? 'analog.ideal-opamp' : 'analog.operating-point', preferredEngine: { id: opamp ? 'org.stray.engine.ideal-opamp' : 'org.stray.engine.analog-dc', version: '1' }, scope: { kind: 'circuit' as const, sheetIds: [sheetId] }, options: referenceAnchorId ? { referenceAnchorId } : {} } }
  return freezeSnapshot({ ...input, inputDigest: await analysisDigest(input) })
}
const diagnostic = (error: unknown) => ({ code: error instanceof AnalogError ? error.code : 'ANALOG_NUMERICAL', severity: 'error' as const, message: error instanceof Error ? error.message : '模拟分析失败。', entityIds: [] })
function provider(opamp: boolean): AnalysisEngine<AnalogSolution> {
  const resource = { id: opamp ? 'org.stray.engine.ideal-opamp' : 'org.stray.engine.analog-dc', version: '1' }
  return {
    descriptor: { resource, family: 'electrical', execution: 'main-thread', analysisTypes: [opamp ? 'analog.ideal-opamp' : 'analog.operating-point'], modelVersions: Object.keys(ANALOG_DEVICES).map(k => ({ id: `org.stray.model.analog.${k}`, version: '1' })) },
    inspect(input) { try { if (input.configuration.preferredEngine?.id !== resource.id) throw new AnalogError('ANALOG_PROVIDER', '请选择匹配的分析引擎。', 'unsupported'); resolveAnalogCircuit(input); return { kind: 'supported', diagnostics: [] } } catch (e) { return { kind: 'unsupported', diagnostics: [diagnostic(e)] } } },
    async run(input, host): Promise<AnalysisResult<AnalogSolution>> {
      const provenance = { engine: resource, projectId: input.project.id, inputRevision: input.project.revision, inputDigest: input.inputDigest, analysisId: input.configuration.id, options: input.configuration.options }
      const result = (outcome: AnalysisResult<AnalogSolution>['outcome']) => freezeSnapshot({ provenance, outcome })
      if (host.signal.aborted) return result({ kind: 'cancelled' })
      try {
        if (input.configuration.preferredEngine?.id !== resource.id) throw new AnalogError('ANALOG_PROVIDER', '分析引擎不匹配。', 'unsupported')
        if (input.inputDigest !== await analysisDigest({ project: input.project, configuration: input.configuration })) throw new AnalogError('ANALOG_DIGEST', '工程摘要不匹配；请重新运行。')
        const circuit = resolveAnalogCircuit(input); host.onProgress(0, 1)
        if (host.signal.aborted) return result({ kind: 'cancelled' })
        const value = solveAnalog(circuit, host.signal)
        host.onProgress(1, 1); return result({ kind: 'success', value })
      } catch (e) { return host.signal.aborted ? result({ kind: 'cancelled' }) : e instanceof AnalogError && e.category === 'unsupported' ? result({ kind: 'unsupported', diagnostics: [diagnostic(e)] }) : result({ kind: 'failure', category: e instanceof AnalogError && e.category !== 'unsupported' ? e.category : 'numerical', diagnostics: [diagnostic(e)] }) }
    },
  }
}
export const analogEngine = provider(false)
export const idealOpampEngine = provider(true)
