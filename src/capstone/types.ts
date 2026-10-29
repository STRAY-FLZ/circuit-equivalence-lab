import type { AnalysisInput } from '../analysis'
import type { EngineeringProject, JsonObject } from '../engineering'

export type CapstoneKind = 'rc' | 'rlc' | 'ce' | 'cs' | 'follower' | 'inverting' | 'noninverting' | 'active-lowpass'
export interface StudyParameter { readonly componentId: string; readonly key: string; readonly unit: string; readonly values: readonly number[] }
export interface StudyMetric { readonly label: string; readonly unit: string; readonly value: number | null; readonly origin: 'simulation' | 'reference' | 'derived' }
export interface StudyCurve { readonly label: string; readonly xUnit: 's' | 'Hz'; readonly yUnit: 'V' | 'A' | 'dB' | '°'; readonly x: readonly number[]; readonly y: readonly (number | null)[] }
export interface StoredCapture { readonly input: AnalysisInput; readonly result: JsonObject }
export interface StudyScenario {
  readonly id: string; readonly requestedValue: number; readonly project: EngineeringProject
  readonly status: 'success' | 'partial' | 'failure' | 'unsupported'
  readonly messages: readonly string[]; readonly captures: readonly StoredCapture[]
  readonly metrics: readonly StudyMetric[]; readonly curves: readonly StudyCurve[]
}
export interface CapstoneStudy {
  readonly version: 1; readonly id: string; readonly kind: CapstoneKind; readonly title: string
  readonly source: EngineeringProject; readonly sourceDigest: string; readonly parameter: StudyParameter
  readonly scenarios: readonly StudyScenario[]; readonly createdAtUtc: string
}
