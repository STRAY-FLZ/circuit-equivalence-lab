// @vitest-environment node
import { expect, it } from 'vitest'
import { createCircuitNetwork, resistanceOhms } from '../domain'
import type { CircuitElement } from '../domain'
import { verifyTerminalEquivalence } from './index'

function circuit(elements: readonly CircuitElement[], terminals = ['A', 'B']) {
  const ids = [...new Set([...terminals, ...elements.flatMap(element => element.endpoints)])]
  return createCircuitNetwork({
    id: 'verification', points: ids.map(id => ({ id })), elements,
    terminals: terminals.map(id => ({ id, label: id, pointId: id })),
  })
}
const resistor = (id: string, a: string, b: string, ohms: number): CircuitElement =>
  ({ id, kind: 'resistor', endpoints: [a, b], resistance: resistanceOhms(ohms) })
const single = (ohms: number) => circuit([resistor('r', 'A', 'B', ohms)])
const short = () => circuit([{ id: 'w', kind: 'wire', endpoints: ['A', 'B'] }])

it('independently compares analytical series and single-resistor networks', () => {
  const series = circuit([resistor('a', 'A', 'X', 2), resistor('b', 'X', 'B', 3)])
  const result = verifyTerminalEquivalence(series, single(5))
  expect(result.kind).toBe('equivalent')
  expect(result.pairs).toHaveLength(1)
  expect(result.pairs[0]?.terminals).toEqual(['A', 'B'])
  expect(result.pairs[0]?.before.kind).toBe('finite')
})

it.each([
  { before: single(7), after: single(8) },
  { before: single(1e-200), after: single(2e-200) },
  { before: single(7), after: short() },
  { before: single(7), after: circuit([]) },
  { before: short(), after: circuit([]) },
])('detects finite or physical-classification differences', ({ before, after }) => {
  const result = verifyTerminalEquivalence(before, after)
  expect(result.kind).toBe('different')
  expect(result.pairs[0]?.verdict).toBe('different')
})

it.each([short(), circuit([])])('preserves exact short/open classifications', input => {
  const result = verifyTerminalEquivalence(input, input)
  expect(result.kind).toBe('equivalent')
  expect(result.pairs[0]?.before.kind).toBe(result.pairs[0]?.after.kind)
})

it('checks every pair and preserves explicit short and open relationships across multiple ports', () => {
  const input = circuit([resistor('r', 'A', 'B', 5), { id: 'w', kind: 'wire', endpoints: ['A', 'C'] }], ['D', 'C', 'B', 'A'])
  const result = verifyTerminalEquivalence(input, input)
  expect(result.kind).toBe('equivalent')
  expect(result.pairs.map(pair => pair.terminals)).toEqual([['A', 'B'], ['A', 'C'], ['A', 'D'], ['B', 'C'], ['B', 'D'], ['C', 'D']])
  expect(result.pairs.filter(pair => pair.before.kind === 'open-circuit')).toHaveLength(3)
  expect(result.pairs.filter(pair => pair.before.kind === 'short-circuit')).toHaveLength(1)
})

it.each(['both', 'one'])('does not call %s solver errors evidence of equivalence', scenario => {
  const overflow = circuit([resistor('a', 'A', 'X', 1e308), resistor('b', 'X', 'B', 1e308)])
  const result = verifyTerminalEquivalence(overflow, scenario === 'both' ? overflow : single(7))
  expect(result.kind).toBe('inconclusive')
  expect(result.pairs[0]?.before).toMatchObject({ kind: 'error', code: 'numerical-failure' })
  expect(result.pairs[0]?.verdict).toBe('inconclusive')
})

it('reports a proven differing pair even if another pair is inconclusive', () => {
  const first = circuit([resistor('ab', 'A', 'B', 1), resistor('cx', 'C', 'X', 1e308), resistor('xd', 'X', 'D', 1e308)], ['A', 'B', 'C', 'D'])
  const second = circuit([resistor('ab', 'A', 'B', 2), resistor('cx', 'C', 'X', 1e308), resistor('xd', 'X', 'D', 1e308)], ['A', 'B', 'C', 'D'])
  const result = verifyTerminalEquivalence(first, second)
  expect(result.kind).toBe('different')
  expect(result.pairs.some(pair => pair.verdict === 'inconclusive')).toBe(true)
})

it('rejects mismatched terminal sets and does not infer correspondences from labels', () => {
  const input = single(5)
  const renamed = { ...input, terminals: input.terminals.map(t => ({ ...t, id: `new-${t.id}` })) }
  expect(verifyTerminalEquivalence(input, renamed).kind).toBe('different')
})

it.each([[], ['A']].map(terminals => ({ terminals })))('does not claim equivalence without a terminal pair: $terminals', ({ terminals }) => {
  const input = circuit([], terminals)
  expect(verifyTerminalEquivalence(input, input).kind).toBe('inconclusive')
})

it.each([
  { relativeTolerance: -1 }, { relativeTolerance: NaN }, { relativeTolerance: Infinity },
  { relativeTolerance: 1 }, { absoluteToleranceOhms: -1 }, { absoluteToleranceOhms: Infinity },
])('reports invalid comparison tolerances %j', options => {
  expect(verifyTerminalEquivalence(single(5), single(5), options).kind).toBe('inconclusive')
})

it('uses explicit relative and absolute tolerances without overflowing near MAX_VALUE', () => {
  expect(verifyTerminalEquivalence(single(1), single(1 + 1e-6), { relativeTolerance: 1e-5 }).kind).toBe('equivalent')
  expect(verifyTerminalEquivalence(single(1e-20), single(2e-20), { absoluteToleranceOhms: 1e-19 }).kind).toBe('equivalent')
  expect(verifyTerminalEquivalence(single(Number.MAX_VALUE), single(Number.MAX_VALUE)).kind).toBe('equivalent')
})

it('reports invalid networks as inconclusive and preserves both input objects', () => {
  const input = structuredClone(single(5))
  const before = structuredClone(input)
  const invalid = { ...input, points: [] }
  expect(verifyTerminalEquivalence(input, invalid).kind).toBe('inconclusive')
  expect(input).toEqual(before)
  expect(Object.isFrozen(input)).toBe(false)
})
