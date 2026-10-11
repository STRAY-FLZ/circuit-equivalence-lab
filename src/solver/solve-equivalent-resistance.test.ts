// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createCircuitNetwork, resistanceOhms } from '../domain'
import type { CircuitElement, CircuitNetwork, IdealWire, Resistor } from '../domain'
import { analyzeTopology } from '../topology'
import type { TopologyResult } from '../topology'
import { solveEquivalentResistance } from './index'
import type { EquivalentResistanceResult, FiniteResistanceResult, ResistanceSolver } from './index'

const resistor = (id: string, a: string, b: string, ohms: number): Resistor =>
  ({ id, kind: 'resistor', endpoints: [a, b], resistance: resistanceOhms(ohms) })
const wire = (id: string, a: string, b: string): IdealWire => ({ id, kind: 'wire', endpoints: [a, b] })

function network(elements: readonly CircuitElement[], extraPoints: readonly string[] = []): CircuitNetwork {
  const ids = [...new Set(['A', 'B', ...extraPoints, ...elements.flatMap(element => element.endpoints)])]
  return createCircuitNetwork({
    id: 'solver-test', points: ids.map(id => ({ id })), elements,
    terminals: ids.map(id => ({ id, label: id, pointId: id })),
  })
}
const topology = (elements: readonly CircuitElement[], extra: readonly string[] = []) => analyzeTopology(network(elements, extra))

function close(actual: number | undefined, expected: number, relative = 1e-10, absolute = 1e-12): void {
  expect(actual).toBeDefined()
  if (actual === undefined) throw new Error('Missing diagnostic value')
  expect(Number.isFinite(actual)).toBe(true)
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(absolute + relative * Math.abs(expected))
}

function finiteResult(result: EquivalentResistanceResult): FiniteResistanceResult {
  expect(result.kind, JSON.stringify(result)).toBe('finite')
  if (result.kind !== 'finite') throw new Error(JSON.stringify(result))
  expect(result.resistance).toBeGreaterThan(0)
  expect(Number.isFinite(result.resistance)).toBe(true)
  return result
}

function solve(t: TopologyResult, a = 'A', b = 'B'): FiniteResistanceResult {
  const solver: ResistanceSolver = solveEquivalentResistance
  return finiteResult(solver(t, a, b))
}

function branch(result: FiniteResistanceResult, id: string) {
  const found = result.branches.find(item => item.id === id)
  if (!found) throw new Error(`Missing branch ${id}`)
  return found
}

function checkPhysics(t: TopologyResult, result: FiniteResistanceResult, a = 'A', b = 'B'): void {
  const balances = new Map<string, number>()
  let power = 0
  for (const item of result.branches) {
    const source = t.resistors.find(r => r.id === item.id)
    if (!source) throw new Error('Unknown diagnostic branch')
    const [first, second] = source.nodeIds
    const firstV = result.nodeVoltages[first]
    const secondV = result.nodeVoltages[second]
    if (firstV === undefined || secondV === undefined) throw new Error('Missing voltage')
    close(item.voltageDropVolts, firstV - secondV)
    close(item.currentAmps, item.voltageDropVolts / source.resistance)
    balances.set(first, (balances.get(first) ?? 0) + item.currentAmps)
    balances.set(second, (balances.get(second) ?? 0) - item.currentAmps)
    power += item.currentAmps * item.voltageDropVolts
  }
  for (const id of Object.keys(result.nodeVoltages)) {
    close(balances.get(id) ?? 0, id === t.terminalToNode[a] ? 1 : id === t.terminalToNode[b] ? -1 : 0)
  }
  close(power, result.resistance)
  expect(result.diagnostics.maxKclResidualAmps).toBeLessThan(1e-9)
  expect(result.diagnostics.relativeResidual).toBeLessThan(1e-12)
  expect(result.diagnostics.reciprocalConditionEstimate).toBeGreaterThan(0)
}

const bridge = () => topology([
  resistor('AX', 'A', 'X', 2), resistor('XB', 'X', 'B', 3),
  resistor('AY', 'A', 'Y', 4), resistor('YB', 'Y', 'B', 5), resistor('XY', 'X', 'Y', 6),
])

