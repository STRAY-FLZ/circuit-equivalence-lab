// @vitest-environment node
import { expect, it } from 'vitest'
import { createCircuitNetwork, resistanceOhms } from '../domain'
import { applyTransformation } from './index'
import type { TransformType } from './index'

function run(type: TransformType, values: readonly number[]) {
  const endpoints: readonly (readonly [string, string])[] =
    type === 'series' ? [['A', 'O'], ['O', 'B']] :
      type === 'parallel' ? values.map(() => ['A', 'B'] as const) :
        type === 'delta-to-star' ? [['A', 'B'], ['B', 'C'], ['C', 'A']] : [['A', 'O'], ['B', 'O'], ['C', 'O']]
  const network = createCircuitNetwork({
    id: 'numerical-transform', points: ['A', 'B', 'C', 'O'].map(id => ({ id })),
    terminals: ['A', 'B', 'C'].map(id => ({ id, label: id, pointId: id })),
    elements: values.map((value, i) => ({ id: `r${i}`, kind: 'resistor', endpoints: endpoints[i] ?? ['A', 'B'], resistance: resistanceOhms(value) })),
  })
  return applyTransformation({ network, type, elementIds: network.elements.map(e => e.id) })
}

it.each([
  { type: 'series', values: [2e200, 3e200], expected: [5e200] },
  { type: 'series', values: [Number.MIN_VALUE, Number.MIN_VALUE], expected: [2 * Number.MIN_VALUE] },
  { type: 'parallel', values: [6e200, 3e200], expected: [2e200] },
  { type: 'parallel', values: [1e-200, 1e200], expected: [1e-200] },
  { type: 'delta-to-star', values: [1e308, 1e308, 1e308], expected: [1e308 / 3, 1e308 / 3, 1e308 / 3] },
  { type: 'delta-to-star', values: [3e-300, 3e-300, 3e-300], expected: [1e-300, 1e-300, 1e-300] },
  { type: 'delta-to-star', values: [1e-200, 1e200, 1e200], expected: [5e-201, 5e-201, 5e199] },
  { type: 'star-to-delta', values: [1e200, 1e200, 1e200], expected: [3e200, 3e200, 3e200] },
  { type: 'star-to-delta', values: [1e-200, 1e200, 1e-200], expected: [2e200, 2e-200, 2e200] },
  { type: 'star-to-delta', values: [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE], expected: [3 * Number.MIN_VALUE, 3 * Number.MIN_VALUE, 3 * Number.MIN_VALUE] },
] satisfies { type: TransformType; values: number[]; expected: number[] }[])('$type handles representable scale extremes $values', ({ type, values, expected }) => {
  const result = run(type, values)
  expect(result.kind, JSON.stringify(result)).toBe('applied')
  if (result.kind !== 'applied') throw new Error('Expected representable analytical transformation')
  result.metadata.replacements.forEach((branch, i) => {
    const reference = expected[i]
    if (reference === undefined) throw new Error('Missing independent reference')
    expect(Number.isFinite(branch.resistance)).toBe(true)
    expect(branch.resistance).toBeGreaterThan(0)
    expect(Math.abs(branch.resistance - reference) / reference).toBeLessThanOrEqual(1e-12)
  })
})

it.each([
  { type: 'series', values: [1e308, 1e308] },
  { type: 'parallel', values: [Number.MIN_VALUE, Number.MIN_VALUE] },
  { type: 'parallel', values: [3 * Number.MIN_VALUE, 3 * Number.MIN_VALUE] },
  { type: 'delta-to-star', values: [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE] },
  { type: 'star-to-delta', values: [1e308, 1e308, 1e308] },
  { type: 'star-to-delta', values: [1, 1, Number.MIN_VALUE] },
] satisfies { type: TransformType; values: number[] }[])('$type rejects unrepresentable/low-precision results $values atomically', ({ type, values }) => {
  const result = run(type, values)
  expect(result).toMatchObject({ kind: 'error', code: 'numerical-failure' })
  expect(Object.hasOwn(result, 'network')).toBe(false)
  if (result.kind === 'error') expect(result.message.length).toBeGreaterThan(10)
})
