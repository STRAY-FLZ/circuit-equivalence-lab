// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createCircuitNetwork, resistanceOhms } from '../domain'
import type { CircuitElement, CircuitNetwork, ExternalTerminal, IdealWire, ResistanceOhms, Resistor } from '../domain'
import { analyzeTopology } from './index'
import type { TopologyAnalyzer } from './index'

function wire(id: string, first: string, second: string): IdealWire {
  return { id, kind: 'wire', endpoints: [first, second] }
}

function resistor(id: string, first: string, second: string, value = 100): Resistor {
  return { id, kind: 'resistor', endpoints: [first, second], resistance: resistanceOhms(value) }
}

function circuit(
  pointIds: readonly string[], elements: readonly CircuitElement[] = [],
  terminals: readonly ExternalTerminal[] = [],
): CircuitNetwork {
  return { id: 'test-network', points: pointIds.map((id) => ({ id })), elements, terminals }
}

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length === 0) return [[]]
  return values.flatMap((value, index) =>
    permutations(values.filter((_, other) => index !== other)).map((rest) => [value, ...rest]))
}

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return
  expect(Object.isFrozen(value)).toBe(true)
  for (const child of Object.values(value as Record<string, unknown>)) expectDeepFrozen(child)
}

describe('A — electrical-node identification', () => {
  it('A1: merges a direct wire and implements the existing analyzer contract', () => {
    const analyze: TopologyAnalyzer = analyzeTopology
    const result = analyze(createCircuitNetwork(circuit(['B', 'A'], [wire('w', 'B', 'A')])))
    expect(result).toEqual({
      networkId: 'test-network',
      nodes: [{ id: 'node:A', pointIds: ['A', 'B'] }],
      pointToNode: { A: 'node:A', B: 'node:A' },
      resistors: [],
      terminalToNode: {},
      components: [{ id: 'component:node:A', nodeIds: ['node:A'], resistorIds: [] }],
      nodeToComponent: { 'node:A': 'component:node:A' },
    })
  })

  it('A2: merges a transitive wire chain with sorted membership', () => {
    const result = analyzeTopology(circuit(['C', 'B', 'A'], [wire('w1', 'B', 'C'), wire('w2', 'A', 'B')]))
    expect(result.nodes).toEqual([{ id: 'node:A', pointIds: ['A', 'B', 'C'] }])
    expect(result.pointToNode).toEqual({ A: 'node:A', B: 'node:A', C: 'node:A' })
  })

  it('A3: a resistor connects a component but does not merge its electrical nodes', () => {
    const result = analyzeTopology(circuit(['A', 'B'], [resistor('r', 'A', 'B', 47)]))
    expect(result.nodes).toEqual([{ id: 'node:A', pointIds: ['A'] }, { id: 'node:B', pointIds: ['B'] }])
    expect(result.resistors).toEqual([{ id: 'r', nodeIds: ['node:A', 'node:B'], resistance: 47, isShortCircuited: false }])
    expect(result.components).toEqual([{ id: 'component:node:A', nodeIds: ['node:A', 'node:B'], resistorIds: ['r'] }])
  })

  it('A4: preserves all three nodes and branches in a resistor delta', () => {
    const result = analyzeTopology(circuit(['C', 'A', 'B'], [
      resistor('rBC', 'B', 'C', 20), resistor('rCA', 'C', 'A', 30), resistor('rAB', 'A', 'B', 10),
    ]))
    expect(result.nodes).toEqual([
      { id: 'node:A', pointIds: ['A'] }, { id: 'node:B', pointIds: ['B'] }, { id: 'node:C', pointIds: ['C'] },
    ])
    expect(result.resistors).toEqual([
      { id: 'rAB', nodeIds: ['node:A', 'node:B'], resistance: 10, isShortCircuited: false },
      { id: 'rBC', nodeIds: ['node:B', 'node:C'], resistance: 20, isShortCircuited: false },
      { id: 'rCA', nodeIds: ['node:C', 'node:A'], resistance: 30, isShortCircuited: false },
    ])
    expect(result.components).toEqual([{
      id: 'component:node:A', nodeIds: ['node:A', 'node:B', 'node:C'], resistorIds: ['rAB', 'rBC', 'rCA'],
    }])
  })

  it('A5: preserves independent parallel resistors and their original endpoint order', () => {
    const result = analyzeTopology(circuit(['A', 'B'], [resistor('r2', 'B', 'A', 220), resistor('r1', 'A', 'B', 100)]))
    expect(result.resistors).toEqual([
      { id: 'r1', nodeIds: ['node:A', 'node:B'], resistance: 100, isShortCircuited: false },
      { id: 'r2', nodeIds: ['node:B', 'node:A'], resistance: 220, isShortCircuited: false },
    ])
    expect(result.components).toEqual([{ id: 'component:node:A', nodeIds: ['node:A', 'node:B'], resistorIds: ['r1', 'r2'] }])
  })
})

