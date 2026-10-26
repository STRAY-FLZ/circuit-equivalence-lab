import type { TransientCircuit, TransientElement, TransientSettings } from './types'
import { sourceValue } from './configuration'

export interface TransientReference {
  readonly kind: 'RC' | 'RL' | 'series-RLC' | 'parallel-RLC'; readonly description: string
  readonly entityId: string; readonly quantity: 'branch-voltage' | 'branch-current'; readonly unit: 'V' | 'A'
  readonly initial: number; readonly final: number; readonly tauSeconds?: number
  readonly alpha?: number; readonly omega0?: number; readonly omegaD?: number; readonly damping?: 'underdamped' | 'critical' | 'overdamped'
  readonly at: (seconds: number) => number
}
/** Independent homogeneous second-order expression, stable for repeated and separated roots. */
export function secondOrderAt(alpha: number, omega0: number, y0: number, derivative0: number, t: number): number {
  if (t === 0) return y0
  if (alpha < omega0) {
    const wd = Math.sqrt((omega0 - alpha) * (omega0 + alpha)), x = wd * t, sinc = Math.abs(x) < 1e-5 ? 1 - x * x / 6 : Math.sin(x) / x
    return Math.exp(-alpha * t) * (y0 * Math.cos(x) + (derivative0 + alpha * y0) * t * sinc)
  }
  const beta = Math.sqrt((alpha - omega0) * (alpha + omega0))
  if (beta === 0) return Math.exp(-alpha * t) * (y0 + (derivative0 + alpha * y0) * t)
  const slow = -(omega0 / (alpha + beta)) * omega0, fast = -alpha - beta, gap = slow - fast
  const divided = Math.exp(slow * t) * (-Math.expm1(-gap * t)) / gap
  return y0 * Math.exp(slow * t) + (derivative0 - slow * y0) * divided
}
export function transientReference(c: TransientCircuit, settings: TransientSettings): TransientReference | null {
  // These closed forms cover constant forcing from 0+. Delayed/pulse cases remain numerical.
  if (settings.sources.some(s => s.mode === 'pulse' || (s.mode === 'step' && s.atSeconds !== 0))) return null
  const rs = c.elements.filter(e => e.kind === 'resistor'), cs = c.elements.filter(e => e.kind === 'capacitor'), ls = c.elements.filter(e => e.kind === 'inductor'), sources = c.elements.filter(e => e.kind.endsWith('-source'))
  if (rs.length !== 1 || cs.length > 1 || ls.length > 1 || !cs.length && !ls.length) return null
  const r = rs[0]!, storage = cs[0] ?? ls[0]!, initial = (id: string) => settings.initialConditions.find(s => s.componentId === id)!.value
  let parallel = false, drive = 0, inductorSign = 1
  if (cs.length && ls.length && sources.length === 0 && c.elements.every(e => (e.p === storage.p && e.n === storage.n) || (e.n === storage.p && e.p === storage.n))) { parallel = true; inductorSign = ls[0]!.p === storage.p ? 1 : -1 }
  else {
    if (sources.some(e => e.kind !== 'voltage-source') || sources.length > 1) return null
    const rest = c.elements.filter(e => e !== storage), visited = new Set<string>(); let node = storage.n
    while (node !== storage.p) {
      const next: TransientElement[] = rest.filter(e => !visited.has(e.id) && (e.p === node || e.n === node))
      if (next.length !== 1) return null
      const e = next[0]!, sign = e.p === node ? 1 : -1; visited.add(e.id)
      if (e.kind === 'voltage-source') drive -= sign * sourceValue(settings.sources.find(s => s.componentId === e.id)!, 0)
      if (e.kind === 'inductor') inductorSign = sign
      node = e.p === node ? e.n : e.p
    }
    if (visited.size !== rest.length || c.nodes.some(n => c.elements.filter(e => e.p === n.key || e.n === n.key).length !== 2)) return null
  }
  if (cs.length + ls.length === 1) {
    const rc = !!cs.length, tau = rc ? r.value * storage.value : storage.value / r.value, final = rc ? drive : drive / r.value, x0 = initial(storage.id)
    return { kind: rc ? 'RC' : 'RL', description: rc ? 'KVL: RC·dvC/dt + vC = Vs；τ = RC' : 'KVL: L·diL/dt + R·iL = Vs；τ = L/R', entityId: storage.id, quantity: rc ? 'branch-voltage' : 'branch-current', unit: rc ? 'V' : 'A', initial: x0, final, tauSeconds: tau, at: t => final + (x0 - final) * Math.exp(-t / tau) }
  }
  const cap = cs[0]!, ind = ls[0]!, alpha = parallel ? 1 / (2 * r.value * cap.value) : r.value / (2 * ind.value), omega0 = 1 / Math.sqrt(ind.value * cap.value)
  const damping = Math.abs(alpha - omega0) <= 1e-10 * omega0 ? 'critical' as const : alpha < omega0 ? 'underdamped' as const : 'overdamped' as const
  const x0 = initial(cap.id), derivative0 = parallel ? -(x0 / r.value + inductorSign * initial(ind.id)) / cap.value : inductorSign * initial(ind.id) / cap.value, final = parallel ? 0 : drive
  return { kind: parallel ? 'parallel-RLC' : 'series-RLC', description: parallel ? 'KCL: C·v″ + v′/R + v/L = 0；α=1/(2RC)' : 'KVL: LC·vC″ + RC·vC′ + vC = Vs；α=R/(2L)', entityId: cap.id, quantity: 'branch-voltage', unit: 'V', initial: x0, final, alpha, omega0, ...(alpha < omega0 ? { omegaD: Math.sqrt((omega0 - alpha) * (omega0 + alpha)) } : {}), damping, at: t => final + secondOrderAt(alpha, omega0, x0 - final, derivative0, t) }
}
