// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createCircuitNetwork, resistanceOhms } from '../domain'
import type { CircuitElement, CircuitNetwork, Resistor } from '../domain'
import { analyzeTopology } from '../topology'
import { applyTransformation, discoverTransformations, verifyTerminalEquivalence } from './index'
import type { TransformOptions, TransformResult, TransformType } from './index'

const r = (id: string, a: string, b: string, value: number): CircuitElement =>
  ({ id, kind: 'resistor', endpoints: [a, b], resistance: resistanceOhms(value) })
const w = (id: string, a: string, b: string): CircuitElement => ({ id, kind: 'wire', endpoints: [a, b] })

function circuit(elements: readonly CircuitElement[], terminals = ['A', 'B'], extra: string[] = []): CircuitNetwork {
  const ids = [...new Set([...terminals, ...extra, ...elements.flatMap(element => element.endpoints)])]
  return createCircuitNetwork({ id: 'transform-test', points: ids.map(id => ({ id })), elements, terminals: terminals.map(id => ({ id, label: id, pointId: id })) })
}
const delta = (values = [3, 3, 3]) => circuit([r('ab', 'A', 'B', values[0] ?? 0), r('bc', 'B', 'C', values[1] ?? 0), r('ca', 'C', 'A', values[2] ?? 0)], ['A', 'B', 'C'])
const star = (values = [1, 1, 1]) => circuit([r('a', 'A', 'O', values[0] ?? 0), r('b', 'B', 'O', values[1] ?? 0), r('c', 'C', 'O', values[2] ?? 0)], ['A', 'B', 'C'])

function candidates(network: CircuitNetwork, type: TransformType, options: TransformOptions = {}) {
  const result = discoverTransformations(network, options)
  expect(result.kind).toBe('candidates')
  if (result.kind !== 'candidates') throw new Error(result.message)
  return result.candidates.filter(item => item.type === type)
}
function applied(result: TransformResult) {
  expect(result.kind, JSON.stringify(result)).toBe('applied')
  if (result.kind !== 'applied') throw new Error(JSON.stringify(result))
  return result
}
function transform(network: CircuitNetwork, type: TransformType, ids?: readonly string[]) {
  const selected = ids ?? candidates(network, type)[0]?.elementIds
  if (!selected) throw new Error('Missing test candidate')
  const result = applied(applyTransformation({ network, type, elementIds: selected }))
  const verification = verifyTerminalEquivalence(network, result.network)
  expect(verification.kind, JSON.stringify(verification)).toBe('equivalent')
  expect(verification.pairs).toHaveLength(network.terminals.length * (network.terminals.length - 1) / 2)
  expect(result.network.terminals).toEqual(network.terminals)
  return result
}
function close(value: number | undefined, expected: number, relative = 1e-12, absolute = 0) {
  if (value === undefined) throw new Error('Missing resistance')
  expect(Math.abs(value - expected)).toBeLessThanOrEqual(absolute + relative * Math.abs(expected))
}
function branchValue(network: CircuitNetwork, a: string, b: string): number | undefined {
  const t = analyzeTopology(network)
  return t.resistors.find(branch => branch.nodeIds.includes(`node:${a}`) && branch.nodeIds.includes(`node:${b}`))?.resistance
}

