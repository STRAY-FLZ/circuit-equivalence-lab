import type { Diagnostic } from '../analysis'

export const TRANSIENT_ENGINE = { id: 'org.stray.engine.transient-mna', version: '1' } as const
export const TRANSIENT_EXTENSION = 'org.stray.transient'
export type TransientKind = 'resistor' | 'capacitor' | 'inductor' | 'voltage-source' | 'current-source'
export type Excitation = { readonly componentId: string; readonly unit: 'V' | 'A' } & (
  | { readonly mode: 'constant'; readonly value: number }
  | { readonly mode: 'step'; readonly initial: number; readonly final: number; readonly atSeconds: number }
  | { readonly mode: 'pulse'; readonly initial: number; readonly final: number; readonly startSeconds: number; readonly endSeconds: number })
export interface InitialCondition { readonly componentId: string; readonly value: number; readonly unit: 'V' | 'A' }
export interface TransientSettings {
  readonly version: 1; readonly method: 'backward-euler-adaptive'
  readonly durationSeconds: number; readonly intervalSeconds: number; readonly relativeTolerance: number
  readonly referenceAnchorId?: string
  readonly sources: readonly Excitation[]; readonly initialConditions: readonly InitialCondition[]
}
export interface TransientElement {
  readonly id: string; readonly reference: string; readonly kind: TransientKind; readonly value: number
  readonly p: string; readonly n: string; readonly fromPinId: string; readonly toPinId: string
}
export interface TransientNode { readonly key: string; readonly name: string; readonly anchorIds: readonly string[] }
export interface TransientCircuit {
  readonly elements: readonly TransientElement[]; readonly nodes: readonly TransientNode[]
  readonly referenceKey: string; readonly referenceAnchorId: string
}
export interface TransientSeries {
  readonly entityId: string; readonly name: string; readonly unit: 'V' | 'A' | 'J'
  readonly quantity: 'node-voltage' | 'branch-voltage' | 'branch-current' | 'stored-energy'
  readonly values: readonly number[]
}
export interface TransientSample {
  readonly voltages: Readonly<Record<string, number>>; readonly currents: Readonly<Record<string, number>>
  readonly energyJ: number; readonly resistorWatts: number; readonly sourceWatts: number
  readonly maxKclAmps: number; readonly backwardError: number
}
export interface TransientResult {
  readonly circuit: TransientCircuit
  readonly axis: { readonly kind: 'uniform-time'; readonly startSeconds: 0; readonly intervalSeconds: number; readonly count: number }
  readonly referenceAnchorId: string; readonly series: readonly TransientSeries[]
  readonly settings: TransientSettings
  readonly checks: {
    readonly linearSolves: number; readonly acceptedSteps: number; readonly rejectedSteps: number
    readonly minimumStepSeconds: number; readonly maximumStepSeconds: number; readonly maxLocalErrorRatio: number
    readonly maxKclAmps: number; readonly maxBackwardError: number; readonly eventTimes: readonly number[]
    readonly initialEnergyJ: number; readonly finalEnergyJ: number; readonly resistorDissipationJ: number
    readonly sourceDeliveredJ: number; readonly numericalDissipationJ: number; readonly energyBalanceErrorJ: number
  }
  readonly diagnostics: readonly Diagnostic[]
}
export class TransientError extends Error {
  constructor(readonly code: string, message: string, readonly entityIds: readonly string[] = [], readonly category: 'invalid-input' | 'numerical' | 'resource' | 'unsupported' = 'invalid-input') { super(message) }
}
