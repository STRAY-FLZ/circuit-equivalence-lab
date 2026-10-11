import { resistanceOhms } from '../domain'
import type { ResistanceOhms } from '../domain'

export class TransformationNumericalError extends Error {}

function checked(value: number): ResistanceOhms {
  if (!Number.isFinite(value) || value <= 0) throw new TransformationNumericalError('Calculated resistance is not finite and strictly positive.')
  return resistanceOhms(value)
}

function scaled(scale: number, factor: number): ResistanceOhms {
  const value = checked(scale * factor)
  if (Math.abs(value / scale - factor) / factor > 1e-12) {
    throw new TransformationNumericalError('Resistance loses significant digits during physical-unit conversion.')
  }
  return value
}

export function series(values: readonly number[]): ResistanceOhms {
  const scale = Math.max(...values)
  return scaled(scale, values.reduce((sum, value) => sum + value / scale, 0))
}

export function parallel(values: readonly number[]): ResistanceOhms {
  const scale = values.reduce((minimum, value) => Math.min(minimum, value), Infinity)
  const conductance = values.reduce((sum, value) => sum + scale / value, 0)
  return scaled(scale, 1 / conductance)
}

/** a*b / sum(delta): bounded ratio first avoids both product and sum overflow. */
export function deltaLeg(a: number, b: number, all: readonly number[]): ResistanceOhms {
  const scale = Math.max(...all)
  const denominator = all.reduce((sum, value) => sum + value / scale, 0)
  return scaled(Math.min(a, b), (Math.max(a, b) / scale) / denominator)
}

function binary(value: number): readonly [number, number] {
  let exponent = Math.max(-1074, Math.min(1023, Math.floor(Math.log2(value))))
  let mantissa = value / 2 ** exponent
  while (mantissa >= 2) { mantissa /= 2; exponent++ }
  while (mantissa < 1) { mantissa *= 2; exponent-- }
  return [mantissa, exponent]
}

/** Evaluate a*b/c with bounded mantissas, even when a*b or b/c is unrepresentable. */
function productRatio(a: number, b: number, c: number): number {
  const [ma, ea] = binary(a)
  const [mb, eb] = binary(b)
  const [mc, ec] = binary(c)
  let mantissa = ma * mb / mc
  let exponent = ea + eb - ec
  while (mantissa >= 2) { mantissa /= 2; exponent++ }
  while (mantissa < 1) { mantissa *= 2; exponent-- }
  // A subnormal term may be negligible in a+b+term. Bound its relative effect
  // by < 2^-43 before omitting it; otherwise report an unrepresentable result.
  if (exponent < -1074 && exponent - Math.max(ea, eb) < -44) return 0
  if (exponent < -1074 || exponent > 1023) throw new TransformationNumericalError('Star-to-delta product ratio exceeds floating-point range.')
  return scaled(2 ** exponent, mantissa)
}

export function starEdge(a: number, b: number, opposite: number): ResistanceOhms {
  return series([a, b, productRatio(a, b, opposite)])
}
