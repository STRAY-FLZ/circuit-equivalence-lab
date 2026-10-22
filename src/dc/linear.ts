import { DcError } from './types'

/** Dense, equilibrated complete-pivot elimination; never supplies arbitrary free variables. */
export function solveLinear(matrix: readonly (readonly number[])[], rhs: readonly number[]): { values: number[]; backwardError: number; pivotRatio: number } {
  const n = rhs.length
  if (!n) return { values: [], backwardError: 0, pivotRatio: 1 }
  if (matrix.some(row => row.some(v => !Number.isFinite(v))) || rhs.some(v => !Number.isFinite(v))) throw new DcError('DC_RANGE', '矩阵超出有限数值范围。', [], 'numerical')
  const rowScale = matrix.map(row => Math.max(...row.map(Math.abs)) || 1)
  const a = matrix.map((row, i) => row.map(v => v / rowScale[i]!)), b = rhs.map((v, i) => v / rowScale[i]!)
  const colScale = Array.from({ length: n }, (_, j) => Math.max(...a.map(row => Math.abs(row[j]!))) || 1)
  for (const row of a) for (let j = 0; j < n; j++) row[j] = row[j]! / colScale[j]!
  const permutation = Array.from({ length: n }, (_, i) => i), pivots: number[] = []
  const tolerance = 64 * Number.EPSILON * n, rhsScale = Math.max(1, ...b.map(Math.abs))
  for (let k = 0; k < n; k++) {
    let magnitude = 0, pi = k, pj = k
    for (let i = k; i < n; i++) for (let j = k; j < n; j++) if (Math.abs(a[i]![j]!) > magnitude) { magnitude = Math.abs(a[i]![j]!); pi = i; pj = j }
    if (magnitude <= tolerance) {
      if (b.slice(k).some(v => Math.abs(v) > tolerance * rhsScale)) throw new DcError('DC_INCONSISTENT', '方程互相矛盾：请检查理想电压源约束、短接电源或无回路电流源。', [], 'numerical')
      throw new DcError('DC_UNDERDETERMINED', '节点电位或理想源电流不唯一：可能存在浮置网络、断开的支路或冗余理想源约束。未生成任意零值解。', [], 'numerical')
    }
    ;[a[k], a[pi]] = [a[pi]!, a[k]!]; [b[k], b[pi]] = [b[pi]!, b[k]!]
    for (const row of a) [row[k], row[pj]] = [row[pj]!, row[k]!]
    ;[permutation[k], permutation[pj]] = [permutation[pj]!, permutation[k]!]
    pivots.push(magnitude)
    for (let i = k + 1; i < n; i++) {
      const factor = a[i]![k]! / a[k]![k]!
      a[i]![k] = 0
      for (let j = k + 1; j < n; j++) a[i]![j] = a[i]![j]! - factor * a[k]![j]!
      b[i] = b[i]! - factor * b[k]!
    }
  }
  const pivotRatio = Math.min(...pivots) / Math.max(...pivots)
  if (pivotRatio < 1e-10) throw new DcError('DC_ILL_CONDITIONED', '缩放后的主元差异过大，结果可能对舍入误差敏感；请调整参数或约束。', [], 'numerical')
  const z = new Array<number>(n).fill(0), values = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) { let sum = b[i]!; for (let j = i + 1; j < n; j++) sum -= a[i]![j]! * z[j]!; z[i] = sum / a[i]![i]! }
  for (let i = 0; i < n; i++) values[permutation[i]!] = z[i]! / colScale[permutation[i]!]!
  if (values.some(v => !Number.isFinite(v))) throw new DcError('DC_RANGE', '求解结果超出有限数值范围。', [], 'numerical')
  let backwardError = 0
  for (let i = 0; i < n; i++) {
    const products = matrix[i]!.map((v, j) => v * values[j]!)
    const residual = Math.abs(products.reduce((s, v) => s + v, 0) - rhs[i]!), scale = Math.abs(rhs[i]!) + products.reduce((s, v) => s + Math.abs(v), 0)
    backwardError = Math.max(backwardError, scale ? residual / scale : residual)
  }
  if (!Number.isFinite(backwardError) || backwardError > 1e-9) throw new DcError('DC_RESIDUAL', '原单位方程的归一化残差未通过，不能报告有效解。', [], 'numerical')
  return { values, backwardError, pivotRatio }
}
