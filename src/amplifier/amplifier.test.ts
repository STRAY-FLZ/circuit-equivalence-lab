// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { instantiateTemplate } from '../atlas'
import { applyEdit } from '../editing'
import type { EngineeringProject, JsonObject } from '../engineering'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { add, c, solveAc } from '../ac'
import type { AcCircuit, AcElement, AcSettings, SweepPoint } from '../ac'
import { mosPoint, shockley } from '../analog'
import type { AnalogElement, DevicePoint } from '../analog'
import { linearizedDevice, prepareAmplifier } from './circuit'
import { amplifierEngine, createAmplifierInput } from './engine'
import { midbandFeatures } from './features'
import { solveAmplifierDcFallback } from './dc-fallback'
import type { AmplifierSettings } from './types'

const host = () => ({ signal: new AbortController().signal, readAsset: () => Promise.reject(new Error('unexpected asset')), onProgress: () => {} })
const getSettings = (p: EngineeringProject) => (p.extensions['org.stray.amplifier-frequency'] as JsonObject).settings as unknown as AmplifierSettings
const run = async (p: EngineeringProject, s = getSettings(p)) => amplifierEngine.run(await createAmplifierInput(p, p.sheets[0]!.id, s), host())
const success = async (p: EngineeringProject, s = getSettings(p)) => { const result = await run(p, s); if (result.outcome.kind !== 'success') throw new Error(JSON.stringify(result.outcome)); return result.outcome.value }
const edit = (p: EngineeringProject, reference: string, key: string, value: number) => { const sheet = p.sheets[0]!, c = sheet.components.find(c => c.reference === reference)!, old = c.parameters[key]!; if (old.kind !== 'quantity') throw Error('bad fixture'); return applyEdit(p, sheet.id, { type: 'properties', id: c.id, reference, parameters: { ...c.parameters, [key]: { kind: 'quantity', quantity: { ...old.quantity, value } } } }) }
const sample = (value: Awaited<ReturnType<typeof success>>, frequency: number) => value.points.reduce((a, b) => Math.abs(Math.log(a.frequencyHz / frequency)) < Math.abs(Math.log(b.frequencyHz / frequency)) ? a : b)
const magnitude = (point: ReturnType<typeof sample>) => { if (point.kind !== 'available') throw Error(JSON.stringify(point)); return point.magnitude }

