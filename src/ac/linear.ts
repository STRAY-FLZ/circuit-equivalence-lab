import { abs, c, div, finite, mul, sub } from './complex'
import type { Complex } from './complex'
import { AcError } from './types'

/** Complex row/column equilibration and complete pivoting; no arbitrary free variables. */
export function solveComplex(matrix: readonly (readonly Complex[])[], rhs: readonly Complex[]): { values: Complex[]; pivotRatio: number } {
  const n = rhs.length
  if (!n) return { values: [], pivotRatio: 1 }
  if (matrix.some(row => row.some(v => !finite(v))) || rhs.some(v => !finite(v))) throw new AcError('AC_RANGE', '复数矩阵超出有限范围。', [], 'numerical')
  const rowScale = matrix.map(row => Math.max(...row.map(abs)) || 1)
  const a = matrix.map((row, i) => row.map(v => div(v, c(rowScale[i]!)))), b = rhs.map((v, i) => div(v, c(rowScale[i]!)))
  const colScale = Array.from({ length: n }, (_, j) => Math.max(...a.map(row => abs(row[j]!))) || 1)
  for (const row of a) for (let j = 0; j < n; j++) row[j] = div(row[j]!, c(colScale[j]!))
  const permutation = Array.from({ length: n }, (_, i) => i), pivots: number[] = [], tolerance = 64 * Number.EPSILON * n, rhsScale = Math.max(1, ...b.map(abs))
  for (let k = 0; k < n; k++) {
    let magnitude = 0, pi = k, pj = k
    for (let i = k; i < n; i++) for (let j = k; j < n; j++) if (abs(a[i]![j]!) > magnitude) { magnitude = abs(a[i]![j]!); pi = i; pj = j }
    if (magnitude <= tolerance) {
      if (b.slice(k).some(v => abs(v) > tolerance * rhsScale)) throw new AcError('AC_INCONSISTENT', '复数约束互相矛盾；检查理想源及无回路电流源。', [], 'numerical')
      throw new AcError('AC_UNDERDETERMINED', '复数节点电压或源电流不唯一；检查浮置网络及冗余约束。', [], 'numerical')
    }
    ;[a[k], a[pi]] = [a[pi]!, a[k]!]; [b[k], b[pi]] = [b[pi]!, b[k]!]
    for (const row of a) [row[k], row[pj]] = [row[pj]!, row[k]!]
    ;[permutation[k], permutation[pj]] = [permutation[pj]!, permutation[k]!]
    pivots.push(magnitude)
    for (let i = k + 1; i < n; i++) {
      const factor = div(a[i]![k]!, a[k]![k]!); a[i]![k] = c()
      for (let j = k + 1; j < n; j++) a[i]![j] = sub(a[i]![j]!, mul(factor, a[k]![j]!))
      b[i] = sub(b[i]!, mul(factor, b[k]!))
    }
  }
  const pivotRatio = Math.min(...pivots) / Math.max(...pivots)
  if (pivotRatio < 1e-10) throw new AcError('AC_ILL_CONDITIONED', '缩放复数主元差异过大，结果可能对舍入敏感。', [], 'numerical')
  const z = Array.from({ length: n }, () => c()), values = [...z]
  for (let i = n - 1; i >= 0; i--) { let sum = b[i]!; for (let j = i + 1; j < n; j++) sum = sub(sum, mul(a[i]![j]!, z[j]!)); z[i] = div(sum, a[i]![i]!) }
  for (let i = 0; i < n; i++) values[permutation[i]!] = div(z[i]!, c(colScale[permutation[i]!]!))
  if (values.some(v => !finite(v))) throw new AcError('AC_RANGE', '复数解超出有限范围。', [], 'numerical')
  return { values, pivotRatio }
}
