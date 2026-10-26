import { solveLinear } from '../dc/linear'
import { DcError } from '../dc/types'
import type { EngineHost } from '../analysis'
import { eventTimes, sourceValue } from './configuration'
import { TransientError } from './types'
import type { TransientCircuit, TransientResult, TransientSample, TransientSettings, TransientSeries } from './types'

type State = Readonly<Record<string, number>>
const storageElements = (c: TransientCircuit) => c.elements.filter(e => e.kind === 'capacitor' || e.kind === 'inductor')
export function storageState(c: TransientCircuit, s: TransientSample): State { return Object.fromEntries(storageElements(c).map(e => [e.id, e.kind === 'capacitor' ? s.voltages[e.p]! - s.voltages[e.n]! : s.currents[e.id]!])) }

/** Full branch MNA. At 0+/events storage states are exact constraints; BE uses real history terms. */
export function transientStep(c: TransientCircuit, previous: State, sources: Readonly<Record<string, number>>, h?: number): TransientSample {
  const active = c.nodes.filter(n => n.key !== c.referenceKey), branches = c.elements.filter(e => ['voltage-source', 'capacitor', 'inductor'].includes(e.kind))
  const vi = new Map(active.map((n, i) => [n.key, i])), ii = new Map(branches.map((e, i) => [e.id, active.length + i])), count = active.length + branches.length
  const matrix = Array.from({ length: count }, () => new Array<number>(count).fill(0)), rhs = new Array<number>(count).fill(0)
  const stamp = (r: number | undefined, k: number | undefined, x: number) => { if (r !== undefined && k !== undefined) matrix[r]![k] = matrix[r]![k]! + x }
  const inject = (key: string, amps: number) => { const r = vi.get(key); if (r !== undefined) rhs[r] = rhs[r]! + amps }
  for (const e of c.elements) {
    const p = vi.get(e.p), n = vi.get(e.n), row = ii.get(e.id)
    if (e.kind === 'resistor') { const g = 1 / e.value; stamp(p, p, g); stamp(p, n, -g); stamp(n, p, -g); stamp(n, n, g) }
    if (e.kind === 'current-source') { inject(e.p, -sources[e.id]!); inject(e.n, sources[e.id]!) }
    if (row !== undefined) {
      stamp(p, row, 1); stamp(n, row, -1)
      if (e.kind === 'inductor' && h === undefined) { stamp(row, row, 1); rhs[row] = previous[e.id]! }
      else {
        stamp(row, p, 1); stamp(row, n, -1)
        if (e.kind === 'voltage-source') rhs[row] = sources[e.id]!
        if (e.kind === 'capacitor') { if (h !== undefined) stamp(row, row, -h / e.value); rhs[row] = previous[e.id]! }
        if (e.kind === 'inductor') { stamp(row, row, -e.value / h!); rhs[row] = -e.value / h! * previous[e.id]! }
      }
    }
  }
  let solved: ReturnType<typeof solveLinear>
  try { solved = solveLinear(matrix, rhs) }
  catch (error) {
    if (error instanceof DcError) throw new TransientError(h === undefined ? 'TRAN_INITIAL_CONSTRAINT' : error.code.replace('DC_', 'TRAN_'), h === undefined ? `初始/事件后约束没有唯一一致的有限解。请检查浮置网络、储能初值与理想源；当前不处理脉冲解或冗余储能约束。${error.message}` : error.message, [], 'numerical')
    throw error
  }
  const voltages = Object.fromEntries(c.nodes.map(n => [n.key, n.key === c.referenceKey ? 0 : solved.values[vi.get(n.key)!]!])), currents: Record<string, number> = {}
  let energyJ = 0, resistorWatts = 0, sourceWatts = 0, maxKclAmps = 0
  for (const e of c.elements) {
    const v = voltages[e.p]! - voltages[e.n]!, i = e.kind === 'resistor' ? v / e.value : e.kind === 'current-source' ? sources[e.id]! : solved.values[ii.get(e.id)!]!
    currents[e.id] = i
    if (e.kind === 'capacitor') energyJ += .5 * e.value * v * v
    if (e.kind === 'inductor') energyJ += .5 * e.value * i * i
    if (e.kind === 'resistor') resistorWatts += v * i
    if (e.kind === 'voltage-source' || e.kind === 'current-source') sourceWatts += v * i
  }
  for (const n of c.nodes) {
    let kcl = 0, scale = 0
    for (const e of c.elements) { if (e.p === n.key) { kcl += currents[e.id]!; scale += Math.abs(currents[e.id]!) } if (e.n === n.key) { kcl -= currents[e.id]!; scale += Math.abs(currents[e.id]!) } }
    maxKclAmps = Math.max(maxKclAmps, Math.abs(kcl))
    if (Math.abs(kcl) > 1e-11 + 1e-8 * scale) throw new TransientError('TRAN_KCL', '独立支路重算未通过 KCL 检查。', n.anchorIds, 'numerical')
  }
  if (![...Object.values(voltages), ...Object.values(currents), energyJ, resistorWatts, sourceWatts].every(Number.isFinite)) throw new TransientError('TRAN_RANGE', '暂态电压/电流/能量超出有限数值范围。', [], 'numerical')
  return { voltages, currents, energyJ, resistorWatts, sourceWatts, maxKclAmps, backwardError: solved.backwardError }
}

