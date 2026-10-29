import { abs, c, div, phase } from '../ac'
import { AcError } from '../ac/types'
import type { SweepPoint } from '../ac'

export function validateOpampModel(gain: number, poleHz: number): void {
  if (!Number.isFinite(gain) || gain <= 0 || gain > 1e9 || !Number.isFinite(poleHz) || poleHz < 1e-6 || poleHz > 1e12) throw new AcError('OPAMP_MODEL', 'A0 必须为 0–10⁹ 的有限正数，主极点必须为 10⁻⁶–10¹² Hz。')
}
export function openLoopGain(gain: number, poleHz: number, frequencyHz: number) {
  validateOpampModel(gain, poleHz)
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0 || !Number.isFinite(frequencyHz / poleHz)) throw new AcError('OPAMP_FREQUENCY', '频率必须为有限正数且处于可计算范围。')
  return div(c(gain), c(1, frequencyHz / poleHz))
}
export function pointFromComplex(frequencyHz: number, transfer: { readonly real: number; readonly imaginary: number }): SweepPoint {
  const magnitude = abs(transfer)
  if (!Number.isFinite(magnitude)) throw new AcError('OPAMP_RANGE', '增益超出有限数值范围。', [], 'numerical')
  return { kind: 'available', frequencyHz, transfer, magnitude, gainDb: magnitude > 0 ? 20 * Math.log10(magnitude) : null, phaseDegrees: phase(transfer) }
}
/** A unique adjacent crossing only; do not interpolate over missing samples. */
export function crossing(points: readonly SweepPoint[], targetDb: number, spacing: 'linear' | 'log'): { frequencyHz: number; index: number; t: number } | null {
  if (points.some(p => p.kind === 'failed')) return null
  const found: { frequencyHz: number; index: number; t: number }[] = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!
    if (a.kind !== 'available' || b.kind !== 'available' || a.gainDb === null || b.gainDb === null || a.gainDb === b.gainDb) continue
    if ((a.gainDb - targetDb) * (b.gainDb - targetDb) > 0) continue
    const t = (targetDb - a.gainDb) / (b.gainDb - a.gainDb)
    const frequencyHz = spacing === 'log' ? Math.exp(Math.log(a.frequencyHz) + t * Math.log(b.frequencyHz / a.frequencyHz)) : a.frequencyHz + t * (b.frequencyHz - a.frequencyHz)
    if (!found.some(x => Math.abs(x.frequencyHz - frequencyHz) <= frequencyHz * 1e-10)) found.push({ frequencyHz, index: i, t })
  }
  return found.length === 1 ? found[0]! : null
}
