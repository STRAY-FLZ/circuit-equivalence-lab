import { solveComplex } from './linear'
import { voltageDefined } from '../dc'
import { c, add, sub, mul, neg, abs, conj, finite, phase, polar } from './complex'
import type { Complex } from './complex'
import { AcError } from './types'
import type { AcCircuit, AcElement, AcPhasor, AcSettings, AcSolution } from './types'

export function phasor(value: Complex): AcPhasor { return { value, magnitudeRms: abs(value), phaseDegrees: phase(value) } }
function passive(e: AcElement, w: number): { impedance: Complex; admittance: Complex } | null {
  if (e.kind === 'resistor') return { impedance: c(e.value), admittance: c(1 / e.value) }
  if (e.kind === 'capacitor') return { impedance: c(0, -1 / (w * e.value)), admittance: c(0, w * e.value) }
  if (e.kind === 'inductor') return { impedance: c(0, w * e.value), admittance: c(0, -1 / (w * e.value)) }
  return null
}
export function solveAc(circuit: AcCircuit, settings: AcSettings, frequencyHz = settings.frequencyHz): AcSolution {
  const w = 2 * Math.PI * frequencyHz
  if (!Number.isFinite(w) || w <= 0) throw new AcError('AC_FREQUENCY', '角频率必须为有限正数。')
  const { nodes, elements, referenceKey, referenceAnchorId } = circuit, active = nodes.filter(n => n.key !== referenceKey), defined = elements.filter(e => voltageDefined(e.kind)), count = active.length + defined.length
  const vi = new Map(active.map((n, i) => [n.key, i])), ii = new Map(defined.map((e, i) => [e.id, active.length + i]))
  const matrix = Array.from({ length: count }, () => Array.from({ length: count }, () => c())), rhs = Array.from({ length: count }, () => c())
  const stamp = (r: number | undefined, k: number | undefined, value: Complex) => { if (r !== undefined && k !== undefined) matrix[r]![k] = add(matrix[r]![k]!, value) }
  const inject = (key: string, value: Complex) => { const row = vi.get(key); if (row !== undefined) rhs[row] = add(rhs[row]!, value) }
  const excitation = (e: AcElement): Complex => { const source = settings.sources.find(s => s.componentId === e.id)!; return polar(source.magnitudeRms, source.phaseDegrees) }
  for (const e of elements) {
    const p = vi.get(e.p), n = vi.get(e.n), branch = ii.get(e.id), model = passive(e, w)
    if (model) {
      if (!finite(model.impedance) || !finite(model.admittance) || abs(model.impedance) === 0 || abs(model.admittance) === 0) throw new AcError('AC_RANGE', 'RLC 阻抗/导纳超出可表示的有限非零范围。', [e.id], 'numerical')
      stamp(p, p, model.admittance); stamp(p, n, neg(model.admittance)); stamp(n, p, neg(model.admittance)); stamp(n, n, model.admittance)
    }
    if (e.kind === 'current-source') { inject(e.p, neg(excitation(e))); inject(e.n, excitation(e)) }
    if (branch !== undefined) {
      stamp(p, branch, c(1)); stamp(n, branch, c(-1)); stamp(branch, p, c(1)); stamp(branch, n, c(-1))
      if (e.kind === 'voltage-source') rhs[branch] = excitation(e)
      if (e.kind === 'vcvs') { stamp(branch, vi.get(e.cp!), c(-e.value)); stamp(branch, vi.get(e.cn!), c(e.value)) }
      if (e.kind === 'ccvs') stamp(branch, ii.get(e.controlBranchId!), c(-e.value))
    }
    if (e.kind === 'vccs') { stamp(p, vi.get(e.cp!), c(e.value)); stamp(p, vi.get(e.cn!), c(-e.value)); stamp(n, vi.get(e.cp!), c(-e.value)); stamp(n, vi.get(e.cn!), c(e.value)) }
    if (e.kind === 'cccs') { stamp(p, ii.get(e.controlBranchId!), c(e.value)); stamp(n, ii.get(e.controlBranchId!), c(-e.value)) }
  }
  const solved = solveComplex(matrix, rhs), values = solved.values
  let complexBackwardError = 0
  for (let i = 0; i < count; i++) {
    const sum = matrix[i]!.reduce((s, a, j) => add(s, mul(a, values[j]!)), c()), scale = abs(rhs[i]!) + matrix[i]!.reduce((s, a, j) => s + abs(a) * abs(values[j]!), 0)
    if (!Number.isFinite(scale)) throw new AcError('AC_RANGE', '复数残差尺度超出有限范围。', [], 'numerical')
    const residual = abs(sub(sum, rhs[i]!)); complexBackwardError = Math.max(complexBackwardError, scale ? residual / scale : residual)
  }
  if (!Number.isFinite(complexBackwardError) || complexBackwardError > 1e-9) throw new AcError('AC_RESIDUAL', '复数原单位方程残差未通过。', [], 'numerical')
  const voltage = (key: string): Complex => key === referenceKey ? c() : values[vi.get(key)!]!
  const branches = elements.map(e => {
    const v = sub(voltage(e.p), voltage(e.n)), model = passive(e, w)
    const i = model ? mul(v, model.admittance) : e.kind === 'current-source' ? excitation(e) : e.kind === 'vccs' ? mul(c(e.value), sub(voltage(e.cp!), voltage(e.cn!))) : e.kind === 'cccs' ? mul(c(e.value), values[ii.get(e.controlBranchId!)!]!) : values[ii.get(e.id)!]!
    const s = mul(v, conj(i))
    if (![v, i, s].every(finite)) throw new AcError('AC_RANGE', '复电压、电流或功率超出有限范围。', [e.id], 'numerical')
    return { ...e, voltage: phasor(v), current: phasor(i), impedance: model?.impedance ?? null, admittance: model?.admittance ?? null, power: { realWatts: s.real, reactiveVars: s.imaginary, apparentVA: abs(s) } }
  })
  const nodeResults = nodes.map(n => {
    const incident = branches.flatMap(e => [...(e.p === n.key ? [e.current.value] : []), ...(e.n === n.key ? [neg(e.current.value)] : [])]), kclAmps = incident.reduce(add, c())
    if (abs(kclAmps) > 1e-10 + 1e-8 * incident.reduce((s, v) => s + abs(v), 0)) throw new AcError('AC_KCL', '复数支路重算未通过所有节点的 KCL。', n.anchorIds, 'numerical')
    return { ...n, ...phasor(voltage(n.key)), kclAmps }
  })
  const powerImbalance = branches.reduce((s, e) => add(s, c(e.power.realWatts, e.power.reactiveVars)), c()), powerScale = branches.reduce((s, e) => s + e.power.apparentVA, 0)
  if (!finite(powerImbalance) || !Number.isFinite(powerScale) || abs(powerImbalance) > 1e-9 + 1e-8 * powerScale) throw new AcError('AC_POWER', '复功率平衡检查未通过。', [], 'numerical')
  return { frequencyHz, referenceAnchorId, nodes: nodeResults, branches,
    phasors: nodeResults.flatMap(n => n.anchorIds.map(anchorId => ({ anchorId, voltsRms: n.value }))),
    equations: { matrix, rhs, solution: values, unknowns: [...active.map(n => ({ name: `U(${n.name})`, unit: 'V' as const, entityIds: n.anchorIds })), ...defined.map(e => ({ name: `I(${e.reference})`, unit: 'A' as const, entityIds: [e.id] }))], rows: [...active.map(n => ({ name: `KCL ${n.name}`, unit: 'A' as const })), ...defined.map(e => ({ name: `约束 ${e.reference}`, unit: 'V' as const }))] },
    checks: { complexBackwardError, scaledPivotRatio: solved.pivotRatio, maxKclAmps: Math.max(0, ...nodeResults.map(n => abs(n.kclAmps))), powerImbalance },
  }
}