describe('B — valid special topologies', () => {
  it('B1: retains a resistor short-circuited by an alternative wire path', () => {
    const result = analyzeTopology(circuit(['A', 'B', 'X'], [
      resistor('bypassed', 'A', 'B', 82), wire('w1', 'A', 'X'), wire('w2', 'X', 'B'),
    ]))
    expect(result.nodes).toEqual([{ id: 'node:A', pointIds: ['A', 'B', 'X'] }])
    expect(result.resistors).toEqual([{ id: 'bypassed', nodeIds: ['node:A', 'node:A'], resistance: 82, isShortCircuited: true }])
    expect(result.components).toEqual([{ id: 'component:node:A', nodeIds: ['node:A'], resistorIds: ['bypassed'] }])
  })

  it('B2: keeps an isolated point as a node and singleton resistive component', () => {
    const result = analyzeTopology(circuit(['A', 'B', 'isolated'], [resistor('r', 'A', 'B')]))
    expect(result.nodes).toContainEqual({ id: 'node:isolated', pointIds: ['isolated'] })
    expect(result.components).toEqual([
      { id: 'component:node:A', nodeIds: ['node:A', 'node:B'], resistorIds: ['r'] },
      { id: 'component:node:isolated', nodeIds: ['node:isolated'], resistorIds: [] },
    ])
    expect(result.nodeToComponent['node:isolated']).toBe('component:node:isolated')
  })

  it('B3: distinguishes disconnected resistive subgraphs and a wire-only component', () => {
    const result = analyzeTopology(circuit(['F', 'E', 'D', 'C', 'B', 'A'], [
      resistor('rCD', 'C', 'D'), wire('wEF', 'E', 'F'), resistor('rAB', 'A', 'B'),
    ]))
    expect(result.components).toEqual([
      { id: 'component:node:A', nodeIds: ['node:A', 'node:B'], resistorIds: ['rAB'] },
      { id: 'component:node:C', nodeIds: ['node:C', 'node:D'], resistorIds: ['rCD'] },
      { id: 'component:node:E', nodeIds: ['node:E'], resistorIds: [] },
    ])
    expect(result.nodeToComponent).toEqual({
      'node:A': 'component:node:A', 'node:B': 'component:node:A',
      'node:C': 'component:node:C', 'node:D': 'component:node:C', 'node:E': 'component:node:E',
    })
    expect(result.nodes).toContainEqual({ id: 'node:E', pointIds: ['E', 'F'] })
  })

  it('B4: maps terminal IDs rather than labels and permits equivalent terminals', () => {
    const result = analyzeTopology(circuit(['A', 'B', 'C'], [wire('w', 'A', 'B')], [
      { id: 'port-z', label: 'A', pointId: 'A' },
      { id: 'port-y', label: 'A', pointId: 'B' },
      { id: 'port-x', label: 'C', pointId: 'C' },
      { id: 'port-same-point', label: 'D', pointId: 'A' },
    ]))
    expect(result.terminalToNode).toEqual({
      'port-z': 'node:A', 'port-y': 'node:A', 'port-x': 'node:C', 'port-same-point': 'node:A',
    })
  })

  it('B5: redundant, reversed, cyclic and self-connecting wires preserve connectivity', () => {
    const base = circuit(['A', 'B', 'C'], [wire('ab', 'A', 'B'), wire('bc', 'B', 'C')])
    const redundant = { ...base, elements: [
      ...base.elements, wire('again-ab', 'A', 'B'), wire('ba', 'B', 'A'), wire('ca', 'C', 'A'), wire('aa', 'A', 'A'),
    ] }
    expect(analyzeTopology(redundant)).toEqual(analyzeTopology(base))
  })

  it('B6: crossing geometry and coincident coordinates never create an implicit junction', () => {
    const crossing = {
      ...circuit(['A', 'B', 'C', 'D'], [wire('horizontal', 'A', 'B'), wire('vertical', 'C', 'D')]),
      points: [{ id: 'A', x: -1, y: 0 }, { id: 'B', x: 1, y: 0 }, { id: 'C', x: 0, y: -1 }, { id: 'D', x: 0, y: 1 }],
    }
    const result = analyzeTopology(crossing)
    expect(result.nodes).toEqual([{ id: 'node:A', pointIds: ['A', 'B'] }, { id: 'node:C', pointIds: ['C', 'D'] }])
    expect(result.components).toEqual([
      { id: 'component:node:A', nodeIds: ['node:A'], resistorIds: [] },
      { id: 'component:node:C', nodeIds: ['node:C'], resistorIds: [] },
    ])
    expect(analyzeTopology({ ...crossing, points: crossing.points.map((point) => ({ ...point, x: 0, y: 0 })) })).toEqual(result)
  })

  it('B7: a literal resistor self-loop remains in its node component', () => {
    const result = analyzeTopology(circuit(['A', 'B'], [resistor('loop', 'A', 'A', 5)]))
    expect(result.resistors).toEqual([{ id: 'loop', nodeIds: ['node:A', 'node:A'], resistance: 5, isShortCircuited: true }])
    expect(result.components).toEqual([
      { id: 'component:node:A', nodeIds: ['node:A'], resistorIds: ['loop'] },
      { id: 'component:node:B', nodeIds: ['node:B'], resistorIds: [] },
    ])
  })
})

