export class AnalogError extends Error {
  constructor(readonly code: string, message: string, readonly category: 'invalid-input' | 'numerical' | 'unsupported' | 'resource' = 'invalid-input') { super(message) }
}
export interface AnalogElement {
  readonly id: string; readonly reference: string; readonly kind: 'resistor' | 'voltage-source' | 'current-source' | 'diode' | 'npn' | 'nmos' | 'ideal-opamp'
  readonly nodes: readonly string[]; readonly pinIds: readonly string[]; readonly parameters: Readonly<Record<string, number>>
}
export interface AnalogCircuit {
  readonly referenceAnchorId: string; readonly referenceKey: string
  readonly nodes: readonly { readonly key: string; readonly anchorIds: readonly string[] }[]
  readonly elements: readonly AnalogElement[]
}
export interface DevicePoint {
  readonly componentId: string; readonly reference: string; readonly kind: AnalogElement['kind']; readonly region: string
  /** Current into EACH device terminal in the pinned model's port order. */
  readonly terminalAmps: readonly number[]; readonly terminalVolts: readonly number[]
  readonly gm?: number; readonly gd?: number; readonly gds?: number; readonly rpi?: number
  readonly perturbationLimitVolts?: number
}
export interface AnalogSolution {
  readonly circuit: AnalogCircuit; readonly nodeVolts: Readonly<Record<string, number>>
  readonly devices: readonly DevicePoint[]; readonly iterations: number
  readonly maxKclAmps: number; readonly maxConstraintVolts: number
  readonly feedbackFactor?: number
}
