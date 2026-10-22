import { voltageDefined } from './circuit'
import { solveLinear } from './linear'
import { DcError } from './types'
import type { DcCircuit, DcSolution } from './types'

export function solveDc(circuit: DcCircuit): DcSolution {
  const { nodes, elements, referenceKey, referenceAnchorId } = circuit
  const active = nodes.filter(n => n.key !== referenceKey), defined = elements.filter(e => voltageDefined(e.kind))
  const count = active.length + defined.length
  if (count > 192 || elements.length > 512) throw new DcError('DC_LIMIT', '当前稠密直流引擎最多支持 192 个未知量和 512 个元件。', [], 'resource')
  const vi = new Map(active.map((n, i) => [n.key, i])), ii = new Map(defined.map((e, i) => [e.id, active.length + i]))
  const matrix = Array.from({ length: count }, () => new Array<number>(count).fill(0)), rhs = new Array<number>(count).fill(0)
  const stamp = (row: number | undefined, col: number | undefined, v: number) => { if (row !== undefined && col !== undefined) matrix[row]![col] = matrix[row]![col]! + v }
  const inject = (key: string, amps: number) => { const row = vi.get(key); if (row !== undefined) rhs[row] = rhs[row]! + amps }
  for (const e of elements) {
    const p = vi.get(e.p), n = vi.get(e.n), branch = ii.get(e.id)
    if (e.kind === 'resistor') { const g = 1 / e.value; stamp(p, p, g); stamp(p, n, -g); stamp(n, p, -g); stamp(n, n, g) }
    if (e.kind === 'current-source') { inject(e.p, -e.value); inject(e.n, e.value) }
    if (branch !== undefined) {
      stamp(p, branch, 1); stamp(n, branch, -1); stamp(branch, p, 1); stamp(branch, n, -1)
      if (e.kind === 'voltage-source') rhs[branch] = e.value
      if (e.kind === 'vcvs') { stamp(branch, vi.get(e.cp!), -e.value); stamp(branch, vi.get(e.cn!), e.value) }
      if (e.kind === 'ccvs') stamp(branch, ii.get(e.controlBranchId!), -e.value)
    }
    if (e.kind === 'vccs') { stamp(p, vi.get(e.cp!), e.value); stamp(p, vi.get(e.cn!), -e.value); stamp(n, vi.get(e.cp!), -e.value); stamp(n, vi.get(e.cn!), e.value) }
    if (e.kind === 'cccs') { stamp(p, ii.get(e.controlBranchId!), e.value); stamp(n, ii.get(e.controlBranchId!), -e.value) }
  }
  const solved = solveLinear(matrix, rhs), voltage = (key: string): number => key === referenceKey ? 0 : solved.values[vi.get(key)!]!
  const branches = elements.map(e => {
    const volts = voltage(e.p) - voltage(e.n)
    const amps = e.kind === 'resistor' ? volts / e.value : e.kind === 'current-source' ? e.value : e.kind === 'vccs' ? e.value * (voltage(e.cp!) - voltage(e.cn!)) : e.kind === 'cccs' ? e.value * solved.values[ii.get(e.controlBranchId!)!]! : solved.values[ii.get(e.id)!]!
    return { ...e, volts, amps, watts: volts * amps }
  })
  if (branches.some(e => !Number.isFinite(e.amps) || !Number.isFinite(e.watts))) throw new DcError('DC_RANGE', '支路电流或功率超出有限数值范围。', [], 'numerical')
  const nodeResults = nodes.map(n => {
    const incident = branches.flatMap(e => [...(e.p === n.key ? [e.amps] : []), ...(e.n === n.key ? [-e.amps] : [])])
    const kclAmps = incident.reduce((s, i) => s + i, 0)
    if (Math.abs(kclAmps) > 1e-10 + 1e-8 * incident.reduce((s, i) => s + Math.abs(i), 0)) throw new DcError('DC_KCL', '独立支路重算未通过 KCL 检查。', n.anchorIds, 'numerical')
    return { ...n, volts: voltage(n.key), kclAmps }
  })
  const absorbedWatts = branches.reduce((s, e) => s + Math.max(0, e.watts), 0), deliveredWatts = branches.reduce((s, e) => s + Math.max(0, -e.watts), 0), powerImbalanceWatts = absorbedWatts - deliveredWatts
  if (!Number.isFinite(absorbedWatts + deliveredWatts) || Math.abs(powerImbalanceWatts) > 1e-9 + 1e-8 * (absorbedWatts + deliveredWatts)) throw new DcError('DC_POWER', '独立功率平衡检查未通过。', [], 'numerical')
  return { referenceAnchorId, nodes: nodeResults, branches,
    voltages: nodeResults.flatMap(n => n.anchorIds.map(anchorId => ({ anchorId, volts: n.volts }))),
    currents: branches.map(e => ({ componentId: e.id, fromPinId: e.fromPinId, toPinId: e.toPinId, amps: e.amps })),
    equations: { unknowns: [...active.map(n => ({ name: `U(${n.name})`, unit: 'V' as const, entityIds: n.anchorIds })), ...defined.map(e => ({ name: `I(${e.reference})`, unit: 'A' as const, entityIds: [e.id] }))], rows: [...active.map(n => ({ name: `KCL ${n.name}`, unit: 'A' as const })), ...defined.map(e => ({ name: `约束 ${e.reference}`, unit: 'V' as const }))], matrix, rhs, solution: solved.values },
    checks: { backwardError: solved.backwardError, pivotRatio: solved.pivotRatio, maxKclAmps: Math.max(0, ...nodeResults.map(n => Math.abs(n.kclAmps))), absorbedWatts, deliveredWatts, powerImbalanceWatts },
  }
}
