import { describe, expect, it } from 'vitest'
import { circuitTemplates, instantiateTemplate } from '../atlas'
import { applyEdit } from '../editing'
import { createEngineeringProject, reviseProject } from '../engineering'
import type { JsonObject } from '../engineering'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import { analogEngine, createAnalogInput, diodeLoadLine, idealOpampEngine, quasiStaticSweep, resolveAnalogCircuit, solveAnalog } from './index'

const host = () => ({ signal: new AbortController().signal, readAsset: () => Promise.reject(new Error('Unexpected asset access')), onProgress: () => {} })
const analog = circuitTemplates.filter(t => t.analog)
describe('pinned analog providers, editable templates and portable projects', () => {
  it.each(analog)('$id computes real OP with stable pin identities and schema1 roundtrip', async template => {
    const p = instantiateTemplate(template.id), sheet = p.sheets[0]!, input = await createAnalogInput(p, sheet.id, sheet.ports.find(p => p.label === 'COM')!.anchorId)
    const engine = template.analog === 'ideal-opamp' ? idealOpampEngine : analogEngine
    expect(engine.inspect(input).kind).toBe('supported')
    const result = await engine.run(input, host())
    expect(result.outcome.kind).toBe('success')
    expect(result.provenance.inputRevision).toBe(p.revision); expect(result.provenance.inputDigest).toHaveLength(64)
    if (result.outcome.kind !== 'success') return
    expect(result.outcome.value.maxKclAmps).toBeLessThan(1e-11)
    const record = JSON.parse(JSON.stringify({ result, sheetId: sheet.id })) as JsonObject
    const next = reviseProject(p, p.revision, { extensions: { ...p.extensions, 'org.stray.analog': record } })
    const text = await serializeProject(await createProjectDocument(next, { name: 'analog fixture', version: '3.0.0' }, [])), restored = await deserializeProject(text)
    expect(restored.kind).toBe('ready')
    if (restored.kind !== 'ready') return
    for (const component of sheet.components) expect(restored.document.project.sheets[0]!.components.find(c => c.id === component.id)).toEqual(component)
    expect(restored.document.project.extensions['org.stray.analog']).toEqual(record)
    const again = await createAnalogInput(restored.document.project, sheet.id, sheet.ports.find(p => p.label === 'COM')!.anchorId)
    const value = await engine.run(again, host()); expect(value.outcome.kind).toBe('success')
    if (value.outcome.kind === 'success') for (const d of value.outcome.value.devices) d.terminalAmps.forEach((amps, i) => expect(amps).toBeCloseTo(result.outcome.kind === 'success' ? result.outcome.value.devices.find(e => e.componentId === d.componentId)!.terminalAmps[i]! : NaN, 9))
    expect(restored.document.formatVersion).toBe(1)
  })
  it('linear loadline is independently extracted from external network and intersects Shockley', async () => {
    const p = instantiateTemplate('analog-diode-bias'), s = p.sheets[0]!, c = resolveAnalogCircuit(await createAnalogInput(p, s.id, s.ports.find(p => p.label === 'COM')!.anchorId)), result = solveAnalog(c), line = diodeLoadLine(result)
    expect(line.openVolts).toBeCloseTo(5, 9); expect(line.resistance).toBeCloseTo(1000, 8)
    const d = result.devices.find(d => d.kind === 'diode')!
    expect(line.currentAt(d.terminalVolts[0]! - d.terminalVolts[1]!)).toBeCloseTo(d.terminalAmps[0]!, 10)
  })
  it('half-wave and limiter each solve every actual DC point, not a clipped ideal sine', async () => {
    for (const id of ['analog-diode-halfwave', 'analog-diode-limiter']) {
      const p = instantiateTemplate(id), s = p.sheets[0]!, c = resolveAnalogCircuit(await createAnalogInput(p, s.id, s.ports.find(p => p.label === 'COM')!.anchorId)), points = await quasiStaticSweep(c, s.components.find(c => c.reference === 'V1')!.id, s.ports.find(p => p.label === 'OUT')!.anchorId, -2, 2, 41)
      expect(points).toHaveLength(41)
      expect(points.every(p => p.maxKclAmps < 1e-11 && p.maxConstraintVolts < 1e-9)).toBe(true)
      const positive = points.at(-1)!, negative = points[0]!
      if (id.includes('halfwave')) { expect(negative.outputVolts).toBeCloseTo(-1e-9, 9); expect(positive.outputVolts).toBeGreaterThan(1.4); expect(positive.outputVolts).toBeLessThan(1.5) }
      else { expect(negative.outputVolts).toBeCloseTo(-2, 7); expect(positive.outputVolts).toBeGreaterThan(.5); expect(positive.outputVolts).toBeLessThan(.6) }
    }
  })
  it('rejects forged digests, invalid values, units, unpinned models and old/stale snapshots', async () => {
    const p = instantiateTemplate('analog-npn-base'), s = p.sheets[0]!, ref = s.ports.find(p => p.label === 'COM')!.anchorId, input = await createAnalogInput(p, s.id, ref)
    expect((await analogEngine.run({ ...input, inputDigest: '0'.repeat(64) }, host())).outcome.kind).toBe('failure')
    const q = s.components.find(c => c.reference === 'Q1')!, bad = applyEdit(p, s.id, { type: 'properties', id: q.id, reference: q.reference, parameters: { ...q.parameters, beta: { kind: 'quantity', quantity: { value: 0, unit: '1' } } } })
    expect((await analogEngine.run(await createAnalogInput(bad, s.id, ref), host())).outcome.kind).toBe('failure')
    const pinIds = q.pins.map(p => p.id), moved = applyEdit(p, s.id, { type: 'move', id: q.id, position: { x: 400, y: 300 } })
    expect(moved.revision).not.toBe(input.project.revision); expect(moved.sheets[0]!.components.find(c => c.id === q.id)!.pins.map(p => p.id)).toEqual(pinIds)
    expect(input.project.revision).toBe(p.revision)
    const unknown = createEngineeringProject({ ...p, definitions: p.definitions.map(d => d.id === q.definitionId ? { ...d, modelBindings: d.modelBindings.map(b => ({ ...b, model: { ...b.model, version: '999' } })) } : d) })
    expect((await analogEngine.run(await createAnalogInput(unknown, s.id, ref), host())).outcome.kind).toBe('unsupported')
    expect(() => createEngineeringProject({ ...p, sheets: [{ ...s, components: s.components.map(c => c.id === q.id ? { ...c, parameters: { ...c.parameters, beta: { kind: 'quantity', quantity: { value: 100, unit: 'A' } } } } : c) }] })).toThrow()
    expect((await analogEngine.run(input, { ...host(), signal: AbortSignal.abort() })).outcome.kind).toBe('cancelled')
  })
})
