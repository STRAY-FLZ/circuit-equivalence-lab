import type { ElementId, ResistanceOhms, TerminalId } from '../domain'
import type { ElectricalNodeId, TopologyResult } from '../topology'

export interface ResistanceQuery {
  readonly topology: TopologyResult
  readonly terminals: readonly [TerminalId, TerminalId]
}

export interface BranchSolution {
  readonly id: ElementId
  /** Positive from the original first endpoint to the second endpoint. */
  readonly currentAmps: number
  readonly voltageDropVolts: number
}

export interface NumericalDiagnostics {
  readonly referenceNodeId: ElectricalNodeId
  readonly testCurrentAmps: 1
  readonly resistanceScaleOhms: number
  readonly reciprocalConditionEstimate: number
  readonly relativeResidual: number
  readonly maxKclResidualAmps: number
  readonly kclTolerance: number
}

export interface FiniteResistanceResult {
  readonly kind: 'finite'
  readonly resistance: ResistanceOhms
  /** Only nodes in the excited component; the reference is exactly zero volts. */
  readonly nodeVoltages: Readonly<Partial<Record<ElectricalNodeId, number>>>
  readonly branches: readonly BranchSolution[]
  readonly diagnostics: NumericalDiagnostics
}

export type SolverErrorCode = 'unknown-terminal' | 'invalid-topology' | 'numerical-failure' | 'size-limit'

export type EquivalentResistanceResult =
  | FiniteResistanceResult
  | { readonly kind: 'short-circuit'; readonly resistance: 0 }
  | { readonly kind: 'open-circuit' }
  | { readonly kind: 'error'; readonly code: SolverErrorCode; readonly message: string }

export type ResistanceSolver = (
  topology: TopologyResult, terminalAId: TerminalId, terminalBId: TerminalId,
) => EquivalentResistanceResult
