import type { SweepPoint } from '../ac'
import type { MidbandFeatures } from './types'

/** Deliberately conservative sample-based plateau; no peak/edge is assumed midband. */
export function midbandFeatures(points: readonly SweepPoint[], spacing: 'linear' | 'log'): MidbandFeatures {
  let best: { start: number; end: number; span: number } | null = null
  for (let i = 0; i < points.length; i++) {
    let min = Infinity, max = -Infinity
    for (let j = i; j < points.length; j++) {
      const p = points[j]!
      if (p.kind !== 'available' || p.gainDb === null) break
      min = Math.min(min, p.gainDb); max = Math.max(max, p.gainDb)
      if (max - min > .3) break
      const span = Math.log10(p.frequencyHz / points[i]!.frequencyHz)
      if (j - i + 1 >= 5 && span >= .5 && (!best || span > best.span)) best = { start: i, end: j, span }
    }
  }
  const notes: string[] = []
  if (!best) return { plateau: null, lowerHz: null, upperHz: null, bandwidthHz: null, notes: ['扫描内未建立至少半个频率十倍程、5 点且波动不超过 0.3 dB 的连续中频平台；不推测截止频率。'] }
  const samples = points.slice(best.start, best.end + 1), gainDb = samples.reduce((s, p) => s + (p.kind === 'available' ? p.gainDb! : 0), 0) / samples.length
  const plateau = { fromHz: samples[0]!.frequencyHz, toHz: samples.at(-1)!.frequencyHz, gainDb, magnitude: 10 ** (gainDb / 20), samples: samples.length }
  const threshold = gainDb - 10 * Math.log10(2), lower: number[] = [], upper: number[] = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!
    if (a.kind !== 'available' || b.kind !== 'available' || a.gainDb === null || b.gainDb === null || a.gainDb === b.gainDb) continue
    const before = a.gainDb - threshold, after = b.gainDb - threshold
    if (before * after > 0) continue
    const t = (threshold - a.gainDb) / (b.gainDb - a.gainDb), f = spacing === 'log' ? Math.exp(Math.log(a.frequencyHz) + t * Math.log(b.frequencyHz / a.frequencyHz)) : a.frequencyHz + t * (b.frequencyHz - a.frequencyHz)
    if (i <= best.start && before <= 0 && after >= 0 && !points.slice(i, best.start + 1).some(p => p.kind === 'failed') && !lower.some(v => Math.abs(v - f) <= f * 1e-10)) lower.push(f)
    if (i > best.end && before >= 0 && after <= 0 && !points.slice(best.end, i).some(p => p.kind === 'failed') && !upper.some(v => Math.abs(v - f) <= f * 1e-10)) upper.push(f)
  }
  const lowerHz = lower.length === 1 ? lower[0]! : null, upperHz = upper.length === 1 ? upper[0]! : null
  if (lowerHz === null) notes.push(lower.length > 1 ? '低频侧存在多个交点，无法唯一确定下截止。' : '低频侧未建立半功率交点，请扩大频段或检查失败频点。')
  if (upperHz === null) notes.push(upper.length > 1 ? '高频侧存在多个交点，无法唯一确定上截止。' : '高频侧未建立半功率交点，请扩大频段或检查失败频点。')
  if (points.some(p => p.kind === 'failed')) notes.push('部分频点失败；不跨越失败点插值。')
  notes.push('平台为实际采样的近似平坦区，−3.0103 dB 交点为相邻频点插值，并非解析极点。')
  return { plateau, lowerHz, upperHz, bandwidthHz: lowerHz !== null && upperHz !== null && upperHz > lowerHz ? upperHz - lowerHz : null, notes }
}
