import { AnalogError } from './types'

export const thermalVoltage = (kelvin: number): number => 1.380649e-23 * kelvin / 1.602176634e-19
/** No clipped exponential is ever accepted as a physical device result. */
export function shockley(volts: number, is: number, n: number, temperature: number): { current: number; gd: number } {
  if (![volts, is, n, temperature].every(Number.isFinite) || is <= 0 || n <= 0 || temperature < 200 || temperature > 500) throw new AnalogError('ANALOG_PARAMETER', 'IS、n 必须为正；本模型温度范围为 200–500 K。')
  const vt = n * thermalVoltage(temperature), exponent = volts / vt
  if (exponent > 650) throw new AnalogError('ANALOG_OVERFLOW', '结电压超出有限指数计算范围。', 'numerical')
  const current = is * Math.expm1(exponent), gd = is * Math.exp(exponent) / vt
  if (!Number.isFinite(current) || !Number.isFinite(gd)) throw new AnalogError('ANALOG_OVERFLOW', '结电流或微分电导超出有限数值范围。', 'numerical')
  return { current, gd }
}
/** Signed VDS extension is for Newton iterates only; final reverse VDS is rejected. */
export function mosPoint(vgs: number, vds: number, threshold: number, k: number) {
  if (![vgs, vds, threshold, k].every(Number.isFinite) || threshold <= 0 || k <= 0) throw new AnalogError('ANALOG_PARAMETER', 'nMOS 阈值与 k 必须为正有限值；k 单位为 A/V²。')
  const u = vgs - threshold
  if (u <= 0) return { current: 0, gm: 0, gds: 0, region: 'cutoff' }
  if (vds < u) return { current: k * (u * vds - vds * vds / 2), gm: k * vds, gds: k * (u - vds), region: 'triode' }
  return { current: k * u * u / 2, gm: k * u, gds: 0, region: 'saturation' }
}
