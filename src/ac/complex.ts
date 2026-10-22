import type { ComplexValue } from '../engineering'
export type Complex = ComplexValue
export const c = (real = 0, imaginary = 0): Complex => ({ real, imaginary })
export const add = (a: Complex, b: Complex): Complex => c(a.real + b.real, a.imaginary + b.imaginary)
export const neg = (a: Complex): Complex => c(-a.real, -a.imaginary)
export const sub = (a: Complex, b: Complex): Complex => add(a, neg(b))
export const mul = (a: Complex, b: Complex): Complex => c(a.real * b.real - a.imaginary * b.imaginary, a.real * b.imaginary + a.imaginary * b.real)
export const conj = (a: Complex): Complex => c(a.real, -a.imaginary)
export const abs = (a: Complex): number => Math.hypot(a.real, a.imaginary)
export const finite = (a: Complex): boolean => Number.isFinite(abs(a))
export const phase = (a: Complex): number | null => abs(a) === 0 ? null : Math.atan2(a.imaginary, a.real) * 180 / Math.PI
export function div(a: Complex, b: Complex): Complex {
  const scale = Math.max(Math.abs(b.real), Math.abs(b.imaginary)), br = b.real / scale, bi = b.imaginary / scale, ar = a.real / scale, ai = a.imaginary / scale, den = br * br + bi * bi
  return c((ar * br + ai * bi) / den, (ai * br - ar * bi) / den)
}
export function polar(magnitude: number, degrees: number): Complex { const angle = (degrees % 360) * Math.PI / 180; return c(magnitude * Math.cos(angle), magnitude * Math.sin(angle)) }
