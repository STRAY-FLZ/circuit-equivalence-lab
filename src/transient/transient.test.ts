import { describe, expect, it } from 'vitest'
import { instantiateTemplate } from '../atlas'
import { applyEdit } from '../editing'
import { createEngineeringProject, createId } from '../engineering'
import type { EngineeringProject } from '../engineering'
import type { EngineHost, AnalysisResult } from '../analysis'
import { createTransientInput, transientEngine, parseTransientSettings, sourceValue } from './index'
import type { TransientResult, TransientSettings } from './index'

function fixture(template = 'rc-charge-topology', options: { readonly initial?: number; readonly voltage?: number; readonly r?: number; readonly c?: number; readonly l?: number; readonly duration?: number; readonly dt?: number; readonly tolerance?: number } = {}) {
  let project = instantiateTemplate(template)
  const sheet = project.sheets[0]!
  for (const c of sheet.components) {
    const kind = project.definitions.find(d => d.id === c.definitionId)!.kind, value = kind === 'resistor' ? options.r ?? 1000 : kind === 'capacitor' ? options.c ?? 1e-6 : kind === 'inductor' ? options.l ?? .1 : undefined
    if (value !== undefined) { const key = kind === 'resistor' ? 'resistance' : kind === 'capacitor' ? 'capacitance' : 'inductance', unit = kind === 'resistor' ? 'ohm' : kind === 'capacitor' ? 'F' : 'H'; project = applyEdit(project, sheet.id, { type: 'properties', id: c.id, reference: c.reference, parameters: { [key]: { kind: 'quantity', quantity: { value, unit } } } }) }
  }
  const settings: TransientSettings = { version: 1, method: 'backward-euler-adaptive', durationSeconds: options.duration ?? .005, intervalSeconds: options.dt ?? .00001, relativeTolerance: options.tolerance ?? 1e-5, referenceAnchorId: sheet.ports.find(p => ['COM', 'B'].includes(p.label))!.anchorId,
    sources: sheet.components.filter(c => ['voltage-source', 'current-source'].includes(project.definitions.find(d => d.id === c.definitionId)!.kind)).map(c => ({ componentId: c.id, unit: 'V', mode: 'step', initial: 0, final: options.voltage ?? 10, atSeconds: 0 })),
    initialConditions: sheet.components.filter(c => ['capacitor', 'inductor'].includes(project.definitions.find(d => d.id === c.definitionId)!.kind)).map(c => ({ componentId: c.id, unit: project.definitions.find(d => d.id === c.definitionId)!.kind === 'capacitor' ? 'V' : 'A', value: options.initial ?? 0 })),
  }
  return { project, settings, sheetId: sheet.id }
}
const host = (controller = new AbortController()): EngineHost => ({ signal: controller.signal, readAsset: () => Promise.reject(new Error('no input assets')), onProgress: () => {} })
async function run(f: ReturnType<typeof fixture>, override: Partial<TransientSettings> = {}, runtime = host()) { const input = await createTransientInput(f.project, f.sheetId, { ...f.settings, ...override }); return transientEngine.run(input, runtime) }
function success(result: AnalysisResult<TransientResult>): TransientResult { expect(result.outcome.kind, JSON.stringify(result.outcome.kind === 'failure' ? result.outcome.diagnostics : result.outcome.kind)).toBe('success'); if (result.outcome.kind !== 'success') throw Error('not success'); return result.outcome.value }
function series(output: TransientResult, name: string) { return output.series.find(s => s.name === name)!.values }

