import type { CircuitNetwork, ConnectionPointId, ElementId, Resistor, TerminalId } from '../domain'
import type { ElectricalNodeId } from '../topology'

export type TransformType = 'series' | 'parallel' | 'delta-to-star' | 'star-to-delta'

export interface TransformOptions {
  /** Protect the entire electrical node containing each declared connection point. */
  readonly protectedPointIds?: readonly ConnectionPointId[]
}

export interface TransformCandidate {
  /** JSON encoding of [type, sorted resistor IDs]; revalidated on application. */
  readonly id: string
  readonly type: TransformType
  readonly elementIds: readonly ElementId[]
  readonly boundaryNodeIds: readonly ElectricalNodeId[]
  readonly internalNodeId: ElectricalNodeId | null
}

export type DiscoveryResult =
  | { readonly kind: 'candidates'; readonly candidates: readonly TransformCandidate[] }
  | { readonly kind: 'error'; readonly code: 'invalid-input'; readonly message: string }

export interface TransformRequest extends TransformOptions {
  readonly network: CircuitNetwork
  readonly type: TransformType
  readonly elementIds: readonly ElementId[]
}

export interface TransformMetadata {
  readonly type: TransformType
  readonly candidateId: string
  readonly originalResistorIds: readonly ElementId[]
  readonly replacementResistorIds: readonly ElementId[]
  /** Full immutable records retain resistance, original endpoints, and provenance. */
  readonly originals: readonly Resistor[]
  readonly replacements: readonly Resistor[]
  readonly affectedNodeIds: readonly ElectricalNodeId[]
  readonly boundaryNodeIds: readonly ElectricalNodeId[]
  readonly createdNodeIds: readonly ElectricalNodeId[]
  readonly removedNodeIds: readonly ElectricalNodeId[]
  readonly retainedInternalNodeIds: readonly ElectricalNodeId[]
  readonly createdPointIds: readonly ConnectionPointId[]
  readonly removedPointIds: readonly ConnectionPointId[]
  readonly formula: string
}

export type TransformResult =
  | { readonly kind: 'applied'; readonly network: CircuitNetwork; readonly metadata: TransformMetadata }
  | { readonly kind: 'not-applicable'; readonly reason: string }
  | { readonly kind: 'error'; readonly code: 'invalid-input' | 'numerical-failure'; readonly message: string }

export type CircuitTransform = (request: TransformRequest) => TransformResult

export interface EquivalenceOptions {
  readonly relativeTolerance?: number
  readonly absoluteToleranceOhms?: number
}

export type ResistanceSummary =
  | { readonly kind: 'finite'; readonly resistance: number }
  | { readonly kind: 'short-circuit'; readonly resistance: 0 }
  | { readonly kind: 'open-circuit' }
  | { readonly kind: 'error'; readonly code: string; readonly message: string }

export interface TerminalComparison {
  readonly terminals: readonly [TerminalId, TerminalId]
  readonly before: ResistanceSummary
  readonly after: ResistanceSummary
  readonly verdict: 'equivalent' | 'different' | 'inconclusive'
}

export interface EquivalenceResult {
  readonly kind: 'equivalent' | 'different' | 'inconclusive'
  readonly reason: string
  readonly pairs: readonly TerminalComparison[]
}