describe('series and parallel', () => {
  it('reduces 2+3 to 5 ohms and records/removes an orphan internal point', () => {
    const original = circuit([r('r1', 'A', 'X', 2), r('r2', 'X', 'B', 3)])
    const result = transform(original, 'series')
    close(result.metadata.replacements[0]?.resistance, 5)
    expect(result.metadata.originalResistorIds).toEqual(['r1', 'r2'])
    expect(result.metadata.originals.map(branch => branch.resistance)).toEqual([2, 3])
    expect(result.metadata.removedPointIds).toEqual(['X'])
    expect(result.metadata.removedNodeIds).toEqual(['node:X'])
    expect(result.metadata.formula).toContain('R_1 + R_2')
  })

  it('reduces 6 || 3 to 2 ohms with opposite branch orientations', () => {
    const result = transform(circuit([r('r1', 'A', 'B', 6), r('r2', 'B', 'A', 3)]), 'parallel')
    close(result.metadata.replacements[0]?.resistance, 2)
  })

  it('discovers a maximal parallel group and accepts an explicit subset', () => {
    const original = circuit([r('r1', 'A', 'B', 6), r('r2', 'A', 'B', 3), r('r3', 'B', 'A', 2)])
    expect(candidates(original, 'parallel')[0]?.elementIds).toEqual(['r1', 'r2', 'r3'])
    close(transform(original, 'parallel').metadata.replacements[0]?.resistance, 1)
    const subset = transform(original, 'parallel', ['r2', 'r1'])
    close(subset.metadata.replacements[0]?.resistance, 2)
    expect(subset.network.elements).toContainEqual(original.elements[2])
  })

  it('supports a sequence of requested mixed series-parallel reductions', () => {
    const original = circuit([r('a', 'A', 'X', 2), r('b', 'X', 'B', 6), r('c', 'B', 'X', 3)])
    const parallelResult = transform(original, 'parallel')
    const seriesResult = transform(parallelResult.network, 'series')
    close(seriesResult.metadata.replacements[0]?.resistance, 4)
    expect(verifyTerminalEquivalence(original, seriesResult.network).kind).toBe('equivalent')
  })

  it.each(['terminal', 'protected'])('rejects a series center that is %s through a wire-connected point', protection => {
    const original = circuit([r('a', 'A', 'X', 2), w('junction', 'X', 'Y'), r('b', 'Y', 'B', 3)], protection === 'terminal' ? ['A', 'B', 'Y'] : ['A', 'B'])
    const options = protection === 'protected' ? { protectedPointIds: ['Y'] } : {}
    expect(candidates(original, 'series', options)).toHaveLength(0)
    expect(applyTransformation({ network: original, type: 'series', elementIds: ['a', 'b'], ...options }).kind).toBe('not-applicable')
  })

  it('rejects a series center with a third active branch', () => {
    const original = circuit([r('a', 'A', 'X', 2), r('b', 'X', 'B', 3), r('extra', 'X', 'C', 4)])
    expect(applyTransformation({ network: original, type: 'series', elementIds: ['a', 'b'] }).kind).toBe('not-applicable')
  })

  it('does not treat two parallel branches as a series path', () => {
    const original = circuit([r('a', 'A', 'X', 2), r('b', 'X', 'A', 3)])
    expect(candidates(original, 'series')).toHaveLength(0)
  })

  it('uses wire equivalence for parallel discovery and preserves all wires/shorted branches', () => {
    const original = circuit([w('ax', 'A', 'X'), w('by', 'B', 'Y'), r('a', 'A', 'B', 6), r('b', 'X', 'Y', 3), r('shorted', 'A', 'X', 10)])
    const result = transform(original, 'parallel')
    close(result.metadata.replacements[0]?.resistance, 2)
    for (const id of ['ax', 'by', 'shorted']) expect(result.network.elements.find(e => e.id === id)).toEqual(original.elements.find(e => e.id === id))
    expect(applyTransformation({ network: original, type: 'parallel', elementIds: ['a', 'shorted'] }).kind).toBe('not-applicable')
  })

  it('retains a former series center wire group and its shorted resistor', () => {
    const original = circuit([r('a', 'A', 'X', 2), w('xy', 'X', 'Y'), r('b', 'Y', 'B', 3), r('loop', 'X', 'Y', 8)])
    const result = transform(original, 'series')
    expect(result.metadata.retainedInternalNodeIds).toEqual(['node:X'])
    expect(result.metadata.removedPointIds).toEqual([])
    expect(result.network.elements.filter(e => e.id === 'xy' || e.id === 'loop')).toEqual(original.elements.filter(e => e.id === 'xy' || e.id === 'loop'))
  })
})

