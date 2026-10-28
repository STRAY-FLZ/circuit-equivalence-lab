import { createId } from './project'
import type { ComponentDefinition, ParameterValue } from './types'

/** Introductory pinned models, not commercial part numbers or SPICE libraries. */
export const ANALOG_DEVICES = {
  diode: { title: '二极管 · Shockley', prefix: 'D', parameter: 'saturationCurrent', unit: 'A', value: 1e-12, pins: ['A', 'K'], params: { saturationCurrent: [1e-12, 'A'], ideality: [1, '1'], temperature: [300, 'K'], reverseLimit: [5, 'V'] } },
  npn: { title: 'NPN · 入门模型', prefix: 'Q', parameter: 'beta', unit: '1', value: 100, pins: ['B', 'C', 'E'], params: { beta: [100, '1'], saturationCurrent: [1e-15, 'A'], temperature: [300, 'K'], saturationVoltage: [.2, 'V'] } },
  nmos: { title: 'nMOS · 长沟道', prefix: 'M', parameter: 'threshold', unit: 'V', value: 1, pins: ['G', 'D', 'S'], params: { threshold: [1, 'V'], transconductance: [.001, 'A/V^2'] } },
  'ideal-opamp': { title: '理想运放 · 负反馈', prefix: 'U', parameter: 'modelVersion', unit: '1', value: 1, pins: ['+', '-', 'OUT'], params: { modelVersion: [1, '1'] } },
} as const
export type AnalogKind = keyof typeof ANALOG_DEVICES
const parameterSpecs = (kind: AnalogKind): Readonly<Record<string, readonly [number, string]>> => ANALOG_DEVICES[kind].params
export function analogDefaults(kind: AnalogKind): Readonly<Record<string, ParameterValue>> {
  return Object.fromEntries(Object.entries(parameterSpecs(kind)).map(([key, [value, unit]]) => [key, { kind: 'quantity', quantity: { value, unit } }]))
}
export function createAnalogDefinition(kind: AnalogKind): ComponentDefinition {
  const spec = ANALOG_DEVICES[kind]
  return { id: createId(), resource: { id: `org.stray.component.${kind}`, version: '1' }, kind,
    pins: spec.pins.map(key => ({ key, name: key, electricalRole: 'passive' })),
    parameters: Object.entries(parameterSpecs(kind)).map(([key, [, unit]]) => ({ key, kind: 'quantity', unit, required: true })),
    modelBindings: [{ analysisFamily: 'electrical', model: { id: `org.stray.model.analog.${kind}`, version: '1' }, portMap: Object.fromEntries(spec.pins.map(key => [key, key])) }],
  }
}