describe('A — analytical elementary networks', () => {
  it('A1: single 7 ohm resistor, 1 A excitation and signed diagnostics', () => {
    const t = topology([resistor('r', 'A', 'B', 7)])
    const result = solve(t)
    close(result.resistance, 7)
    close(result.nodeVoltages['node:A'], 7)
    close(result.nodeVoltages['node:B'], 0)
    close(branch(result, 'r').currentAmps, 1)
    expect(result.diagnostics.referenceNodeId).toBe('node:B')
    checkPhysics(t, result)
  })

  it('A2: 2 and 3 ohm series with the intermediate potential', () => {
    const t = topology([resistor('a', 'A', 'X', 2), resistor('b', 'X', 'B', 3)])
    const result = solve(t)
    close(result.resistance, 5)
    close(result.nodeVoltages['node:X'], 3)
    checkPhysics(t, result)
  })

  it('A3: 6 and 3 ohm parallel branches contribute independently', () => {
    const t = topology([resistor('six', 'A', 'B', 6), resistor('three', 'A', 'B', 3)])
    const result = solve(t)
    close(result.resistance, 2)
    close(branch(result, 'six').currentAmps, 1 / 3)
    close(branch(result, 'three').currentAmps, 2 / 3)
    checkPhysics(t, result)
  })

  it('A4: 4 + (6 || 3) + 5 = 11 ohms', () => {
    const t = topology([resistor('a', 'A', 'X', 4), resistor('b', 'X', 'Y', 6), resistor('c', 'X', 'Y', 3), resistor('d', 'Y', 'B', 5)])
    const result = solve(t)
    close(result.resistance, 11)
    checkPhysics(t, result)
  })

  it.each([['A', 'B'], ['B', 'C'], ['C', 'A']])('A5: delta between %s and %s is 2 ohms', (a, b) => {
    const t = topology([resistor('ab', 'A', 'B', 3), resistor('bc', 'B', 'C', 3), resistor('ca', 'C', 'A', 3)])
    const result = solve(t, a, b)
    close(result.resistance, 2)
    checkPhysics(t, result, a, b)
  })

  it.each([['A', 'B', 'C'], ['B', 'C', 'A'], ['C', 'A', 'B']])('A6: star between %s and %s leaves %s unexcited', (a, b, open) => {
    const t = topology(['A', 'B', 'C'].map(id => resistor(id, id, 'X', 1)))
    const result = solve(t, a, b)
    close(result.resistance, 2)
    close(branch(result, open).currentAmps, 0)
    checkPhysics(t, result, a, b)
  })
})

describe('B — bridges and general graphs', () => {
  it('B1: balanced Wheatstone bridge has 1 ohm and zero central current', () => {
    const t = topology([resistor('ax', 'A', 'X', 1), resistor('xb', 'X', 'B', 1), resistor('ay', 'A', 'Y', 1), resistor('yb', 'Y', 'B', 1), resistor('bridge', 'X', 'Y', 1)])
    const result = solve(t)
    close(result.resistance, 1)
    close(branch(result, 'bridge').currentAmps, 0)
    close(result.nodeVoltages['node:X'], 0.5)
    checkPhysics(t, result)
  })

  it('B2: unbalanced bridge agrees with exact hand-derived fractions', () => {
    // At Va=1: Vx - Vy/6 = 1/2, -Vx/6 + 37Vy/60 = 1/4.
    // Vx=63/106, Vy=30/53, Iin=33/106. Scale by 106/33 for 1 A.
    const t = bridge()
    const result = solve(t)
    close(result.resistance, 106 / 33)
    close(result.nodeVoltages['node:X'], 21 / 11)
    close(result.nodeVoltages['node:Y'], 20 / 11)
    close(branch(result, 'XY').currentAmps, 1 / 66)
    checkPhysics(t, result)
  })

  it('B3: complete graph K5 with 2 ohm edges has R=2Rbranch/5', () => {
    // Symmetry makes the other three nodes equipotential: 2 || (4/3) = 4/5.
    const ids = ['A', 'B', 'C', 'D', 'E']
    const edges = ids.flatMap((a, i) => ids.slice(i + 1).map(b => resistor(a + b, a, b, 2)))
    const t = topology(edges)
    const result = solve(t)
    close(result.resistance, 4 / 5)
    for (const id of ['C', 'D', 'E']) close(result.nodeVoltages[`node:${id}`], 2 / 5)
    checkPhysics(t, result)
  })

  it('solves a medium 100-edge chain without recursion or topology reduction', () => {
    const ids = ['A', ...Array.from({ length: 99 }, (_, i) => `p${i}`), 'B']
    const edges = ids.slice(1).map((id, i) => resistor(`r${i}`, ids[i] ?? '', id, 1))
    const t = topology(edges)
    const result = solve(t)
    close(result.resistance, 100, 1e-10)
    checkPhysics(t, result)
  })
})

