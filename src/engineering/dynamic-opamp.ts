import { createId } from './project'
import type { ComponentDefinition, ParameterValue } from './types'

/** A separate teaching model; an ideal-opamp definition is never upgraded. */
export const DYNAMIC_OPAMP = { title: '单极点运放 · 有限增益', prefix: 'U', parameter: 'openLoopGain', unit: '1', value: 100000 } as const
export function dynamicOpampDefaults(): Readonly<Record<string, ParameterValue>> {
  return { openLoopGain: { kind: 'quantity', quantity: { value: 100000, unit: '1' } }, poleHz: { kind: 'quantity', quantity: { value: 10, unit: 'Hz' } } }
}
export function createDynamicOpampDefinition(): ComponentDefinition {
  const pins = ['+', '-', 'OUT']
  return { id: createId(), resource: { id: 'org.stray.component.dynamic-opamp', version: '1' }, kind: 'dynamic-opamp',
    pins: pins.map(key => ({ key, name: key, electricalRole: key === 'OUT' ? 'output' : 'input' })),
    parameters: [{ key: 'openLoopGain', kind: 'quantity', unit: '1', required: true }, { key: 'poleHz', kind: 'quantity', unit: 'Hz', required: true }],
    modelBindings: [{ analysisFamily: 'electrical', model: { id: 'org.stray.model.opamp.single-pole', version: '1' }, portMap: { '+': '+', '-': '-', OUT: 'OUT' } }],
  }
}