describe('independent linearized amplifier fixtures', () => {
  function fixture(kind: 'npn' | 'nmos', gm: number, load: number): { circuit: AcCircuit; settings: AcSettings } {
    const e: AnalogElement = { id: 'Q', reference: 'Q', kind, nodes: ['b', 'c', 'g'], pinIds: ['b-pin', 'c-pin', 'e-pin'], parameters: {} }
    const point: DevicePoint = { componentId: 'Q', reference: 'Q', kind, region: kind === 'npn' ? 'active' : 'saturation', gm, ...(kind === 'npn' ? { rpi: 5000 } : { gds: 0 }), terminalAmps: [0, 0, 0], terminalVolts: [0, 0, 0] }
    const r = (id: string): AcElement => ({ id, reference: id, kind: 'resistor', p: 'c', n: 'g', value: load, fromPinId: `${id}p`, toPinId: `${id}n` })
    const v: AcElement = { id: 'V', reference: 'V', kind: 'voltage-source', p: 'b', n: 'g', value: 0, fromPinId: 'Vp', toPinId: 'Vn' }
    return { circuit: { referenceKey: 'g', referenceAnchorId: 'g', nodes: ['g', 'b', 'c'].map(key => ({ key, name: key, anchorIds: [key], pinIds: [] })), anchorToNet: { g: 'g', b: 'b', c: 'c' }, elements: [v, r('RC'), r('RL'), ...linearizedDevice(e, point)] }, settings: { frequencyHz: 1000, sources: [{ componentId: 'V', magnitudeRms: 1, phaseDegrees: 0 }] } }
  }
  it.each([['npn', .02, 2000, -20], ['nmos', .005, 4000, -10]] as const)('%s fixed-gm fixture solves %s S to gain %s', (kind, gm, load, expected) => {
    const f = fixture(kind, gm, load), s = solveAc(f.circuit, f.settings), out = s.nodes.find(n => n.key === 'c')!
    expect(out.value.real).toBeCloseTo(expected, 10); expect(out.value.imaginary).toBeCloseTo(0, 12); expect(s.checks.maxKclAmps).toBeLessThan(1e-10)
  })
  it.each([['high', 1e-6, 15.915494309], ['low', 100e-12, 159154.94309]] as const)('independent isolated RC %s half-power reference', (mode, capacitance, fc) => {
    const r: AcElement = { id: 'R', reference: 'R', kind: 'resistor', value: 10000, p: mode === 'low' ? 'in' : 'out', n: mode === 'low' ? 'out' : 'g', fromPinId: 'r1', toPinId: 'r2' }
    const cap: AcElement = { id: 'C', reference: 'C', kind: 'capacitor', value: capacitance, p: mode === 'high' ? 'in' : 'out', n: mode === 'high' ? 'out' : 'g', fromPinId: 'c1', toPinId: 'c2' }
    const v: AcElement = { id: 'V', reference: 'V', kind: 'voltage-source', value: 0, p: 'in', n: 'g', fromPinId: 'v1', toPinId: 'v2' }
    const circuit: AcCircuit = { elements: [v, r, cap], nodes: ['in', 'out', 'g'].map(key => ({ key, name: key, anchorIds: [key], pinIds: [] })), anchorToNet: { in: 'in', out: 'out', g: 'g' }, referenceKey: 'g', referenceAnchorId: 'g' }
    expect(solveAc(circuit, { frequencyHz: fc, sources: [{ componentId: 'V', magnitudeRms: 1, phaseDegrees: 0 }] }).nodes.find(n => n.key === 'out')!.magnitudeRms).toBeCloseTo(Math.SQRT1_2, 8)
    expect(fc).toBeCloseTo(1 / (2 * Math.PI * 10000 * capacitance), 5)
  })
})

