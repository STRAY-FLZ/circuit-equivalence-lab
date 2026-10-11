import type { CircuitElement, CircuitNetwork, ConnectionPointId } from '../domain'
import type { TopologyResult } from '../topology'

export interface Position { readonly x: number; readonly y: number }
export interface CircuitLayout { readonly pointPositions: Readonly<Partial<Record<ConnectionPointId, Position>>> }
/** Structural presentation input; App adapts M3 metadata without a reverse dependency. */
export interface LayoutTransition {
  readonly previous: CircuitLayout
  readonly createdPointIds: readonly string[]
  readonly boundaryPointIds: readonly string[]
}
export interface DrawnElement {
  readonly element: CircuitElement
  readonly route: readonly Position[]
  readonly center: Position
  readonly angle: number
  readonly labelPosition: Position
  readonly labelAnchor: 'start' | 'middle'
  readonly shorted: boolean
}
export interface CircuitViewModel {
  readonly network: CircuitNetwork
  readonly topology: TopologyResult
  readonly layout: CircuitLayout
  readonly elements: readonly DrawnElement[]
  readonly residualPointIds: readonly string[]
  readonly width: number
  readonly height: number
}
export type DrawingResult = { readonly kind: 'ready'; readonly model: CircuitViewModel }
  | { readonly kind: 'unsupported'; readonly message: string }