describe('delta to star', () => {
  it('maps three 3 ohm sides to three 1 ohm arms with all three port pairs preserved', () => {
    const result = transform(delta(), 'delta-to-star')
    for (const branch of result.metadata.replacements) close(branch.resistance, 1)
    expect(result.metadata.createdPointIds).toHaveLength(1)
    expect(result.metadata.createdNodeIds).toEqual(result.metadata.createdPointIds.map(id => `node:${id}`))
    expect(result.metadata.boundaryNodeIds).toEqual(['node:A', 'node:B', 'node:C'])
  })

  it('maps asymmetric sides 2,3,5 to analytical arms 1,0.6,1.5', () => {
    const result = transform(delta([2, 3, 5]), 'delta-to-star')
    const center = result.metadata.createdPointIds[0]
    if (!center) throw new Error('Missing center')
    close(branchValue(result.network, 'A', center), 1)
    close(branchValue(result.network, 'B', center), 3 / 5)
    close(branchValue(result.network, 'C', center), 3 / 2)
  })

  it('permits extra branches, equivalent ports and disconnected ports at delta vertices', () => {
    const original = circuit([...delta().elements, r('extra', 'A', 'D', 7), w('alias', 'B', 'Q'), r('floating', 'E', 'F', 9)], ['A', 'B', 'C', 'D', 'Q', 'E'])
    const result = transform(original, 'delta-to-star')
    for (const id of ['extra', 'alias', 'floating']) expect(result.network.elements.find(e => e.id === id)).toEqual(original.elements.find(e => e.id === id))
    const check = verifyTerminalEquivalence(original, result.network)
    expect(check.pairs).toHaveLength(15)
    expect(check.pairs.some(p => p.before.kind === 'short-circuit')).toBe(true)
    expect(check.pairs.some(p => p.before.kind === 'open-circuit')).toBe(true)
  })

  it('enumerates exact edge combinations in a multigraph and replaces only the selected triple', () => {
    const original = circuit([...delta().elements, r('other-ab', 'A', 'B', 8)], ['A', 'B', 'C'])
    const choices = candidates(original, 'delta-to-star')
    expect(choices).toHaveLength(2)
    expect(choices.map(c => c.elementIds)).toContainEqual(['bc', 'ca', 'other-ab'])
    const result = transform(original, 'delta-to-star', ['ab', 'bc', 'ca'])
    expect(result.network.elements.find(e => e.id === 'other-ab')).toEqual(original.elements.find(e => e.id === 'other-ab'))
  })

  it('rejects three branches that do not form three distinct sides', () => {
    const original = circuit([r('a', 'A', 'B', 1), r('b', 'A', 'B', 2), r('c', 'B', 'C', 3)], ['A', 'B', 'C'])
    expect(applyTransformation({ network: original, type: 'delta-to-star', elementIds: ['a', 'b', 'c'] }).kind).toBe('not-applicable')
  })
})

describe('star to delta', () => {
  it('maps three 1 ohm arms to three 3 ohm sides and removes the orphan center', () => {
    const result = transform(star(), 'star-to-delta')
    for (const branch of result.metadata.replacements) close(branch.resistance, 3)
    expect(result.metadata.removedPointIds).toEqual(['O'])
    expect(result.metadata.removedNodeIds).toEqual(['node:O'])
  })

  it('maps arms 2,3,5 using the independent numerator P=31', () => {
    const result = transform(star([2, 3, 5]), 'star-to-delta')
    close(branchValue(result.network, 'A', 'B'), 31 / 5)
    close(branchValue(result.network, 'B', 'C'), 31 / 2)
    close(branchValue(result.network, 'C', 'A'), 31 / 3)
  })

  it.each(['terminal', 'protected', 'fourth branch', 'duplicate neighbor'])('rejects a star with %s at the center', reason => {
    let original = star()
    let options: TransformOptions = {}
    if (reason === 'terminal') original = circuit(original.elements, ['A', 'B', 'C', 'O'])
    if (reason === 'protected') options = { protectedPointIds: ['O'] }
    if (reason === 'fourth branch') original = circuit([...original.elements, r('fourth', 'O', 'X', 1)], ['A', 'B', 'C'])
    if (reason === 'duplicate neighbor') original = circuit([r('a', 'O', 'A', 1), r('b', 'O', 'B', 1), r('c', 'O', 'A', 1)])
    expect(candidates(original, 'star-to-delta', options)).toHaveLength(0)
    expect(applyTransformation({ network: original, type: 'star-to-delta', elementIds: ['a', 'b', 'c'], ...options }).kind).toBe('not-applicable')
  })

  it('handles a center consisting of multiple wire-connected points without removing wires', () => {
    const original = circuit([r('a', 'A', 'O1', 1), w('wire', 'O1', 'O2'), r('b', 'B', 'O2', 1), r('c', 'C', 'O1', 1), r('loop', 'O2', 'O1', 9)], ['A', 'B', 'C'])
    const result = transform(original, 'star-to-delta')
    expect(result.metadata.retainedInternalNodeIds).toEqual(['node:O1'])
    for (const id of ['wire', 'loop']) expect(result.network.elements.find(e => e.id === id)).toEqual(original.elements.find(e => e.id === id))
  })
})

