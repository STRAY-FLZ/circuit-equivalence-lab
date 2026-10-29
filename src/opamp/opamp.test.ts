// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { instantiateTemplate } from '../atlas'
import { applyEdit } from '../editing'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { transferAt } from '../ac'
import { createOpampInput, openLoopGain, opampEngine, prepareOpamp } from './index'
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
    if (name === 'summing') expect(r.prepared.idealDcOutput).toBeCloseTo(-2, 6)
    if (name === 'differential') expect(r.prepared.idealDcOutput).toBeCloseTo(2, 6)
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
})
