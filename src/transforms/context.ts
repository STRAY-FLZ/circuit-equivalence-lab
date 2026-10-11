import { createCircuitNetwork } from '../domain'
import type { CircuitNetwork } from '../domain'
import { analyzeTopology } from '../topology'
import type { NormalizedResistor } from '../topology'
import type { TransformOptions } from './types'

export const compareIds = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0
export const pairKey = (a: string, b: string): string => JSON.stringify([a, b].sort(compareIds))

export function prepare(network: CircuitNetwork, options: TransformOptions) {
  const snapshot = createCircuitNetwork(network)
  const topology = analyzeTopology(snapshot)
  const protectedNodes = new Set(Object.values(topology.terminalToNode))
  for (const id of options.protectedPointIds ?? []) {
    const node = topology.pointToNode[id]
    if (node === undefined) throw new TypeError(`Unknown protected connection point "${id}".`)
    protectedNodes.add(node)
  }
  const active = topology.resistors.filter(branch => !branch.isShortCircuited)
  const incident = new Map<string, NormalizedResistor[]>()
  const parallel = new Map<string, NormalizedResistor[]>()
  for (const branch of active) {
    for (const id of branch.nodeIds) {
      const list = incident.get(id) ?? []
      list.push(branch)
      incident.set(id, list)
    }
    const key = pairKey(...branch.nodeIds)
    const list = parallel.get(key) ?? []
    list.push(branch)
    parallel.set(key, list)
  }
  return { snapshot, topology, active, incident, parallel, protectedNodes }
}

export type TransformContext = ReturnType<typeof prepare>

export function invalidInput(error: unknown) {
  if (!(error instanceof TypeError) && !(error instanceof RangeError)) throw error
  return Object.freeze({ kind: 'error' as const, code: 'invalid-input' as const, message: error.message })
}
