import type { AcOutput, Diagnostic } from '../analysis'
import type { Complex } from './complex'
export type AcKind = 'resistor' | 'capacitor' | 'inductor' | 'voltage-source' | 'current-source' | 'vcvs' | 'vccs' | 'ccvs' | 'cccs'
export type AcSource = { readonly componentId: string; readonly magnitudeRms: number; readonly phaseDegrees: number }
export type SweepOptions = {
  readonly startHz: number; readonly endHz: number; readonly points: number; readonly spacing: 'log' | 'linear'
  readonly excitationSourceId: string; readonly input: readonly [string, string]; readonly output: readonly [string, string]
  readonly passband: 'low' | 'high' | 'peak'
}
export type AcSettings = { readonly frequencyHz: number; readonly referenceAnchorId?: string; readonly sources: readonly AcSource[]; readonly sweep?: SweepOptions }
export interface AcElement {
  readonly id: string; readonly reference: string; readonly kind: AcKind; readonly value: number
  readonly p: string; readonly n: string; readonly cp?: string; readonly cn?: string; readonly controlBranchId?: string
  readonly fromPinId: string; readonly toPinId: string
}
export interface AcNode { readonly key: string; readonly name: string; readonly anchorIds: readonly string[]; readonly pinIds: readonly string[] }
export interface AcCircuit { readonly elements: readonly AcElement[]; readonly nodes: readonly AcNode[]; readonly anchorToNet: Readonly<Record<string, string>>; readonly referenceAnchorId: string; readonly referenceKey: string }
export interface AcPhasor { readonly value: Complex; readonly magnitudeRms: number; readonly phaseDegrees: number | null }
export interface AcSolution extends AcOutput {
  readonly nodes: readonly (AcNode & AcPhasor & { readonly kclAmps: Complex })[]
  readonly branches: readonly (AcElement & { readonly voltage: AcPhasor; readonly current: AcPhasor; readonly impedance: Complex | null; readonly admittance: Complex | null; readonly power: { readonly realWatts: number; readonly reactiveVars: number; readonly apparentVA: number } })[]
  readonly equations: { readonly matrix: readonly (readonly Complex[])[]; readonly rhs: readonly Complex[]; readonly solution: readonly Complex[]; readonly unknowns: readonly { readonly name: string; readonly unit: 'V' | 'A'; readonly entityIds: readonly string[] }[]; readonly rows: readonly { readonly name: string; readonly unit: 'V' | 'A' }[] }
  readonly checks: { readonly complexBackwardError: number; readonly scaledPivotRatio: number; readonly maxKclAmps: number; readonly powerImbalance: Complex }
}
export type SweepPoint = { readonly frequencyHz: number } & (
  | { readonly kind: 'available'; readonly transfer: Complex; readonly magnitude: number; readonly gainDb: number | null; readonly phaseDegrees: number | null }
  | { readonly kind: 'failed'; readonly diagnostic: Diagnostic })
export interface SweepResult {
  readonly options: SweepOptions; readonly points: readonly SweepPoint[]
  readonly analyticalReference: { readonly frequencyHz: number; readonly description: string } | null
  readonly features: { readonly sampledPeak: { readonly frequencyHz: number; readonly gainDb: number } | null; readonly halfPowerCrossingsHz: readonly number[]; readonly estimatedBandwidthHz: number | null; readonly notes: readonly string[] }
}
export interface AcResult { readonly operatingPoint: AcSolution; readonly sweep?: SweepResult }
export class AcError extends Error {
  constructor(readonly code: string, message: string, readonly entityIds: readonly string[] = [], readonly category: 'invalid-input' | 'numerical' | 'resource' | 'unsupported' = 'invalid-input') { super(message) }
}
