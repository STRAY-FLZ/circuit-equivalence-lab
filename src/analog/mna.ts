import { solveLinear } from '../dc/linear'
import { freezeSnapshot } from '../engineering'
import { mosPoint, shockley } from './devices'
import { AnalogError } from './types'
import type { AnalogCircuit, AnalogElement, AnalogSolution, DevicePoint } from './types'

export type NpnRegion = 'active' | 'saturation'
export function layout(circuit: AnalogCircuit, region: NpnRegion = 'active') {
  const nodes = circuit.nodes.filter(n => n.key !== circuit.referenceKey).map(n => n.key)
  const branches = circuit.elements.filter(e => e.kind === 'voltage-source' || e.kind === 'ideal-opamp' || e.kind === 'npn' && region === 'saturation')
  const node = (key: string) => nodes.indexOf(key)
  const branch = (id: string) => nodes.length + branches.findIndex(e => e.id === id)
  return { nodes, branches, node, branch, size: nodes.length + branches.length }
}
/** Original electrical residual and analytic Jacobian, no conductance regularization. */
export function assemble(circuit: AnalogCircuit, x: readonly number[], region: NpnRegion = 'active') {
  const l = layout(circuit, region), residual = Array<number>(l.size).fill(0), jacobian = Array.from({ length: l.size }, () => Array<number>(l.size).fill(0)), devices: DevicePoint[] = []
  const v = (node: string) => node === circuit.referenceKey ? 0 : x[l.node(node)]!
  const add = (row: number, column: number, value: number) => { if (row >= 0 && column >= 0) jacobian[row]![column] = jacobian[row]![column]! + value }
  const f = (row: number, value: number) => { if (row >= 0) residual[row] = residual[row]! + value }
  function current(a: string, b: string, amps: number, derivatives: readonly (readonly [string, number])[]) {
    const ai = l.node(a), bi = l.node(b)
    f(ai, amps); f(bi, -amps)
    for (const [key, g] of derivatives) { add(ai, l.node(key), g); add(bi, l.node(key), -g) }
  }
  function constraint(e: AnalogElement, a: string, b: string, volts: number, ca = a, cb = b) {
    const j = l.branch(e.id), amps = x[j]!
    f(l.node(a), amps); f(l.node(b), -amps); add(l.node(a), j, 1); add(l.node(b), j, -1)
    f(j, v(ca) - v(cb) - volts); add(j, l.node(ca), 1); add(j, l.node(cb), -1)
    return amps
  }
  for (const e of circuit.elements) {
    const [a, b, c] = e.nodes as readonly [string, string, string], p = e.parameters, volts = e.nodes.map(v)
    let terminalAmps: readonly number[], detail: Partial<DevicePoint> = {}, name = 'linear'
    if (e.kind === 'resistor') {
      const g = 1 / p.resistance!, i = (v(a) - v(b)) * g
      current(a, b, i, [[a, g], [b, -g]]); terminalAmps = [i, -i]
    } else if (e.kind === 'current-source') {
      current(a, b, p.current!, []); terminalAmps = [p.current!, -p.current!]
    } else if (e.kind === 'voltage-source') {
      const i = constraint(e, a, b, p.voltage!); terminalAmps = [i, -i]
    } else if (e.kind === 'diode') {
      const vd = v(a) - v(b), d = shockley(vd, p.saturationCurrent!, p.ideality!, p.temperature!)
      current(a, b, d.current, [[a, d.gd], [b, -d.gd]]); terminalAmps = [d.current, -d.current]; name = vd > 0 ? 'forward' : 'reverse'
      detail = { gd: d.gd, perturbationLimitVolts: .05 * p.ideality! * (1.380649e-23 * p.temperature! / 1.602176634e-19) }
    } else if (e.kind === 'npn') {
      const vbe = v(a) - v(c), d = shockley(vbe, p.saturationCurrent!, 1, p.temperature!), ib = Math.max(0, d.current), gb = vbe > 0 ? d.gd : 0
      current(a, c, ib, [[a, gb], [c, -gb]])
      const ic = region === 'saturation' ? constraint(e, b, c, p.saturationVoltage!) : p.beta! * ib
      if (region === 'active') current(b, c, ic, [[a, p.beta! * gb], [c, -p.beta! * gb]])
      terminalAmps = [ib, ic, -ib - ic]; name = vbe <= 0 ? 'cutoff' : region
      if (name === 'active') detail = { gm: p.beta! * gb, rpi: 1 / gb, perturbationLimitVolts: .05 * (1.380649e-23 * p.temperature! / 1.602176634e-19) }
    } else if (e.kind === 'nmos') {
      const d = mosPoint(v(a) - v(c), v(b) - v(c), p.threshold!, p.transconductance!)
      current(b, c, d.current, [[a, d.gm], [b, d.gds], [c, -d.gm - d.gds]])
      terminalAmps = [0, d.current, -d.current]; name = d.region
      detail = { gm: d.gm, gds: d.gds, ...(name === 'saturation' ? { perturbationLimitVolts: .05 * (v(a) - v(c) - p.threshold!) } : {}) }
    } else {
      const io = constraint(e, c, circuit.referenceKey, 0, a, b)
      terminalAmps = [0, 0, io]; name = 'ideal-negative-feedback'
    }
    devices.push({ componentId: e.id, reference: e.reference, kind: e.kind, region: name, terminalAmps, terminalVolts: volts, ...detail })
  }
  if (residual.some(v => !Number.isFinite(v)) || jacobian.some(row => row.some(v => !Number.isFinite(v)))) throw new AnalogError('ANALOG_RANGE', '残差或雅可比超出有限范围。', 'numerical')
  return { residual, jacobian, devices, nodeCount: l.nodes.length }
}
function measure(residual: readonly number[], nodeCount: number) {
  return { maxKclAmps: Math.max(0, ...residual.slice(0, nodeCount).map(Math.abs)), maxConstraintVolts: Math.max(0, ...residual.slice(nodeCount).map(Math.abs)) }
}
function newton(circuit: AnalogCircuit, region: NpnRegion, signal?: AbortSignal, maxIterations = 300) {
  const l = layout(circuit, region)
  let x = Array<number>(l.size).fill(0), lastStep = Infinity
  const merit = (r: readonly number[]) => Math.max(0, ...r.map((f, i) => Math.abs(f) / (i < l.nodes.length ? 1e-3 : 1)))
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    if (signal?.aborted) throw new AnalogError('ANALOG_CANCELLED', '分析已取消。', 'resource')
    const state = assemble(circuit, x, region), checks = measure(state.residual, state.nodeCount)
    if (checks.maxKclAmps <= 1e-11 && checks.maxConstraintVolts <= 1e-9 && lastStep <= 1e-7) return { x, state, checks, iterations: iteration }
    const delta = solveLinear(state.jacobian, state.residual.map(v => -v)).values
    let alpha = Math.min(1, 1 / Math.max(1, ...delta.slice(0, l.nodes.length).map(Math.abs)))
    for (const e of circuit.elements.filter(e => e.kind === 'diode' || e.kind === 'npn')) {
      const a = l.node(e.nodes[0]!), b = l.node(e.nodes[e.kind === 'diode' ? 1 : 2]!)
      const junctionStep = (a < 0 ? 0 : delta[a]!) - (b < 0 ? 0 : delta[b]!)
      alpha = Math.min(alpha, .08 / Math.max(.08, Math.abs(junctionStep)))
    }
    let next = x, accepted = false
    for (let trial = 0; trial < 32; trial++) {
      next = x.map((v, i) => v + alpha * delta[i]!)
      const candidate = assemble(circuit, next, region)
      if (merit(candidate.residual) <= merit(state.residual) * (1 - 1e-4 * alpha) || merit(candidate.residual) < 1e-10) { accepted = true; break }
      alpha *= .5
    }
    if (!accepted) throw new AnalogError('ANALOG_LINE_SEARCH', '牛顿阻尼步无法降低原始残差；未返回最后一次迭代。', 'numerical')
    lastStep = Math.max(0, ...next.map((v, i) => Math.abs(v - x[i]!))); x = next
  }
  throw new AnalogError('ANALOG_NONCONVERGENCE', '达到迭代上限，工作点未通过残差与步长收敛检查。', 'numerical')
}
function validateRegions(circuit: AnalogCircuit, devices: readonly DevicePoint[], region: NpnRegion): boolean {
  for (const d of devices) {
    const e = circuit.elements.find(e => e.id === d.componentId)!, [a, b, c] = d.terminalVolts as readonly [number, number, number]
    if (e.kind === 'diode' && a - b < -e.parameters.reverseLimit!) throw new AnalogError('ANALOG_DIODE_BREAKDOWN', `${e.reference} 超出声明反向有效范围；未建模击穿。`, 'unsupported')
    if (e.kind === 'nmos' && b - c < -1e-9) throw new AnalogError('ANALOG_MOS_REVERSE', `${e.reference} 反向 VDS 或体二极管电流不支持。`, 'unsupported')
    if (e.kind === 'npn') {
      const [ib, ic] = d.terminalAmps as readonly [number, number]
      if (region === 'active' && b - c < e.parameters.saturationVoltage! - 1e-8) return false
      if (region === 'saturation' && (a - c <= 0 || ic < -1e-11 || ic > e.parameters.beta! * ib + 1e-11)) return false
    }
  }
  return true
}
function feedbackFactor(circuit: AnalogCircuit): number {
  const amp = circuit.elements.find(e => e.kind === 'ideal-opamp')!
  const probe: AnalogCircuit = { ...circuit, elements: circuit.elements.map(e => e === amp ? { ...e, kind: 'voltage-source', nodes: [amp.nodes[2]!, circuit.referenceKey], parameters: { voltage: 1 } } : e.kind === 'voltage-source' ? { ...e, parameters: { voltage: 0 } } : e.kind === 'current-source' ? { ...e, parameters: { current: 0 } } : e) }
  const l = layout(probe), z = Array<number>(l.size).fill(0), state = assemble(probe, z)
  const x = solveLinear(state.jacobian, state.residual.map(f => -f)).values
  const v = (key: string) => key === circuit.referenceKey ? 0 : x[l.node(key)]!
  const factor = v(amp.nodes[1]!) - v(amp.nodes[0]!)
  if (!Number.isFinite(factor) || factor <= 1e-8) throw new AnalogError('ANALOG_FEEDBACK', '未验证到有效负反馈；开环、正反馈或退化反馈不使用虚短。', 'unsupported')
  return factor
}
export function solveAnalog(circuit: AnalogCircuit, signal?: AbortSignal, maxIterations = 300): AnalogSolution {
  const feedback = circuit.elements.some(e => e.kind === 'ideal-opamp') ? feedbackFactor(circuit) : undefined
  const hasNpn = circuit.elements.some(e => e.kind === 'npn'), errors: unknown[] = []
  for (const region of (hasNpn ? ['active', 'saturation'] : ['active']) as NpnRegion[]) {
    try {
      const run = newton(circuit, region, signal, maxIterations)
      if (!validateRegions(circuit, run.state.devices, region)) continue
      const l = layout(circuit, region)
      return freezeSnapshot({ circuit, nodeVolts: Object.fromEntries(circuit.nodes.map(n => [n.key, n.key === circuit.referenceKey ? 0 : run.x[l.node(n.key)]!])), devices: run.state.devices, iterations: run.iterations, ...run.checks, ...(feedback === undefined ? {} : { feedbackFactor: feedback }) })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw errors[0]
  throw new AnalogError('ANALOG_NPN_REGION', '没有满足自身区域条件的 NPN 工作点；不外推 beta·IB。', 'unsupported')
}

/** Local low-frequency derivative of the SAME equations at a verified OP. */
export function smallSignal(solution: AnalogSolution, sourceId: string, outputAnchorId: string, amplitudeVolts = .0001) {
  const c = solution.circuit, source = c.elements.find(e => e.id === sourceId)
  if (!source || source.kind !== 'voltage-source' || source.nodes[1] !== c.referenceKey) throw new AnalogError('ANALOG_SMALL_SIGNAL_INPUT', '请选择负端接参考的独立电压源。', 'unsupported')
  const output = c.nodes.find(n => n.anchorIds.includes(outputAnchorId))
  if (!output || !Number.isFinite(amplitudeVolts) || amplitudeVolts <= 0) throw new AnalogError('ANALOG_SMALL_SIGNAL_INPUT', '输出连接点与扰动幅度无效。')
  if (solution.devices.some(d => d.kind === 'npn' && d.region !== 'active' || d.kind === 'nmos' && d.region !== 'saturation')) throw new AnalogError('ANALOG_SMALL_SIGNAL_REGION', 'CE 仅在 NPN 放大区、CS 仅在 nMOS 饱和区计算增益。', 'unsupported')
  const l = layout(c), x = [...l.nodes.map(key => solution.nodeVolts[key]!), ...l.branches.map(e => solution.devices.find(d => d.componentId === e.id)!.terminalAmps[e.kind === 'ideal-opamp' ? 2 : 0]!)]
  const state = assemble(c, x), rhs = Array<number>(l.size).fill(0); rhs[l.branch(source.id)] = 1
  const derivative = solveLinear(state.jacobian, rhs).values
  const dv = (key: string) => key === c.referenceKey ? 0 : derivative[l.node(key)]!
  for (const e of c.elements) {
    const d = solution.devices.find(d => d.componentId === e.id)!, terminal = e.kind === 'diode' ? 1 : 2
    if (d.perturbationLimitVolts && Math.abs(dv(e.nodes[0]!) - dv(e.nodes[terminal]!)) * amplitudeVolts > d.perturbationLimitVolts) throw new AnalogError('ANALOG_PERTURBATION', '所选扰动超过工作点声明的局部线性范围。', 'unsupported')
    if (e.kind === 'npn' && solution.nodeVolts[e.nodes[1]!]! - solution.nodeVolts[e.nodes[2]!]! - e.parameters.saturationVoltage! <= amplitudeVolts * Math.abs(dv(e.nodes[1]!) - dv(e.nodes[2]!))) throw new AnalogError('ANALOG_PERTURBATION', '扰动可能跨越 NPN 区域边界。', 'unsupported')
    if (e.kind === 'nmos') {
      const overdrive = solution.nodeVolts[e.nodes[0]!]! - solution.nodeVolts[e.nodes[2]!]! - e.parameters.threshold!
      const margin = solution.nodeVolts[e.nodes[1]!]! - solution.nodeVolts[e.nodes[0]!]! + e.parameters.threshold!
      if (overdrive <= amplitudeVolts * Math.abs(dv(e.nodes[0]!) - dv(e.nodes[2]!)) || margin <= amplitudeVolts * Math.abs(dv(e.nodes[1]!) - dv(e.nodes[0]!))) throw new AnalogError('ANALOG_PERTURBATION', '扰动可能跨越 nMOS 区域边界。', 'unsupported')
    }
  }
  return { gain: dv(output.key), sourceId, outputAnchorId, amplitudeVolts, description: '同一工作点雅可比的低频局部导数；不包含器件电容或频率响应。' }
}
