import type { Criterion } from '../competition'
export function criterionText(rule: Criterion, unit: string): string {
  if (rule.kind === 'exact') return `${rule.expected} ${unit}；容差 ${rule.absoluteTolerance} ${unit} + ${rule.relativeTolerance * 100}% × |目标|`
  if (rule.kind === 'minimum') return `${rule.inclusive ? '≥' : '>'} ${rule.limit} ${unit}`
  if (rule.kind === 'maximum') return `${rule.inclusive ? '≤' : '<'} ${rule.limit} ${unit}`
  return `${rule.includeLower ? '[' : '('}${rule.lower}, ${rule.upper}${rule.includeUpper ? ']' : ')'} ${unit}`
}
