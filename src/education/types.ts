import type { CircuitNetwork } from '../domain'
import type { EquivalenceResult, TransformCandidate, TransformMetadata } from '../transforms'

export type LessonStepIndex = 0 | 1 | 2 | 3 | 4
export interface VariableMapping { readonly variable: string; readonly elementId: string; readonly resistance: number }
export interface DerivationStep {
  readonly id: string
  readonly title: string
  readonly explanation: string
  readonly conditions: readonly string[]
  readonly formulas: readonly string[]
  readonly substitutions: readonly string[]
  readonly conclusion: string
  readonly commonMistake: string
}
export interface LessonContent {
  readonly id: string
  readonly title: string
  readonly source: CircuitNetwork
  readonly candidate: TransformCandidate
  readonly metadata: TransformMetadata
  readonly verification: EquivalenceResult
  readonly nodeMappings: readonly { readonly alias: string; readonly nodeId: string; readonly pointIds: readonly string[]; readonly terminalLabels: readonly string[] }[]
  readonly variables: readonly VariableMapping[]
  readonly preservedElementIds: readonly string[]
  readonly steps: readonly [DerivationStep, DerivationStep, DerivationStep, DerivationStep, DerivationStep]
}
export type LessonBuildResult = { readonly kind: 'ready'; readonly lesson: LessonContent } | { readonly kind: 'unavailable'; readonly message: string }