describe('C — deterministic normalization and validation', () => {
  it('C1: every wire permutation preserves the entire canonical result', () => {
    const wires = [wire('cb', 'C', 'B'), wire('ba', 'B', 'A'), wire('ed', 'E', 'D'), wire('ac', 'A', 'C')]
    const base = circuit(['F', 'E', 'D', 'C', 'B', 'A'], [...wires, resistor('r', 'C', 'E')])
    const expected = analyzeTopology(base)
    expect(expected.nodes).toEqual([
      { id: 'node:A', pointIds: ['A', 'B', 'C'] }, { id: 'node:D', pointIds: ['D', 'E'] }, { id: 'node:F', pointIds: ['F'] },
    ])
    for (const order of permutations(wires)) {
      expect(analyzeTopology({ ...base, elements: [...order, resistor('r', 'C', 'E')] })).toEqual(expected)
    }
  })

  it('C2: resistor ordering preserves identity, endpoints, values and component membership', () => {
    const branches = [resistor('r3', 'B', 'C', 3), resistor('r1', 'A', 'B', 1), resistor('r2', 'B', 'A', 2)]
    const expected = analyzeTopology(circuit(['A', 'B', 'C'], branches))
    for (const order of permutations(branches)) expect(analyzeTopology(circuit(['A', 'B', 'C'], order))).toEqual(expected)
    expect(expected.resistors.map((branch) => branch.id)).toEqual(['r1', 'r2', 'r3'])
  })

  it.each([
    wire('bad-wire-first', 'missing', 'B'), wire('bad-wire-second', 'A', 'missing'),
    resistor('bad-resistor-first', 'missing', 'B'), resistor('bad-resistor-second', 'A', 'missing'),
  ])('C3: rejects unknown endpoints with the offending element ID: $id', (element) => {
    const analyze = () => analyzeTopology(circuit(['A', 'B'], [element]))
    expect(analyze).toThrow(TypeError)
    expect(analyze).toThrow(element.id)
    expect(analyze).toThrow('missing')
  })

  it('C3: reports the offending terminal ID and unknown connection point', () => {
    const analyze = () => analyzeTopology(circuit(['A'], [], [{ id: 'bad-port', label: 'A', pointId: 'missing' }]))
    expect(analyze).toThrow(TypeError)
    expect(analyze).toThrow('bad-port')
    expect(analyze).toThrow('missing')
  })

  it.each([
    { scope: 'points', input: circuit(['duplicate', 'duplicate']) },
    { scope: 'wires', input: circuit(['A', 'B'], [wire('duplicate', 'A', 'B'), wire('duplicate', 'A', 'B')]) },
    { scope: 'resistors', input: circuit(['A', 'B'], [resistor('duplicate', 'A', 'B'), resistor('duplicate', 'A', 'B')]) },
    { scope: 'shared element namespace', input: circuit(['A', 'B'], [wire('duplicate', 'A', 'B'), resistor('duplicate', 'A', 'B')]) },
    { scope: 'terminals', input: circuit(['A'], [], [
      { id: 'duplicate', label: 'A', pointId: 'A' }, { id: 'duplicate', label: 'B', pointId: 'A' },
    ]) },
  ])('C4: rejects duplicate IDs within $scope', ({ input }) => {
    expect(() => analyzeTopology(input)).toThrow(/重复.*duplicate/)
  })

  it.each([0, -0, -5, NaN, Infinity, -Infinity])('C5: rejects invalid resistor value %s with its ID', (value) => {
    const invalid: Resistor = { id: 'bad-resistance', kind: 'resistor', endpoints: ['A', 'B'], resistance: value as ResistanceOhms }
    const analyze = () => analyzeTopology(circuit(['A', 'B'], [invalid]))
    expect(analyze).toThrow(RangeError)
    expect(analyze).toThrow('bad-resistance')
  })

  it('C5: validates resistor data even when an ideal wire would bypass the resistor', () => {
    const invalid: Resistor = { id: 'invalid-bypass', kind: 'resistor', endpoints: ['A', 'B'], resistance: 0 as ResistanceOhms }
    expect(() => analyzeTopology(circuit(['A', 'B'], [wire('w', 'A', 'B'), invalid]))).toThrow(/invalid-bypass.*有限正数/)
  })

  it('C6: leaves raw and frozen inputs unchanged and creates a fully frozen result', () => {
    const input = circuit(['B', 'A', 'C'], [resistor('r', 'B', 'C'), wire('w', 'B', 'A')], [{ id: 't', label: 'A', pointId: 'A' }])
    const before = structuredClone(input)
    const result = analyzeTopology(input)
    expect(input).toEqual(before)
    expect(Object.isFrozen(input)).toBe(false)
    expect(Object.isFrozen(input.points)).toBe(false)
    expect(analyzeTopology(createCircuitNetwork(input))).toEqual(result)
    expectDeepFrozen(result)
    expect(Reflect.set(result.pointToNode, 'A', 'corrupted')).toBe(false)
    expect(Reflect.deleteProperty(result.resistors, '0')).toBe(false)
  })

  it('C6: later caller mutations cannot change the returned snapshot', () => {
    const point = { id: 'A' }
    const endpoints: [string, string] = ['A', 'B']
    const branch = { id: 'r', kind: 'resistor' as const, endpoints, resistance: resistanceOhms(10) }
    const terminal = { id: 't', label: 'A', pointId: 'A' }
    const result = analyzeTopology({ id: 'mutable', points: [point, { id: 'B' }], elements: [branch], terminals: [terminal] })
    point.id = 'renamed'
    endpoints[0] = 'renamed'
    branch.resistance = resistanceOhms(99)
    terminal.pointId = 'B'
    expect(result.nodes[0]).toEqual({ id: 'node:A', pointIds: ['A'] })
    expect(result.resistors[0]).toEqual({ id: 'r', nodeIds: ['node:A', 'node:B'], resistance: 10, isShortCircuited: false })
    expect(result.terminalToNode.t).toBe('node:A')
  })

  it('C7: wire equivalence and resistive reachability are separate partitions', () => {
    const result = analyzeTopology(circuit(['A', 'X', 'B', 'C', 'D'], [
      wire('w', 'A', 'X'), resistor('r1', 'X', 'B'), resistor('r2', 'B', 'C'),
    ]))
    expect(result.nodes).toEqual([
      { id: 'node:A', pointIds: ['A', 'X'] }, { id: 'node:B', pointIds: ['B'] },
      { id: 'node:C', pointIds: ['C'] }, { id: 'node:D', pointIds: ['D'] },
    ])
    expect(result.components).toEqual([
      { id: 'component:node:A', nodeIds: ['node:A', 'node:B', 'node:C'], resistorIds: ['r1', 'r2'] },
      { id: 'component:node:D', nodeIds: ['node:D'], resistorIds: [] },
    ])
    expect(result.resistors.every((branch) => !branch.isShortCircuited)).toBe(true)
  })
})

