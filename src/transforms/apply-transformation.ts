import { createCircuitNetwork } from '../domain'
import type { CircuitNetwork, ResistanceOhms, Resistor } from '../domain'
import type { NormalizedResistor } from '../topology'
import { validateSelection } from './candidates'
import { compareIds, invalidInput, prepare } from './context'
import { deltaLeg, parallel, series, starEdge, TransformationNumericalError } from './formulas'
import type { TransformMetadata, TransformRequest, TransformResult } from './types'

function allocateIds(network: CircuitNetwork): () => string {
  const ids = [network.id, ...network.points.map(p => p.id), ...network.elements.map(e => e.id), ...network.terminals.map(t => t.id)]
  let counter = 0n
  for (const id of ids) {
    const match = /^m3:(0|[1-9]\d*)$/.exec(id)
    if (match?.[1] !== undefined) {
      const value = BigInt(match[1])
      if (value > counter) counter = value
    }
  }
  // One namespace for all generated IDs; start above every ID in the input, even removed IDs.
  return () => `m3:${++counter}`
}

export function applyTransformation(request: TransformRequest): TransformResult {
  try {
    const context = prepare(request.network, request)
    const candidate = validateSelection(context, request.type, request.elementIds)
    if (!candidate) return Object.freeze({ kind: 'not-applicable', reason: 'Selection is missing, shorted, duplicated, structurally invalid, or crosses a terminal/protected center.' })
    const selectedIds = new Set(candidate.elementIds)
    const selected = context.active.filter(branch => selectedIds.has(branch.id))
    const originals = context.snapshot.elements.filter((element): element is Resistor => element.kind === 'resistor' && selectedIds.has(element.id))
      .toSorted((a, b) => compareIds(a.id, b.id))
    const nodes = new Map(context.topology.nodes.map(node => [node.id, node]))
    const pointFor = (id: string): string => {
      const point = nodes.get(id)?.pointIds[0]
      if (point === undefined) throw new Error(`Missing validated node ${id}`)
      return point
    }
    const nextId = allocateIds(context.snapshot)
    const createdPointIds: string[] = []
    const replacements: Resistor[] = []
    const add = (a: string, b: string, resistance: ResistanceOhms) => {
      replacements.push(Object.freeze({ id: nextId(), kind: 'resistor', endpoints: Object.freeze([a, b] as const), resistance }))
    }
    const required = <T>(value: T | undefined): T => {
      if (value === undefined) throw new Error('Incomplete validated transformation')
      return value
    }
    const boundary = candidate.boundaryNodeIds
    let formula: string
    switch (candidate.type) {
      case 'series':
      case 'parallel': {
        const values = selected.map(branch => branch.resistance)
        add(pointFor(required(boundary[0])), pointFor(required(boundary[1])), candidate.type === 'series' ? series(values) : parallel(values))
        formula = candidate.type === 'series' ? 'R_eq = R_1 + R_2' : '1/R_eq = sum_i(1/R_i)'
        break
      }
      case 'delta-to-star': {
        const centerPoint = nextId()
        createdPointIds.push(centerPoint)
        for (const node of boundary) {
          const arms = selected.filter(branch => branch.nodeIds.includes(node))
          add(pointFor(node), centerPoint, deltaLeg(required(arms[0]).resistance, required(arms[1]).resistance, selected.map(branch => branch.resistance)))
        }
        formula = 'S = R_AB + R_BC + R_CA; R_A = R_AB*R_CA/S; R_B = R_AB*R_BC/S; R_C = R_BC*R_CA/S'
        break
      }
      case 'star-to-delta': {
        const arm = (node: string): NormalizedResistor => required(selected.find(branch => branch.nodeIds.includes(node)))
        for (let i = 0; i < boundary.length; i++) {
          const a = required(boundary[i])
          for (const b of boundary.slice(i + 1)) {
            const opposite = required(boundary.find(id => id !== a && id !== b))
            add(pointFor(a), pointFor(b), starEdge(arm(a).resistance, arm(b).resistance, arm(opposite).resistance))
          }
        }
        formula = 'P = R_A*R_B + R_B*R_C + R_C*R_A; R_AB = P/R_C; R_BC = P/R_A; R_CA = P/R_B'
        break
      }
    }
    const elements = [...context.snapshot.elements.filter(element => !selectedIds.has(element.id)), ...replacements]
    // All ideal wires and unselected resistors remain intact. Remove only newly orphaned
    // internal points; a wire group or shorted self-loop keeps its internal node alive.
    const referenced = new Set([...elements.flatMap(element => element.endpoints), ...context.snapshot.terminals.map(t => t.pointId)])
    const centerPoints = candidate.internalNodeId === null ? [] : required(nodes.get(candidate.internalNodeId)).pointIds
    const removedPointIds = centerPoints.filter(id => !referenced.has(id))
    const removedPoints = new Set(removedPointIds)
    const network = createCircuitNetwork({
      ...context.snapshot,
      points: [...context.snapshot.points.filter(point => !removedPoints.has(point.id)), ...createdPointIds.map(id => ({ id }))],
      elements,
    })
    const removedCenter = candidate.internalNodeId !== null && centerPoints.every(id => removedPoints.has(id))
    const metadata: TransformMetadata = Object.freeze({
      type: candidate.type, candidateId: candidate.id,
      originalResistorIds: candidate.elementIds, replacementResistorIds: Object.freeze(replacements.map(r => r.id)),
      originals: Object.freeze(originals), replacements: Object.freeze(replacements),
      affectedNodeIds: Object.freeze([...boundary, ...(candidate.internalNodeId === null ? [] : [candidate.internalNodeId])].sort(compareIds)),
      boundaryNodeIds: boundary,
      createdNodeIds: Object.freeze(createdPointIds.map(id => `node:${id}`)),
      removedNodeIds: Object.freeze(removedCenter && candidate.internalNodeId !== null ? [candidate.internalNodeId] : []),
      retainedInternalNodeIds: Object.freeze(!removedCenter && candidate.internalNodeId !== null ? [candidate.internalNodeId] : []),
      createdPointIds: Object.freeze(createdPointIds), removedPointIds: Object.freeze(removedPointIds), formula,
    })
    return Object.freeze({ kind: 'applied', network, metadata })
  } catch (error) {
    if (error instanceof TransformationNumericalError) return Object.freeze({ kind: 'error', code: 'numerical-failure', message: error.message })
    return invalidInput(error)
  }
}