export async function solveTransient(c: TransientCircuit, settings: TransientSettings, host: EngineHost): Promise<TransientResult | null> {
  const sourceAt = (t: number) => Object.fromEntries(settings.sources.map(s => [s.componentId, sourceValue(s, t)]))
  let sample = transientStep(c, Object.fromEntries(settings.initialConditions.map(s => [s.componentId, s.value])), sourceAt(0))
  const initialEnergyJ = sample.energyJ, storage = storageElements(c), events = eventTimes(settings)
  const series: { entityId: string; name: string; unit: TransientSeries['unit']; quantity: TransientSeries['quantity']; values: number[] }[] = [
    ...c.nodes.map(n => ({ entityId: n.anchorIds[0]!, name: `U(${n.name})`, unit: 'V' as const, quantity: 'node-voltage' as const, values: [] as number[] })),
    ...c.elements.flatMap(e => [
      { entityId: e.id, name: `I(${e.reference})`, unit: 'A' as const, quantity: 'branch-current' as const, values: [] as number[] },
      { entityId: e.id, name: `U(${e.reference})`, unit: 'V' as const, quantity: 'branch-voltage' as const, values: [] as number[] },
      ...(e.kind === 'capacitor' || e.kind === 'inductor' ? [{ entityId: e.id, name: `E(${e.reference})`, unit: 'J' as const, quantity: 'stored-energy' as const, values: [] as number[] }] : []),
    ]),
  ]
  const append = () => { let index = 0; for (const node of c.nodes) series[index++]!.values.push(sample.voltages[node.key]!); for (const e of c.elements) { const v = sample.voltages[e.p]! - sample.voltages[e.n]!, i = sample.currents[e.id]!; series[index++]!.values.push(i); series[index++]!.values.push(v); if (e.kind === 'capacitor' || e.kind === 'inductor') series[index++]!.values.push(.5 * e.value * (e.kind === 'capacitor' ? v * v : i * i)) } }
  let time = 0, suggestion = settings.intervalSeconds, eventIndex = 0, linearSolves = 1, acceptedSteps = 0, rejectedSteps = 0, attempts = 0
  let minimumStepSeconds = Infinity, maximumStepSeconds = 0, maxLocalErrorRatio = 0, maxKclAmps = sample.maxKclAmps, maxBackwardError = sample.backwardError
  let resistorDissipationJ = 0, sourceDeliveredJ = 0, numericalDissipationJ = 0
  const unknowns = c.nodes.length - 1 + c.elements.filter(e => ['voltage-source', 'capacitor', 'inductor'].includes(e.kind)).length
  const budget = () => { if (linearSolves > 60000 || linearSolves * Math.max(1, unknowns ** 3) > 80000000) throw new TransientError('TRAN_WORK_LIMIT', '误差控制所需内部求解超出预算（60000 次/80000000 估算工作量）。请缩短时长或调整参数/容差。未导出部分结果。', [], 'resource') }
  const integrate = (a: TransientSample, b: TransientSample, h: number) => {
    resistorDissipationJ += h * b.resistorWatts; sourceDeliveredJ -= h * b.sourceWatts
    const previous = storageState(c, a), next = storageState(c, b)
    for (const e of storage) numericalDissipationJ += .5 * e.value * (next[e.id]! - previous[e.id]!) ** 2
    maxKclAmps = Math.max(maxKclAmps, b.maxKclAmps); maxBackwardError = Math.max(maxBackwardError, b.backwardError)
  }
  append()
  const intervals = Math.round(settings.durationSeconds / settings.intervalSeconds)
  host.onProgress(0, intervals)
  for (let outputIndex = 1; outputIndex <= intervals; outputIndex++) {
    const outputTime = outputIndex * settings.intervalSeconds
    while (time < outputTime) {
      if (host.signal.aborted) return null
      const isEvent = eventIndex < events.length && events[eventIndex]! <= outputTime, target = isEvent ? events[eventIndex]! : outputTime
      const forcing = sourceAt((time + target) / 2)
      while (time < target) {
        if (host.signal.aborted) return null
        if (target - time <= 8 * Number.EPSILON * Math.max(Math.abs(target), Number.MIN_VALUE)) { time = target; break }
        const h = Math.min(suggestion, target - time), oldState = storageState(c, sample)
        if (h <= 32 * Number.EPSILON * Math.max(Math.abs(time), settings.durationSeconds) || time + h / 2 === time) throw new TransientError('TRAN_STEP_SMALL', '为满足数值误差要求，内部步长已过小；请调整时间范围或参数。', [], 'numerical')
        linearSolves += 3; budget()
        const coarse = transientStep(c, oldState, forcing, h), half = transientStep(c, oldState, forcing, h / 2), fine = transientStep(c, storageState(c, half), forcing, h / 2)
        const a = storageState(c, coarse), b = storageState(c, fine)
        let ratio = 0
        for (const e of storage) { const absolute = e.kind === 'capacitor' ? 1e-8 : 1e-10, scale = absolute + settings.relativeTolerance * Math.max(Math.abs(oldState[e.id]!), Math.abs(b[e.id]!)); ratio = Math.max(ratio, Math.abs(b[e.id]! - a[e.id]!) / scale) }
        if (!Number.isFinite(ratio)) throw new TransientError('TRAN_ACCURACY', '步长误差估计非有限，未报告成功。', [], 'numerical')
        suggestion = Math.min(settings.intervalSeconds, h * (ratio === 0 ? 2 : Math.max(.1, Math.min(2, .85 / Math.sqrt(ratio)))))
        if (ratio <= 1) {
          integrate(sample, half, h / 2); integrate(half, fine, h / 2); sample = fine; time = h === target - time ? target : time + h
          acceptedSteps += 2; minimumStepSeconds = Math.min(minimumStepSeconds, h / 2); maximumStepSeconds = Math.max(maximumStepSeconds, h / 2); maxLocalErrorRatio = Math.max(maxLocalErrorRatio, ratio)
        } else rejectedSteps++
        if (++attempts % 16 === 0) await new Promise<void>(resolve => setTimeout(resolve, 0))
      }
      if (isEvent) { linearSolves++; budget(); sample = transientStep(c, storageState(c, sample), sourceAt(target)); eventIndex++ }
    }
    append(); host.onProgress(outputIndex, intervals)
  }
  if (host.signal.aborted) return null
  const energyBalanceErrorJ = sample.energyJ - initialEnergyJ + resistorDissipationJ - sourceDeliveredJ + numericalDissipationJ
  const energyScale = initialEnergyJ + sample.energyJ + resistorDissipationJ + Math.abs(sourceDeliveredJ) + numericalDissipationJ
  if (![energyBalanceErrorJ, energyScale].every(Number.isFinite) || Math.abs(energyBalanceErrorJ) > 1e-12 + 1e-7 * energyScale) throw new TransientError('TRAN_ENERGY', '含源供能、阻性耗散与后向欧拉数值耗散的能量核对未通过。', [], 'numerical')
  return { circuit: c, referenceAnchorId: c.referenceAnchorId, settings, axis: { kind: 'uniform-time', startSeconds: 0, intervalSeconds: settings.intervalSeconds, count: intervals + 1 }, series,
    checks: { linearSolves, acceptedSteps, rejectedSteps, minimumStepSeconds, maximumStepSeconds, maxLocalErrorRatio, maxKclAmps, maxBackwardError, eventTimes: events, initialEnergyJ, finalEnergyJ: sample.energyJ, resistorDissipationJ, sourceDeliveredJ, numericalDissipationJ, energyBalanceErrorJ },
    diagnostics: [{ code: 'TRAN_APPROXIMATION', severity: 'info', message: '后向欧拉一阶近似；步长倍分控制局部储能状态误差，不保证全局精确值。事件前积分、事件后代数重求解；均匀输出可能无法显示两个采样点之间的窄脉冲。数值耗散与物理电阻耗散分列。', entityIds: [] }],
  }
}