describe('linear transient actual MNA', () => {
  it('RC charging matches 1ms analytical reference, correct polarity and source energy', async () => {
    const f = fixture(), result = success(await run(f)), values = series(result, 'U(C1)')
    expect(values[0]).toBeCloseTo(0, 12); expect(values[100]).toBeCloseTo(6.321205588, 2)
    expect(series(result, 'I(R1)')[0]).toBeCloseTo(.01, 12)
    expect(result.checks.maxLocalErrorRatio).toBeLessThanOrEqual(1)
    expect(result.checks.maxKclAmps).toBeLessThan(1e-10)
    expect(result.checks.sourceDeliveredJ).toBeGreaterThan(result.checks.finalEnergyJ)
    expect(result.checks.energyBalanceErrorJ).toBeCloseTo(0, 12)
    expect(result.checks.numericalDissipationJ).toBeGreaterThan(0)
  })
  it.each([{ initial: 5, voltage: 0 }, { initial: 3, voltage: 10 }, { initial: -2, voltage: -10 }])('RC zero input/complete/negative polarity $initial -> $voltage', async ({ initial, voltage }) => {
    const output = success(await run(fixture('rc-charge-topology', { initial, voltage })))
    const v = series(output, 'U(C1)'); expect(v[0]).toBeCloseTo(initial, 12)
    for (const i of [1, 100, 500]) expect(v[i]).toBeCloseTo(voltage + (initial - voltage) * Math.exp(-i * .01), 2)
    expect(series(output, 'E(C1)')[0]).toBeCloseTo(.5e-6 * initial ** 2, 12)
  })
  it.each([{ initial: 0, voltage: 10 }, { initial: .04, voltage: 0 }, { initial: .02, voltage: 10 }])('RL zero-state/natural/complete $initial -> $voltage', async ({ initial, voltage }) => {
    const output = success(await run(fixture('rl-series-topology', { r: 100, initial, voltage })))
    const i = series(output, 'I(L1)'); expect(i[0]).toBeCloseTo(initial, 12)
    expect(i[100]).toBeCloseTo(voltage / 100 + (initial - voltage / 100) * Math.exp(-1), 4)
    expect(series(output, 'E(L1)')[0]).toBeCloseTo(.05 * initial ** 2, 12)
  })
  it('delayed off-grid pulse keeps capacitor state continuous and resistor current jumps', async () => {
    const f = fixture(), s = f.settings.sources[0]!, pulse = { componentId: s.componentId, unit: 'V' as const, mode: 'pulse' as const, initial: 0, final: 10, startSeconds: .000735, endSeconds: .002315 }
    const out = success(await run(f, { sources: [pulse] })), v = series(out, 'U(C1)')
    expect(v[73]).toBeCloseTo(0, 12)
    const exact = 10 * (1 - Math.exp(-(.002315 - .000735) / .001)) * Math.exp(-(.003 - .002315) / .001)
    expect(v[300]).toBeCloseTo(exact, 2); expect(out.checks.eventTimes).toEqual([.000735, .002315])
    const aligned = success(await run(f, { sources: [{ ...pulse, startSeconds: .001, endSeconds: .002 }] }))
    expect(series(aligned, 'U(C1)')[100]).toBeCloseTo(0, 12)
    expect(series(aligned, 'I(R1)')[100]).toBeCloseTo(.01, 12)
    expect(series(aligned, 'U(C1)')[200]).toBeCloseTo(6.321205588, 2)
    expect(series(aligned, 'I(R1)')[200]).toBeLessThan(0)
  })
  it('current excitation orientation and inductor current continuity at a step', async () => {
    const f = fixture('rl-series-topology', { r: 100, initial: .025 }), s = f.settings.sources[0]!
    const out = success(await run(f, { sources: [{ ...s, mode: 'step', initial: 0, final: -10, atSeconds: .001 }] }))
    expect(series(out, 'I(L1)')[100]).toBeCloseTo(.025 * Math.exp(-1), 4)
    expect(series(out, 'U(L1)')[100]).toBeLessThan(-10)
  })
  it('independent current-source step drives a real RC branch without voltage-source assumptions', async () => {
    const f = fixture('current-load'), sheet = f.project.sheets[0]!, resistor = sheet.components.find(c => c.reference === 'R2')!
    let project = applyEdit(f.project, f.sheetId, { type: 'add', kind: 'capacitor', position: { x: 800, y: 300 } })
    const cap = project.sheets[0]!.components.at(-1)!
    project = applyEdit(project, f.sheetId, { type: 'properties', id: cap.id, reference: cap.reference, parameters: { capacitance: { kind: 'quantity', quantity: { value: 1e-6, unit: 'F' } } } })
    for (const index of [0, 1]) project = applyEdit(project, f.sheetId, { type: 'connect', from: { anchorId: cap.pins[index]!.anchorId }, to: { anchorId: resistor.pins[index]!.anchorId } })
    const out = success(await run({ ...f, project }, { sources: [{ componentId: sheet.components.find(c => c.reference === 'I1')!.id, unit: 'A', mode: 'step', initial: 0, final: .002, atSeconds: 0 }], initialConditions: [{ componentId: cap.id, unit: 'V', value: 0 }] }))
    expect(series(out, `U(${cap.reference})`)[100]).toBeCloseTo(2 * (1 - Math.exp(-1)), 2)
    expect(out.checks.sourceDeliveredJ).toBeGreaterThan(0)
  })
  it.each([200, 400, 600])('series RLC actual R=%d matches independent step expression and energy', async r => {
    const out = success(await run(fixture('series-rlc', { r, l: 1, c: 25e-6, duration: .08, dt: .0001 }))), alpha = r / 2, omega = 200, time = .01
    let expected: number
    if (r === 400) expected = 10 * (1 - (1 + alpha * time) * Math.exp(-alpha * time))
    else if (r < 400) { const wd = Math.sqrt(omega ** 2 - alpha ** 2); expected = 10 * (1 - Math.exp(-alpha * time) * (Math.cos(wd * time) + alpha / wd * Math.sin(wd * time))) }
    else { const p = -alpha + Math.sqrt(alpha ** 2 - omega ** 2), q = -alpha - Math.sqrt(alpha ** 2 - omega ** 2); expected = 10 * (1 + (q * Math.exp(p * time) - p * Math.exp(q * time)) / (p - q)) }
    expect(Math.abs(series(out, 'U(C1)')[100]! - expected)).toBeLessThan(.01)
    const maximum = Math.max(...series(out, 'U(C1)')); if (r === 200) expect(maximum).toBeGreaterThan(11.5); else expect(maximum).toBeLessThan(10.01)
    expect(Math.abs(out.checks.energyBalanceErrorJ)).toBeLessThan(1e-10)
  }, 20000)
  it.each([200, 100, 50])('parallel RLC natural response R=%d is finite with dissipating energy', async r => {
    const f = fixture('parallel-rlc', { r, l: 1, c: 25e-6, duration: .08, dt: .0001 })
    const out = success(await run(f, { initialConditions: f.settings.initialConditions.map(s => ({ ...s, value: s.unit === 'V' ? 5 : 0 })) }))
    expect(series(out, 'U(C1)')[0]).toBeCloseTo(5, 12); expect(series(out, 'I(L1)')[0]).toBeCloseTo(0, 12)
    expect(out.checks.finalEnergyJ).toBeLessThan(out.checks.initialEnergyJ)
    const e = series(out, 'E(C1)').map((v, i) => v + series(out, 'E(L1)')[i]!)
    for (let i = 1; i < e.length; i++) expect(e[i]).toBeLessThanOrEqual(e[i - 1]! + 1e-15)
    expect(Math.abs(out.checks.energyBalanceErrorJ)).toBeLessThan(1e-10)
  })
  it('time-step refinement reduces BE error independently of display samples', async () => {
    const coarse = success(await run(fixture('rc-charge-topology', { tolerance: 1e-3, dt: .00002 }))), fine = success(await run(fixture('rc-charge-topology', { tolerance: 1e-3, dt: .000005 })))
    const exact = 10 * (1 - Math.exp(-1)), a = Math.abs(series(coarse, 'U(C1)')[50]! - exact), b = Math.abs(series(fine, 'U(C1)')[200]! - exact)
    expect(b).toBeLessThan(a / 2.5)
  })
  it.each([1e-9, 1e3])('scales with small/large time constants %d s', async tau => {
    const f = fixture('rc-charge-topology', { c: tau / 1000, duration: tau * 5, dt: tau / 100 }), out = success(await run(f))
    expect(series(out, 'U(C1)')[100]).toBeCloseTo(6.321205588, 2)
  })
  it('rejects incompatible capacitor/ideal-source and floating constraints without fabricated states', async () => {
    const f = fixture(), sheet = f.project.sheets[0]!, cap = sheet.components.find(c => c.reference === 'C1')!, source = sheet.components.find(c => c.reference === 'V1')!
    const project = createEngineeringProject({ ...f.project, sheets: [{ ...sheet, connections: [...sheet.connections, { id: createId(), endpoints: [cap.pins[0]!.anchorId, source.pins[0]!.anchorId] }] }] })
    const result = await run({ ...f, project }); expect(result.outcome.kind).toBe('failure')
    const floating: EngineeringProject = createEngineeringProject({ ...f.project, sheets: [{ ...sheet, anchors: [...sheet.anchors, { id: createId() }] }] })
    expect((await run({ ...f, project: floating })).outcome.kind).toBe('failure')
  })
  it('detects invalid sources, IC units, time grid, digest tampering and resource limits', async () => {
    const f = fixture()
    expect((await run(f, { sources: [] })).outcome.kind).toBe('failure')
    expect((await run(f, { initialConditions: f.settings.initialConditions.map(s => ({ ...s, unit: 'A' })) })).outcome.kind).toBe('failure')
    expect(() => parseTransientSettings({ ...f.settings, durationSeconds: -1 })).toThrow()
    expect(() => parseTransientSettings({ ...f.settings, intervalSeconds: .000003 })).toThrow(/整数倍/)
    expect(() => parseTransientSettings({ ...f.settings, intervalSeconds: 1e-10 })).toThrow(/8193/)
    const input = await createTransientInput(f.project, f.sheetId, f.settings)
    expect((await transientEngine.run({ ...input, project: { ...input.project, title: 'tampered' } }, host())).outcome.kind).toBe('failure')
  })
  it('cancels before execution and between bounded units without publishing partial output', async () => {
    const f = fixture(), controller = new AbortController(); controller.abort()
    expect((await run(f, {}, host(controller))).outcome.kind).toBe('cancelled')
    const during = new AbortController(), runtime = { ...host(during), onProgress: (n: number) => { if (n === 3) during.abort() } }
    expect((await run(f, {}, runtime)).outcome.kind).toBe('cancelled')
  })
  it('bounded matrix work fails explicitly without returning partial samples', async () => {
    const f = fixture('resistor-series', { duration: .0003, dt: .000001 }), ground = f.project.sheets[0]!.ports.find(p => p.label === 'B')!.anchorId
    let project = f.project
    for (let i = 0; i < 46; i++) { project = applyEdit(project, f.sheetId, { type: 'add', kind: 'resistor', position: { x: 100, y: 100 } }); const r = project.sheets[0]!.components.at(-1)!; project = applyEdit(project, f.sheetId, { type: 'connect', from: { anchorId: r.pins[1]!.anchorId }, to: { anchorId: ground } }) }
    const result = await run({ ...f, project }); expect(result.outcome.kind).toBe('failure')
    if (result.outcome.kind === 'failure') { expect(result.outcome.category).toBe('resource'); expect(result.outcome.diagnostics[0]!.code).toBe('TRAN_WORK_LIMIT') }
  }, 20000)
  it('unsupported pinned models remain unsupported rather than being dropped', async () => {
    const f = fixture(), definition = f.project.definitions.find(d => d.kind === 'capacitor')!
    const project = createEngineeringProject({ ...f.project, definitions: f.project.definitions.map(d => d.id === definition.id ? { ...d, modelBindings: [{ analysisFamily: 'electrical', model: { id: 'org.example.nonlinear', version: '1' }, portMap: { p: '1', n: '2' } }] } : d) })
    expect((await run({ ...f, project })).outcome.kind).toBe('unsupported')
  })
  it('explicit source values and capability inspect are immutable and never reuse DC/AC', async () => {
    const f = fixture(), input = await createTransientInput(f.project, f.sheetId, f.settings), serialized = JSON.stringify(input)
    expect(transientEngine.inspect(input).kind).toBe('supported'); expect(Object.isFrozen(input.project)).toBe(true)
    await transientEngine.run(input, host()); expect(JSON.stringify(input)).toBe(serialized)
    expect(sourceValue({ componentId: 'x', unit: 'A', mode: 'constant', value: -.2 }, 1)).toBe(-.2)
  })
})
