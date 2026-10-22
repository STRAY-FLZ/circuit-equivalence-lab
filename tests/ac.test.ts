import { describe, expect, it } from 'vitest'
import { createAcInput, acEngine, c, div, abs, phase, parseAcSettings, resolveAcCircuit, solveAc, sweepFeatures, sweepFrequencies } from '../src/ac'
import type { AcSettings, AcSolution, SweepOptions } from '../src/ac'
import { createEngineeringProject, createId } from '../src/engineering'
import type { EngineeringProject } from '../src/engineering'
import { applyEdit, emptySheet } from '../src/editing'
import { dcFixture, load } from './dc-fixtures'
import type { Part } from './dc-fixtures'

const host = () => ({ signal: new AbortController().signal, readAsset: () => Promise.resolve(new Uint8Array()), onProgress: () => {} })
export function acSettings(p: EngineeringProject, frequencyHz = 100): AcSettings { return { frequencyHz, sources: p.sheets[0]!.components.filter(c => ['voltage-source', 'current-source'].includes(p.definitions.find(d => d.id === c.definitionId)!.kind)).map((e, i) => ({ componentId: e.id, magnitudeRms: i === 0 ? 1 : 0, phaseDegrees: 0 })) } }
function probe(p: EngineeringProject, name: string): string { return p.sheets[0]!.ports.find(port => port.label === name)!.anchorId }
const branch = (s: AcSolution, name: string) => s.branches.find(b => b.reference === name)!
export function rc(highpass = false): EngineeringProject { return dcFixture([{ ref: 'V1', kind: 'voltage-source', value: 99, nodes: ['a', 'g'] }, { ref: highpass ? 'C1' : 'R1', kind: highpass ? 'capacitor' : 'resistor', value: highpass ? 1e-6 : 1000, nodes: ['a', 'o'] }, { ref: highpass ? 'R1' : 'C1', kind: highpass ? 'resistor' : 'capacitor', value: highpass ? 1000 : 1e-6, nodes: ['o', 'g'] }]) }
function sweep(p: EngineeringProject, fc: number, passband: SweepOptions['passband'] = 'low'): AcSettings { return { ...acSettings(p, fc), sweep: { startHz: fc / 100, endHz: fc * 100, points: 201, spacing: 'log', excitationSourceId: p.sheets[0]!.components[0]!.id, input: [probe(p, 'a'), probe(p, 'g')], output: [probe(p, 'o'), probe(p, 'g')], passband } } }
async function run(p: EngineeringProject, settings = acSettings(p)) { return acEngine.run(await createAcInput(p, p.sheets[0]!.id, settings), host()) }
async function solved(p: EngineeringProject, settings = acSettings(p)) { const result = await run(p, settings); expect(result.outcome.kind, JSON.stringify(result.outcome)).toBe('success'); if (result.outcome.kind !== 'success') throw new Error('no solution'); return result.outcome.value }
async function errorCode(p: EngineeringProject, settings: AcSettings, code: string) { const r = await run(p, settings); expect('diagnostics' in r.outcome && r.outcome.diagnostics[0]!.code).toBe(code) }
describe('complex AC MNA and defined transfer', () => {
  it('solves resistor AC equivalence without reinterpreting a DC value', async () => {
    const p = dcFixture(load()), s = (await solved(p)).operatingPoint
    expect(branch(s, 'R1').voltage.magnitudeRms).toBe(1); expect(branch(s, 'R1').current.magnitudeRms).toBe(.001)
    expect(branch(s, 'R1').power).toEqual({ realWatts: .001, reactiveVars: 0, apparentVA: .001 })
    expect(branch(s, 'V1').power.realWatts).toBeCloseTo(-.001)
    expect(s.checks.complexBackwardError).toBeLessThan(1e-12)
    expect(s.equations.unknowns[1]!.entityIds).toEqual([p.sheets[0]!.components[0]!.id])
  })
  it.each([0, 45, -90, 180])('uses cosine RMS phase %s degrees', async angle => {
    const p = dcFixture(load()), settings = acSettings(p), value = (await solved(p, { ...settings, sources: [{ ...settings.sources[0]!, magnitudeRms: 2, phaseDegrees: angle }] })).operatingPoint
    expect(branch(value, 'R1').voltage.magnitudeRms).toBeCloseTo(2); expect(branch(value, 'R1').power.realWatts).toBeCloseTo(.004)
    expect(Math.abs(branch(value, 'R1').voltage.phaseDegrees! - angle)).toBeLessThan(1e-10)
  })
  it.each(['capacitor', 'inductor'] as const)('gets %s phase/reactive-power signs correct', async kind => {
    const p = dcFixture([{ ref: 'V1', kind: 'voltage-source', value: 5, nodes: ['a', 'g'] }, { ref: 'X1', kind, value: kind === 'capacitor' ? 1e-6 : .01, nodes: ['a', 'g'] }]), s = (await solved(p, acSettings(p, 1000))).operatingPoint, e = branch(s, 'X1')
    expect(e.current.phaseDegrees).toBeCloseTo(kind === 'capacitor' ? 90 : -90)
    expect(Math.sign(e.power.reactiveVars)).toBe(kind === 'capacitor' ? -1 : 1)
    expect(e.power.realWatts).toBeCloseTo(0)
    expect(e.impedance!.imaginary).toBeCloseTo(kind === 'capacitor' ? -1 / (2 * Math.PI * 1000 * 1e-6) : 2 * Math.PI * 1000 * .01)
  })
  it.each([false, true])('matches RC cutoff and sweep with highpass=%s', async highpass => {
    const p = rc(highpass), fc = 1 / (2 * Math.PI * .001), result = await solved(p, sweep(p, fc, highpass ? 'high' : 'low')), response = result.sweep!, at = response.points[100]!
    expect(at.kind).toBe('available')
    if (at.kind === 'available') { expect(at.magnitude).toBeCloseTo(1 / Math.sqrt(2), 10); expect(at.gainDb).toBeCloseTo(-3.01029995664, 9); expect(at.phaseDegrees).toBeCloseTo(highpass ? 45 : -45, 9) }
    expect(response.analyticalReference!.frequencyHz).toBeCloseTo(fc, 10)
    expect(response.features.halfPowerCrossingsHz[0]!).toBeCloseTo(fc, 1)
  })
  it('moves RC cutoff by half after doubling R and preserves original snapshot', async () => {
    const p = rc(), old = await createAcInput(p, p.sheets[0]!.id, sweep(p, 159.154943)), r = p.sheets[0]!.components.find(c => c.reference === 'R1')!
    const changed = applyEdit(p, p.sheets[0]!.id, { type: 'properties', id: r.id, reference: r.reference, parameters: { resistance: { kind: 'quantity', quantity: { value: 2000, unit: 'ohm' } } } })
    const output = await solved(changed, sweep(changed, 79.5774715)); expect(output.sweep!.analyticalReference!.frequencyHz).toBeCloseTo(79.5774715)
    expect(changed.revision).not.toBe(old.project.revision); expect(old.project.sheets[0]!.components.find(c => c.reference === 'R1')!.parameters.resistance).toMatchObject({ quantity: { value: 1000 } })
  })
  it('solves series RLC resistor-output resonance and sampled bandwidth', async () => {
    const p = dcFixture([{ ref: 'V1', kind: 'voltage-source', value: 5, nodes: ['a', 'g'] }, { ref: 'L1', kind: 'inductor', value: .01, nodes: ['a', 'm'] }, { ref: 'C1', kind: 'capacitor', value: 1e-6, nodes: ['m', 'o'] }, { ref: 'R1', kind: 'resistor', value: 100, nodes: ['o', 'g'] }]), f0 = 1 / (2 * Math.PI * Math.sqrt(.01 * 1e-6)), result = await solved(p, sweep(p, f0, 'peak')), s = result.sweep!
    const peak = s.points[100]!; if (peak.kind !== 'available') throw new Error('missing peak')
    expect(peak.magnitude).toBeCloseTo(1, 10); expect(peak.phaseDegrees).toBeCloseTo(0, 9)
    expect(s.features.sampledPeak!.frequencyHz).toBeCloseTo(f0, 8); expect(s.analyticalReference!.frequencyHz).toBeCloseTo(f0, 8)
    expect(s.features.estimatedBandwidthHz, JSON.stringify(s.points.filter(p => p.kind === 'failed'))).not.toBeNull(); expect(Math.abs(s.features.estimatedBandwidthHz! - 100 / (2 * Math.PI * .01))).toBeLessThan(3)
  })
  it.each(['vcvs', 'vccs', 'ccvs', 'cccs'] as const)('stamps frequency-independent %s using complex controls', async kind => {
    const parts: Part[] = kind === 'vcvs' || kind === 'vccs'
      ? [{ ref: 'V1', kind: 'voltage-source', value: 5, nodes: ['c', 'g'] }, { ref: 'D1', kind, value: kind === 'vcvs' ? 3 : .003, nodes: ['o', 'g', 'c', 'g'] }, { ref: 'R1', kind: 'resistor', value: 1000, nodes: ['o', 'g'] }]
      : [{ ref: 'I1', kind: 'current-source', value: 9, nodes: ['g', 's'] }, { ref: 'V0', kind: 'voltage-source', value: 99, nodes: ['s', 'g'] }, { ref: 'D1', kind, value: kind === 'ccvs' ? 1000 : 3, nodes: ['o', 'g'], control: 'V0' }, { ref: 'R1', kind: 'resistor', value: 1000, nodes: ['o', 'g'] }]
    const p = dcFixture(parts), settings = acSettings(p), sources = settings.sources.map((s, i) => ({ ...s, magnitudeRms: i === 0 ? .002 : 0, phaseDegrees: 90 }))
    if (kind === 'vcvs' || kind === 'vccs') sources[0]!.magnitudeRms = 2
    const s = (await solved(p, { ...settings, sources })).operatingPoint, expected = kind === 'vcvs' ? 6 : kind === 'ccvs' ? 2 : -6
    expect(branch(s, 'R1').voltage.value.imaginary).toBeCloseTo(expected, 10)
    expect(s.checks.maxKclAmps).toBeLessThan(1e-12)
  })
  it('requires explicit complete source settings and rejects ambiguous sweeps', async () => {
    const p = rc(); await errorCode(p, { frequencyHz: 100, sources: [] }, 'AC_SOURCES')
    const two = dcFixture([{ ref: 'V1', kind: 'voltage-source', value: 5, nodes: ['a', 'g'] }, { ref: 'R1', kind: 'resistor', value: 1000, nodes: ['a', 'o'] }, { ref: 'R2', kind: 'resistor', value: 1000, nodes: ['o', 'g'] }, { ref: 'I1', kind: 'current-source', value: 0, nodes: ['g', 'a'] }]), settings = sweep(two, 100)
    await errorCode(two, { ...settings, sources: settings.sources.map(s => ({ ...s, magnitudeRms: 1 })) }, 'AC_EXCITATION')
    expect((await run(two, settings)).outcome.kind).toBe('success')
  })
  it.each([0, -1, Infinity, NaN])('rejects invalid frequency %s', frequencyHz => { expect(() => parseAcSettings({ frequencyHz, sources: [] })).toThrow() })
  it('reports floating and inconsistent systems, and does not silently idealize nonlinear models', async () => {
    const floating = dcFixture([...load(), { ref: 'R2', kind: 'resistor', value: 100, nodes: ['x', 'y'] }]); await errorCode(floating, acSettings(floating), 'AC_UNDERDETERMINED')
    const p = dcFixture([...load(), { ref: 'V2', kind: 'voltage-source', value: 5, nodes: ['a', 'g'] }]); await errorCode(p, acSettings(p), 'AC_INCONSISTENT')
    const source = rc(); const unknown = createEngineeringProject({ ...source, definitions: source.definitions.map(d => d.kind === 'capacitor' ? { ...d, modelBindings: [{ analysisFamily: 'electrical', model: { id: 'org.other.nonlinear', version: '1' }, portMap: { p: '1', n: '2' } }] } : d) }); await errorCode(unknown, acSettings(unknown), 'AC_MODEL_UNSUPPORTED')
  })
  it('keeps reference markers distinct, diagnoses missing/ambiguous and cross-sheet labels', async () => {
    const p = rc(), sheet = p.sheets[0]!, noRef = createEngineeringProject({ ...p, sheets: [{ ...sheet, references: [] }] }); await errorCode(noRef, acSettings(noRef), 'AC_REFERENCE_MISSING')
    const amb = createEngineeringProject({ ...p, sheets: [{ ...sheet, references: [...sheet.references, { id: createId(), anchorId: probe(p, 'a'), domain: 'analog' }] }] }); await errorCode(amb, acSettings(amb), 'AC_REFERENCE_AMBIGUOUS')
    expect((await run(amb, { ...acSettings(amb), referenceAnchorId: probe(p, 'a') })).outcome.kind).toBe('success')
    const b = emptySheet(), id = createId(), cross = createEngineeringProject({ ...p, sheets: [{ ...sheet, labels: [{ id: createId(), name: 'X', scope: 'project', anchorId: sheet.anchors[0]!.id }] }, { ...b, anchors: [{ id }], labels: [{ id: createId(), name: 'X', scope: 'project', anchorId: id }] }] }); await errorCode(cross, acSettings(cross), 'AC_CROSS_SHEET')
  })
  it('rejects shorted probes, unknown anchors and resource excess', async () => {
    const p = rc(), s = sweep(p, 100), option = s.sweep!
    await errorCode(p, { ...s, sweep: { ...option, input: [probe(p, 'a'), probe(p, 'a')] } }, 'AC_PROBES')
    await errorCode(p, { ...s, sweep: { ...option, output: [createId(), probe(p, 'g')] } }, 'AC_ANCHOR')
    expect(() => parseAcSettings({ ...s, sweep: { ...option, points: 402 } })).toThrow('3–401')
    const large = dcFixture(Array.from({ length: 65 }, (_, i) => ({ ref: `R${i}`, kind: 'resistor', value: 1000, nodes: [`n${i}`, 'g'] }))); await errorCode(large, acSettings(large), 'AC_RESOURCE')
  })
  it('retains per-point failure and zero-transfer definitions without fabricated dB', async () => {
    const p = rc(), settings = sweep(p, 100), result = await solved(p, { ...settings, sources: settings.sources.map(s => ({ ...s, magnitudeRms: 1e-320 })) })
    // Very small finite test amplitudes may either solve or fail numerically; no nonfinite report values.
    expect(JSON.stringify(result)).not.toContain('Infinity')
    const s = sweepFeatures([{ kind: 'failed', frequencyHz: 1, diagnostic: { code: 'TEST', severity: 'error', message: 'no point', entityIds: [] } }], settings.sweep!)
    expect(s.halfPowerCrossingsHz).toEqual([]); expect(s.sampledPeak).toBeNull()
  })
  it('checks digest changes/cancellation and pure inspection', async () => {
    const p = rc(), input = await createAcInput(p, p.sheets[0]!.id, acSettings(p)), before = JSON.stringify(p)
    expect(acEngine.inspect(input).kind).toBe('supported'); expect(JSON.stringify(p)).toBe(before)
    const r = await acEngine.run({ ...input, configuration: { ...input.configuration, options: { ...input.configuration.options, frequencyHz: 300 } } }, host()); expect('diagnostics' in r.outcome && r.outcome.diagnostics[0]!.code).toBe('AC_DIGEST')
    const controller = new AbortController(); controller.abort(); expect((await acEngine.run(input, { ...host(), signal: controller.signal })).outcome.kind).toBe('cancelled')
    const during = new AbortController(), sweeping = await createAcInput(p, p.sheets[0]!.id, sweep(p, 100))
    expect((await acEngine.run(sweeping, { ...host(), signal: during.signal, onProgress: (n, total) => { if (n === total) during.abort() } })).outcome.kind).toBe('cancelled')
  })
  it('reports a balanced bridge zero transfer with undefined phase and logarithm', async () => {
    const p = dcFixture([{ ref: 'V1', kind: 'voltage-source', value: 1, nodes: ['a', 'g'] }, ...[['a', 'l'], ['l', 'g'], ['a', 'r'], ['r', 'g']].map((nodes, i) => ({ ref: `R${i}`, kind: 'resistor' as const, value: 1000, nodes }))])
    const result = await solved(p, { ...acSettings(p), sweep: { startHz: 1, endHz: 100, points: 3, spacing: 'log', excitationSourceId: p.sheets[0]!.components[0]!.id, input: [probe(p, 'a'), probe(p, 'g')], output: [probe(p, 'l'), probe(p, 'r')], passband: 'low' } })
    expect(result.sweep!.points).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'available', magnitude: 0, gainDb: null, phaseDegrees: null })]))
  })
  it('retains numerical failure at an extreme sweep point while other points succeed', async () => {
    const p = dcFixture([{ ref: 'V1', kind: 'voltage-source', value: 1, nodes: ['a', 'g'] }, { ref: 'L1', kind: 'inductor', value: .001, nodes: ['a', 'g'] }])
    const result = await solved(p, { ...acSettings(p), sweep: { startHz: 1e-308, endHz: 100, points: 3, spacing: 'log', excitationSourceId: p.sheets[0]!.components[0]!.id, input: [probe(p, 'a'), probe(p, 'g')], output: [probe(p, 'a'), probe(p, 'g')], passband: 'low' } })
    expect(result.sweep!.points[0]!.kind).toBe('failed'); expect(result.sweep!.points.at(-1)!.kind).toBe('available')
  })
  it('generates real linear/log grids and explicit complex arithmetic', () => {
    const p = rc(), s = sweep(p, 100).sweep!
    expect(sweepFrequencies({ ...s, startHz: 1, endHz: 100, points: 3 })).toEqual([1, 10.000000000000002, 100])
    expect(sweepFrequencies({ ...s, startHz: 1, endHz: 100, points: 3, spacing: 'linear' })).toEqual([1, 50.5, 100])
    expect(abs(div(c(1), c(1, 1)))).toBeCloseTo(1 / Math.sqrt(2)); expect(phase(c())).toBeNull()
    const circuit = resolveAcCircuit(p, p.sheets[0]!.id, acSettings(p)); expect(solveAc(circuit, acSettings(p)).checks.complexBackwardError).toBeLessThan(1e-9)
  })
})
