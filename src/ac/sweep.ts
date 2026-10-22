import { abs, div, finite, phase, sub } from './complex'
import type { AcCircuit, AcSettings, SweepOptions, SweepPoint, SweepResult, AcSolution } from './types'
import { AcError } from './types'

export function sweepFrequencies(options: SweepOptions): number[] {
  return Array.from({ length: options.points }, (_, i) => i === options.points - 1 ? options.endHz : options.spacing === 'log' ? Math.exp(Math.log(options.startHz) + i / (options.points - 1) * (Math.log(options.endHz) - Math.log(options.startHz))) : options.startHz + i / (options.points - 1) * (options.endHz - options.startHz))
}
export function transferAt(solution: AcSolution, options: SweepOptions): SweepPoint {
  const voltage = (id: string) => solution.nodes.find(n => n.anchorIds.includes(id))!.value
  const input = sub(voltage(options.input[0]), voltage(options.input[1])), output = sub(voltage(options.output[0]), voltage(options.output[1]))
  const scale = Math.max(...solution.nodes.map(n => n.magnitudeRms))
  if (abs(input) <= 1e-12 * Math.max(scale, Number.MIN_VALUE)) throw new AcError('AC_INPUT_ZERO', '所选输入端电压接近零，电压传递比未定义。', options.input, 'numerical')
  const transfer = div(output, input), magnitude = abs(transfer), gainDb = magnitude > 0 ? 20 * Math.log10(magnitude) : null
  if (!finite(transfer) || !Number.isFinite(magnitude) || (gainDb !== null && !Number.isFinite(gainDb))) throw new AcError('AC_TRANSFER_RANGE', '传递比超出有限范围。', options.input, 'numerical')
  return { kind: 'available', frequencyHz: solution.frequencyHz, transfer, magnitude, gainDb, phaseDegrees: phase(transfer) }
}
export function sweepFeatures(points: readonly SweepPoint[], options: SweepOptions): SweepResult['features'] {
  const notes: string[] = [], available = points.filter(p => p.kind === 'available' && p.gainDb !== null)
  const peak = available.reduce<(typeof available)[number] | null>((best, p) => !best || p.kind === 'available' && best.kind === 'available' && p.gainDb! > best.gainDb! ? p : best, null)
  const index = peak ? points.indexOf(peak) : -1
  const reference = options.passband === 'peak' ? peak : options.passband === 'low' ? points[0] : points.at(-1)
  if (options.passband !== 'peak') notes.push(`通带参考采用扫描${options.passband === 'low' ? '低' : '高'}端的实际增益，不保证已达到渐近通带。`)
  if (index <= 0 || index === points.length - 1) notes.push('最大采样值在边界，不能据此确认谐振。')
  if (points.some(p => p.kind === 'failed')) notes.push('部分频点失败；曲线及交点估计不会跨越失败频点。')
  const crossings: number[] = []
  if (reference?.kind === 'available' && reference.gainDb !== null) {
    const target = reference.gainDb - 10 * Math.log10(2)
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!, b = points[i]!
      if (a.kind !== 'available' || b.kind !== 'available' || a.gainDb === null || b.gainDb === null || a.gainDb === b.gainDb || (a.gainDb - target) * (b.gainDb - target) > 0) continue
      const t = (target - a.gainDb) / (b.gainDb - a.gainDb), f = options.spacing === 'log' ? Math.exp(Math.log(a.frequencyHz) + t * Math.log(b.frequencyHz / a.frequencyHz)) : a.frequencyHz + t * (b.frequencyHz - a.frequencyHz)
      if (!crossings.some(old => Math.abs(old - f) <= f * 1e-10)) crossings.push(f)
    }
  }
  if (!crossings.length) notes.push('当前扫描没有解析出相对通带的半功率交点；请扩大频段或增加点数。')
  if (crossings.length > 2) notes.push('存在多个交点，不将它们归纳为单一带宽。')
  const sampledPeak = peak?.kind === 'available' ? { frequencyHz: peak.frequencyHz, gainDb: peak.gainDb! } : null
  const estimatedBandwidthHz = options.passband === 'peak' && index > 0 && index < points.length - 1 && crossings.length === 2 && peak && crossings[0]! < peak.frequencyHz && crossings[1]! > peak.frequencyHz ? crossings[1]! - crossings[0]! : null
  notes.push('交点为相邻实际频点的 dB 插值估计；相位为主值 −180°…180°，未展开。零传输的 dB/相位及失败频点以断点表示。')
  return { sampledPeak, halfPowerCrossingsHz: crossings, estimatedBandwidthHz, notes }
}
/** Only recognize an exact driven series/shunt RC/RL or series RLC topology. */
export function analyticalReference(circuit: AcCircuit, settings: AcSettings): SweepResult['analyticalReference'] {
  const sweep = settings.sweep
  if (!sweep || circuit.elements.some(e => !['resistor', 'capacitor', 'inductor', 'voltage-source'].includes(e.kind))) return null
  const sources = circuit.elements.filter(e => e.kind === 'voltage-source'), passive = circuit.elements.filter(e => ['resistor', 'capacitor', 'inductor'].includes(e.kind))
  if (sources.length !== 1) return null
  const [a, g] = sweep.input.map(id => circuit.anchorToNet[id]!), [o, q] = sweep.output.map(id => circuit.anchorToNet[id]!)
  const samePair = (p: string, n: string, x: string, y: string) => p === x && n === y || p === y && n === x
  if (!samePair(sources[0]!.p, sources[0]!.n, a!, g!)) return null
  const r = passive.find(e => e.kind === 'resistor'), cap = passive.find(e => e.kind === 'capacitor'), l = passive.find(e => e.kind === 'inductor')
  if (!r) return null
  if (passive.length === 2 && q === g) {
    const seriesR = samePair(r.p, r.n, a!, o!), shuntR = samePair(r.p, r.n, o!, g!)
    if (cap && (seriesR && samePair(cap.p, cap.n, o!, g!) || shuntR && samePair(cap.p, cap.n, a!, o!))) return { frequencyHz: 1 / (2 * Math.PI * r.value * cap.value), description: '标准 RC 拓扑：fc = 1/(2πRC)，与扫描交点估计分开。' }
    if (l && (seriesR && samePair(l.p, l.n, o!, g!) || shuntR && samePair(l.p, l.n, a!, o!))) return { frequencyHz: r.value / (2 * Math.PI * l.value), description: '标准 RL 拓扑：fc = R/(2πL)，与扫描交点估计分开。' }
  }
  if (passive.length === 3 && cap && l && samePair(r.p, r.n, o!, q!)) {
    let cursor = a!
    const remaining = [...passive]
    while (remaining.length) { const edges = remaining.filter(e => e.p === cursor || e.n === cursor); if (edges.length !== 1) return null; const e = edges[0]!; cursor = e.p === cursor ? e.n : e.p; remaining.splice(remaining.indexOf(e), 1) }
    if (cursor === g) return { frequencyHz: 1 / (2 * Math.PI * Math.sqrt(l.value * cap.value)), description: '标准串联 RLC，输出跨电阻：f0 = 1/(2π√LC)。解析谐振参考不是采样峰的精确定位。' }
  }
  return null
}