describe('additional boundary guarantees', () => {
  it('returns empty collections for an empty network', () => {
    expect(analyzeTopology(circuit([]))).toEqual({
      networkId: 'test-network', nodes: [], pointToNode: {}, resistors: [],
      terminalToNode: {}, components: [], nodeToComponent: {},
    })
  })

  it('accepts the same ID in the independent point, element and terminal namespaces', () => {
    const result = analyzeTopology(circuit(['shared', 'B'], [resistor('shared', 'shared', 'B')], [
      { id: 'shared', label: 'A', pointId: 'shared' },
    ]))
    expect(result.pointToNode.shared).toBe('node:shared')
    expect(result.terminalToNode.shared).toBe('node:shared')
    expect(result.resistors[0]?.id).toBe('shared')
  })

  it('handles prototype-like IDs without collisions or inherited lookup values', () => {
    const result = analyzeTopology(circuit(['__proto__', 'constructor', 'toString', 'node:__proto__'], [
      wire('w', '__proto__', 'constructor'), resistor('r', 'constructor', 'toString'),
    ], [{ id: '__proto__', label: 'A', pointId: '__proto__' }]))
    expect(result.nodes).toEqual([
      { id: 'node:__proto__', pointIds: ['__proto__', 'constructor'] },
      { id: 'node:node:__proto__', pointIds: ['node:__proto__'] },
      { id: 'node:toString', pointIds: ['toString'] },
    ])
    expect(result.pointToNode['__proto__']).toBe('node:__proto__')
    expect(result.pointToNode['constructor']).toBe('node:__proto__')
    expect(result.terminalToNode['__proto__']).toBe('node:__proto__')
    expect(Object.hasOwn(result.pointToNode, 'valueOf')).toBe(false)
    expect(Object.hasOwn(result.terminalToNode, 'constructor')).toBe(false)
    expect(Object.getPrototypeOf(result.pointToNode)).toBeNull()
    expect(Object.getPrototypeOf(result.terminalToNode)).toBeNull()
    expect(Object.getPrototypeOf(result.nodeToComponent)).toBeNull()
  })

  it('uses code-unit order rather than numeric, locale or DSU-root order', () => {
    const ids = ['中', 'é', 'a', 'A', '2', '10']
    const result = analyzeTopology(circuit(ids, ids.slice(1).map((id, index) => wire(`w${index}`, '中', id))))
    expect(result.nodes).toEqual([{ id: 'node:10', pointIds: ['10', '2', 'A', 'a', 'é', '中'] }])
  })

  it('preserves deterministic serialization after reordering every input collection', () => {
    const input = circuit(['C', 'A', 'B'], [wire('w', 'B', 'A'), resistor('r', 'C', 'B')], [
      { id: 'z', label: 'A', pointId: 'A' }, { id: 'a', label: 'B', pointId: 'C' },
    ])
    const shuffled = { ...input, points: input.points.toReversed(), elements: input.elements.toReversed(), terminals: input.terminals.toReversed() }
    expect(JSON.stringify(analyzeTopology(shuffled))).toBe(JSON.stringify(analyzeTopology(input)))
  })

  it.each([Number.MIN_VALUE, Number.MAX_VALUE])('preserves a finite positive resistance %s without arithmetic', (value) => {
    expect(analyzeTopology(circuit(['A', 'B'], [resistor('r', 'A', 'B', value)])).resistors[0]?.resistance).toBe(value)
  })

  it.each(['', ' ', ' leading', 'trailing '])('rejects invalid point IDs %j through the analyzer boundary', (id) => {
    expect(() => analyzeTopology(circuit([id]))).toThrow(/稳定 ID/)
  })

  it('rejects a blank terminal label with the terminal ID', () => {
    expect(() => analyzeTopology(circuit(['A'], [], [{ id: 'bad-label', label: ' ', pointId: 'A' }]))).toThrow('bad-label')
  })

  it('rejects an invalid endpoint count with the element ID', () => {
    const malformed = { id: 'bad-arity', kind: 'wire', endpoints: ['A'] } as unknown as CircuitElement
    expect(() => analyzeTopology(circuit(['A'], [malformed]))).toThrow(/bad-arity.*两个连接点/)
  })

  it('rejects a sparse endpoint tuple instead of losing the offending element context', () => {
    const endpoints = new Array<string>(2)
    endpoints[0] = 'A'
    const malformed = { id: 'sparse-wire', kind: 'wire', endpoints } as unknown as CircuitElement
    expect(() => analyzeTopology(circuit(['A'], [malformed]))).toThrow(/sparse-wire.*不存在的连接点/)
  })

  it('rejects unsupported component kinds instead of silently dropping them', () => {
    const malformed = { id: 'inductor', kind: 'inductor', endpoints: ['A', 'B'] } as unknown as CircuitElement
    expect(() => analyzeTopology(circuit(['A', 'B'], [malformed]))).toThrow(/inductor.*类型无效/)
  })
})
