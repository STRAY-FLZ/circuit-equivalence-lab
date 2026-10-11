// @vitest-environment node
import { expect, it } from 'vitest'
import { resistanceOhms } from '../domain'
import { analyzeTopology } from '../topology'
import { solveEquivalentResistance } from './index'

/** Exact cofactor expansion; independent of floating-point Cholesky and its helpers. */
function determinant(matrix: readonly (readonly bigint[])[]): bigint {
  if (matrix.length === 0) return 1n
  const first = matrix[0]
  if (!first) throw new Error('Missing first row')
  return first.reduce((sum, entry, column) => {
    const minor = matrix.slice(1).map(row => row.filter((_, index) => index !== column))
    return sum + (column % 2 ? -1n : 1n) * entry * determinant(minor)
  }, 0n)
}

function minor(matrix: readonly (readonly bigint[])[], excluded: readonly number[]) {
  return matrix.filter((_, i) => !excluded.includes(i)).map(row => row.filter((_, j) => !excluded.includes(j)))
}

it('matches exact Laplacian cofactor ratios on 32 connected integer-conductance multigraphs', () => {
  let seed = 0x732510
  const next = (limit: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed % limit
  }
  for (let sample = 0; sample < 32; sample++) {
    const n = 3 + next(4)
    const edges: { a: number; b: number; g: number }[] = []
    for (let i = 1; i < n; i++) edges.push({ a: i - 1, b: i, g: 1 + next(4) })
    for (let i = 0; i < 12; i++) edges.push({ a: next(n), b: next(n), g: 1 + next(4) })
    const laplacian = Array.from({ length: n }, () => Array<bigint>(n).fill(0n))
    for (const { a, b, g } of edges) {
      const rowA = laplacian[a]
      const rowB = laplacian[b]
      if (!rowA || !rowB) throw new Error('Missing row')
      // Sequential stamps also cancel self-loops exactly.
      rowA[a] = (rowA[a] ?? 0n) + BigInt(g)
      rowB[b] = (rowB[b] ?? 0n) + BigInt(g)
      rowA[b] = (rowA[b] ?? 0n) - BigInt(g)
      rowB[a] = (rowB[a] ?? 0n) - BigInt(g)
    }
    // Cramer's rule: V0 for unit injection is this cofactor ratio, grounding n-1.
    const numerator = determinant(minor(laplacian, [0, n - 1]))
    const denominator = determinant(minor(laplacian, [n - 1]))
    expect(denominator).toBeGreaterThan(0n)
    const expected = Number(numerator) / Number(denominator)
    const ids = Array.from({ length: n }, (_, i) => `p${i}`)
    const t = analyzeTopology({
      id: `exact-${sample}`, points: ids.map(id => ({ id })),
      elements: edges.map(({ a, b, g }, i) => ({
        id: `r${i}`, kind: 'resistor', endpoints: [`p${a}`, `p${b}`], resistance: resistanceOhms(1 / g),
      })),
      terminals: ids.map(id => ({ id, label: id, pointId: id })),
    })
    for (const [a, b] of [['p0', `p${n - 1}`], [`p${n - 1}`, 'p0']] as const) {
      const result = solveEquivalentResistance(t, a, b)
      expect(result.kind, JSON.stringify(result)).toBe('finite')
      if (result.kind !== 'finite') throw new Error('Reference graph failed')
      expect(Math.abs(result.resistance - expected)).toBeLessThanOrEqual(1e-12 + 1e-10 * expected)
      expect(result.diagnostics.maxKclResidualAmps).toBeLessThan(1e-10)
    }
  }
})