describe('actual DC-biased amplifier provider', () => {
  it.each(['ce-basic', 'ce-degenerated', 'ce-coupled', 'ce-bypass', 'cs-basic', 'cs-degenerated', 'cs-coupled', 'cs-parasitic'])('solves editable %s template and schema1 roundtrip', async id => {
    const p = instantiateTemplate(`amplifier-${id}`), s = getSettings(p), input = await createAmplifierInput(p, p.sheets[0]!.id, s), bias = prepareAmplifier(input), result = await amplifierEngine.run(input, host())
    expect(bias.device.componentId).toBeDefined()
    expect(result.outcome.kind, JSON.stringify(result.outcome)).toBe('success')
    if (result.outcome.kind !== 'success') return
    expect(result.provenance.inputRevision).toBe(p.revision); expect(result.provenance.inputDigest).toMatch(/^[a-f0-9]{64}$/)
    expect(result.outcome.value.bias.device.region).toBe(id.startsWith('ce') ? 'active' : 'saturation')
    expect(result.outcome.value.points.filter(p => p.kind === 'available').length).toBeGreaterThan(180)
    expect(result.outcome.value.single.checks.maxKclAmps).toBeLessThan(1e-10)
    const doc = await createProjectDocument(p, { name: 'amp test', version: '3.1.0' }, []), restored = await deserializeProject(await serializeProject(doc))
    expect(restored.kind).toBe('ready')
    if (restored.kind === 'ready') { expect(getSettings(restored.document.project)).toEqual(s); expect(restored.document.project.sheets[0]!.components.map(c => c.id).sort()).toEqual(p.sheets[0]!.components.map(c => c.id).sort()); expect(restored.document.formatVersion).toBe(1) }
  })
  it('matches exact BJT/MOS derivatives and independent common-emitter/source gain', async () => {
    const npn = await success(instantiateTemplate('amplifier-ce-basic')), q = npn.bias.device, d = npn.bias.dc.circuit.elements.find(e => e.id === q.componentId)!, vbe = q.terminalVolts[0]! - q.terminalVolts[2]!, h = 1e-6
    const ic = (v: number) => d.parameters.beta! * shockley(v, d.parameters.saturationCurrent!, 1, d.parameters.temperature!).current
    expect(q.gm).toBeCloseTo((ic(vbe + h) - ic(vbe - h)) / (2 * h), 7)
    const ce = sample(npn, 1000); if (ce.kind !== 'available') throw Error('missing')
    expect(ce.transfer.real).toBeCloseTo(-q.gm! * 1000 * q.rpi! / (10000 + q.rpi!), 8)
    const mos = await success(instantiateTemplate('amplifier-cs-basic')), m = mos.bias.device, model = mos.bias.dc.circuit.elements.find(e => e.id === m.componentId)!, vgs = m.terminalVolts[0]! - m.terminalVolts[2]!, vds = m.terminalVolts[1]! - m.terminalVolts[2]!
    expect(m.gm).toBeCloseTo((mosPoint(vgs + h, vds, model.parameters.threshold!, model.parameters.transconductance!).current - mosPoint(vgs - h, vds, model.parameters.threshold!, model.parameters.transconductance!).current) / (2 * h), 9)
    const cs = sample(mos, 1000); if (cs.kind !== 'available') throw Error('missing')
    expect(cs.transfer.real).toBeCloseTo(-2, 8); expect(m.gds).toBe(0)
  })
  it('handles emitter/source degeneration without creating ground connectivity', async () => {
    for (const id of ['ce-degenerated', 'cs-degenerated']) {
      const p = instantiateTemplate(`amplifier-${id}`), value = await success(p), q = value.bias.device, circuit = value.bias.dc.circuit, device = circuit.elements.find(e => e.id === q.componentId)!, ground = value.bias.circuit.referenceKey
      expect(device.nodes[2]).not.toBe(ground); expect(value.bias.displayNodeVolts[ground]).toBeCloseTo(0, 12); expect(value.bias.displayNodeVolts[device.nodes[2]!]!).toBeGreaterThan(0)
      const point = sample(value, 1000); if (point.kind !== 'available') throw Error('missing')
      const expected = id.startsWith('ce') ? -q.gm! * 1000 * q.rpi! / (10000 + q.rpi! + (1 + 100) * 1000) : -q.gm! * 1000 / (1 + q.gm! * 1000)
      expect(point.transfer.real).toBeCloseTo(expected, 7)
    }
  })
  it('matches an independent loaded bias equation and remains stable across fresh UUIDs', async () => {
    const vth = 10 * 33000 / (430000 + 33000), rth = 430000 * 33000 / (430000 + 33000), vt = 1.380649e-23 * 300 / 1.602176634e-19
    let lo = 0, hi = .75
    for (let i = 0; i < 90; i++) { const vbe = (lo + hi) / 2, ib = 1e-15 * Math.expm1(vbe / vt); if (vbe + ib * (rth + 101000) > vth) hi = vbe; else lo = vbe }
    const vbe = (lo + hi) / 2, ib = 1e-15 * Math.expm1(vbe / vt)
    for (let i = 0; i < 20; i++) {
      const p = instantiateTemplate('amplifier-ce-coupled'), input = await createAmplifierInput(p, p.sheets[0]!.id, getSettings(p)), result = prepareAmplifier(input)
      const q = result.device, e = result.dc.circuit.elements.find(e => e.id === q.componentId)!
      expect(q.region).toBe('active'); expect(q.terminalVolts[0]! - q.terminalVolts[2]!).toBeCloseTo(vbe, 8)
      expect(q.terminalAmps[0]).toBeCloseTo(ib, 10); expect(q.terminalAmps[1]).toBeCloseTo(100 * ib, 9)
      expect(result.displayNodeVolts[e.nodes[2]!]!).toBeCloseTo(101000 * ib, 8)
      expect(result.dc.maxKclAmps).toBeLessThan(1e-11)
      if (i === 0) { const independent = solveAmplifierDcFallback(result.dc.circuit); expect(independent.devices.find(d => d.componentId === q.componentId)!.terminalAmps[1]).toBeCloseTo(100 * ib, 9); expect(independent.maxKclAmps).toBeLessThan(1e-11) }
    }
  })
  it('uses coupling/bypass/parasitic capacitors in actual equations and preserves DC', async () => {
    const original = instantiateTemplate('amplifier-cs-parasitic'), baseline = await success(original), removed = await success(edit(original, 'CGD', 'capacitance', 0))
    expect(baseline.bias.device.terminalAmps).toEqual(removed.bias.device.terminalAmps)
    expect(magnitude(sample(baseline, 1e7))).toBeLessThan(magnitude(sample(removed, 1e7)) * .8)
    expect(magnitude(sample(baseline, .1))).toBeLessThan(magnitude(sample(baseline, 10000)) * .2)
    const noInput = await success(edit(original, 'CIN', 'capacitance', 0)); expect(magnitude(sample(noInput, 1000))).toBe(0)
    const noBypass = await success(edit(original, 'CBYP', 'capacitance', 0)); expect(magnitude(sample(noBypass, 10000))).toBeLessThan(magnitude(sample(baseline, 10000)))
    const ce = instantiateTemplate('amplifier-ce-bypass'), bypass = await success(ce), noEmitterBypass = await success(edit(ce, 'CBYP', 'capacitance', 0))
    expect(bypass.bias.device.terminalAmps).toEqual(noEmitterBypass.bias.device.terminalAmps)
    expect(magnitude(sample(noEmitterBypass, 10000))).toBeLessThan(magnitude(sample(bypass, 10000)))
  })
  it('keeps DC excitation unchanged when AC amplitude or output polarity changes', async () => {
    const p = instantiateTemplate('amplifier-ce-basic'), s = getSettings(p), first = await success(p), second = await success(p, { ...s, magnitudeRms: .00005, output: [s.output[1], s.output[0]] })
    expect(first.bias.device.terminalAmps).toEqual(second.bias.device.terminalAmps)
    const a = sample(first, 1000), b = sample(second, 1000); if (a.kind !== 'available' || b.kind !== 'available') throw Error('missing')
    expect(a.transfer.real).toBeCloseTo(-b.transfer.real, 9); expect(a.maxKclAmps).toBeLessThan(1e-10)
    const currentSum = a.terminalAmps!.reduce(add, c()); expect(currentSum.real).toBeCloseTo(0, 13); expect(currentSum.imaginary).toBeCloseTo(0, 13)
    const reversedInput = await success(p, { ...s, input: [s.input[1], s.input[0]] }), reversed = sample(reversedInput, 1000); if (reversed.kind !== 'available') throw Error('missing')
    expect(a.transfer.real).toBeCloseTo(-reversed.transfer.real, 9)
    const shifted = await success(p, { ...s, phaseDegrees: 90 }), source = shifted.single.branches.find(b => b.id === s.excitationSourceId)!
    expect(source.voltage.value.real).toBeCloseTo(0, 12); expect(source.voltage.value.imaginary).toBeCloseTo(s.magnitudeRms, 12)
    expect(magnitude(sample(shifted, 1000))).toBeCloseTo(a.magnitude, 9); expect(shifted.bias.device.terminalAmps).toEqual(first.bias.device.terminalAmps)
  })
  it('uses actual source resistance and output loading, with a fresh bias', async () => {
    const p = instantiateTemplate('amplifier-ce-basic'), first = await success(p), higherSource = await success(edit(p, 'RS', 'resistance', 20000)), heavierLoad = await success(edit(p, 'RL', 'resistance', 1000))
    expect(magnitude(sample(higherSource, 1000))).toBeLessThan(magnitude(sample(first, 1000)))
    expect(higherSource.bias.device.terminalAmps[1]).toBeLessThan(first.bias.device.terminalAmps[1]!)
    expect(magnitude(sample(heavierLoad, 1000))).toBeCloseTo(magnitude(sample(first, 1000)) * 2 / 3, 7)
  })
  it('rejects stale digests, invalid frequencies, bias regions, models, and cancellation', async () => {
    const p = instantiateTemplate('amplifier-ce-basic'), s = getSettings(p), input = await createAmplifierInput(p, p.sheets[0]!.id, s)
    expect((await amplifierEngine.run({ ...input, inputDigest: '0'.repeat(64) }, host())).outcome.kind).toBe('failure')
    expect((await run(p, { ...s, frequencyHz: 0 })).outcome.kind).toBe('failure')
    expect((await run(p, { ...s, endHz: Number.MAX_VALUE })).outcome.kind).toBe('failure')
    expect((await run(p, { ...s, magnitudeRms: 1 })).outcome.kind).toBe('unsupported')
    expect((await run(edit(p, 'V1', 'voltage', -1))).outcome.kind).toBe('unsupported')
    const extra = applyEdit(p, p.sheets[0]!.id, { type: 'add', kind: 'inductor', position: { x: 200, y: 200 } }); expect((await run(extra)).outcome.kind).toBe('unsupported')
    const coupled = instantiateTemplate('amplifier-cs-parasitic'), sheet = coupled.sheets[0]!, capacitor = sheet.components.find(c => c.reference === 'CGD')!
    expect(() => applyEdit(coupled, sheet.id, { type: 'properties', id: capacitor.id, reference: capacitor.reference, parameters: { capacitance: { kind: 'quantity', quantity: { value: 1, unit: 'V' } } } })).toThrow()
    expect(() => applyEdit(coupled, sheet.id, { type: 'properties', id: capacitor.id, reference: capacitor.reference, parameters: { capacitance: { kind: 'quantity', quantity: { value: NaN, unit: 'F' } } } })).toThrow()
    expect((await amplifierEngine.run(input, { ...host(), signal: AbortSignal.abort() })).outcome.kind).toBe('cancelled')
    const abort = new AbortController(), cancelled = await amplifierEngine.run(input, { ...host(), signal: abort.signal, onProgress: count => { if (count >= 8) abort.abort() } })
    expect(cancelled.outcome.kind).toBe('cancelled')
  })
  it('preserves genuine failed-frequency gaps rather than fabricating gain or cutoffs', async () => {
    const p = instantiateTemplate('amplifier-cs-coupled'), s = getSettings(p), value = await success(p, { ...s, startHz: 1e-310, endHz: 1, points: 9 })
    expect(value.points.some(point => point.kind === 'failed')).toBe(true)
    expect(value.features.notes.join(' ')).toMatch(/失败|未建立/)
    expect(value.features.bandwidthHz).toBeNull()
  })
  it('requires an actual plateau and refuses missing/ambiguous half-power crossings', () => {
    const point = (frequencyHz: number, gainDb: number): SweepPoint => ({ kind: 'available', frequencyHz, transfer: c(10 ** (gainDb / 20)), magnitude: 10 ** (gainDb / 20), gainDb, phaseDegrees: 0 })
    const values = [point(1, -12), point(2, -6), point(4, -2), ...[10, 20, 40, 80, 100, 200, 400].map(f => point(f, 0)), point(1000, -2), point(2000, -6), point(4000, -12)]
    const f = midbandFeatures(values, 'log'); expect(f.plateau).not.toBeNull(); expect(f.lowerHz).toBeGreaterThan(2); expect(f.upperHz).toBeGreaterThan(1000); expect(f.bandwidthHz).toBeCloseTo(f.upperHz! - f.lowerHz!, 9)
    const incomplete = midbandFeatures(values.slice(2, 10), 'log'); expect(incomplete.lowerHz).toBeNull(); expect(incomplete.upperHz).toBeNull(); expect(incomplete.bandwidthHz).toBeNull()
    const gap = [...values]; gap[2] = { kind: 'failed', frequencyHz: 4, diagnostic: { code: 'FAIL', severity: 'error', message: 'test', entityIds: [] } }; expect(midbandFeatures(gap, 'log').lowerHz).toBeNull()
    const ambiguous = [point(1, -12), point(2, -2), point(3, -8), point(4, -2), ...[5, 10, 20, 40, 80, 160].map(f => point(f, 0)), point(1000, -8)]
    expect(midbandFeatures(ambiguous, 'log').lowerHz).toBeNull()
    expect(midbandFeatures([point(1, -10), point(2, -7), point(4, -4), point(8, -1), point(16, 2)], 'log').plateau).toBeNull()
  })
})
