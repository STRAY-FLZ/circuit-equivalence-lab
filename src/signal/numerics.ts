import type { ResourceRef } from '../engineering'

export const SIGNAL_ENGINE: ResourceRef = Object.freeze({ id: 'org.stray.signal.educational', version: '1' })
export const MAX_SAMPLES = 65536
export const MAX_CHANNELS = 4
export class SignalError extends Error {
  constructor(readonly code: string, message: string, readonly row?: number, readonly column?: number) { super(message); this.name = 'SignalError' }
}
export interface UniformAxis { readonly kind: 'uniform-time'; readonly startSeconds: number; readonly intervalSeconds: number; readonly count: number }
export type WaveKind = 'sine' | 'square' | 'triangle' | 'pulse' | 'noise'
export interface GeneratorOptions {
  readonly kind: WaveKind; readonly frequencyHz: number; readonly amplitude: number; readonly offset: number
  readonly phaseRadians: number; readonly sampleRateHz: number; readonly count: number; readonly dutyCycle: number; readonly seed: number
}
export const DEFAULT_GENERATOR: GeneratorOptions = Object.freeze({ kind: 'sine', frequencyHz: 100, amplitude: 1, offset: 0, phaseRadians: 0, sampleRateHz: 1024, count: 1024, dutyCycle: 0.5, seed: 12345 })

