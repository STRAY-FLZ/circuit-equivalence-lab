import { describe, expect, it } from 'vitest'
import { createCircuitNetwork } from '../domain'
import { applyTransformation, discoverTransformations, verifyTerminalEquivalence } from '../transforms'
import { labExamples } from '../learning-examples'
import { buildLesson, lessonHighlights } from './lesson'
import { formatNumber } from './format'
import type { CircuitNetwork } from '../domain'
import type { TransformType } from '../transforms'

function lessonFor(network: CircuitNetwork, type: TransformType) {
  const discovery = discoverTransformations(network)
  if (discovery.kind !== 'candidates') throw new Error('Discovery failed')
  const candidate = discovery.candidates.find(c => c.type === type)!
  const applied = applyTransformation({ network, type, elementIds: candidate.elementIds })
  if (applied.kind !== 'applied') throw new Error('Application failed')
  const verification = verifyTerminalEquivalence(network, applied.network)
  const content = buildLesson(network, candidate, applied, verification)
  if (content.kind !== 'ready') throw new Error(content.message)
  return { lesson: content.lesson, candidate, applied, verification }
}
const sourceFor = (id: string) => labExamples.find(e => e.id === id)!.network

describe('M5 authoritative lesson content', () => {
  it.each([
    { id: 'series', type: 'series' }, { id: 'parallel', type: 'parallel' },
    { id: 'delta', type: 'delta-to-star' }, { id: 'star', type: 'star-to-delta' },
  ] satisfies readonly { id: string; type: TransformType }[])('creates five grounded stages for $type without altering the source', ({ id, type }) => {
    const source = sourceFor(id)
    const snapshot = JSON.stringify(source)
    const { lesson, applied, verification } = lessonFor(source, type)
    expect(lesson.steps.map(s => s.id)).toEqual(['identify', 'principle', 'substitute', 'transform', 'verify'])
    expect(lesson.steps[0].conditions.length).toBeGreaterThan(0)
    expect(lesson.steps[1].formulas.length).toBeGreaterThan(0)
    expect(lesson.steps[2].substitutions).toHaveLength(applied.metadata.replacements.length)
    expect(lesson.metadata).toBe(applied.metadata)
    expect(lesson.verification).toBe(verification)
    expect(verification.kind).toBe('equivalent')
    expect(lesson.source).toBe(source)
    expect(JSON.stringify(source)).toBe(snapshot)
    for (const replacement of applied.metadata.replacements) {
      expect(lesson.variables.find(v => v.elementId === replacement.id)?.resistance).toBe(replacement.resistance)
    }
  })

  it('uses the actual series values and general principle', () => {
    const { lesson } = lessonFor(sourceFor('series'), 'series')
    expect(lesson.steps[1].formulas).toContain('R_{eq} = R_{1} + R_{2} + … + R_{n}')
    expect(lesson.steps[2].substitutions).toEqual(['R_{eq} = 100 + 220 = 320 Ω'])
    expect(lesson.steps[0].conditions.join(' ')).toContain('node:N')
  })

  it('expands the reciprocal sum for every selected parallel branch', () => {
    const { lesson } = lessonFor(sourceFor('parallel'), 'parallel')
    expect(lesson.steps[1].formulas).toContain('1 / R_{eq} = Σ_i (1 / R_{i})')
    expect(lesson.steps[2].substitutions).toEqual(['R_{eq} = 1 / (1 / 100 + 1 / 200 + 1 / 300) = 54.54545455 Ω'])
  })

  it('shows the requested symmetric three-ohm delta substitution from M3', () => {
    const { lesson } = lessonFor(sourceFor('delta3'), 'delta-to-star')
    expect(lesson.steps[2].substitutions).toEqual([
      'R_{A} = (3 × 3) / (3 + 3 + 3) = 1 Ω',
      'R_{B} = (3 × 3) / (3 + 3 + 3) = 1 Ω',
      'R_{C} = (3 × 3) / (3 + 3 + 3) = 1 Ω',
    ])
  })

  it('maps delta edge variables by electrical endpoints rather than ID order or orientation', () => {
    const base = sourceFor('delta')
    const source = createCircuitNetwork({ ...base, elements: base.elements.map((e, i) => ({ ...e, id: ['z', 'a', 'm'][i]!, endpoints: [e.endpoints[1], e.endpoints[0]] })) })
    const { lesson } = lessonFor(source, 'delta-to-star')
    expect(lesson.variables.find(v => v.variable === 'R_{AB}')?.elementId).toBe('z')
    expect(lesson.variables.find(v => v.variable === 'R_{BC}')?.elementId).toBe('a')
    expect(lesson.variables.find(v => v.variable === 'R_{CA}')?.elementId).toBe('m')
    expect(lesson.steps[2].substitutions[0]).toBe('R_{A} = (300 × 900) / (300 + 600 + 900) = 150 Ω')
  })

  it('divides each star-to-delta edge by the opposite star arm and reads M3 output', () => {
    const { lesson, applied } = lessonFor(sourceFor('star'), 'star-to-delta')
    expect(lesson.steps[1].formulas).toContain('R_{AB} = P / R_{C}')
    expect(lesson.steps[1].formulas).toContain('R_{BC} = P / R_{A}')
    expect(lesson.steps[1].formulas).toContain('R_{CA} = P / R_{B}')
    expect(lesson.steps[2].substitutions).toEqual([
      'R_{AB} = (100 × 200 + 200 × 300 + 300 × 100) / 300 = 366.6666667 Ω',
      'R_{BC} = (100 × 200 + 200 × 300 + 300 × 100) / 100 = 1100 Ω',
      'R_{CA} = (100 × 200 + 200 × 300 + 300 × 100) / 200 = 550 Ω',
    ])
    expect(lesson.variables.find(v => v.variable === 'R_{CA}')?.elementId).toBe(applied.metadata.replacements.find(r => r.endpoints.includes('A') && r.endpoints.includes('C'))?.id)
  })

  it('keeps full replacement precision while formatting display values', () => {
    const { lesson, applied } = lessonFor(sourceFor('star'), 'star-to-delta')
    const branch = applied.metadata.replacements[0]!
    expect(lesson.variables.find(v => v.elementId === branch.id)?.resistance).toBe(branch.resistance)
    expect(Number(formatNumber(branch.resistance))).not.toBe(branch.resistance)
  })

  it('corresponds to actual bridge vertex labels and retains unaffected branches', () => {
    const { lesson } = lessonFor(sourceFor('bridge'), 'delta-to-star')
    expect(lesson.nodeMappings.map(n => n.alias)).toEqual(['A', 'D', 'U'])
    expect(lesson.steps[1].formulas).toContain('S = R_{AD} + R_{DU} + R_{UA}')
    expect(lesson.preservedElementIds).toEqual(['R2', 'R4'])
  })

  it('reports retained center wire groups from M3 metadata', () => {
    const { lesson } = lessonFor(sourceFor('residual'), 'series')
    expect(lesson.metadata.retainedInternalNodeIds).toContain('node:N')
    expect(lesson.preservedElementIds).toContain('W1')
  })

  it('rejects mismatched candidate metadata instead of guessing a lesson', () => {
    const source = sourceFor('series')
    const { candidate, applied, verification } = lessonFor(source, 'series')
    expect(buildLesson(source, { ...candidate, id: 'different-selection' }, applied, verification).kind).toBe('unavailable')
  })

  it('synchronizes structural and port-only highlighting with the stage', () => {
    const { lesson } = lessonFor(sourceFor('delta3'), 'delta-to-star')
    expect(lessonHighlights(lesson, 0).showAfter).toBe(false)
    expect(lessonHighlights(lesson, 3).createdNodeIds).toEqual(lesson.metadata.createdNodeIds)
    expect(lessonHighlights(lesson, 3).replacementIds).toEqual(lesson.metadata.replacementResistorIds)
    expect(lessonHighlights(lesson, 4).selectedIds).toEqual([])
    expect(lessonHighlights(lesson, 4).originalNodeIds).toEqual(lesson.metadata.boundaryNodeIds)
  })

  it('retains an actual inconclusive verification result when no terminal pair exists', () => {
    const base = sourceFor('delta3')
    const source = createCircuitNetwork({ ...base, terminals: [] })
    const { lesson } = lessonFor(source, 'delta-to-star')
    expect(lesson.verification.kind).toBe('inconclusive')
    expect(lesson.verification.pairs).toEqual([])
  })
})

