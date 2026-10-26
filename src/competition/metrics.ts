import type { Quantity } from '../engineering'
import type { Criterion, Judgment } from './types'
export const units: Readonly<Record<string, readonly [string, number]>> = {
  V: ['voltage', 1], mV: ['voltage', .001], uV: ['voltage', 1e-6], A: ['current', 1], mA: ['current', .001], uA: ['current', 1e-6],
  Hz: ['frequency', 1], kHz: ['frequency', 1000], MHz: ['frequency', 1e6], s: ['time', 1], ms: ['time', .001], us: ['time', 1e-6],
  ohm: ['resistance', 1], kohm: ['resistance', 1000], F: ['capacitance', 1], uF: ['capacitance', 1e-6], nF: ['capacitance', 1e-9],
  H: ['inductance', 1], mH: ['inductance', .001], J: ['energy', 1], mJ: ['energy', .001], uJ: ['energy', 1e-6], W: ['power', 1], mW: ['power', .001], var: ['reactive-power', 1], VA: ['apparent-power', 1], '1': ['ratio', 1], '%': ['ratio', .01], dB: ['gain-log', 1], deg: ['angle', 1],
}
export function convertQuantity(value: Quantity, unit: string): number {
  const from = units[value.unit], to = units[unit]
  if (!from || !to || from[0] !== to[0] || !Number.isFinite(value.value)) throw new Error('量纲不兼容、单位未知或数值无效。')
  const n = value.value * from[1] / to[1]; if (!Number.isFinite(n)) throw new Error('单位换算超出有限范围。'); return n
}
export function validateCriterion(rule: Criterion): void {
  if (rule.kind === 'exact') { if (![rule.expected, rule.absoluteTolerance, rule.relativeTolerance].every(Number.isFinite) || rule.absoluteTolerance < 0 || rule.relativeTolerance < 0) throw new Error('目标与容差必须有限，容差须非负。') }
  else if (rule.kind === 'minimum' || rule.kind === 'maximum') { if (!Number.isFinite(rule.limit) || typeof rule.inclusive !== 'boolean') throw new Error('限值或边界定义无效。') }
  else if (rule.kind === 'interval') { if (![rule.lower, rule.upper].every(Number.isFinite) || rule.lower > rule.upper || typeof rule.includeLower !== 'boolean' || typeof rule.includeUpper !== 'boolean' || (rule.lower === rule.upper && (!rule.includeLower || !rule.includeUpper))) throw new Error('区间为空或边界定义无效。') }
  else throw new Error('未知验收方法。')
}
export function compareMetric(actual: Quantity | undefined, unit: string, rule: Criterion, evidenceValid = true, stale = false): Judgment {
  try {
    validateCriterion(rule)
    if (!evidenceValid || !actual) return { kind: 'indeterminate', detail: '缺少有效证据或测量值。' }
    if (stale) return { kind: 'indeterminate', detail: '历史修订证据；不能作为当前方案的验收结论。' }
    const n = convertQuantity(actual, unit)
    let pass = false, absoluteError: number | null = null, relativeError: number | null = null, detail = ''
    if (rule.kind === 'exact') { absoluteError = Math.abs(n - rule.expected); relativeError = rule.expected === 0 ? null : absoluteError / Math.abs(rule.expected); const tolerance = rule.absoluteTolerance + rule.relativeTolerance * Math.abs(rule.expected); if (!Number.isFinite(absoluteError) || !Number.isFinite(tolerance)) throw new Error('误差或容差超出有限范围。'); pass = absoluteError <= tolerance; detail = `|实际−目标| ≤ 绝对容差 + 相对容差×|目标|；容差 ${tolerance} ${unit}${relativeError === null ? '；零目标的相对误差未定义' : ''}` }
    else if (rule.kind === 'minimum') { pass = rule.inclusive ? n >= rule.limit : n > rule.limit; detail = `实际 ${rule.inclusive ? '≥' : '>'} ${rule.limit} ${unit}` }
    else if (rule.kind === 'maximum') { pass = rule.inclusive ? n <= rule.limit : n < rule.limit; detail = `实际 ${rule.inclusive ? '≤' : '<'} ${rule.limit} ${unit}` }
    else { pass = (rule.includeLower ? n >= rule.lower : n > rule.lower) && (rule.includeUpper ? n <= rule.upper : n < rule.upper); detail = `${rule.includeLower ? '[' : '('}${rule.lower}, ${rule.upper}${rule.includeUpper ? ']' : ')'} ${unit}` }
    return { kind: pass ? 'pass' : 'fail', actual: n, absoluteError, relativeError, detail }
  } catch (e) { return { kind: 'indeterminate', detail: e instanceof Error ? e.message : '指标无效。' } }
}
