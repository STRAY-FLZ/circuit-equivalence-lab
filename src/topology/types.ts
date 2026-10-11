import type { CircuitNetwork, ConnectionPointId, ElementId, ResistanceOhms, TerminalId } from '../domain'

/** `node:` followed by the smallest member point ID in UTF-16 code-unit order. */
export type ElectricalNodeId = string

/** `component:` followed by the smallest member electrical-node ID. */
export type ResistiveComponentId = string

export interface ElectricalNode {
  readonly id: ElectricalNodeId
  readonly pointIds: readonly ConnectionPointId[]
}

export interface NormalizedResistor {
  readonly id: ElementId
  /** Preserve the endpoint order of the original resistor. */
  readonly nodeIds: readonly [ElectricalNodeId, ElectricalNodeId]
  readonly resistance: ResistanceOhms
  readonly isShortCircuited: boolean
}

export interface ResistiveComponent {
  readonly id: ResistiveComponentId
  readonly nodeIds: readonly ElectricalNodeId[]
  /** Includes short-circuited self-loops for traceability. */
  readonly resistorIds: readonly ElementId[]
}

export interface TopologyResult {
  readonly networkId: CircuitNetwork['id']
  readonly nodes: readonly ElectricalNode[]
  readonly pointToNode: Readonly<Partial<Record<ConnectionPointId, ElectricalNodeId>>>
  readonly resistors: readonly NormalizedResistor[]
  readonly terminalToNode: Readonly<Partial<Record<TerminalId, ElectricalNodeId>>>
  readonly components: readonly ResistiveComponent[]
  readonly nodeToComponent: Readonly<Partial<Record<ElectricalNodeId, ResistiveComponentId>>>
}

/** Throws TypeError/RangeError for invalid domain data; never performs numerical solving. */
export type TopologyAnalyzer = (network: CircuitNetwork) => TopologyResult
