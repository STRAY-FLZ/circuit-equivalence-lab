import { c } from '../ac'
import { solveComplex } from '../ac/linear'
import { AcError } from '../ac/types'
import { assemble, layout } from '../analog/mna'
import type { AnalogCircuit, AnalogSolution } from '../analog'
import { freezeSnapshot } from '../engineering'

/**
 * Independent correction solve for a near-zero-row DC_RESIDUAL from the V3.1
 * solver. Uses the SAME device residual/Jacobian, no leakage, and checks both
 * the correction and final residual in their original electrical units.
 */
export function solveAmplifierDcFallback(circuit: AnalogCircuit, signal?: AbortSignal): AnalogSolution {
  const l = layout(circuit), merit = (r: readonly number[]) => Math.max(0, ...r.map((f, i) => Math.abs(f) / (i < l.nodes.length ? 1e-3 : 1)))
  let x = Array<number>(l.size).fill(0), lastV = Infinity, lastI = Infinity
  for (let iteration = 0; iteration < 300; iteration++) {
    if (signal?.aborted) throw new AcError('AMP_CANCELLED', '分析已取消。', [], 'resource')
    const state = assemble(circuit, x), maxKclAmps = Math.max(0, ...state.residual.slice(0, l.nodes.length).map(Math.abs)), maxConstraintVolts = Math.max(0, ...state.residual.slice(l.nodes.length).map(Math.abs))
    if (maxKclAmps <= 1e-11 && maxConstraintVolts <= 1e-9 && lastV <= 1e-7 && lastI <= 1e-10) {
      const currents = new Map(circuit.nodes.map(n => [n.key, [] as number[]]))
      for (const d of state.devices) {
        const e = circuit.elements.find(e => e.id === d.componentId)!
        d.terminalAmps.forEach((amps, i) => currents.get(e.nodes[i]!)!.push(amps))
      }
      let allNodeKcl = 0
      for (const values of currents.values()) {
        const sum = values.reduce((a, b) => a + b, 0), scale = values.reduce((a, b) => a + Math.abs(b), 0)
        if (Math.abs(sum) > 1e-11 + 1e-8 * scale) throw new AcError('AMP_DC_KCL', '原始直流支路电流未通过全部网络 KCL。', [], 'numerical')
        allNodeKcl = Math.max(allNodeKcl, Math.abs(sum))
      }
      return freezeSnapshot({ circuit, nodeVolts: Object.fromEntries(circuit.nodes.map(n => [n.key, n.key === circuit.referenceKey ? 0 : x[l.node(n.key)]!])), devices: state.devices, iterations: iteration, maxKclAmps: allNodeKcl, maxConstraintVolts })
    }
    const complex = solveComplex(state.jacobian.map(row => row.map(v => c(v))), state.residual.map(v => c(-v))).values
    if (complex.some(v => !Number.isFinite(v.real) || Math.abs(v.imaginary) > 1e-20)) throw new AcError('AMP_DC_CORRECTION', '直流迭代修正不是有限实数。', [], 'numerical')
    const delta = complex.map(v => v.real)
    for (let i = 0; i < l.size; i++) {
      const products = state.jacobian[i]!.map((v, j) => v * delta[j]!), value = products.reduce((sum, v) => sum + v, state.residual[i]!), scale = Math.abs(state.residual[i]!) + products.reduce((sum, v) => sum + Math.abs(v), 0)
      if (!Number.isFinite(value) || !Number.isFinite(scale) || Math.abs(value) > (i < l.nodes.length ? 1e-13 : 1e-11) + 1e-9 * scale) throw new AcError('AMP_DC_CORRECTION', '牛顿修正的原单位方程残差未通过。', [], 'numerical')
    }
    let alpha = Math.min(1, 1 / Math.max(1, ...delta.slice(0, l.nodes.length).map(Math.abs)))
    for (const e of circuit.elements.filter(e => e.kind === 'npn')) {
      const a = l.node(e.nodes[0]!), b = l.node(e.nodes[2]!), step = (a < 0 ? 0 : delta[a]!) - (b < 0 ? 0 : delta[b]!)
      alpha = Math.min(alpha, .08 / Math.max(.08, Math.abs(step)))
    }
    let next = x, accepted = false
    for (let trial = 0; trial < 32; trial++) {
      next = x.map((v, i) => v + alpha * delta[i]!)
      const candidate = assemble(circuit, next)
      if (merit(candidate.residual) <= merit(state.residual) * (1 - 1e-4 * alpha) || merit(candidate.residual) < 1e-10) { accepted = true; break }
      alpha *= .5
    }
    if (!accepted) throw new AcError('AMP_DC_LINE_SEARCH', '直流牛顿阻尼步未降低原始残差。', [], 'numerical')
    lastV = Math.max(0, ...next.slice(0, l.nodes.length).map((v, i) => Math.abs(v - x[i]!)))
    lastI = Math.max(0, ...next.slice(l.nodes.length).map((v, i) => Math.abs(v - x[l.nodes.length + i]!)))
    x = next
  }
  throw new AcError('AMP_DC_CONVERGENCE', '直流工作点未在迭代预算内收敛。', [], 'numerical')
}
