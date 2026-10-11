import { createCircuitNetwork } from '../domain'
import type { CircuitNetwork, ConnectionPointId, ElementId } from '../domain'
import { DisjointSet } from './disjoint-set'
import type { ElectricalNodeId, NormalizedResistor, TopologyResult } from './types'

function compareIds(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0
}

function canonicalGroups(sets: DisjointSet, ids: readonly string[]) {
  const groups = new Map<string, { id: string; members: string[] }>()
  for (const id of ids.toSorted(compareIds)) {
    const root = sets.find(id)
    const group = groups.get(root)
    if (group) group.members.push(id)
    else groups.set(root, { id, members: [id] })
  }
  return [...groups.values()].sort((first, second) => compareIds(first.id, second.id))
}

function emptyLookup(): Record<string, string> {
  // A null prototype handles IDs such as __proto__, constructor and toString safely.
  return Object.create(null) as Record<string, string>
}

/** Normalize a validated snapshot using only declared connectivity, never geometry. */
export function analyzeTopology(input: CircuitNetwork): TopologyResult {
  const network = createCircuitNetwork(input)
  const pointIds = network.points.map((point) => point.id)
  const wireSets = new DisjointSet(pointIds)
  for (const element of network.elements) {
    if (element.kind === 'wire') wireSets.union(...element.endpoints)
  }

  const pointToNode = emptyLookup()
  const nodes = canonicalGroups(wireSets, pointIds).map((group) => {
    const id = `node:${group.id}`
    for (const pointId of group.members) pointToNode[pointId] = id
    return Object.freeze({ id, pointIds: Object.freeze(group.members) })
  })

  function nodeForPoint(pointId: ConnectionPointId): ElectricalNodeId {
    const nodeId = pointToNode[pointId]
    if (nodeId === undefined) throw new Error(`Missing node for validated point: ${pointId}`)
    return nodeId
  }

  const resistors = network.elements
    .filter((element) => element.kind === 'resistor')
    .map((resistor): NormalizedResistor => {
      const nodeIds: readonly [ElectricalNodeId, ElectricalNodeId] = [
        nodeForPoint(resistor.endpoints[0]), nodeForPoint(resistor.endpoints[1]),
      ]
      return Object.freeze({
        id: resistor.id,
        nodeIds: Object.freeze(nodeIds),
        resistance: resistor.resistance,
        isShortCircuited: nodeIds[0] === nodeIds[1],
      })
    })
    .sort((first, second) => compareIds(first.id, second.id))

  const terminalToNode = emptyLookup()
  for (const terminal of network.terminals.toSorted((first, second) => compareIds(first.id, second.id))) {
    terminalToNode[terminal.id] = nodeForPoint(terminal.pointId)
  }

  // This second DSU groups nodes through resistors; it must not change electrical nodes.
  const nodeIds = nodes.map((node) => node.id)
  const componentSets = new DisjointSet(nodeIds)
  for (const resistor of resistors) {
    if (!resistor.isShortCircuited) componentSets.union(...resistor.nodeIds)
  }

  const resistorsByRoot = new Map<string, ElementId[]>()
  for (const resistor of resistors) {
    const root = componentSets.find(resistor.nodeIds[0])
    const members = resistorsByRoot.get(root)
    if (members) members.push(resistor.id)
    else resistorsByRoot.set(root, [resistor.id])
  }

  const nodeToComponent = emptyLookup()
  const components = canonicalGroups(componentSets, nodeIds).map((group) => {
    const id = `component:${group.id}`
    for (const nodeId of group.members) nodeToComponent[nodeId] = id
    return Object.freeze({
      id,
      nodeIds: Object.freeze(group.members),
      resistorIds: Object.freeze(resistorsByRoot.get(componentSets.find(group.id)) ?? []),
    })
  })

  return Object.freeze({
    networkId: network.id,
    nodes: Object.freeze(nodes),
    pointToNode: Object.freeze(pointToNode),
    resistors: Object.freeze(resistors),
    terminalToNode: Object.freeze(terminalToNode),
    components: Object.freeze(components),
    nodeToComponent: Object.freeze(nodeToComponent),
  })
}