export function validateAxis(axis: UniformAxis): void {
  const { startSeconds: t, intervalSeconds: dt, count: n } = axis
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_SAMPLES) throw new SignalError('sample-limit', `采样点数须为 1–${MAX_SAMPLES} 的整数，不会截断数据。`)
  const end = t + (n - 1) * dt
  if (!Number.isFinite(t) || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(1 / dt) || !Number.isFinite(end) || (n > 1 && (!(t + dt > t) || !(end > t + (n - 2) * dt)))) throw new SignalError('time-range', '采样起点、间隔、采样率和末端时间须有限且可区分。')
}
export function validateSamples(values: ArrayLike<number>, count = values.length): void {
  if (values.length !== count || !Number.isSafeInteger(count) || count < 1 || count > MAX_SAMPLES) throw new SignalError('sample-count', '通道长度必须与采样轴一致，并符合点数限制。')
  for (let i = 0; i < count; i++) if (!Number.isFinite(values[i])) throw new SignalError('nonfinite', `第 ${i + 1} 个样本不是有限数值。`)
}
export function generateSamples(options: GeneratorOptions): { readonly axis: UniformAxis; readonly values: Float64Array; readonly diagnostics: readonly string[] } {
  const o = options, axis: UniformAxis = { kind: 'uniform-time', startSeconds: 0, intervalSeconds: 1 / o.sampleRateHz, count: o.count }
  validateAxis(axis)
  if (!['sine', 'square', 'triangle', 'pulse', 'noise'].includes(o.kind)) throw new SignalError('wave-kind', '不支持的波形。')
  if (![o.amplitude, o.offset, o.phaseRadians, o.frequencyHz, o.dutyCycle].every(Number.isFinite) || o.amplitude < 0 || o.frequencyHz <= 0 || o.sampleRateHz <= 0 || o.dutyCycle <= 0 || o.dutyCycle >= 1 || !Number.isSafeInteger(o.seed) || o.seed < 0 || o.seed > 0xffffffff) throw new SignalError('generator-options', '幅值须非负，频率/采样率须为正数，占空比在 0 与 1 之间，种子为 uint32；参数均须有限。')
  if (o.kind !== 'noise' && o.frequencyHz >= o.sampleRateHz / 2) throw new SignalError('nyquist', '基频必须小于采样率的一半；请提高采样率或降低频率。')
  let state = o.seed >>> 0
  const values = new Float64Array(o.count)
  for (let i = 0; i < values.length; i++) {
    const cycles = i * (o.frequencyHz / o.sampleRateHz) + (o.phaseRadians / (2 * Math.PI)) % 1, p = cycles - Math.floor(cycles)
    let normalized: number
    switch (o.kind) {
      case 'sine': normalized = Math.sin(2 * Math.PI * p); break
      case 'square': normalized = p < o.dutyCycle ? 1 : -1; break
      case 'triangle': normalized = 1 - 4 * Math.abs(p - 0.5); break
      case 'pulse': normalized = p < o.dutyCycle ? 1 : 0; break
      case 'noise': state = (Math.imul(state, 1664525) + 1013904223) >>> 0; normalized = 2 * (state / 4294967296) - 1; break
    }
    values[i] = o.offset + o.amplitude * normalized
  }
  validateSamples(values)
  return { axis, values, diagnostics: o.kind === 'square' || o.kind === 'triangle' || o.kind === 'pulse' ? ['离散采样的非正弦波含高次谐波，可能发生混叠；此处不是带限合成器。'] : [] }
}
function compensatedMean(values: ArrayLike<number>, scale: number): number {
  if (scale === 0) return 0
  let sum = 0, correction = 0
  for (let i = 0; i < values.length; i++) { const y = values[i]! / scale - correction, next = sum + y; correction = (next - sum) - y; sum = next }
  return sum / values.length
}
export interface SampleStatistics { readonly minimum: number; readonly maximum: number; readonly peakToPeak: number; readonly mean: number; readonly totalRms: number; readonly acRms: number }
export function sampleStatistics(values: ArrayLike<number>): SampleStatistics {
  validateSamples(values)
  let minimum = Infinity, maximum = -Infinity, scale = 0
  for (let i = 0; i < values.length; i++) { const x = values[i]!; minimum = Math.min(minimum, x); maximum = Math.max(maximum, x); scale = Math.max(scale, Math.abs(x)) }
  const normalizedMean = compensatedMean(values, scale)
  let sumSquare = 0, sumAc = 0
  if (scale) for (let i = 0; i < values.length; i++) { const x = values[i]! / scale; sumSquare += x * x; sumAc += (x - normalizedMean) ** 2 }
  const result = { minimum, maximum, peakToPeak: maximum - minimum, mean: normalizedMean * scale, totalRms: Math.sqrt(sumSquare / values.length) * scale, acRms: Math.sqrt(sumAc / values.length) * scale }
  if (!Object.values(result).every(Number.isFinite)) throw new SignalError('numerical-range', '测量结果超出浮点数范围；没有生成有效数值结论。')
  return result
}
export type FrequencyEstimate = { readonly kind: 'available'; readonly hertz: number; readonly periods: number; readonly relativeSpread: number } | { readonly kind: 'unavailable'; readonly reason: string }
export function estimateFrequency(values: ArrayLike<number>, axis: UniformAxis): FrequencyEstimate {
  validateAxis(axis); validateSamples(values, axis.count)
  const s = sampleStatistics(values)
  const unavailable = (reason: string): FrequencyEstimate => ({ kind: 'unavailable', reason })
  if (values.length < 24 || s.peakToPeak === 0) return unavailable('样本或变化不足，无法估计频率。')
  const scale = Math.max(Math.abs(s.minimum), Math.abs(s.maximum)), center = s.mean / scale, hysteresis = s.peakToPeak / scale * 0.05
  const crossings: number[] = []; let armed = false
  for (let i = 1; i < values.length; i++) {
    const before = values[i - 1]! / scale - center, after = values[i]! / scale - center
    if (before < -hysteresis) armed = true
    if (armed && before <= 0 && after > 0) { crossings.push(i - 1 - before / (after - before)); armed = false }
  }
  if (crossings.length < 4) return unavailable('至少需要三个可辨识的完整周期（四次上升过均值）。')
  const periods = crossings.slice(1).map((x, i) => x - crossings[i]!), mean = periods.reduce((a, b) => a + b, 0) / periods.length
  const spread = Math.max(...periods.map(p => Math.abs(p - mean))) / mean
  if (mean < 8 || spread > 0.02) return unavailable('周期不稳定或每周期采样不足；不对噪声/含混信号报告频率。')
  return { kind: 'available', hertz: 1 / (mean * axis.intervalSeconds), periods: periods.length, relativeSpread: spread }
}