describe('rewrite integration and safety', () => {
  it.each(['delta-to-star', 'star-to-delta'] as const)('%s round trip preserves asymmetric values and all port pairs', type => {
    const original = type === 'delta-to-star' ? delta([2, 3, 5]) : star([2, 3, 5])
    const first = transform(original, type)
    const second = transform(first.network, type === 'delta-to-star' ? 'star-to-delta' : 'delta-to-star')
    expect(verifyTerminalEquivalence(original, second.network).kind).toBe('equivalent')
    const values = second.metadata.replacements.map(branch => branch.resistance).sort((a, b) => a - b)
    for (const [i, value] of [2, 3, 5].entries()) close(values[i], value)
  })

  it('generates collision-free IDs above all input namespaces and across repeated transformations', () => {
    const base = delta()
    let current = createCircuitNetwork({
      ...base, id: 'm3:100', points: [...base.points, { id: 'm3:99' }],
      elements: [...base.elements, r('m3:101', 'm3:99', 'm3:99', 7)],
      terminals: [...base.terminals, { id: 'm3:102', label: 'Alias A', pointId: 'A' }],
    })
    const history = new Set([current.id, ...current.points.map(p => p.id), ...current.elements.map(e => e.id), ...current.terminals.map(t => t.id)])
    for (let i = 0; i < 8; i++) {
      const result = transform(current, i % 2 ? 'star-to-delta' : 'delta-to-star')
      for (const id of [...result.metadata.createdPointIds, ...result.metadata.replacementResistorIds]) {
        expect(history.has(id)).toBe(false)
        history.add(id)
      }
      current = result.network
    }
  })

  it('candidate ordering, generated IDs and metadata are stable under input reorder', () => {
    const first = delta([2, 3, 5])
    const second = { ...first, points: first.points.toReversed(), elements: first.elements.toReversed(), terminals: first.terminals.toReversed() }
    expect(discoverTransformations(second)).toEqual(discoverTransformations(first))
    const left = transform(first, 'delta-to-star')
    const right = transform(second, 'delta-to-star', ['ca', 'bc', 'ab'])
    expect(left.metadata).toEqual(right.metadata)
    expect(analyzeTopology(left.network)).toEqual(analyzeTopology(right.network))
  })

  it('does not mutate or freeze caller-owned input and freezes returned metadata', () => {
    const input = structuredClone(delta())
    const before = structuredClone(input)
    const result = transform(input, 'delta-to-star')
    expect(input).toEqual(before)
    expect(Object.isFrozen(input)).toBe(false)
    function frozen(value: unknown): void {
      if (value === null || typeof value !== 'object') return
      expect(Object.isFrozen(value)).toBe(true)
      for (const child of Object.values(value as Record<string, unknown>)) frozen(child)
    }
    frozen(result)
    frozen(discoverTransformations(input))
  })

  it.each([[], ['ab'], ['ab', 'ab', 'ca'], ['ab', 'bc', 'missing']].map(elementIds => ({ elementIds })))('rejects malformed delta selection $elementIds', ({ elementIds }) => {
    expect(applyTransformation({ network: delta(), type: 'delta-to-star', elementIds }).kind).toBe('not-applicable')
  })

  it('revalidates a stale candidate after its center gains a terminal', () => {
    const original = star()
    const selected = candidates(original, 'star-to-delta')[0]
    if (!selected) throw new Error('No star')
    const changed = circuit(original.elements, ['A', 'B', 'C', 'O'])
    expect(applyTransformation({ network: changed, type: selected.type, elementIds: selected.elementIds }).kind).toBe('not-applicable')
  })

  it('reports invalid domain data and nonexistent protected points explicitly', () => {
    const input = delta()
    const invalid = { ...input, elements: [...input.elements, input.elements[0] as Resistor] }
    expect(discoverTransformations(invalid)).toMatchObject({ kind: 'error', code: 'invalid-input' })
    expect(applyTransformation({ network: invalid, type: 'delta-to-star', elementIds: ['ab', 'bc', 'ca'] })).toMatchObject({ kind: 'error', code: 'invalid-input' })
    expect(discoverTransformations(input, { protectedPointIds: ['missing'] })).toMatchObject({ kind: 'error', code: 'invalid-input' })
  })
})
