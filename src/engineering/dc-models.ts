import { createId } from './project'
import type { ComponentDefinition } from './types'

export const DC_SOURCES = {
  'voltage-source': { parameter: 'voltage', unit: 'V', value: 5 },
  'current-source': { parameter: 'current', unit: 'A', value: 0.001 },
  vcvs: { parameter: 'gain', unit: '1', value: 2 },
  vccs: { parameter: 'gain', unit: 'S', value: 0.001 },
  ccvs: { parameter: 'gain', unit: 'ohm', value: 100 },
  cccs: { parameter: 'gain', unit: '1', value: 2 },
} as const
export type DcSourceKind = keyof typeof DC_SOURCES
export function createDcSourceDefinition(kind: DcSourceKind): ComponentDefinition {
  const spec = DC_SOURCES[kind], voltageControl = kind === 'vcvs' || kind === 'vccs'
  return {
    id: createId(), resource: { id: `org.stray.component.${kind}`, version: '1' }, kind,
    pins: (voltageControl ? ['1', '2', '3', '4'] : ['1', '2']).map((key, i) => ({ key, name: ['p', 'n', 'cp', 'cn'][i]!, electricalRole: i < 2 ? 'passive' : 'input' })),
    parameters: [
      { key: spec.parameter, kind: 'quantity', unit: spec.unit, required: true },
      ...(kind === 'ccvs' || kind === 'cccs' ? [{ key: 'controlBranchId', kind: 'text' as const, required: true }] : []),
    ],
    modelBindings: [{ analysisFamily: 'electrical', model: { id: `org.stray.model.dc.${kind}`, version: '1' }, portMap: voltageControl ? { p: '1', n: '2', cp: '3', cn: '4' } : { p: '1', n: '2' } }],
  }
}
