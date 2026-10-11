import { DenseMatrix, entry, finite, positive, SolverFailure } from './numerics'

function triangularSolve(lower: DenseMatrix, rhs: ArrayLike<number>): Float64Array {
  const n = lower.size
  const result = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let sum = entry(rhs, i)
    for (let j = 0; j < i; j++) sum -= lower.get(i, j) * entry(result, j)
    result[i] = finite(sum / lower.get(i, i), 'forward substitution')
  }
  for (let i = n - 1; i >= 0; i--) {
    let sum = entry(result, i)
    for (let j = i + 1; j < n; j++) sum -= lower.get(j, i) * entry(result, j)
    result[i] = finite(sum / lower.get(i, i), 'back substitution')
  }
  return result
}

/** Internal solver for grounded Laplacians (SPD M-matrices), not arbitrary matrices. */
export function solveGroundedLaplacian(matrix: DenseMatrix, rhs: ArrayLike<number>) {
  const n = matrix.size
  const threshold = 64 * Number.EPSILON * Math.max(1, n)
  const scales = Float64Array.from({ length: n }, (_, i) => Math.sqrt(positive(matrix.get(i, i), `diagonal ${i}`)))
  const equilibrated = new DenseMatrix(n)
  const scaledRhs = new Float64Array(n)
  let norm = 0
  for (let i = 0; i < n; i++) {
    let rowSum = 0
    scaledRhs[i] = finite(entry(rhs, i) / entry(scales, i), 'scaled excitation')
    for (let j = 0; j <= i; j++) {
      if (matrix.get(i, j) !== matrix.get(j, i) || (i !== j && matrix.get(i, j) > 0)) {
        throw new SolverFailure('numerical-failure', 'Expected a symmetric grounded Laplacian with nonpositive off-diagonals.')
      }
      const value = i === j ? 1 : (matrix.get(i, j) / entry(scales, i)) / entry(scales, j)
      equilibrated.set(i, j, value)
      equilibrated.set(j, i, value)
    }
    for (let j = 0; j < n; j++) rowSum += Math.abs(matrix.get(i, j) / entry(scales, i) / entry(scales, j))
    norm = Math.max(norm, finite(rowSum, 'equilibrated matrix norm'))
  }
  const lower = new DenseMatrix(n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = equilibrated.get(i, j)
      for (let k = 0; k < j; k++) sum -= lower.get(i, k) * lower.get(j, k)
      finite(sum, 'Cholesky update')
      if (i === j) {
        if (sum <= threshold) throw new SolverFailure('numerical-failure', `Unreliable Cholesky pivot at row ${i}; pivot=${sum}, threshold=${threshold}.`)
        lower.set(i, j, Math.sqrt(sum))
      } else lower.set(i, j, sum / lower.get(j, j))
    }
  }
  // An SPD M-matrix has a nonnegative inverse. A^-1 * 1 gives its row sums,
  // hence its infinity norm, using one solve rather than constructing an inverse.
  const inverseRowSums = triangularSolve(lower, new Float64Array(n).fill(1))
  let inverseNorm = 0
  for (const value of inverseRowSums) inverseNorm = Math.max(inverseNorm, positive(value, 'inverse row sum'))
  const reciprocalConditionEstimate = positive((1 / norm) / inverseNorm, 'reciprocal condition estimate')
  if (reciprocalConditionEstimate <= threshold) {
    throw new SolverFailure('numerical-failure', `Ill-conditioned equilibrated system: reciprocal condition estimate=${reciprocalConditionEstimate}, threshold=${threshold}.`)
  }
  const y = triangularSolve(lower, scaledRhs)
  const solution = Float64Array.from(y, (value, i) => finite(value / entry(scales, i), 'normalized voltage'))
  let relativeResidual = 0
  for (let i = 0; i < n; i++) {
    let residual = -entry(rhs, i)
    let magnitude = Math.abs(entry(rhs, i))
    for (let j = 0; j < n; j++) {
      const term = finite(matrix.get(i, j) * entry(solution, j), 'residual product')
      residual += term
      magnitude += Math.abs(term)
    }
    finite(magnitude, 'residual scale')
    const ratio = magnitude === 0 ? Math.abs(residual) : Math.abs(residual) / magnitude
    relativeResidual = Math.max(relativeResidual, finite(ratio, 'relative residual'))
  }
  if (relativeResidual > 512 * Number.EPSILON * Math.max(1, n)) {
    throw new SolverFailure('numerical-failure', `Excessive relative nodal residual: ${relativeResidual}.`)
  }
  return { solution, reciprocalConditionEstimate, relativeResidual }
}
