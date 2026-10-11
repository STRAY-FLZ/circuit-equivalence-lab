import { resistanceOhms } from '../domain'
import type { TerminalId } from '../domain'
import type { TopologyResult } from '../topology'
import { solveGroundedLaplacian } from './linear-system'
import { assembleNodalSystem } from './nodal-system'
import { entry, finite, positive, restoreUnits, SolverFailure } from './numerics'
import type { EquivalentResistanceResult } from './types'

function solve(topology: TopologyResult, terminalAId: TerminalId, terminalBId: TerminalId): EquivalentResistanceResult {
  function terminalNode(id: TerminalId): string {
    const node = Object.hasOwn(topology.terminalToNode, id) ? topology.terminalToNode[id] : undefined
    if (node === undefined) throw new SolverFailure('unknown-terminal', `Unknown external terminal "${id}".`)
    return node
  }
  const source = terminalNode(terminalAId)
  const reference = terminalNode(terminalBId)
  if (source === reference) return Object.freeze({ kind: 'short-circuit', resistance: 0 })
  const componentA = topology.nodeToComponent[source]
  const componentB = topology.nodeToComponent[reference]
  if (componentA === undefined || componentB === undefined) {
    throw new SolverFailure('invalid-topology', 'Missing terminal-node component mapping.')
  }
  if (componentA !== componentB) return Object.freeze({ kind: 'open-circuit' })
  const component = topology.components.find(item => item.id === componentA)
  if (!component) throw new SolverFailure('invalid-topology', `Missing component "${componentA}".`)
  const system = assembleNodalSystem(topology, component, source, reference)
  const linear = solveGroundedLaplacian(system.matrix, system.rhs)
  const normalized = new Map(system.nodeIds.map((id, i) => [id, entry(linear.solution, i)]))
  normalized.set(reference, 0)
  function voltage(id: string): number {
    const value = normalized.get(id)
    if (value === undefined) throw new SolverFailure('invalid-topology', `Missing solved node "${id}".`)
    return value
  }
  const sourceVoltage = positive(voltage(source), 'normalized terminal voltage')
  const resistance = resistanceOhms(positive(restoreUnits(sourceVoltage, system.resistanceScale, 'equivalent resistance in ohms'), 'equivalent resistance'))
  const nodeVoltages: Record<string, number> = Object.create(null) as Record<string, number>
  for (const [id, value] of normalized) {
    // Passive maximum principle: excursions beyond roundoff indicate breakdown.
    if (value < -1e-9 * sourceVoltage || value > (1 + 1e-9) * sourceVoltage) {
      throw new SolverFailure('numerical-failure', `Passive voltage bounds violated at "${id}".`)
    }
    nodeVoltages[id] = restoreUnits(value, system.resistanceScale, `voltage at "${id}"`)
  }
  const balances = new Map(component.nodeIds.map(id => [id, 0]))
  const magnitudes = new Map(component.nodeIds.map(id => [id, 0]))
  const branches = system.branches.map(branch => {
    const [a, b] = branch.nodeIds
    const difference = branch.isShortCircuited ? 0 : finite(voltage(a) - voltage(b), `voltage difference of "${branch.id}"`)
    const weight = branch.isShortCircuited ? 0 : system.weights.get(branch.id)
    if (weight === undefined) throw new Error(`Missing internal conductance for "${branch.id}".`)
    const currentAmps = finite(difference * weight, `current of "${branch.id}"`)
    const voltageDropVolts = restoreUnits(difference, system.resistanceScale, `voltage drop of "${branch.id}"`)
    if (difference !== 0 && (currentAmps === 0 || voltageDropVolts === 0)) {
      throw new SolverFailure('numerical-failure', `Branch diagnostic underflow at "${branch.id}".`)
    }
    for (const [id, signed] of [[a, currentAmps], [b, -currentAmps]] as const) {
      balances.set(id, finite((balances.get(id) ?? 0) + signed, 'KCL balance'))
      magnitudes.set(id, finite((magnitudes.get(id) ?? 0) + Math.abs(signed), 'KCL scale'))
    }
    return Object.freeze({ id: branch.id, currentAmps, voltageDropVolts })
  })
  const kclTolerance = Math.max(1e-9, 512 * Number.EPSILON * (system.nodeIds.length + branches.length))
  let maxKclResidualAmps = 0
  for (const [id, balance] of balances) {
    const injection = id === source ? 1 : id === reference ? -1 : 0
    const residual = Math.abs(balance - injection)
    maxKclResidualAmps = Math.max(maxKclResidualAmps, residual)
    if (residual > kclTolerance * Math.max(1, magnitudes.get(id) ?? 0)) {
      throw new SolverFailure('numerical-failure', `Branch KCL residual at "${id}" exceeds tolerance: ${residual} A.`)
    }
  }
  return Object.freeze({
    kind: 'finite', resistance, nodeVoltages: Object.freeze(nodeVoltages), branches: Object.freeze(branches),
    diagnostics: Object.freeze({
      referenceNodeId: reference, testCurrentAmps: 1, resistanceScaleOhms: system.resistanceScale,
      reciprocalConditionEstimate: linear.reciprocalConditionEstimate,
      relativeResidual: linear.relativeResidual, maxKclResidualAmps, kclTolerance,
    }),
  })
}

/** Consume an M1 snapshot; physical open/short states never stand for numerical failure. */
export function solveEquivalentResistance(
  topology: TopologyResult, terminalAId: TerminalId, terminalBId: TerminalId,
): EquivalentResistanceResult {
  try {
    return solve(topology, terminalAId, terminalBId)
  } catch (error) {
    if (!(error instanceof SolverFailure)) throw error
    return Object.freeze({ kind: 'error', code: error.code, message: error.message })
  }
}
