import type { AcCircuit, AcSolution, SweepPoint } from '../ac'
import type { AnalogSolution, DevicePoint } from '../analog'
import type { ComplexValue } from '../engineering'

export interface AmplifierSettings {
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
export interface AmplifierBias {
  readonly dc: AnalogSolution
  readonly displayNodeVolts: Readonly<Record<string, number>>
  readonly device: DevicePoint
  readonly circuit: AcCircuit
  readonly settings: AmplifierSettings
  readonly modelExplanation: string
}
export interface MidbandFeatures {
  readonly plateau: { readonly fromHz: number; readonly toHz: number; readonly gainDb: number; readonly magnitude: number; readonly samples: number } | null
  readonly lowerHz: number | null; readonly upperHz: number | null; readonly bandwidthHz: number | null
  readonly notes: readonly string[]
}
export interface AmplifierResult {
  readonly bias: AmplifierBias
  readonly single: AcSolution
  readonly points: readonly AmplifierPoint[]
  readonly features: MidbandFeatures
}
export type AmplifierPoint = SweepPoint & { readonly terminalVolts?: readonly ComplexValue[]; readonly terminalAmps?: readonly ComplexValue[]; readonly maxKclAmps?: number; readonly backwardError?: number }
