import { createEngineeringProject, createId, DC_SOURCES, freezeSnapshot } from '../engineering'
import type { EngineeringProject } from '../engineering'
import type { AnalysisEngine, AnalysisInput, AnalysisResult, Diagnostic } from '../analysis/types'
import { resolveDcCircuit } from './circuit'
import { solveDc } from './mna'
import { DcError } from './types'
import type { DcSolution } from './types'

const resource = { id: 'org.stray.engine.dc-mna', version: '1' } as const
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
  return JSON.stringify(value)
}
async function digest(input: Omit<AnalysisInput, 'inputDigest'>): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(input))
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')
}
export async function createDcInput(project: EngineeringProject, sheetId: string, referenceAnchorId?: string): Promise<AnalysisInput> {
  const input = { project: createEngineeringProject(project), configuration: { id: createId(), analysisType: 'dc.operating-point', preferredEngine: resource, scope: { kind: 'circuit' as const, sheetIds: [sheetId] }, options: referenceAnchorId ? { referenceAnchorId } : {} } }
  return freezeSnapshot({ ...input, inputDigest: await digest(input) })
}
function diagnostic(error: unknown): Diagnostic {
  return error instanceof DcError ? { code: error.code, severity: 'error', message: error.message, entityIds: error.entityIds } : { code: 'DC_INVALID_PROJECT', severity: 'error', message: error instanceof Error ? error.message : '工程无效。', entityIds: [] }
}
export const dcEngine: AnalysisEngine<DcSolution> = {
  descriptor: { resource, family: 'electrical', analysisTypes: ['dc.operating-point'], execution: 'main-thread', modelVersions: [{ id: 'org.stray.model.resistor', version: '1' }, ...Object.keys(DC_SOURCES).map(k => ({ id: `org.stray.model.dc.${k}`, version: '1' }))] },
  inspect(input) {
    try {
      if (!/^[0-9a-f]{64}$/.test(input.inputDigest)) throw new DcError('DC_DIGEST', '输入摘要格式无效。')
      resolveDcCircuit(input)
      return { kind: 'supported', diagnostics: [] }
    } catch (error) { return { kind: 'unsupported', diagnostics: [diagnostic(error)] } }
  },
  async run(input, host): Promise<AnalysisResult<DcSolution>> {
    const provenance = { engine: resource, projectId: input.project.id, inputRevision: input.project.revision, inputDigest: input.inputDigest, analysisId: input.configuration.id, options: input.configuration.options }
    const result = (outcome: AnalysisResult<DcSolution>['outcome']): AnalysisResult<DcSolution> => freezeSnapshot({ provenance, outcome })
    if (host.signal.aborted) return result({ kind: 'cancelled' })
    try {
      host.onProgress(0, 3)
      const circuit = resolveDcCircuit(input)
      if (await digest({ project: input.project, configuration: input.configuration }) !== input.inputDigest) throw new DcError('DC_DIGEST', '输入摘要与工程快照不一致，请重新创建分析输入。')
      if (host.signal.aborted) return result({ kind: 'cancelled' })
      host.onProgress(1, 3)
      const value = solveDc(circuit)
      if (host.signal.aborted) return result({ kind: 'cancelled' })
      host.onProgress(3, 3)
      return result({ kind: 'success', value })
    } catch (error) {
      const diagnostics = [diagnostic(error)]
      return error instanceof DcError && error.category === 'unsupported' ? result({ kind: 'unsupported', diagnostics }) : result({ kind: 'failure', category: error instanceof DcError ? error.category as 'invalid-input' | 'numerical' | 'resource' : 'invalid-input', diagnostics })
    }
  },
}
