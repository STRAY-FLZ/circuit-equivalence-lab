import type { ElectricalNodeId, NormalizedResistor, ResistiveComponent, TopologyResult } from '../topology'
import { DenseMatrix, positive, SolverFailure } from './numerics'

/** Dense O(n^3) work and O(n^2) storage are intentionally bounded. */
export const MAX_UNKNOWN_NODES = 512

export interface NodalSystem {
  readonly matrix: DenseMatrix
  readonly rhs: Float64Array
  readonly nodeIds: readonly ElectricalNodeId[]
  readonly branches: readonly NormalizedResistor[]
  readonly weights: ReadonlyMap<string, number>
  readonly resistanceScale: number
}

const compareIds = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0

/** Assemble H = Rscale * G, with unknown x = V / Rscale and a +1 A excitation. */
export function assembleNodalSystem(
  topology: TopologyResult, component: ResistiveComponent,
  source: ElectricalNodeId, reference: ElectricalNodeId,
): NodalSystem {
  const members = new Set(component.nodeIds)
  if (!members.has(source) || !members.has(reference)) {
    throw new SolverFailure('invalid-topology', 'Terminal nodes are absent from their declared component.')
  }
  const nodeIds = component.nodeIds.filter(id => id !== reference).toSorted(compareIds)
  if (nodeIds.length > MAX_UNKNOWN_NODES) {
    throw new SolverFailure('size-limit', `Dense solver supports at most ${MAX_UNKNOWN_NODES} unknown nodes; received ${nodeIds.length}.`)
  }
  const indices = new Map(nodeIds.map((id, index) => [id, index]))
  const branchIds = new Set(component.resistorIds)
  const branches = topology.resistors.filter(branch => branchIds.has(branch.id))
    .toSorted((a, b) => compareIds(a.id, b.id))
  if (branches.length !== branchIds.size) {
    throw new SolverFailure('invalid-topology', 'Component references a missing resistor.')
  }
  let resistanceScale = Infinity
  for (const branch of branches) {
    const [a, b] = branch.nodeIds
    if (!members.has(a) || !members.has(b) || branch.isShortCircuited !== (a === b)) {
      throw new SolverFailure('invalid-topology', `Inconsistent normalized resistor "${branch.id}".`)
    }
    positive(branch.resistance, `resistance of "${branch.id}"`)
    if (!branch.isShortCircuited) resistanceScale = Math.min(resistanceScale, branch.resistance)
  }
  positive(resistanceScale, 'component resistance scale')
  const matrix = new DenseMatrix(nodeIds.length)
  const rhs = new Float64Array(nodeIds.length)
  const sourceIndex = indices.get(source)
  if (sourceIndex === undefined) throw new SolverFailure('invalid-topology', 'Missing source node index.')
  rhs[sourceIndex] = 1
  const weights = new Map<string, number>()
  for (const branch of branches) {
    if (branch.isShortCircuited) continue
    // No raw reciprocal: uniformly tiny/large resistances need not overflow 1/R.
    const weight = positive(resistanceScale / branch.resistance, `scaled conductance of "${branch.id}"`)
    weights.set(branch.id, weight)
    const a = indices.get(branch.nodeIds[0])
    const b = indices.get(branch.nodeIds[1])
    if (a !== undefined) matrix.add(a, a, weight)
    if (b !== undefined) matrix.add(b, b, weight)
    if (a !== undefined && b !== undefined) {
      matrix.add(a, b, -weight)
      matrix.add(b, a, -weight)
    }
  }
  return { matrix, rhs, nodeIds, branches, weights, resistanceScale }
}