export interface SpectrumOptions { readonly window: 'rectangular' | 'hann'; readonly removeMean: boolean }
export interface AmplitudeSpectrum {
  readonly frequencies: Float64Array; readonly amplitudes: Float64Array
  readonly sampleCount: number; readonly sampleRateHz: number; readonly binSpacingHz: number
  readonly captureSeconds: number; readonly coherentGain: number; readonly options: SpectrumOptions
  readonly normalization: 'one-sided-peak-amplitude'; readonly peak: { readonly hertz: number; readonly amplitude: number } | null
}
export function amplitudeSpectrum(values: ArrayLike<number>, axis: UniformAxis, options: SpectrumOptions): AmplitudeSpectrum {
  validateAxis(axis); validateSamples(values, axis.count)
  const n = values.length
  if (n < 2 || (n & (n - 1)) !== 0) throw new SignalError('fft-count', 'FFT 需要 2 的幂次点数（2–65536）；未截断、填零或重采样。')
  if (!['rectangular', 'hann'].includes(options.window)) throw new SignalError('fft-window', '不支持的窗函数。')
  const stats = sampleStatistics(values), scale = Math.max(Math.abs(stats.minimum), Math.abs(stats.maximum)) || 1
  const re = new Float64Array(n), im = new Float64Array(n)
  let windowSum = 0
  for (let i = 0; i < n; i++) { const w = options.window === 'hann' ? 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n) : 1; windowSum += w; re[i] = (values[i]! / scale - (options.removeMean ? stats.mean / scale : 0)) * w }
  // Iterative radix-2 Cooley-Tukey, unnormalized forward DFT with exp(-jωt).
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) [re[i], re[j]] = [re[j]!, re[i]!] }
  for (let length = 2; length <= n; length *= 2) {
    const angle = -2 * Math.PI / length, wr = Math.cos(angle), wi = Math.sin(angle)
    for (let base = 0; base < n; base += length) {
      let ur = 1, ui = 0
      for (let k = 0; k < length / 2; k++) {
        const a = base + k, b = a + length / 2, tr = ur * re[b]! - ui * im[b]!, ti = ur * im[b]! + ui * re[b]!
        re[b] = re[a]! - tr; im[b] = im[a]! - ti; re[a] = re[a]! + tr; im[a] = im[a]! + ti
        const next = ur * wr - ui * wi; ui = ur * wi + ui * wr; ur = next
      }
    }
  }
  const amplitudes = new Float64Array(n / 2 + 1), frequencies = new Float64Array(amplitudes.length), sampleRateHz = 1 / axis.intervalSeconds
  let peakIndex = 0
  for (let k = 0; k < amplitudes.length; k++) {
    frequencies[k] = k * sampleRateHz / n
    amplitudes[k] = Math.hypot(re[k]!, im[k]!) / windowSum * scale * (k === 0 || k === n / 2 ? 1 : 2)
    if (!Number.isFinite(amplitudes[k])) throw new SignalError('numerical-range', 'FFT 幅值超出可表示范围。')
    if (k > 0 && amplitudes[k]! > amplitudes[peakIndex]!) peakIndex = k
  }
  return { frequencies, amplitudes, sampleCount: n, sampleRateHz, binSpacingHz: sampleRateHz / n, captureSeconds: n * axis.intervalSeconds, coherentGain: windowSum / n, options: { ...options }, normalization: 'one-sided-peak-amplitude', peak: amplitudes[peakIndex]! > 0 ? { hertz: frequencies[peakIndex]!, amplitude: amplitudes[peakIndex]! } : null }
}
