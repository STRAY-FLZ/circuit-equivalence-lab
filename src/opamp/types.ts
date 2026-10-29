import type { AcCircuit, AcSolution, SweepPoint } from '../ac'
import type { DcCircuit, DcSolution } from '../dc'
import type { ComplexValue } from '../engineering'

export interface OpampSettings {
  readonly referenceAnchorId: string
  readonly excitationSourceId: string
  readonly magnitudeRms: number
  readonly phaseDegrees: number
  readonly input: readonly [string, string]
  readonly output: readonly [string, string]
  readonly frequencyHz: number
  readonly startHz: number
  readonly endHz: number
  readonly points: number
  readonly spacing: 'linear' | 'log'
}
export interface OpampModel { readonly id: string; readonly reference: string; readonly plus: string; readonly minus: string; readonly output: string; readonly pinIds: readonly [string, string, string]; readonly gain: number; readonly poleHz: number }
export interface OpampPrepared {
  readonly model: OpampModel
  readonly settings: OpampSettings
  readonly dcCircuit: DcCircuit
  readonly dc: DcSolution
  readonly passive: AcCircuit
  readonly dynamic: AcCircuit
  readonly betaDc: number
  readonly dcTransfer: number
  readonly idealDcOutput: number | null
}
export interface OpampResult {
  readonly prepared: OpampPrepared
  readonly single: AcSolution
  readonly points: readonly SweepPoint[]
  readonly openLoop: readonly SweepPoint[]
  readonly loop: readonly SweepPoint[]
  readonly unityHz: number | null
  readonly approximateGbwHz: number
  readonly bandwidthHz: number | null
  readonly crossoverHz: number | null
  readonly phaseMarginDegrees: number | null
  readonly notes: readonly string[]
  readonly betaAtFrequency?: ComplexValue
}
