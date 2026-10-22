import type { DcOutput } from '../analysis/types'
export type ElementKind = 'resistor' | 'voltage-source' | 'current-source' | 'vcvs' | 'vccs' | 'ccvs' | 'cccs'
export interface DcElement {
  readonly id: string; readonly reference: string; readonly kind: ElementKind
  readonly p: string; readonly n: string; readonly cp?: string; readonly cn?: string
  readonly fromPinId: string; readonly toPinId: string
  readonly value: number; readonly controlBranchId?: string
}
export interface DcNode { readonly key: string; readonly name: string; readonly anchorIds: readonly string[]; readonly pinIds: readonly string[] }
export interface DcCircuit { readonly nodes: readonly DcNode[]; readonly elements: readonly DcElement[]; readonly referenceKey: string; readonly referenceAnchorId: string }
export interface DcUnknown { readonly name: string; readonly unit: 'V' | 'A'; readonly entityIds: readonly string[] }
export interface DcSolution extends DcOutput {
  readonly nodes: readonly (DcNode & { readonly volts: number; readonly kclAmps: number })[]
  readonly branches: readonly (DcElement & { readonly volts: number; readonly amps: number; readonly watts: number })[]
  readonly equations: { readonly unknowns: readonly DcUnknown[]; readonly rows: readonly { readonly name: string; readonly unit: 'A' | 'V' }[]; readonly matrix: readonly (readonly number[])[]; readonly rhs: readonly number[]; readonly solution: readonly number[] }
  readonly checks: { readonly backwardError: number; readonly pivotRatio: number; readonly maxKclAmps: number; readonly absorbedWatts: number; readonly deliveredWatts: number; readonly powerImbalanceWatts: number }
}
export class DcError extends Error {
  constructor(readonly code: string, message: string, readonly entityIds: readonly string[] = [], readonly category: 'invalid-input' | 'numerical' | 'resource' | 'unsupported' = 'invalid-input') { super(message) }
}
