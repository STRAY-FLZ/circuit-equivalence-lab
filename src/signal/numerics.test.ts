import { describe, expect, it } from 'vitest'
import { amplitudeSpectrum, DEFAULT_GENERATOR, estimateFrequency, generateSamples, sampleStatistics, validateAxis } from './numerics'

const options = { ...DEFAULT_GENERATOR }
describe('sampled signal numerical methods', () => {
  it('generates analytical sine samples and a consistent finite axis', () => {
    const g = generateSamples({ ...options, frequencyHz: 1, sampleRateHz: 4, count: 4 })
    expect(Array.from(g.values).map(x => Math.round(x))).toEqual([0, 1, 0, -1])
    expect(g.axis).toEqual({ kind: 'uniform-time', startSeconds: 0, intervalSeconds: 0.25, count: 4 })
    expect(sampleStatistics(g.values).totalRms).toBeCloseTo(Math.SQRT1_2, 14)
  })
  it('uses phase radians, peak amplitude and separate DC offset', () => {
    const g = generateSamples({ ...options, phaseRadians: Math.PI / 2, amplitude: 2, offset: 3 })
    expect(g.values[0]).toBeCloseTo(5, 14)
    const s = sampleStatistics(g.values)
    expect(s.mean).toBeCloseTo(3, 13); expect(s.totalRms).toBeCloseTo(Math.sqrt(11), 13); expect(s.acRms).toBeCloseTo(Math.sqrt(2), 13)
  })
  it.each(['square', 'triangle', 'pulse'] as const)('generates actual %s samples with defined amplitude/duty', kind => {
    const g = generateSamples({ ...options, kind, frequencyHz: 1, sampleRateHz: 8, count: 8, dutyCycle: 0.25 })
    const expected = kind === 'square' ? [1, 1, -1, -1, -1, -1, -1, -1] : kind === 'pulse' ? [1, 1, 0, 0, 0, 0, 0, 0] : [-1, -0.5, 0, 0.5, 1, 0.5, 0, -0.5]
    expect([...g.values]).toEqual(expected); expect(g.diagnostics).toHaveLength(1)
  })
  it('produces deterministic bounded uniform noise, including seed zero', () => {
    const a = generateSamples({ ...options, kind: 'noise', seed: 0 }), b = generateSamples({ ...options, kind: 'noise', seed: 0 })
    expect([...a.values]).toEqual([...b.values]); expect([...a.values]).not.toEqual([...generateSamples({ ...options, kind: 'noise', seed: 1 }).values])
    expect(Math.min(...a.values)).toBeGreaterThanOrEqual(-1); expect(Math.max(...a.values)).toBeLessThan(1)
  })
  it.each([{ frequencyHz: 512 }, { amplitude: -1 }, { sampleRateHz: Infinity }, { count: 65537 }, { dutyCycle: 1 }, { seed: -1 }, { offset: Infinity }])('rejects invalid generator options %o', change => {
    expect(() => generateSamples({ ...options, ...change })).toThrow()
  })
  it('rejects indistinguishable time values and nonfinite payloads', () => {
    expect(() => validateAxis({ kind: 'uniform-time', startSeconds: 1e20, intervalSeconds: 1e-9, count: 2 })).toThrow()
    expect(() => sampleStatistics([0, NaN])).toThrow(); expect(() => sampleStatistics([])).toThrow()
  })
  it('computes full sampled statistics with stable scaled RMS', () => {
    expect(sampleStatistics([-1, 0, 1, 2])).toEqual({ minimum: -1, maximum: 2, peakToPeak: 3, mean: 0.5, totalRms: Math.sqrt(1.5), acRms: Math.sqrt(1.25) })
    const s = sampleStatistics([1e200, 1e200]); expect(s.totalRms).toBe(1e200); expect(s.acRms).toBe(0)
    expect(() => sampleStatistics([-1e308, 1e308])).toThrow(/范围/)
  })
  it('estimates 100 Hz from enough stable crossings; refuses constant, short, fast or noisy data', () => {
    const g = generateSamples(options), f = estimateFrequency(g.values, g.axis)
    expect(f.kind).toBe('available'); if (f.kind === 'available') expect(f.hertz).toBeCloseTo(100, 2)
    for (const change of [{ amplitude: 0 }, { count: 16 }, { frequencyHz: 300 }, { kind: 'noise' as const }]) { const x = generateSamples({ ...options, ...change }); expect(estimateFrequency(x.values, x.axis).kind).toBe('unavailable') }
  })
  it.each(['rectangular', 'hann'] as const)('normalizes a bin-centered 100Hz 1V peak sine with %s window', window => {
    const g = generateSamples(options), s = amplitudeSpectrum(g.values, g.axis, { window, removeMean: false })
    expect(s.frequencies[100]).toBe(100); expect(s.amplitudes[100]).toBeCloseTo(1, 12)
    expect(s.peak?.hertz).toBe(100); expect(s.sampleCount).toBe(1024); expect(s.sampleRateHz).toBe(1024); expect(s.binSpacingHz).toBe(1); expect(s.captureSeconds).toBe(1)
    expect(s.coherentGain).toBeCloseTo(window === 'hann' ? 0.5 : 1, 14)
    expect(s.normalization).toBe('one-sided-peak-amplitude')
  })
  it.each(['rectangular', 'hann'] as const)('does not double DC or Nyquist with %s', window => {
    const axis = { kind: 'uniform-time' as const, startSeconds: 0, intervalSeconds: 1 / 64, count: 64 }
    const dc = amplitudeSpectrum(new Float64Array(64).fill(3), axis, { window, removeMean: false })
    expect(dc.amplitudes[0]).toBeCloseTo(3, 13)
    const ny = amplitudeSpectrum(Float64Array.from({ length: 64 }, (_, i) => i % 2 ? -2 : 2), axis, { window, removeMean: false })
    expect(ny.frequencies[32]).toBe(32); expect(ny.amplitudes[32]).toBeCloseTo(2, 13)
    expect(amplitudeSpectrum(new Float64Array(64).fill(3), axis, { window, removeMean: true }).amplitudes[0]).toBe(0)
  })
  it('agrees with an independently evaluated direct DFT on nontrivial input', () => {
    const values = [0.2, -0.7, 0.5, 1.8, -2, 0.1, 0.9, -0.4], n = values.length
    const s = amplitudeSpectrum(values, { kind: 'uniform-time', startSeconds: 0, intervalSeconds: 0.01, count: n }, { window: 'rectangular', removeMean: false })
    for (let k = 0; k <= n / 2; k++) {
      const re = values.reduce((sum, x, i) => sum + x * Math.cos(2 * Math.PI * k * i / n), 0), im = values.reduce((sum, x, i) => sum - x * Math.sin(2 * Math.PI * k * i / n), 0)
      expect(s.amplitudes[k]).toBeCloseTo(Math.hypot(re, im) / n * (k === 0 || k === n / 2 ? 1 : 2), 13)
    }
  })
  it('rejects non-power-of-two FFT without cropping or padding', () => {
    expect(() => amplitudeSpectrum([1, 2, 3], { kind: 'uniform-time', startSeconds: 0, intervalSeconds: 1, count: 3 }, { window: 'hann', removeMean: false })).toThrow(/未截断/)
  })
})
