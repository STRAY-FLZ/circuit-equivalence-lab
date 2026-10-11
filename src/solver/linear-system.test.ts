// @vitest-environment node
import { expect, it } from 'vitest'
import { solveGroundedLaplacian } from './linear-system'
import { DenseMatrix } from './numerics'

function matrix(rows: readonly (readonly number[])[]): DenseMatrix {
  const result = new DenseMatrix(rows.length)
  rows.forEach((row, i) => row.forEach((value, j) => result.set(i, j, value)))
  return result
}

it('solves a known SPD system and estimates its equilibrated condition without mutation', () => {
  const input = matrix([[2, -1], [-1, 2]])
  const rhs = [1, 0]
  const result = solveGroundedLaplacian(input, rhs)
  expect(result.solution[0]).toBeCloseTo(2 / 3, 12)
  expect(result.solution[1]).toBeCloseTo(1 / 3, 12)
  // Equilibrated eigenvalues 1/2 and 3/2; infinity condition number is 3.
  expect(result.reciprocalConditionEstimate).toBeCloseTo(1 / 3, 12)
  expect(result.relativeResidual).toBeLessThan(1e-12)
  expect(input.get(0, 0)).toBe(2)
  expect(rhs).toEqual([1, 0])
})

it.each([1e-200, 1, 1e200])('equilibration permits a uniform matrix scale %s', scale => {
  const result = solveGroundedLaplacian(matrix([[2 * scale, -scale], [-scale, 2 * scale]]), [scale, 0])
  expect(result.solution[0]).toBeCloseTo(2 / 3, 12)
  expect(result.solution[1]).toBeCloseTo(1 / 3, 12)
})

it.each([
  { name: 'singular', rows: [[1, -1], [-1, 1]] },
  { name: 'indefinite', rows: [[1, -2], [-2, 1]] },
  { name: 'asymmetric', rows: [[2, -1], [0, 2]] },
  { name: 'not an M-matrix', rows: [[2, 1], [1, 2]] },
  { name: 'zero diagonal', rows: [[0, 0], [0, 1]] },
])('rejects a $name matrix with a numerical error', ({ rows }) => {
  expect(() => solveGroundedLaplacian(matrix(rows), [1, 0])).toThrow()
  try { solveGroundedLaplacian(matrix(rows), [1, 0]) } catch (error) {
    expect(error).toMatchObject({ code: 'numerical-failure' })
  }
})

it('rejects a nearly singular system even if Cholesky pivots are positive', () => {
  // rcond=(1-c)/(1+c) ~ 2e-14 < 128*eps; pivot=1-c^2 ~ 8e-14 > 128*eps.
  const coupling = 1 - 4e-14
  expect(() => solveGroundedLaplacian(matrix([[1, -coupling], [-coupling, 1]]), [1, 0])).toThrow(/condition/)
})

it('detects non-finite excitation during equilibration', () => {
  expect(() => solveGroundedLaplacian(matrix([[1]]), [Infinity])).toThrow(/Non-finite/)
})
