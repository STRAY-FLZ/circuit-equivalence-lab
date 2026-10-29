// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { instantiateTemplate } from '../atlas'
import { applyEdit } from '../editing'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { c, div, transferAt } from '../ac'
import { createOpampInput, openLoopGain, opampEngine, prepareOpamp } from './index'
import { crossing, pointFromComplex } from './model'
import type { OpampSettings } from './types'

function setup(id: string) {
  const project = instantiateTemplate(`opamp-${id}`), sheet = project.sheets[0]!, port = (name: string) => sheet.ports.find(p => p.label === name)!.anchorId
  const settings: OpampSettings = { referenceAnchorId: port('COM'), excitationSourceId: sheet.components.find(c => c.reference === 'V1')!.id, magnitudeRms: .01, phaseDegrees: 0, input: [port('IN'), port('COM')], output: [port('OUT'), port('COM')], frequencyHz: 1000, startHz: .1, endHz: 1e8, points: 201, spacing: 'log' }
  return { project, sheet, settings }
}
const host = () => ({ signal: new AbortController().signal, readAsset: () => Promise.reject(new Error('unused')), onProgress: () => {} })

describe('single-pole op-amp analysis', () => {
  it('matches the independent open-loop gain, pole and exact unity crossing', () => {
    const atPole = openLoopGain(100000, 10, 10), high = openLoopGain(100000, 10, 1000000)
    expect(atPole.real).toBeCloseTo(50000, 8); expect(atPole.imaginary).toBeCloseTo(-50000, 8)
    expect(Math.hypot(high.real, high.imaginary)).toBeCloseTo(1, 9)
    expect(Math.atan2(high.imaginary, high.real) * 180 / Math.PI).toBeCloseTo(-89.99942704, 6)
    for (const args of [[0, 10, 1], [1, 0, 1], [1, 10, 0]]) expect(() => openLoopGain(args[0]!, args[1]!, args[2]!)).toThrow()
  })
  it.each([
    ['follower', 1 / (1 + 1 / 100000), 1000010, 1],
    ['noninverting', 100000 / (1 + 100000 * .1), 100010, .1],
    ['inverting', -10 * 100000 / (100000 + 11), 10 * (100000 + 11) / 11, 1 / 11],
  ] as const)('%s solves actual DC and complex feedback against independent first-order reference', async (name, gain, cutoff, beta) => {
    const { project, sheet, settings } = setup(name), input = await createOpampInput(project, sheet.id, settings)
    const run = await opampEngine.run(input, host()); expect(run.outcome.kind).toBe('success')
    if (run.outcome.kind !== 'success') throw new Error(JSON.stringify(run.outcome))
    const result = run.outcome.value, { prepared } = result
    expect(prepared.betaDc).toBeCloseTo(beta, 10)
    expect(prepared.dcTransfer).toBeCloseTo(gain, 8)
    expect(prepared.dc.checks.maxKclAmps).toBeLessThan(1e-10)
    const plus = prepared.dc.nodes.find(n => n.key === prepared.model.plus)!.volts, minus = prepared.dc.nodes.find(n => n.key === prepared.model.minus)!.volts, output = prepared.dc.nodes.find(n => n.key === prepared.model.output)!.volts
    expect(output).toBeCloseTo(prepared.model.gain * (plus - minus), 7)
    expect(Math.abs(plus - minus)).toBeGreaterThan(0)
    expect(result.bandwidthHz).not.toBeNull(); expect(result.bandwidthHz! / cutoff).toBeCloseTo(1, 2)
    expect(result.crossoverHz).not.toBeNull(); expect(result.phaseMarginDegrees!).toBeGreaterThan(89); expect(result.phaseMarginDegrees!).toBeLessThan(91)
    const exactLoopFrequency = 10 * Math.sqrt((100000 * beta) ** 2 - 1)
    expect(result.crossoverHz! / exactLoopFrequency).toBeCloseTo(1, 2)
    expect(result.phaseMarginDegrees!).toBeCloseTo(180 - Math.atan(exactLoopFrequency / 10) * 180 / Math.PI, 1)
    expect(result.single.checks.maxKclAmps).toBeLessThan(1e-9)
    const sample = transferAt(result.single, { ...settings, passband: 'low' })
    expect(sample.kind).toBe('available')
    if (sample.kind === 'available') {
      const ratio = settings.frequencyHz / cutoff
      expect(sample.transfer.real).toBeCloseTo(gain / (1 + ratio ** 2), 6)
      expect(sample.transfer.imaginary).toBeCloseTo(-gain * ratio / (1 + ratio ** 2), 6)
    }
    expect(result.unityHz).toBeCloseTo(10 * Math.sqrt(100000 ** 2 - 1), 5)
    expect(result.approximateGbwHz).toBe(1e6)
  })
  it.each(['summing', 'differential', 'active-lowpass'])('solves the %s network with actual source suppression and node checks', async name => {
    const { project, sheet, settings } = setup(name), input = await createOpampInput(project, sheet.id, settings), run = await opampEngine.run(input, host())
    expect(run.outcome.kind).toBe('success')
    if (run.outcome.kind !== 'success') throw new Error(JSON.stringify(run.outcome))
    const r = run.outcome.value
    expect(r.prepared.dc.checks.maxKclAmps).toBeLessThan(1e-10)
    // The second source is suppressed through R2 in the summing circuit; its
    // extra conductance changes the finite-gain denominator from A0+11 to A0+16.
    expect(r.prepared.dcTransfer).toBeCloseTo(-1000000 / (name === 'summing' ? 100016 : 100011), 6)
    if (name === 'summing' || name === 'differential') {
      const output = r.prepared.dc.nodes.find(n => n.key === r.prepared.model.output)!.volts
      expect(r.prepared.idealDcOutput).toBeCloseTo(name === 'summing' ? -2 : 2, 6)
      expect(output).toBeCloseTo(name === 'summing' ? -200000 / 100016 : 200000 / 100011, 7)
    }
    if (name === 'active-lowpass') {
      const beta = r.betaAtFrequency!
      expect(Math.abs(beta.imaginary)).toBeGreaterThan(0)
      expect(r.bandwidthHz!).toBeLessThan(10000)
    }
  })
  it('rejects the ideal model and stale digest, supports cancellation, and keeps schema-1 identity', async () => {
    const { project, sheet, settings } = setup('follower'), original = sheet.components.find(c => c.reference === 'U1')!
    const changed = applyEdit(project, sheet.id, { type: 'properties', id: original.id, reference: original.reference, parameters: { ...original.parameters, openLoopGain: { kind: 'quantity', quantity: { value: 20000, unit: '1' } } } })
    const input = await createOpampInput(project, sheet.id, settings), changedInput = await createOpampInput(changed, sheet.id, settings)
    expect(prepareOpamp(changedInput).dcTransfer).not.toBe(prepareOpamp(input).dcTransfer)
    const stale = await opampEngine.run({ ...input, project: changed }, host()); expect(stale.outcome.kind).toBe('failure')
    const controller = new AbortController(); controller.abort()
    expect((await opampEngine.run(input, { ...host(), signal: controller.signal })).outcome.kind).toBe('cancelled')
    const document = await createProjectDocument(changed, { name: 'test', version: '3.3.0' }, []), text = await serializeProject(document), restored = await deserializeProject(text)
    expect(restored.kind).toBe('ready')
    if (restored.kind === 'ready') { expect(restored.document.formatVersion).toBe(1); expect(restored.document.project.sheets[0]!.components.find(c => c.id === original.id)).toEqual(changed.sheets[0]!.components.find(c => c.id === original.id)); expect(await serializeProject(restored.document)).toBe(text) }
    const ideal = instantiateTemplate('analog-opamp-follower')
    const idealSettings = { ...settings, referenceAnchorId: ideal.sheets[0]!.ports.find(p => p.label === 'COM')!.anchorId, excitationSourceId: ideal.sheets[0]!.components.find(c => c.reference === 'V1')!.id, input: [ideal.sheets[0]!.ports.find(p => p.label === 'IN')!.anchorId, ideal.sheets[0]!.ports.find(p => p.label === 'COM')!.anchorId] as const, output: [ideal.sheets[0]!.ports.find(p => p.label === 'OUT')!.anchorId, ideal.sheets[0]!.ports.find(p => p.label === 'COM')!.anchorId] as const }
    expect(() => prepareOpamp({ ...input, project: ideal, configuration: { ...input.configuration, scope: { kind: 'circuit', sheetIds: [ideal.sheets[0]!.id] }, options: idealSettings } })).toThrow()
  })
  it('uses the actual capacitor-dependent feedback transfer and independent loaded closed-loop reference', async () => {
    const { project, sheet, settings } = setup('active-lowpass'), run = await opampEngine.run(await createOpampInput(project, sheet.id, settings), host())
    if (run.outcome.kind !== 'success') throw new Error(JSON.stringify(run.outcome))
    const result = run.outcome.value, t = 2 * Math.PI * settings.frequencyHz * 100000 * 1e-9
    const beta = div(c(1, t), c(11, t))
    expect(result.betaAtFrequency!.real).toBeCloseTo(beta.real, 10)
    expect(result.betaAtFrequency!.imaginary).toBeCloseTo(beta.imaginary, 10)
    const x = settings.frequencyHz / 10
    // H = -10 A0 / [10(1+jx) + (1+jx+A0)(1+jt)].
    const expected = div(c(-1000000), c(100011 - x * t, 11 * x + 100001 * t))
    const actual = transferAt(result.single, { ...settings, passband: 'low' })
    if (actual.kind !== 'available') throw new Error('missing actual transfer')
    expect(actual.transfer.real).toBeCloseTo(expected.real, 8)
    expect(actual.transfer.imaginary).toBeCloseTo(expected.imaginary, 8)
  })
  it('rejects missing and positive feedback instead of manufacturing a closed-loop result', async () => {
    const { project, sheet, settings } = setup('follower'), amp = sheet.components.find(c => c.reference === 'U1')!
    const minus = amp.pins[1]!.anchorId, plus = amp.pins[0]!.anchorId, minusWire = sheet.connections.find(w => w.endpoints.includes(minus))!, plusWire = sheet.connections.find(w => w.endpoints.includes(plus))!
    let open = applyEdit(project, sheet.id, { type: 'delete', selection: { kind: 'connection', id: minusWire.id } })
    open = applyEdit(open, sheet.id, { type: 'connect', from: { anchorId: minus }, to: { anchorId: settings.referenceAnchorId } })
    const openResult = await opampEngine.run(await createOpampInput(open, sheet.id, settings), host())
    expect(openResult.outcome.kind).toBe('unsupported')
    if (openResult.outcome.kind === 'unsupported') expect(openResult.outcome.diagnostics[0]!.code).toBe('OPAMP_FEEDBACK')
    let positive = applyEdit(project, sheet.id, { type: 'delete', selection: { kind: 'connection', id: plusWire.id } })
    positive = applyEdit(positive, sheet.id, { type: 'delete', selection: { kind: 'connection', id: minusWire.id } })
    positive = applyEdit(positive, sheet.id, { type: 'connect', from: { anchorId: plus }, to: { anchorId: settings.output[0] } })
    positive = applyEdit(positive, sheet.id, { type: 'connect', from: { anchorId: minus }, to: { anchorId: settings.input[0] } })
    const positiveResult = await opampEngine.run(await createOpampInput(positive, sheet.id, settings), host())
    expect(positiveResult.outcome.kind).toBe('unsupported')
    if (positiveResult.outcome.kind === 'unsupported') expect(positiveResult.outcome.diagnostics[0]!.code).toBe('OPAMP_FEEDBACK')
  })
  it('keeps uncovered crossings unavailable and diagnoses invalid probes or a floating input', async () => {
    const { project, sheet, settings } = setup('follower'), limited = { ...settings, startHz: .01, endHz: 100, points: 31 }
    const result = await opampEngine.run(await createOpampInput(project, sheet.id, limited), host())
    if (result.outcome.kind !== 'success') throw new Error(JSON.stringify(result.outcome))
    expect(result.outcome.value.bandwidthHz).toBeNull(); expect(result.outcome.value.crossoverHz).toBeNull(); expect(result.outcome.value.phaseMarginDegrees).toBeNull()
    const invalid = await opampEngine.run(await createOpampInput(project, sheet.id, { ...settings, input: [settings.input[0], settings.input[0]] }), host())
    expect(invalid.outcome.kind).toBe('failure')
    const amp = sheet.components.find(c => c.reference === 'U1')!, plus = amp.pins[0]!.anchorId, wire = sheet.connections.find(w => w.endpoints.includes(plus))!
    const floating = applyEdit(project, sheet.id, { type: 'delete', selection: { kind: 'connection', id: wire.id } })
    const unsolved = await opampEngine.run(await createOpampInput(floating, sheet.id, settings), host())
    expect(unsolved.outcome.kind).not.toBe('success')
  })
  it('respects source polarity, rejects invalid model values, and handles gains with no unity crossing', async () => {
    const { project, sheet, settings } = setup('follower'), source = sheet.components.find(c => c.reference === 'V1')!, amp = sheet.components.find(c => c.reference === 'U1')!
    const inverted = applyEdit(project, sheet.id, { type: 'properties', id: source.id, reference: source.reference, parameters: { voltage: { kind: 'quantity', quantity: { value: -.1, unit: 'V' } } } })
    const biased = prepareOpamp(await createOpampInput(inverted, sheet.id, settings))
    expect(biased.dc.nodes.find(n => n.key === biased.model.output)!.volts).toBeCloseTo(-.1 * 100000 / 100001, 9)
    const reversed = prepareOpamp(await createOpampInput(project, sheet.id, { ...settings, output: [settings.output[1], settings.output[0]] }))
    expect(reversed.dcTransfer).toBeCloseTo(-100000 / 100001, 9)
    for (const [field, unit] of [['openLoopGain', '1'], ['poleHz', 'Hz']] as const) {
      const bad = applyEdit(project, sheet.id, { type: 'properties', id: amp.id, reference: amp.reference, parameters: { ...amp.parameters, [field]: { kind: 'quantity', quantity: { value: 0, unit } } } })
      expect(() => validateOpamp(bad, sheet.id, settings)).toThrow()
    }
    const small = applyEdit(project, sheet.id, { type: 'properties', id: amp.id, reference: amp.reference, parameters: { ...amp.parameters, openLoopGain: { kind: 'quantity', quantity: { value: .5, unit: '1' } } } })
    const run = await opampEngine.run(await createOpampInput(small, sheet.id, settings), host())
    if (run.outcome.kind !== 'success') throw new Error(JSON.stringify(run.outcome))
    expect(run.outcome.value.unityHz).toBeNull(); expect(run.outcome.value.crossoverHz).toBeNull(); expect(run.outcome.value.phaseMarginDegrees).toBeNull()
    expect(run.outcome.value.prepared.dcTransfer).toBeCloseTo(1 / 3, 10)
  })
  it('honors cancellation during the sweep and rejects over-budget point counts', async () => {
    const { project, sheet, settings } = setup('follower'), input = await createOpampInput(project, sheet.id, settings), controller = new AbortController()
    const result = await opampEngine.run(input, { ...host(), signal: controller.signal, onProgress: n => { if (n >= 9) controller.abort() } })
    expect(result.outcome.kind).toBe('cancelled')
    const invalid = await opampEngine.run(await createOpampInput(project, sheet.id, { ...settings, points: 402 }), host())
    expect(invalid.outcome.kind).toBe('failure')
  })
  it('reports capabilities and refuses ambiguous or interrupted 0 dB crossings', async () => {
    const { project, sheet, settings } = setup('follower'), input = await createOpampInput(project, sheet.id, settings)
    expect(opampEngine.inspect(input).kind).toBe('supported')
    expect(opampEngine.inspect({ ...input, inputDigest: 'bad' }).kind).toBe('unsupported')
    const points = [2, .5, 2, .5].map((value, i) => pointFromComplex(10 ** i, c(value)))
    expect(crossing(points, 0, 'log')).toBeNull()
    expect(crossing(points.slice(0, 2), 0, 'log')!.frequencyHz).toBeCloseTo(Math.sqrt(10), 10)
    expect(crossing([points[0]!, { kind: 'failed', frequencyHz: 3, diagnostic: { code: 'test', severity: 'error', message: 'failed', entityIds: [] } }, points[1]!], 0, 'log')).toBeNull()
  })
  it('distinguishes contradictory ideal sources from a floating network', async () => {
    const { project, sheet, settings } = setup('follower')
    let next = applyEdit(project, sheet.id, { type: 'add', kind: 'voltage-source', position: { x: 200, y: 300 } })
    const added = next.sheets[0]!.components.at(-1)!
    next = applyEdit(next, sheet.id, { type: 'connect', from: { anchorId: added.pins[0]!.anchorId }, to: { anchorId: settings.input[0] } })
    next = applyEdit(next, sheet.id, { type: 'connect', from: { anchorId: added.pins[1]!.anchorId }, to: { anchorId: settings.referenceAnchorId } })
    const result = await opampEngine.run(await createOpampInput(next, sheet.id, settings), host())
    expect(result.outcome.kind).toBe('failure')
    if (result.outcome.kind === 'failure') expect(result.outcome.diagnostics[0]!.code).toBe('DC_INCONSISTENT')
  })
  it('uses edited feedback and actual load currents rather than an ideal template constant', async () => {
    const inv = setup('inverting'), rf = inv.sheet.components.find(c => c.reference === 'RF')!
    const changed = applyEdit(inv.project, inv.sheet.id, { type: 'properties', id: rf.id, reference: rf.reference, parameters: { resistance: { kind: 'quantity', quantity: { value: 200000, unit: 'ohm' } } } })
    const run = await opampEngine.run(await createOpampInput(changed, inv.sheet.id, inv.settings), host())
    if (run.outcome.kind !== 'success') throw new Error(JSON.stringify(run.outcome))
    expect(run.outcome.value.prepared.dcTransfer).toBeCloseTo(-20 * 100000 / 100021, 7)
    expect(run.outcome.value.bandwidthHz! / (10 * 100021 / 21)).toBeCloseTo(1, 2)
    const follow = setup('follower')
    let loaded = applyEdit(follow.project, follow.sheet.id, { type: 'add', kind: 'resistor', position: { x: 750, y: 350 } })
    const load = loaded.sheets[0]!.components.at(-1)!
    loaded = applyEdit(loaded, follow.sheet.id, { type: 'properties', id: load.id, reference: 'RL', parameters: { resistance: { kind: 'quantity', quantity: { value: 2000, unit: 'ohm' } } } })
    loaded = applyEdit(loaded, follow.sheet.id, { type: 'connect', from: { anchorId: load.pins[0]!.anchorId }, to: { anchorId: follow.settings.output[0] } })
    loaded = applyEdit(loaded, follow.sheet.id, { type: 'connect', from: { anchorId: load.pins[1]!.anchorId }, to: { anchorId: follow.settings.referenceAnchorId } })
    const dc = prepareOpamp(await createOpampInput(loaded, follow.sheet.id, follow.settings))
    expect(dc.dc.branches.find(b => b.id === load.id)!.amps).toBeCloseTo(.1 * 100000 / 100001 / 2000, 12)
  })
})

function validateOpamp(project: ReturnType<typeof instantiateTemplate>, sheetId: string, settings: OpampSettings) {
  return prepareOpamp({ project, inputDigest: '0'.repeat(64), configuration: { id: crypto.randomUUID(), analysisType: 'analog.opamp-frequency', scope: { kind: 'circuit', sheetIds: [sheetId] }, options: { ...settings } } })
}
