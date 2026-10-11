import type { SolverErrorCode } from './types'

export class SolverFailure extends Error {
  constructor(readonly code: SolverErrorCode, message: string) {
    super(message)
    this.name = 'SolverFailure'
  }
}

export function finite(value: number, context: string): number {
  if (!Number.isFinite(value)) throw new SolverFailure('numerical-failure', `Non-finite ${context}.`)
  return value
}

export function positive(value: number, context: string): number {
  finite(value, context)
  if (value <= 0) throw new SolverFailure('numerical-failure', `Non-positive or underflowed ${context}.`)
  return value
}

/** Reject loss of significant digits when restoring physical units, including subnormals. */
export function restoreUnits(value: number, scale: number, context: string): number {
  const physical = finite(value * scale, context)
  if (value !== 0) {
    const recovered = finite(physical / scale, `${context} round-trip`)
    if (physical === 0 || Math.abs(recovered - value) / Math.abs(value) > 1e-9) {
      throw new SolverFailure('numerical-failure', `Unreliable physical-unit conversion for ${context}.`)
    }
  }
  return physical
}

export function entry(values: ArrayLike<number>, index: number): number {
  const value = values[index]
  if (value === undefined) throw new Error(`Internal vector index out of range: ${index}`)
  return value
}

export class DenseMatrix {
  private readonly data: Float64Array

  constructor(readonly size: number) {
    this.data = new Float64Array(size * size)
  }

  get(row: number, column: number): number {
    return entry(this.data, row * this.size + column)
  }

  set(row: number, column: number, value: number): void {
    this.data[row * this.size + column] = finite(value, `matrix entry (${row}, ${column})`)
  }

  add(row: number, column: number, value: number): void {
    this.set(row, column, this.get(row, column) + value)
  }
}