describe('C — topology-aware classification', () => {
  it('C1: a transitive ideal-wire path returns an explicit exact zero', () => {
    const result = solveEquivalentResistance(topology([wire('w1', 'A', 'X'), wire('w2', 'X', 'B')]), 'A', 'B')
    expect(result).toEqual({ kind: 'short-circuit', resistance: 0 })
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })

  it('C2: disconnected terminals return an open state that survives JSON', () => {
    const result = solveEquivalentResistance(topology([resistor('r', 'A', 'X', 4)], ['B']), 'A', 'B')
    expect(result).toEqual({ kind: 'open-circuit' })
    expect(JSON.parse(JSON.stringify(result))).toEqual({ kind: 'open-circuit' })
  })

  it('C3: wire-bypassed resistor retains identity with zero drop and current', () => {
    const t = topology([wire('w', 'A', 'X'), resistor('bypass', 'A', 'X', Number.MIN_VALUE), resistor('main', 'X', 'B', 7), resistor('loop', 'B', 'B', 1)])
    const result = solve(t)
    close(result.resistance, 7)
    for (const id of ['bypass', 'loop']) {
      close(branch(result, id).currentAmps, 0)
      close(branch(result, id).voltageDropVolts, 0)
    }
    checkPhysics(t, result)
  })

  it('C4: ignores unrelated floating networks, even with extreme values', () => {
    const result = solve(topology([resistor('main', 'A', 'B', 7), resistor('floating', 'X', 'Y', Number.MIN_VALUE)], ['isolated']))
    close(result.resistance, 7)
    expect(Object.keys(result.nodeVoltages).sort()).toEqual(['node:A', 'node:B'])
    expect(result.branches.map(item => item.id)).toEqual(['main'])
  })

  it('C5: a dangling chain and cycle draw no current', () => {
    const t = topology([resistor('main', 'A', 'B', 7), resistor('dangling', 'A', 'X', 3), resistor('xy', 'X', 'Y', 2), resistor('yz', 'Y', 'Z', 5), resistor('zx', 'Z', 'X', 8)])
    const result = solve(t)
    close(result.resistance, 7)
    for (const id of ['dangling', 'xy', 'yz', 'zx']) close(branch(result, id).currentAmps, 0)
    checkPhysics(t, result)
  })

  it('C6: 20 parallel branches preserve all identities and orientations', () => {
    const t = topology(Array.from({ length: 20 }, (_, i) => i % 2 ? resistor(`r${i}`, 'B', 'A', 10) : resistor(`r${i}`, 'A', 'B', 10)))
    const result = solve(t)
    close(result.resistance, 0.5)
    expect(result.branches).toHaveLength(20)
    close(branch(result, 'r0').currentAmps, 0.05)
    close(branch(result, 'r1').currentAmps, -0.05)
    checkPhysics(t, result)
  })

  it.each([['missing', 'B'], ['A', 'missing'], ['missing', 'missing'], ['__proto__', 'B']])('C7: diagnoses unknown terminal %s / %s', (a, b) => {
    const result = solveEquivalentResistance(topology([resistor('r', 'A', 'B', 1)]), a, b)
    expect(result).toMatchObject({ kind: 'error', code: 'unknown-terminal' })
    if (result.kind === 'error') expect(result.message).toContain(a === 'A' ? b : a)
  })

  it('same existing isolated terminal is a short, two isolated terminals are open', () => {
    const t = topology([])
    expect(solveEquivalentResistance(t, 'A', 'A')).toEqual({ kind: 'short-circuit', resistance: 0 })
    expect(solveEquivalentResistance(t, 'A', 'B')).toEqual({ kind: 'open-circuit' })
  })

  it('supports prototype-like node and terminal IDs from real M1 output', () => {
    const t = topology([resistor('constructor', '__proto__', 'toString', 9)])
    const result = solve(t, '__proto__', 'toString')
    close(result.resistance, 9)
    expect(Object.getPrototypeOf(result.nodeVoltages)).toBeNull()
  })
})

