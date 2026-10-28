import type { AnalogCircuit, AnalogSolution } from './types'
import { AnalogError } from './types'
import { solveAnalog } from './mna'

export function diodeLoadLine(solution: AnalogSolution) {
  const c = solution.circuit, diodes = c.elements.filter(e => e.kind === 'diode')
  if (diodes.length !== 1 || c.elements.some(e => !['resistor', 'voltage-source', 'current-source', 'diode'].includes(e.kind))) throw new AnalogError('ANALOG_LOADLINE', '负载线仅适用于单二极管与线性电阻/独立源网络。', 'unsupported')
  const diode = diodes[0]!, [a, b] = diode.nodes as readonly [string, string]
  const without = { ...c, elements: c.elements.filter(e => e !== diode) }, open = solveAnalog(without)
  const test = solveAnalog({ ...without, elements: [...without.elements, { ...diode, kind: 'current-source', parameters: { current: .001 } }] })
  const openVolts = open.nodeVolts[a]! - open.nodeVolts[b]!, resistance = (openVolts - (test.nodeVolts[a]! - test.nodeVolts[b]!)) / .001
  if (!Number.isFinite(resistance) || resistance <= 1e-9) throw new AnalogError('ANALOG_LOADLINE', '此网络没有正有限戴维南电阻；不绘制虚构负载线。', 'unsupported')
  return { componentId: diode.id, openVolts, resistance, currentAt: (volts: number) => (openVolts - volts) / resistance }
}

export interface SweepPoint { readonly inputVolts: number; readonly outputVolts: number; readonly devices: AnalogSolution['devices']; readonly maxKclAmps: number; readonly maxConstraintVolts: number }
/** Independent static solutions. No time variable, integration or storage state. */
export async function quasiStaticSweep(circuit: AnalogCircuit, sourceId: string, outputAnchorId: string, start: number, end: number, count: number, signal?: AbortSignal): Promise<readonly SweepPoint[]> {
  const source = circuit.elements.find(e => e.id === sourceId), output = circuit.nodes.find(n => n.anchorIds.includes(outputAnchorId))
  if (!source || source.kind !== 'voltage-source' || !output || ![start, end, count].every(Number.isFinite) || start >= end || !Number.isInteger(count) || count < 2 || count > 121) throw new AnalogError('ANALOG_SWEEP', '扫描需要有效电压源、输出、递增有限范围与 2–121 个点。')
  const points: SweepPoint[] = []
  for (let i = 0; i < count; i++) {
    if (signal?.aborted) throw new AnalogError('ANALOG_CANCELLED', '扫描已取消。', 'resource')
    const inputVolts = start + (end - start) * i / (count - 1)
    const point = solveAnalog({ ...circuit, elements: circuit.elements.map(e => e.id === sourceId ? { ...e, parameters: { voltage: inputVolts } } : e) }, signal)
    points.push({ inputVolts, outputVolts: point.nodeVolts[output.key]!, devices: point.devices, maxKclAmps: point.maxKclAmps, maxConstraintVolts: point.maxConstraintVolts })
    if (i % 8 === 0) await new Promise<void>(resolve => setTimeout(resolve, 0))
  }
  return points
}