describe('D — numerical properties and failure boundaries', () => {
  it('D1: reciprocity preserves resistance and reverses every branch current', () => {
    const t = bridge()
    const forward = solve(t)
    const reverse = solve(t, 'B', 'A')
    close(reverse.resistance, forward.resistance)
    for (const item of forward.branches) close(branch(reverse, item.id).currentAmps, -item.currentAmps)
    checkPhysics(t, reverse, 'B', 'A')
  })

  it.each([1e-200, 1e-12, 1, 1e12, 1e200])('D2: uniform resistance scale %s preserves 1 A currents', factor => {
    const raw = network([resistor('r1', 'A', 'X', 2 * factor), resistor('r2', 'X', 'B', 3 * factor)])
    const result = solve(analyzeTopology(raw))
    close(result.resistance, 5 * factor, 1e-12, 0)
    close(result.nodeVoltages['node:X'], 3 * factor, 1e-12, 0)
    for (const item of result.branches) close(item.currentAmps, 1)
  })

  it('D3: reordered wires, resistors, points and terminals preserve diagnostics', () => {
    const raw = network([wire('w1', 'A', 'X'), wire('w2', 'X', 'Y'), resistor('r1', 'Y', 'B', 2), resistor('r2', 'B', 'A', 3)])
    const reversed = { ...raw, points: raw.points.toReversed(), elements: raw.elements.toReversed(), terminals: raw.terminals.toReversed() }
    const first = solve(analyzeTopology(raw))
    const second = solve(analyzeTopology(reversed))
    close(second.resistance, first.resistance)
    expect(second.branches.map(item => item.id)).toEqual(first.branches.map(item => item.id))
    for (const item of first.branches) close(branch(second, item.id).currentAmps, item.currentAmps)
  })

  it('D5/D6: bridge KCL and energy conservation agree with the positive 1 A excitation', () => {
    const t = bridge()
    checkPhysics(t, solve(t))
  })

  it.each([1e-300, 1e-100, 1e100, 1e300, Number.MIN_VALUE, Number.MAX_VALUE])('D7: single finite resistor %s avoids raw reciprocal overflow', value => {
    const result = solve(topology([resistor('r', 'A', 'B', value)]))
    close(result.resistance, value, 1e-12, 0)
    close(branch(result, 'r').currentAmps, 1)
  })

  it.each([[1e-6, 1, 1e6], [1e-3, 1, 1e3]])('D7: mixed parallel magnitudes %s, %s, %s', (small, middle, large) => {
    const result = solve(topology([resistor('small', 'A', 'B', small), resistor('middle', 'A', 'B', middle), resistor('large', 'A', 'B', large)]))
    close(result.resistance, 1 / (1 / small + 1 / middle + 1 / large), 1e-12, 0)
    close(branch(result, 'large').currentAmps, result.resistance / large, 1e-12, 0)
  })

  it('D7: mixed series magnitudes are resolved without an absolute pivot cutoff', () => {
    const t = topology([resistor('r1', 'A', 'X', 1), resistor('r2', 'X', 'B', 1e-6)])
    close(solve(t).resistance, 1.000001, 1e-9, 0)
    close(solve(t, 'B', 'A').resistance, 1.000001, 1e-9, 0)
  })

  it.each([
    { label: 'physical voltage overflow', edges: [resistor('a', 'A', 'X', 1e308), resistor('b', 'X', 'B', 1e308)] },
    { label: 'scaled conductance underflow', edges: [resistor('tiny', 'A', 'X', Number.MIN_VALUE), resistor('large', 'X', 'B', Number.MAX_VALUE)] },
    { label: 'lost grounding pivot', edges: [resistor('strong', 'A', 'X', 1), resistor('weak', 'X', 'B', 1e20)] },
    { label: 'equivalent resistance underflow', edges: Array.from({ length: 4 }, (_, i) => resistor(`r${i}`, 'A', 'B', Number.MIN_VALUE)) },
    // (3 * MIN_VALUE) / 2 rounds to 2 * MIN_VALUE: a 33% relative error, not success.
    { label: 'subnormal rounding loses significant digits', edges: [resistor('a', 'A', 'B', 3 * Number.MIN_VALUE), resistor('b', 'A', 'B', 3 * Number.MIN_VALUE)] },
  ])('D8: $label returns a numerical error, never open or short', ({ edges }) => {
    const result = solveEquivalentResistance(topology(edges), 'A', 'B')
    expect(result).toMatchObject({ kind: 'error', code: 'numerical-failure' })
    if (result.kind === 'error') expect(result.message.length).toBeGreaterThan(15)
    expect(JSON.stringify(result)).not.toContain('"resistance":null')
  })

  it('D9: input remains unchanged and caller-owned copies remain mutable', () => {
    const t = structuredClone(bridge())
    const before = structuredClone(t)
    const result = solve(t)
    expect(t).toEqual(before)
    expect(Object.isFrozen(t)).toBe(false)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.branches)).toBe(true)
    expect(Object.isFrozen(result.branches[0])).toBe(true)
    expect(Object.isFrozen(result.nodeVoltages)).toBe(true)
    expect(Object.isFrozen(result.diagnostics)).toBe(true)
  })

  it('reports a resource limit before allocating a large dense matrix', () => {
    const edges = Array.from({ length: 513 }, (_, i) => resistor(`r${i}`, i ? `p${i}` : 'A', i === 512 ? 'B' : `p${i + 1}`, 1))
    expect(solveEquivalentResistance(topology(edges), 'A', 'B')).toMatchObject({ kind: 'error', code: 'size-limit' })
  })

  it('reports an inconsistent selected component without rebuilding M1', () => {
    const t = bridge()
    expect(solveEquivalentResistance({ ...t, components: [] }, 'A', 'B')).toMatchObject({ kind: 'error', code: 'invalid-topology' })
  })
})
